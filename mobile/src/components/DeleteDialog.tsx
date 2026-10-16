import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Trash2, X } from "lucide-react-native";
import { getPublishToken } from "../lib/storage";
import { colors, fonts } from "../lib/theme";
import type { Item, Topic } from "../lib/model";
import { useFeeds } from "../state/feeds";
import { Button, IconButton, Notice } from "./ui";
function ConfirmDelete({
  target,
  close,
  onDeleted,
}: {
  target: { item: Item; topic: Topic } | null;
  close(): void;
  onDeleted?(): void;
}) {
  const { remove, online } = useFeeds();
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    if (target) {
      void getPublishToken()
        .then((value) => {
          if (live) setHasToken(Boolean(value));
        })
        .catch(() => {
          if (live) {
            setHasToken(false);
            setError(
              "Secure storage couldn’t be read. Please check your token in Settings.",
            );
          }
        });
    }
    return () => {
      live = false;
    };
  }, [target]);
  const confirm = async () => {
    if (!target || busy) return;
    setBusy(true);
    setError("");
    try {
      await remove(target.topic, target.item.id);
      close();
      onDeleted?.();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Couldn’t remove this find. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      visible={Boolean(target)}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (!busy) close();
      }}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityLabel="Close delete confirmation"
          onPress={() => {
            if (!busy) close();
          }}
        />
        <View accessibilityViewIsModal style={styles.dialog}>
          <View style={styles.top}>
            <View style={styles.icon}>
              <Trash2 size={25} color="#b9735d" />
            </View>
            <IconButton
              icon={X}
              label="Close dialog"
              onPress={close}
              disabled={busy}
            />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            Remove this find?
          </Text>
          <Text style={styles.body}>
            “{target?.item.title}” will be deleted from the feed for everyone.
            This can’t be undone.
          </Text>
          {hasToken === false && (
            <Notice>Add your publish token in Settings to remove finds.</Notice>
          )}
          {!online && <Notice warning>Reconnect to delete this find.</Notice>}
          {error ? <Notice warning>{error}</Notice> : null}
          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <Button secondary onPress={close} disabled={busy} icon={X}>
                Keep it
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              {hasToken === false ? (
                <Button
                  onPress={() => {
                    close();
                    router.push("/settings");
                  }}
                >
                  Settings
                </Button>
              ) : (
                <Button
                  danger
                  busy={busy}
                  disabled={!online || hasToken === null}
                  onPress={() => void confirm()}
                  icon={Trash2}
                >
                  {busy ? "Removing…" : "Yes, remove"}
                </Button>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
export function DeleteDialog(props: Parameters<typeof ConfirmDelete>[0]) {
  return props.target ? (
    <ConfirmDelete
      key={`${props.target.topic}:${props.target.item.id}`}
      {...props}
    />
  ) : null;
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#24382466",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },
  dialog: {
    width: "100%",
    maxWidth: 430,
    backgroundColor: colors.white,
    padding: 26,
    borderRadius: 25,
    boxShadow: "0px 15px 60px rgba(20, 40, 18, 0.2)",
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  icon: {
    width: 57,
    height: 57,
    borderRadius: 18,
    backgroundColor: "#fff0e7",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.ink,
    letterSpacing: -0.6,
  },
  body: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 24,
    marginTop: 12,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 25 },
});
