import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, request, subscribeDevice } from "../src/lib/api";
import { topics } from "../src/lib/model";
afterEach(() => vi.unstubAllGlobals());
describe("device topic registration", () => {
  it("sends the native FCM token and all four topics without publish authentication", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ subscribed: topics }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetcher);
    await subscribeDevice("native-fcm-token");
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toMatch(/\/api\/push\/subscribe$/);
    expect(JSON.parse(options.body)).toEqual({
      token: "native-fcm-token",
      topics,
    });
    expect(options.headers).toEqual({ "Content-Type": "application/json" });
  });
  it("does not claim success for a partial subscription", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ subscribed: ["deals"] }), {
          status: 200,
        }),
      ),
    );
    await expect(subscribeDevice("token")).rejects.toThrow(
      "Some feeds couldn’t be connected",
    );
  });
  it("explains the existing backend permission failure without exposing provider text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            detail: {
              message: "private-device-token",
              errors: { deals: "PERMISSION_DENIED" },
            },
          }),
          { status: 502 },
        ),
      ),
    );
    await expect(subscribeDevice("private-device-token")).rejects.toThrow(
      "Cloud Messaging API permissions",
    );
  });
  it("does not echo unknown provider reasons in public errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            detail: { errors: { deals: "private-device-token" } },
          }),
          { status: 502 },
        ),
      ),
    );
    const error = await request("/api/push/subscribe").catch(
      (error) => error as ApiError,
    );
    expect(error.codes).toEqual([]);
    expect(error.message).not.toContain("private-device-token");
  });
});
