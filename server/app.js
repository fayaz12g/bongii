const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const { DomainError } = require('./db');
const { createRouter } = require('./routes');

const createApp = ({ database, config }) => {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      callback(null, !origin || config.allowedOrigins.includes(origin));
    },
  }));
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', createRouter({ database, config }));

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    if (error instanceof DomainError || error.statusCode) {
      res.status(error.statusCode || 400).json({ error: error.message });
      return;
    }
    console.error('Unhandled request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
};

module.exports = { createApp };