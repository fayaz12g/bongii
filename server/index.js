const { createApiServer } = require('./app');
const config = require('./config');
const { BongiiDatabase } = require('./db');

const start = async () => {
  config.validate();
  const database = await BongiiDatabase.open(config.databasePath);
  const { app, realtime, server } = createApiServer({ database, config });
  server.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
  });

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    let exitCode = 0;
    try {
      await realtime.close();
    } catch (error) {
      console.error('Unable to stop realtime server:', error);
      exitCode = 1;
    }
    try {
      await database.close();
    } catch (error) {
      console.error('Unable to close database:', error);
      exitCode = 1;
    }
    process.exit(exitCode);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  return { app, database, realtime, server };
};

if (require.main === module) {
  start().catch((error) => {
    console.error('Unable to start server:', error);
    process.exit(1);
  });
}

module.exports = { start };