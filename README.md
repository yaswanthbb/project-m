# Personal News API

A Python 3.12 FastAPI backend using SQLAlchemy 2.0, psycopg3, Neon PostgreSQL, Alembic, and Firebase Admin. Four public feeds share authenticated publishing and deletion. OpenAPI and interactive API documentation are at `/openapi.json` and `/docs`.

## Run locally

From the repository root:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements-dev.txt
cp backend/.env.example backend/.env
```

Edit `backend/.env`: set `DATABASE_URL` to your Neon connection string, including `sslmode=require`, and `PUBLISH_TOKEN` to a strong random secret (generate one with `python -c 'import secrets; print(secrets.token_urlsafe(32))'`). Keep this file private. PostgreSQL URLs beginning with `postgres://`, `postgresql://`, or `postgresql+psycopg://` all use psycopg3. URL-encode special characters in credentials.

```bash
cd backend
python migrate.py --require-postgres
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1
```

`PUBLISH_TOKEN` and `DATABASE_URL` are mandatory. The server refuses startup with a missing or blank token. Existing process environment variables take precedence over `backend/.env`. Public reads and health checks do not require a token.

For local development without PostgreSQL, use `DATABASE_URL=sqlite:///./news.db` and run `python migrate.py` without the PostgreSQL guard. Production should use Neon.

## Migrations

Migrations are explicit, versioned files under `backend/migrations/versions`. Startup never creates or alters tables. Apply migrations before the first deployment and before starting a release containing schema changes:

```bash
cd backend
# DATABASE_URL may instead be loaded from backend/.env.
export DATABASE_URL='postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require'
python migrate.py --require-postgres
alembic current
alembic check
```

The runner checks the target dialect, takes a PostgreSQL transaction advisory lock, upgrades to Alembic head, and verifies the resulting revision. It requires neither the publish token nor Firebase credentials. Re-running it at head is safe. To create future migrations, change the models, run `alembic revision --autogenerate -m "describe change"`, review the resulting revision, and then run the migration script. Never use `create_all` or stamp a revision to bypass an upgrade.

`alembic downgrade base` removes **all feed and outbox data**. Use it only on disposable test databases. Back up production before any schema maintenance.

## Deploy to Render with Neon

1. Create a Neon project/database and copy its PostgreSQL connection string. Keep the TLS parameters. A pooled endpoint is suitable for API traffic; use Neon's direct connection string when running schema migrations.
2. From a trusted local terminal, set `DATABASE_URL` to the Neon direct connection string and run `cd backend && python migrate.py --require-postgres` using the installed virtual environment. This must finish before the service starts.
3. Put this repository in your Git provider, then create a Render **Blueprint** from it. The root `render.yaml` declares a free Python web service with `rootDir: backend`, the requested build/start commands, and `/health` as its health check. Python 3.12 is selected by `.python-version`. No Render database is provisioned.
4. Render prompts for the three `sync: false` values: `DATABASE_URL` (Neon, with TLS), `PUBLISH_TOKEN`, and `FIREBASE_SERVICE_ACCOUNT_JSON` (a Firebase service account JSON object). To run without push credentials, leave the Firebase value blank/remove that optional environment entry after creation. The API still saves items and outbox entries.
5. Deploy and verify `curl --fail-with-body 'https://YOUR-SERVICE.onrender.com/health'` returns `{"status":"ok"}`. Configure the app to use this base URL and subscribe each device to the desired FCM topics: `deals`, `picks`, `airdrops`, `tips`.
6. For subsequent releases, run any new migrations against Neon before deploying the new API code. The build command only installs dependencies; it does not run migrations. Migrations are a separate step.

Render's free service can spin down while idle, so background retries run only while the process is awake and resume from PostgreSQL after restart. See [Render free service limitations](https://render.com/docs/free), [Blueprint reference](https://render.com/docs/blueprint-spec), and [Python version selection](https://render.com/docs/python-version).

## API contract

