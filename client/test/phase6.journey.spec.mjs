import { expect, test } from "@playwright/test";
import { clearAuthUsers, signInTestUser } from "./firebaseAuthFixture.mjs";

const campaignImport = {
  title: "Phase Six Live Journey",
  description: "A real three-context browser release journey.",
  backgroundPresetId: 1,
  boardSize: 3,
  startDateTime: "2026-09-10T19:00",
  timeZone: "UTC",
  categories: [{
    name: "Predictions",
    type: "choose_many",
    required: true,
    items: Array.from({ length: 8 }, (_, index) => `Live outcome ${index + 1}`),
  }],
};

const createBoard = async (page, campaignCode, playerName) => {
  await page.goto(`/${campaignCode}`);
  await expect(page.getByRole("heading", { level: 1, name: campaignImport.title })).toBeVisible();
  await page.getByPlaceholder("Enter your name...").fill(playerName);
  for (const item of campaignImport.categories[0].items) {
    await page.getByRole("button", { name: item, exact: true }).click();
  }
  await page.getByRole("button", { name: "Finalize Board" }).click();
  await page.waitForURL(/\/boards\/[A-Z]{4}$/);
  return page.url().split("/").at(-1);
};

test("creates boards, moderates live in two viewers, and publishes results", async ({
  browser,
  page: moderator,
  request,
}) => {
  await clearAuthUsers(request);
  await signInTestUser({ page: moderator, request, returnTo: "/create" });

  await moderator.getByLabel("Import campaign JSON file").setInputFiles({
    name: "campaign.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(campaignImport)),
  });
  await expect(moderator.getByRole("status")).toContainText("Imported 1 categories");
  await moderator.getByRole("button", { name: "Next: Design Theme" }).click();
  await moderator.getByRole("button", { name: "Next: Add Categories" }).click();
  await moderator.getByRole("button", { name: "Review & Create" }).click();
  await moderator.getByRole("button", { name: "Create Campaign" }).click();
  await moderator.waitForURL(/\/moderate\/[A-Z]{4}$/);
  const campaignCode = moderator.url().split("/").at(-1);

  await moderator.getByRole("button", { name: "Publish" }).click();
  await expect(moderator.getByText("Open", { exact: true })).toBeVisible();

  const firstViewerContext = await browser.newContext();
  const secondViewerContext = await browser.newContext();
  try {
    const firstViewer = await firstViewerContext.newPage();
    const secondViewer = await secondViewerContext.newPage();
    const firstBoardCode = await createBoard(firstViewer, campaignCode, "Ada");
    const secondBoardCode = await createBoard(secondViewer, campaignCode, "Grace");
    expect(firstBoardCode).not.toBe(secondBoardCode);

    await moderator.getByRole("button", { name: "Lock entries" }).click();
    await moderator.getByRole("dialog").getByRole("button", { name: "Lock entries" }).click();
    await expect(moderator.getByText("Entries locked", { exact: true })).toBeVisible();
    await moderator.getByRole("button", { name: "Start moderation" }).click();
    await expect(moderator.getByText("Moderating", { exact: true })).toBeVisible();

    const firstOutcome = moderator.getByRole("group", { name: "Outcome for Live outcome 1" });
    await firstOutcome.getByRole("button", { name: "Mark as Happened" }).click();
    await expect(firstViewer.getByRole("gridcell", { name: "Live outcome 1: Happened" })).toBeVisible();
    await expect(secondViewer.getByRole("gridcell", { name: "Live outcome 1: Happened" })).toBeVisible();

    await moderator.getByRole("button", { name: "Finalize results" }).click();
    await moderator.getByRole("dialog").getByRole("button", { name: "Finalize results" }).click();
    await moderator.waitForURL(new RegExp(`/leaderboards/${campaignCode}$`));
    await expect(moderator.getByRole("heading", { level: 2, name: "Ada" })).toBeVisible();
    await expect(moderator.getByRole("heading", { level: 2, name: "Grace" })).toBeVisible();
    await expect(firstViewer.getByText("Completed", { exact: true })).toBeVisible();
    await expect(secondViewer.getByText("Completed", { exact: true })).toBeVisible();
  } finally {
    await firstViewerContext.close();
    await secondViewerContext.close();
  }
});