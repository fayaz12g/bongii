export const classifyCampaignVersion = (currentVersion, incomingVersion) => {
  if (!Number.isInteger(currentVersion) || !Number.isInteger(incomingVersion)) return "invalid";
  if (incomingVersion <= currentVersion) return "stale";
  if (incomingVersion === currentVersion + 1) return "apply";
  return "gap";
};

export const shouldRefreshAfterJoin = ({ hasJoined, currentVersion, serverVersion }) => (
  hasJoined || serverVersion !== currentVersion
);

export const applyBoardOutcome = (snapshot, event) => {
  if (!snapshot || classifyCampaignVersion(
    snapshot.campaignVersion,
    event.campaignVersion,
  ) !== "apply") {
    return { itemChanged: false, snapshot };
  }

  const itemChanged = snapshot.tiles.some((tile) => tile.categoryItemId === event.itemId);
  return {
    itemChanged,
    snapshot: {
      ...snapshot,
      campaignVersion: event.campaignVersion,
      tiles: itemChanged
        ? snapshot.tiles.map((tile) => (
            tile.categoryItemId === event.itemId
              ? {
                  ...tile,
                  outcome: {
                    status: event.status,
                    decidedAt: event.decidedAt,
                  },
                }
              : tile
          ))
        : snapshot.tiles,
    },
  };
};

export const getCompletedLines = ({ boardSize, tiles = [] }) => {
  if (!Number.isInteger(boardSize) || boardSize < 1) return [];
  const tileByPosition = new Map(tiles.map((tile) => [tile.position, tile]));
  const rows = Array.from({ length: boardSize }, (_, row) => ({
    positions: Array.from({ length: boardSize }, (__, column) => row * boardSize + column),
    start: { x: 0.5, y: row + 0.5 },
    end: { x: boardSize - 0.5, y: row + 0.5 },
  }));
  const columns = Array.from({ length: boardSize }, (_, column) => ({
    positions: Array.from({ length: boardSize }, (__, row) => row * boardSize + column),
    start: { x: column + 0.5, y: 0.5 },
    end: { x: column + 0.5, y: boardSize - 0.5 },
  }));
  const diagonals = [
    {
      positions: Array.from({ length: boardSize }, (_, index) => index * boardSize + index),
      start: { x: 0.5, y: 0.5 },
      end: { x: boardSize - 0.5, y: boardSize - 0.5 },
    },
    {
      positions: Array.from({ length: boardSize }, (_, index) => (
        index * boardSize + (boardSize - index - 1)
      )),
      start: { x: boardSize - 0.5, y: 0.5 },
      end: { x: 0.5, y: boardSize - 0.5 },
    },
  ];
  return [...rows, ...columns, ...diagonals].filter((line) => (
    line.positions.every((position) => {
      const tile = tileByPosition.get(position);
      return tile && (tile.isCenter || tile.outcome?.status === "happened");
    })
  ));
};

export const getCompletedLinePositions = (board) => new Set(
  getCompletedLines(board).flatMap((line) => line.positions),
);