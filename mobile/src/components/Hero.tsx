import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { ArrowDown, ArrowUpRight, Code2, Gift } from "lucide-react-native";
import { content } from "../lib/content";
import { colors, fonts } from "../lib/theme";
import type { Topic } from "../lib/model";
export function Hero({
  topic,
  onExplore,
}: {
  topic: Topic;
  onExplore(): void;
}) {
  const info = content[topic];
  const narrow = useWindowDimensions().width < 370;
  return (
    <View style={[styles.hero, { backgroundColor: info.bg }]}>
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, { color: info.ink }]}>
          ✦ {info.eyebrow}
        </Text>
        <Text
          accessibilityRole="header"
          style={[
            styles.title,
            { color: info.ink },
            narrow && { fontSize: 28, lineHeight: 34 },
          ]}
        >
          {info.title}
        </Text>
        <Text style={[styles.description, { color: info.ink }]}>
          {info.description}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onExplore}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor:
                topic === "picks"
                  ? "#806699"
                  : topic === "tips"
                    ? "#8c7843"
                    : colors.green,
            },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.ctaText}>
            {topic === "deals"
              ? "Find your next favourite"
              : "Take a closer look"}
          </Text>
          <ArrowDown size={15} color="white" />
        </Pressable>
      </View>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.art,
          narrow && { right: -33, transform: [{ scale: 0.85 }] },
        ]}
      >
        <View style={styles.orbit} />
        <Text style={styles.spark}>✦</Text>
        <View style={styles.backCard}>
          <Code2 size={21} color="#dce9ce" />
          <View style={styles.backLine} />
          <View style={[styles.backLine, { width: 35 }]} />
        </View>
        <View style={styles.frontCard}>
          <View style={styles.window}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
          <View style={styles.giftCircle}>
            <Gift size={39} color="#4d7c43" strokeWidth={1.6} />
          </View>
          <Text style={styles.artText}>{info.artText}</Text>
          <View style={styles.artLine} />
        </View>
        <View style={styles.ticket}>
          <Text style={styles.ticketEyebrow}>
            {topic === "deals" ? "THE BEST PRICE?" : "YOUR DAILY DOSE"}
          </Text>
          <Text style={styles.ticketTitle}>
            {topic === "deals" ? "FREE!" : "GOOD!"}
          </Text>
        </View>
        <View style={styles.cursor}>
          <ArrowUpRight size={23} color="#648650" />
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  hero: {
    borderRadius: 22,
    minHeight: 320,
    padding: 25,
    overflow: "hidden",
    marginTop: 24,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#e5eadb",
  },
  copy: { zIndex: 2 },
  eyebrow: {
    fontFamily: fonts.bold,
    fontSize: 7.5,
    letterSpacing: 0.8,
    opacity: 0.8,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 31,
    letterSpacing: -1.1,
    lineHeight: 37,
    marginTop: 16,
    marginBottom: 14,
  },
  description: {
    maxWidth: 176,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 21,
    opacity: 0.72,
  },
  cta: {
    alignSelf: "flex-start",
    minHeight: 44,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
    marginTop: 18,
  },
  ctaText: { fontFamily: fonts.bold, fontSize: 10, color: "white" },
  art: { position: "absolute", right: -9, bottom: 5, width: 185, height: 171 },
  orbit: {
    borderWidth: 1,
    borderColor: "#d6e1c7",
    width: 168,
    height: 168,
    borderRadius: 84,
    position: "absolute",
    top: 0,
    left: 0,
  },
  spark: {
    position: "absolute",
    right: 6,
    top: 6,
    fontSize: 25,
    color: "#86a269",
  },
  backCard: {
    left: 48,
    top: 10,
    width: 96,
    height: 125,
    borderRadius: 9,
    backgroundColor: "#88a575",
    transform: [{ rotate: "16deg" }],
    padding: 13,
  },
  backLine: {
    height: 3,
    width: 53,
    marginTop: 11,
    borderRadius: 2,
    backgroundColor: "#b1c49f",
  },
  frontCard: {
    position: "absolute",
    left: 21,
    top: 23,
    width: 106,
    height: 128,
    backgroundColor: "#fffef4",
    borderRadius: 9,
    transform: [{ rotate: "-10deg" }],
    alignItems: "center",
    boxShadow: "0px 7px 15px rgba(72, 93, 47, 0.13)",
  },
  window: {
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 3,
    padding: 7,
    borderBottomWidth: 1,
    borderColor: "#e8edde",
  },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: "#d3dfc7" },
  giftCircle: {
    marginTop: 13,
    width: 40,
    height: 40,
    backgroundColor: "#e9f2d9",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  artText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: "#527145",
    marginTop: 10,
  },
  artLine: {
    width: 40,
    height: 3,
    borderRadius: 2,
    marginTop: 6,
    backgroundColor: "#e1e8d8",
  },
  ticket: {
    position: "absolute",
    right: 0,
    top: 78,
    width: 91,
    height: 60,
    backgroundColor: "#f4d98c",
    borderRadius: 7,
    transform: [{ rotate: "12deg" }],
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#d6b76d",
  },
  ticketEyebrow: {
    fontFamily: fonts.bold,
    fontSize: 4.5,
    letterSpacing: 0.8,
    color: "#8c7035",
  },
  ticketTitle: {
    fontFamily: fonts.extra,
    fontSize: 23,
    letterSpacing: -1,
    color: "#70592d",
  },
  cursor: {
    position: "absolute",
    right: 44,
    bottom: 0,
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#d7e5c4",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#eef3e4",
    transform: [{ rotate: "-7deg" }],
  },
});
