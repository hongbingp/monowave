const { RateLimiter } = require('../../src/config/redis');
const { checkRateLimit } = require('../../src/middleware/rateLimit');

// Mock Redis client
const mockRedisClient = {
  incr: jest.fn(),
  expire: jest.fn(),
  get: jest.fn()
};

describe('RateLimiter', () => {
  let rateLimiter;

  beforeEach(() => {
    jest.clearAllMocks();
    rateLimiter = new RateLimiter(mockRedisClient);
  });

  describe('checkQPS', () => {
    it('should allow request within QPS limit', async () => {
      mockRedisClient.incr.mockResolvedValue(1);

      const result = await rateLimiter.checkQPS('test-key', 100);

      expect(result).toBe(true);
      expect(mockRedisClient.incr).toHaveBeenCalledWith('qps:test-key');
      expect(mockRedisClient.expire).toHaveBeenCalledWith('qps:test-key', 1);
    });

    it('should allow request at QPS limit', async () => {
      mockRedisClient.incr.mockResolvedValue(100);

      const result = await rateLimiter.checkQPS('test-key', 100);

      expect(result).toBe(true);
    });

    it('should block request exceeding QPS limit', async () => {
      mockRedisClient.incr.mockResolvedValue(101);

      const result = await rateLimiter.checkQPS('test-key', 100);

      expect(result).toBe(false);
    });

    it('should not set expiration for subsequent requests', async () => {
      mockRedisClient.incr.mockResolvedValue(50);

      await rateLimiter.checkQPS('test-key', 100);

      expect(mockRedisClient.expire).not.toHaveBeenCalled();
    });
  });

  describe('checkDailyLimit', () => {
    it('should allow request within daily limit', async () => {
      mockRedisClient.incr.mockResolvedValue(1);

      const result = await rateLimiter.checkDailyLimit('test-key', 10000);

      expect(result).toBe(true);
      expect(mockRedisClient.incr).toHaveBeenCalledWith(
        expect.stringMatching(/^daily:test-key:\d{4}-\d{2}-\d{2}$/)
      );
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        expect.stringMatching(/^daily:test-key:\d{4}-\d{2}-\d{2}$/),
        86400
      );
    });

    it('should block request exceeding daily limit', async () => {
      mockRedisClient.incr.mockResolvedValue(10001);

      const result = await rateLimiter.checkDailyLimit('test-key', 10000);

      expect(result).toBe(false);
    });

    it('should use current date in key', async () => {
      const today = new Date().toISOString().split('T')[0];
      mockRedisClient.incr.mockResolvedValue(1);

      await rateLimiter.checkDailyLimit('test-key', 10000);

      expect(mockRedisClient.incr).toHaveBeenCalledWith(`daily:test-key:${today}`);
    });
  });

  describe('checkMonthlyLimit', () => {
    it('should allow request within monthly limit', async () => {
      mockRedisClient.incr.mockResolvedValue(1);

      const result = await rateLimiter.checkMonthlyLimit('test-key', 300000);

      expect(result).toBe(true);
      expect(mockRedisClient.incr).toHaveBeenCalledWith(
        expect.stringMatching(/^monthly:test-key:\d{4}-\d{2}$/)
      );
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        expect.stringMatching(/^monthly:test-key:\d{4}-\d{2}$/),
        2592000
      );
    });

    it('should block request exceeding monthly limit', async () => {
      mockRedisClient.incr.mockResolvedValue(300001);

      const result = await rateLimiter.checkMonthlyLimit('test-key', 300000);

      expect(result).toBe(false);
    });

    it('should use current month in key', async () => {
      const month = new Date().toISOString().substring(0, 7);
      mockRedisClient.incr.mockResolvedValue(1);

      await rateLimiter.checkMonthlyLimit('test-key', 300000);

      expect(mockRedisClient.incr).toHaveBeenCalledWith(`monthly:test-key:${month}`);
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics', async () => {
      mockRedisClient.get
        .mockResolvedValueOnce('5')    // QPS
        .mockResolvedValueOnce('100')  // Daily
        .mockResolvedValueOnce('1000'); // Monthly

      const result = await rateLimiter.getUsageStats('test-key');

      expect(result).toEqual({
        qps: 5,
        daily: 100,
        monthly: 1000
      });
    });

    it('should handle null values', async () => {
      mockRedisClient.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await rateLimiter.getUsageStats('test-key');

      expect(result).toEqual({
        qps: 0,
        daily: 0,
        monthly: 0
      });
    });

    it('should use correct keys', async () => {
      const today = new Date().toISOString().split('T')[0];
      const month = new Date().toISOString().substring(0, 7);
      
      mockRedisClient.get.mockResolvedValue('0');

      await rateLimiter.getUsageStats('test-key');

      expect(mockRedisClient.get).toHaveBeenCalledWith('qps:test-key');
      expect(mockRedisClient.get).toHaveBeenCalledWith(`daily:test-key:${today}`);
      expect(mockRedisClient.get).toHaveBeenCalledWith(`monthly:test-key:${month}`);
    });
  });
});

