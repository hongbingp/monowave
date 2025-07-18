const redis = require('redis');
const logger = require('../utils/logger');

const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      logger.error('Redis server refused connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      logger.error('Redis retry time exhausted');
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      logger.error('Redis max retry attempts reached');
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  }
});

client.on('error', (err) => {
  logger.error('Redis error:', err);
});

client.on('connect', () => {
  logger.info('Redis connected successfully');
});

async function connectRedis() {
  try {
    await client.connect();
    return client;
  } catch (error) {
    logger.error('Redis connection failed:', error);
    throw error;
  }
}

// Rate limiting functions
class RateLimiter {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async checkQPS(apiKey, limit) {
    const key = `qps:${apiKey}`;
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, 1);
    }
    return current <= limit;
  }

  async checkDailyLimit(apiKey, limit) {
    const today = new Date().toISOString().split('T')[0];
    const key = `daily:${apiKey}:${today}`;
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, 86400); // 24 hours
    }
    return current <= limit;
  }

  async checkMonthlyLimit(apiKey, limit) {
    const month = new Date().toISOString().substring(0, 7);
    const key = `monthly:${apiKey}:${month}`;
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, 2592000); // 30 days
    }
    return current <= limit;
  }

  async getUsageStats(apiKey) {
    const today = new Date().toISOString().split('T')[0];
    const month = new Date().toISOString().substring(0, 7);
    
    const [qps, daily, monthly] = await Promise.all([
      this.redis.get(`qps:${apiKey}`),
      this.redis.get(`daily:${apiKey}:${today}`),
      this.redis.get(`monthly:${apiKey}:${month}`)
    ]);

    return {
      qps: parseInt(qps) || 0,
      daily: parseInt(daily) || 0,
      monthly: parseInt(monthly) || 0
    };
  }
}

module.exports = { client, connectRedis, RateLimiter };