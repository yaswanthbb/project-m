import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import type { Href } from "expo-router";
import {
  Clock3,
  ExternalLink,
  Gift,
  Globe2,
  Trash2,
} from "lucide-react-native";
import { Header } from "../../../components/Header";
import { Button, IconButton, Notice, Safety } from "../../../components/ui";
import { DeleteDialog } from "../../../components/DeleteDialog";
import { colors, fonts, shared } from "../../../lib/theme";
import {
  dateLabel,
  expired,
  homeForTopic,
  isTopic,
  safeUrl,
} from "../../../lib/model";
import { content, lookFor } from "../../../lib/content";
import { useFeeds } from "../../../state/feeds";
export default function DetailScreen() {
  const params = useLocalSearchParams<{ topic: string; id: string }>();
  const topic = isTopic(params.topic) ? params.topic : "deals";
  const validRoute =
    isTopic(params.topic) &&
    typeof params.id === "string" &&
    /^[1-9]\d*$/.test(params.id);
  const { feeds, refresh } = useFeeds(),
    feed = feeds[topic];
  const item = validRoute
    ? feed.items.find((item) => item.id === Number(params.id))
    : undefined;
  const [deleting, setDeleting] = useState(false),
    [linkError, setLinkError] = useState("");
  const home = () => router.dismissTo(homeForTopic(topic) as Href);
  const offer = topic === "deals" || topic === "airdrops";
  const look = lookFor(topic, item),
    Icon = look.icon;
  const url = item ? safeUrl(item.url) : undefined;
  const open = async () => {
    if (!url) return;
    try {
      setLinkError("");
      await Linking.openURL(url);
    } catch {
      setLinkError("The official page couldn’t be opened. Please try again.");
    }
  };
  return (
    <View style={shared.page}>
      <Header back={home} title={content[topic].label} />
      <ScrollView contentContainerStyle={shared.content}>
        {!item ? (
          <View style={[shared.card, styles.missing]}>
            {feed.loading ? (
              <>
                <ActivityIndicator size="large" color={colors.green} />
                <Text style={styles.sectionTitle}>
                  Finding that one for you…
                </Text>
              </>
            ) : (
              <>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  {feed.error
                    ? "This find is out of reach."
                    : "This find has moved on."}
                </Text>
                <Text style={[shared.body, { textAlign: "center" }]}>
                  {feed.error ||
                    "It may have been removed. There are more good things to discover."}
                </Text>
                <Button onPress={() => void refresh(topic)}>Try again</Button>
                <Button secondary onPress={home}>
                  Back to the feed
                </Button>
              </>
            )}
          </View>
        ) : (
          <View testID="find-detail" style={shared.card}>
            <View style={styles.detailTop}>
              <View style={[styles.largeIcon, { backgroundColor: look.bg }]}>
                <Icon size={34} color={look.ink} strokeWidth={1.7} />
              </View>
              <IconButton
                icon={Trash2}
                label={`Delete ${item.title}`}
                onPress={() => setDeleting(true)}
                color="#a2ad94"
              />
            </View>
            <Text
              style={[shared.eyebrow, { color: colors.green, fontSize: 9 }]}
            >
              {item.tag || content[topic].label.toUpperCase()}
            </Text>
            <Text accessibilityRole="header" style={styles.title}>
              {item.title}
            </Text>
            <View style={styles.meta}>
              {item.source && (
                <View style={styles.metaItem}>
                  <Globe2 size={14} color={colors.muted} />
                  <Text style={styles.metaText}>{item.source}</Text>
                </View>
              )}
              <View style={styles.metaItem}>
                <Clock3 size={14} color={colors.muted} />
                <Text style={styles.metaText}>
                  {offer ? dateLabel(item.expires) : dateLabel(item.date)}
                </Text>
              </View>
              {expired(item) && (
                <Text style={[styles.metaText, { color: "#b08065" }]}>
                  Expired
                </Text>
              )}
            </View>
            {offer ? (
              <>
                <Text style={styles.prose}>{item.description}</Text>
                {topic === "airdrops" && (
                  <View style={styles.section}>
                    <Text
                      accessibilityRole="header"
                      style={styles.sectionTitle}
                    >
                      Who’s eligible?
                    </Text>
                    <Text style={styles.prose}>
                      {item.eligibility ||
                        "Eligibility hasn’t been provided in this feed. Check the official project for participation requirements, regional restrictions, and any costs before taking part."}
                    </Text>
                  </View>
                )}
                <View style={styles.section}>
                  <View style={[shared.row, { gap: 9, marginBottom: 13 }]}>
                    <Gift size={21} color="#89a46c" />
                    <Text
                      accessibilityRole="header"
                      style={styles.sectionTitle}
                    >
                      What you get
                    </Text>
                  </View>
                  <Text style={styles.prose}>
                    {item.offer_details ||
                      item.reward ||
                      "The publisher hasn’t added further reward details. Check the official page to confirm what’s included."}
                  </Text>
                </View>
                <View style={styles.section}>
                  <Text accessibilityRole="header" style={styles.sectionTitle}>
                    How to claim
                  </Text>
                  {item.claim_steps?.length ? (
                    item.claim_steps.map((step, index) => (
                      <View key={index} style={styles.step}>
                        <View style={styles.stepNumber}>
                          <Text style={styles.stepNumberText}>
                            {String(index + 1).padStart(2, "0")}
                          </Text>
                        </View>
                        <Text style={[styles.prose, { flex: 1 }]}>{step}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.prose, { marginTop: 12 }]}>
                      Claim instructions haven’t been added yet. Follow the
                      instructions on the official page.
                    </Text>
                  )}
                </View>
                <View style={styles.deadline}>
                  <Clock3 size={22} color="#8a9e77" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deadlineTitle}>
                      {expired(item)
                        ? "This offer has expired"
                        : "Keep an eye on the date"}
                    </Text>
                    <Text style={styles.deadlineText}>
                      {item.expires
                        ? `${topic === "airdrops" ? "Deadline" : "Expires"}: ${dateLabel(item.expires)}`
                        : "No expiry was provided. Availability can change."}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={{ gap: 20 }}>
                {item.body?.split(/\n\s*\n/).map((paragraph, index) => (
                  <Text key={index} style={styles.prose}>
                    {paragraph}
                  </Text>
                ))}
              </View>
            )}
            <Safety topic={topic} />
            {linkError && <Notice warning>{linkError}</Notice>}
            <View style={styles.actions}>
              {url ? (
                <Button onPress={() => void open()} icon={ExternalLink}>
                  {offer
                    ? expired(item)
                      ? "Visit official page"
                      : "Claim on official site"
                    : "Visit original source"}
                </Button>
              ) : (
                <Notice warning>
                  The publisher’s link is invalid. This find can’t be opened
                  safely.
                </Notice>
              )}
              {offer && (
                <Text style={styles.linkHelp}>
                  You’ll continue on the official website.
                  {url ? `\n${new URL(url).hostname}` : ""}\nCheck the terms
                  before you claim.
                </Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
      <DeleteDialog
        target={item && deleting ? { topic, item } : null}
        close={() => setDeleting(false)}
        onDeleted={home}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  detailTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  largeIcon: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.bold,
    color: colors.ink,
    fontSize: 28,
    lineHeight: 38,
    letterSpacing: -0.9,
    marginTop: 12,
    marginBottom: 16,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    columnGap: 17,
    rowGap: 9,
    paddingBottom: 22,
    marginBottom: 22,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontFamily: fonts.regular, color: colors.muted, fontSize: 10 },
  prose: {
    fontFamily: fonts.regular,
    color: "#708364",
    fontSize: 14,
    lineHeight: 26,
  },
  section: { marginTop: 30 },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 19,
    lineHeight: 27,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  step: {
    flexDirection: "row",
    gap: 13,
    alignItems: "flex-start",
    marginTop: 18,
  },
  stepNumber: {
    width: 34,
    height: 35,
    borderRadius: 10,
    backgroundColor: "#edf4e4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepNumberText: { fontFamily: fonts.bold, color: "#78995d", fontSize: 12 },
  deadline: {
    padding: 17,
    borderRadius: 14,
    backgroundColor: "#f6f8f0",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 28,
  },
  deadlineTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#758b62",
    lineHeight: 20,
  },
  deadlineText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: "#8b9c79",
    lineHeight: 19,
    marginTop: 4,
  },
  actions: {
    borderTopWidth: 1,
    borderColor: colors.line,
    paddingTop: 23,
    marginTop: 24,
    gap: 14,
  },
  linkHelp: {
    fontFamily: fonts.regular,
    color: "#98a789",
    fontSize: 10,
    textAlign: "center",
    lineHeight: 18,
  },
  missing: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 300,
    gap: 20,
  },
});
