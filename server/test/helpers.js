const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const { createApp } = require('../app');
const { freeCenterPosition, hasFreeCenter } = require('../boardRules');
const { BongiiDatabase } = require('../db');

const testConfig = {
  firebaseProjectId: 'bongii-test',
  enableDebugTokenPurchase: true,
  allowedOrigins: ['http://localhost:3001'],
};
const testLogger = {
  error() {},
  info() {},
};
const verifyTestFirebaseToken = async (token) => {
  const prefix = 'test-firebase-token:';
  if (!token.startsWith(prefix)) throw new Error('Rejected test token');
  const username = token.slice(prefix.length);
  if (!username) throw new Error('Rejected test token');
  return {
    uid: `firebase-${username}`,
    email: `${username}@example.com`,
    email_verified: true,
    name: 'Test Moderator',
  };
};

const createTestContext = async ({
  config = testConfig,
  firebaseTokenVerifier = verifyTestFirebaseToken,
  logger = testLogger,
} = {}) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bongii-test-'));
  const databasePath = path.join(directory, 'test.db');
  const database = await BongiiDatabase.open(databasePath);
  const context = {
    api: request(createApp({ database, config, firebaseTokenVerifier, logger })),
    database,
    databasePath,
    async restart() {
      await context.database.close();
      context.database = await BongiiDatabase.open(databasePath);
      context.api = request(createApp({
        database: context.database,
        config,
        firebaseTokenVerifier,
        logger,
      }));
    },
    async cleanup() {
      await context.database.close();
      fs.rmSync(directory, { recursive: true, force: true });
    },
  };
  return context;
};

const createUserAndToken = async (api, suffix = '') => {
  const username = `moderator${suffix}`;
  const token = `test-firebase-token:${username}`;
  const profile = await api
    .get('/api/users/current')
    .set('Authorization', `Bearer ${token}`);

  return { login: profile, registration: profile, token, username };
};

const campaignPayload = () => ({
  title: 'Phase Zero Campaign',
  description: 'An API integration fixture',
  backgroundPreset: {
    id: 1,
    name: 'Ocean Waves',
    gradient: 'from-blue-400 via-blue-600 to-purple-700',
    animation: 'wave',
  },
  boardSize: 3,
  startDateTime: '2026-09-08 19:00:00',
  categories: [{
    name: 'Predictions',
    type: 'choose_many',
    required: true,
    items: Array.from({ length: 8 }, (_, index) => `Prediction ${index + 1}`),
  }],
});

const boardPayloadFor = (campaign, playerName = 'Player One') => {
  const itemIds = campaign.categories[0].items.map((item) => item.id);
  let itemIndex = 0;
  const selectedTiles = Array.from({ length: campaign.boardSize ** 2 }, (_, position) => (
    hasFreeCenter(campaign.boardSize) && position === freeCenterPosition(campaign.boardSize)
      ? { position, isCenter: true, categoryItemId: null, customText: 'FREE SPACE' }
      : { position, isCenter: false, categoryItemId: itemIds[itemIndex++] }
  ));
  return { playerName, selectedTiles };
};

module.exports = {
  boardPayloadFor,
  campaignPayload,
  createTestContext,
  createUserAndToken,
  verifyTestFirebaseToken,
};