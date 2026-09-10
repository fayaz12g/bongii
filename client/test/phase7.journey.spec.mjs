import { expect, test } from "@playwright/test";
import { clearAuthUsers, signInTestUser } from "./firebaseAuthFixture.mjs";

const campaignImport = {
  title: "Phase Seven Four By Four",
  description: "A no-free-space Phase 7 journey.",
  backgroundPresetId: 3,
  boardSize: 4,
  startDateTime: "2026-09-10T19:00",
  timeZone: "UTC",
  categories: [{
    name: "Predictions",
    type: "choose_many",
    required: true,
    items: Array.from({ length: 16 }, (_, index) => `Grid outcome ${index + 1}`),
  }],
};

const createCampaign = async (moderator, request) => {
  await clearAuthUsers(request);
  await signInTestUser({ page: moderator, request, returnTo: "/create" });
  await moderator.getByLabel("Import campaign JSON file").setInputFiles({
    name: "campaign.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(campaignImport)),
  });
  await moderator.getByRole("button", { name: "Next: Design Theme" }).click();
  await moderator.getByRole("button", { name: "Next: Add Categories" }).click();
  await moderator.getByRole("button", { name: "Review & Create" }).click();
  await moderator.getByRole("button", { name: "Create Campaign" }).click();
  await moderator.waitForURL(/\/moderate\/[A-Z]{4}$/);
  const campaignCode = moderator.url().split("/").at(-1);
  await moderator.getByRole("button", { name: "Publish" }).click();
  await expect(moderator.getByText("Open", { exact: true })).toBeVisible();
  return campaignCode;
};

test("runs a 4 by 4 board through edit, Double Bong, reconnect, and results", async ({
  browser,
  page: moderator,
  request,
}) => {
  test.setTimeout(120_000);
  const campaignCode = await createCampaign(moderator, request);

  await moderator.goto(`/${campaignCode}`);
  await expect(moderator.getByPlaceholder("Enter your name...")).toHaveValue("Test Moderator");
  await moderator.goto(`/moderate/${campaignCode}`);

  const playerContext = await browser.newContext();
  try {
    const player = await playerContext.newPage();
    await player.goto(`/${campaignCode}`);
    await expect(player.getByRole("gridcell")).toHaveCount(16);
    await expect(player.getByText("FREE SPACE", { exact: true })).toHaveCount(0);
    await player.getByPlaceholder("Enter your name...").fill("Ada");
    for (const item of campaignImport.categories[0].items) {
      await player.getByRole("button", { name: item, exact: true }).click();
    }
    await player.getByRole("button", { name: "Finalize Board" }).click();
    await player.waitForURL(/\/boards\/[A-Z]{4}$/);
    const boardCode = player.url().split("/").at(-1);

    await expect(player.getByRole("link", { name: "Edit board" })).toBeVisible();
    await player.getByRole("link", { name: "Edit board" }).click();
    await player.waitForURL(new RegExp(`/${campaignCode}\\?edit=${boardCode}$`));
    await player.getByPlaceholder("Enter your name...").fill("Ada Edited");
    await player.getByRole("button", { name: "Save Board" }).click();
    await player.waitForURL(new RegExp(`/boards/${boardCode}$`));
    await expect(player.getByText("Ada Edited", { exact: true })).toBeVisible();

    await moderator.getByRole("button", { name: "Lock entries" }).click();
    await moderator.getByRole("dialog").getByRole("button", { name: "Lock entries" }).click();
    await moderator.getByRole("button", { name: "Start moderation" }).click();

    for (const itemNumber of [2, 3, 4, 5, 9, 13]) {
      const label = `Grid outcome ${itemNumber}`;
      await moderator.getByRole("group", { name: `Outcome for ${label}`, exact: true })
        .getByRole("button", { name: "Mark as Happened" }).click();
      await expect(player.getByRole("gridcell", { name: `${label}: Happened` })).toBeVisible();
    }
    await expect(player.getByText("0 Bongs", { exact: true })).toBeVisible();

    await moderator.getByRole("group", { name: "Outcome for Grid outcome 1", exact: true })
      .getByRole("button", { name: "Mark as Happened" }).click();
    await expect(player.getByText("2 Bongs", { exact: true })).toBeVisible();
    await expect(player.locator(".bong-announcement")).toHaveText("Double Bong!");
    await expect(player.locator(".bong-announcement")).toHaveCount(0, { timeout: 5_000 });

    await player.reload();
    await expect(player.getByText("2 Bongs", { exact: true })).toBeVisible();
    await expect(player.locator(".bong-announcement")).toHaveCount(0);

    await moderator.getByRole("button", { name: "Finalize results" }).click();
    await moderator.getByRole("dialog").getByRole("button", { name: "Finalize results" }).click();
    await moderator.waitForURL(new RegExp(`/leaderboards/${campaignCode}$`));
    await expect(moderator.getByRole("heading", { level: 2, name: "Ada Edited" })).toBeVisible();
    await expect(moderator.getByText("Rules v2", { exact: false })).toBeVisible();
  } finally {
    await playerContext.close();
  }
});

