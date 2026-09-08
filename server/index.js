const { createApp } = require('./app');
const config = require('./config');
const { BongiiDatabase } = require('./db');

const start = async () => {
  config.validate();
  const database = await BongiiDatabase.open(config.databasePath);
  const app = createApp({ database, config });
  const server = app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
  });

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    server.close(async (error) => {
      try {
        await database.close();
      } finally {
        process.exit(error ? 1 : 0);
      }
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  return { app, database, server };
};

if (require.main === module) {
  start().catch((error) => {
    console.error('Unable to start server:', error);
    process.exit(1);
  });
}

module.exports = { start };