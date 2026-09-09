const up = async (connection) => {
  await connection.exec(`
    CREATE TABLE campaignResults (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaignId INTEGER NOT NULL UNIQUE,
      finalizedAt TEXT NOT NULL,
      finalizedBy INTEGER NOT NULL,
      rulesVersion INTEGER NOT NULL CHECK (rulesVersion >= 1),
      FOREIGN KEY (campaignId) REFERENCES campaigns(id),
      FOREIGN KEY (finalizedBy) REFERENCES users(id)
    );

    CREATE TABLE boardResults (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaignResultId INTEGER NOT NULL,
      boardId INTEGER NOT NULL UNIQUE,
      rank INTEGER NOT NULL CHECK (rank >= 1),
      longestRun INTEGER NOT NULL CHECK (longestRun >= 0),
      completedLineCount INTEGER NOT NULL CHECK (completedLineCount >= 0),
      matchedTileCount INTEGER NOT NULL CHECK (matchedTileCount >= 0),
      FOREIGN KEY (campaignResultId) REFERENCES campaignResults(id),
      FOREIGN KEY (boardId) REFERENCES playerBoards(id)
    );

    CREATE INDEX idx_board_results_campaign_rank
      ON boardResults(campaignResultId, rank, id);
  `);
};

module.exports = { up };