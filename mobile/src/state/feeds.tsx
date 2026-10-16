import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";
import { ApiError, loadFeed, request } from "../lib/api";
import { getPublishToken, readFeed, saveFeed } from "../lib/storage";
import { topics } from "../lib/model";
import type { Feed, Feeds, Topic } from "../lib/model";
const emptyFeed = (): Feed => ({
  items: [],
  updated: 0,
  loading: true,
  error: null,
  cached: false,
});
const initial = (): Feeds => ({
  deals: emptyFeed(),
  picks: emptyFeed(),
  airdrops: emptyFeed(),
  tips: emptyFeed(),
});
interface FeedsContextValue {
  feeds: Feeds;
  online: boolean;
  refresh(topic: Topic): Promise<void>;
  refreshAll(): void;
  remove(topic: Topic, id: number): Promise<void>;
  storageWarning: boolean;
}
const Context = createContext<FeedsContextValue | null>(null);
export function FeedsProvider({ children }: { children: ReactNode }) {
  const [feeds, setFeeds] = useState(initial);
  const current = useRef(feeds);
  const [online, setOnline] = useState(true);
  const onlineRef = useRef(true);
  const [storageWarning, setStorageWarning] = useState(false);
  const alive = useRef(true);
  const hydrated = useRef(false);
  const controllers = useRef<Partial<Record<Topic, AbortController>>>({});
  const update = useCallback((topic: Topic, change: (feed: Feed) => Feed) => {
    const next = {
      ...current.current,
      [topic]: change(current.current[topic]),
    };
    current.current = next;
    if (alive.current) setFeeds(next);
  }, []);
  const persist = useCallback(
    (topic: Topic, items: Feed["items"], updated: number) => {
      void saveFeed(topic, items, updated).catch(() => {
        if (alive.current) setStorageWarning(true);
      });
    },
    [],
  );
  const refresh = useCallback(
    async (topic: Topic) => {
      controllers.current[topic]?.abort();
      const controller = new AbortController();
      controllers.current[topic] = controller;
      update(topic, (feed) => ({ ...feed, loading: true, error: null }));
      try {
        const items = await loadFeed(topic, controller.signal);
        if (controller.signal.aborted || !alive.current) return;
        const updated = Date.now();
        persist(topic, items, updated);
        update(topic, () => ({
          items,
          updated,
          cached: false,
          error: null,
          loading: false,
        }));
      } catch {
        if (controller.signal.aborted || !alive.current) return;
        update(topic, (feed) => ({
          ...feed,
          cached: Boolean(feed.updated),
          loading: false,
          error: onlineRef.current
            ? "We couldn’t reach the feed. The server may be waking up. Try refreshing in a moment."
            : "You’re offline. Your last saved finds are still here.",
        }));
      } finally {
        if (controllers.current[topic] === controller)
          delete controllers.current[topic];
      }
    },
    [persist, update],
  );
  const refreshAll = useCallback(() => {
    topics.forEach((topic) => void refresh(topic));
  }, [refresh]);
  useEffect(() => {
    alive.current = true;
    const activeControllers = controllers.current;
    void Promise.all(
      topics.map(async (topic) => {
        const saved = await readFeed(topic);
        if (saved && alive.current)
          update(topic, (feed) => ({ ...feed, ...saved, cached: true }));
      }),
    ).then(() => {
      if (alive.current) {
        hydrated.current = true;
        refreshAll();
      }
    });
    const unsubscribe = NetInfo.addEventListener((state) => {
      const next =
        state.isConnected !== false && state.isInternetReachable !== false;
      const reconnected = next && !onlineRef.current;
      onlineRef.current = next;
      setOnline(next);
      if (reconnected && hydrated.current) refreshAll();
    });
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active" && hydrated.current && onlineRef.current)
        topics.forEach((topic) => {
          if (Date.now() - current.current[topic].updated > 5 * 60 * 1000)
            void refresh(topic);
        });
    });
    return () => {
      alive.current = false;
      hydrated.current = false;
      unsubscribe();
      foreground.remove();
      Object.values(activeControllers).forEach((controller) =>
        controller?.abort(),
      );
    };
  }, [refreshAll, refresh, update]);
  const remove = async (topic: Topic, id: number) => {
    if (!onlineRef.current)
      throw new Error("Reconnect to the internet to delete this find.");
    const token = await getPublishToken();
    if (!token)
      throw new Error("Add your publish token in Settings to remove finds.");
    try {
      await request(
        `/api/${topic}/${id}`,
        { method: "DELETE", headers: { "X-Publish-Token": token } },
        30000,
      );
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) {
        if (error instanceof ApiError) throw error;
        throw new Error(
          "We couldn’t confirm deletion. Refresh the feed to check before trying again.",
        );
      }
    }
    controllers.current[topic]?.abort();
    update(topic, (feed) => {
      const items = feed.items.filter((item) => item.id !== id);
      persist(topic, items, feed.updated);
      return { ...feed, items, loading: false };
    });
  };
  return (
    <Context.Provider
      value={{ feeds, online, refresh, refreshAll, remove, storageWarning }}
    >
      {children}
    </Context.Provider>
  );
}
export function useFeeds() {
  const value = useContext(Context);
  if (!value) throw new Error("FeedsProvider is required");
  return value;
}
