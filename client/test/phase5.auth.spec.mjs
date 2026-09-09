import { expect, test } from "@playwright/test";
import {
  clearAuthUsers,
  confirmEmailVerification,
  createVerifiedUser,
  getOutOfBandCodes,
} from "./firebaseAuthFixture.mjs";

const profile = {
  id: 1,
  username: "moderator",
  displayName: "Test Moderator",
  email: "moderator@example.com",
  profileIcon: "1",
  photoUrl: null,
};

test.beforeEach(async ({ page, request }) => {
  await clearAuthUsers(request);
  await page.route("**/api/users/current", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(profile),
  }));
});

test("registers, verifies email, and preserves the return path", async ({ page, request }) => {
  await page.goto("/register?returnTo=%2Fprofile");
  await page.getByLabel("Display name").fill("New Moderator");
  await page.getByLabel("Email").fill("new@example.com");
  await page.getByLabel("Password", { exact: true }).fill("secure-password");
  await page.getByLabel("Confirm password").fill("secure-password");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();
  const codes = await getOutOfBandCodes(request);
  const verification = codes.oobCodes.find(
    (code) => code.email === "new@example.com" && code.requestType === "VERIFY_EMAIL",
  );
  expect(verification).toBeTruthy();
  await confirmEmailVerification(request, verification.oobCode);
  await page.getByRole("button", { name: "I've verified my email" }).click();
  await expect(page).toHaveURL(/\/profile$/);
});

test("signs in with email and preserves the return path", async ({ page, request }) => {
  await createVerifiedUser(request);
  await page.goto("/login?returnTo=%2Fprofile");
  await page.getByLabel("Email").fill("moderator@example.com");
  await page.getByLabel("Password").fill("secure-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole("heading", { name: "Your Profile" })).toBeVisible();
});

test("requests a password reset without revealing account existence", async ({ page, request }) => {
  let firebaseError = "";
  page.on("response", async (response) => {
    if (response.url().includes("accounts:sendOobCode") && response.status() >= 400) {
      const body = await response.json().catch(() => ({}));
      firebaseError = body.error?.message || `HTTP ${response.status()}`;
    }
  });
  await createVerifiedUser(request);
  await page.goto("/forgot-password?returnTo=%2Fprofile");
  await page.getByLabel("Email").fill("moderator@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();

  await expect(page.getByRole("status")).toContainText("If an account exists");
  const codes = await getOutOfBandCodes(request);
  expect(
    codes.oobCodes.some(
      (code) => code.email === "moderator@example.com" && code.requestType === "PASSWORD_RESET",
    ),
    `Firebase reset request failed: ${firebaseError || "no reset code was created"}`,
  ).toBe(true);
});