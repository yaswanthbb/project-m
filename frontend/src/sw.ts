/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { clientsClaim } from "workbox-core";
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";
import { firebaseConfig, firebaseConfigured } from "./lib/firebase-config";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};
const base = import.meta.env.BASE_URL;
// Register before initializing Firebase so custom routing handles notification taps.
self.addEventListener("notificationclick", (event) => {
  event.stopImmediatePropagation();
  event.notification.close();
  const data =
    event.notification.data?.FCM_MSG?.data || event.notification.data || {};
  const tab = ["deals", "picks", "airdrops", "tips"].includes(data.tab)
    ? data.tab
    : "deals";
  const id = /^[1-9]\d*$/.test(data.item_id || "") ? `/${data.item_id}` : "";
  const hash = `#/${tab}${id}`;
  const url = new URL(`${base}${hash}`, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = windows.find((client) =>
        client.url.startsWith(new URL(base, self.location.origin).href),
      ) as WindowClient | undefined;
      if (existing) {
        existing.postMessage({ type: "NOTIFICATION_OPEN", hash });
        await existing.focus();
      } else await self.clients.openWindow(url);
    })(),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(
  new NavigationRoute(createHandlerBoundToURL(`${base}index.html`)),
);
if (firebaseConfigured) {
  // Register the Firebase push listener synchronously during worker startup.
  // An async support check here can race the first background push event.
  try {
    const messaging = getMessaging(initializeApp(firebaseConfig));
    onBackgroundMessage(messaging, async (payload) => {
      // Firebase displays notification+data messages from this API automatically.
      if (payload.notification) return;
      const data = payload.data || {};
      const tag = `${data.tab || "deals"}:${data.item_id || payload.messageId}`;
      await self.registration.showNotification(
        data.title || "A fresh Daily Drop",
        {
          body: data.body || "Something new is waiting in your feed.",
          icon: `${base}icon-192.png`,
          badge: `${base}icon-192.png`,
          tag,
          data,
        },
      );
    });
  } catch {
    // Feeds and offline browsing remain available without push.
  }
}
