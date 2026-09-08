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

test('creates a campaign and a complete board through the API', async () => {
  const context = await createTestContext();
  contexts.push(context);
  const { registration, login, token } = await createUserAndToken(context.api);

  assert.equal(registration.status, 201);
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

test('upgrades a legacy plaintext password after a successful login', async () => {
  const context = await createTestContext();
  contexts.push(context);
  await context.database.addUser({
    username: 'legacy-user',
    password: 'legacy-password',
    firstName: 'Legacy',
    lastName: 'User',
    email: 'legacy@example.com',
    profileIcon: '1',
  });

  const rejectedLogin = await context.api.post('/api/login').send({
    username: 'legacy-user',
    password: 'wrong-password',
  });
  assert.equal(rejectedLogin.status, 401);

  const unchangedUser = await context.database.getUserByUsername('legacy-user');
  assert.equal(unchangedUser.password, 'legacy-password');

  const login = await context.api.post('/api/login').send({
    username: 'legacy-user',
    password: 'legacy-password',
  });
  assert.equal(login.status, 200);

  const upgradedUser = await context.database.getUserByUsername('legacy-user');
  assert.match(upgradedUser.password, /^\$2[aby]\$/);
});