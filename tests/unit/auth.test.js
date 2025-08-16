const AuthService = require('../../src/utils/auth');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../../src/config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

const { pool } = require('../../src/config/database');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.API_KEY_PREFIX = 'test_';
  });

  describe('generateApiKey', () => {
    it('should generate API key with correct prefix', () => {
      const apiKey = AuthService.generateApiKey();
      expect(apiKey).toMatch(/^test_[a-f0-9]{48}$/);
    });

    it('should generate unique API keys', () => {
      const key1 = AuthService.generateApiKey();
      const key2 = AuthService.generateApiKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('hashApiKey', () => {
    it('should hash API key successfully', async () => {
      const apiKey = 'test_123456789';
      const hash = await AuthService.hashApiKey(apiKey);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(apiKey);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should create different hashes for same key', async () => {
      const apiKey = 'test_123456789';
      const hash1 = await AuthService.hashApiKey(apiKey);
      const hash2 = await AuthService.hashApiKey(apiKey);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyApiKey', () => {
    it('should verify correct API key', async () => {
      const apiKey = 'test_123456789';
      const hash = await AuthService.hashApiKey(apiKey);
      
      const isValid = await AuthService.verifyApiKey(apiKey, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect API key', async () => {
      const apiKey = 'test_123456789';
      const wrongKey = 'test_987654321';
      const hash = await AuthService.hashApiKey(apiKey);
      
      const isValid = await AuthService.verifyApiKey(wrongKey, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('createApiKey', () => {
    it('should create API key successfully', async () => {
      const mockResult = { rows: [{ id: 1 }] };
      pool.query.mockResolvedValue(mockResult);

      const result = await AuthService.createApiKey(1, 1, 'Test Key');
      
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('apiKey');
      expect(result).toHaveProperty('keyHash');
      expect(result.apiKey).toMatch(/^test_[a-f0-9]{48}$/);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO api_keys'),
        expect.arrayContaining([expect.any(String), 1, 1, 'Test Key', null])
      );
    });

    it('should create API key with expiration', async () => {
      const mockResult = { rows: [{ id: 1 }] };
      pool.query.mockResolvedValue(mockResult);
      
      const expiresAt = new Date('2024-12-31');
      const result = await AuthService.createApiKey(1, 1, 'Test Key', expiresAt);
      
      expect(result).toHaveProperty('id', 1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO api_keys'),
        expect.arrayContaining([expect.any(String), 1, 1, 'Test Key', expiresAt])
      );
    });
  });

  describe('validateApiKey', () => {
    it('should validate active API key', async () => {
      const apiKey = 'test_123456789';
      const hash = await AuthService.hashApiKey(apiKey);
      
      const mockResult = {
        rows: [{
          id: 1,
          key_hash: hash,
          user_id: 1,
          plan_id: 1,
          qps: 100,
          daily_limit: 10000,
          monthly_limit: 300000,
          price_per_call: 0.001,
          price_per_byte: 0.0001,
          balance: 10.0,
          wallet_address: '0x123'
        }]
      };
      pool.query.mockResolvedValue(mockResult);

      const result = await AuthService.validateApiKey(apiKey);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.userId).toBe(1);
      expect(result.planId).toBe(1);
      expect(result.limits.qps).toBe(100);
      expect(result.user.balance).toBe(10.0);
    });

    it('should return null for invalid API key', async () => {
      const apiKey = 'test_invalid';
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      const result = await AuthService.validateApiKey(apiKey);
      
      expect(result).toBeNull();
    });

    it('should return null for expired API key', async () => {
      const apiKey = 'test_123456789';
      
      // Mock empty result since expired keys are filtered out by the query
      const mockResult = { rows: [] };
      pool.query.mockResolvedValue(mockResult);

      const result = await AuthService.validateApiKey(apiKey);
      
      expect(result).toBeNull();
    });
  });

  describe('deactivateApiKey', () => {
    it('should deactivate API key', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await AuthService.deactivateApiKey(1);
      
      expect(pool.query).toHaveBeenCalledWith(
        'UPDATE api_keys SET status = $1, updated_at = NOW() WHERE id = $2',
        ['inactive', 1]
      );
    });
  });

  describe('JWT operations', () => {
    it('should generate JWT token', () => {
      const payload = { userId: 1, email: 'test@example.com' };
      const token = AuthService.generateJWT(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Verify token structure
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });

    it('should verify JWT token', () => {
      const payload = { userId: 1, email: 'test@example.com' };
      const token = AuthService.generateJWT(payload);
      
      const decoded = AuthService.verifyJWT(token);
      
      expect(decoded.userId).toBe(1);
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.exp).toBeDefined();
    });

    it('should reject invalid JWT token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => {
        AuthService.verifyJWT(invalidToken);
      }).toThrow();
    });

    it('should reject expired JWT token', () => {
      const payload = { userId: 1, email: 'test@example.com' };
      const expiredToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '-1h' });
      
      expect(() => {
        AuthService.verifyJWT(expiredToken);
      }).toThrow();
    });
  });
});