const request = require('supertest');
const app = require('../../src/app');
const AuthService = require('../../src/utils/auth');
const axios = require('axios');

jest.mock('axios');
// Mock the database for integration tests
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn()
};

jest.mock('../../src/config/database', () => ({
  pool: mockPool,
  connectDB: jest.fn()
}));

// Mock Redis for integration tests
const mockRedisClient = {
  incr: jest.fn(),
  expire: jest.fn(),
  get: jest.fn(),
  flushDb: jest.fn(),
  quit: jest.fn()
};

jest.mock('../../src/config/redis', () => ({
  client: mockRedisClient,
  connectRedis: jest.fn(),
  RateLimiter: class {
    constructor(client) {
      this.redis = client;
    }
    
    async checkQPS(apiKey, limit) {
      return true;
    }
    
    async checkDailyLimit(apiKey, limit) {
      return true;
    }
    
    async checkMonthlyLimit(apiKey, limit) {
      return true;
    }
    
    async getUsageStats(apiKey) {
      return { qps: 1, daily: 10, monthly: 100 };
    }
  }
}));

describe('API Integration Tests', () => {
  let testUser;
  let testApiKey;
  let testJwtToken;

  beforeEach(async () => {
    // Mock database responses for user creation
    mockPool.query.mockResolvedValue({
      rows: [{ id: 1 }]
    });

    testUser = { id: 1 };

    // Create test API key
    const apiKeyData = await AuthService.createApiKey(testUser.id, 1, 'Test API Key');
    testApiKey = apiKeyData.apiKey;

    // Create JWT token
    testJwtToken = AuthService.generateJWT({ 
      userId: testUser.id, 
      email: 'test@example.com' 
    });
  });

  describe('POST /api/v1/crawl', () => {
    const mockHtmlContent = `
      <html>
        <head><title>Test Page</title></head>
        <body><p>Test content</p></body>
      </html>
    `;

    it('should crawl URL successfully with valid API key', async () => {
      axios.get.mockResolvedValue({ data: mockHtmlContent });

      const response = await request(app)
        .post('/api/v1/crawl')
        .set('X-API-Key', testApiKey)
        .send({
          urls: ['https://example.com'],
          format: 'raw'
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe('SUCCESS');
      expect(response.body.data).toHaveProperty('https://example.com');
      expect(response.body.data['https://example.com']).toHaveProperty('content');
      expect(response.body.data['https://example.com']).toHaveProperty('contentLength');
      expect(response.body.billing).toHaveProperty('totalCost');
    });

    it('should return structured data when format is structured', async () => {
      axios.get.mockResolvedValue({ data: mockHtmlContent });

      const response = await request(app)
        .post('/api/v1/crawl')
        .set('X-API-Key', testApiKey)
        .send({
          urls: ['https://example.com'],
          format: 'structured'
        });

      expect(response.status).toBe(200);
      expect(response.body.data['https://example.com'].content).toHaveProperty('title');
      expect(response.body.data['https://example.com'].content).toHaveProperty('meta');
      expect(response.body.data['https://example.com'].content).toHaveProperty('paragraphs');
    });

    it('should return summary when format is summary', async () => {
      axios.get.mockResolvedValue({ data: mockHtmlContent });

      const response = await request(app)
        .post('/api/v1/crawl')
        .set('X-API-Key', testApiKey)
        .send({
          urls: ['https://example.com'],
          format: 'summary'
        });

      expect(response.status).toBe(200);
      expect(response.body.data['https://example.com'].content).toHaveProperty('title');
      expect(response.body.data['https://example.com'].content).toHaveProperty('summary');
      expect(response.body.data['https://example.com'].content).toHaveProperty('wordCount');
    });

    it('should handle multiple URLs', async () => {
      axios.get.mockResolvedValue({ data: mockHtmlContent });

      const response = await request(app)
        .post('/api/v1/crawl')
        .set('X-API-Key', testApiKey)
        .send({
          urls: ['https://example1.com', 'https://example2.com'],
          format: 'raw'
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('https://example1.com');
      expect(response.body.data).toHaveProperty('https://example2.com');
    });

    it('should return 401 without API key', async () => {
      const response = await request(app)
        .post('/api/v1/crawl')
        .send({
          urls: ['https://example.com'],
          format: 'raw'
        });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 with invalid API key', async () => {
      const response = await request(app)
        .post('/api/v1/crawl')
        .set('X-API-Key', 'invalid-key')
        .send({
          urls: ['https://example.com'],
          format: 'raw'
        });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('INVALID_API_KEY');
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/v1/crawl')
        .set('X-API-Key', testApiKey)
        .send({
          urls: ['invalid-url'],
          format: 'raw'
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should handle insufficient balance', async () => {
      // Set user balance to 0
      await global.testPool.query(
        'UPDATE users SET balance = 0 WHERE id = $1',
        [testUser.id]
      );

      const response = await request(app)
        .post('/api/v1/crawl')
        .set('X-API-Key', testApiKey)
        .send({
          urls: ['https://example.com'],
          format: 'raw'
        });

      expect(response.status).toBe(402);
      expect(response.body.code).toBe('INSUFFICIENT_BALANCE');
    });
  });

  describe('GET /api/v1/admin/usage', () => {
    beforeEach(async () => {
      // Mock database responses for usage logs
      mockPool.query.mockResolvedValue({
        rows: [{
          total_calls: '2',
          total_bytes: '3000', 
          total_cost: '0.3',
          successful_calls: '2',
          failed_calls: '0'
        }]
      });
    });

    it('should get usage statistics with JWT token', async () => {
      const response = await request(app)
        .get('/api/v1/admin/usage')
        .set('Authorization', `Bearer ${testJwtToken}`)
        .query({
          apikey: testApiKey,
          period: 'monthly'
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe('SUCCESS');
      expect(response.body.data).toHaveProperty('totalCalls');
      expect(response.body.data).toHaveProperty('totalBytes');
      expect(response.body.data).toHaveProperty('totalCost');
      expect(response.body.data).toHaveProperty('successRate');
    });

    it('should return 401 without JWT token', async () => {
      const response = await request(app)
        .get('/api/v1/admin/usage')
        .query({
          apikey: testApiKey,
          period: 'monthly'
        });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 without apikey parameter', async () => {
      const response = await request(app)
        .get('/api/v1/admin/usage')
        .set('Authorization', `Bearer ${testJwtToken}`)
        .query({
          period: 'monthly'
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('MISSING_PARAMETER');
    });
  });

  describe('GET /api/v1/admin/billing', () => {
    beforeEach(async () => {
      // Mock database responses for billing records
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: 1,
            user_id: 1,
            amount: 10.0,
            status: 'paid',
            billing_period: 'monthly',
            tx_hash: '0xabcdef123456',
            email: 'test@example.com',
            wallet_address: '0x123'
          },
          {
            id: 2,
            user_id: 1,
            amount: 5.0,
            status: 'pending',
            billing_period: 'monthly',
            tx_hash: null,
            email: 'test@example.com',
            wallet_address: '0x123'
          }
        ]
      });
    });

    it('should get billing records with JWT token', async () => {
      const response = await request(app)
        .get('/api/v1/admin/billing')
        .set('Authorization', `Bearer ${testJwtToken}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe('SUCCESS');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('amount');
      expect(response.body.data[0]).toHaveProperty('status');
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/admin/billing')
        .set('Authorization', `Bearer ${testJwtToken}`)
        .query({ status: 'paid' });

      expect(response.status).toBe(200);
      expect(response.body.data.every(record => record.status === 'paid')).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/admin/billing')
        .set('Authorization', `Bearer ${testJwtToken}`)
        .query({ limit: 1, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body.pagination).toHaveProperty('limit', 1);
      expect(response.body.pagination).toHaveProperty('offset', 0);
    });
  });

  describe('POST /api/v1/admin/plan', () => {
    it('should create plan with JWT token', async () => {
      const response = await request(app)
        .post('/api/v1/admin/plan')
        .set('Authorization', `Bearer ${testJwtToken}`)
        .send({
          name: 'Premium Plan',
          qps: 200,
          dailyLimit: 20000,
          monthlyLimit: 600000,
          pricePerCall: 0.002,
          pricePerByte: 0.0002
        });

      expect(response.status).toBe(201);
      expect(response.body.code).toBe('SUCCESS');
      expect(response.body.data).toHaveProperty('planId');
      expect(response.body.data).toHaveProperty('name', 'Premium Plan');
    });

    it('should validate plan data', async () => {
      const response = await request(app)
        .post('/api/v1/admin/plan')
        .set('Authorization', `Bearer ${testJwtToken}`)
        .send({
          name: '',
          qps: -1
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/admin/apikey', () => {
    it('should create API key with JWT token', async () => {
      const response = await request(app)
        .post('/api/v1/admin/apikey')
        .set('Authorization', `Bearer ${testJwtToken}`)
        .send({
          userId: testUser.id,
          planId: 1,
          name: 'New API Key'
        });

      expect(response.status).toBe(201);
      expect(response.body.code).toBe('SUCCESS');
      expect(response.body.data).toHaveProperty('keyId');
      expect(response.body.data).toHaveProperty('apiKey');
      expect(response.body.data.apiKey).toMatch(/^ac_[a-f0-9]{48}$/);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/admin/apikey')
        .set('Authorization', `Bearer ${testJwtToken}`)
        .send({
          userId: testUser.id
          // Missing planId
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('MISSING_PARAMETERS');
    });
  });

  describe('POST /api/v1/pay', () => {
    it('should process payment with valid API key', async () => {
      const response = await request(app)
        .post('/api/v1/pay')
        .set('X-API-Key', testApiKey)
        .send({
          txHash: '0xabcdef123456789',
          billingPeriod: 'monthly'
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe('SUCCESS');
      expect(response.body.data).toHaveProperty('billingId');
      expect(response.body.data).toHaveProperty('amount');
      expect(response.body.data).toHaveProperty('txHash', '0xabcdef123456789');
    });

    it('should reject duplicate transaction hash', async () => {
      const txHash = '0xabcdef123456789';
      
      // First payment
      await request(app)
        .post('/api/v1/pay')
        .set('X-API-Key', testApiKey)
        .send({
          txHash,
          billingPeriod: 'monthly'
        });

      // Second payment with same hash
      const response = await request(app)
        .post('/api/v1/pay')
        .set('X-API-Key', testApiKey)
        .send({
          txHash,
          billingPeriod: 'monthly'
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('DUPLICATE_TRANSACTION');
    });

    it('should validate payment data', async () => {
      const response = await request(app)
        .post('/api/v1/pay')
        .set('X-API-Key', testApiKey)
        .send({
          // Missing txHash
          billingPeriod: 'monthly'
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/pay/history', () => {
    beforeEach(async () => {
      // Mock database responses for payment records
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: 1,
            amount: 10.0,
            status: 'paid',
            billing_period: 'monthly',
            tx_hash: '0xabcdef123456',
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            id: 2,
            amount: 5.0,
            status: 'paid',
            billing_period: 'weekly',
            tx_hash: '0x123456789abc',
            created_at: new Date(),
            updated_at: new Date()
          }
        ]
      });
    });

    it('should get payment history with valid API key', async () => {
      const response = await request(app)
        .get('/api/v1/pay/history')
        .set('X-API-Key', testApiKey);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe('SUCCESS');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('amount');
      expect(response.body.data[0]).toHaveProperty('tx_hash');
    });

    it('should filter by billing period', async () => {
      const response = await request(app)
        .get('/api/v1/pay/history')
        .set('X-API-Key', testApiKey)
        .query({ period: 'monthly' });

      expect(response.status).toBe(200);
      expect(response.body.data.every(record => record.billing_period === 'monthly')).toBe(true);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});