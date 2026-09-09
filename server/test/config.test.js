const assert = require('node:assert/strict');
const { test } = require('node:test');
const { isExactHttpOrigin, parseOrigins } = require('../config');

test('parses and validates exact browser origins', () => {
  assert.deepEqual(
    parseOrigins(' http://localhost:3001,https://bongii.example.vercel.app '),
    ['http://localhost:3001', 'https://bongii.example.vercel.app'],
  );
  assert.equal(isExactHttpOrigin('http://localhost:3001'), true);
  assert.equal(isExactHttpOrigin('https://bongii.example.vercel.app'), true);
  assert.equal(isExactHttpOrigin('*'), false);
  assert.equal(isExactHttpOrigin('https://bongii.example.vercel.app/path'), false);
  assert.equal(isExactHttpOrigin('bongii.example.vercel.app'), false);
});