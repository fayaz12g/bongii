const assert = require('node:assert/strict');
const { test } = require('node:test');
const { normalizeEmail, summarizeUsers } = require('../scripts/audit-auth-users');

test('normalizes usable emails without exposing account details', () => {
  assert.equal(normalizeEmail(' Person@Example.com '), 'person@example.com');
  assert.equal(normalizeEmail('not-an-email'), null);
  assert.equal(normalizeEmail(null), null);
});

test('classifies unique, duplicate, missing, and linked accounts', () => {
  const summary = summarizeUsers([
    { email: 'unique@example.com', password: 'hash', firebaseUid: null },
    { email: 'DUP@example.com', password: 'hash', firebaseUid: null },
    { email: 'dup@example.com', password: null, firebaseUid: 'linked' },
    { email: '', password: 'hash', firebaseUid: null },
  ]);

  assert.deepEqual(summary, {
    totalUsers: 4,
    firebaseLinked: 1,
    readyForVerifiedEmailLink: 1,
    manualRecoveryRequired: 2,
    missingOrInvalidEmail: 1,
    duplicateEmailAccounts: 2,
    duplicateEmailGroups: 1,
    legacyPasswordsPresent: 3,
  });
});