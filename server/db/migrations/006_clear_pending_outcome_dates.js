const up = async (connection) => {
  await connection.run(`
    UPDATE campaignCategoryItems
    SET decidedAt = NULL
    WHERE status = 'pending' AND decidedAt IS NOT NULL
  `);
};

module.exports = { up };