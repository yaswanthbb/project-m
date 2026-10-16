import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  localGet: vi.fn(),
  localSet: vi.fn(),
  secureGet: vi.fn(),
  secureSet: vi.fn(),
  secureDelete: vi.fn(),
}));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: mocks.localGet, setItem: mocks.localSet },
}));
vi.mock("expo-secure-store", () => ({
  getItemAsync: mocks.secureGet,
  setItemAsync: mocks.secureSet,
  deleteItemAsync: mocks.secureDelete,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "device-only",
}));
import {
  clearPublishToken,
  getPublishToken,
  readFeed,
  saveFeed,
  setPublishToken,
} from "../src/lib/storage";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.localSet.mockResolvedValue(undefined);
});
describe("native persistence", () => {
  it("keeps publish credentials in native secure storage, separate from feed caches", async () => {
    mocks.secureGet.mockResolvedValue("private-token");
    await setPublishToken("private-token");
    expect(await getPublishToken()).toBe("private-token");
    await clearPublishToken();
    expect(mocks.secureSet).toHaveBeenCalledWith(
      "daily-drop.publish-token",
      "private-token",
      { keychainAccessible: "device-only" },
    );
    expect(mocks.secureDelete).toHaveBeenCalled();
    expect(mocks.localSet).not.toHaveBeenCalled();
  });
  it("treats corrupt caches as unavailable instead of crashing startup", async () => {
    mocks.localGet.mockResolvedValue("{not JSON");
    expect(await readFeed("deals")).toBeNull();
    mocks.localGet.mockResolvedValue(
      JSON.stringify({ items: [{ id: "invalid" }], updated: Date.now() }),
    );
    expect(await readFeed("deals")).toBeNull();
  });
  it("keeps a deletion snapshot last when cache writes overlap", async () => {
    let release!: () => void;
    mocks.localSet.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const item = {
      id: 1,
      title: "A find",
      url: "https://example.com",
      created_at: "2026-10-16T08:00:00Z",
    };
    const first = saveFeed("picks", [item], 1),
      second = saveFeed("picks", [], 2);
    await vi.waitFor(() => expect(mocks.localSet).toHaveBeenCalledTimes(1));
    release();
    await Promise.all([first, second]);
    expect(JSON.parse(mocks.localSet.mock.calls.at(-1)![1])).toEqual({
      items: [],
      updated: 2,
    });
  });
});
