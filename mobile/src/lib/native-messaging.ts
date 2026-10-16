/* eslint-disable @typescript-eslint/no-require-imports -- Native Firebase must load synchronously behind the Android build guard. */
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import type * as MessagingSDK from "@react-native-firebase/messaging";
export const nativeFirebaseConfigured =
  Platform.OS === "android" &&
  Constants.expoConfig?.extra?.nativeFirebaseConfigured === true &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
let client:
  { sdk: typeof MessagingSDK; messaging: MessagingSDK.Messaging } | undefined;
export function nativeMessaging() {
  if (!nativeFirebaseConfigured) return null;
  if (!client) {
    // Keep native-only modules out of Expo Go and the browser preview runtime.
    // Synchronous guarded imports register background handlers before app startup.
    const app =
      require("@react-native-firebase/app") as typeof import("@react-native-firebase/app");
    const sdk =
      require("@react-native-firebase/messaging") as typeof MessagingSDK;
    client = { sdk, messaging: sdk.getMessaging(app.getApp()) };
  }
  return client;
}
