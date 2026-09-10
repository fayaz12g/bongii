const { randomUUID } = require('node:crypto');
const { EventEmitter } = require('node:events');
const http = require('node:http');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const { DomainError } = require('./db');
const { createFirebaseTokenVerifier } = require('./firebaseAuth');
const { MetricsRegistry } = require('./metrics');
const { createRealtimeServer } = require('./realtime');
const { createRouter } = require('./routes');

const createApp = ({
  database,
  config,
  campaignEvents,
  firebaseTokenVerifier = createFirebaseTokenVerifier(config),
  logger = console,
  metrics = new MetricsRegistry(),
}) => {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      callback(null, !origin || config.allowedOrigins.includes(origin));
    },
    exposedHeaders: ['X-Request-Id'],
  }));
  app.use((req, res, next) => {
    const requestId = randomUUID();
    const startedAt = Date.now();
    req.requestId = requestId;
    res.set('X-Request-Id', requestId);
    res.once('finish', () => {
      metrics.recordHttpRequest(res.statusCode);
      logger.info('HTTP request completed', {
        durationMs: Date.now() - startedAt,
        method: req.method,
        path: req.route?.path || req.path.slice(0, 200),
        requestId,
        statusCode: res.statusCode,
      });
    });
    next();
  });
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', createRouter({
    database,
    config,
    campaignEvents,
    firebaseTokenVerifier,
    metrics,
  }));

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
    logger.error('HTTP request failed', {
      errorName: error.name || 'Error',
      requestId: req.requestId,
    });
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
};

const createApiServer = ({ database, config, logger = console, firebaseTokenVerifier }) => {
  const campaignEvents = new EventEmitter();
  const metrics = new MetricsRegistry();
  const app = createApp({
    database,
    config,
    campaignEvents,
    firebaseTokenVerifier,
    logger,
    metrics,
  });
  const server = http.createServer(app);
  const realtime = createRealtimeServer({
    server,
    database,
    config,
    campaignEvents,
    logger,
    metrics,
  });
  return { app, campaignEvents, metrics, realtime, server };
};

module.exports = { createApiServer, createApp };