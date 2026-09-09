import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const preset = {
  id: 1,
  name: "Ocean Waves",
  gradient: "from-blue-400 via-blue-600 to-purple-700",
  animation: "wave",
};

const openCampaign = {
  id: 1,
  code: "OPEN",
  title: "Community Prediction Night",
  description: "A public campaign accepting player boards.",
  backgroundPreset: preset,
  boardSize: 3,
  status: "open",
  playerCount: 2,
  publishedAt: "2026-09-09T12:00:00.000Z",
  categories: [{
    id: 1,
    name: "Predictions",
    type: "choose_many",
    required: true,
    items: Array.from({ length: 8 }, (_, index) => ({
      id: index + 10,
      text: `Prediction ${index + 1}`,
    })),
  }],
};

const completedCampaign = {
  ...openCampaign,
  id: 2,
  code: "DONE",
  title: "Final Prediction Night",
  status: "completed",
  playerCount: 1,
  finalizedAt: "2026-09-09T14:00:00.000Z",
};

const itemStatuses = [
  "happened",
  "happened",
  "happened",
  "did_not_happen",
  "happened",
  "did_not_happen",
  "did_not_happen",
  "did_not_happen",
  "did_not_happen",
];

const tiles = itemStatuses.map((status, position) => ({
  id: position + 1,
  position,
  isCenter: position === 4 ? 1 : 0,
  categoryItemId: position === 4 ? null : position + 10,
  text: position === 4 ? null : `Prediction ${position + 1}`,
  customText: position === 4 ? "FREE SPACE" : null,
  outcome: { status, decidedAt: position === 4 ? null : "2026-09-09T14:00:00.000Z" },
}));

const board = {
  id: 1,
  boardCode: "PLAY",
  playerName: "Ada",
  campaignCode: "DONE",
  campaignTitle: completedCampaign.title,
  boardSize: 3,
  campaignStatus: "completed",
  campaignVersion: 8,
  backgroundPreset: preset,
  tiles,
};

const moderatorCampaign = {
  ...openCampaign,
  code: "LIVE",
  title: "Live Moderator Campaign",
  status: "moderating",
  version: 4,
  playerCount: 2,
  moderationStartedAt: "2026-09-09T13:00:00.000Z",
  allowedActions: ["finalize", "cancel"],
  categories: [{
    id: 1,
    name: "Predictions",
    items: [
      { id: 10, text: "Opening prediction", status: "happened", decidedAt: "2026-09-09T13:10:00.000Z" },
      { id: 11, text: "Closing prediction", status: "pending", decidedAt: null },
    ],
  }],
};

const leaderboard = {
  campaign: {
    code: "DONE",
    title: completedCampaign.title,
    boardSize: 3,
    status: "completed",
    version: 8,
    finalizedAt: completedCampaign.finalizedAt,
    rulesVersion: 1,
    backgroundPreset: preset,
  },
  results: [{
    rank: 1,
    sharedRank: false,
    playerName: "Ada",
    boardCode: "PLAY",
    longestRun: 3,
    completedLineCount: 1,
    matchedTileCount: 4,
    tiles,
  }],
  pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
};

const json = (route, body, status = 200) => route.fulfill({
  status,
  contentType: "application/json",
  body: JSON.stringify(body),
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("token", "accessibility-fixture"));
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/users/current") {
      return json(route, { id: 1, username: "moderator", firstName: "Test", lastName: "Owner" });
    }
    if (url.pathname === "/api/campaigns") {
      const group = url.searchParams.get("group");
      return json(route, group === "results" ? [completedCampaign] : [openCampaign]);
    }
    if (url.pathname === "/api/campaigns/OPEN") return json(route, openCampaign);
    if (url.pathname === "/api/campaigns/OPEN/boards") return json(route, []);
    if (url.pathname === "/api/boards/PLAY") return json(route, board);
    if (url.pathname === "/api/moderate/campaigns/LIVE") return json(route, moderatorCampaign);
    if (url.pathname === "/api/campaigns/DONE/results") return json(route, leaderboard);
    return json(route, { error: "Not found" }, 404);
  });
});

