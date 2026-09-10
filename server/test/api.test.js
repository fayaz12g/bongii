const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const {
  boardPayloadFor,
  campaignPayload,
  createTestContext,
  createUserAndToken,
} = require('./helpers');

const contexts = [];

afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => context.cleanup()));
});

test('reports process health and database readiness without exposing details', async () => {
  const context = await createTestContext();
  contexts.push(context);

  const health = await context.api.get('/api/health');
  assert.equal(health.status, 200);
  assert.deepEqual(health.body, { status: 'ok' });

  const ready = await context.api.get('/api/ready');
  assert.equal(ready.status, 200);
  assert.deepEqual(ready.body, { status: 'ready' });

  context.database.checkReadiness = async () => {
    throw new Error(`Database unavailable at ${context.database.databasePath}`);
  };

  const unavailable = await context.api.get('/api/ready');
  assert.equal(unavailable.status, 503);
  assert.deepEqual(unavailable.body, { status: 'unavailable' });

  const healthDuringDatabaseFailure = await context.api.get('/api/health');
  assert.equal(healthDuringDatabaseFailure.status, 200);
});

test('exports HTTP and migration metrics without configuration values', async () => {
  const context = await createTestContext();
  contexts.push(context);

  await context.api.get('/api/health');
  await context.api.get('/api/not-a-route');
  const response = await context.api.get('/api/metrics');

  assert.equal(response.status, 200);
  assert.match(response.headers['content-type'], /^text\/plain/);
  assert.match(response.text, /bongii_http_requests_total\{status_class="2xx"\} 1/);
  assert.match(response.text, /bongii_http_requests_total\{status_class="4xx"\} 1/);
  assert.match(response.text, /bongii_http_errors_total 1/);
  assert.match(response.text, /bongii_schema_migration_info\{version="\d{3}_[^"]+\.js"\} 1/);
  assert.equal(response.text.includes(context.database.databasePath), false);
});

test('correlates requests with redacted structured logs', async () => {
  const entries = [];
  const logger = {
    error(message, details) {
      entries.push({ level: 'error', message, details });
    },
    info(message, details) {
      entries.push({ level: 'info', message, details });
    },
  };
  const context = await createTestContext({ logger });
  contexts.push(context);
  context.database.getAllCampaigns = async () => {
    throw new Error('database-secret-value');
  };

  const response = await context.api
    .get('/api/campaigns?query=query-secret-value')
    .set('Authorization', 'Bearer header-secret-value');

  assert.equal(response.status, 500);
  assert.match(response.headers['x-request-id'], /^[0-9a-f-]{36}$/);
  const failure = entries.find((entry) => entry.message === 'HTTP request failed');
  const completion = entries.find((entry) => entry.message === 'HTTP request completed');
  assert.equal(failure.details.requestId, response.headers['x-request-id']);
  assert.equal(completion.details.requestId, response.headers['x-request-id']);
  assert.equal(completion.details.statusCode, 500);
  assert.equal(completion.details.path, '/campaigns');
  assert.equal(completion.details.method, 'GET');
  assert.ok(completion.details.durationMs >= 0);

  const serializedEntries = JSON.stringify(entries);
  assert.equal(serializedEntries.includes('database-secret-value'), false);
  assert.equal(serializedEntries.includes('query-secret-value'), false);
  assert.equal(serializedEntries.includes('header-secret-value'), false);
});

test('creates a campaign and a complete board through the API', async () => {
  const context = await createTestContext();
  contexts.push(context);
  const { registration, login, token } = await createUserAndToken(context.api);

  assert.equal(registration.status, 200);
  assert.equal(Object.hasOwn(registration.body, 'password'), false);
  assert.equal(login.status, 200);
  assert.ok(token);

  const campaignResponse = await context.api
    .post('/api/campaigns')
    .set('Authorization', `Bearer ${token}`)
    .send(campaignPayload());
  assert.equal(campaignResponse.status, 201);
  assert.equal(campaignResponse.body.campaign.description, 'An API integration fixture');

  const campaign = campaignResponse.body.campaign;
  assert.equal(campaign.status, 'draft');
  assert.equal(campaign.version, 1);
  assert.deepEqual(campaign.allowedActions, ['publish', 'cancel']);

  const hiddenDraft = await context.api.get(`/api/campaigns/${campaign.code}`);
  assert.equal(hiddenDraft.status, 404);

  const moderatorDraft = await context.api
    .get(`/api/moderate/campaigns/${campaign.code}`)
    .set('Authorization', `Bearer ${token}`);
  assert.equal(moderatorDraft.status, 200);
  assert.equal(moderatorDraft.body.status, 'draft');

  const unpublishedBoard = await context.api
    .post(`/api/campaigns/${campaign.code}/board`)
    .send(boardPayloadFor(campaign));
  assert.equal(unpublishedBoard.status, 409);

  const publishResponse = await context.api
    .post(`/api/campaigns/${campaign.code}/publish`)
    .set('Authorization', `Bearer ${token}`);
  assert.equal(publishResponse.status, 200);
  assert.equal(publishResponse.body.campaign.status, 'open');
  assert.equal(publishResponse.body.campaign.version, 2);
  assert.ok(publishResponse.body.campaign.publishedAt);
  assert.deepEqual(publishResponse.body.campaign.allowedActions, ['lock', 'cancel']);

  const boardResponse = await context.api
    .post(`/api/campaigns/${campaign.code}/board`)
    .send(boardPayloadFor(campaign));
  assert.equal(boardResponse.status, 201);
  assert.match(boardResponse.body.boardCode, /^[A-Z]{4}$/);

  const savedBoard = await context.api.get(`/api/boards/${boardResponse.body.boardCode}`);
  assert.equal(savedBoard.status, 200);
  assert.equal(savedBoard.body.tiles.length, 9);
  assert.deepEqual(savedBoard.body.tiles.map((tile) => tile.position), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(savedBoard.body.campaignStatus, 'open');
  assert.equal(savedBoard.body.campaignVersion, 2);
});

test('filters public campaigns by browse group and literal title search', async () => {
  const context = await createTestContext();
  contexts.push(context);
  const owner = await createUserAndToken(context.api, '-browse');

  const createCampaign = async (title) => {
    const payload = campaignPayload();
    payload.title = title;
    const response = await context.api
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${owner.token}`)
      .send(payload);
    return response.body.campaign;
  };
  const transition = (code, action) => context.api
    .post(`/api/campaigns/${code}/${action}`)
    .set('Authorization', `Bearer ${owner.token}`);

  const openCampaign = await createCampaign('Open Community Night');
  await transition(openCampaign.code, 'publish');
  const awaitingCampaign = await createCampaign('Awaiting Results Night');
  await transition(awaitingCampaign.code, 'publish');
  await transition(awaitingCampaign.code, 'lock');
  const completedCampaign = await createCampaign('Completed 100% Night');
  await transition(completedCampaign.code, 'publish');
  await transition(completedCampaign.code, 'lock');
  await transition(completedCampaign.code, 'moderation');
  await transition(completedCampaign.code, 'finalize');

  const open = await context.api.get('/api/campaigns').query({ group: 'open' });
  assert.deepEqual(open.body.map(({ code }) => code), [openCampaign.code]);
  const awaiting = await context.api.get('/api/campaigns').query({ group: 'awaiting' });
  assert.deepEqual(awaiting.body.map(({ code }) => code), [awaitingCampaign.code]);
  const results = await context.api.get('/api/campaigns').query({ group: 'results' });
  assert.deepEqual(results.body.map(({ code }) => code), [completedCampaign.code]);

  const titleMatch = await context.api
    .get('/api/campaigns')
    .query({ group: 'results', query: 'completed 100%' });
  assert.deepEqual(titleMatch.body.map(({ code }) => code), [completedCampaign.code]);
  const wildcardIsLiteral = await context.api
    .get('/api/campaigns')
    .query({ group: 'open', query: '%' });
  assert.deepEqual(wildcardIsLiteral.body, []);
  assert.equal((await context.api.get('/api/campaigns').query({ group: 'cancelled' })).status, 400);
  assert.equal((await context.api.get('/api/campaigns').query({ query: 'x'.repeat(121) })).status, 400);
});

test('rejects every lifecycle mutation by a user who does not own the campaign', async () => {
  const context = await createTestContext();
  contexts.push(context);
  const owner = await createUserAndToken(context.api, '-owner');
  const otherUser = await createUserAndToken(context.api, '-other');

  const campaignResponse = await context.api
    .post('/api/campaigns')
    .set('Authorization', `Bearer ${owner.token}`)
    .send(campaignPayload());
  assert.equal(campaignResponse.status, 201);
  const code = campaignResponse.body.campaign.code;

  const transition = (path, token) => context.api
    .post(`/api/campaigns/${code}/${path}`)
    .set('Authorization', `Bearer ${token}`);

  assert.equal((await transition('publish', otherUser.token)).status, 403);
  const published = await transition('publish', owner.token);
  assert.equal(published.status, 200);
  assert.equal(published.body.campaign.version, 2);
  assert.ok(published.body.campaign.publishedAt);
  assert.equal((await transition('lock', otherUser.token)).status, 403);
  const locked = await transition('lock', owner.token);
  assert.equal(locked.status, 200);
  assert.equal(locked.body.campaign.version, 3);
  assert.ok(locked.body.campaign.boardCreationClosedAt);
  assert.equal((await transition('reopen', otherUser.token)).status, 403);
  const reopened = await transition('reopen', owner.token);
  assert.equal(reopened.status, 200);
  assert.equal(reopened.body.campaign.version, 4);
  assert.equal(reopened.body.campaign.boardCreationClosedAt, null);
  assert.equal((await transition('lock', owner.token)).status, 200);
  assert.equal((await transition('moderation', otherUser.token)).status, 403);
  const moderating = await transition('moderation', owner.token);
  assert.equal(moderating.status, 200);
  assert.equal(moderating.body.campaign.version, 6);
  assert.ok(moderating.body.campaign.moderationStartedAt);
  assert.equal((await transition('cancel', otherUser.token)).status, 403);

  const unchanged = await context.api
    .get(`/api/moderate/campaigns/${code}`)
    .set('Authorization', `Bearer ${owner.token}`);
  assert.equal(unchanged.body.status, 'moderating');
  assert.equal(unchanged.body.version, 6);

  const cancelled = await transition('cancel', owner.token);
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.campaign.status, 'cancelled');
  assert.equal(cancelled.body.campaign.version, 7);
  assert.ok(cancelled.body.campaign.cancelledAt);
  assert.deepEqual(cancelled.body.campaign.allowedActions, []);
  assert.equal((await context.api.get(`/api/campaigns/${code}`)).status, 404);
});

test('keeps an underspecified draft unpublished', async () => {
  const context = await createTestContext();
  contexts.push(context);
  const owner = await createUserAndToken(context.api, '-draft');
  const payload = campaignPayload();
  payload.categories[0].items = payload.categories[0].items.slice(0, 2);

  const created = await context.api
    .post('/api/campaigns')
    .set('Authorization', `Bearer ${owner.token}`)
    .send(payload);
  assert.equal(created.status, 201);
  assert.deepEqual(created.body.campaign.allowedActions, ['cancel']);

  const publish = await context.api
    .post(`/api/campaigns/${created.body.campaign.code}/publish`)
    .set('Authorization', `Bearer ${owner.token}`);
  assert.equal(publish.status, 409);

  const draft = await context.api
    .get(`/api/moderate/campaigns/${created.body.campaign.code}`)
    .set('Authorization', `Bearer ${owner.token}`);
  assert.equal(draft.body.status, 'draft');
  assert.equal(draft.body.version, 1);
});

test('rejects invalid lifecycle transitions without changing campaign state', async () => {
  const context = await createTestContext();
  contexts.push(context);
  const owner = await createUserAndToken(context.api, '-transitions');
  const created = await context.api
    .post('/api/campaigns')
    .set('Authorization', `Bearer ${owner.token}`)
    .send(campaignPayload());
  const code = created.body.campaign.code;

  const invalidLock = await context.api
    .post(`/api/campaigns/${code}/lock`)
    .set('Authorization', `Bearer ${owner.token}`);
  assert.equal(invalidLock.status, 409);

  const unchanged = await context.api
    .get(`/api/moderate/campaigns/${code}`)
    .set('Authorization', `Bearer ${owner.token}`);
  assert.equal(unchanged.body.status, 'draft');
  assert.equal(unchanged.body.version, 1);

  await context.api.post(`/api/campaigns/${code}/publish`).set('Authorization', `Bearer ${owner.token}`);
  await context.api.post(`/api/campaigns/${code}/lock`).set('Authorization', `Bearer ${owner.token}`);
  const moderation = await context.api
    .post(`/api/campaigns/${code}/moderation`)
    .set('Authorization', `Bearer ${owner.token}`);
  assert.equal(moderation.status, 200);
  assert.equal(moderation.body.campaign.version, 4);

  const invalidReopen = await context.api
    .post(`/api/campaigns/${code}/reopen`)
    .set('Authorization', `Bearer ${owner.token}`);
  assert.equal(invalidReopen.status, 409);

  const stillModerating = await context.api
    .get(`/api/moderate/campaigns/${code}`)
    .set('Authorization', `Bearer ${owner.token}`);
  assert.equal(stillModerating.body.status, 'moderating');
  assert.equal(stillModerating.body.version, 4);
});

test('serializes board submissions against locking the campaign', async () => {
  const context = await createTestContext();
  contexts.push(context);
  const owner = await createUserAndToken(context.api, '-locking');
  const created = await context.api
    .post('/api/campaigns')
    .set('Authorization', `Bearer ${owner.token}`)
    .send(campaignPayload());
  const campaign = created.body.campaign;

  await context.api
    .post(`/api/campaigns/${campaign.code}/publish`)
    .set('Authorization', `Bearer ${owner.token}`);

  const [lock, firstBoard, secondBoard] = await Promise.all([
    context.api
      .post(`/api/campaigns/${campaign.code}/lock`)
      .set('Authorization', `Bearer ${owner.token}`),
    context.api
      .post(`/api/campaigns/${campaign.code}/board`)
      .send(boardPayloadFor(campaign, 'Concurrent One')),
    context.api
      .post(`/api/campaigns/${campaign.code}/board`)
      .send(boardPayloadFor(campaign, 'Concurrent Two')),
  ]);

  assert.equal(lock.status, 200);
  assert.equal(lock.body.campaign.status, 'locked');
  assert.ok([201, 409].includes(firstBoard.status));
  assert.ok([201, 409].includes(secondBoard.status));

  const successfulConcurrentBoards = [firstBoard, secondBoard]
    .filter((response) => response.status === 201).length;
  const boardsAfterLock = await context.database.getCampaignBoards(campaign.code);
  assert.equal(boardsAfterLock.length, successfulConcurrentBoards);

  const lateBoard = await context.api
    .post(`/api/campaigns/${campaign.code}/board`)
    .send(boardPayloadFor(campaign, 'Too Late'));
  assert.equal(lateBoard.status, 409);
  assert.equal((await context.database.getCampaignBoards(campaign.code)).length, successfulConcurrentBoards);
});

test('stores owner-controlled item outcomes and returns them in board snapshots', async () => {
  const context = await createTestContext();
  contexts.push(context);
  const owner = await createUserAndToken(context.api, '-outcomes-owner');
  const otherUser = await createUserAndToken(context.api, '-outcomes-other');
  const created = await context.api
    .post('/api/campaigns')
    .set('Authorization', `Bearer ${owner.token}`)
    .send(campaignPayload());
  const campaign = created.body.campaign;
  const itemId = campaign.categories[0].items[0].id;
  const otherCampaignPayload = campaignPayload();
  otherCampaignPayload.title = 'Other Outcome Campaign';
  const otherCampaignResponse = await context.api
    .post('/api/campaigns')
    .set('Authorization', `Bearer ${owner.token}`)
    .send(otherCampaignPayload);
  const otherCampaignItemId = otherCampaignResponse.body.campaign.categories[0].items[0].id;

  await context.api
    .post(`/api/campaigns/${campaign.code}/publish`)
    .set('Authorization', `Bearer ${owner.token}`);
  const board = await context.api
    .post(`/api/campaigns/${campaign.code}/board`)
    .send(boardPayloadFor(campaign));

  const outcomePath = `/api/campaigns/${campaign.code}/items/${itemId}/outcome`;
  assert.equal((await context.api.post(outcomePath).send({ status: 'happened' })).status, 401);
  assert.equal((await context.api
    .post(outcomePath)
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ status: 'happened' })).status, 409);

  await context.api
    .post(`/api/campaigns/${campaign.code}/lock`)
    .set('Authorization', `Bearer ${owner.token}`);
  await context.api
    .post(`/api/campaigns/${campaign.code}/moderation`)
    .set('Authorization', `Bearer ${owner.token}`);

  const unauthorized = await context.api
    .post(outcomePath)
    .set('Authorization', `Bearer ${otherUser.token}`)
    .send({ status: 'happened' });
  assert.equal(unauthorized.status, 403);

  const invalidStatus = await context.api
    .post(outcomePath)
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ status: 'correct' });
  assert.equal(invalidStatus.status, 400);

  const missingItem = await context.api
    .post(`/api/campaigns/${campaign.code}/items/999999/outcome`)
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ status: 'happened' });
  assert.equal(missingItem.status, 404);

  const crossCampaignItem = await context.api
    .post(`/api/campaigns/${campaign.code}/items/${otherCampaignItemId}/outcome`)
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ status: 'happened' });
  assert.equal(crossCampaignItem.status, 404);

  const decided = await context.api
    .post(outcomePath)
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ status: 'happened' });
  assert.equal(decided.status, 200);
  assert.equal(decided.body.campaignVersion, 5);
  assert.deepEqual(decided.body.outcome, {
    itemId,
    status: 'happened',
    decidedAt: decided.body.outcome.decidedAt,
    decidedBy: owner.registration.body.id,
  });
  assert.ok(decided.body.outcome.decidedAt);

  const snapshot = await context.api.get(`/api/boards/${board.body.boardCode}`);
  const changedTile = snapshot.body.tiles.find((tile) => tile.categoryItemId === itemId);
  const centerTile = snapshot.body.tiles.find((tile) => tile.isCenter === 1);
  assert.deepEqual(changedTile.outcome, {
    status: 'happened',
    decidedAt: decided.body.outcome.decidedAt,
  });
  assert.deepEqual(centerTile.outcome, {
    status: 'happened',
    decidedAt: null,
  });
  assert.equal(Object.hasOwn(snapshot.body, 'userId'), false);
  assert.equal(Object.hasOwn(changedTile.outcome, 'decidedBy'), false);

  const publicCampaign = await context.api.get(`/api/campaigns/${campaign.code}`);
  const publicItem = publicCampaign.body.categories[0].items.find((item) => item.id === itemId);
  assert.equal(Object.hasOwn(publicCampaign.body, 'createdBy'), false);
  assert.equal(Object.hasOwn(publicItem, 'decidedBy'), false);
  assert.equal(publicItem.status, 'happened');

  const reverted = await context.api
    .post(outcomePath)
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ status: 'pending' });
  assert.equal(reverted.status, 200);
  assert.equal(reverted.body.campaignVersion, 6);
  assert.deepEqual(reverted.body.outcome, {
    itemId,
    status: 'pending',
    decidedAt: null,
    decidedBy: null,
  });

  await context.database.connection.run(
    `UPDATE campaigns
     SET status = 'completed', finalizedAt = ?, version = version + 1
     WHERE id = ?`,
    [new Date().toISOString(), campaign.id],
  );
  const afterCompletionBoundary = await context.api
    .post(outcomePath)
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ status: 'did_not_happen' });
  assert.equal(afterCompletionBoundary.status, 409);
});

test('finalizes once, resolves pending outcomes, and publishes deterministic results', async () => {
  const context = await createTestContext();
  contexts.push(context);
  const owner = await createUserAndToken(context.api, '-finalize-owner');
  const otherUser = await createUserAndToken(context.api, '-finalize-other');
  const created = await context.api
    .post('/api/campaigns')
    .set('Authorization', `Bearer ${owner.token}`)
    .send(campaignPayload());
  const campaign = created.body.campaign;
  const finalizePath = `/api/campaigns/${campaign.code}/finalize`;

  assert.equal((await context.api.post(finalizePath)).status, 401);
  assert.equal((await context.api
    .post(finalizePath)
    .set('Authorization', `Bearer ${owner.token}`)).status, 409);
  assert.equal((await context.api
    .post(finalizePath)
    .set('Authorization', `Bearer ${otherUser.token}`)).status, 403);

  await context.api
    .post(`/api/campaigns/${campaign.code}/publish`)
    .set('Authorization', `Bearer ${owner.token}`);
  const boardPayloads = [
    boardPayloadFor(campaign, 'Sam'),
    boardPayloadFor(campaign, 'Ada'),
    boardPayloadFor(campaign, 'Lee'),
  ];
  const leePositionTwo = boardPayloads[2].selectedTiles.find((tile) => tile.position === 2);
  const leePositionFive = boardPayloads[2].selectedTiles.find((tile) => tile.position === 5);
  [leePositionTwo.categoryItemId, leePositionFive.categoryItemId] = [
    leePositionFive.categoryItemId,
    leePositionTwo.categoryItemId,
  ];
  const boardResponses = [];
  for (const payload of boardPayloads) {
    boardResponses.push(await context.api
      .post(`/api/campaigns/${campaign.code}/board`)
      .send(payload));
  }
  assert.deepEqual(boardResponses.map((response) => response.status), [201, 201, 201]);

  await context.api
    .post(`/api/campaigns/${campaign.code}/lock`)
    .set('Authorization', `Bearer ${owner.token}`);
  await context.api
    .post(`/api/campaigns/${campaign.code}/moderation`)
    .set('Authorization', `Bearer ${owner.token}`);
  const moderating = await context.api
    .get(`/api/moderate/campaigns/${campaign.code}`)
    .set('Authorization', `Bearer ${owner.token}`);
  assert.deepEqual(moderating.body.allowedActions, ['finalize', 'cancel']);

  for (const item of campaign.categories[0].items.slice(0, 3)) {
    const outcome = await context.api
      .post(`/api/campaigns/${campaign.code}/items/${item.id}/outcome`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ status: 'happened' });
    assert.equal(outcome.status, 200);
  }

  const [firstFinalize, concurrentFinalize] = await Promise.all([
    context.api.post(finalizePath).set('Authorization', `Bearer ${owner.token}`),
    context.api.post(finalizePath).set('Authorization', `Bearer ${owner.token}`),
  ]);
  assert.equal(firstFinalize.status, 200);
  assert.equal(concurrentFinalize.status, 200);
  assert.deepEqual(
    [firstFinalize.body.pendingResolved, concurrentFinalize.body.pendingResolved].sort(),
    [0, 5],
  );
  assert.deepEqual(
    [firstFinalize.body.alreadyFinalized, concurrentFinalize.body.alreadyFinalized].sort(),
    [false, true],
  );
  assert.equal(firstFinalize.body.result.campaign.status, 'completed');
  assert.equal(firstFinalize.body.result.campaign.version, 8);
  assert.equal(firstFinalize.body.result.campaign.rulesVersion, 1);
  assert.deepEqual(firstFinalize.body.result.results.map((result) => ({
    playerName: result.playerName,
    rank: result.rank,
    sharedRank: result.sharedRank,
    longestRun: result.longestRun,
    completedLineCount: result.completedLineCount,
    matchedTileCount: result.matchedTileCount,
  })), [
    { playerName: 'Ada', rank: 1, sharedRank: true, longestRun: 3, completedLineCount: 1, matchedTileCount: 4 },
    { playerName: 'Sam', rank: 1, sharedRank: true, longestRun: 3, completedLineCount: 1, matchedTileCount: 4 },
    { playerName: 'Lee', rank: 3, sharedRank: false, longestRun: 2, completedLineCount: 0, matchedTileCount: 4 },
  ]);

  const storedCounts = await Promise.all([
    context.database.connection.get('SELECT COUNT(*) AS count FROM campaignResults'),
    context.database.connection.get('SELECT COUNT(*) AS count FROM boardResults'),
  ]);
  assert.deepEqual(storedCounts, [{ count: 1 }, { count: 3 }]);
  const outcomes = await context.database.connection.all(
    'SELECT status FROM campaignCategoryItems ORDER BY id',
  );
  assert.deepEqual(outcomes.map(({ status }) => status), [
    'happened',
    'happened',
    'happened',
    'did_not_happen',
    'did_not_happen',
    'did_not_happen',
    'did_not_happen',
    'did_not_happen',
  ]);

  const publicResults = await context.api.get(`/api/campaigns/${campaign.code}/results?page=1`);
  const repeatedRead = await context.api.get(`/api/campaigns/${campaign.code}/results?page=1`);
  assert.equal(publicResults.status, 200);
  assert.equal(JSON.stringify(repeatedRead.body), JSON.stringify(publicResults.body));
  assert.equal((await context.api.get(`/api/campaigns/${campaign.code}/results?page=0`)).status, 400);
  assert.equal((await context.api.get(`/api/campaigns/${campaign.code}/results?page=999999999999999999999`)).status, 400);
  assert.equal((await context.api.get('/api/campaigns/NONE/results')).status, 404);

  const boardSnapshot = await context.api.get(`/api/boards/${boardResponses[0].body.boardCode}`);
  assert.equal(boardSnapshot.body.campaignStatus, 'completed');
  assert.equal(boardSnapshot.body.campaignVersion, 8);
  assert.equal(
    boardSnapshot.body.tiles.filter((tile) => !tile.isCenter && tile.outcome.status === 'pending').length,
    0,
  );
  assert.equal(
    boardSnapshot.body.tiles.filter((tile) => tile.outcome.status === 'did_not_happen').length,
    5,
  );

  const blockedOutcome = await context.api
    .post(`/api/campaigns/${campaign.code}/items/${campaign.categories[0].items[0].id}/outcome`)
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ status: 'did_not_happen' });
  assert.equal(blockedOutcome.status, 409);
  assert.equal((await context.api
    .delete(`/api/campaigns/${campaign.code}`)
    .set('Authorization', `Bearer ${owner.token}`)).status, 409);

  const repeatedFinalize = await context.api
    .post(finalizePath)
    .set('Authorization', `Bearer ${owner.token}`);
  assert.equal(repeatedFinalize.status, 200);
  assert.equal(repeatedFinalize.body.alreadyFinalized, true);
  assert.deepEqual(repeatedFinalize.body.result, publicResults.body);

  const metrics = await context.api.get('/api/metrics');
  assert.match(metrics.text, /bongii_finalization_duration_seconds_count 5/);
  const duration = Number(metrics.text.match(
    /bongii_finalization_duration_seconds_sum ([\d.]+)/,
  )[1]);
  assert.ok(duration > 0);

  await context.restart();
  const afterRestart = await context.api.get(`/api/campaigns/${campaign.code}/results?page=1`);
  assert.equal(afterRestart.status, 200);
  assert.equal(JSON.stringify(afterRestart.body), JSON.stringify(publicResults.body));
});

test('paginates finalized results without losing shared ranks at a page boundary', async () => {
  const context = await createTestContext();
  contexts.push(context);
  const owner = await createUserAndToken(context.api, '-result-pages');
  const created = await context.api
    .post('/api/campaigns')
    .set('Authorization', `Bearer ${owner.token}`)
    .send(campaignPayload());
  const campaign = created.body.campaign;

  await context.api
    .post(`/api/campaigns/${campaign.code}/publish`)
    .set('Authorization', `Bearer ${owner.token}`);
  for (let index = 1; index <= 21; index += 1) {
    const board = await context.api
      .post(`/api/campaigns/${campaign.code}/board`)
      .send(boardPayloadFor(campaign, `Player ${String(index).padStart(2, '0')}`));
    assert.equal(board.status, 201);
  }
  await context.api
    .post(`/api/campaigns/${campaign.code}/lock`)
    .set('Authorization', `Bearer ${owner.token}`);
  await context.api
    .post(`/api/campaigns/${campaign.code}/moderation`)
    .set('Authorization', `Bearer ${owner.token}`);
  const finalized = await context.api
    .post(`/api/campaigns/${campaign.code}/finalize`)
    .set('Authorization', `Bearer ${owner.token}`);
  assert.equal(finalized.status, 200);

  const firstPage = await context.api.get(`/api/campaigns/${campaign.code}/results?page=1`);
  const secondPage = await context.api.get(`/api/campaigns/${campaign.code}/results?page=2`);
  assert.deepEqual(firstPage.body.pagination, {
    page: 1,
    pageSize: 20,
    totalItems: 21,
    totalPages: 2,
  });
  assert.deepEqual(secondPage.body.pagination, {
    page: 2,
    pageSize: 20,
    totalItems: 21,
    totalPages: 2,
  });
  assert.equal(firstPage.body.results.length, 20);
  assert.equal(secondPage.body.results.length, 1);
  assert.equal(secondPage.body.results[0].playerName, 'Player 21');
  assert.equal(secondPage.body.results[0].rank, 1);
  assert.equal(secondPage.body.results[0].sharedRank, true);
});

test('finalizes a campaign with no submitted boards', async () => {
  const context = await createTestContext();
  contexts.push(context);
  const owner = await createUserAndToken(context.api, '-zero-boards');
  const created = await context.api
    .post('/api/campaigns')
    .set('Authorization', `Bearer ${owner.token}`)
    .send(campaignPayload());
  const campaign = created.body.campaign;

  await context.api
    .post(`/api/campaigns/${campaign.code}/publish`)
    .set('Authorization', `Bearer ${owner.token}`);
  await context.api
    .post(`/api/campaigns/${campaign.code}/lock`)
    .set('Authorization', `Bearer ${owner.token}`);
  await context.api
    .post(`/api/campaigns/${campaign.code}/moderation`)
    .set('Authorization', `Bearer ${owner.token}`);
  const finalized = await context.api
    .post(`/api/campaigns/${campaign.code}/finalize`)
    .set('Authorization', `Bearer ${owner.token}`);

  assert.equal(finalized.status, 200);
  assert.equal(finalized.body.pendingResolved, 8);
  assert.deepEqual(finalized.body.result.results, []);
  assert.deepEqual(finalized.body.result.pagination, {
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 1,
  });
  const storedBoardResults = await context.database.connection.get(
    'SELECT COUNT(*) AS count FROM boardResults',
  );
  assert.equal(storedBoardResults.count, 0);
});

test('does not expose credentials or the former cleanup route', async () => {
  const context = await createTestContext();
  contexts.push(context);
  const { token } = await createUserAndToken(context.api, '-safe');

  const profile = await context.api
    .get('/api/users/current')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(profile.status, 200);
  assert.equal(Object.hasOwn(profile.body, 'password'), false);

  const users = await context.api
    .get('/api/users')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(users.status, 200);
  assert.equal(Object.hasOwn(users.body[0], 'password'), false);

  const cleanup = await context.api.post('/api/clean');
  assert.equal(cleanup.status, 404);
});

test('does not expose legacy password authentication or storage', async () => {
  const context = await createTestContext();
  contexts.push(context);

  assert.equal((await context.api.post('/api/login').send({})).status, 404);
  assert.equal((await context.api.post('/api/users').send({})).status, 404);
  const columns = await context.database.connection.all('PRAGMA table_info(users)');
  assert.equal(columns.some((column) => column.name === 'password'), false);
});