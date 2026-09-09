const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { afterEach, test } = require('node:test');
const request = require('supertest');
const { io: createSocket } = require('socket.io-client');
const { createApiServer } = require('../app');
const { BongiiDatabase } = require('../db');
const { boardPayloadFor, campaignPayload, createUserAndToken } = require('./helpers');

const contexts = [];
const testConfig = {
  jwtSecret: 'phase-two-socket-test-secret',
  allowedOrigins: [
    'http://localhost:3001',
    'https://bongii-preview-example.vercel.app',
  ],
};

const createSocketContext = async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bongii-socket-test-'));
  const database = await BongiiDatabase.open(path.join(directory, 'test.db'));
  const telemetry = [];
  const logger = {
    error(message, details) {
      telemetry.push({ level: 'error', message, ...details });
    },
    info(message, details) {
      telemetry.push({ level: 'info', message, ...details });
    },
  };
  const runtime = createApiServer({ database, config: testConfig, logger });
  runtime.server.listen(0, '127.0.0.1');
  await once(runtime.server, 'listening');
  const address = runtime.server.address();
  const url = `http://127.0.0.1:${address.port}`;
  const sockets = [];

  return {
    api: request(runtime.server),
    database,
    telemetry,
    openSocket({ origin } = {}) {
      const socket = createSocket(url, {
        autoConnect: false,
        extraHeaders: origin ? { Origin: origin } : undefined,
        reconnection: false,
        transports: ['websocket'],
      });
      sockets.push(socket);
      return socket;
    },
    async cleanup() {
      sockets.forEach((socket) => socket.disconnect());
      await runtime.realtime.close();
      await database.close();
      fs.rmSync(directory, { recursive: true, force: true });
    },
  };
};

const connect = async (socket) => {
  socket.connect();
  await once(socket, 'connect');
};

const joinCampaign = (socket, campaignCode) => socket
  .timeout(2000)
  .emitWithAck('campaign:join', { campaignCode });

afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => context.cleanup()));
});

test('publishes committed status and outcome events to campaign viewers', async () => {
  const context = await createSocketContext();
  contexts.push(context);
  const owner = await createUserAndToken(context.api, '-socket-owner');
  const created = await context.api
    .post('/api/campaigns')
    .set('Authorization', `Bearer ${owner.token}`)
    .send(campaignPayload());
  const campaign = created.body.campaign;
  const itemId = campaign.categories[0].items[0].id;

  await context.api
    .post(`/api/campaigns/${campaign.code}/publish`)
    .set('Authorization', `Bearer ${owner.token}`);
  const board = await context.api
    .post(`/api/campaigns/${campaign.code}/board`)
    .send(boardPayloadFor(campaign));

  const firstViewer = context.openSocket();
  const secondViewer = context.openSocket();
  await Promise.all([connect(firstViewer), connect(secondViewer)]);
  const joins = await Promise.all([
    joinCampaign(firstViewer, campaign.code.toLowerCase()),
    joinCampaign(secondViewer, campaign.code),
  ]);
  assert.deepEqual(joins, [
    { ok: true, campaignCode: campaign.code, campaignVersion: 2 },
    { ok: true, campaignCode: campaign.code, campaignVersion: 2 },
  ]);

  const statusEventPromise = once(firstViewer, 'campaign:status');
  const statusInvalidationPromise = once(firstViewer, 'campaign:snapshot-invalidated');
  const locked = await context.api
    .post(`/api/campaigns/${campaign.code}/lock`)
    .set('Authorization', `Bearer ${owner.token}`);
  assert.equal(locked.status, 200);
  assert.deepEqual((await statusEventPromise)[0], {
    type: 'campaignStatus',
    campaignCode: campaign.code,
    campaignVersion: 3,
    status: 'locked',
  });
  assert.deepEqual((await statusInvalidationPromise)[0], {
    type: 'snapshotInvalidated',
    campaignCode: campaign.code,
    campaignVersion: 3,
    reason: 'status.changed',
  });

  await context.api
    .post(`/api/campaigns/${campaign.code}/moderation`)
    .set('Authorization', `Bearer ${owner.token}`);

  const firstOutcomePromise = once(firstViewer, 'campaign:outcome');
  const secondOutcomePromise = once(secondViewer, 'campaign:outcome');
  const outcomeInvalidationPromise = once(firstViewer, 'campaign:snapshot-invalidated');
  const decided = await context.api
    .post(`/api/campaigns/${campaign.code}/items/${itemId}/outcome`)
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ status: 'did_not_happen' });
  assert.equal(decided.status, 200);

  const expectedOutcomeEvent = {
    type: 'itemOutcome',
    campaignCode: campaign.code,
    campaignVersion: 5,
    itemId,
    status: 'did_not_happen',
    decidedAt: decided.body.outcome.decidedAt,
  };
  assert.deepEqual((await firstOutcomePromise)[0], expectedOutcomeEvent);
  assert.deepEqual((await secondOutcomePromise)[0], expectedOutcomeEvent);
  assert.deepEqual((await outcomeInvalidationPromise)[0], {
    type: 'snapshotInvalidated',
    campaignCode: campaign.code,
    campaignVersion: 5,
    reason: 'outcome.updated',
  });

  const snapshot = await context.api.get(`/api/boards/${board.body.boardCode}`);
  const changedTile = snapshot.body.tiles.find((tile) => tile.categoryItemId === itemId);
  assert.equal(snapshot.body.campaignVersion, 5);
  assert.equal(changedTile.outcome.status, 'did_not_happen');
  assert.equal(context.telemetry.some(({ state }) => state === 'connected'), true);
  assert.equal(context.telemetry.filter(({ state }) => state === 'joined').length, 2);

  const finalizedEventPromise = once(firstViewer, 'campaign:finalized');
  const finalizedInvalidationPromise = once(firstViewer, 'campaign:snapshot-invalidated');
  const finalized = await context.api
    .post(`/api/campaigns/${campaign.code}/finalize`)
    .set('Authorization', `Bearer ${owner.token}`);
  assert.equal(finalized.status, 200);
  assert.deepEqual((await finalizedEventPromise)[0], {
    type: 'campaignFinalized',
    campaignCode: campaign.code,
    campaignVersion: 6,
    status: 'completed',
    finalizedAt: finalized.body.finalizedAt,
    leaderboardPath: `/leaderboards/${campaign.code}`,
  });
  assert.deepEqual((await finalizedInvalidationPromise)[0], {
    type: 'snapshotInvalidated',
    campaignCode: campaign.code,
    campaignVersion: 6,
    reason: 'campaign.finalized',
  });
  const results = await context.api.get(`/api/campaigns/${campaign.code}/results`);
  assert.equal(results.status, 200);
  assert.equal(results.body.campaign.version, 6);
  assert.equal(results.body.results.length, 1);
});

