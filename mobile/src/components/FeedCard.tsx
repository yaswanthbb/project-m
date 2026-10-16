import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ArrowUpRight, Clock3, Gift, Trash2 } from "lucide-react-native";
import { colors, fonts } from "../lib/theme";
import { dateLabel, expired } from "../lib/model";
import type { Item, Topic } from "../lib/model";
import { lookFor } from "../lib/content";
import { IconButton } from "./ui";
export function FeedCard({
  item,
  topic,
  onDelete,
}: {
  item: Item;
  topic: Topic;
  onDelete(): void;
}) {
  const offer = topic === "deals" || topic === "airdrops";
  const look = lookFor(topic, item),
    Icon = look.icon;
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: look.bg }]}>
          <Icon size={25} color={look.ink} strokeWidth={1.8} />
        </View>
        <View style={[styles.category, { backgroundColor: look.bg }]}>
          <Text style={[styles.categoryText, { color: look.ink }]}>
            {item.tag ||
              (topic === "picks"
                ? "THE DAILY READ"
                : topic === "tips"
                  ? "MONEY KNOW-HOW"
                  : "AIRDROP")}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <IconButton
          icon={Trash2}
          label={`Delete ${item.title}`}
          onPress={onDelete}
          color="#a0ad92"
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.title}`}
        onPress={() =>
          router.push({
            pathname: "/item/[topic]/[id]",
            params: { topic, id: item.id },
          })
        }
        style={({ pressed }) => pressed && { opacity: 0.7 }}
      >
        <Text accessibilityRole="header" style={styles.title}>
          {item.title}
        </Text>
        <Text numberOfLines={2} style={styles.description}>
          {item.description || item.body}
        </Text>
        {topic === "airdrops" && (
          <View style={styles.reward}>
            <Gift size={15} color={colors.green} />
            <Text numberOfLines={2} style={styles.rewardText}>
              {item.reward ||
                item.offer_details ||
                "Reward details on the project page"}
            </Text>
          </View>
        )}
        <View style={styles.source}>
          {offer ? (
            <>
              <View style={styles.sourceDot} />
              <Text style={styles.sourceText}>
                {item.source || "Official source"}
              </Text>
            </>
          ) : (
            <>
              <Clock3 size={13} color={colors.muted} />
              <Text style={styles.sourceText}>
                {Math.max(
                  1,
                  Math.ceil((item.body?.split(/\s+/).length || 0) / 200),
                )}{" "}
                min read · {dateLabel(item.date)}
              </Text>
            </>
          )}
        </View>
        <View style={styles.footer}>
          <View style={styles.deadline}>
            {offer && <Clock3 size={13} color={colors.muted} />}
            <Text
              style={[
                styles.deadlineText,
                expired(item) && { color: "#b08065" },
              ]}
            >
              {offer
                ? expired(item)
                  ? "Expired"
                  : item.expires
                    ? `Until ${dateLabel(item.expires)}`
                    : "No deadline listed"
                : "A little food for thought"}
            </Text>
          </View>
          <View style={styles.link}>
            <Text style={styles.linkText}>
              {topic === "deals"
                ? "View deal"
                : topic === "airdrops"
                  ? "Explore"
                  : "Read more"}
            </Text>
            <ArrowUpRight size={17} color={colors.green} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    marginBottom: 15,
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 19,
    paddingHorizontal: 21,
    paddingTop: 19,
    boxShadow: "0px 4px 14px rgba(34, 55, 22, 0.03)",
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  category: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    maxWidth: 170,
  },
  categoryText: { fontFamily: fonts.semi, fontSize: 9 },
  title: {
    fontFamily: fonts.bold,
    fontSize: 19,
    lineHeight: 27,
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: 9,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 23,
    color: colors.muted,
  },
  source: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 18,
    marginBottom: 17,
  },
  sourceDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#a0b889",
  },
  sourceText: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: "#83936e",
    flexShrink: 1,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#edf0e7",
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  deadline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexShrink: 1,
  },
  deadlineText: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: "#879776",
    flexShrink: 1,
  },
  link: { flexDirection: "row", alignItems: "center", gap: 5 },
  linkText: { fontFamily: fonts.bold, fontSize: 11, color: colors.green },
  reward: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 13 },
  rewardText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 20,
    color: colors.green,
  },
});
