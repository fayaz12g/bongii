const express = require('express');
const {
  asyncRoute,
  createAuthMiddleware,
  createOptionalAuthMiddleware,
  publicUser,
} = require('./auth');
const { createEditToken, hashEditToken } = require('./boardAccess');
const { createBoardCreationRateLimit } = require('./boardCreationRateLimit');
const { CampaignLifecycle, withAllowedActions } = require('./campaignLifecycle');
const { schemas, validateBody } = require('./validation');

const createRouter = ({ database, config, campaignEvents, firebaseTokenVerifier, metrics }) => {
  const router = express.Router();
  const requireAuth = createAuthMiddleware(database, firebaseTokenVerifier);
  const optionalAuth = createOptionalAuthMiddleware(database, firebaseTokenVerifier);
  const limitBoardCreation = createBoardCreationRateLimit();
  const lifecycle = new CampaignLifecycle(database);

  router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/ready', async (req, res) => {
    try {
      await database.checkReadiness();
      res.json({ status: 'ready' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });

  router.get('/metrics', asyncRoute(async (req, res) => {
    const migrationVersion = await database.getMigrationVersion();
    res.type('text/plain').send(metrics.render(migrationVersion));
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

  router.post('/users/current/debug-token-purchase', requireAuth, validateBody(schemas.debugTokenPurchase), asyncRoute(async (req, res) => {
    if (config.enableDebugTokenPurchase === false) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const user = await database.grantDebugTokens(req.user.id);
    res.json({
      success: true,
      tokensAdded: 100,
      doubleOrNothingCredits: user.doubleOrNothingCredits,
    });
  }));

  router.get('/campaigns', asyncRoute(async (req, res) => {
    const { group, query } = req.query;
    if (group !== undefined && (typeof group !== 'string'
      || !['open', 'awaiting', 'results'].includes(group))) {
      res.status(400).json({ error: 'Group must be open, awaiting, or results' });
      return;
    }
    if (query !== undefined && (typeof query !== 'string' || query.trim().length > 120)) {
      res.status(400).json({ error: 'Query must be at most 120 characters' });
      return;
    }
    res.json(await database.getAllCampaigns({
      group,
      query: query?.trim() || undefined,
    }));
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
    const created = await database.createCampaign({
      ...req.validatedBody,
      createdBy: req.user.id,
    });
    const { remainingDoubleOrNothingCredits, ...campaign } = created;
    res.status(201).json({
      success: true,
      campaign: withAllowedActions(campaign),
      remainingDoubleOrNothingCredits,
    });
  }));

  router.post('/campaigns/:code/board', limitBoardCreation, optionalAuth, validateBody(schemas.board), asyncRoute(async (req, res) => {
    const editToken = req.user ? null : createEditToken();
    const board = await database.createPlayerBoard(req.params.code, req.validatedBody, {
      userId: req.user?.id || null,
      editTokenHash: editToken ? hashEditToken(editToken) : null,
    });
    res.status(201).json({
      success: true,
      boardCode: board.boardCode,
      ...(editToken ? { editToken } : {}),
      ...(board.remainingDoubleOrNothingCredits !== undefined
        ? { remainingDoubleOrNothingCredits: board.remainingDoubleOrNothingCredits }
        : {}),
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

  router.get('/campaigns/:code/results', asyncRoute(async (req, res) => {
    const pageValue = req.query.page ?? '1';
    const page = Number(pageValue);
    if (typeof pageValue !== 'string' || !/^\d+$/.test(pageValue)
      || !Number.isSafeInteger(page) || page < 1) {
      res.status(400).json({ error: 'Page must be a positive integer' });
      return;
    }
    const results = await database.getCampaignResults(req.params.code, page);
    if (!results) {
      res.status(404).json({ error: 'Campaign results not found' });
      return;
    }
    res.json(results);
  }));

  router.get('/boards/:boardCode', optionalAuth, asyncRoute(async (req, res) => {
    const board = await database.getPlayerBoardByCode(req.params.boardCode);
    if (!board) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }
    const canEdit = await database.canEditPlayerBoard(req.params.boardCode, {
      userId: req.user?.id || null,
      editToken: req.get('X-Board-Edit-Token'),
    });
    res.json({ ...board, canEdit: canEdit && board.campaignStatus === 'open' });
  }));

  router.put('/boards/:boardCode', optionalAuth, validateBody(schemas.boardUpdate), asyncRoute(async (req, res) => {
    const board = await database.updatePlayerBoard(req.params.boardCode, req.validatedBody, {
      userId: req.user?.id || null,
      editToken: req.get('X-Board-Edit-Token'),
    });
    res.json({ success: true, board });
  }));

  const transitionCampaign = (action) => asyncRoute(async (req, res) => {
    const campaign = await lifecycle.transition(req.params.code, req.user.id, action);
    campaignEvents?.emit('status.changed', campaign);
    res.json({ success: true, campaign });
  });

  router.post('/campaigns/:code/publish', requireAuth, transitionCampaign('publish'));
  router.post('/campaigns/:code/lock', requireAuth, transitionCampaign('lock'));
  router.post('/campaigns/:code/reopen', requireAuth, transitionCampaign('reopen'));
  router.post('/campaigns/:code/moderation', requireAuth, transitionCampaign('startModeration'));
  router.post('/campaigns/:code/cancel', requireAuth, transitionCampaign('cancel'));

  router.post('/campaigns/:code/finalize', requireAuth, asyncRoute(async (req, res) => {
    const startedAt = process.hrtime.bigint();
    try {
      const result = await lifecycle.finalize(req.params.code, req.user.id);
      if (!result.alreadyFinalized) campaignEvents?.emit('campaign.finalized', result);
      res.json({ success: true, ...result });
    } finally {
      const elapsedNanoseconds = process.hrtime.bigint() - startedAt;
      metrics.recordFinalization(Number(elapsedNanoseconds) / 1_000_000_000);
    }
  }));

  router.post('/campaigns/:code/items/:itemId/outcome', requireAuth, validateBody(schemas.itemOutcome), asyncRoute(async (req, res) => {
    if (!/^\d+$/.test(req.params.itemId) || Number(req.params.itemId) < 1) {
      res.status(400).json({ error: 'Campaign item ID must be a positive integer' });
      return;
    }
    const result = await database.updateItemOutcome(
      req.params.code,
      Number(req.params.itemId),
      req.validatedBody.status,
      req.user.id,
    );
    campaignEvents?.emit('outcome.updated', result);
    res.json({ success: true, ...result });
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
    if (campaign.status === 'completed') {
      res.status(409).json({ error: 'Completed campaigns cannot be deleted' });
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