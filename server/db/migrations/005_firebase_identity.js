const up = async (connection) => {
  await connection.exec(`
    ALTER TABLE users ADD COLUMN firebaseUid TEXT;
    ALTER TABLE users ADD COLUMN displayName TEXT;
    ALTER TABLE users ADD COLUMN photoUrl TEXT;
    ALTER TABLE users ADD COLUMN legacyUsername TEXT;

    UPDATE users
    SET legacyUsername = username,
        displayName = COALESCE(
          NULLIF(TRIM(COALESCE(firstName, '') || ' ' || COALESCE(lastName, '')), ''),
          NULLIF(TRIM(username), ''),
          'Bongii user'
        );

    CREATE UNIQUE INDEX idx_users_firebase_uid
      ON users(firebaseUid)
      WHERE firebaseUid IS NOT NULL;
  `);
};

module.exports = { up };