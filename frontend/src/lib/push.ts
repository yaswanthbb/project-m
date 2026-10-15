import { initializeApp, getApps } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
} from "firebase/messaging";
import type { MessagePayload } from "firebase/messaging";
import {
  firebaseConfig,
  firebaseConfigured,
  vapidKey,
} from "./firebase-config";
import { request, topics } from "./data";

export async function messagingClient() {
  if (!firebaseConfigured)
    throw new Error(
      "Notifications will be ready when Firebase is configured for this app.",
    );
  if (!(await isSupported()))
    throw new Error(
      "Push isn’t supported here. On iPhone or iPad, add this app to your Home Screen first.",
    );
  return getMessaging(getApps()[0] || initializeApp(firebaseConfig));
}
let pending: Promise<void> | undefined;
// The current modular Web SDK has no onTokenRefresh callback. getToken checks
// rotation; run at launch, focus, reconnection, and periodically while open.
export function syncPush(registration: ServiceWorkerRegistration) {
  if (pending) return pending;
  pending = (async () => {
    const messaging = await messagingClient();
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    if (!token)
      throw new Error("No device subscription was created. Please try again.");
    const response = await request("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, topics }),
    });
    const result = await response.json();
    if (
      !Array.isArray(result.subscribed) ||
      !topics.every((topic) => result.subscribed.includes(topic))
    )
      throw new Error(
        "Some feeds couldn’t be subscribed. Try enabling alerts again.",
      );
  })().finally(() => {
    pending = undefined;
  });
  return pending;
}
export async function watchMessages(
  callback: (message: MessagePayload) => void,
) {
  return onMessage(await messagingClient(), callback);
}
