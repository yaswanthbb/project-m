import { describe, expect, it } from "vitest";
import {
  groupItems,
  homeForTopic,
  notificationDestination,
  safeUrl,
  validItems,
} from "../src/lib/model";
import type { Item } from "../src/lib/model";
const item = (id: number, date: string): Item => ({
  id,
  date,
  title: "A useful idea",
  url: "https://example.com",
  created_at: `${date}T08:00:00Z`,
});
describe("feed identity and notification navigation", () => {
  it("keeps multiple same-day finds separate and sorts both groups", () => {
    const grouped = groupItems(
      [item(1, "2026-10-16"), item(2, "2026-10-15"), item(3, "2026-10-16")],
      "2026-10-16",
    );
    expect(grouped.Today.map((value) => value.id)).toEqual([3, 1]);
    expect(grouped.Earlier.map((value) => value.id)).toEqual([2]);
  });
  it("routes all notification topics and opens the correct money tab without an item", () => {
    for (const topic of ["deals", "picks", "airdrops", "tips"])
      expect(notificationDestination({ tab: topic, item_id: "42" })).toBe(
        `/item/${topic}/42`,
      );
    expect(notificationDestination({ tab: "tips" })).toBe("/money?topic=tips");
    expect(notificationDestination({ tab: "airdrops" })).toBe(
      "/money?topic=airdrops",
    );
    expect(homeForTopic("picks")).toBe("/picks");
  });
  it("rejects notification URL injection and invalid IDs", () => {
    expect(
      notificationDestination({
        tab: "https://evil.example",
        item_id: "../settings",
        url: "javascript:alert(1)",
      }),
    ).toBe("/");
    expect(notificationDestination({ tab: "tips", item_id: "-1" })).toBe(
      "/money?topic=tips",
    );
  });
  it("allows only HTTP(S) claim links without embedded credentials", () => {
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("https://user:password@example.com")).toBeUndefined();
    expect(safeUrl("https://example.com/claim")).toBe(
      "https://example.com/claim",
    );
  });
  it("rejects malformed payloads before they can poison the saved feed", () => {
    expect(validItems([item(1, "2026-10-16")])).toHaveLength(1);
    expect(() => validItems({ items: [] })).toThrow();
    expect(() =>
      validItems([{ ...item(1, "2026-10-16"), claim_steps: [12] }]),
    ).toThrow();
  });
});
