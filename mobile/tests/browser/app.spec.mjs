import { test, expect } from "@playwright/test";
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

test("native feed layout, grouping, filters, search, and claim details", async ({
  page,
  context,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mock(context);
  await page.goto("/");
  await expect(
    page.getByRole("button", {
      name: "Open A little more room for your big ideas",
    }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/home.png" });
  await page.getByRole("button", { name: "Dev tools", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Open Your next side project starts here",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Open A little more room for your big ideas",
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /All finds/ }).click();
  await page.getByRole("textbox", { name: "Search Deals" }).fill("blank page");
  await page
    .getByRole("button", { name: "Open A little more room for your big ideas" })
    .click();
  await expect(page.getByText("What you get", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Start building something you love."),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/detail.png" });
  expect(errors).toEqual([]);
});
test("Money navigation, required warnings, notes, and narrow layout", async ({
  page,
  context,
}) => {
  await mock(context);
  await page.goto("/money?topic=airdrops");
  await expect(
    page.getByText(
      "Never share seed phrases or private keys. Only use official links.",
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open Explore a community testnet" })
    .click();
  await expect(
    page.getByText("Who’s eligible?", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByTestId("find-detail")
      .getByText(
        "Never share seed phrases or private keys. Only use official links.",
      ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Go back" }).click();
  await page.getByRole("tab", { name: "Financial Tips" }).click();
  await expect(
    page.getByText("Educational only, not financial advice."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open Get to know your emergency fund" })
    .click();
  await expect(
    page
      .getByTestId("find-detail")
      .getByText("Educational only, not financial advice."),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("hidden token, cancel and confirmed deletion update the cached feed", async ({
  page,
  context,
}) => {
  const deletes = await mock(context);
  await page.goto("/settings");
  await page
    .getByRole("textbox", { name: "Publish token", exact: true })
    .fill("test-publish-token");
  await page.getByRole("button", { name: /Save token/ }).click();
  await expect(
    page.getByRole("textbox", { name: "Replace saved token" }),
  ).toHaveValue("");
  await expect(page.getByText("test-publish-token")).toHaveCount(0);
  await page.getByRole("button", { name: "Go back" }).click();
  await page
    .getByRole("button", {
      name: "Delete A little more room for your big ideas",
    })
    .click();
  await expect(
    page.getByText("Remove this find?", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Keep it/ }).click();
  expect(deletes).toHaveLength(0);
  await page
    .getByRole("button", {
      name: "Delete A little more room for your big ideas",
    })
    .click();
  await page.getByRole("button", { name: /Yes, remove/ }).click();
  await expect(
    page.getByRole("button", {
      name: "Open A little more room for your big ideas",
    }),
  ).toHaveCount(0);
  expect(deletes).toEqual([{ topic: "deals", token: "test-publish-token" }]);
});
test("saved feeds survive a later API outage", async ({ page, context }) => {
  await mock(context);
  await page.goto("/");
  await expect(
    page.getByRole("button", {
      name: "Open A little more room for your big ideas",
    }),
  ).toBeVisible();
  await context.unrouteAll();
  await context.route(`${API}/api/**`, (route) => route.abort());
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Open A little more room for your big ideas",
    }),
  ).toBeVisible();
  await expect(page.getByText(/We couldn’t reach the feed/)).toBeVisible();
});
test("empty states and browser preview accurately explain native-only features", async ({
  page,
  context,
}) => {
  await mock(context, { deals: [], picks: [], airdrops: [], tips: [] });
  await page.goto("/");
  await expect(
    page.getByText("Your next good find is on its way."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep me posted" }).click();
  await expect(page.getByText(/This is the browser preview/)).toBeVisible();
  await page.goto("/settings");
  await page.getByRole("button", { name: /Update app/ }).click();
  await expect(
    page.getByText(/App updates are checked in installed release builds/),
  ).toBeVisible();
});
