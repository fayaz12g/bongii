const hasFreeCenter = (boardSize) => boardSize % 2 === 1;

const freeCenterPosition = (boardSize) => (
  hasFreeCenter(boardSize) ? Math.floor((boardSize * boardSize) / 2) : null
);

const playableTileCount = (boardSize) => (
  (boardSize * boardSize) - (hasFreeCenter(boardSize) ? 1 : 0)
);

module.exports = { freeCenterPosition, hasFreeCenter, playableTileCount };