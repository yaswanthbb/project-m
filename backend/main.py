import asyncio
import logging
import secrets
import sqlite3
import threading
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, Path, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import delete, select, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from config import Settings, frontend_origins
from database import make_engine, session_factory
from models import Airdrop, Deal, Pick, PushOutbox, Tip
from push import Dispatcher, FirebaseSender, TopicSubscriptionError
from schemas import (
    ArticleCreate,
    ArticleRead,
    OfferCreate,
    OfferRead,
    PublishResponse,
    SubscribeRequest,
    SubscribeResponse,
)

logger = logging.getLogger(__name__)
_DEFAULT_SENDER = object()


def require_token(request: Request, x_publish_token: Annotated[str | None, Header()] = None):
    expected = request.app.state.settings.publish_token.encode("utf-8")
    supplied = (x_publish_token or "").encode("utf-8")
    if not secrets.compare_digest(supplied, expected):
        raise HTTPException(status_code=401, detail="Invalid publish token")


def is_duplicate(exc: IntegrityError) -> bool:
    return (
        getattr(exc.orig, "sqlstate", None) == "23505"
        or getattr(exc.orig, "sqlite_errorcode", None) == sqlite3.SQLITE_CONSTRAINT_UNIQUE
    )


def create_app(
    settings: Settings | None = None, *, sender=_DEFAULT_SENDER, start_worker: bool = True
) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        config = settings or Settings.from_env()  # Fail before serving if token is missing.
        engine = make_engine(config.database_url)
        firebase = None
        task = None
        stop, wake = threading.Event(), asyncio.Event()
        try:
            actual_sender = sender
            if actual_sender is _DEFAULT_SENDER:
                actual_sender = None
                if config.firebase_json or config.firebase_base64:
                    firebase = FirebaseSender(config)
                    actual_sender = firebase
            app.state.push_client = actual_sender
            app.state.settings = config
            app.state.engine = engine
            app.state.sessions = session_factory(engine)
            app.state.dispatcher = Dispatcher(app.state.sessions, actual_sender)
            if start_worker:
                task = asyncio.create_task(app.state.dispatcher.run(stop, wake))
            yield
        finally:
            stop.set()
            wake.set()
            if task is not None:
                await task
            if firebase is not None:
                firebase.close()
            engine.dispose()

    app = FastAPI(title="Personal News API", version="1.0.0", lifespan=lifespan)
    # Public feeds and header-authenticated writes; no cookie credentials.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=frontend_origins(),
        allow_credentials=False,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["Content-Type", "X-Publish-Token"],
    )

    @app.get("/health")
    def health(request: Request):
        try:
            with request.app.state.engine.connect() as connection:
                connection.execute(text("SELECT 1"))
        except SQLAlchemyError:
            raise HTTPException(status_code=503, detail="Database unavailable") from None
        return {"status": "ok"}

    @app.post("/api/push/subscribe", response_model=SubscribeResponse)
    def subscribe(payload: SubscribeRequest, request: Request):
        push_client = request.app.state.push_client
        if push_client is None:
            raise HTTPException(status_code=503, detail="Firebase is not configured")
        try:
            subscribed = push_client.subscribe(payload.token, payload.topics)
        except TopicSubscriptionError as exc:
            raise HTTPException(
                status_code=502,
                detail={
                    "message": str(exc),
                    "subscribed": exc.subscribed,
                    "failed": exc.failed,
                },
            ) from None
        return {"subscribed": subscribed}

    def register_feed(topic, model, create_schema, read_schema):
        def list_items(request: Request):
            order = [model.created_at.desc(), model.id.desc()]
            if model in (Pick, Tip):
                order.insert(0, model.date.desc())
            with request.app.state.sessions() as session:
                return list(session.scalars(select(model).order_by(*order)))

        # Assign the concrete annotation before FastAPI builds request validation.
        def publish(payload, request: Request):
            with request.app.state.sessions() as session:
                try:
                    with session.begin():
                        item = model(**payload.model_dump())
                        session.add(item)
                        session.flush()
                        outbox = PushOutbox(
                            topic=topic,
                            item_id=item.id,
                            title=item.title,
                            body=getattr(item, "description", None) or item.body,
                            url=item.url,
                        )
                        session.add(outbox)
                        session.flush()
                    result = read_schema.model_validate(item)
                    outbox_id = outbox.id
                except IntegrityError as exc:
                    if is_duplicate(exc):
                        raise HTTPException(status_code=409, detail="Item already exists") from None
                    raise
            try:
                push_status = request.app.state.dispatcher.deliver(outbox_id)
            except Exception as exc:
                # Content is already durable. A DB failure after provider acceptance
                # is ambiguous; leave the outbox available for recovery.
                logger.error("Immediate push failed (%s)", type(exc).__name__)
                push_status = "queued"
            return {"item": result, "push": push_status}

        publish.__annotations__["payload"] = create_schema

        def remove(request: Request, item_id: Annotated[int, Path(gt=0)]):
            with request.app.state.sessions.begin() as session:
                item = session.scalar(select(model).where(model.id == item_id).with_for_update())
                if item is None:
                    raise HTTPException(status_code=404, detail="Item not found")
                session.execute(
                    delete(PushOutbox).where(
                        PushOutbox.topic == topic,
                        PushOutbox.item_id == item_id,
                        PushOutbox.sent_at.is_(None),
                    )
                )
                session.delete(item)
            return Response(status_code=status.HTTP_204_NO_CONTENT)

        app.add_api_route(
            f"/api/{topic}",
            list_items,
            methods=["GET"],
            response_model=list[read_schema],
            name=f"list_{topic}",
        )
        app.add_api_route(
            f"/api/{topic}",
            publish,
            methods=["POST"],
            response_model=PublishResponse[read_schema],
            status_code=201,
            dependencies=[Depends(require_token)],
            name=f"publish_{topic}",
        )
        app.add_api_route(
            f"/api/{topic}/{{item_id}}",
            remove,
            methods=["DELETE"],
            status_code=204,
            dependencies=[Depends(require_token)],
            name=f"delete_{topic}",
        )

    for topic, model, create_schema, read_schema in (
        ("deals", Deal, OfferCreate, OfferRead),
        ("picks", Pick, ArticleCreate, ArticleRead),
        ("airdrops", Airdrop, OfferCreate, OfferRead),
        ("tips", Tip, ArticleCreate, ArticleRead),
    ):
        register_feed(topic, model, create_schema, read_schema)
    return app


app = create_app()
