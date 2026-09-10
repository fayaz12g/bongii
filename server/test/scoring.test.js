const assert = require('node:assert/strict');
const { test } = require('node:test');
const fixtures = require('./fixtures/scoring.json');
const { freeCenterPosition, hasFreeCenter } = require('../boardRules');
const { RULES_VERSION, rankBoards, scoreBoard } = require('../scoring');

const inputFor = (fixture) => {
  if (fixture.empty) {
    return { boardSize: fixture.boardSize, tiles: [], outcomeByItemId: {} };
  }

  const centerPosition = freeCenterPosition(fixture.boardSize);
  const happened = new Set(fixture.happenedPositions || []);
  const pending = new Set(fixture.pendingPositions || []);
  const empty = new Set(fixture.emptyPositions || []);
  const missing = new Set(fixture.missingOutcomePositions || []);
  const tiles = [];
  const outcomeByItemId = {};

  for (let position = 0; position < fixture.boardSize ** 2; position += 1) {
    if (empty.has(position)) continue;
    const isCenter = hasFreeCenter(fixture.boardSize) && position === centerPosition;
    const categoryItemId = isCenter ? null : position + 1;
    tiles.push({ position, isCenter, categoryItemId });
    if (isCenter || missing.has(position)) continue;
    outcomeByItemId[categoryItemId] = fixture.allHappened || happened.has(position)
      ? 'happened'
      : pending.has(position) ? 'pending' : 'did_not_happen';
  }

  return { boardSize: fixture.boardSize, tiles, outcomeByItemId };
};

test('scoring rules have a persisted version', () => {
  assert.equal(RULES_VERSION, 2);
});

test('does not grant a free tile on a 4 by 4 board', () => {
  const tiles = Array.from({ length: 16 }, (_, position) => ({
    position,
    isCenter: false,
    categoryItemId: position + 1,
  }));
  const outcomeByItemId = Object.fromEntries(
    tiles.map((tile) => [tile.categoryItemId, tile.position === 10 ? 'did_not_happen' : 'happened']),
  );

  assert.deepEqual(scoreBoard({ boardSize: 4, tiles, outcomeByItemId }), {
    longestRun: 4,
    completedLineCount: 7,
    matchedTileCount: 15,
    integrityWarnings: [],
  });
});

for (const fixture of fixtures.scoreCases) {
  test(`scores ${fixture.name}`, () => {
    const result = scoreBoard(inputFor(fixture));
    assert.deepEqual({
      longestRun: result.longestRun,
      completedLineCount: result.completedLineCount,
      matchedTileCount: result.matchedTileCount,
    }, fixture.expected);
    assert.deepEqual(
      result.integrityWarnings.map((warning) => warning.code),
      fixture.expectedWarningCodes || [],
    );
  });
}

for (const fixture of fixtures.rankCases) {
  test(`ranks ${fixture.name}`, () => {
    const original = structuredClone(fixture.scores);
    const ranked = rankBoards(fixture.scores);
    assert.deepEqual(
      ranked.map(({ boardCode, rank }) => ({ boardCode, rank })),
      fixture.expected,
    );
    assert.deepEqual(fixture.scores, original);
  });
}

test('rejects unsupported board sizes', () => {
  assert.throws(
    () => scoreBoard({ boardSize: 2, tiles: [], outcomeByItemId: {} }),
    /Board size must be 3, 4, or 5/,
  );
});