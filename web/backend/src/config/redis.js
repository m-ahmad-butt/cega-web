const Redis = require('ioredis');

let redis;

try {
  redis = new Redis(process.env.REDIS_URL, {
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  redis.on('connect', () => console.log('Redis connected'));
  redis.on('error', (err) => console.error('Redis error:', err.message));

  redis.connect().catch((err) => {
    console.warn('[Redis] Not available, skipping:', err.message);
  });
} catch (err) {
  console.warn('[Redis] Failed to initialize:', err.message);
  redis = {
    get: async () => null,
    set: async () => 'OK',
    del: async () => 0,
    on: () => {},
  };
}

module.exports = redis;
