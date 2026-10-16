import type { ConfigContext, ExpoConfig } from "expo/config";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export default ({ config }: ConfigContext): ExpoConfig => {
  const androidPackage = process.env.ANDROID_PACKAGE || "com.dailydrop.app";
  const googleFile =
    process.env.GOOGLE_SERVICES_JSON || "./firebase/google-services.json";
  const firebaseConfigured = existsSync(resolve(__dirname, googleFile));
  if (firebaseConfigured) {
    const google = JSON.parse(
      readFileSync(resolve(__dirname, googleFile), "utf8"),
    );
    const matches = google.client?.some(
      (client: {
        client_info?: { android_client_info?: { package_name?: string } };
      }) =>
        client.client_info?.android_client_info?.package_name ===
        androidPackage,
    );
    if (!matches)
      throw new Error(
        "The Android package does not match google-services.json. Register the correct Android app in Firebase.",
      );
  }
  const projectId = process.env.EAS_PROJECT_ID;
  if (
    projectId &&
    !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
      projectId,
    )
  )
    throw new Error("EAS_PROJECT_ID must be a real EAS project UUID.");
  return {
    ...config,
    name: "Daily Drop",
    slug: "daily-drop",
    version: "1.0.0",
    scheme: "dailydrop",
    orientation: "portrait",
    userInterfaceStyle: "light",
    icon: "./assets/icon.png",
    android: {
      package: androidPackage,
      versionCode: 1,
      ...(firebaseConfigured ? { googleServicesFile: googleFile } : {}),
      permissions: ["POST_NOTIFICATIONS"],
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#17824f",
      },
      predictiveBackGestureEnabled: true,
    },
    plugins: [
      "expo-router",
      "expo-font",
      "expo-secure-store",
      [
        "expo-splash-screen",
        {
          image: "./assets/icon.png",
          imageWidth: 100,
          backgroundColor: "#fafbf8",
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#17824f",
          defaultChannel: "daily-drops",
        },
      ],
      ...(firebaseConfigured
        ? ["@react-native-firebase/app", "@react-native-firebase/messaging"]
        : []),
    ],
    updates: projectId
      ? {
          url: `https://u.expo.dev/${projectId}`,
          checkAutomatically: "ON_LOAD",
        }
      : { enabled: false },
    runtimeVersion: { policy: "fingerprint" },
    extra: {
      nativeFirebaseConfigured: firebaseConfigured,
      ...(projectId ? { eas: { projectId } } : {}),
    },
    web: { bundler: "metro", output: "single", favicon: "./assets/icon.png" },
  };
};
