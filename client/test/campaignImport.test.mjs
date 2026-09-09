import assert from "node:assert/strict";
import test from "node:test";
import {
  exampleCampaign,
  parseCampaignImport,
} from "../src/app/create/campaignImport.mjs";

test("parses the downloadable campaign example", () => {
  const campaign = parseCampaignImport(JSON.stringify(exampleCampaign));
  assert.equal(campaign.title, exampleCampaign.title);
  assert.equal(campaign.boardSize, 3);
  assert.equal(campaign.categories.length, 2);
  assert.equal(campaign.categories.flatMap(({ items }) => items).length, 8);
});

test("rejects malformed JSON and undersized campaigns", () => {
  assert.throws(
    () => parseCampaignImport("{not-json}"),
    /not valid JSON/,
  );
  assert.throws(
    () => parseCampaignImport(JSON.stringify({
      ...exampleCampaign,
      categories: [{
        name: "Too small",
        type: "choose_many",
        items: ["Only one item"],
      }],
    })),
    /Add at least 8 items/,
  );
});