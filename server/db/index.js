const crypto = require('crypto');
const { configureConnection, openConnection } = require('./connection');
const { migrate } = require('./migrate');

class DomainError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const generateCode = () => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const bytes = crypto.randomBytes(4);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
};

class BongiiDatabase {
  constructor(databasePath, connection) {
    this.databasePath = databasePath;
    this.connection = connection;
  }

  static async open(databasePath) {
    const connection = await configureConnection(await openConnection(databasePath));
    await migrate(connection);
    return new BongiiDatabase(databasePath, connection);
  }

  async close() {
    await this.connection.close();
  }

  async transaction(work) {
    const connection = await configureConnection(await openConnection(this.databasePath));
    await connection.exec('BEGIN IMMEDIATE');
    try {
      const result = await work(connection);
      await connection.exec('COMMIT');
      return result;
    } catch (error) {
      await connection.exec('ROLLBACK');
      throw error;
    } finally {
      await connection.close();
    }
  }

  async addUser(user) {
    const result = await this.connection.run(
      `INSERT INTO users (username, password, firstName, lastName, email, profileIcon)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user.username, user.password, user.firstName, user.lastName, user.email || null, user.profileIcon || '1'],
    );
    return this.getUser(result.lastID);
  }

  getUser(id) {
    return this.connection.get('SELECT * FROM users WHERE id = ?', [id]);
  }

  getUserByUsername(username) {
    return this.connection.get('SELECT * FROM users WHERE username = ?', [username]);
  }

  getAllUsers() {
    return this.connection.all(
      'SELECT id, username, firstName, lastName, email, profileIcon FROM users ORDER BY username',
    );
  }

  async updateUserProfile(id, updates) {
    await this.connection.run(
      `UPDATE users
       SET firstName = ?, lastName = ?, email = ?, profileIcon = ?
       WHERE id = ?`,
      [updates.firstName, updates.lastName, updates.email || null, updates.profileIcon || '1', id],
    );
    return this.getUser(id);
  }

  updateUserPassword(id, password) {
    return this.connection.run('UPDATE users SET password = ? WHERE id = ?', [password, id]);
  }

  getBackgroundPreset(id, connection = this.connection) {
    return connection.get(
      'SELECT id, name, gradient, animation FROM backgroundPresets WHERE id = ?',
      [id],
    );
  }

  async getCampaignCategories(campaignId, connection = this.connection) {
    const categories = await connection.all(
      'SELECT * FROM campaignCategories WHERE campaignId = ? ORDER BY orderIndex',
      [campaignId],
    );

    return Promise.all(categories.map(async (category) => ({
      ...category,
      items: await connection.all(
        'SELECT * FROM campaignCategoryItems WHERE categoryId = ? ORDER BY orderIndex',
        [category.id],
      ),
    })));
  }

  async enrichCampaign(campaign, connection = this.connection) {
    if (!campaign) return null;
    const [backgroundPreset, categories, count] = await Promise.all([
      this.getBackgroundPreset(campaign.backgroundPreset, connection),
      this.getCampaignCategories(campaign.id, connection),
      connection.get('SELECT COUNT(*) AS count FROM playerBoards WHERE campaignId = ?', [campaign.id]),
    ]);
    return { ...campaign, backgroundPreset, categories, playerCount: count.count };
  }

  async getCampaignByCode(code) {
    const campaign = await this.connection.get(
      'SELECT * FROM campaigns WHERE code = ?',
      [code.toUpperCase()],
    );
    return this.enrichCampaign(campaign);
  }

  async getPublicCampaignByCode(code) {
    const campaign = await this.connection.get(
      `SELECT * FROM campaigns
       WHERE code = ? AND status IN ('open', 'locked', 'moderating', 'completed')`,
      [code.toUpperCase()],
    );
    return this.enrichCampaign(campaign);
  }

  async getAllCampaigns() {
    const campaigns = await this.connection.all(
      `SELECT * FROM campaigns
       WHERE status IN ('open', 'locked', 'moderating', 'completed')
       ORDER BY startDateTime, createdAt DESC`,
    );
    return Promise.all(campaigns.map((campaign) => this.enrichCampaign(campaign)));
  }

  async getUserCampaigns(userId) {
    const campaigns = await this.connection.all(
      `SELECT * FROM campaigns
       WHERE createdBy = ?
       ORDER BY createdAt DESC`,
      [userId],
    );
    return Promise.all(campaigns.map((campaign) => this.enrichCampaign(campaign)));
  }

  async createCampaign(campaign) {
    const campaignCode = await this.transaction(async (connection) => {
      let backgroundPresetId;
      if (campaign.backgroundPreset.id === 'custom') {
        const result = await connection.run(
          'INSERT INTO backgroundPresets (name, gradient, animation) VALUES (?, ?, ?)',
          [campaign.backgroundPreset.name, campaign.backgroundPreset.gradient, campaign.backgroundPreset.animation],
        );
        backgroundPresetId = result.lastID;
      } else {
        backgroundPresetId = Number(campaign.backgroundPreset.id);
        await connection.run(
          `INSERT OR IGNORE INTO backgroundPresets (id, name, gradient, animation)
           VALUES (?, ?, ?, ?)`,
          [backgroundPresetId, campaign.backgroundPreset.name, campaign.backgroundPreset.gradient, campaign.backgroundPreset.animation],
        );
      }

      let code;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const candidate = generateCode();
        const exists = await connection.get('SELECT 1 FROM campaigns WHERE code = ?', [candidate]);
        if (!exists) {
          code = candidate;
          break;
        }
      }
      if (!code) throw new Error('Unable to generate a unique campaign code');

      const createdAt = new Date().toISOString();
      const result = await connection.run(
        `INSERT INTO campaigns
          (code, title, description, backgroundPreset, boardSize, startDateTime, createdBy, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          code,
          campaign.title,
          campaign.description || null,
          backgroundPresetId,
          campaign.boardSize,
          campaign.startDateTime,
          campaign.createdBy,
          createdAt,
        ],
      );

      for (const [categoryIndex, category] of campaign.categories.entries()) {
        const categoryResult = await connection.run(
          `INSERT INTO campaignCategories (campaignId, name, type, required, orderIndex)
           VALUES (?, ?, ?, ?, ?)`,
          [result.lastID, category.name, category.type, category.required ? 1 : 0, categoryIndex],
        );
        for (const [itemIndex, item] of category.items.entries()) {
          await connection.run(
            `INSERT INTO campaignCategoryItems (categoryId, text, orderIndex)
             VALUES (?, ?, ?)`,
            [categoryResult.lastID, item, itemIndex],
          );
        }
      }

      return code;
    });

    return this.getCampaignByCode(campaignCode);
  }

  async createPlayerBoard(campaignCode, board) {
    const boardCode = await this.transaction(async (connection) => {
      const campaign = await connection.get(
        'SELECT * FROM campaigns WHERE code = ?',
        [campaignCode.toUpperCase()],
      );
      if (!campaign) throw new DomainError('Campaign not found', 404);
      if (campaign.status !== 'open') {
        throw new DomainError('Campaign is not accepting boards', 409);
      }

      const expectedTileCount = campaign.boardSize * campaign.boardSize;
      if (board.selectedTiles.length !== expectedTileCount) {
        throw new DomainError(`Board must contain ${expectedTileCount} tiles`);
      }

      const positions = new Set(board.selectedTiles.map((tile) => tile.position));
      if (positions.size !== expectedTileCount || Math.min(...positions) !== 0 || Math.max(...positions) !== expectedTileCount - 1) {
        throw new DomainError('Board positions must be unique and contiguous');
      }

      const centerPosition = Math.floor(expectedTileCount / 2);
      const centerTiles = board.selectedTiles.filter((tile) => tile.isCenter);
      if (centerTiles.length !== 1 || centerTiles[0].position !== centerPosition) {
        throw new DomainError('Board must contain one center tile in the center position');
      }

      const allowedItems = await connection.all(
        `SELECT cci.id
         FROM campaignCategoryItems cci
         JOIN campaignCategories cc ON cc.id = cci.categoryId
         WHERE cc.campaignId = ?`,
        [campaign.id],
      );
      const allowedItemIds = new Set(allowedItems.map((item) => item.id));
      const invalidTile = board.selectedTiles.find((tile) => (
        !tile.isCenter && !allowedItemIds.has(tile.categoryItemId)
      ));
      if (invalidTile) throw new DomainError('Board contains an item from another campaign');

      let code;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const candidate = generateCode();
        const exists = await connection.get('SELECT 1 FROM playerBoards WHERE boardCode = ?', [candidate]);
        if (!exists) {
          code = candidate;
          break;
        }
      }
      if (!code) throw new Error('Unable to generate a unique board code');

      const result = await connection.run(
        `INSERT INTO playerBoards (campaignId, playerName, boardCode, createdAt)
         VALUES (?, ?, ?, ?)`,
        [campaign.id, board.playerName, code, new Date().toISOString()],
      );

      for (const tile of board.selectedTiles) {
        await connection.run(
          `INSERT INTO playerBoardTiles
            (boardId, categoryItemId, position, isCenter, customText)
           VALUES (?, ?, ?, ?, ?)`,
          [
            result.lastID,
            tile.isCenter ? null : tile.categoryItemId,
            tile.position,
            tile.isCenter ? 1 : 0,
            tile.customText || null,
          ],
        );
      }

      return code;
    });

    return this.getPlayerBoardByCode(boardCode);
  }

  getPlayerBoardTiles(boardId) {
    return this.connection.all(
      `SELECT pbt.*, cci.text, cci.status AS itemStatus,
              cc.name AS categoryName, cc.type AS categoryType
       FROM playerBoardTiles pbt
       LEFT JOIN campaignCategoryItems cci ON pbt.categoryItemId = cci.id
       LEFT JOIN campaignCategories cc ON cci.categoryId = cc.id
       WHERE pbt.boardId = ?
       ORDER BY pbt.position`,
      [boardId],
    );
  }

  async getPlayerBoardByCode(boardCode) {
    const board = await this.connection.get(
      `SELECT pb.*, c.code AS campaignCode, c.title AS campaignTitle,
              c.boardSize, c.backgroundPreset AS presetId,
              c.startDateTime, c.status AS campaignStatus,
              c.version AS campaignVersion
       FROM playerBoards pb
       JOIN campaigns c ON pb.campaignId = c.id
       WHERE pb.boardCode = ?`,
      [boardCode.toUpperCase()],
    );
    if (!board) return null;

    const [tiles, backgroundPreset] = await Promise.all([
      this.getPlayerBoardTiles(board.id),
      this.getBackgroundPreset(board.presetId),
    ]);
    return { ...board, tiles, backgroundPreset };
  }

  async listBoards(campaignCode) {
    const params = [];
    const predicates = ["c.status IN ('open', 'locked', 'moderating', 'completed')"];
    if (campaignCode) {
      predicates.push('c.code = ?');
      params.push(campaignCode.toUpperCase());
    }
    const where = `WHERE ${predicates.join(' AND ')}`;
    const boards = await this.connection.all(
      `SELECT pb.*, c.code AS campaignCode, c.title AS campaignTitle,
              c.boardSize AS campaignBoardSize, c.backgroundPreset AS presetId,
              c.status AS campaignStatus, c.version AS campaignVersion
       FROM playerBoards pb
       JOIN campaigns c ON c.id = pb.campaignId
       ${where}
       ORDER BY pb.createdAt DESC`,
      params,
    );

    return Promise.all(boards.map(async (board) => {
      const [backgroundPreset, selectedTiles, count] = await Promise.all([
        this.getBackgroundPreset(board.presetId),
        this.getPlayerBoardTiles(board.id),
        this.connection.get('SELECT COUNT(*) AS count FROM playerBoards WHERE campaignId = ?', [board.campaignId]),
      ]);
      return { ...board, backgroundPreset, selectedTiles, playerCount: count.count };
    }));
  }

  getAllBoards() {
    return this.listBoards();
  }

  getCampaignBoards(campaignCode) {
    return this.listBoards(campaignCode);
  }

  transitionCampaign(campaign, status, lifecycle) {
    return this.transaction(async (connection) => {
      const result = await connection.run(
        `UPDATE campaigns
         SET status = ?, publishedAt = ?, boardCreationClosedAt = ?,
             moderationStartedAt = ?, finalizedAt = ?, cancelledAt = ?,
             version = version + 1
         WHERE id = ? AND status = ? AND version = ?`,
        [
          status,
          lifecycle.publishedAt,
          lifecycle.boardCreationClosedAt,
          lifecycle.moderationStartedAt,
          lifecycle.finalizedAt,
          lifecycle.cancelledAt,
          campaign.id,
          campaign.status,
          campaign.version,
        ],
      );
      if (result.changes === 0) return null;

      const updated = await connection.get('SELECT * FROM campaigns WHERE id = ?', [campaign.id]);
      return this.enrichCampaign(updated, connection);
    });
  }

  updateCampaignCategoryItemStatus(campaignId, itemId, status) {
    return this.connection.run(
      `UPDATE campaignCategoryItems
       SET status = ?, calledAt = ?
       WHERE id = ? AND categoryId IN (
         SELECT id FROM campaignCategories WHERE campaignId = ?
       )`,
      [status, new Date().toISOString(), itemId, campaignId],
    );
  }

  async deleteCampaign(campaignId) {
    return this.transaction(async (connection) => {
      await connection.run(
        `DELETE FROM playerBoardTiles WHERE boardId IN (
          SELECT id FROM playerBoards WHERE campaignId = ?
        )`,
        [campaignId],
      );
      await connection.run('DELETE FROM campaignSessions WHERE campaignId = ?', [campaignId]);
      await connection.run('DELETE FROM playerBoards WHERE campaignId = ?', [campaignId]);
      await connection.run(
        `DELETE FROM campaignCategoryItems WHERE categoryId IN (
          SELECT id FROM campaignCategories WHERE campaignId = ?
        )`,
        [campaignId],
      );
      await connection.run('DELETE FROM campaignCategories WHERE campaignId = ?', [campaignId]);
      return connection.run('DELETE FROM campaigns WHERE id = ?', [campaignId]);
    });
  }
}

module.exports = { BongiiDatabase, DomainError };