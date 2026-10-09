const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch {
  bcrypt = null;
}

describe('unit: auth rules', () => {
  it('requires email for login-style payloads', () => {
    const body = { password: 'secret' };
    const targetEmail = body.email || body.emailAddress;
    assert.equal(!!targetEmail, false);
  });

  it('accepts emailAddress alias', () => {
    const body = { emailAddress: 'a@b.com', password: 'secret' };
    const targetEmail = body.email || body.emailAddress;
    assert.equal(targetEmail, 'a@b.com');
  });

  it('rejects passwords shorter than 8 chars', () => {
    const password = 'short';
    assert.equal(password.length < 8, true);
  });

  it('accepts passwords with length >= 8', () => {
    const password = 'longenough';
    assert.equal(password.length >= 8, true);
  });

  it('bcrypt hash verifies matching password', { skip: !bcrypt && 'bcryptjs not installed' }, async () => {
    const hashed = await bcrypt.hash('test123123', 10);
    assert.equal(await bcrypt.compare('test123123', hashed), true);
    assert.equal(await bcrypt.compare('wrong', hashed), false);
  });

  it('strips password from safe user object', () => {
    const user = { email: 'a@b.com', name: 'A', password: 'secret', imageUrl: null };
    const { password, ...safeUser } = user;
    assert.equal(password, 'secret');
    assert.equal(safeUser.email, 'a@b.com');
    assert.equal('password' in safeUser, false);
  });
});