const cases = [
  { name: "browse", path: "/browse?group=open", heading: "Browse campaigns" },
  { name: "moderation", path: "/moderate/LIVE", heading: moderatorCampaign.title },
  { name: "board", path: "/boards/PLAY", heading: completedCampaign.title },
  { name: "leaderboard", path: "/leaderboards/DONE", heading: completedCampaign.title },
  { name: "public board builder", path: "/OPEN", heading: openCampaign.title },
  { name: "registration", path: "/register", heading: "Register" },
  { name: "profile", path: "/profile", heading: "Your Profile" },
  { name: "campaign creation", path: "/create", heading: "Create Campaign" },
  { name: "campaign code entry", path: "/play", heading: "Enter a campaign code" },
];

for (const screen of cases) {
  test(`${screen.name} has no WCAG 2.2 AA Axe violations`, async ({ page }) => {
    await page.goto(screen.path);
    await expect(page.getByRole("heading", { level: 1, name: screen.heading })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test("public board tiles can be moved with the keyboard", async ({ page }) => {
  await page.goto("/OPEN");
  await expect(page.getByRole("heading", { level: 1, name: openCampaign.title })).toBeVisible();
  await page.getByRole("button", { name: "Prediction 1", exact: true }).click();

  const cells = page.getByRole("gridcell");
  await expect(cells.nth(0)).toHaveAccessibleName(/Prediction 1/);
  await cells.nth(0).focus();
  await cells.nth(0).press("ArrowRight");

  await expect(cells.nth(0)).toHaveAccessibleName("Empty board position");
  await expect(cells.nth(1)).toHaveAccessibleName(/Prediction 1/);
  await expect(cells.nth(1)).toBeFocused();
});

test("reduced motion persists and suppresses home particles", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("bongii-reduce-motion", "true"));
  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "true");
  await expect(page.locator("canvas")).toHaveCount(0);
  const switchControl = page.getByRole("switch", { name: "Reduce motion" });
  await expect(switchControl).toBeChecked();

  await switchControl.click();
  await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "false");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("bongii-reduce-motion"))).toBe("false");
  await page.reload();
  await expect(page.getByRole("switch", { name: "Reduce motion" })).not.toBeChecked();
});

test("critical work screens reflow from 320px through wide desktop", async ({ page }) => {
  const screens = [
    { path: "/browse?group=open", heading: "Browse campaigns" },
    { path: "/OPEN", heading: openCampaign.title },
    { path: "/boards/PLAY", heading: completedCampaign.title },
    { path: "/leaderboards/DONE", heading: completedCampaign.title },
    { path: "/moderate/LIVE", heading: moderatorCampaign.title },
  ];
  const viewports = [
    { width: 320, height: 800 },
    { width: 640, height: 900 },
    { width: 1920, height: 1080 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const screen of screens) {
      await page.goto(screen.path);
      await expect(page.getByRole("heading", { level: 1, name: screen.heading })).toBeVisible();
      const overflow = await page.evaluate(() => ({
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      }));
      expect(overflow.documentWidth, `${screen.path} overflows at ${viewport.width}px`)
        .toBeLessThanOrEqual(overflow.viewportWidth + 1);

      const cells = await page.getByRole("gridcell").evaluateAll((elements) => elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      }));
      for (let index = 0; index < cells.length; index += 1) {
        for (let comparison = index + 1; comparison < cells.length; comparison += 1) {
          const first = cells[index];
          const second = cells[comparison];
          const overlapWidth = Math.min(first.right, second.right) - Math.max(first.left, second.left);
          const overlapHeight = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
          expect(
            overlapWidth > 1 && overlapHeight > 1,
            `${screen.path} board cells ${index} and ${comparison} overlap at ${viewport.width}px`,
          ).toBe(false);
        }
      }
    }
  }
});