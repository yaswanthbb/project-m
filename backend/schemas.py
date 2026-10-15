import re
from datetime import date, datetime
from typing import Annotated, Generic, Literal, TypeVar

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    HttpUrl,
    StringConstraints,
    TypeAdapter,
    field_validator,
    model_validator,
)

Text = Annotated[
    str, StringConstraints(strict=True, strip_whitespace=True, min_length=1, max_length=20000)
]
Title = Annotated[
    str, StringConstraints(strict=True, strip_whitespace=True, min_length=1, max_length=200)
]
Tag = Literal[
    "AI", "Dev tools", "SaaS", "Software", "Cloud", "Data", "Security", "Design", "Learning"
]
PushStatus = Literal["sent", "queued", "not_configured"]
HTTP_URL = TypeAdapter(HttpUrl)
FREE = re.compile(
    r"\b(?:free|no[\s-]cost|zero[\s-]cost)\b|(?<![\w$])\$0(?:\.0+)?(?![\d.])", re.IGNORECASE
)
TELCO = re.compile(
    r"\b(?:recharg(?:e|es|ed|ing)|smart[\s-]*phones?|(?:e[\s-]?)?sims?|"
    r"telcos?|telecom(?:munications?)?|telephony|cellular|prepaid|postpaid|"
    r"phones?|handsets?|mobile[\s-]+(?:plans?|data|offers?|networks?|recharges?|contracts?)|"
    r"data[\s-]+(?:plans?|packs?)|talk[\s-]*time|airtime|[45]g[\s-]+(?:plans?|data|offers?))\b",
    re.IGNORECASE,
)


def parse_date(value):
    if type(value) is date:
        return value
    if not isinstance(value, str) or not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", value):
        raise ValueError("must be a calendar date in YYYY-MM-DD format")
    return date.fromisoformat(value)


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)


class ContentCreate(StrictModel):
    title: Title
    url: Annotated[
        str, StringConstraints(strict=True, strip_whitespace=True, min_length=1, max_length=1024)
    ]

    @field_validator("title")
    @classmethod
    def title_size(cls, value):
        if len(value.encode("utf-8")) > 200:
            raise ValueError("title must be at most 200 UTF-8 bytes")
        return value

    @field_validator("url")
    @classmethod
    def http_url(cls, value):
        parsed = HTTP_URL.validate_python(value)
        if parsed.username is not None or parsed.password is not None:
            raise ValueError("URL must not contain credentials")
        if len(value.encode("utf-8")) > 1024:
            raise ValueError("URL must be at most 1024 UTF-8 bytes")
        return value


class OfferCreate(ContentCreate):
    description: Text
    source: Title
    tag: Tag
    expires: date | None = None
    offer_details: Annotated[str, StringConstraints(strict=True, max_length=20000)] | None = None
    claim_steps: Annotated[list[Text], Field(max_length=100)] | None = None

    @field_validator("expires", mode="before")
    @classmethod
    def strict_expiry(cls, value):
        return None if value is None else parse_date(value)

    @model_validator(mode="after")
    def offer_rules(self):
        if not FREE.search(self.description):
            raise ValueError("description must explicitly say free, no-cost, zero-cost, or $0")
        text = " ".join(
            [
                self.title,
                self.description,
                self.url,
                self.source,
                self.tag,
                self.offer_details or "",
                *(self.claim_steps or []),
            ]
        )
        if TELCO.search(text):
            raise ValueError("telco and phone offers are not allowed")
        return self


class ArticleCreate(ContentCreate):
    body: Text
    date: date

    @field_validator("date", mode="before")
    @classmethod
    def strict_date(cls, value):
        return parse_date(value)


class OfferRead(OfferCreate):
    id: int
    created_at: datetime


class ArticleRead(ArticleCreate):
    id: int
    created_at: datetime


Item = TypeVar("Item")


class PublishResponse(StrictModel, Generic[Item]):
    item: Item
    push: PushStatus


Topic = Literal["deals", "picks", "airdrops", "tips"]


class SubscribeRequest(StrictModel):
    token: Annotated[str, StringConstraints(strict=True, strip_whitespace=True, min_length=1)]
    topics: list[Topic] = Field(default_factory=lambda: ["deals", "picks", "airdrops", "tips"])

    @field_validator("topics")
    @classmethod
    def unique_topics(cls, value):
        return list(dict.fromkeys(value))


class SubscribeResponse(StrictModel):
    subscribed: list[Topic]
