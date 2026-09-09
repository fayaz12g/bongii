const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { afterEach, test } = require('node:test');
const { createTestContext, createUserAndToken } = require('./helpers');

const contexts = [];
const hybridConfig = {
  authMode: 'hybrid',
  jwtSecret: 'firebase-hybrid-test-secret',
  firebaseProjectId: 'bongii-test',
  allowedOrigins: ['http://localhost:3001'],
};

const tokenFor = (marker) => jwt.sign({
  iss: 'https://securetoken.google.com/bongii-test',
  marker,
}, 'routing-only');

const identities = {
  legacy: {
    uid: 'firebase-legacy-owner',
    email: 'owner@example.com',
    email_verified: true,
    name: 'Updated Owner',
    picture: 'https://lh3.googleusercontent.com/avatar',
  },
  new: {
    uid: 'firebase-new-user',
    email: 'new@example.com',
    email_verified: true,
    name: 'New User',
  },
  collision: {
    uid: 'firebase-colliding-user',
    email: 'new@example.com',
    email_verified: true,
    name: 'Colliding User',
  },
  unverified: {
    uid: 'firebase-unverified',
    email: 'unverified@example.com',
    email_verified: false,
    name: 'Unverified User',
  },
  duplicate: {
    uid: 'firebase-duplicate',
    email: 'duplicate@example.com',
    email_verified: true,
    name: 'Duplicate User',
  },
};

const verifyFirebaseToken = async (token) => {
  const marker = jwt.decode(token)?.marker;
  if (!identities[marker]) throw new Error('Rejected test token');
  return identities[marker];
};

afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => context.cleanup()));
});

test('links a verified Firebase identity to one legacy user without changing ownership', async () => {
  const context = await createTestContext({
    config: hybridConfig,
    firebaseTokenVerifier: verifyFirebaseToken,
  });
  contexts.push(context);
  const legacyUser = await context.database.addUser({
    username: 'owner',
    password: 'legacy-password',
    firstName: 'Original',
    lastName: 'Owner',
    email: 'OWNER@example.com',
    profileIcon: '2',
  });
  await context.database.connection.run(
    `INSERT INTO campaigns
      (code, title, backgroundPreset, boardSize, startDateTime, status, createdBy, createdAt)
     VALUES ('LINK', 'Linked campaign', 1, 3, '2026-09-09', 'draft', ?, '2026-09-09')`,
    [legacyUser.id],
  );

  const response = await context.api
    .get('/api/users/current')
    .set('Authorization', `Bearer ${tokenFor('legacy')}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.id, legacyUser.id);
  assert.equal(response.body.displayName, 'Updated Owner');
  assert.equal(response.body.photoUrl, 'https://lh3.googleusercontent.com/avatar');

  const linkedUser = await context.database.getUser(legacyUser.id);
  assert.equal(linkedUser.firebaseUid, 'firebase-legacy-owner');
  assert.equal(linkedUser.legacyUsername, 'owner');
  assert.equal(linkedUser.password, null);
  const campaign = await context.database.getCampaignByCode('LINK');
  assert.equal(campaign.createdBy, legacyUser.id);
});

test('reuses one local profile for repeated Firebase sign-ins', async () => {
  const context = await createTestContext({
    config: hybridConfig,
    firebaseTokenVerifier: verifyFirebaseToken,
  });
  contexts.push(context);

  const first = await context.api
    .get('/api/users/current')
    .set('Authorization', `Bearer ${tokenFor('new')}`);
  const second = await context.api
    .get('/api/users/current')
    .set('Authorization', `bearer ${tokenFor('new')}`);

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(second.body.id, first.body.id);

  const updated = await context.api
    .put('/api/users/current')
    .set('Authorization', `Bearer ${tokenFor('new')}`)
    .send({ displayName: 'Renamed User', profileIcon: '3' });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.displayName, 'Renamed User');
  assert.equal(updated.body.profileIcon, '3');
  assert.equal(updated.body.email, 'new@example.com');

  const count = await context.database.connection.get(
    'SELECT COUNT(*) AS count FROM users WHERE firebaseUid = ?',
    ['firebase-new-user'],
  );
  assert.equal(count.count, 1);

  const collision = await context.api
    .get('/api/users/current')
    .set('Authorization', `Bearer ${tokenFor('collision')}`);
  assert.equal(collision.status, 409);
  const countAfterCollision = await context.database.connection.get(
    'SELECT COUNT(*) AS count FROM users WHERE email = ?',
    ['new@example.com'],
  );
  assert.equal(countAfterCollision.count, 1);
});

test('requires verified email and refuses ambiguous legacy links', async () => {
  const context = await createTestContext({
    config: hybridConfig,
    firebaseTokenVerifier: verifyFirebaseToken,
  });
  contexts.push(context);
  for (const username of ['duplicate-one', 'duplicate-two']) {
    await context.database.addUser({
      username,
      password: 'legacy-password',
      firstName: 'Duplicate',
      lastName: 'User',
      email: 'duplicate@example.com',
      profileIcon: '1',
    });
  }

  const unverified = await context.api
    .get('/api/users/current')
    .set('Authorization', `Bearer ${tokenFor('unverified')}`);
  assert.equal(unverified.status, 403);

  const duplicate = await context.api
    .get('/api/users/current')
    .set('Authorization', `Bearer ${tokenFor('duplicate')}`);
  assert.equal(duplicate.status, 409);
  const linked = await context.database.connection.get(
    'SELECT COUNT(*) AS count FROM users WHERE firebaseUid IS NOT NULL',
  );
  assert.equal(linked.count, 0);
});

test('returns 401 for malformed, revoked, expired, and wrong-project tokens', async () => {
  const context = await createTestContext({
    config: hybridConfig,
    firebaseTokenVerifier: verifyFirebaseToken,
  });
  contexts.push(context);

  for (const token of [
    'malformed',
    tokenFor('revoked'),
    tokenFor('expired'),
    tokenFor('wrong-project'),
  ]) {
    const response = await context.api
      .get('/api/users/current')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(response.status, 401);
  }
});

test('hybrid mode accepts legacy sessions during the migration window', async () => {
  const context = await createTestContext({
    config: hybridConfig,
    firebaseTokenVerifier: verifyFirebaseToken,
  });
  contexts.push(context);
  const { token } = await createUserAndToken(context.api, '-hybrid');

  const response = await context.api
    .get('/api/users/current')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(response.status, 200);
});