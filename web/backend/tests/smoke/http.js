const http = require('node:http');

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:3001';

const request = (method, path, { body, headers } = {}) =>
  new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const payload = body == null ? null : JSON.stringify(body);
    const req = http.request(
      url,
      {
        method,
        headers: {
          Accept: 'application/json',
          ...(payload
            ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
            : {}),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          let json = null;
          try {
            json = data ? JSON.parse(data) : null;
          } catch {
            json = null;
          }
          resolve({ status: res.statusCode, body: data, json });
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy(new Error(`request timeout: ${method} ${path}`));
    });
    if (payload) req.write(payload);
    req.end();
  });

const get = (path, opts) => request('GET', path, opts);
const post = (path, body, opts = {}) => request('POST', path, { ...opts, body });

module.exports = { BASE_URL, get, post, request };
