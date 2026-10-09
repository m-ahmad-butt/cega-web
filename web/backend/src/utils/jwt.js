const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const JWT_ALGORITHM = 'RS256';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const normalizePem = (value) => {
  if (!value) return null;
  return value.replace(/\\n/g, '\n').trim();
};

const readKeyMaterial = (envValue, envPath) => {
  const pem = normalizePem(envValue);
  if (pem) return pem;

  const keyPath = envPath && String(envPath).trim();
  if (!keyPath) return null;

  const absolute = path.isAbsolute(keyPath)
    ? keyPath
    : path.resolve(process.cwd(), keyPath);

  return fs.readFileSync(absolute, 'utf8');
};

const privatePem = readKeyMaterial(
  process.env.JWT_PRIVATE_KEY,
  process.env.JWT_PRIVATE_KEY_PATH
);
const publicPem = readKeyMaterial(
  process.env.JWT_PUBLIC_KEY,
  process.env.JWT_PUBLIC_KEY_PATH
);

if (!privatePem || !publicPem) {
  throw new Error(
    'JWT RSA keys required: set JWT_PRIVATE_KEY + JWT_PUBLIC_KEY (PEM, \\n-escaped) ' +
      'or JWT_PRIVATE_KEY_PATH + JWT_PUBLIC_KEY_PATH'
  );
}

// KeyObjects — public key cannot be misused as an HMAC secret (alg confusion).
const privateKey = crypto.createPrivateKey(privatePem);
const publicKey = crypto.createPublicKey(publicPem);

const signToken = (user) => {
  return jwt.sign(
    {
      sub: user.email,
      email: user.email,
      role: user.role || 'STUDENT',
      name: user.name,
    },
    privateKey,
    { expiresIn: JWT_EXPIRES_IN, algorithm: JWT_ALGORITHM }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, publicKey, { algorithms: [JWT_ALGORITHM] });
};

module.exports = {
  signToken,
  verifyToken,
  JWT_ALGORITHM,
  JWT_EXPIRES_IN,
  publicKey,
};
