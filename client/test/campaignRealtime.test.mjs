import assert from "node:assert/strict";
import test from "node:test";
import {
  applyBoardOutcome,
  classifyCampaignVersion,
  getCompletedLines,
  getCompletedLinePositions,
  shouldRefreshAfterJoin,
} from "../src/app/utils/campaignRealtime.mjs";

const snapshot = () => ({
  campaignVersion: 7,
  tiles: [
    { categoryItemId: 11, outcome: { status: "pending", decidedAt: null } },
    { categoryItemId: 12, outcome: { status: "pending", decidedAt: null } },
  ],
});

test("classifies next, stale, invalid, and gapped campaign versions", () => {
  assert.equal(classifyCampaignVersion(7, 8), "apply");
  assert.equal(classifyCampaignVersion(7, 7), "stale");
  assert.equal(classifyCampaignVersion(7, 6), "stale");
  assert.equal(classifyCampaignVersion(7, 9), "gap");
  assert.equal(classifyCampaignVersion(undefined, 8), "invalid");
});

test("updates only a board tile containing the changed campaign item", () => {
  const current = snapshot();
  const result = applyBoardOutcome(current, {
    campaignVersion: 8,
    itemId: 11,
    status: "happened",
    decidedAt: "2026-09-09T12:00:00.000Z",
  });

  assert.equal(result.itemChanged, true);
  assert.equal(result.snapshot.campaignVersion, 8);
  assert.deepEqual(result.snapshot.tiles[0].outcome, {
    status: "happened",
    decidedAt: "2026-09-09T12:00:00.000Z",
  });
  assert.strictEqual(result.snapshot.tiles[1], current.tiles[1]);
});

test("advances a nonmatching board without altering any tile", () => {
  const current = snapshot();
  const result = applyBoardOutcome(current, {
    campaignVersion: 8,
    itemId: 99,
    status: "did_not_happen",
    decidedAt: "2026-09-09T12:00:00.000Z",
  });

  assert.equal(result.itemChanged, false);
  assert.equal(result.snapshot.campaignVersion, 8);
  assert.strictEqual(result.snapshot.tiles, current.tiles);
});

test("does not let a stale event overwrite a newer board snapshot", () => {
  const current = snapshot();
  const result = applyBoardOutcome(current, {
    campaignVersion: 6,
    itemId: 11,
    status: "did_not_happen",
    decidedAt: "2026-09-09T11:00:00.000Z",
  });

  assert.equal(result.itemChanged, false);
  assert.strictEqual(result.snapshot, current);
});

test("refreshes after every reconnect and after an initial version mismatch", () => {
  assert.equal(shouldRefreshAfterJoin({
    hasJoined: false,
    currentVersion: 7,
    serverVersion: 7,
  }), false);
  assert.equal(shouldRefreshAfterJoin({
    hasJoined: false,
    currentVersion: 7,
    serverVersion: 8,
  }), true);
  assert.equal(shouldRefreshAfterJoin({
    hasJoined: true,
    currentVersion: 8,
    serverVersion: 8,
  }), true);
});

test("finds completed rows, columns, and diagonals without counting failed tiles", () => {
  const happened = new Set([0, 1, 2, 3, 6, 8]);
  const tiles = Array.from({ length: 9 }, (_, position) => ({
    position,
    isCenter: position === 4,
    outcome: { status: happened.has(position) ? "happened" : "did_not_happen" },
  }));

  assert.deepEqual(
    [...getCompletedLinePositions({ boardSize: 3, tiles })].sort((left, right) => left - right),
    [0, 1, 2, 3, 4, 6, 8],
  );
  assert.deepEqual(
    getCompletedLines({ boardSize: 3, tiles }).map(({ start, end }) => ({ start, end })),
    [
      { start: { x: 0.5, y: 0.5 }, end: { x: 2.5, y: 0.5 } },
      { start: { x: 0.5, y: 0.5 }, end: { x: 0.5, y: 2.5 } },
      { start: { x: 0.5, y: 0.5 }, end: { x: 2.5, y: 2.5 } },
      { start: { x: 2.5, y: 0.5 }, end: { x: 0.5, y: 2.5 } },
    ],
  );
});

test("returns no completed positions when a line contains an empty tile", () => {
  assert.deepEqual(
    [...getCompletedLinePositions({
      boardSize: 3,
      tiles: [
        { position: 0, outcome: { status: "happened" } },
        { position: 1, outcome: { status: "happened" } },
      ],
    })],
    [],
  );
});