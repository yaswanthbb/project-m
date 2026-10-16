import { topics, validItems } from "./model";
import type { Topic } from "./model";
export const API = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://personal-news-api.onrender.com"
).replace(/\/$/, "");
const allowedCodes = new Set([
  "PERMISSION_DENIED",
  "UNAUTHENTICATED",
  "UNREGISTERED",
  "SENDER_ID_MISMATCH",
  "MISMATCHED_CREDENTIAL",
  "INVALID_ARGUMENT",
  "RESOURCE_EXHAUSTED",
  "UNAVAILABLE",
  "UNKNOWN_ERROR",
]);
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public codes: string[] = [],
  ) {
    super(message);
  }
}
export async function request(
  path: string,
  options: RequestInit = {},
  timeoutMs = 75000,
) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  const parent = options.signal;
  parent?.addEventListener("abort", cancel, { once: true });
  if (parent?.aborted) controller.abort();
  const timeout = setTimeout(cancel, timeoutMs);
  try {
    const response = await fetch(`${API}${path}`, {
      ...options,
      signal: controller.signal,
    });
    if (!response.ok) {
      let codes: string[] = [];
      if (path === "/api/push/subscribe") {
        try {
          const body = await response.json();
          codes = Object.values(body?.detail?.errors || {}).filter(
            (code): code is string =>
              typeof code === "string" && allowedCodes.has(code),
          );
        } catch {
          /* Do not echo provider response bodies. */
        }
      }
      throw new ApiError(
        response.status === 401
          ? "Your publish token wasn’t accepted. Replace it in Settings and try again."
          : response.status === 404
            ? "This find has already been removed."
            : `The server couldn’t complete that request (${response.status}). Please try again shortly.`,
        response.status,
        codes,
      );
    }
    return response;
  } finally {
    clearTimeout(timeout);
    parent?.removeEventListener("abort", cancel);
  }
}
export async function loadFeed(topic: Topic, signal?: AbortSignal) {
  return validItems(await (await request(`/api/${topic}`, { signal })).json());
}
export async function subscribeDevice(token: string) {
  try {
    const response = await request("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, topics }),
    });
    const result = await response.json();
    if (
      !Array.isArray(result.subscribed) ||
      !topics.every((topic) => result.subscribed.includes(topic))
    )
      throw new Error(
        "Some feeds couldn’t be connected. Try again in a little while.",
      );
  } catch (error) {
    if (error instanceof ApiError) {
      if (
        error.codes.includes("PERMISSION_DENIED") ||
        error.codes.includes("UNAUTHENTICATED")
      )
        throw new Error(
          "The server’s Firebase account can’t subscribe this device yet. Check its Cloud Messaging API permissions in the Firebase project.",
        );
      if (
        error.codes.some((code) =>
          ["SENDER_ID_MISMATCH", "MISMATCHED_CREDENTIAL"].includes(code),
        )
      )
        throw new Error(
          "The app and server use different Firebase registrations. Check that both use the same Firebase project.",
        );
      if (error.status === 503)
        throw new Error(
          "Notifications aren’t configured on the server yet. Your feeds are still ready to use.",
        );
    }
    throw error;
  }
}
