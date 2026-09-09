const crypto = require('crypto');
const { configureConnection, openConnection } = require('./connection');
const { migrate } = require('./migrate');
const { RULES_VERSION, rankBoards, scoreBoard } = require('../scoring');

const RESULTS_PAGE_SIZE = 20;
const BROWSE_GROUP_STATUSES = Object.freeze({
  open: ['open'],
  awaiting: ['locked', 'moderating'],
  results: ['completed'],
});

const escapeLike = (value) => value.replace(/[\\%_]/g, '\\$&');

const cleanText = (value, maximum) => {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, maximum) : null;
};

const safeGooglePhotoUrl = (value) => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:'
      || (parsed.hostname !== 'googleusercontent.com'
        && !parsed.hostname.endsWith('.googleusercontent.com'))) return null;
    return parsed.toString().slice(0, 2048);
  } catch {
    return null;
  }
};

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

const toPublicCampaign = ({ createdBy, ...campaign }) => ({
  ...campaign,
  categories: campaign.categories.map((category) => ({
    ...category,
    items: category.items.map(({ decidedBy, ...item }) => item),
  })),
});

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

  getUserByFirebaseUid(firebaseUid) {
    return this.connection.get('SELECT * FROM users WHERE firebaseUid = ?', [firebaseUid]);
  }

  async syncFirebaseUser(identity) {
    const firebaseUid = cleanText(identity.firebaseUid, 128);
    const email = cleanText(identity.email, 320)?.toLowerCase();
    const displayName = cleanText(identity.displayName, 160)
      || email?.split('@')[0]
      || 'Bongii user';
    const photoUrl = safeGooglePhotoUrl(identity.photoUrl);
    if (!firebaseUid || !email || identity.emailVerified !== true) {
      throw new DomainError('A verified Firebase identity is required', 403);
    }

    return this.transaction(async (connection) => {
      let user = await connection.get(
        'SELECT * FROM users WHERE firebaseUid = ?',
        [firebaseUid],
      );
      if (user) {
        const conflictingEmail = await connection.get(
          `SELECT id FROM users
           WHERE id != ? AND LOWER(TRIM(email)) = ?`,
          [user.id, email],
        );
        if (conflictingEmail) {
          throw new DomainError('This email needs manual account recovery', 409);
        }
        await connection.run(
          `UPDATE users
           SET displayName = ?, email = ?, photoUrl = ?
           WHERE id = ?`,
          [displayName, email, photoUrl, user.id],
        );
        return connection.get('SELECT * FROM users WHERE id = ?', [user.id]);
      }

      const emailMatches = await connection.all(
        `SELECT * FROM users
         WHERE LOWER(TRIM(email)) = ?
         ORDER BY id`,
        [email],
      );
      if (emailMatches.length > 1) {
        throw new DomainError('This email needs manual account recovery', 409);
      }

      if (emailMatches.length === 1) {
        [user] = emailMatches;
        if (user.firebaseUid) {
          throw new DomainError('This email is already linked to another account', 409);
        }
        await connection.run(
          `UPDATE users
           SET firebaseUid = ?, displayName = ?, email = ?, photoUrl = ?,
               legacyUsername = COALESCE(legacyUsername, username), password = NULL
           WHERE id = ?`,
          [firebaseUid, displayName, email, photoUrl, user.id],
        );
        return connection.get('SELECT * FROM users WHERE id = ?', [user.id]);
      }

      const nameParts = displayName.split(/\s+/);
      const firstName = nameParts.shift();
      const lastName = nameParts.join(' ') || null;
      const result = await connection.run(
        `INSERT INTO users
          (firebaseUid, displayName, email, photoUrl, firstName, lastName, profileIcon)
         VALUES (?, ?, ?, ?, ?, ?, '1')`,
        [firebaseUid, displayName, email, photoUrl, firstName, lastName],
      );
      return connection.get('SELECT * FROM users WHERE id = ?', [result.lastID]);
    });
  }

  getAllUsers() {
    return this.connection.all(
      'SELECT id, username, firstName, lastName, email, profileIcon FROM users ORDER BY username',
    );
  }

  async updateUserProfile(id, updates) {
    if (updates.displayName !== undefined) {
      const displayName = cleanText(updates.displayName, 160);
      const nameParts = displayName.split(/\s+/);
      const firstName = nameParts.shift();
      const lastName = nameParts.join(' ') || null;
      await this.connection.run(
        `UPDATE users
         SET displayName = ?, firstName = ?, lastName = ?, profileIcon = ?
         WHERE id = ?`,
        [displayName, firstName, lastName, updates.profileIcon || '1', id],
      );
      return this.getUser(id);
    }

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
    const enriched = await this.enrichCampaign(campaign);
    return enriched ? toPublicCampaign(enriched) : null;
  }

  async getAllCampaigns({ group, query } = {}) {
    const statuses = group
      ? BROWSE_GROUP_STATUSES[group]
      : ['open', 'locked', 'moderating', 'completed'];
    const placeholders = statuses.map(() => '?').join(', ');
    const params = [...statuses];
    const titlePredicate = query ? " AND title LIKE ? ESCAPE '\\'" : '';
    if (query) params.push(`%${escapeLike(query)}%`);

    const campaigns = await this.connection.all(
      `SELECT * FROM campaigns
       WHERE status IN (${placeholders})${titlePredicate}
       ORDER BY CASE
         WHEN status = 'open' THEN publishedAt
         WHEN status IN ('locked', 'moderating') THEN COALESCE(moderationStartedAt, boardCreationClosedAt)
         WHEN status = 'completed' THEN finalizedAt
       END DESC, createdAt DESC, id DESC`,
      params,
    );
    const enriched = await Promise.all(
      campaigns.map((campaign) => this.enrichCampaign(campaign)),
    );
    return enriched.map(toPublicCampaign);
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

  async getPlayerBoardTiles(boardId, connection = this.connection) {
    const tiles = await connection.all(
      `SELECT pbt.*, cci.text, cci.status AS itemStatus,
              cci.decidedAt, cci.decidedBy,
              cc.name AS categoryName, cc.type AS categoryType
       FROM playerBoardTiles pbt
       LEFT JOIN campaignCategoryItems cci ON pbt.categoryItemId = cci.id
       LEFT JOIN campaignCategories cc ON cci.categoryId = cc.id
       WHERE pbt.boardId = ?
       ORDER BY pbt.position`,
      [boardId],
    );

    return tiles.map(({ decidedAt, decidedBy, ...tile }) => ({
      ...tile,
      outcome: {
        status: tile.isCenter ? 'happened' : (tile.itemStatus || 'pending'),
        decidedAt: tile.isCenter ? null : decidedAt,
      },
    }));
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
    const { userId, ...publicBoard } = board;
    return { ...publicBoard, tiles, backgroundPreset };
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
      const { userId, ...publicBoard } = board;
      return { ...publicBoard, backgroundPreset, selectedTiles, playerCount: count.count };
    }));
  }

  getAllBoards() {
    return this.listBoards();
  }

  getCampaignBoards(campaignCode) {
    return this.listBoards(campaignCode);
  }

  async getCampaignResults(campaignCode, page = 1, connection = this.connection) {
    const campaignResult = await connection.get(
      `SELECT cr.id AS resultId, cr.finalizedAt, cr.rulesVersion,
              c.code, c.title, c.boardSize, c.status, c.version,
              c.backgroundPreset AS presetId,
              (SELECT COUNT(*) FROM boardResults br
               WHERE br.campaignResultId = cr.id) AS totalResults
       FROM campaignResults cr
       JOIN campaigns c ON c.id = cr.campaignId
       WHERE c.code = ?`,
      [campaignCode.toUpperCase()],
    );
    if (!campaignResult) return null;

    const offset = (page - 1) * RESULTS_PAGE_SIZE;
    const rows = await connection.all(
      `SELECT br.boardId, br.rank, br.longestRun,
              br.completedLineCount, br.matchedTileCount,
              pb.playerName, pb.boardCode,
              (SELECT COUNT(*) FROM boardResults tied
               WHERE tied.campaignResultId = br.campaignResultId
                 AND tied.rank = br.rank) AS rankCount
       FROM boardResults br
       JOIN playerBoards pb ON pb.id = br.boardId
       WHERE br.campaignResultId = ?
       ORDER BY br.rank, COALESCE(pb.playerName, ''), pb.boardCode
       LIMIT ? OFFSET ?`,
      [campaignResult.resultId, RESULTS_PAGE_SIZE, offset],
    );
    const results = await Promise.all(rows.map(async ({ boardId, rankCount, ...row }) => {
      const tiles = await this.getPlayerBoardTiles(boardId, connection);
      return {
        ...row,
        sharedRank: rankCount > 1,
        tiles: tiles.map((tile) => ({
          position: tile.position,
          isCenter: tile.isCenter,
          text: tile.text,
          customText: tile.customText,
          outcome: tile.outcome,
        })),
      };
    }));
    const backgroundPreset = await this.getBackgroundPreset(campaignResult.presetId, connection);

    return {
      campaign: {
        code: campaignResult.code,
        title: campaignResult.title,
        boardSize: campaignResult.boardSize,
        status: campaignResult.status,
        version: campaignResult.version,
        finalizedAt: campaignResult.finalizedAt,
        rulesVersion: campaignResult.rulesVersion,
        backgroundPreset,
      },
      results,
      pagination: {
        page,
        pageSize: RESULTS_PAGE_SIZE,
        totalItems: campaignResult.totalResults,
        totalPages: Math.max(1, Math.ceil(campaignResult.totalResults / RESULTS_PAGE_SIZE)),
      },
    };
  }

  finalizeCampaign(campaignCode, finalizedBy, finalizedAt) {
    return this.transaction(async (connection) => {
      const campaign = await connection.get(
        'SELECT * FROM campaigns WHERE code = ?',
        [campaignCode.toUpperCase()],
      );
      if (!campaign) throw new DomainError('Campaign not found', 404);
      if (campaign.createdBy !== finalizedBy) {
        throw new DomainError('Only the campaign creator can finalize it', 403);
      }

      const existingResult = await connection.get(
        'SELECT id FROM campaignResults WHERE campaignId = ?',
        [campaign.id],
      );
      if (existingResult) {
        const snapshot = await this.getCampaignResults(campaign.code, 1, connection);
        return {
          campaignCode: campaign.code,
          campaignVersion: snapshot.campaign.version,
          status: snapshot.campaign.status,
          finalizedAt: snapshot.campaign.finalizedAt,
          pendingResolved: 0,
          alreadyFinalized: true,
          result: snapshot,
        };
      }
      if (campaign.status !== 'moderating') {
        throw new DomainError(`Cannot finalize a ${campaign.status} campaign`, 409);
      }

      const pending = await connection.get(
        `SELECT COUNT(*) AS count
         FROM campaignCategoryItems cci
         JOIN campaignCategories cc ON cc.id = cci.categoryId
         WHERE cc.campaignId = ? AND cci.status = 'pending'`,
        [campaign.id],
      );
      await connection.run(
        `UPDATE campaignCategoryItems
         SET status = 'did_not_happen', decidedAt = ?, decidedBy = ?
         WHERE status = 'pending' AND categoryId IN (
           SELECT id FROM campaignCategories WHERE campaignId = ?
         )`,
        [finalizedAt, finalizedBy, campaign.id],
      );

      const outcomes = await connection.all(
        `SELECT cci.id, cci.status
         FROM campaignCategoryItems cci
         JOIN campaignCategories cc ON cc.id = cci.categoryId
         WHERE cc.campaignId = ?`,
        [campaign.id],
      );
      const outcomeByItemId = new Map(outcomes.map((outcome) => [outcome.id, outcome.status]));
      const boards = await connection.all(
        `SELECT id, playerName, boardCode
         FROM playerBoards
         WHERE campaignId = ?
         ORDER BY id`,
        [campaign.id],
      );
      const tileRows = await connection.all(
        `SELECT pbt.boardId, pbt.categoryItemId, pbt.position, pbt.isCenter
         FROM playerBoardTiles pbt
         JOIN playerBoards pb ON pb.id = pbt.boardId
         WHERE pb.campaignId = ?
         ORDER BY pbt.boardId, pbt.position`,
        [campaign.id],
      );
      const tilesByBoardId = new Map(boards.map((board) => [board.id, []]));
      for (const tile of tileRows) tilesByBoardId.get(tile.boardId)?.push(tile);

      const scores = boards.map((board) => {
        const score = scoreBoard({
          boardSize: campaign.boardSize,
          tiles: tilesByBoardId.get(board.id),
          outcomeByItemId,
        });
        if (score.integrityWarnings.length > 0) {
          console.warn('Scoring integrity warning', {
            campaignCode: campaign.code,
            boardCode: board.boardCode,
            warnings: score.integrityWarnings,
          });
        }
        return {
          boardId: board.id,
          boardCode: board.boardCode,
          playerName: board.playerName,
          longestRun: score.longestRun,
          completedLineCount: score.completedLineCount,
          matchedTileCount: score.matchedTileCount,
        };
      });
      const ranked = rankBoards(scores);

      const campaignResultInsert = await connection.run(
        `INSERT INTO campaignResults
          (campaignId, finalizedAt, finalizedBy, rulesVersion)
         VALUES (?, ?, ?, ?)`,
        [campaign.id, finalizedAt, finalizedBy, RULES_VERSION],
      );
      for (const score of ranked) {
        await connection.run(
          `INSERT INTO boardResults
            (campaignResultId, boardId, rank, longestRun,
             completedLineCount, matchedTileCount)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            campaignResultInsert.lastID,
            score.boardId,
            score.rank,
            score.longestRun,
            score.completedLineCount,
            score.matchedTileCount,
          ],
        );
      }

      const update = await connection.run(
        `UPDATE campaigns
         SET status = 'completed', finalizedAt = ?, version = version + 1
         WHERE id = ? AND status = 'moderating'`,
        [finalizedAt, campaign.id],
      );
      if (update.changes !== 1) {
        throw new DomainError('Campaign changed; refresh and try again', 409);
      }

      const snapshot = await this.getCampaignResults(campaign.code, 1, connection);
      return {
        campaignCode: campaign.code,
        campaignVersion: snapshot.campaign.version,
        status: snapshot.campaign.status,
        finalizedAt,
        pendingResolved: pending.count,
        alreadyFinalized: false,
        result: snapshot,
      };
    });
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

  updateItemOutcome(campaignCode, itemId, status, decidedBy) {
    return this.transaction(async (connection) => {
      const campaign = await connection.get(
        'SELECT * FROM campaigns WHERE code = ?',
        [campaignCode.toUpperCase()],
      );
      if (!campaign) throw new DomainError('Campaign not found', 404);
      if (campaign.createdBy !== decidedBy) {
        throw new DomainError('Only the campaign creator can decide outcomes', 403);
      }
      if (campaign.status !== 'moderating') {
        throw new DomainError('Campaign is not being moderated', 409);
      }

      const decidedAt = status === 'pending' ? null : new Date().toISOString();
      const moderatorId = status === 'pending' ? null : decidedBy;
      const result = await connection.run(
        `UPDATE campaignCategoryItems
         SET status = ?, decidedAt = ?, decidedBy = ?
         WHERE id = ? AND categoryId IN (
           SELECT id FROM campaignCategories WHERE campaignId = ?
         )`,
        [status, decidedAt, moderatorId, itemId, campaign.id],
      );
      if (result.changes === 0) throw new DomainError('Campaign item not found', 404);

      await connection.run(
        'UPDATE campaigns SET version = version + 1 WHERE id = ?',
        [campaign.id],
      );
      const updated = await connection.get(
        'SELECT version FROM campaigns WHERE id = ?',
        [campaign.id],
      );
      return {
        campaignCode: campaign.code,
        campaignVersion: updated.version,
        outcome: {
          itemId,
          status,
          decidedAt,
          decidedBy: moderatorId,
        },
      };
    });
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