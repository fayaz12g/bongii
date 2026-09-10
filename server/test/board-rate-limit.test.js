const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createBoardCreationRateLimit } = require('../boardCreationRateLimit');

const invoke = (middleware, { campaignCode = 'TEST', ip = '127.0.0.1' } = {}) => {
  const response = {
    body: null,
    headers: {},
    statusCode: null,
    set(name, value) {
      this.headers[name] = value;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
    },
  };
  let continued = false;
  middleware({ ip, params: { code: campaignCode } }, response, () => {
    continued = true;
  });
  return { continued, response };
};

test('limits board creation per IP and campaign and resets after the window', () => {
  let now = 1000;
  const middleware = createBoardCreationRateLimit({
    clock: () => now,
    windowMs: 1000,
    perIpCampaignLimit: 2,
    perCampaignLimit: 10,
  });

  assert.equal(invoke(middleware).continued, true);
  assert.equal(invoke(middleware).continued, true);
  const limited = invoke(middleware);
  assert.equal(limited.continued, false);
  assert.equal(limited.response.statusCode, 429);
  assert.equal(limited.response.headers['Retry-After'], '1');

  assert.equal(invoke(middleware, { ip: '127.0.0.2' }).continued, true);
  now = 2000;
  assert.equal(invoke(middleware).continued, true);
});

test('limits aggregate board creation for one campaign', () => {
  const middleware = createBoardCreationRateLimit({
    perIpCampaignLimit: 10,
    perCampaignLimit: 2,
  });

  assert.equal(invoke(middleware, { ip: '127.0.0.1' }).continued, true);
  assert.equal(invoke(middleware, { ip: '127.0.0.2' }).continued, true);
  assert.equal(invoke(middleware, { ip: '127.0.0.3' }).response.statusCode, 429);
});