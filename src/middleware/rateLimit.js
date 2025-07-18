const { client } = require('../config/redis');
const { RateLimiter } = require('../config/redis');
const logger = require('../utils/logger');

const rateLimiter = new RateLimiter(client);

async function checkRateLimit(req, res, next) {
  try {
    const { apiKey } = req;
    
    if (!apiKey) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'API key required for rate limiting'
      });
    }

    const { limits } = apiKey;
    
    // Check QPS limit
    const qpsAllowed = await rateLimiter.checkQPS(apiKey.id, limits.qps);
    if (!qpsAllowed) {
      return res.status(429).json({
        code: 'QPS_LIMIT_EXCEEDED',
        message: `QPS limit of ${limits.qps} exceeded`,
        retryAfter: 1
      });
    }

    // Check daily limit
    const dailyAllowed = await rateLimiter.checkDailyLimit(apiKey.id, limits.dailyLimit);
    if (!dailyAllowed) {
      return res.status(429).json({
        code: 'DAILY_LIMIT_EXCEEDED',
        message: `Daily limit of ${limits.dailyLimit} exceeded`,
        retryAfter: 86400
      });
    }

    // Check monthly limit
    const monthlyAllowed = await rateLimiter.checkMonthlyLimit(apiKey.id, limits.monthlyLimit);
    if (!monthlyAllowed) {
      return res.status(429).json({
        code: 'MONTHLY_LIMIT_EXCEEDED',
        message: `Monthly limit of ${limits.monthlyLimit} exceeded`,
        retryAfter: 2592000
      });
    }

    // Add usage stats to request for logging
    req.usageStats = await rateLimiter.getUsageStats(apiKey.id);
    
    next();
  } catch (error) {
    logger.error('Rate limiting error:', error);
    res.status(500).json({
      code: 'RATE_LIMIT_ERROR',
      message: 'Rate limiting check failed'
    });
  }
}

module.exports = { checkRateLimit };