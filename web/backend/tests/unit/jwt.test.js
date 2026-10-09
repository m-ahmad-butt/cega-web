const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

// Load backend/.env when present so local + CI (env copied into image) both work.
try {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
} catch {
  // dotenv optional at require time
}

const hasKeys = Boolean(process.env.JWT_PRIVATE_KEY && process.env.JWT_PUBLIC_KEY);

describe('unit: jwt', { skip: !hasKeys && 'JWT keys not set' }, () => {
  let signToken;
  let verifyToken;

  before(() => {
    ({ signToken, verifyToken } = require('../../src/utils/jwt'));
  });

  it('signs and verifies a token for a user', () => {
    const token = signToken({
      email: 'unit@test.local',
      name: 'Unit',
      role: 'STUDENT',
    });
    assert.equal(typeof token, 'string');
    assert.ok(token.split('.').length === 3);

    const payload = verifyToken(token);
    assert.equal(payload.email, 'unit@test.local');
    assert.equal(payload.sub, 'unit@test.local');
    assert.equal(payload.role, 'STUDENT');
  });

  it('rejects a tampered token', () => {
    const token = signToken({ email: 'unit@test.local', name: 'Unit', role: 'STUDENT' });
    const parts = token.split('.');
    parts[2] = parts[2].slice(0, -4) + 'xxxx';
    assert.throws(() => verifyToken(parts.join('.')), /invalid|JsonWebTokenError|signature/i);
  });
});
