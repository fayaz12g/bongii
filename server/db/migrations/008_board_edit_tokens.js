const hasColumn = async (connection, table, column) => {
  const columns = await connection.all(`PRAGMA table_info(${table})`);
  return columns.some((candidate) => candidate.name === column);
};

const up = async (connection) => {
  if (!(await hasColumn(connection, 'playerBoards', 'editTokenHash'))) {
    await connection.run('ALTER TABLE playerBoards ADD COLUMN editTokenHash TEXT');
  }
  await connection.exec(`
    CREATE INDEX IF NOT EXISTS idx_playerBoards_userId ON playerBoards(userId);
  `);
};

module.exports = { up };