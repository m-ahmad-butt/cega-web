const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { get } = require('./http');

describe('smoke: backend health', () => {
  it('GET /health returns 200', async () => {
    const res = await get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.json.status, 'OK');
  });
});