describe('checkRateLimit middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      apiKey: {
        id: 'test-key-id',
        limits: {
          qps: 100,
          dailyLimit: 10000,
          monthlyLimit: 300000
        }
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should pass when all limits are satisfied', async () => {
    // Mock RateLimiter methods
    const originalRateLimiter = require('../../src/middleware/rateLimit');
    const mockRateLimiter = {
      checkQPS: jest.fn().mockResolvedValue(true),
      checkDailyLimit: jest.fn().mockResolvedValue(true),
      checkMonthlyLimit: jest.fn().mockResolvedValue(true),
      getUsageStats: jest.fn().mockResolvedValue({ qps: 1, daily: 10, monthly: 100 })
    };

    // Mock the rateLimiter instance
    jest.doMock('../../src/config/redis', () => ({
      client: mockRedisClient,
      RateLimiter: jest.fn(() => mockRateLimiter)
    }));

    const { checkRateLimit } = require('../../src/middleware/rateLimit');

    await checkRateLimit(req, res, next);

    expect(mockRateLimiter.checkQPS).toHaveBeenCalledWith('test-key-id', 100);
    expect(mockRateLimiter.checkDailyLimit).toHaveBeenCalledWith('test-key-id', 10000);
    expect(mockRateLimiter.checkMonthlyLimit).toHaveBeenCalledWith('test-key-id', 300000);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 429 when QPS limit exceeded', async () => {
    const mockRateLimiter = {
      checkQPS: jest.fn().mockResolvedValue(false),
      checkDailyLimit: jest.fn().mockResolvedValue(true),
      checkMonthlyLimit: jest.fn().mockResolvedValue(true),
      getUsageStats: jest.fn().mockResolvedValue({ qps: 101, daily: 10, monthly: 100 })
    };

    jest.doMock('../../src/config/redis', () => ({
      client: mockRedisClient,
      RateLimiter: jest.fn(() => mockRateLimiter)
    }));

    const { checkRateLimit } = require('../../src/middleware/rateLimit');

    await checkRateLimit(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      code: 'QPS_LIMIT_EXCEEDED',
      message: 'QPS limit of 100 exceeded',
      retryAfter: 1
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 429 when daily limit exceeded', async () => {
    const mockRateLimiter = {
      checkQPS: jest.fn().mockResolvedValue(true),
      checkDailyLimit: jest.fn().mockResolvedValue(false),
      checkMonthlyLimit: jest.fn().mockResolvedValue(true),
      getUsageStats: jest.fn().mockResolvedValue({ qps: 1, daily: 10001, monthly: 100 })
    };

    jest.doMock('../../src/config/redis', () => ({
      client: mockRedisClient,
      RateLimiter: jest.fn(() => mockRateLimiter)
    }));

    const { checkRateLimit } = require('../../src/middleware/rateLimit');

    await checkRateLimit(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      code: 'DAILY_LIMIT_EXCEEDED',
      message: 'Daily limit of 10000 exceeded',
      retryAfter: 86400
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 429 when monthly limit exceeded', async () => {
    const mockRateLimiter = {
      checkQPS: jest.fn().mockResolvedValue(true),
      checkDailyLimit: jest.fn().mockResolvedValue(true),
      checkMonthlyLimit: jest.fn().mockResolvedValue(false),
      getUsageStats: jest.fn().mockResolvedValue({ qps: 1, daily: 10, monthly: 300001 })
    };

    jest.doMock('../../src/config/redis', () => ({
      client: mockRedisClient,
      RateLimiter: jest.fn(() => mockRateLimiter)
    }));

    const { checkRateLimit } = require('../../src/middleware/rateLimit');

    await checkRateLimit(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      code: 'MONTHLY_LIMIT_EXCEEDED',
      message: 'Monthly limit of 300000 exceeded',
      retryAfter: 2592000
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when API key is missing', async () => {
    req.apiKey = null;

    await checkRateLimit(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      code: 'UNAUTHORIZED',
      message: 'API key required for rate limiting'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 500 on Redis error', async () => {
    const mockRateLimiter = {
      checkQPS: jest.fn().mockRejectedValue(new Error('Redis error')),
      checkDailyLimit: jest.fn().mockResolvedValue(true),
      checkMonthlyLimit: jest.fn().mockResolvedValue(true),
      getUsageStats: jest.fn().mockResolvedValue({ qps: 1, daily: 10, monthly: 100 })
    };

    jest.doMock('../../src/config/redis', () => ({
      client: mockRedisClient,
      RateLimiter: jest.fn(() => mockRateLimiter)
    }));

    const { checkRateLimit } = require('../../src/middleware/rateLimit');

    await checkRateLimit(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      code: 'RATE_LIMIT_ERROR',
      message: 'Rate limiting check failed'
    });
    expect(next).not.toHaveBeenCalled();
  });
});