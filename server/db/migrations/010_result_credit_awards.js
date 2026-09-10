const hasColumn = async (connection, table, column) => {
  const columns = await connection.all(`PRAGMA table_info(${table})`);
  return columns.some((candidate) => candidate.name === column);
};

const up = async (connection) => {
  if (!(await hasColumn(connection, 'boardResults', 'doubleOrNothingCreditsAwarded'))) {
    await connection.run(`
      ALTER TABLE boardResults
      ADD COLUMN doubleOrNothingCreditsAwarded INTEGER NOT NULL DEFAULT 0
      CHECK (doubleOrNothingCreditsAwarded >= 0)
    `);
  }
};

module.exports = { up };