const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { test } = require('node:test');
const { configureConnection, openConnection } = require('../db/connection');
const { BongiiDatabase } = require('../db');

test('keeps the production-applied outcome migration immutable', () => {
  const migrationPath = path.join(__dirname, '../db/migrations/003_item_outcomes.js');
  const migrationChecksum = crypto
    .createHash('sha256')
    .update(fs.readFileSync(migrationPath))
    .digest('hex');

  assert.equal(
    migrationChecksum,
    '0a1ac4690bc835ddc3265b3be04ce692d946ecdd1a8b924c59caf34a43d4d94c',
  );
});

test('migrates a legacy schema once without losing campaign data', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bongii-migration-'));
  const databasePath = path.join(directory, 'legacy.db');

  try {
    const legacy = await configureConnection(await openConnection(databasePath));
    await legacy.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        password TEXT,
        firstName TEXT,
        lastName TEXT,
        email TEXT,
        profileIcon TEXT
      );
      CREATE TABLE campaigns (
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
        FOREIGN KEY (createdBy) REFERENCES users(id)
      );
      CREATE TABLE campaignCategories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaignId INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        required BOOLEAN DEFAULT 0,
        orderIndex INTEGER DEFAULT 0,
        FOREIGN KEY (campaignId) REFERENCES campaigns(id)
      );
      CREATE TABLE campaignCategoryItems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        categoryId INTEGER NOT NULL,
        text TEXT NOT NULL,
        orderIndex INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        calledAt TEXT,
        FOREIGN KEY (categoryId) REFERENCES campaignCategories(id)
      );
      CREATE TABLE playerBoards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaignId INTEGER NOT NULL,
        userId INTEGER,
        playerName TEXT,
        boardCode TEXT UNIQUE NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (campaignId) REFERENCES campaigns(id),
        FOREIGN KEY (userId) REFERENCES users(id)
      );
      CREATE TABLE playerBoardTiles (
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
      INSERT INTO users (username, password, firstName, lastName)
      VALUES ('legacy', 'plaintext', 'Legacy', 'Owner');
      INSERT INTO campaigns
        (code, title, backgroundPreset, boardSize, startDateTime, status, createdBy, createdAt)
      VALUES
        ('OLDY', 'Legacy Campaign', 1, 3, '2026-09-08', 'waiting', 1, '2026-09-01'),
        ('LIVE', 'Active Campaign', 1, 3, '2026-09-08', 'active', 1, '2026-09-02');
      INSERT INTO campaignCategories (campaignId, name, type, required, orderIndex)
      VALUES (1, 'Legacy Category', 'choose_many', 1, 0);
      INSERT INTO campaignCategoryItems (categoryId, text, orderIndex, status, calledAt)
      VALUES
        (1, 'Legacy success', 0, 'correct', '2026-09-04'),
        (1, 'Legacy failure', 1, 'incorrect', '2026-09-05'),
        (1, 'Unknown legacy value', 2, 'unknown', '2026-09-06');
      INSERT INTO playerBoards (campaignId, playerName, boardCode, createdAt)
      VALUES (1, 'Legacy Player', 'KEEP', '2026-09-03');
      INSERT INTO playerBoardTiles (boardId, categoryItemId, position, isCenter)
      VALUES (1, 1, 0, 0);
    `);
    await legacy.close();

    let database = await BongiiDatabase.open(databasePath);
    const campaign = await database.getCampaignByCode('OLDY');
    assert.equal(campaign.title, 'Legacy Campaign');
    assert.equal(campaign.description, null);
    assert.equal(campaign.status, 'open');
    assert.equal(campaign.publishedAt, '2026-09-01');
    assert.equal(campaign.version, 1);

    const activeCampaign = await database.getCampaignByCode('LIVE');
    assert.equal(activeCampaign.status, 'moderating');

    const board = await database.getPlayerBoardByCode('KEEP');
    assert.equal(board.playerName, 'Legacy Player');
    assert.equal(board.tiles.length, 1);
    assert.equal(board.tiles[0].categoryItemId, 1);
    assert.deepEqual(board.tiles[0].outcome, {
      status: 'happened',
      decidedAt: '2026-09-04',
    });

    const outcomes = await database.connection.all(`
      SELECT status, decidedAt, decidedBy
      FROM campaignCategoryItems
      ORDER BY id
    `);
    assert.deepEqual(outcomes, [
      { status: 'happened', decidedAt: '2026-09-04', decidedBy: null },
      { status: 'did_not_happen', decidedAt: '2026-09-05', decidedBy: null },
      { status: 'pending', decidedAt: null, decidedBy: null },
    ]);

    const foreignKeyErrors = await database.connection.all('PRAGMA foreign_key_check');
    assert.deepEqual(foreignKeyErrors, []);
    const foreignKeys = await database.connection.get('PRAGMA foreign_keys');
    assert.equal(foreignKeys.foreign_keys, 1);

    const campaignColumns = await database.connection.all('PRAGMA table_info(campaigns)');
    assert.equal(campaignColumns.some((column) => column.name === 'isActive'), false);
    for (const column of [
      'publishedAt',
      'boardCreationClosedAt',
      'moderationStartedAt',
      'finalizedAt',
      'cancelledAt',
      'version',
    ]) {
      assert.equal(campaignColumns.some((candidate) => candidate.name === column), true);
    }

    const outcomeColumns = await database.connection.all(
      'PRAGMA table_info(campaignCategoryItems)',
    );
    for (const column of ['decidedAt', 'decidedBy']) {
      assert.equal(outcomeColumns.some((candidate) => candidate.name === column), true);
    }

    const campaignResultColumns = await database.connection.all(
      'PRAGMA table_info(campaignResults)',
    );
    assert.deepEqual(
      campaignResultColumns.map((column) => column.name),
      ['id', 'campaignId', 'finalizedAt', 'finalizedBy', 'rulesVersion'],
    );
    const boardResultColumns = await database.connection.all(
      'PRAGMA table_info(boardResults)',
    );
    assert.deepEqual(
      boardResultColumns.map((column) => column.name),
      [
        'id',
        'campaignResultId',
        'boardId',
        'rank',
        'longestRun',
        'completedLineCount',
        'matchedTileCount',
      ],
    );

    const migratedUser = await database.connection.get(`
      SELECT firebaseUid, displayName, photoUrl, legacyUsername
      FROM users
      WHERE id = 1
    `);
    assert.deepEqual(migratedUser, {
      firebaseUid: null,
      displayName: 'Legacy Owner',
      photoUrl: null,
      legacyUsername: 'legacy',
    });
    assert.equal(campaign.createdBy, 1);

    await assert.rejects(
      database.connection.run("UPDATE campaigns SET status = 'invalid' WHERE code = 'OLDY'"),
      /CHECK constraint failed/,
    );
    await assert.rejects(
      database.connection.run(
        "UPDATE campaignCategoryItems SET status = 'invalid' WHERE id = 1",
      ),
      /CHECK constraint failed/,
    );
    await database.close();

    database = await BongiiDatabase.open(databasePath);
    const migrations = await database.connection.all('SELECT id FROM schema_migrations');
    assert.deepEqual(
      migrations.map((migration) => migration.id),
      [
        '001_initial.js',
        '002_campaign_lifecycle.js',
        '003_item_outcomes.js',
        '004_result_snapshots.js',
        '005_firebase_identity.js',
        '006_clear_pending_outcome_dates.js',
      ],
    );
    await database.close();
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('preserves pre-existing orphan rows while applying the lifecycle migration', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bongii-orphan-migration-'));
  const databasePath = path.join(directory, 'legacy-orphans.db');

  try {
    const legacy = await configureConnection(await openConnection(databasePath));
    await legacy.exec(`
      PRAGMA foreign_keys = OFF;
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        password TEXT,
        firstName TEXT,
        lastName TEXT,
        email TEXT,
        profileIcon TEXT
      );
      CREATE TABLE campaigns (
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
        FOREIGN KEY (createdBy) REFERENCES users(id)
      );
      CREATE TABLE campaignCategories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaignId INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        required BOOLEAN DEFAULT 0,
        orderIndex INTEGER DEFAULT 0,
        FOREIGN KEY (campaignId) REFERENCES campaigns(id)
      );
      CREATE TABLE playerBoards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaignId INTEGER NOT NULL,
        userId INTEGER,
        playerName TEXT,
        boardCode TEXT UNIQUE NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (campaignId) REFERENCES campaigns(id),
        FOREIGN KEY (userId) REFERENCES users(id)
      );
      INSERT INTO campaignCategories (campaignId, name, type, required, orderIndex)
      VALUES (99, 'Deleted Campaign Category', 'choose_many', 0, 0);
      INSERT INTO playerBoards (campaignId, playerName, boardCode, createdAt)
      VALUES (99, 'Orphaned Player', 'ORPH', '2026-09-01');
    `);
    await legacy.close();

    const database = await BongiiDatabase.open(databasePath);
    const migrations = await database.connection.all('SELECT id FROM schema_migrations ORDER BY id');
    assert.deepEqual(
      migrations.map((migration) => migration.id),
      [
        '001_initial.js',
        '002_campaign_lifecycle.js',
        '003_item_outcomes.js',
        '004_result_snapshots.js',
        '005_firebase_identity.js',
        '006_clear_pending_outcome_dates.js',
      ],
    );

    const category = await database.connection.get(
      'SELECT campaignId, name FROM campaignCategories WHERE id = 1',
    );
    assert.deepEqual(category, { campaignId: 99, name: 'Deleted Campaign Category' });

    const board = await database.connection.get(
      'SELECT campaignId, playerName FROM playerBoards WHERE boardCode = ?',
      ['ORPH'],
    );
    assert.deepEqual(board, { campaignId: 99, playerName: 'Orphaned Player' });

    const violations = await database.connection.all('PRAGMA foreign_key_check');
    assert.deepEqual(
      violations.map(({ table, rowid, parent }) => ({ table, rowid, parent })),
      [
        { table: 'playerBoards', rowid: 1, parent: 'campaigns' },
        { table: 'campaignCategories', rowid: 1, parent: 'campaigns' },
      ],
    );
    await database.close();
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});