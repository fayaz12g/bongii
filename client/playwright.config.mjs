import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test",
  testMatch: "**/*.a11y.spec.mjs",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "line",
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:43901",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 43901",
    env: {
      ...process.env,
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:43901",
    },
    url: "http://localhost:43901",
    reuseExistingServer: !process.env.CI,
  },
  projects: [{
    name: "chromium",
    use: { ...devices["Desktop Chrome"] },
  }],
});