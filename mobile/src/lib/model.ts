export const topics = ["deals", "picks", "airdrops", "tips"] as const;
export type Topic = (typeof topics)[number];
export interface Item {
  id: number;
  title: string;
  url: string;
  created_at: string;
  description?: string;
  body?: string;
  date?: string;
  source?: string;
  tag?: string;
  expires?: string | null;
  offer_details?: string | null;
  claim_steps?: string[] | null;
  eligibility?: string | null;
  reward?: string | null;
}
export interface Feed {
  items: Item[];
  updated: number;
  loading: boolean;
  error: string | null;
  cached: boolean;
}
export type Feeds = Record<Topic, Feed>;
export const isTopic = (value: unknown): value is Topic =>
  topics.includes(value as Topic);
export function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
export function validItems(value: unknown): Item[] {
  if (
    !Array.isArray(value) ||
    !value.every(
      (item) =>
        item &&
        Number.isInteger(item.id) &&
        item.id > 0 &&
        typeof item.title === "string" &&
        typeof item.url === "string" &&
        typeof item.created_at === "string" &&
        [
          "description",
          "body",
          "date",
          "source",
          "tag",
          "expires",
          "offer_details",
          "eligibility",
          "reward",
        ].every((key) => item[key] == null || typeof item[key] === "string") &&
        (item.claim_steps == null ||
          (Array.isArray(item.claim_steps) &&
            item.claim_steps.every(
              (step: unknown) => typeof step === "string",
            ))),
    )
  )
    throw new Error(
      "The feed returned an unexpected format. Please try again.",
    );
  return value;
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function itemDate(item: Item) {
  if (item.date) return item.date;
  const value = /(?:Z|[+-]\d\d:\d\d)$/.test(item.created_at)
    ? item.created_at
    : `${item.created_at}Z`;
  return localDate(new Date(value));
}
export function groupItems(items: Item[], today = localDate()) {
  const sorted = [...items].sort(
    (a, b) =>
      itemDate(b).localeCompare(itemDate(a)) ||
      b.created_at.localeCompare(a.created_at) ||
      b.id - a.id,
  );
  return {
    Today: sorted.filter((item) => itemDate(item) === today),
    Earlier: sorted.filter((item) => itemDate(item) !== today),
  };
}
export function dateLabel(value?: string | null) {
  if (!value) return "No deadline listed";
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
export const expired = (item: Item) =>
  Boolean(item.expires && item.expires < localDate());
export function notificationDestination(data?: Record<string, unknown>) {
  const topic = isTopic(data?.tab) ? data.tab : "deals";
  const id =
    typeof data?.item_id === "string" && /^[1-9]\d*$/.test(data.item_id)
      ? data.item_id
      : undefined;
  if (id) return `/item/${topic}/${id}`;
  return topic === "deals"
    ? "/"
    : topic === "picks"
      ? "/picks"
      : `/money?topic=${topic}`;
}
export function homeForTopic(topic: Topic) {
  return topic === "deals"
    ? "/"
    : topic === "picks"
      ? "/picks"
      : `/money?topic=${topic}`;
}
