const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { errorHandler } = require('../../src/middleware/errorHandler.middleware');

const mockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
};

describe('unit: errorHandler', () => {
  const silent = { error() {} };

  it('maps Prisma-style P2002 to 400 duplicate', () => {
    const prev = console.error;
    console.error = silent.error;
    try {
      const res = mockRes();
      errorHandler({ code: 'P2002' }, {}, res, () => {});
      assert.equal(res.statusCode, 400);
      assert.equal(res.body.message, 'Duplicate entry');
    } finally {
      console.error = prev;
    }
  });

  it('maps P2025 to 404', () => {
    const prev = console.error;
    console.error = silent.error;
    try {
      const res = mockRes();
      errorHandler({ code: 'P2025' }, {}, res, () => {});
      assert.equal(res.statusCode, 404);
      assert.equal(res.body.message, 'Resource not found');
    } finally {
      console.error = prev;
    }
  });

  it('maps ValidationError to 400', () => {
    const prev = console.error;
    console.error = silent.error;
    try {
      const res = mockRes();
      errorHandler({ name: 'ValidationError', message: 'bad field' }, {}, res, () => {});
      assert.equal(res.statusCode, 400);
      assert.equal(res.body.message, 'bad field');
    } finally {
      console.error = prev;
    }
  });

  it('maps LIMIT_FILE_SIZE to 400', () => {
    const prev = console.error;
    console.error = silent.error;
    try {
      const res = mockRes();
      errorHandler({ code: 'LIMIT_FILE_SIZE' }, {}, res, () => {});
      assert.equal(res.statusCode, 400);
      assert.equal(res.body.message, 'File too large');
    } finally {
      console.error = prev;
    }
  });

  it('falls back to 500 for unknown errors', () => {
    const prev = console.error;
    console.error = silent.error;
    try {
      const res = mockRes();
      errorHandler(new Error('boom'), {}, res, () => {});
      assert.equal(res.statusCode, 500);
      assert.equal(res.body.message, 'boom');
    } finally {
      console.error = prev;
    }
  });

  it('honors err.statusCode when set', () => {
    const prev = console.error;
    console.error = silent.error;
    try {
      const res = mockRes();
      errorHandler({ statusCode: 418, message: 'teapot' }, {}, res, () => {});
      assert.equal(res.statusCode, 418);
      assert.equal(res.body.message, 'teapot');
    } finally {
      console.error = prev;
    }
  });
});
