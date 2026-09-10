require('dotenv').config();

const path = require('path');

const parsePort = (value) => {
  const port = Number(value || 3000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return port;
};

const parseOrigins = (value) => (value || 'http://localhost:3001')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isExactHttpOrigin = (origin) => {
  try {
    const parsed = new URL(origin);
    return ['http:', 'https:'].includes(parsed.protocol) && parsed.origin === origin;
  } catch {
    return false;
  }
};

const parsePrivateKey = (value) => value?.replace(/\\n/g, '\n');
const nodeEnv = process.env.NODE_ENV || 'development';

const config = {
  nodeEnv,
  port: parsePort(process.env.PORT),
  databasePath: process.env.DATABASE_PATH || path.join(__dirname, 'data', 'bongii.db'),
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  firebasePrivateKey: parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
  firebaseAuthEmulatorHost: process.env.FIREBASE_AUTH_EMULATOR_HOST,
  enableDebugTokenPurchase: process.env.ENABLE_DEBUG_TOKEN_PURCHASE === undefined
    ? nodeEnv !== 'production'
    : process.env.ENABLE_DEBUG_TOKEN_PURCHASE === 'true',
  allowedOrigins: parseOrigins(process.env.CLIENT_ORIGINS),
};

config.validate = () => {
  if (!config.firebaseProjectId) {
    throw new Error('FIREBASE_PROJECT_ID is required');
  }
  if (Boolean(config.firebaseClientEmail) !== Boolean(config.firebasePrivateKey)) {
    throw new Error('FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY must be set together');
  }
  if (config.allowedOrigins.length === 0
    || config.allowedOrigins.some((origin) => !isExactHttpOrigin(origin))) {
    throw new Error('CLIENT_ORIGINS must contain exact HTTP(S) origins without paths or wildcards');
  }
};

module.exports = config;
module.exports.isExactHttpOrigin = isExactHttpOrigin;
module.exports.parseOrigins = parseOrigins;
module.exports.parsePrivateKey = parsePrivateKey;