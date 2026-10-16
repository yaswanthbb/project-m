# Daily Drop · Android

The React Native + Expo replacement for the original web frontend. It carries over the green/cream Daily Drop design, cards, illustrations, clear type, rounded buttons, three bottom tabs, and all four API feeds. This is a native Android application. The browser target exists only to inspect/test the same native screen components.

## Run

Requires Node 22.13+ (or a supported newer Node release).

```bash
cd mobile
npm ci
cp .env.example .env.local
npm run preview:phone
```

`preview:phone` opens the UI in a matching **Expo Go** app. Feed reading, details, local cache, and token management can be explored there. Native FCM requires a development or release build containing Firebase; Expo Go cannot load that custom native module.

For a browser inspection of the same screen components, run `npm run web`. This is a preview, not a replacement PWA or a static frontend deployment.

## Build an installable Android APK

Use either route:

- **Local Android toolchain:** install Java and Android Studio/SDK, configure `ANDROID_HOME`, then run `npm run android` with a connected device/emulator. Expo generates the native project; do not edit generated Android files by hand. For a local APK without launching a device, run `npx expo prebuild --platform android`, then `cd android && ./gradlew assembleRelease`. Configure release signing before distributing a public release.
- **EAS cloud build:** run `npx eas-cli@latest login`, then `npx eas-cli@latest build --platform android --profile preview` from `mobile/`. Link your own Expo/EAS project when prompted. With this dynamic app config, set the real project UUID as `EAS_PROJECT_ID` in the build environment. The `preview` profile produces a downloadable APK; `production` produces a Play Store app bundle. Cloud builds and publishing are user-run; no account, upload, release, or paid build is triggered by the repository.

A JavaScript Android export is a bundle check, **not an APK**. No APK is claimed unless a native Gradle/EAS build succeeds. This workspace did not have Java, Android SDK, a connected device, or EAS credentials at implementation time.

## Firebase notifications

1. Use the **same Firebase project** as the Render backend. Register an **Android app** with package `com.dailydrop.app` (or set `ANDROID_PACKAGE` before registering/building).
2. Download its real **`google-services.json`** into `mobile/firebase/google-services.json`. Alternatively set `GOOGLE_SERVICES_JSON` to the file path supplied by your build environment. The app checks that the registered package matches. No fabricated Firebase IDs or keys are included.
3. Make a new native development or release build. Firebase native configuration cannot be added with a JavaScript update. The optional file is ignored by Git; make sure a remote build receives the real file through your own EAS file environment variable or a local upload, without adding Admin credentials to the app.
4. Open the app, tap **Keep me posted** or enable notifications in Settings. It creates the Android notification channel, requests the platform permission, gets the native FCM token, and POSTs `{ token, topics: ['deals', 'picks', 'airdrops', 'tips'] }` to the existing `/api/push/subscribe` endpoint.
5. Publish one item through your trusted backend workflow to test real delivery and notification taps. No test content is published by this app.

The native SDK’s `onTokenRefresh` re-sends new tokens. Foreground/reconnection checks re-register previously enabled devices. A rotated token is queued behind an in-flight registration so it is not lost. Server success is required before showing “Connected.” The backend must still have Firebase Cloud Messaging permissions: switching to Android does not fix its previous `PERMISSION_DENIED` response. See the root README’s subscription troubleshooting section.

Background notification+data pushes from the API are displayed by Android/FCM. Data-only pushes use the registered background handler; foreground pushes use a local native notification. Taps from a running/background/closed app validate `tab` and `item_id` and open the correct detail or Money tab. Foreground notifications are deduplicated by topic/item identity. Native FCM does not use a web VAPID key, browser permission, manifest, or service worker.

Feed browsing works without Firebase. Settings accurately explains an unconfigured build rather than requesting permission with placeholder credentials. Existing web configuration was preserved locally as ignored `.env.web-reference` during migration; it is not read or bundled into the native app. Never put backend Admin credentials or a publish token into any `EXPO_PUBLIC_*` variable.

## Native app updates

The Settings **Update app** button uses `expo-updates` to check, fetch, and reload a compatible release update. Set `EAS_PROJECT_ID` to a real linked EAS project UUID before building to enable its update URL; preview/production channels are in `eas.json`. Runtime compatibility uses the fingerprint policy, so native library/config changes need a new APK. Publish updates using your own EAS account and matching channel.

Without an update project, the button explains that a new APK is needed. Development/Expo Go/browser previews explain their own update limits. An offline or failed check never claims to be up to date.

## Preserved features and platform changes

- Three bottom destinations: **Deals**, **Machine’s Picks**, **Money**; Money has **Crypto Airdrops / Financial Tips** tabs.
- Today/Earlier grouping uses editorial `date` for notes and device-local `created_at` for offers. IDs preserve multiple items on the same day. Search/category filters, full details, numbered claim steps, deadlines, and official-site links are retained.
- Airdrop lists/details always show “Never share seed phrases or private keys. Only use official links.” Financial tips carry “Educational only, not financial advice.” No guaranteed returns or personalized advice is introduced.
- The backend still shares offer fields between deals and airdrops. Missing reward/eligibility/claim information is identified clearly; nothing is invented. Optional future `reward` and `eligibility` strings are supported.
- Pull-to-refresh is native. Startup restores per-feed AsyncStorage snapshots before refreshing, and successful updates persist independently. API outages do not overwrite good saved content. Returning online refreshes feeds; returning to the app refreshes stale feeds.
- Publish tokens are entered in Settings, cleared from the input after saving, and kept in **Android encrypted SecureStore**, separate from cached content. They are sent only in `X-Publish-Token` on DELETE. Browser preview uses browser-local storage solely for interaction testing. Device/browser storage is best effort and can be cleared by the user/system.
- Deletion requires a dialog and acts on the backend for everyone. Confirmed deletions update the cache and abort older feed reads. Cache writes are ordered so a stale pending save cannot restore a deleted item. A 404 means already removed. Network/timeouts are described as unconfirmed, with refresh recommended.
- HTTP(S) claim links are validated and opened using the device browser; embedded credentials and executable schemes are blocked. Text is rendered as text, never injected HTML.

## Verify

```bash
npm run typecheck
npm run lint
npm test
npm run export:android
npm run export:preview
npm run test:ui
npx expo-doctor
```

Unit tests cover feed identity/grouping, safe links, notification destinations, subscription success/partial failure/permission errors, native secure storage boundaries, corrupt caches, and deletion/cache-write ordering. Browser checks use mocked API feeds to inspect the native React Native screen tree, detail flows, filters, confirmations, storage recovery, and safety text. They do not prove Android rendering, encrypted storage behavior on hardware, FCM delivery, or EAS update delivery. Those require an installed native build and real Firebase configuration.

The SDK-compatible dependency tree includes upstream npm advisories with no patched versions available for some Metro/config tooling. Do not apply npm’s suggested forced downgrade to obsolete Expo/React Native releases; recheck advisories when patched SDK-compatible releases become available.
