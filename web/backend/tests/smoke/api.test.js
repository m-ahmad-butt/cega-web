const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { get, post } = require('./http');

describe('smoke: public endpoints', () => {
  it('GET /health returns OK', async () => {
    const res = await get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.json.status, 'OK');
    assert.ok(res.json.timestamp);
  });

  it('GET / returns API index', async () => {
    const res = await get('/');
    assert.equal(res.status, 200);
    assert.equal(res.json.status, 'healthy');
    assert.ok(res.json.endpoints);
    assert.equal(res.json.endpoints.health, '/health');
  });

  it('unknown route returns 404', async () => {
    const res = await get('/api/this-route-does-not-exist');
    assert.equal(res.status, 404);
  });
});

describe('smoke: auth + protected routes', () => {
  it('POST /api/auth/login without email → 400', async () => {
    const res = await post('/api/auth/login', { password: 'x' });
    assert.equal(res.status, 400);
    assert.match(res.json.message || '', /email/i);
  });

  it('POST /api/auth/login bad credentials → 400', async () => {
    const res = await post('/api/auth/login', {
      email: 'smoke-nonexistent@example.com',
      password: 'wrong-password',
    });
    assert.equal(res.status, 400);
  });
});
