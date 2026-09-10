const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bongii-playwright-'));

process.env.CLIENT_ORIGINS = 'http://localhost:43901';
process.env.DATABASE_PATH = path.join(directory, 'bongii.db');
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:44099';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:44199';
process.env.FIREBASE_PROJECT_ID = 'demo-bongii';
process.env.ENABLE_DEBUG_TOKEN_PURCHASE = 'true';
process.env.PORT = '43900';

const { createApiServer } = require('../app');
const config = require('../config');
const { BongiiDatabase } = require('../db');

const start = async () => {
  config.validate();
  const database = await BongiiDatabase.open(config.databasePath);
  const runtime = createApiServer({ database, config });
  runtime.server.listen(config.port, '127.0.0.1', () => {
    console.log(`Playwright API is running on port ${config.port}`);
  });

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    await runtime.realtime.close().catch(() => {});
    await database.close().catch(() => {});
    fs.rmSync(directory, { recursive: true, force: true });
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
};

start().catch((error) => {
  fs.rmSync(directory, { recursive: true, force: true });
  console.error('Unable to start Playwright API:', error);
  process.exit(1);
});