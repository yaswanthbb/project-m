import { nativeMessaging } from "./native-messaging";
import type { RemoteMessage } from "@react-native-firebase/messaging";
const seen = new Set<string>();
export async function showMessage(message: RemoteMessage) {
  const key = `${message.data?.tab}:${message.data?.item_id || message.messageId}`;
  if (seen.has(key)) return;
  seen.add(key);
  if (seen.size > 100) seen.delete(seen.values().next().value!);
  const Notifications = await import("expo-notifications");
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;
  await Notifications.scheduleNotificationAsync({
    identifier: key,
    content: {
      title:
        message.notification?.title ||
        String(message.data?.title || "A fresh Daily Drop"),
      body:
        message.notification?.body ||
        String(message.data?.body || "Something new is waiting in your feed."),
      data: message.data || {},
      sound: "default",
    },
    trigger: null,
  });
}
try {
  const client = nativeMessaging();
  if (client)
    client.sdk.setBackgroundMessageHandler(
      client.messaging,
      async (message) => {
        // Android displays the API's notification+data messages automatically.
        if (!message.notification) await showMessage(message);
      },
    );
} catch {
  /* Browsing remains available in a build without Firebase native setup. */
}
