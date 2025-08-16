const configService = require('../../src/services/configService');

// Mock dependencies
jest.mock('../../src/config/database', () => ({
  pool: {
    connect: jest.fn()
  }
}));
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const { pool } = require('../../src/config/database');

describe('ConfigService', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock database client
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(mockClient);

    // Clear cache
    configService.cache.clear();
    configService.lastCacheUpdate = 0;
  });

  describe('get', () => {
    test('should get value from cache when valid', async () => {
      configService.cache.set('test_key', 'cached_value');
      configService.lastCacheUpdate = Date.now();

      const result = await configService.get('test_key');

      expect(result).toBe('cached_value');
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    test('should refresh cache and get value when cache expired', async () => {
      mockClient.query.mockResolvedValue({
        rows: [
          { key: 'test_key', value: 'db_value', value_type: 'string' },
          { key: 'other_key', value: '42', value_type: 'number' }
        ]
      });

      const result = await configService.get('test_key');

      expect(result).toBe('db_value');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT key, value, value_type')
      );
    });

    test('should return default value when key not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await configService.get('nonexistent_key', 'default');

      expect(result).toBe('default');
    });

    test('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      const result = await configService.get('test_key', 'fallback');

      expect(result).toBe('fallback');
    });
  });

  describe('set', () => {
    test('should set string value', async () => {
      await configService.set('test_key', 'test_value', 'Test description', 'test');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO mvp_configuration'),
        ['test_key', 'test_value', 'string', 'Test description', 'test']
      );
      expect(configService.cache.get('test_key')).toBe('test_value');
    });

    test('should set number value', async () => {
      await configService.set('num_key', 42);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO mvp_configuration'),
        ['num_key', '42', 'number', null, 'general']
      );
      expect(configService.cache.get('num_key')).toBe(42);
    });

    test('should set boolean value', async () => {
      await configService.set('bool_key', true);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO mvp_configuration'),
        ['bool_key', 'true', 'boolean', null, 'general']
      );
      expect(configService.cache.get('bool_key')).toBe(true);
    });

    test('should set JSON value', async () => {
      const jsonValue = { test: 'object' };
      await configService.set('json_key', jsonValue);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO mvp_configuration'),
        ['json_key', JSON.stringify(jsonValue), 'json', null, 'general']
      );
      expect(configService.cache.get('json_key')).toEqual(jsonValue);
    });
  });

  describe('getAll', () => {
    test('should get all configurations', async () => {
      mockClient.query.mockResolvedValue({
        rows: [
          {
            key: 'key1',
            value: 'value1',
            value_type: 'string',
            description: 'Test key 1',
            category: 'test',
            updated_at: new Date()
          },
          {
            key: 'key2',
            value: '42',
            value_type: 'number',
            description: 'Test key 2',
            category: 'test',
            updated_at: new Date()
          }
        ]
      });

      const result = await configService.getAll();

      expect(result).toEqual({
        key1: {
          value: 'value1',
          type: 'string',
          description: 'Test key 1',
          category: 'test',
          updatedAt: expect.any(Date)
        },
        key2: {
          value: 42,
          type: 'number',
          description: 'Test key 2',
          category: 'test',
          updatedAt: expect.any(Date)
        }
      });
    });

    test('should filter by category', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await configService.getAll('batching');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('AND category = $1'),
        ['batching']
      );
    });
  });

  describe('parseValue', () => {
    test('should parse boolean values', () => {
      expect(configService.parseValue('true', 'boolean')).toBe(true);
      expect(configService.parseValue('false', 'boolean')).toBe(false);
      expect(configService.parseValue(true, 'boolean')).toBe(true);
    });

    test('should parse number values', () => {
      expect(configService.parseValue('42', 'number')).toBe(42);
      expect(configService.parseValue('3.14', 'number')).toBe(3.14);
    });

    test('should parse JSON values', () => {
      const obj = { test: 'value' };
      expect(configService.parseValue(JSON.stringify(obj), 'json')).toEqual(obj);
      expect(configService.parseValue('invalid json', 'json')).toBe('invalid json');
    });

    test('should return string values as-is', () => {
      expect(configService.parseValue('test', 'string')).toBe('test');
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      // Mock the get method
      jest.spyOn(configService, 'get');
    });

    test('getBatchSize should return batch size', async () => {
      configService.get.mockResolvedValue(100);
      const result = await configService.getBatchSize();
      expect(configService.get).toHaveBeenCalledWith('batch_size', 100);
      expect(result).toBe(100);
    });

    test('getBatchTimeout should return batch timeout', async () => {
      configService.get.mockResolvedValue(30000);
      const result = await configService.getBatchTimeout();
      expect(configService.get).toHaveBeenCalledWith('batch_timeout_ms', 30000);
      expect(result).toBe(30000);
    });

    test('getRevenueBatchSize should return revenue batch size', async () => {
      configService.get.mockResolvedValue(50);
      const result = await configService.getRevenueBatchSize();
      expect(configService.get).toHaveBeenCalledWith('revenue_batch_size', 50);
      expect(result).toBe(50);
    });

    test('shouldAutoRegisterParticipants should return boolean', async () => {
      configService.get.mockResolvedValue(true);
      const result = await configService.shouldAutoRegisterParticipants();
      expect(configService.get).toHaveBeenCalledWith('auto_register_participants', true);
      expect(result).toBe(true);
    });
  });

  describe('calculateRevenueShares', () => {
    beforeEach(() => {
      jest.spyOn(configService, 'getPlatformFeeBps').mockResolvedValue(200); // 2%
      jest.spyOn(configService, 'getPublisherShareBps').mockResolvedValue(7000); // 70%
      jest.spyOn(configService, 'getAiSearcherShareBps').mockResolvedValue(3000); // 30%
    });

    test('should calculate revenue shares correctly', async () => {
      const result = await configService.calculateRevenueShares(100);

      expect(result).toEqual({
        platformFee: 2, // 100 * 0.02
        publisherShare: 68.6, // 98 * 0.70
        aiSearcherShare: 29.4, // 98 * 0.30
        remainingAmount: 98,
        totalAmount: 100
      });
    });

    test('should handle zero amount', async () => {
      const result = await configService.calculateRevenueShares(0);

      expect(result).toEqual({
        platformFee: 0,
        publisherShare: 0,
        aiSearcherShare: 0,
        remainingAmount: 0,
        totalAmount: 0
      });
    });
  });

  describe('updateBatchConfig', () => {
    beforeEach(() => {
      jest.spyOn(configService, 'set').mockResolvedValue();
      jest.spyOn(configService, 'refreshCache').mockResolvedValue();
    });

    test('should update batch configuration', async () => {
      await configService.updateBatchConfig({
        batchSize: 200,
        batchTimeout: 60000,
        revenueBatchSize: 100
      });

      expect(configService.set).toHaveBeenCalledWith('batch_size', 200, 'Ad transaction batch size', 'batching');
      expect(configService.set).toHaveBeenCalledWith('batch_timeout_ms', 60000, 'Batch timeout in milliseconds', 'batching');
      expect(configService.set).toHaveBeenCalledWith('revenue_batch_size', 100, 'Revenue distribution batch size', 'batching');
      expect(configService.refreshCache).toHaveBeenCalled();
    });

    test('should update only provided values', async () => {
      await configService.updateBatchConfig({
        batchSize: 200
      });

      expect(configService.set).toHaveBeenCalledTimes(1);
      expect(configService.set).toHaveBeenCalledWith('batch_size', 200, 'Ad transaction batch size', 'batching');
    });
  });

  describe('getConfigSummary', () => {
    beforeEach(() => {
      jest.spyOn(configService, 'getBatchSize').mockResolvedValue(100);
      jest.spyOn(configService, 'getBatchTimeout').mockResolvedValue(30000);
      jest.spyOn(configService, 'getRevenueBatchSize').mockResolvedValue(50);
      jest.spyOn(configService, 'getDisputeWindow').mockResolvedValue(86400);
      jest.spyOn(configService, 'getPlatformFeeBps').mockResolvedValue(200);
      jest.spyOn(configService, 'getPublisherShareBps').mockResolvedValue(7000);
      jest.spyOn(configService, 'getAiSearcherShareBps').mockResolvedValue(3000);
      jest.spyOn(configService, 'shouldAutoRegisterParticipants').mockResolvedValue(true);
      jest.spyOn(configService, 'shouldSyncBlockchainData').mockResolvedValue(true);
      jest.spyOn(configService, 'getSyncInterval').mockResolvedValue(5);
    });

    test('should return configuration summary', async () => {
      const result = await configService.getConfigSummary();

      expect(result).toEqual({
        batching: {
          batchSize: 100,
          batchTimeout: 30000,
          revenueBatchSize: 50
        },
        revenue: {
          disputeWindow: 86400,
          platformFeeBps: 200,
          publisherShareBps: 7000,
          aiSearcherShareBps: 3000
        },
        participants: {
          autoRegister: true
        },
        sync: {
          enabled: true,
          intervalMinutes: 5
        }
      });
    });
  });
});
