const up = async (connection) => {
  const columns = await connection.all('PRAGMA table_info(users)');
  if (!columns.some((column) => column.name === 'password')) return;

  const readiness = await connection.get(`
    SELECT
      SUM(CASE WHEN password IS NOT NULL AND TRIM(password) != '' THEN 1 ELSE 0 END)
        AS passwordsPresent,
      SUM(CASE WHEN firebaseUid IS NULL OR TRIM(firebaseUid) = '' THEN 1 ELSE 0 END)
        AS unlinkedAccounts
    FROM users
  `);
  if ((readiness.passwordsPresent || 0) > 0 || (readiness.unlinkedAccounts || 0) > 0) {
    throw new Error(
      'Cannot remove the password column until every account is Firebase-linked and password-free',
    );
  }

  const sourceCount = await connection.get('SELECT COUNT(*) AS count FROM users');

  await connection.exec(`
    CREATE TABLE users_firebase (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      firstName TEXT,
      lastName TEXT,
      email TEXT,
      profileIcon TEXT,
      firebaseUid TEXT,
      displayName TEXT,
      photoUrl TEXT,
      legacyUsername TEXT
    );

    INSERT INTO users_firebase (
      id, username, firstName, lastName, email, profileIcon,
      firebaseUid, displayName, photoUrl, legacyUsername
    )
    SELECT
      id, username, firstName, lastName, email, profileIcon,
      firebaseUid, displayName, photoUrl, legacyUsername
    FROM users;
  `);

  const destinationCount = await connection.get(
    'SELECT COUNT(*) AS count FROM users_firebase',
  );
  if (destinationCount.count !== sourceCount.count) {
    throw new Error('User row count changed while removing the password column');
  }

  await connection.exec(`
    DROP TABLE users;
    ALTER TABLE users_firebase RENAME TO users;

    CREATE UNIQUE INDEX idx_users_firebase_uid
      ON users(firebaseUid)
      WHERE firebaseUid IS NOT NULL;
  `);
};

module.exports = { disableForeignKeys: true, up };