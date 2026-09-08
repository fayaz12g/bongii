const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { test } = require('node:test');
const { configureConnection, openConnection } = require('../db/connection');
const { BongiiDatabase } = require('../db');

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
      INSERT INTO users (username, password, firstName, lastName)
      VALUES ('legacy', 'plaintext', 'Legacy', 'Owner');
      INSERT INTO campaigns
        (code, title, backgroundPreset, boardSize, startDateTime, status, createdBy, createdAt)
      VALUES
        ('OLDY', 'Legacy Campaign', 1, 3, '2026-09-08', 'waiting', 1, '2026-09-01'),
        ('LIVE', 'Active Campaign', 1, 3, '2026-09-08', 'active', 1, '2026-09-02');
      INSERT INTO campaignCategories (campaignId, name, type, required, orderIndex)
      VALUES (1, 'Legacy Category', 'choose_many', 1, 0);
      INSERT INTO playerBoards (campaignId, playerName, boardCode, createdAt)
      VALUES (1, 'Legacy Player', 'KEEP', '2026-09-03');
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

    await assert.rejects(
      database.connection.run("UPDATE campaigns SET status = 'invalid' WHERE code = 'OLDY'"),
      /CHECK constraint failed/,
    );
    await database.close();

    database = await BongiiDatabase.open(databasePath);
    const migrations = await database.connection.all('SELECT id FROM schema_migrations');
    assert.deepEqual(
      migrations.map((migration) => migration.id),
      ['001_initial.js', '002_campaign_lifecycle.js'],
    );
    await database.close();
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});