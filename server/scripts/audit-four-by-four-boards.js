const config = require('../config');
const { configureConnection, openConnection } = require('../db/connection');

const auditFourByFourBoards = async (connection) => {
  const rows = await connection.all(`
    SELECT c.code AS campaignCode, c.status AS campaignStatus,
           pb.boardCode, COUNT(pbt.id) AS tileCount,
           SUM(CASE WHEN pbt.isCenter = 1 THEN 1 ELSE 0 END) AS centerTileCount,
           SUM(CASE WHEN pbt.isCenter = 0 AND pbt.categoryItemId IS NOT NULL THEN 1 ELSE 0 END)
             AS playableTileCount
    FROM campaigns c
    JOIN playerBoards pb ON pb.campaignId = c.id
    LEFT JOIN playerBoardTiles pbt ON pbt.boardId = pb.id
    WHERE c.boardSize = 4
    GROUP BY c.id, pb.id
    HAVING tileCount != 16 OR centerTileCount != 0 OR playableTileCount != 16
    ORDER BY c.code, pb.boardCode
  `);
  return {
    activeBlockers: rows.filter((row) => row.campaignStatus !== 'completed'),
    completedHistorical: rows.filter((row) => row.campaignStatus === 'completed'),
  };
};

const run = async () => {
  const connection = await configureConnection(await openConnection(config.databasePath));
  try {
    const audit = await auditFourByFourBoards(connection);
    console.log(JSON.stringify(audit, null, 2));
    if (audit.activeBlockers.length > 0) process.exitCode = 1;
  } finally {
    await connection.close();
  }
};

if (require.main === module) {
  run().catch((error) => {
    console.error('4x4 board audit failed:', error.message);
    process.exit(1);
  });
}

module.exports = { auditFourByFourBoards };