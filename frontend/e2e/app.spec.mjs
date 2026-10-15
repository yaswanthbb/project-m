import { test, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
const API = "https://personal-news-api.onrender.com";
function localDate(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fixtures() {
  const today = localDate(),
    yesterday = localDate(-1);
  const offer = {
    url: "https://example.com/official",
    created_at: `${today}T06:00:00Z`,
    expires: "2099-12-31",
    offer_details:
      "Full access to the community edition, free for personal projects.",
    claim_steps: [
      "Open the official project website.",
      "Create your account and choose the free plan.",
      "Start building something you love.",
    ],
  };
  return {
    deals: [
      {
        ...offer,
        id: 1,
        title: "A little more room for your big ideas",
        source: "Notion",
        tag: "AI",
        description:
          "Free AI credits to turn a blank page into your next great project.",
      },
      {
        ...offer,
        id: 2,
        title: "Your next side project starts here",
        source: "GitHub",
        tag: "Dev tools",
        description:
          "Build, ship, and experiment with a free developer toolkit.",
      },
      {
        ...offer,
        id: 3,
        created_at: `${yesterday}T06:00:00Z`,
        title: "Good design. Without the price tag.",
        source: "Figma",
        tag: "Design",
        description:
          "A free collection of useful design resources for your next bright idea.",
      },
      {
        ...offer,
        id: 4,
        created_at: `${yesterday}T06:00:00Z`,
        title: "A fresh home for your next app",
        source: "Cloudflare",
        tag: "Cloud",
        description:
          "Free tools for taking your small project from local to live.",
      },
    ],
    picks: [
      {
        id: 11,
        title: "Make something small, just for yourself",
        body: "A small project can teach you a surprising amount.\n\nPick one everyday annoyance, give yourself an afternoon, and see where curiosity takes you.",
        date: today,
        created_at: `${today}T06:00:00Z`,
        url: "https://example.com/read",
      },
    ],
    airdrops: [
      {
        ...offer,
        id: 21,
        title: "Explore a community testnet",
        source: "Example Network",
        tag: "Software",
        reward: "Project points; allocation not confirmed",
        eligibility: "Read the official testnet participation requirements.",
        description:
          "A free community testnet to explore. Review the project and risks before participating.",
      },
    ],
    tips: [
      {
        id: 31,
        title: "Get to know your emergency fund",
        body: "An emergency fund is money reserved for unexpected expenses.\n\nLearning about liquidity, access, and risk can help you understand the different places people keep savings.",
        date: today,
        created_at: `${today}T06:00:00Z`,
        url: "https://example.com/learn",
      },
    ],
  };
}
async function mock(context, data = fixtures()) {
  const deletes = [];
  await context.route(`${API}/api/**`, async (route) => {
    const request = route.request(),
      topic = new URL(request.url()).pathname.split("/")[2];
    if (request.method() === "DELETE") {
      deletes.push({ topic, token: request.headers()["x-publish-token"] });
      const id = Number(new URL(request.url()).pathname.split("/")[3]);
      data[topic] = data[topic].filter((item) => item.id !== id);
      await route.fulfill({ status: 204 });
      return;
    }
    await route.fulfill({ json: data[topic] || [] });
  });
  return deletes;
}
async function ready(page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, {
          once: true,
        }),
      );
  });
}
test("desktop feed, grouping, category/search, and full claim detail", async ({
  page,
  context,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mock(context);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "A little more room for your big ideas",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Today", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Earlier", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Dev tools", exact: true }).click();
  await expect(page.locator(".feed-card")).toHaveCount(1);
  await page.getByRole("button", { name: "All finds", exact: true }).click();
  await page.getByRole("textbox", { name: "Search Deals" }).fill("blank page");
  await expect(page.locator(".feed-card")).toHaveCount(1);
  await page
    .getByRole("heading", { name: "A little more room for your big ideas" })
    .click();
  await expect(
    page.getByRole("heading", { name: "What you get" }),
  ).toBeVisible();
  await expect(page.locator(".claim-steps li")).toHaveCount(3);
  await expect(
    page.getByRole("link", { name: "Claim on official site" }),
  ).toHaveAttribute("href", "https://example.com/official");
  expect(errors).toEqual([]);
});
test("mobile bottom nav, money tabs, required warnings, and narrow screens", async ({
  page,
  context,
}) => {
  await mock(context);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".feed-card")).toHaveCount(4);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Money" })
    .click();
  await expect(
    page.getByRole("tab", { name: "Crypto Airdrops" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByText(
      "Never share seed phrases or private keys. Only use official links.",
    ),
  ).toBeVisible();
  await page
    .getByRole("heading", { name: "Explore a community testnet" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Who’s eligible?" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Never share seed phrases or private keys. Only use official links.",
    ),
  ).toBeVisible();
  await page.goto("/#/tips/31");
  await expect(
    page.getByText("Educational only, not financial advice."),
  ).toBeVisible();
  await page.goto("/#/tips");
  await expect(
    page.getByRole("tab", { name: "Financial Tips" }),
  ).toHaveAttribute("aria-selected", "true");
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("settings keeps saved token hidden and confirmed delete updates feed/cache", async ({
  page,
  context,
}) => {
  const deletes = await mock(context);
  await page.goto("/#/settings");
  const input = page.getByLabel("Publish token", { exact: true });
  await input.fill("test-token-for-browser-check");
  await page.getByRole("button", { name: "Save token" }).click();
  await expect(page.locator("#publish-token")).toHaveValue("");
  await expect(page.getByText("test-token-for-browser-check")).toHaveCount(0);
  await page.goto("/#/deals");
  await page
    .getByRole("button", {
      name: "Delete A little more room for your big ideas",
    })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Keep it" }).click();
  expect(deletes).toHaveLength(0);
  await page
    .getByRole("button", {
      name: "Delete A little more room for your big ideas",
    })
    .click();
  await page.getByRole("button", { name: "Yes, remove" }).click();
  await expect(
    page.getByRole("heading", {
      name: "A little more room for your big ideas",
    }),
  ).toHaveCount(0);
  expect(deletes).toEqual([
    { topic: "deals", token: "test-token-for-browser-check" },
  ]);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("daily-drop:feed:deals")).items.some(
        (item) => item.id === 1,
      ),
    ),
  ).toBe(false);
});
test("production shell and saved feeds reload offline; update reports offline", async ({
  page,
  context,
}) => {
  await mock(context);
  await page.goto("/");
  await expect(page.locator(".feed-card")).toHaveCount(4);
  await ready(page);
  await context.unrouteAll();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByText("You’re offline. Browse your last saved finds."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "A little more room for your big ideas",
    }),
  ).toBeVisible();
  await page.goto("/#/picks/11");
  await expect(
    page.getByRole("heading", {
      name: "Make something small, just for yourself",
    }),
  ).toBeVisible();
  await page.goto("/#/settings");
  await page.getByRole("button", { name: "Update app" }).click();
  await expect(
    page.getByText("Connect to the internet to check for updates."),
  ).toBeVisible();
});
test("empty/error states and no placeholder Firebase permission request", async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    window.permissionRequests = 0;
    if (window.Notification)
      Notification.requestPermission = async () => {
        window.permissionRequests++;
        return "granted";
      };
  });
  await mock(context, { deals: [], picks: [], airdrops: [], tips: [] });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your next good find is on its way." }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/empty.png", fullPage: true });
  await page.getByRole("button", { name: "Keep me posted" }).click();
  await expect(
    page.getByText(/Notifications aren’t configured yet/),
  ).toBeVisible();
  expect(await page.evaluate(() => window.permissionRequests)).toBe(0);
  await context.unrouteAll();
  await context.route(`${API}/api/**`, (route) => route.abort());
  await page.getByRole("button", { name: "Refresh feed" }).click();
  await expect(page.getByText(/We couldn’t reach the feed/)).toBeVisible();
});
test("notification deep links and worker messages select matching feed and item", async ({
  page,
  context,
}) => {
  await mock(context);
  await page.goto("/#/airdrops/21");
  await expect(
    page.getByRole("heading", { name: "Explore a community testnet" }),
  ).toBeVisible();
  await page.evaluate(() =>
    navigator.serviceWorker.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "NOTIFICATION_OPEN", hash: "#/tips/31" },
      }),
    ),
  );
  await expect(
    page.getByRole("heading", { name: "Get to know your emergency fund" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Money" }),
  ).toHaveAttribute("aria-current", "page");
});
test("manifest assets and worker version update reload", async ({
  page,
  context,
}) => {
  await mock(context);
  await page.goto("/#/settings");
  await ready(page);
  const manifest = await (
    await page.request.get("/manifest.webmanifest")
  ).json();
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons)
    expect((await page.request.get(`/${icon.src}`)).status()).toBe(200);
  const worker = new URL("../dist/sw.js", import.meta.url);
  const original = await readFile(worker, "utf8");
  try {
    await writeFile(
      worker,
      `${original}\n// browser-update-verification-${Date.now()}\n`,
    );
    const navigation = page.waitForEvent("load");
    await page.getByRole("button", { name: "Update app" }).click();
    await navigation;
    await expect(
      page.getByRole("heading", { name: "Your little preferences." }),
    ).toBeVisible();
  } finally {
    await writeFile(worker, original);
  }
});

test("pull-to-refresh and Money keyboard tabs", async ({ page, context }) => {
  await mock(context);
  await page.goto("/");
  await expect(page.locator(".feed-card")).toHaveCount(4);
  const read = page.waitForRequest(`${API}/api/deals`);
  await page.locator(".page-topline h1").evaluate((element) => {
    const touch = (y) =>
      new Touch({ identifier: 1, target: element, clientX: 80, clientY: y });
    element.dispatchEvent(
      new TouchEvent("touchstart", { bubbles: true, touches: [touch(100)] }),
    );
    element.dispatchEvent(
      new TouchEvent("touchmove", {
        bubbles: true,
        cancelable: true,
        touches: [touch(280)],
      }),
    );
  });
  await expect(page.getByText("Release to refresh")).toBeVisible();
  await page
    .locator(".page-topline h1")
    .evaluate((element) =>
      element.dispatchEvent(
        new TouchEvent("touchend", { bubbles: true, touches: [] }),
      ),
    );
  await read;
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Money" })
    .click();
  await page.getByRole("tab", { name: "Crypto Airdrops" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Financial Tips" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { name: "Financial Tips" })).toBeFocused();
});
