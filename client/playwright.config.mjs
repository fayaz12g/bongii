import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test",
  testMatch: ["**/*.a11y.spec.mjs", "**/*.auth.spec.mjs", "**/*.journey.spec.mjs"],
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "line",
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:43901",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npx firebase emulators:start --only auth,storage --project demo-bongii",
      url: "http://127.0.0.1:44099/emulator/v1/projects/demo-bongii/config",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm --prefix ../server run start:playwright",
      url: "http://127.0.0.1:43900/api/health",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run dev -- --port 43901",
      env: {
        ...process.env,
        NEXT_DIST_DIR: ".next-playwright",
        NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:43900",
        NEXT_PUBLIC_FIREBASE_API_KEY: "fake-api-key",
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-bongii.firebaseapp.com",
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-bongii",
        NEXT_PUBLIC_FIREBASE_APP_ID: "1:123:web:test",
        NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:44099",
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-bongii.appspot.com",
        NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:44199",
        NEXT_PUBLIC_ENABLE_AVATAR_UPLOAD: "true",
        NEXT_PUBLIC_ENABLE_DEBUG_TOKEN_PURCHASE: "true",
      },
      url: "http://localhost:43901",
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [{
    name: "chromium",
    use: { ...devices["Desktop Chrome"] },
  }],
});