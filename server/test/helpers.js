const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const { createApp } = require('../app');
const { BongiiDatabase } = require('../db');

const testConfig = {
  authMode: 'legacy',
  jwtSecret: 'phase-zero-test-secret',
  allowedOrigins: ['http://localhost:3001'],
};

const createTestContext = async ({
  config = testConfig,
  firebaseTokenVerifier,
} = {}) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bongii-test-'));
  const databasePath = path.join(directory, 'test.db');
  const database = await BongiiDatabase.open(databasePath);
  const context = {
    api: request(createApp({ database, config, firebaseTokenVerifier })),
    database,
    databasePath,
    async restart() {
      await context.database.close();
      context.database = await BongiiDatabase.open(databasePath);
      context.api = request(createApp({
        database: context.database,
        config,
        firebaseTokenVerifier,
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
  const password = 'secure-password';
  const registration = await api.post('/api/users').send({
    username,
    password,
    firstName: 'Test',
    lastName: 'Moderator',
    email: `${username}@example.com`,
    profileIcon: '1',
  });
  const login = await api.post('/api/login').send({ username, password });

  return { login, registration, token: login.body.token, username };
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
    position === Math.floor((campaign.boardSize ** 2) / 2)
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
};