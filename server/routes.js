const { createHash, timingSafeEqual } = require('node:crypto');
const bcrypt = require('bcryptjs');
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { asyncRoute, createAuthMiddleware, publicUser } = require('./auth');
const { CampaignLifecycle, withAllowedActions } = require('./campaignLifecycle');
const { schemas, validateBody } = require('./validation');

const matchesLegacyPassword = (candidate, storedPassword) => {
  const candidateDigest = createHash('sha256').update(candidate).digest();
  const storedDigest = createHash('sha256').update(storedPassword).digest();
  return timingSafeEqual(candidateDigest, storedDigest);
};

const createRouter = ({ database, config }) => {
  const router = express.Router();
  const requireAuth = createAuthMiddleware(database, config.jwtSecret);
  const lifecycle = new CampaignLifecycle(database);
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });

  router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  router.post('/users', authLimiter, validateBody(schemas.register), asyncRoute(async (req, res) => {
    const existingUser = await database.getUserByUsername(req.validatedBody.username);
    if (existingUser) {
      res.status(409).json({ error: 'Username already exists' });
      return;
    }

    const password = await bcrypt.hash(req.validatedBody.password, 12);
    const user = await database.addUser({ ...req.validatedBody, password });
    res.status(201).json(publicUser(user));
  }));

  router.post('/login', authLimiter, validateBody(schemas.login), asyncRoute(async (req, res) => {
    const user = await database.getUserByUsername(req.validatedBody.username);
    if (!user?.password) {
      res.status(401).json({ error: 'Invalid login information' });
      return;
    }

    const isHashed = user.password.startsWith('$2');
    const passwordMatches = isHashed
      ? await bcrypt.compare(req.validatedBody.password, user.password)
      : matchesLegacyPassword(req.validatedBody.password, user.password);
    if (!passwordMatches) {
      res.status(401).json({ error: 'Invalid login information' });
      return;
    }

    if (!isHashed) {
      const upgradedPassword = await bcrypt.hash(req.validatedBody.password, 12);
      await database.updateUserPassword(user.id, upgradedPassword);
    }

    const token = jwt.sign(
      { sub: String(user.id), username: user.username },
      config.jwtSecret,
      { expiresIn: '1h' },
    );
    res.json({ token });
  }));

  router.get('/users', requireAuth, asyncRoute(async (req, res) => {
    res.json(await database.getAllUsers());
  }));

  router.get('/users/current', requireAuth, (req, res) => {
    res.json(publicUser(req.user));
  });

  router.put('/users/current', requireAuth, validateBody(schemas.profile), asyncRoute(async (req, res) => {
    const user = await database.updateUserProfile(req.user.id, req.validatedBody);
    res.json(publicUser(user));
  }));

  router.get('/campaigns', asyncRoute(async (req, res) => {
    res.json(await database.getAllCampaigns());
  }));

  router.get('/boards', asyncRoute(async (req, res) => {
    res.json(await database.getAllBoards());
  }));

  router.get('/campaigns/validate/:code', asyncRoute(async (req, res) => {
    const campaign = await database.getPublicCampaignByCode(req.params.code);
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.sendStatus(200);
  }));

  router.get('/campaigns/:code', asyncRoute(async (req, res) => {
    const campaign = await database.getPublicCampaignByCode(req.params.code);
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json(campaign);
  }));

  router.post('/campaigns', requireAuth, validateBody(schemas.campaign), asyncRoute(async (req, res) => {
    const campaign = await database.createCampaign({
      ...req.validatedBody,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, campaign: withAllowedActions(campaign) });
  }));

  router.post('/campaigns/:code/board', validateBody(schemas.board), asyncRoute(async (req, res) => {
    const board = await database.createPlayerBoard(req.params.code, req.validatedBody);
    res.status(201).json({
      success: true,
      boardCode: board.boardCode,
      message: 'Board created successfully',
    });
  }));

  router.get('/campaigns/:code/boards', asyncRoute(async (req, res) => {
    const campaign = await database.getPublicCampaignByCode(req.params.code);
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json(await database.getCampaignBoards(req.params.code));
  }));

  router.get('/boards/:boardCode', asyncRoute(async (req, res) => {
    const board = await database.getPlayerBoardByCode(req.params.boardCode);
    if (!board) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }
    res.json(board);
  }));

  const transitionCampaign = (action) => asyncRoute(async (req, res) => {
    const campaign = await lifecycle.transition(req.params.code, req.user.id, action);
    res.json({ success: true, campaign });
  });

  router.post('/campaigns/:code/publish', requireAuth, transitionCampaign('publish'));
  router.post('/campaigns/:code/lock', requireAuth, transitionCampaign('lock'));
  router.post('/campaigns/:code/reopen', requireAuth, transitionCampaign('reopen'));
  router.post('/campaigns/:code/moderation', requireAuth, transitionCampaign('startModeration'));
  router.post('/campaigns/:code/cancel', requireAuth, transitionCampaign('cancel'));

  router.post('/campaigns/:code/call', requireAuth, validateBody(schemas.callItem), asyncRoute(async (req, res) => {
    const campaign = await database.getCampaignByCode(req.params.code);
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    if (campaign.createdBy !== req.user.id) {
      res.status(403).json({ error: 'Only the campaign creator can mark items' });
      return;
    }
    if (campaign.status !== 'moderating') {
      res.status(409).json({ error: 'Campaign is not being moderated' });
      return;
    }

    const result = await database.updateCampaignCategoryItemStatus(
      campaign.id,
      req.validatedBody.itemId,
      req.validatedBody.status,
    );
    if (result.changes === 0) {
      res.status(404).json({ error: 'Campaign item not found' });
      return;
    }
    res.json({ success: true, message: `Item marked as ${req.validatedBody.status}` });
  }));

  router.delete('/campaigns/:code', requireAuth, asyncRoute(async (req, res) => {
    const campaign = await database.getCampaignByCode(req.params.code);
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    if (campaign.createdBy !== req.user.id) {
      res.status(403).json({ error: 'Only the campaign creator can delete it' });
      return;
    }
    await database.deleteCampaign(campaign.id);
    res.json({ success: true, message: 'Campaign deleted successfully' });
  }));

  router.get('/moderate/campaigns', requireAuth, asyncRoute(async (req, res) => {
    const campaigns = await database.getUserCampaigns(req.user.id);
    res.json(campaigns.map(withAllowedActions));
  }));

  router.get('/moderate/campaigns/:code', requireAuth, asyncRoute(async (req, res) => {
    res.json(await lifecycle.getModeratorCampaign(req.params.code, req.user.id));
  }));

  return router;
};

module.exports = { createRouter };