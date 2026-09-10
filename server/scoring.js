const { freeCenterPosition, hasFreeCenter } = require('./boardRules');

const RULES_VERSION = 2;
const SUPPORTED_BOARD_SIZES = new Set([3, 4, 5]);

const compareText = (left, right) => {
  const leftText = String(left || '');
  const rightText = String(right || '');
  if (leftText < rightText) return -1;
  if (leftText > rightText) return 1;
  return 0;
};

const getOutcome = (outcomeByItemId, itemId) => {
  if (outcomeByItemId instanceof Map) {
    return outcomeByItemId.has(itemId)
      ? { found: true, value: outcomeByItemId.get(itemId) }
      : { found: false };
  }

  if (outcomeByItemId && Object.hasOwn(outcomeByItemId, itemId)) {
    return { found: true, value: outcomeByItemId[itemId] };
  }
  return { found: false };
};

const scoringLines = (boardSize) => {
  const lines = [];
  for (let row = 0; row < boardSize; row += 1) {
    lines.push(Array.from({ length: boardSize }, (_, column) => row * boardSize + column));
  }
  for (let column = 0; column < boardSize; column += 1) {
    lines.push(Array.from({ length: boardSize }, (_, row) => row * boardSize + column));
  }
  lines.push(Array.from({ length: boardSize }, (_, index) => index * boardSize + index));
  lines.push(Array.from({ length: boardSize }, (_, index) => (
    index * boardSize + (boardSize - index - 1)
  )));
  return lines;
};

const longestRunInLine = (line, matchesByPosition) => {
  let longestRun = 0;
  let currentRun = 0;
  for (const position of line) {
    currentRun = matchesByPosition[position] ? currentRun + 1 : 0;
    longestRun = Math.max(longestRun, currentRun);
  }
  return longestRun;
};

const scoreBoard = ({ boardSize, tiles = [], outcomeByItemId = {} }) => {
  if (!SUPPORTED_BOARD_SIZES.has(boardSize)) {
    throw new RangeError('Board size must be 3, 4, or 5');
  }

  const tileByPosition = new Map(tiles.map((tile) => [tile.position, tile]));
  const matchesByPosition = Array(boardSize * boardSize).fill(false);
  const integrityWarnings = [];

  for (let position = 0; position < matchesByPosition.length; position += 1) {
    const tile = tileByPosition.get(position);
    if (!tile) continue;
    if (tile.isCenter && hasFreeCenter(boardSize) && position === freeCenterPosition(boardSize)) {
      matchesByPosition[position] = true;
      continue;
    }
    if (tile.isCenter) {
      integrityWarnings.push({ code: 'unexpected_center', position });
      continue;
    }
    if (tile.categoryItemId === null || tile.categoryItemId === undefined) continue;

    const outcome = getOutcome(outcomeByItemId, tile.categoryItemId);
    if (!outcome.found) {
      integrityWarnings.push({
        code: 'missing_outcome',
        itemId: tile.categoryItemId,
        position,
      });
      continue;
    }

    const status = typeof outcome.value === 'object' && outcome.value !== null
      ? outcome.value.status
      : outcome.value;
    if (!['pending', 'happened', 'did_not_happen'].includes(status)) {
      integrityWarnings.push({
        code: 'unknown_outcome',
        itemId: tile.categoryItemId,
        position,
        status,
      });
      continue;
    }
    matchesByPosition[position] = status === 'happened';
  }

  const lines = scoringLines(boardSize);
  return {
    longestRun: Math.max(0, ...lines.map((line) => longestRunInLine(line, matchesByPosition))),
    completedLineCount: lines.filter((line) => (
      line.every((position) => matchesByPosition[position])
    )).length,
    matchedTileCount: matchesByPosition.filter(Boolean).length,
    integrityWarnings,
  };
};

const compareScores = (left, right) => (
  right.longestRun - left.longestRun
  || right.completedLineCount - left.completedLineCount
  || right.matchedTileCount - left.matchedTileCount
);

const rankBoards = (scores) => {
  const sorted = scores.map((score) => ({ ...score })).sort((left, right) => (
    compareScores(left, right)
    || compareText(left.playerName, right.playerName)
    || compareText(left.boardCode, right.boardCode)
  ));

  let previous = null;
  return sorted.map((score, index) => {
    const rank = previous && compareScores(previous, score) === 0
      ? previous.rank
      : index + 1;
    const ranked = { ...score, rank };
    previous = ranked;
    return ranked;
  });
};

module.exports = {
  RULES_VERSION,
  rankBoards,
  scoreBoard,
};