- `GET /health`: executes `SELECT 1`; returns `{"status":"ok"}` on success or 503 if the database is unavailable.
- `GET /api/deals`, `/api/picks`, `/api/airdrops`, `/api/tips`: public JSON arrays containing all item fields, including integer `id` and UTC `created_at`. Offers sort by `created_at DESC, id DESC`; picks/tips by `date DESC, created_at DESC, id DESC`.
- `POST /api/push/subscribe`: public device topic subscription, described below.
- `POST` on each feed: send `X-Publish-Token`. A successful save returns HTTP 201 with `{"item": {...}, "push": "sent" | "queued" | "not_configured"}`. Invalid/missing tokens return 401. Invalid content returns 422. Tokens use a constant-time comparison.
- Duplicate publishing returns 409 and creates neither another outbox row nor another immediate push. Picks/tips enforce exact `(title, url, date)` uniqueness, allowing multiple different items on a date. Deals enforce unique `url` as requested. Airdrops have no date, so exact duplicate identity is `(title, url)`. Uniqueness is per feed and enforced by database constraints, including concurrent requests.
- `DELETE /api/{feed}/{id}`: token required; 204 with an empty body on success, 404 for an absent positive ID. Unsent outbox entries for the deleted item are removed in the same transaction. An already accepted or in-flight FCM push cannot be recalled.

Unknown request fields are forbidden. Required strings must be nonempty; HTTP(S) URLs must be valid and cannot contain credentials. Titles are limited to 200 UTF-8 bytes and URLs to 1,024 UTF-8 bytes to keep topic payloads small; body/description/details/individual steps are limited to 20,000 characters. Tags are exactly `AI`, `Dev tools`, `SaaS`, `Software`, `Cloud`, `Data`, `Security`, `Design`, `Learning`. An offer description must explicitly contain `free`, `no-cost`, `zero-cost`, or `$0` (case insensitive). Telco/phone terms, including recharge, phone plans, smartphones, SIM/eSIM, cellular, prepaid/postpaid, and data plans, are rejected across all offer text fields. This is deterministic validation, not external verification of an offer's claims.

`expires` is an optional calendar date in `YYYY-MM-DD` or null. `offer_details` is optional text or null. `claim_steps` is an optional JSON array of nonempty strings (up to 100 steps) or null. Picks/tips require `date` in `YYYY-MM-DD`; timestamps, numeric epochs, impossible dates, and non-padded dates are rejected.

## Publish one item to every feed

Set your base URL and the same token configured on the server. These commands work locally or with the Render URL. The sample links/content below are illustrative; replace them with real offers/news before use.

```bash
export API_BASE='http://localhost:8000'
export PUBLISH_TOKEN='replace-with-your-server-publish-token'

curl --fail-with-body -i -X POST "$API_BASE/api/deals" \
  -H "X-Publish-Token: $PUBLISH_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"title":"Free developer toolkit","description":"A free developer toolkit at no cost.","url":"https://example.com/developer-toolkit","source":"Example","tag":"Dev tools","expires":null,"offer_details":"The community edition costs $0.","claim_steps":["Open the toolkit page","Choose the community edition"]}'

curl --fail-with-body -i -X POST "$API_BASE/api/picks" \
  -H "X-Publish-Token: $PUBLISH_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"title":"Today in open source","body":"A roundup of useful open source releases.","url":"https://example.com/open-source-roundup","date":"2026-10-15"}'

curl --fail-with-body -i -X POST "$API_BASE/api/airdrops" \
  -H "X-Publish-Token: $PUBLISH_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"title":"Free cloud learning credits","description":"No-cost cloud learning credits are available for developers.","url":"https://example.com/cloud-learning-credits","source":"Example Cloud","tag":"Cloud","expires":"2026-12-31","offer_details":null,"claim_steps":["Visit the credits page","Register for the learning program"]}'

curl --fail-with-body -i -X POST "$API_BASE/api/tips" \
  -H "X-Publish-Token: $PUBLISH_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"title":"Inspect query plans","body":"Use EXPLAIN to understand which indexes a query uses.","url":"https://example.com/query-plans","date":"2026-10-15"}'
```

Repeating one of these unchanged commands returns 409. Example deletion (replace the ID with one returned by publishing):

```bash
curl --fail-with-body -i -X DELETE "$API_BASE/api/deals/1" \
  -H "X-Publish-Token: $PUBLISH_TOKEN"
```

## Subscribe a device to push topics

Send the device's FCM registration token to this public endpoint; no `X-Publish-Token` is required:

