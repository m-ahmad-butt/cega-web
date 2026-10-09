const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('unit: health payload shape', () => {
  it('builds a valid health response object', () => {
    const payload = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'hackathon-backend-monolith',
    };

    assert.equal(payload.status, 'OK');
    assert.ok(payload.timestamp);
    assert.equal(payload.service, 'hackathon-backend-monolith');
  });
});

describe('unit: env defaults', () => {
  it('falls back to default mongo uri', () => {
    const uri = process.env.MONGO_URI || 'mongodb://mongodb:27017/authdb';
    assert.match(uri, /^mongodb:\/\//);
    assert.match(uri, /authdb/);
  });

  it('uses redis URL with password by default', () => {
    const url = process.env.REDIS_URL || 'redis://:123123123@redis:6379';
    assert.match(url, /^redis:\/\//);
  });

  it('defaults JWT expiry to 7d', () => {
    const expires = process.env.JWT_EXPIRES_IN || '7d';
    assert.match(expires, /^\d+[smhdw]?$/i);
  });
});