test("shares a cold-start readiness request and keeps mobile controls reachable", async ({ page }) => {
  test.setTimeout(30_000);
  let readyRequests = 0;
  await page.route("**/api/ready", async (route) => {
    readyRequests += 1;
    await new Promise((resolve) => setTimeout(resolve, 15_000));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ready" }),
    });
  });
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Waking Bongii");
  await page.waitForURL(/\/play$/);
  expect(readyRequests).toBe(1);

  const footer = await page.locator("footer").boundingBox();
  expect(footer).not.toBeNull();
  expect(footer.y + footer.height).toBeLessThanOrEqual(641);
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect(page.getByRole("switch", { name: "Reduce motion" })).toHaveCount(1);
});

test("confirms a mock token purchase without collecting payment data", async ({ page, request }) => {
  await clearAuthUsers(request);
  await signInTestUser({ page, request, returnTo: "/profile" });
  await expect(page.getByLabel("10 Double or Nothing tokens")).toBeVisible();

  await page.getByRole("button", { name: "Purchase 100 tokens" }).click();
  const confirmation = page.getByRole("dialog", { name: "Mock token purchase" });
  await expect(confirmation).toContainText("no payment data");
  await confirmation.getByRole("button", { name: "Confirm mock purchase" }).click();

  await expect(page.getByRole("status")).toContainText("100 mock tokens added");
  await expect(page.getByLabel("110 Double or Nothing tokens")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("110 Double or Nothing tokens")).toBeVisible();
});

test("uploads and removes an owned avatar while Storage rejects a cross-user write", async ({
  page,
  request,
}) => {
  await clearAuthUsers(request);
  const user = await signInTestUser({ page, request, returnTo: "/profile" });
  await expect(page.getByRole("heading", { name: "Your Profile" })).toBeVisible();

  await page.getByLabel("Upload avatar").setInputFiles("public/avatars/chippy-2.png");
  await expect(page.getByRole("status")).toContainText("Avatar updated successfully");
  await expect(page.getByAltText("Test Moderator avatar")).toHaveAttribute("src", /44199/);

  const denied = await request.post(
    "http://127.0.0.1:44199/v0/b/demo-bongii.appspot.com/o?uploadType=media&name=avatars%2Fsomeone-else%2Favatar.png",
    {
      data: Buffer.from("not-an-image"),
      headers: {
        Authorization: `Bearer ${user.idToken}`,
        "Content-Type": "image/png",
      },
    },
  );
  expect(denied.status()).toBe(403);

  await page.getByRole("button", { name: "Remove upload" }).click();
  await expect(page.getByRole("status")).toContainText("Uploaded avatar removed");
});