test('returns the authoritative version and snapshot after a viewer reconnects', async () => {
  const context = await createSocketContext();
  contexts.push(context);
  const owner = await createUserAndToken(context.api, '-socket-reconnect');
  const created = await context.api
    .post('/api/campaigns')
    .set('Authorization', `Bearer ${owner.token}`)
    .send(campaignPayload());
  const campaign = created.body.campaign;
  const itemId = campaign.categories[0].items[0].id;

  await context.api
    .post(`/api/campaigns/${campaign.code}/publish`)
    .set('Authorization', `Bearer ${owner.token}`);
  const board = await context.api
    .post(`/api/campaigns/${campaign.code}/board`)
    .send(boardPayloadFor(campaign));
  await context.api
    .post(`/api/campaigns/${campaign.code}/lock`)
    .set('Authorization', `Bearer ${owner.token}`);
  await context.api
    .post(`/api/campaigns/${campaign.code}/moderation`)
    .set('Authorization', `Bearer ${owner.token}`);

  const viewer = context.openSocket();
  await connect(viewer);
  assert.deepEqual(await joinCampaign(viewer, campaign.code), {
    ok: true,
    campaignCode: campaign.code,
    campaignVersion: 4,
  });
  viewer.disconnect();

  const decided = await context.api
    .post(`/api/campaigns/${campaign.code}/items/${itemId}/outcome`)
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ status: 'happened' });
  assert.equal(decided.body.campaignVersion, 5);

  await connect(viewer);
  assert.deepEqual(await joinCampaign(viewer, campaign.code), {
    ok: true,
    campaignCode: campaign.code,
    campaignVersion: 5,
  });
  const snapshot = await context.api.get(`/api/boards/${board.body.boardCode}`);
  assert.equal(snapshot.body.campaignVersion, 5);
  assert.equal(
    snapshot.body.tiles.find((tile) => tile.categoryItemId === itemId).outcome.status,
    'happened',
  );
});

test('allows only configured exact browser origins', async () => {
  const context = await createSocketContext();
  contexts.push(context);
  const allowedOrigin = 'https://bongii-preview-example.vercel.app';
  const rejectedOrigin = `${allowedOrigin}.example.com`;

  const allowedHealth = await context.api.get('/api/health').set('Origin', allowedOrigin);
  assert.equal(allowedHealth.headers['access-control-allow-origin'], allowedOrigin);
  const rejectedHealth = await context.api.get('/api/health').set('Origin', rejectedOrigin);
  assert.equal(rejectedHealth.headers['access-control-allow-origin'], undefined);

  const allowedSocket = context.openSocket({ origin: allowedOrigin });
  await connect(allowedSocket);

  const rejectedSocket = context.openSocket({ origin: rejectedOrigin });
  const connectionError = once(rejectedSocket, 'connect_error');
  rejectedSocket.connect();
  const [error] = await connectionError;
  assert.ok(error instanceof Error);
  assert.equal(rejectedSocket.connected, false);
});

test('rejects invalid rooms and exposes no socket outcome mutation', async () => {
  const context = await createSocketContext();
  contexts.push(context);
  const owner = await createUserAndToken(context.api, '-socket-read-only');
  const created = await context.api
    .post('/api/campaigns')
    .set('Authorization', `Bearer ${owner.token}`)
    .send(campaignPayload());
  const campaign = created.body.campaign;
  const itemId = campaign.categories[0].items[0].id;
  const socket = context.openSocket();
  await connect(socket);

  assert.deepEqual(await joinCampaign(socket, 'bad'), {
    ok: false,
    error: 'Campaign code must contain four letters',
  });
  assert.deepEqual(await joinCampaign(socket, campaign.code), {
    ok: false,
    error: 'Campaign not found',
  });

  socket.emit('campaign:outcome', {
    campaignCode: campaign.code,
    itemId,
    status: 'happened',
  });
  const storedItem = await context.database.connection.get(
    'SELECT status, decidedAt, decidedBy FROM campaignCategoryItems WHERE id = ?',
    [itemId],
  );
  assert.deepEqual(storedItem, {
    status: 'pending',
    decidedAt: null,
    decidedBy: null,
  });
  assert.equal(
    context.telemetry.some(({ state, reason }) => (
      state === 'join_rejected' && reason === 'invalid_code'
    )),
    true,
  );
  assert.equal(JSON.stringify(context.telemetry).includes(owner.token), false);
  assert.equal(JSON.stringify(context.telemetry).includes(campaign.code), false);
});