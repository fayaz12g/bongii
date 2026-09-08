const hasColumn = async (connection, table, column) => {
  const columns = await connection.all(`PRAGMA table_info(${table})`);
  return columns.some((candidate) => candidate.name === column);
};

const up = async (connection) => {
  await connection.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      password TEXT,
      firstName TEXT,
      lastName TEXT,
      email TEXT,
      profileIcon TEXT
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      backgroundPreset INTEGER DEFAULT 1,
      boardSize INTEGER DEFAULT 3,
      startDateTime TEXT NOT NULL,
      status TEXT DEFAULT 'waiting',
      createdBy INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      isActive BOOLEAN DEFAULT 1,
      description TEXT,
      FOREIGN KEY (createdBy) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS campaignCategories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaignId INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      required BOOLEAN DEFAULT 0,
      orderIndex INTEGER DEFAULT 0,
      FOREIGN KEY (campaignId) REFERENCES campaigns(id)
    );

    CREATE TABLE IF NOT EXISTS campaignCategoryItems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoryId INTEGER NOT NULL,
      text TEXT NOT NULL,
      orderIndex INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      calledAt TEXT,
      FOREIGN KEY (categoryId) REFERENCES campaignCategories(id)
    );

    CREATE TABLE IF NOT EXISTS playerBoards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaignId INTEGER NOT NULL,
      userId INTEGER,
      playerName TEXT,
      boardCode TEXT UNIQUE NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (campaignId) REFERENCES campaigns(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS playerBoardTiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      boardId INTEGER NOT NULL,
      categoryItemId INTEGER,
      position INTEGER NOT NULL,
      isCenter BOOLEAN DEFAULT 0,
      customText TEXT,
      FOREIGN KEY (boardId) REFERENCES playerBoards(id),
      FOREIGN KEY (categoryItemId) REFERENCES campaignCategoryItems(id),
      UNIQUE(boardId, position)
    );

    CREATE TABLE IF NOT EXISTS campaignSessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaignId INTEGER NOT NULL,
      startedAt TEXT,
      completedAt TEXT,
      winnerBoardId INTEGER,
      status TEXT DEFAULT 'scheduled',
      FOREIGN KEY (campaignId) REFERENCES campaigns(id),
      FOREIGN KEY (winnerBoardId) REFERENCES playerBoards(id)
    );

    CREATE TABLE IF NOT EXISTS backgroundPresets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      gradient TEXT NOT NULL,
      animation TEXT NOT NULL
    );
  `);

  if (!(await hasColumn(connection, 'campaigns', 'description'))) {
    await connection.run('ALTER TABLE campaigns ADD COLUMN description TEXT');
  }

  await connection.exec(`
    CREATE INDEX IF NOT EXISTS idx_campaigns_code ON campaigns(code);
    CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON campaigns(createdBy);
    CREATE INDEX IF NOT EXISTS idx_campaign_categories_campaign ON campaignCategories(campaignId);
    CREATE INDEX IF NOT EXISTS idx_campaign_category_items_category ON campaignCategoryItems(categoryId);
    CREATE INDEX IF NOT EXISTS idx_player_boards_campaign ON playerBoards(campaignId);
    CREATE INDEX IF NOT EXISTS idx_player_boards_user ON playerBoards(userId);
    CREATE INDEX IF NOT EXISTS idx_player_boards_code ON playerBoards(boardCode);
    CREATE INDEX IF NOT EXISTS idx_player_board_tiles_board ON playerBoardTiles(boardId);
  `);

  const presets = [
    [1, 'Ocean Waves', 'from-blue-400 via-blue-600 to-purple-700', 'wave'],
    [2, 'Sunset Glow', 'from-orange-400 via-pink-500 to-purple-600', 'glow'],
    [3, 'Forest Mystery', 'from-green-400 via-teal-500 to-blue-600', 'float'],
    [4, 'Cherry Blossom', 'from-pink-300 via-purple-400 to-indigo-500', 'drift'],
    [5, 'Golden Hour', 'from-yellow-400 via-orange-500 to-red-600', 'pulse'],
    [6, 'Arctic Aurora', 'from-cyan-300 via-blue-400 to-indigo-600', 'shimmer'],
  ];

  for (const preset of presets) {
    await connection.run(
      `INSERT OR IGNORE INTO backgroundPresets (id, name, gradient, animation)
       VALUES (?, ?, ?, ?)`,
      preset,
    );
  }
};

module.exports = { up };