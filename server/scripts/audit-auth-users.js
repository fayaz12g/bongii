const config = require('../config');
const { configureConnection, openConnection } = require('../db/connection');

const normalizeEmail = (email) => {
  if (typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
};

const summarizeUsers = (users) => {
  const emailCounts = new Map();
  for (const user of users) {
    const email = normalizeEmail(user.email);
    if (email) emailCounts.set(email, (emailCounts.get(email) || 0) + 1);
  }

  const duplicateEmails = new Set(
    [...emailCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([email]) => email),
  );
  const unlinkedUsers = users.filter((user) => !user.firebaseUid);
  const missingOrInvalidEmail = unlinkedUsers
    .filter((user) => !normalizeEmail(user.email)).length;
  const duplicateUnlinkedAccounts = unlinkedUsers.filter(
    (user) => duplicateEmails.has(normalizeEmail(user.email)),
  ).length;
  const duplicateEmailAccounts = users.filter(
    (user) => duplicateEmails.has(normalizeEmail(user.email)),
  ).length;

  return {
    totalUsers: users.length,
    firebaseLinked: users.filter((user) => Boolean(user.firebaseUid)).length,
    readyForVerifiedEmailLink: unlinkedUsers.length
      - missingOrInvalidEmail
      - duplicateUnlinkedAccounts,
    manualRecoveryRequired: missingOrInvalidEmail + duplicateUnlinkedAccounts,
    missingOrInvalidEmail,
    duplicateEmailAccounts,
    duplicateEmailGroups: duplicateEmails.size,
    legacyPasswordsPresent: users.filter((user) => Boolean(user.password)).length,
  };
};

const auditAuthUsers = async (databasePath = config.databasePath) => {
  const connection = await configureConnection(await openConnection(databasePath));
  try {
    const columns = await connection.all('PRAGMA table_info(users)');
    const hasFirebaseUid = columns.some((column) => column.name === 'firebaseUid');
    const users = await connection.all(
      `SELECT email, password${hasFirebaseUid ? ', firebaseUid' : ', NULL AS firebaseUid'} FROM users`,
    );
    return summarizeUsers(users);
  } finally {
    await connection.close();
  }
};

if (require.main === module) {
  auditAuthUsers().then((summary) => {
    console.log(JSON.stringify(summary, null, 2));
  }).catch((error) => {
    console.error(`Unable to audit authentication users: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { auditAuthUsers, normalizeEmail, summarizeUsers };