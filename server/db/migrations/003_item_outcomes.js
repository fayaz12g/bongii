const up = async (connection) => {
  await connection.exec(`
    CREATE TABLE campaignCategoryItems_outcomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoryId INTEGER NOT NULL,
      text TEXT NOT NULL,
      orderIndex INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'happened', 'did_not_happen')
      ),
      decidedAt TEXT,
      decidedBy INTEGER,
      FOREIGN KEY (categoryId) REFERENCES campaignCategories(id),
      FOREIGN KEY (decidedBy) REFERENCES users(id)
    );

    INSERT INTO campaignCategoryItems_outcomes (
      id, categoryId, text, orderIndex, status, decidedAt, decidedBy
    )
    SELECT
      id,
      categoryId,
      text,
      orderIndex,
      CASE
        WHEN status = 'correct' THEN 'happened'
        WHEN status = 'incorrect' THEN 'did_not_happen'
        WHEN status IN ('pending', 'happened', 'did_not_happen') THEN status
        ELSE 'pending'
      END,
      CASE
        WHEN status IN ('correct', 'incorrect', 'happened', 'did_not_happen') THEN calledAt
        ELSE NULL
      END,
      NULL
    FROM campaignCategoryItems;

    DROP TABLE campaignCategoryItems;
    ALTER TABLE campaignCategoryItems_outcomes RENAME TO campaignCategoryItems;

    CREATE INDEX idx_campaign_category_items_category
      ON campaignCategoryItems(categoryId);
  `);
};

module.exports = { disableForeignKeys: true, up };