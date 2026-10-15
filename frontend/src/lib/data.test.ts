import { describe, expect, it } from "vitest";
import {
  groupItems,
  notificationRoute,
  parseRoute,
  safeUrl,
  validItems,
} from "./data";
import type { Item } from "./data";
const item = (id: number, date: string): Item => ({
  id,
  date,
  title: "A useful idea",
  url: "https://example.com",
  created_at: `${date}T08:00:00Z`,
});
describe("feed identity, dates, and deep links", () => {
  it("keeps distinct same-day items and sorts each group", () => {
    const groups = groupItems(
      [item(1, "2026-10-15"), item(2, "2026-10-14"), item(3, "2026-10-15")],
      "2026-10-15",
    );
    expect(groups.Today.map((value) => value.id)).toEqual([3, 1]);
    expect(groups.Earlier.map((value) => value.id)).toEqual([2]);
  });
  it("maps all four notification topics and safely validates item IDs", () => {
    for (const tab of ["deals", "picks", "airdrops", "tips"])
      expect(notificationRoute({ tab, item_id: "42" })).toBe(`#/${tab}/42`);
    expect(
      notificationRoute({
        tab: "https://evil.example",
        item_id: "../settings",
      }),
    ).toBe("#/deals");
    expect(parseRoute("#/tips/42")).toEqual({ section: "tips", id: 42 });
    expect(parseRoute("#/settings")).toEqual({
      section: "settings",
      id: undefined,
    });
  });
  it("rejects executable and credential-bearing external links", () => {
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("https://user:password@example.com")).toBeUndefined();
    expect(safeUrl("https://example.com/claim")).toBe(
      "https://example.com/claim",
    );
  });
  it("rejects malformed feeds instead of caching poisoned data", () => {
    expect(validItems([item(1, "2026-10-15")])).toHaveLength(1);
    expect(() => validItems({ items: [] })).toThrow();
    expect(() =>
      validItems([{ ...item(1, "2026-10-15"), body: {} }]),
    ).toThrow();
    expect(() =>
      validItems([{ ...item(1, "2026-10-15"), claim_steps: [12] }]),
    ).toThrow();
  });
});
