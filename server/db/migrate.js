const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIRECTORY = path.join(__dirname, 'migrations');

const checksum = (filePath) => crypto
  .createHash('sha256')
  .update(fs.readFileSync(filePath))
  .digest('hex');

const foreignKeyViolationKey = (violation) => JSON.stringify([
  violation.table,
  violation.rowid,
  violation.parent,
  violation.fkid,
]);

const describeForeignKeyViolation = (violation) => (
  `${violation.table}(rowid=${violation.rowid}) -> ${violation.parent} (fkid=${violation.fkid})`
);

const migrate = async (connection) => {
  await connection.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      appliedAt TEXT NOT NULL
    );
  `);

  const files = fs.readdirSync(MIGRATIONS_DIRECTORY)
    .filter((file) => /^\d+.*\.js$/.test(file))
    .sort();

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIRECTORY, file);
    const fileChecksum = checksum(filePath);
    const applied = await connection.get(
      'SELECT checksum FROM schema_migrations WHERE id = ?',
      [file],
    );

    if (applied) {
      if (applied.checksum !== fileChecksum) {
        throw new Error(`Migration ${file} has changed since it was applied`);
      }
      continue;
    }

    const migration = require(filePath);
    const disableForeignKeys = migration.disableForeignKeys === true;
    const existingForeignKeyViolations = disableForeignKeys
      ? await connection.all('PRAGMA foreign_key_check')
      : [];
    if (disableForeignKeys) {
      await connection.exec('PRAGMA foreign_keys = OFF');
    }

    try {
      await connection.exec('BEGIN IMMEDIATE');
      try {
        await migration.up(connection);
        if (disableForeignKeys) {
          const violations = await connection.all('PRAGMA foreign_key_check');
          const existingViolationKeys = new Set(
            existingForeignKeyViolations.map(foreignKeyViolationKey),
          );
          const introducedViolations = violations.filter(
            (violation) => !existingViolationKeys.has(foreignKeyViolationKey(violation)),
          );
          if (introducedViolations.length > 0) {
            const details = introducedViolations.map(describeForeignKeyViolation).join(', ');
            throw new Error(`Migration ${file} introduced foreign key violations: ${details}`);
          }
          if (violations.length > 0) {
            console.warn(
              `Migration ${file} preserved ${violations.length} pre-existing foreign key violation(s)`,
            );
          }
        }
        await connection.run(
          'INSERT INTO schema_migrations (id, checksum, appliedAt) VALUES (?, ?, ?)',
          [file, fileChecksum, new Date().toISOString()],
        );
        await connection.exec('COMMIT');
      } catch (error) {
        await connection.exec('ROLLBACK');
        throw error;
      }
    } finally {
      if (disableForeignKeys) {
        await connection.exec('PRAGMA foreign_keys = ON');
      }
    }
  }
};

module.exports = { migrate };