```bash
curl --fail-with-body -X POST "$API_BASE/api/push/subscribe" \
  -H 'Content-Type: application/json' \
  --data '{"token":"YOUR_FCM_REGISTRATION_TOKEN"}'
```

Omitting `topics` subscribes to all four feeds and returns HTTP 200 with `{"subscribed":["deals","picks","airdrops","tips"]}`. To choose feeds, send `{"token":"YOUR_FCM_REGISTRATION_TOKEN","topics":["deals","tips"]}`. Only the four feed names are accepted. Repeated topics are subscribed once, in request order. An explicit empty topics array returns `{"subscribed":[]}` without SDK calls.

The token must be a nonempty string; blank tokens, unknown fields, invalid topics, and null topics return 422. The endpoint uses the existing Firebase app and Python Admin SDK's [`subscribe_to_topic`](https://firebase.google.com/docs/reference/admin/python/firebase_admin.messaging#subscribe_to_topic) for each topic. It returns 503 when Firebase credentials are absent. If Firebase rejects or fails a subscription, it returns 502 with `detail.subscribed` listing confirmed successes and `detail.failed` listing failed topics; a partial result is never reported as full success. Registration tokens and raw provider errors are not logged or persisted by this endpoint.

## Push delivery and operations

Enable the Firebase Cloud Messaging API in your Firebase project. Supply a service account with permission to send FCM messages as raw `FIREBASE_SERVICE_ACCOUNT_JSON`, or set `FIREBASE_SERVICE_ACCOUNT_BASE64` to its base64 encoding. If both are set, raw JSON takes precedence. Invalid configured credentials fail startup with a redacted error; absent credentials allow normal content publishing. Never put the service account or publish token into source control or a public client.

Each successful publish inserts the item and a `push_outbox` row in one transaction. The outbox includes `item_id` in addition to its delivery fields so a queued message can reconstruct its deep link. Only after commit does the API attempt a push. Notification title/body accompany string data `{tab, title, url, item_id}`, with `tab` equal to the feed/topic. Full article text is stored in the feed; notification bodies are truncated to 240 UTF-8 bytes.

- `sent`: FCM accepted the send and the outbox acknowledgement committed. This does not assert device delivery.
- `queued`: a configured send failed, is in progress elsewhere, or its acknowledgement could not be persisted. The item remains saved.
- `not_configured`: no Firebase credentials are present. The outbox remains unsent with zero attempts, ready after credentials are added and the service restarts.

A lifespan task scans due unsent rows every 15 seconds, up to 20 per pass. Failures increment `attempts` and set `next_attempt` with backoff of 30, 60, 120 seconds, increasing to a one-hour cap. PostgreSQL `FOR UPDATE SKIP LOCKED` prevents overlapping dispatchers from sending the same row concurrently. Sent rows remain as delivery history; failed rows are never silently discarded. Monitor oldest pending `next_attempt` and `attempts` in Neon. For a manual retry after fixing a configuration/provider issue, restart the service and wait until the stored due time.

Delivery is **at least once**: FCM can accept a message before a network timeout, or the process can stop between provider acceptance and the acknowledgement commit. Retrying such a row can produce a duplicate notification. Clients should deduplicate by `(tab, item_id)`. Resubmitting an already saved item receives 409; it does not resend that item's push. Firebase's [topic messaging documentation](https://firebase.google.com/docs/cloud-messaging/send-topic-messages) describes SDK topic delivery.

## Verification

```bash
source .venv/bin/activate
cd backend
pytest -q
ruff check .
ruff format --check .
```

By default, tests use fresh SQLite databases built only through Alembic. For PostgreSQL-specific concurrent duplicate and row-lock coverage, create a **disposable, dedicated** database and run:

```bash
TEST_DATABASE_URL='postgresql://USER:PASSWORD@localhost/news_api_test' pytest -q
```

**The test suite deletes all rows and performs migration downgrade/upgrade round trips in `TEST_DATABASE_URL`. Never point it at production.** The suite covers every feed, authentication, validation, duplicate prevention, transaction rollback, queued/retried sends, SDK payloads, schema/model drift, migration guards, and restart recovery. Firebase sends are mocked; a real service-account/device smoke test must be run separately.
