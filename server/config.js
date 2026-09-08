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

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parsePort(process.env.PORT),
  databasePath: process.env.DATABASE_PATH || path.join(__dirname, 'data', 'bongii.db'),
  jwtSecret: process.env.JWT_SECRET,
  allowedOrigins: parseOrigins(process.env.CLIENT_ORIGINS),
};

config.validate = () => {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is required');
  }
};

module.exports = config;