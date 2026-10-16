import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  ArrowRight,
  BellRing,
  CheckCheck,
  Leaf,
  Lightbulb,
  RotateCw,
  Search,
  Sprout,
  Tag,
  Wallet,
  WifiOff,
  X,
} from "lucide-react-native";
import { content, categories } from "../lib/content";
import { groupItems, localDate } from "../lib/model";
import type { Item, Topic } from "../lib/model";
import { colors, fonts, shared } from "../lib/theme";
import { useFeeds } from "../state/feeds";
import { useNotifications } from "../state/notifications";
import { FeedCard } from "./FeedCard";
import { DeleteDialog } from "./DeleteDialog";
import { Hero } from "./Hero";
import { Button, IconButton, Notice, Safety } from "./ui";
export function FeedScreen({
  topic,
  onMoneyTab,
}: {
  topic: Topic;
  onMoneyTab?(topic: "airdrops" | "tips"): void;
}) {
  const { feeds, refresh, online, storageWarning } = useFeeds();
  const feed = feeds[topic],
    info = content[topic],
    push = useNotifications();
  const [category, setCategory] = useState("All finds"),
    [query, setQuery] = useState("");
  const [target, setTarget] = useState<{ item: Item; topic: Topic } | null>(
    null,
  );
  const [today, setToday] = useState(localDate());
  const list = useRef<SectionList<Item>>(null);
  useEffect(() => {
    const timer = setInterval(() => setToday(localDate()), 60000);
    return () => clearInterval(timer);
  }, []);
  const visible = useMemo(
    () =>
      feed.items.filter(
        (item) =>
          (topic !== "deals" ||
            category === "All finds" ||
            item.tag === category) &&
          `${item.title} ${item.description || item.body || ""} ${item.source || ""}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [feed.items, topic, category, query],
  );
  const groups = groupItems(visible, today);
  const sections = Object.entries(groups)
    .filter(([, items]) => items.length)
    .map(([title, data]) => ({ title, data }));
  const money = topic === "airdrops" || topic === "tips";
  const filtered = Boolean(query || category !== "All finds");
  return (
    <View testID={`feed-${topic}`} style={shared.page}>
      {!online && (
        <View accessibilityLiveRegion="polite" style={styles.offline}>
          <WifiOff size={15} color="#9a8049" />
          <Text style={styles.offlineText}>
            You’re offline. Your saved finds are still here.
          </Text>
        </View>
      )}
      <SectionList
        ref={list}
        style={{ flex: 1 }}
        contentContainerStyle={shared.content}
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={feed.loading && feed.updated > 0}
            onRefresh={() => void refresh(topic)}
            tintColor={colors.green}
            colors={[colors.green]}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.topline}>
              <View style={{ flex: 1 }}>
                <Text style={shared.eyebrow}>YOUR DAILY SHORTLIST</Text>
                <Text
                  accessibilityRole="header"
                  style={[shared.title, { marginTop: 7 }]}
                >
                  {info.pageTitle}
                  {topic === "deals" && (
                    <Text style={{ color: "#91b37a", fontSize: 24 }}> ✦</Text>
                  )}
                </Text>
              </View>
              <IconButton
                icon={RotateCw}
                label="Refresh feed"
                disabled={feed.loading}
                onPress={() => void refresh(topic)}
              />
            </View>
            {money && (
              <View accessibilityRole="tablist" style={styles.moneyTabs}>
                {(["airdrops", "tips"] as const).map((value) => {
                  const Icon = value === "airdrops" ? Wallet : Lightbulb;
                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: topic === value }}
                      onPress={() => onMoneyTab?.(value)}
                      style={[
                        styles.moneyTab,
                        topic === value && styles.moneyTabActive,
                      ]}
                    >
                      <Icon
                        size={17}
                        color={topic === value ? colors.green : colors.muted}
                      />
                      <Text
                        style={[
                          styles.moneyTabText,
                          topic === value && { color: colors.green },
                        ]}
                      >
                        {content[value].label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <Hero
              topic={topic}
              onExplore={() =>
                list.current
                  ?.getScrollResponder()
                  ?.scrollTo({ y: money ? 490 : 430, animated: true })
              }
            />
            {push.showPrompt && (
              <View style={styles.prompt}>
                <View style={styles.promptTop}>
                  <View style={styles.bell}>
                    <BellRing size={20} color="#bc9955" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.promptTitle}>
                      Good finds move fast.
                    </Text>
                    <Text style={styles.promptBody}>
                      A little nudge when something new drops.
                    </Text>
                  </View>
                  <IconButton
                    icon={X}
                    label="Maybe later"
                    onPress={push.dismiss}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={push.busy}
                  onPress={() => void push.enable()}
                  style={styles.promptButton}
                >
                  <Text style={styles.promptButtonText}>
                    {push.busy ? "Connecting…" : "Keep me posted"}
                  </Text>
                  <ArrowRight size={15} color={colors.green} />
                </Pressable>
                {push.status ? <Notice>{push.status}</Notice> : null}
              </View>
            )}
            <View style={styles.heading}>
              <Text
                style={[
                  shared.eyebrow,
                  { color: colors.green, fontSize: 8, letterSpacing: 1 },
                ]}
              >
                {topic === "deals"
                  ? "NICE FINDS. NICER PRICE TAGS."
                  : topic === "picks"
                    ? "A FEW THINGS WORTH YOUR TIME."
                    : "A LITTLE KNOW-HOW. EVERY DAY."}
              </Text>
              <View style={[shared.row, { gap: 10, marginTop: 9 }]}>
                <Text accessibilityRole="header" style={styles.feedTitle}>
                  {info.feedTitle}
                </Text>
                <View style={styles.count}>
                  <Text style={styles.countText}>{feed.items.length}</Text>
                </View>
              </View>
            </View>
            <View style={styles.search}>
              <Search size={18} color="#8c9a7e" />
              <TextInput
                accessibilityLabel={`Search ${info.label}`}
                value={query}
                onChangeText={setQuery}
                placeholder="Find something good…"
                placeholderTextColor="#a0ab94"
                style={styles.searchInput}
                autoCorrect={false}
                returnKeyType="search"
              />
              {query && (
                <IconButton
                  icon={X}
                  label="Clear search"
                  onPress={() => setQuery("")}
                />
              )}
            </View>
            {topic === "deals" && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
              >
                {categories.map((value) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: category === value }}
                    key={value}
                    onPress={() => setCategory(value)}
                    style={[
                      styles.chip,
                      category === value && styles.chipActive,
                    ]}
                  >
                    {value === "All finds" && (
                      <Tag
                        size={13}
                        color={category === value ? "white" : colors.muted}
                      />
                    )}
                    <Text
                      style={[
                        styles.chipText,
                        category === value && { color: "white" },
                      ]}
                    >
                      {value}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <Safety topic={topic} />
            {storageWarning && (
              <Notice warning>
                Your device couldn’t save the latest feed. Free some storage to
                keep new finds available offline.
              </Notice>
            )}
            {feed.error && (
              <View style={styles.error}>
                <Notice warning>
                  {feed.error}
                  {feed.updated
                    ? ` Last saved ${new Date(feed.updated).toLocaleString()}.`
                    : ""}
                </Notice>
                <Pressable
                  accessibilityRole="button"
                  style={styles.retry}
                  disabled={feed.loading}
                  onPress={() => void refresh(topic)}
                >
                  <Text style={styles.retryText}>Try again</Text>
                  <RotateCw size={14} color={colors.green} />
                </Pressable>
              </View>
            )}
            {feed.cached && feed.updated > 0 && (
              <View style={styles.cache}>
                <CheckCheck size={14} color={colors.muted} />
                <Text style={styles.cacheText}>
                  Saved on this device ·{" "}
                  {new Date(feed.updated).toLocaleDateString()}
                </Text>
              </View>
            )}
          </>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.group}>
            <Text accessibilityRole="header" style={styles.groupTitle}>
              {section.title}
            </Text>
            <Text style={styles.groupSubtitle}>
              {section.title === "Today"
                ? "THE LATEST LITTLE WINS"
                : "STILL WORTH A LOOK"}
            </Text>
            <View style={styles.groupLine} />
          </View>
        )}
        renderItem={({ item }) => (
          <FeedCard
            item={item}
            topic={topic}
            onDelete={() => setTarget({ item, topic })}
          />
        )}
        ListEmptyComponent={
          feed.loading && !feed.updated ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color={colors.green} />
              <Text style={styles.emptyTitle}>Finding the good stuff…</Text>
              <Text style={styles.emptyBody}>
                The server may need a moment to wake up.
              </Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={styles.sprout}>
                {filtered ? (
                  <Search size={34} color="#7e9a66" />
                ) : (
                  <Sprout size={38} color="#7e9a66" strokeWidth={1.6} />
                )}
              </View>
              <Text style={styles.emptyEyebrow}>
                {filtered
                  ? "LET’S TRY ANOTHER WAY"
                  : "A LITTLE ROOM FOR GOOD THINGS"}
              </Text>
              <Text accessibilityRole="header" style={styles.emptyTitle}>
                {filtered
                  ? "No finds match just yet."
                  : feed.error
                    ? "A small pause in the feed."
                    : "Your next good find is on its way."}
              </Text>
              <Text style={styles.emptyBody}>
                {filtered
                  ? "Try another search or take a look at all the finds."
                  : feed.error
                    ? "Try refreshing in a moment. Saved finds will appear here when available."
                    : `No ${info.label.toLowerCase()} have landed yet. Check back soon, or explore another corner.`}
              </Text>
              <Button
                secondary
                onPress={() => {
                  if (filtered) {
                    setCategory("All finds");
                    setQuery("");
                  } else router.navigate(topic === "picks" ? "/" : "/picks");
                }}
              >
                {filtered
                  ? "Show all finds"
                  : topic === "picks"
                    ? "Explore deals"
                    : "Explore Machine’s Picks"}
              </Button>
            </View>
          )
        }
        ListFooterComponent={
          <View style={styles.end}>
            <View style={styles.groupLine} />
            <Leaf size={14} color="#a2b18e" />
            <Text style={styles.endText}>
              A little less scrolling. A little more discovering.
            </Text>
            <View style={styles.groupLine} />
          </View>
        }
      />
      <DeleteDialog target={target} close={() => setTarget(null)} />
    </View>
  );
}
const styles = StyleSheet.create({
  topline: { flexDirection: "row", alignItems: "center", gap: 8 },
  offline: {
    backgroundColor: "#f8eedc",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
  },
  offlineText: { fontFamily: fonts.medium, fontSize: 11, color: "#9a8049" },
  moneyTabs: {
    flexDirection: "row",
    padding: 5,
    borderRadius: 15,
    backgroundColor: "#f0f2e9",
    borderColor: colors.line,
    borderWidth: 1,
    marginTop: 20,
    marginBottom: -4,
  },
  moneyTab: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  moneyTabActive: {
    backgroundColor: "white",
    boxShadow: "0px 2px 5px rgba(35, 55, 20, 0.06)",
  },
  moneyTabText: { fontFamily: fonts.semi, color: colors.muted, fontSize: 11 },
  prompt: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 13,
    marginBottom: 8,
  },
  promptTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  bell: {
    width: 36,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#f8f0d8",
    justifyContent: "center",
    alignItems: "center",
  },
  promptTitle: {
    fontFamily: fonts.bold,
    color: colors.ink,
    fontSize: 12,
    marginBottom: 4,
  },
  promptBody: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.muted,
    lineHeight: 17,
  },
  promptButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 11,
    alignItems: "center",
    minHeight: 42,
    borderRadius: 11,
    backgroundColor: "#edf5e5",
    paddingHorizontal: 13,
    marginTop: 9,
    marginLeft: 46,
  },
  promptButtonText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.green,
  },
  heading: { marginTop: 30, marginBottom: 20 },
  feedTitle: {
    fontFamily: fonts.bold,
    fontSize: 23,
    color: colors.ink,
    letterSpacing: -0.6,
    flexShrink: 1,
  },
  count: {
    minWidth: 25,
    height: 25,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  countText: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingLeft: 14,
    paddingRight: 4,
    minHeight: 49,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.ink,
    paddingVertical: 13,
    minHeight: 47,
  },
  chips: { gap: 8, paddingTop: 14, paddingBottom: 5 },
  chip: {
    minHeight: 42,
    paddingHorizontal: 15,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "white",
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  group: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 26,
    marginBottom: 16,
  },
  groupTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  groupSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 7,
    letterSpacing: 0.8,
    color: "#a4b094",
  },
  groupLine: { height: 1, backgroundColor: colors.line, flex: 1 },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
    minHeight: 310,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#dce5d0",
    borderRadius: 18,
    backgroundColor: "white",
    gap: 15,
    marginTop: 25,
  },
  sprout: {
    width: 80,
    height: 80,
    borderRadius: 25,
    backgroundColor: "#eff5e6",
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "-5deg" }],
  },
  emptyEyebrow: {
    fontFamily: fonts.bold,
    fontSize: 7.5,
    color: colors.green,
    letterSpacing: 1,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 19,
    lineHeight: 27,
    color: "#526c41",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  emptyBody: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 22,
    textAlign: "center",
    color: "#839373",
  },
  end: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginVertical: 30,
  },
  endText: { fontFamily: fonts.regular, fontSize: 8, color: "#a0ad90" },
  error: { marginTop: 8 },
  retry: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    padding: 10,
    minHeight: 44,
  },
  retryText: { fontFamily: fonts.bold, color: colors.green, fontSize: 12 },
  cache: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 15 },
  cacheText: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted },
});
