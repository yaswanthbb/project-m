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
export const API = (
  import.meta.env.VITE_API_BASE_URL || "https://personal-news-api.onrender.com"
).replace(/\/$/, "");
export const TOKEN_KEY = "daily-drop:publish-token";
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
export const storage = {
  get(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
};
export function readFeed(topic: Topic): Feed {
  const empty = {
    items: [],
    updated: 0,
    loading: false,
    error: null,
    cached: false,
  };
  try {
    const saved = JSON.parse(storage.get(`daily-drop:feed:${topic}`) || "null");
    return saved && typeof saved.updated === "number"
      ? {
          ...empty,
          items: validItems(saved.items),
          updated: saved.updated,
          cached: true,
        }
      : empty;
  } catch {
    return empty;
  }
}
export function saveFeed(topic: Topic, items: Item[], updated: number) {
  return storage.set(
    `daily-drop:feed:${topic}`,
    JSON.stringify({ items, updated }),
  );
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
export function notificationRoute(data?: Record<string, string>) {
  const topic = isTopic(data?.tab) ? data.tab : "deals";
  const id =
    data?.item_id && /^[1-9]\d*$/.test(data.item_id) ? `/${data.item_id}` : "";
  return `#/${topic}${id}`;
}
export function parseRoute(hash: string) {
  const [section, id] = hash.replace(/^#\/?/, "").split("/");
  return {
    section:
      section === "settings"
        ? ("settings" as const)
        : isTopic(section)
          ? section
          : ("deals" as Topic),
    id: id && /^[1-9]\d*$/.test(id) ? Number(id) : undefined,
  };
}
export async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    signal: options.signal || AbortSignal.timeout(75000),
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 401)
      throw new Error(
        "Your publish token wasn’t accepted. Update it in Settings and try again.",
      );
    if (response.status === 404)
      throw new Error("This item has already been removed.");
    throw new Error(
      `The server is having a moment (${response.status}). Try again shortly.`,
    );
  }
  return response;
}
