const crypto = require('crypto');

const createEditToken = () => crypto.randomBytes(32).toString('base64url');

const hashEditToken = (token) => crypto
  .createHash('sha256')
  .update(token)
  .digest('hex');

const matchesEditToken = (token, expectedHash) => {
  if (!token || !expectedHash) return false;
  const actual = Buffer.from(hashEditToken(token), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
};

module.exports = { createEditToken, hashEditToken, matchesEditToken };