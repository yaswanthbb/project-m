import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import * as Updates from "expo-updates";
import Constants from "expo-constants";
import {
  ArrowDownToLine,
  Bell,
  Check,
  CheckCheck,
  CloudOff,
  KeyRound,
  Settings2,
  ShieldCheck,
  Smartphone,
  Trash2,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { colors, fonts, shared } from "../lib/theme";
import {
  clearPublishToken,
  getPublishToken,
  setPublishToken,
} from "../lib/storage";
import { useFeeds } from "../state/feeds";
import { useNotifications } from "../state/notifications";
import { Header } from "../components/Header";
import { Button, Notice } from "../components/ui";
function SettingsCard({
  title,
  description,
  icon: Icon,
  color,
  bg,
  children,
  badge,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  children: ReactNode;
  badge?: string;
}) {
  return (
    <View style={[shared.card, styles.card]}>
      <View style={styles.cardHeader}>
        <View style={[styles.icon, { backgroundColor: bg }]}>
          <Icon size={23} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={styles.cardTitle}>
            {title}
          </Text>
          <Text style={styles.cardDescription}>{description}</Text>
        </View>
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      {children}
    </View>
  );
}
export default function SettingsScreen() {
  const push = useNotifications(),
    { feeds, online, refreshAll } = useFeeds();
  const [token, setToken] = useState(""),
    [hasToken, setHasToken] = useState(false),
    [saving, setSaving] = useState(false),
    [tokenMessage, setTokenMessage] = useState("");
  const [updating, setUpdating] = useState(false),
    [updateMessage, setUpdateMessage] = useState("");
  const savedCount = Object.values(feeds).reduce(
    (sum, value) => sum + value.items.length,
    0,
  );
  useEffect(() => {
    let live = true;
    void getPublishToken()
      .then((value) => {
        if (live) setHasToken(Boolean(value));
      })
      .catch(() => {
        if (live)
          setTokenMessage("Secure storage couldn’t be read. Please try again.");
      });
    return () => {
      live = false;
    };
  }, []);
  const save = async () => {
    if (!token.trim() || saving) return;
    setSaving(true);
    try {
      await setPublishToken(token.trim());
      setToken("");
      setHasToken(true);
      setTokenMessage(
        "Token saved securely on this device. You’re ready to manage your finds.",
      );
    } catch {
      setTokenMessage("Your device couldn’t save the token. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    try {
      await clearPublishToken();
      setHasToken(false);
      setToken("");
      setTokenMessage("The saved token has been removed from this device.");
    } catch {
      setTokenMessage("The token couldn’t be removed. Please try again.");
    }
  };
  const update = async () => {
    if (updating) return;
    setUpdating(true);
    setUpdateMessage("Checking for a fresh version…");
    try {
      if (!online)
        throw new Error("Connect to the internet to check for updates.");
      if (Platform.OS === "web" || __DEV__)
        throw new Error(
          "App updates are checked in installed release builds. This preview receives changes from the development server.",
        );
      if (!Updates.isEnabled)
        throw new Error(
          "This build has no update channel configured. Install the latest APK, or connect an EAS Update project before the next build.",
        );
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        setUpdateMessage("You’re on the latest version. All good!");
        return;
      }
      setUpdateMessage("A fresh version is on its way…");
      await Updates.fetchUpdateAsync();
      setUpdateMessage("Restarting with your update…");
      await Updates.reloadAsync();
    } catch (error) {
      setUpdateMessage(
        error instanceof Error
          ? error.message
          : "Couldn’t check for updates. Please try again.",
      );
    } finally {
      setUpdating(false);
    }
  };
  return (
    <View style={shared.page}>
      <Header
        title="Settings"
        back={() => {
          if (router.canGoBack()) router.back();
          else router.replace("/");
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={shared.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[shared.eyebrow, { color: colors.green, fontSize: 8 }]}>
            MAKE YOURSELF AT HOME
          </Text>
          <Text
            accessibilityRole="header"
            style={[shared.title, { marginTop: 12, fontSize: 28 }]}
          >
            Your little preferences.
          </Text>
          <Text
            style={[
              shared.body,
              { fontSize: 12, marginTop: 9, marginBottom: 27 },
            ]}
          >
            A few settings to make Daily Drop work for you.
          </Text>
          <SettingsCard
            title="A heads-up for good things"
            description="New deals, picks, airdrops, and tips. Straight to this device."
            icon={Bell}
            color={colors.mintInk}
            bg={colors.mint}
            badge={push.subscribed ? "Connected" : "Off"}
          >
            {!push.configured && (
              <Notice>
                Native alerts will be ready after Firebase is configured for the
                Android build. Your feeds are ready to use now.
              </Notice>
            )}
            <Button
              onPress={() => void push.enable()}
              icon={Bell}
              busy={push.busy}
            >
              {push.busy
                ? "Connecting…"
                : push.subscribed
                  ? "Reconnect notifications"
                  : "Enable notifications"}
            </Button>
            {push.blocked && (
              <View style={{ marginTop: 10 }}>
                <Button
                  secondary
                  onPress={() => void Linking.openSettings()}
                  icon={Settings2}
                >
                  Open device settings
                </Button>
              </View>
            )}
            {push.status && <Notice>{push.status}</Notice>}
          </SettingsCard>
          <SettingsCard
            title="Your publish token"
            description="Needed only to delete finds. Kept on this device."
            icon={KeyRound}
            color={colors.purpleInk}
            bg={colors.purple}
            badge={hasToken ? "Saved" : undefined}
          >
            <Text style={styles.label}>
              {hasToken ? "Replace saved token" : "Publish token"}
            </Text>
            <TextInput
              accessibilityLabel={
                hasToken ? "Replace saved token" : "Publish token"
              }
              value={token}
              onChangeText={setToken}
              secureTextEntry
              placeholder={
                hasToken
                  ? "Enter a new token to replace it"
                  : "Enter your publish token"
              }
              placeholderTextColor="#a3af96"
              style={styles.input}
              autoCorrect={false}
              autoCapitalize="none"
              autoComplete="off"
              textContentType="none"
              returnKeyType="done"
              onSubmitEditing={() => void save()}
            />
            <View style={{ alignSelf: "flex-start", marginTop: 12 }}>
              <Button
                busy={saving}
                disabled={!token.trim()}
                onPress={() => void save()}
                icon={Check}
              >
                Save token
              </Button>
            </View>
            <View style={styles.helper}>
              <ShieldCheck size={14} color="#97a687" />
              <Text style={styles.helperText}>
                {Platform.OS === "web"
                  ? "Browser preview uses local storage. The Android app uses encrypted secure storage."
                  : "Stored in Android secure storage. Never displayed after saving."}
              </Text>
            </View>
            {hasToken && (
              <View style={{ alignSelf: "flex-start", marginTop: 4 }}>
                <Button secondary onPress={() => void remove()} icon={Trash2}>
                  Remove saved token
                </Button>
              </View>
            )}
            {tokenMessage && <Notice>{tokenMessage}</Notice>}
          </SettingsCard>
          <SettingsCard
            title="Fresh app. Fresh finds."
            description="Check for the latest version of Daily Drop."
            icon={ArrowDownToLine}
            color={colors.blueInk}
            bg={colors.blue}
          >
            <Button
              secondary
              busy={updating}
              onPress={() => void update()}
              icon={ArrowDownToLine}
            >
              {updating ? "Checking…" : "Update app"}
            </Button>
            {updateMessage && <Notice>{updateMessage}</Notice>}
          </SettingsCard>
          <SettingsCard
            title="Good things, on the go."
            description="The latest successful feed loads stay on this device."
            icon={Smartphone}
            color={colors.peachInk}
            bg={colors.peach}
          >
            <View style={styles.saved}>
              <CloudOff size={19} color="#8c9f78" />
              <Text style={styles.savedText}>
                {savedCount} {savedCount === 1 ? "find" : "finds"} saved for
                offline reading. Pull down on a feed whenever you want something
                fresh.
              </Text>
            </View>
            <Button
              secondary
              disabled={!online}
              icon={CheckCheck}
              onPress={() => {
                refreshAll();
                setUpdateMessage(
                  "Your feeds are refreshing. Head back to explore.",
                );
              }}
            >
              Refresh all feeds
            </Button>
          </SettingsCard>
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Made for a little discovery, every day.
            </Text>
            <Text style={styles.version}>
              Daily Drop · {Constants.expoConfig?.version || "1.0.0"}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { marginBottom: 17 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 22,
  },
  icon: {
    width: 43,
    height: 45,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontFamily: fonts.bold,
    color: colors.ink,
    fontSize: 16,
    lineHeight: 23,
    letterSpacing: -0.3,
  },
  cardDescription: {
    fontFamily: fonts.regular,
    color: "#8d9c7d",
    fontSize: 11,
    lineHeight: 20,
    marginTop: 6,
  },
  badge: {
    position: "absolute",
    right: -6,
    top: -11,
    backgroundColor: "#edf4e4",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  badgeText: { fontFamily: fonts.medium, fontSize: 8, color: "#7f9b66" },
  label: {
    fontFamily: fonts.semi,
    fontSize: 11,
    color: "#8b9b79",
    marginBottom: 10,
  },
  input: {
    height: 48,
    backgroundColor: "#fafbf6",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.ink,
  },
  helper: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    marginTop: 15,
    marginBottom: 7,
  },
  helperText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 10,
    lineHeight: 18,
    color: "#95a485",
  },
  saved: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 20,
  },
  savedText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 23,
    color: "#8a9c78",
  },
  footer: { alignItems: "center", marginTop: 20, marginBottom: 15, gap: 8 },
  footerText: { fontFamily: fonts.regular, color: "#9aa88c", fontSize: 10 },
  version: { fontFamily: fonts.regular, color: "#aab69d", fontSize: 9 },
});
