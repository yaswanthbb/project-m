import { useCallback, useEffect, useRef, useState } from "react";
import { firebaseConfigured } from "./firebase-config";
import { getRegistration } from "./pwa";
import {
  isTopic,
  notificationRoute,
  parseRoute,
  readFeed,
  request,
  saveFeed,
  storage,
  topics,
  validItems,
} from "./data";
import type { Feeds, Item, Topic } from "./data";

export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const change = () => {
      setRoute(parseRoute(window.location.hash));
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  return route;
}
export function navigate(path: string) {
  window.location.hash = path;
}
export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}
export function useFeeds() {
  const [feeds, setFeeds] = useState<Feeds>(
    () =>
      Object.fromEntries(
        topics.map((topic) => [topic, readFeed(topic)]),
      ) as Feeds,
  );
  const feedsRef = useRef(feeds);
  const controllers = useRef<Partial<Record<Topic, AbortController>>>({});
  const mutate = useCallback(
    (topic: Topic, update: (feed: Feeds[Topic]) => Feeds[Topic]) => {
      const next = {
        ...feedsRef.current,
        [topic]: update(feedsRef.current[topic]),
      };
      feedsRef.current = next;
      setFeeds(next);
    },
    [],
  );
  const refresh = useCallback(
    async (topic: Topic) => {
      controllers.current[topic]?.abort();
      const controller = new AbortController();
      controllers.current[topic] = controller;
      const timeout = setTimeout(() => controller.abort("timeout"), 75000);
      mutate(topic, (feed) => ({ ...feed, loading: true, error: null }));
      try {
        const response = await request(`/api/${topic}`, {
          signal: controller.signal,
        });
        const items = validItems(await response.json());
        if (controller.signal.aborted) return;
        const updated = Date.now();
        saveFeed(topic, items, updated);
        mutate(topic, () => ({
          items,
          updated,
          loading: false,
          error: null,
          cached: false,
        }));
      } catch {
        if (controller.signal.aborted && controller.signal.reason !== "timeout")
          return;
        mutate(topic, (feed) => ({
          ...feed,
          loading: false,
          cached: Boolean(feed.updated),
          error: navigator.onLine
            ? "We couldn’t reach the feed. The server may be waking up—give it a moment and try again."
            : "You’re offline. Your last saved finds are still here.",
        }));
      } finally {
        clearTimeout(timeout);
        if (controllers.current[topic] === controller)
          delete controllers.current[topic];
      }
    },
    [mutate],
  );
  useEffect(() => {
    const all = () => topics.forEach((topic) => void refresh(topic));
    all();
    window.addEventListener("online", all);
    return () => {
      window.removeEventListener("online", all);
      Object.values(controllers.current).forEach((controller) =>
        controller?.abort(),
      );
    };
  }, [refresh]);
  const remove = (topic: Topic, id: number) => {
    controllers.current[topic]?.abort();
    mutate(topic, (feed) => {
      const items = feed.items.filter((item) => item.id !== id);
      saveFeed(topic, items, feed.updated);
      return { ...feed, items, loading: false };
    });
  };
  return { feeds, refresh, remove };
}
export interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
export function useInstall() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(
    window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
  );
  useEffect(() => {
    const available = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", available);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", available);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  const install = async () => {
    if (!prompt) return false;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    setPrompt(null);
    return choice.outcome === "accepted";
  };
  return { installed, available: Boolean(prompt), install };
}
export function usePush(
  onNew: (topic: Topic, title: string, hash: string) => void,
) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const callback = useRef(onNew);
  callback.current = onNew;
  const [dismissed, setDismissed] = useState(
    Boolean(storage.get("daily-drop:push-dismissed")) ||
      (typeof Notification !== "undefined" &&
        Notification.permission === "granted"),
  );
  const [subscribed, setSubscribed] = useState(false);
  const sync = useCallback(async () => {
    const { syncPush } = await import("./push");
    await syncPush(await getRegistration());
    setSubscribed(true);
  }, []);
  const enable = async () => {
    setBusy(true);
    setStatus("");
    try {
      if (!firebaseConfigured)
        throw new Error(
          "Notifications aren’t configured yet. Add your Firebase web config and VAPID key, then rebuild the app.",
        );
      if (typeof Notification === "undefined")
        throw new Error(
          "This browser doesn’t support notifications. On iPhone or iPad, add Daily Drop to your Home Screen first.",
        );
      if (Notification.permission === "denied")
        throw new Error(
          "Notifications are blocked. Allow them in your browser’s site settings, then try again.",
        );
      // Keep permission request in the user gesture, before any async SDK setup.
      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        throw new Error(
          "Notifications are off. You can enable them here whenever you like.",
        );
      await sync();
      setDismissed(true);
      setStatus(
        "You’re subscribed to all four feeds. We’ll give you a heads-up when something new arrives.",
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "We couldn’t enable alerts. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    const seen = new Set<string>();
    const resync = () => {
      if (
        !firebaseConfigured ||
        typeof Notification === "undefined" ||
        Notification.permission !== "granted" ||
        !navigator.onLine
      )
        return;
      void sync().catch(() => {
        if (active) {
          setSubscribed(false);
          setStatus(
            "Alerts couldn’t reconnect. Retry in Settings when you’re online.",
          );
        }
      });
    };
    if (
      firebaseConfigured &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      void import("./push")
        .then((module) =>
          module.watchMessages((payload) => {
            const key = `${payload.data?.tab}:${payload.data?.item_id || payload.messageId}`;
            if (seen.has(key)) return;
            seen.add(key);
            if (seen.size > 100) seen.delete(seen.values().next().value!);
            const topic = isTopic(payload.data?.tab)
              ? payload.data.tab
              : "deals";
            callback.current(
              topic,
              payload.notification?.title ||
                payload.data?.title ||
                "A new find just landed",
              notificationRoute(payload.data),
            );
          }),
        )
        .then((stop) => {
          if (active) unsubscribe = stop;
          else stop();
        })
        .catch(() => {});
    }
    resync();
    const visibility = () => {
      if (document.visibilityState === "visible") resync();
    };
    window.addEventListener("online", resync);
    document.addEventListener("visibilitychange", visibility);
    const timer = setInterval(resync, 60 * 60 * 1000);
    return () => {
      active = false;
      unsubscribe?.();
      clearInterval(timer);
      window.removeEventListener("online", resync);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [sync, subscribed]);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const open = (event: MessageEvent) => {
      if (
        event.data?.type === "NOTIFICATION_OPEN" &&
        typeof event.data.hash === "string"
      ) {
        const route = parseRoute(event.data.hash);
        if (route.section !== "settings") {
          navigate(`/${route.section}${route.id ? `/${route.id}` : ""}`);
          callback.current(route.section, "", "");
        }
      }
    };
    navigator.serviceWorker.addEventListener("message", open);
    return () => navigator.serviceWorker.removeEventListener("message", open);
  }, []);
  return {
    enable,
    busy,
    status,
    subscribed,
    showPrompt: !dismissed,
    dismiss() {
      storage.set("daily-drop:push-dismissed", "1");
      setDismissed(true);
    },
  };
}
export function usePullRefresh(refresh: () => void, enabled: boolean) {
  const [distance, setDistance] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const distanceRef = useRef(0);
  const callback = useRef(refresh);
  callback.current = refresh;
  useEffect(() => {
    const reset = () => {
      start.current = null;
      distanceRef.current = 0;
      setDistance(0);
    };
    const down = (event: TouchEvent) => {
      if (
        enabled &&
        window.scrollY <= 0 &&
        event.touches.length === 1 &&
        !(event.target as Element).closest("button,a,input,dialog")
      )
        start.current = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
        };
    };
    const move = (event: TouchEvent) => {
      if (!start.current) return;
      const x = Math.abs(event.touches[0].clientX - start.current.x);
      const y = event.touches[0].clientY - start.current.y;
      if (x > 35 || y < 0 || window.scrollY > 0) {
        reset();
        return;
      }
      if (y > 10) {
        if (event.cancelable) event.preventDefault();
        distanceRef.current = Math.min(y * 0.45, 100);
        setDistance(distanceRef.current);
      }
    };
    const up = () => {
      if (distanceRef.current >= 65) callback.current();
      reset();
    };
    window.addEventListener("touchstart", down, { passive: true });
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
    window.addEventListener("touchcancel", reset);
    return () => {
      window.removeEventListener("touchstart", down);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
      window.removeEventListener("touchcancel", reset);
    };
  }, [enabled]);
  return distance;
}
export type DeleteTarget = { topic: Topic; item: Item };
