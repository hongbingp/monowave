import logger from '../utils/logger.js';

let rateLimiter = null;

// Try to initialize Redis rate limiter
try {
  const { client, RateLimiter } = await import('../config/redis.js');
  rateLimiter = new RateLimiter(client);
} catch (error) {
  logger.warn('Redis rate limiter not available, using fallback');
}

// In-memory fallback rate limiter
const memoryLimiter = new Map();

function checkMemoryLimit(key, limit = 100, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!memoryLimiter.has(key)) {
    memoryLimiter.set(key, []);
  }
  
  const requests = memoryLimiter.get(key);
  
  // Remove old requests
  const validRequests = requests.filter(timestamp => timestamp > windowStart);
  memoryLimiter.set(key, validRequests);
  
  if (validRequests.length >= limit) {
    return false;
  }
  
  validRequests.push(now);
  memoryLimiter.set(key, validRequests);
  return true;
}

export async function checkRateLimit(req, res, next) {
  try {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `rate_limit:${clientIp}`;
    
    let allowed = true;
    
    if (rateLimiter) {
      // Use Redis rate limiter
      allowed = await rateLimiter.checkLimit(key, 100, 900); // 100 requests per 15 minutes
    } else {
      // Use memory fallback
      allowed = checkMemoryLimit(key, 100, 15 * 60 * 1000);
    }
    
    if (!allowed) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: 900 // 15 minutes in seconds
      });
    }
    
    next();
  } catch (error) {
    logger.error('Rate limit check failed:', error);
    // On error, allow the request to proceed
    next();
  }
}

export default { checkRateLimit };