const hasColumn = async (connection, table, column) => {
  const columns = await connection.all(`PRAGMA table_info(${table})`);
  return columns.some((candidate) => candidate.name === column);
};

const up = async (connection) => {
  if (!(await hasColumn(connection, 'users', 'doubleOrNothingCredits'))) {
    await connection.run(`
      ALTER TABLE users
      ADD COLUMN doubleOrNothingCredits INTEGER NOT NULL DEFAULT 10
      CHECK (doubleOrNothingCredits >= 0)
    `);
  }
  if (!(await hasColumn(connection, 'playerBoards', 'usedDoubleOrNothing'))) {
    await connection.run(`
      ALTER TABLE playerBoards
      ADD COLUMN usedDoubleOrNothing INTEGER NOT NULL DEFAULT 0
      CHECK (usedDoubleOrNothing IN (0, 1))
    `);
  }
};

module.exports = { up };