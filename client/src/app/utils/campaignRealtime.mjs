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

export const getCompletedLinePositions = ({ boardSize, tiles = [] }) => {
  if (!Number.isInteger(boardSize) || boardSize < 1) return new Set();
  const tileByPosition = new Map(tiles.map((tile) => [tile.position, tile]));
  const rows = Array.from({ length: boardSize }, (_, row) => (
    Array.from({ length: boardSize }, (__, column) => row * boardSize + column)
  ));
  const columns = Array.from({ length: boardSize }, (_, column) => (
    Array.from({ length: boardSize }, (__, row) => row * boardSize + column)
  ));
  const diagonals = [
    Array.from({ length: boardSize }, (_, index) => index * boardSize + index),
    Array.from({ length: boardSize }, (_, index) => (
      index * boardSize + (boardSize - index - 1)
    )),
  ];
  const completed = [...rows, ...columns, ...diagonals].filter((line) => (
    line.every((position) => {
      const tile = tileByPosition.get(position);
      return tile && (tile.isCenter || tile.outcome?.status === "happened");
    })
  ));
  return new Set(completed.flat());
};