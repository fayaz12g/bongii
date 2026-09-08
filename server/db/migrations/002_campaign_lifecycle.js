const up = async (connection) => {
  await connection.exec(`
    CREATE TABLE campaigns_lifecycle (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      backgroundPreset INTEGER DEFAULT 1,
      boardSize INTEGER DEFAULT 3,
      startDateTime TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'open', 'locked', 'moderating', 'completed', 'cancelled')
      ),
      createdBy INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      description TEXT,
      publishedAt TEXT,
      boardCreationClosedAt TEXT,
      moderationStartedAt TEXT,
      finalizedAt TEXT,
      cancelledAt TEXT,
      version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
      FOREIGN KEY (createdBy) REFERENCES users(id)
    );

    INSERT INTO campaigns_lifecycle (
      id, code, title, backgroundPreset, boardSize, startDateTime, status,
      createdBy, createdAt, description, publishedAt, version
    )
    SELECT
      id,
      code,
      title,
      backgroundPreset,
      boardSize,
      startDateTime,
      CASE
        WHEN status = 'waiting' THEN 'open'
        WHEN status = 'active' THEN 'moderating'
        WHEN status IN ('draft', 'open', 'locked', 'moderating', 'completed', 'cancelled') THEN status
        ELSE 'draft'
      END,
      createdBy,
      createdAt,
      description,
      CASE
        WHEN status IN ('waiting', 'active', 'open', 'locked', 'moderating', 'completed') THEN createdAt
        ELSE NULL
      END,
      1
    FROM campaigns;

    DROP TABLE campaigns;
    ALTER TABLE campaigns_lifecycle RENAME TO campaigns;

    CREATE INDEX idx_campaigns_code ON campaigns(code);
    CREATE INDEX idx_campaigns_created_by ON campaigns(createdBy);
    CREATE INDEX idx_campaigns_status ON campaigns(status);
  `);
};

module.exports = { disableForeignKeys: true, up };