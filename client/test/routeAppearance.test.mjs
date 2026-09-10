import assert from "node:assert/strict";
import test from "node:test";
import { isCampaignScopedPath } from "../src/app/utils/routeAppearance.mjs";

test("scopes campaign appearance to campaign-owned routes", () => {
  assert.equal(isCampaignScopedPath("/ABCD"), true);
  assert.equal(isCampaignScopedPath("/boards/PLAY"), true);
  assert.equal(isCampaignScopedPath("/moderate/TRTS"), true);
  assert.equal(isCampaignScopedPath("/leaderboards/DONE"), true);
});

test("resets generic and malformed routes to application appearance", () => {
  assert.equal(isCampaignScopedPath("/browse"), false);
  assert.equal(isCampaignScopedPath("/boards"), false);
  assert.equal(isCampaignScopedPath("/leaderboards"), false);
  assert.equal(isCampaignScopedPath("/profile"), false);
  assert.equal(isCampaignScopedPath("/abcd"), false);
});