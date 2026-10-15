# Daily Drop

A light, mobile-first React + Vite + Tailwind PWA for the existing Personal News API. All changes stay local; nothing is deployed automatically.

## Start

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Feeds default to `https://personal-news-api.onrender.com`. `VITE_API_BASE_URL` overrides that address. No sample items are shipped or inserted into the API. Empty feeds are intentional empty states.

## Static deployment

```bash
npm run build
```

Publish **`frontend/dist`** using a static HTTPS host. With the host’s root directory set to `frontend`, use build command `npm ci && npm run build` and publish directory `dist`. No Node server or frontend API proxy is needed. Deep links use hashes, so static-host routing rewrites aren’t required.

For a subdirectory deployment, set `VITE_BASE_PATH=/your-path/` before building, including the leading and trailing slashes. The manifest, worker, icons, and push deep links follow this base. Serve `sw.js` and `manifest.webmanifest` with revalidation/no-cache headers; do not apply immutable caching to them. Hashed assets can be cached immutably. Preserve the previous build’s hashed assets during rollouts until old clients have refreshed.

Run `npm run preview` after building to test install/offline/push behavior locally. The production worker is intentionally disabled in `npm run dev`, so hot-reload development never caches stale application code.

### Required backend CORS update

The deployed API responded to our public read on 2026-10-15 without `Access-Control-Allow-Origin`. Browsers block cross-origin frontend requests until the included backend CORS change is deployed. There is no client-side workaround for missing server permission.

`backend/main.py` now enables CORS for the public feeds, subscription POST, and header-authenticated DELETE. Cookie credentials remain disabled. Default `FRONTEND_ORIGINS=*` supports public static clients. To restrict browser origins, set the backend environment variable to a comma-separated list of exact origins, for example:

```text
FRONTEND_ORIGINS=https://your-static-site.example,http://localhost:5173,http://localhost:4173
```

Do not include paths or trailing slashes. Redeploy the backend with this change before connecting a separately hosted frontend. CORS doesn’t replace the publish token; authenticated endpoints still validate it.

## Firebase web push

1. Create/register a Web app in the **same Firebase project** used by the deployed backend’s Admin SDK.
2. Add its public web config and public Web Push certificate key to the empty `VITE_FIREBASE_*` entries in `.env.local` (or the static host’s build environment). No fake or placeholder Firebase values are included. Never add an Admin service account or the backend publish token to a Vite variable: `VITE_*` values are public build output.
3. Enable the Firebase Cloud Messaging API. The backend must have valid Firebase Admin credentials and `/api/push/subscribe` must be operational.
4. Rebuild. Tap **Keep me posted** on first launch or **Enable notifications** in Settings. Native permission is requested only after that explicit action. On iOS/iPadOS, use a supported version and install to the Home Screen before enabling alerts.
5. On a real HTTPS device, publish an item from your trusted backend workflow. Check foreground messages, background notifications, and notification taps for all four topics.

The app calls Firebase `getToken` with the **same service-worker registration** used for offline caching, then POSTs `{ token, topics: ['deals', 'picks', 'airdrops', 'tips'] }` to `/api/push/subscribe`. It rechecks the current token and re-subscribes on startup, return to the app, reconnection, and hourly while open. The modular Firebase Web SDK has no `onTokenRefresh` callback; repeated `getToken` calls handle rotation. Failed/partial subscriptions are not shown as connected, and retry on subsequent checks.

The bundled worker handles data-only pushes; Firebase displays notification-plus-data pushes from this backend automatically, avoiding duplicate displays. Notification taps use the backend’s `tab` and `item_id` fields and open the matching feed/detail, including the correct Money tab. Untrusted push URLs are never used for navigation. Foreground messages are deduplicated by topic/item identity.

Firebase-free builds still browse, cache, and install normally. Settings explain when alerts aren’t configured. Real FCM token registration and device delivery require your credentials and a device smoke test; they cannot be verified by mocks.

## Data and privacy

- The four feeds are public GETs. Cards and details use the backend’s existing fields. Picks/tips use their editorial `date` for Today/Earlier; offers use `created_at` in the device’s timezone. IDs keep multiple items on one day distinct.
- The current backend shares an offer schema for deals and airdrops: `source`, `description`, `offer_details`, `expires`, `claim_steps`. The UI accepts optional `reward`/`eligibility` strings if a future backend supplies them. Otherwise, it clearly points to the official project for missing reward/eligibility information; it does not invent requirements or rewards. No database migration is needed.
- Every airdrop list/detail contains: “Never share seed phrases or private keys. Only use official links.” Financial tips include the educational disclaimer. Feed content is rendered as plain text, never injected as HTML.
- Settings stores a publish token in localStorage only when entered by the user. It is never prefilled, rendered as text, logged, bundled, or sent with public reads/push registration. Input clears after saving. Only DELETE requests send `X-Publish-Token`. Removing a token clears it from this device. Treat local browser storage as sensitive; use the app only on a trusted device.
- Deletion requires confirmation and removes the item for everyone. A 404 is treated as already deleted. Network/timeout outcomes are described as unconfirmed; refresh to reconcile. Cached data is updated after successful deletion, and pending feed reads are aborted to prevent stale responses from restoring the item.
- Successful feed snapshots are stored independently in localStorage, so an outage doesn’t replace good saved content with an empty/error result. Storage restrictions may disable persistence. The service worker precaches the complete app shell and the locally hosted font. Browser storage is best effort and can be cleared by the browser/user.
- Pull down from the top of a feed to refresh on touch devices. A visible Refresh control is available for every input type.
- **Settings → Update app** checks the worker, waits for an installation, activates a waiting version, and reloads. Offline or failed update checks report an error without claiming success.

## Verify

```bash
npm test
npm run build
npm run test:e2e
```

Browser checks use synthetic fixtures intercepted locally by Playwright; no live items are published/deleted and no real notifications are sent. Tests use installed Chrome (`/usr/bin/google-chrome` by default; override `CHROME_PATH` for another Chromium binary). The suite starts a production preview on port 4173 when needed.
