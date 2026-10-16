import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  timeout: 30000,
  expect: { timeout: 10000 },
  use: {
    baseURL: "http://localhost:8081",
    viewport: { width: 390, height: 844 },
    headless: true,
    launchOptions: {
      executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
      args: ["--no-sandbox"],
    },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node scripts/serve-preview.mjs",
    url: "http://localhost:8081",
    reuseExistingServer: true,
  },
  reporter: "list",
});
