import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import {
  nativeFirebaseConfigured,
  nativeMessaging,
} from "../lib/native-messaging";
import { showMessage } from "../lib/background";
import { preferences } from "../lib/storage";
import { subscribeDevice } from "../lib/api";
import { isTopic, notificationDestination } from "../lib/model";
import { useFeeds } from "./feeds";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
interface NotificationState {
  configured: boolean;
  showPrompt: boolean;
  busy: boolean;
  subscribed: boolean;
  blocked: boolean;
  status: string;
  pendingRoute: string | null;
  consumeRoute(): void;
  enable(): Promise<void>;
  dismiss(): void;
}
const Context = createContext<NotificationState | null>(null);
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [status, setStatus] = useState("");
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const { refresh, online } = useFeeds();
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const lastResponse = useRef<string | null>(null);
  const pending = useRef<Promise<void> | null>(null);
  const sync = useCallback(async function synchronize(
    freshToken?: string,
  ): Promise<void> {
    if (pending.current) {
      if (!freshToken) return pending.current;
      await pending.current.catch(() => {});
      return synchronize(freshToken);
    }
    const run = async () => {
      const client = nativeMessaging();
      if (!client)
        throw new Error(
          "Alerts need an Android build with your Firebase registration. Add google-services.json and rebuild to connect this device.",
        );
      const permission = await Notifications.getPermissionsAsync();
      if (!permission.granted) {
        setSubscribed(false);
        return;
      }
      await client.sdk.setAutoInitEnabled(client.messaging, true);
      const token = freshToken || (await client.sdk.getToken(client.messaging));
      if (!token)
        throw new Error(
          "This device didn’t receive a notification registration. Please try again.",
        );
      await subscribeDevice(token);
      setSubscribed(true);
      setStatus(
        "Connected to deals, picks, airdrops, and tips. We’ll give you a little heads-up.",
      );
    };
    pending.current = run().finally(() => {
      pending.current = null;
    });
    return pending.current;
  }, []);
  const enable = async () => {
    if (busy) return;
    setBusy(true);
    setStatus("");
    try {
      if (!nativeFirebaseConfigured)
        throw new Error(
          Platform.OS === "web"
            ? "This is the browser preview. Native alerts are available in the Android app once Firebase is configured."
            : "Alerts need your Firebase Android registration. Add google-services.json, then rebuild the app. Your feeds are ready to use now.",
        );
      if (Platform.OS === "android")
        await Notifications.setNotificationChannelAsync("daily-drops", {
          name: "Daily Drop finds",
          importance: AndroidImportance.HIGH,
          lightColor: "#17824f",
        });
      const existing = await Notifications.getPermissionsAsync();
      const permission = existing.granted
        ? existing
        : await Notifications.requestPermissionsAsync();
      setBlocked(!permission.granted && !permission.canAskAgain);
      if (!permission.granted)
        throw new Error(
          "Notifications are off. You can allow them in your device settings whenever you’re ready.",
        );
      await sync();
      await preferences.set("notification-choice", "enabled");
      setShowPrompt(false);
    } catch (error) {
      setSubscribed(false);
      setStatus(
        error instanceof Error
          ? error.message
          : "We couldn’t connect notifications. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    let live = true;
    void preferences.get("notification-choice").then((value) => {
      if (live) setShowPrompt(!value);
    });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!nativeFirebaseConfigured) return;
    let live = true;
    const stops: (() => void)[] = [];
    const open = (data: Record<string, unknown>, key: string) => {
      if (!live || lastResponse.current === key) return;
      lastResponse.current = key;
      if (isTopic(data.tab)) void refreshRef.current(data.tab);
      setPendingRoute(notificationDestination(data));
    };
    const reconnect = () => {
      void preferences
        .get("notification-choice")
        .then((choice) => {
          if (choice === "enabled" && live) return sync();
        })
        .catch((error) => {
          if (live) {
            setSubscribed(false);
            setStatus(
              error instanceof Error
                ? error.message
                : "Alerts couldn’t reconnect. Try again in Settings.",
            );
          }
        });
    };
    try {
      const client = nativeMessaging();
      if (!client) return;
      stops.push(
        client.sdk.onTokenRefresh(client.messaging, (token) => {
          void sync(token).catch((error) => {
            if (live) {
              setSubscribed(false);
              setStatus(
                error instanceof Error
                  ? error.message
                  : "The device registration couldn’t be refreshed.",
              );
            }
          });
        }),
      );
      stops.push(
        client.sdk.onMessage(client.messaging, (message) => {
          if (isTopic(message.data?.tab))
            void refreshRef.current(message.data.tab);
          void showMessage(message).catch(() => {});
        }),
      );
      stops.push(
        client.sdk.onNotificationOpenedApp(client.messaging, (message) =>
          open(
            message.data || {},
            message.messageId ||
              `${message.data?.tab}:${message.data?.item_id}`,
          ),
        ),
      );
      void client.sdk
        .getInitialNotification(client.messaging)
        .then((message) => {
          if (message)
            open(
              message.data || {},
              message.messageId ||
                `${message.data?.tab}:${message.data?.item_id}`,
            );
        })
        .catch(() => {});
      const response = Notifications.addNotificationResponseReceivedListener(
        (value) =>
          open(
            value.notification.request.content.data || {},
            value.notification.request.identifier,
          ),
      );
      stops.push(() => response.remove());
      void Notifications.getLastNotificationResponseAsync()
        .then((value) => {
          if (value) {
            open(
              value.notification.request.content.data || {},
              value.notification.request.identifier,
            );
            void Notifications.clearLastNotificationResponseAsync();
          }
        })
        .catch(() => {});
      const appState = AppState.addEventListener("change", (value) => {
        if (value === "active") reconnect();
      });
      stops.push(() => appState.remove());
      if (online) reconnect();
    } catch {
      setStatus(
        "Notifications couldn’t start in this build. Check the Android Firebase registration.",
      );
    }
    return () => {
      live = false;
      stops.forEach((stop) => stop());
    };
  }, [sync, online]);
  return (
    <Context.Provider
      value={{
        configured: nativeFirebaseConfigured,
        showPrompt,
        busy,
        subscribed,
        blocked,
        status,
        pendingRoute,
        consumeRoute: () => setPendingRoute(null),
        enable,
        dismiss: () => {
          setShowPrompt(false);
          void preferences.set("notification-choice", "later").catch(() => {});
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useNotifications() {
  const state = useContext(Context);
  if (!state) throw new Error("NotificationProvider is required");
  return state;
}
