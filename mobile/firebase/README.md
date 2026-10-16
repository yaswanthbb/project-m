Place your real Firebase **Android app** registration at `google-services.json` in this directory. Register package `com.dailydrop.app` in the same Firebase project used by the backend, or set `ANDROID_PACKAGE` to your chosen package before building.

This is not a service-account key. Never copy the backend Firebase Admin JSON into the mobile app. Registration files are ignored by Git and no placeholder config is included. Feed browsing remains available without this file; enabling FCM requires rebuilding after adding it.
