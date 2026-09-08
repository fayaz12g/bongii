const config = require('../config');
const { BongiiDatabase } = require('../db');

const run = async () => {
  const database = await BongiiDatabase.open(config.databasePath);
  await database.close();
  console.log(`Database migrations are current: ${config.databasePath}`);
};

run().catch((error) => {
  console.error('Database migration failed:', error);
  process.exit(1);
});