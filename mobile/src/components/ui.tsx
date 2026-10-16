import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react-native";
import { ArrowRight, BookOpen, ShieldCheck } from "lucide-react-native";
import { colors, fonts } from "../lib/theme";
import type { Topic } from "../lib/model";
export function IconButton({
  icon: Icon,
  label,
  onPress,
  color = colors.muted,
  disabled = false,
}: {
  icon: LucideIcon;
  label: string;
  onPress(): void;
  color?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={3}
      style={({ pressed }) => [
        styles.iconButton,
        pressed && { backgroundColor: colors.mint },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Icon size={21} color={color} strokeWidth={1.8} />
    </Pressable>
  );
}
export function Button({
  children,
  onPress,
  secondary = false,
  danger = false,
  busy = false,
  disabled = false,
  icon: Icon = ArrowRight,
  label,
}: {
  children: ReactNode;
  onPress(): void;
  secondary?: boolean;
  danger?: boolean;
  busy?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  label?: string;
}) {
  const ink = secondary ? colors.mintInk : colors.white;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        danger && { backgroundColor: "#b85d4a" },
        pressed && { opacity: 0.8 },
        (disabled || busy) && { opacity: 0.5 },
      ]}
    >
      <Text style={[styles.buttonText, { color: ink }]}>{children}</Text>
      {busy ? (
        <ActivityIndicator size="small" color={ink} />
      ) : (
        <Icon size={17} color={ink} />
      )}
    </Pressable>
  );
}
export function Notice({
  children,
  warning = false,
}: {
  children: ReactNode;
  warning?: boolean;
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.notice,
        warning && { backgroundColor: "#fff5e7", borderColor: "#f1e3c9" },
      ]}
    >
      <ShieldCheck size={19} color={warning ? "#ac8c4f" : colors.mintInk} />
      <Text style={[styles.noticeText, warning && { color: "#957d4b" }]}>
        {children}
      </Text>
    </View>
  );
}
export function Safety({ topic }: { topic: Topic }) {
  if (topic === "airdrops")
    return (
      <View style={styles.safety}>
        <ShieldCheck size={20} color="#ac8c4f" />
        <View style={{ flex: 1 }}>
          <Text style={styles.safetyTitle}>A quick safety check</Text>
          <Text style={styles.safetyText}>
            Never share seed phrases or private keys. Only use official links.
          </Text>
        </View>
      </View>
    );
  if (topic === "tips")
    return (
      <View style={[styles.inline, { marginVertical: 19 }]}>
        <BookOpen size={15} color={colors.muted} />
        <Text style={styles.educational}>
          Educational only, not financial advice.
        </Text>
      </View>
    );
  return null;
}
const styles = StyleSheet.create({
  iconButton: {
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    minHeight: 48,
    backgroundColor: colors.green,
    borderRadius: 14,
    paddingHorizontal: 19,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 11,
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    flexShrink: 1,
    textAlign: "center",
  },
  secondary: {
    backgroundColor: "#edf3e4",
    borderWidth: 1,
    borderColor: "#e3eadb",
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#f0f6e8",
    borderColor: "#e3ecd9",
    borderWidth: 1,
    padding: 15,
    borderRadius: 13,
    marginVertical: 12,
  },
  noticeText: {
    flex: 1,
    fontFamily: fonts.regular,
    color: colors.mintInk,
    fontSize: 12,
    lineHeight: 21,
  },
  safety: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#fff5e7",
    borderWidth: 1,
    borderColor: "#f1e5ca",
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
    marginBottom: 10,
  },
  safetyTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#947a40",
    marginBottom: 6,
  },
  safetyText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 20,
    color: "#947d4f",
  },
  inline: { flexDirection: "row", alignItems: "center", gap: 7 },
  educational: {
    fontFamily: fonts.regular,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 20,
    flex: 1,
  },
});
