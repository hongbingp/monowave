const AdTransactionService = require('../../src/services/adTransactionService');
const { pool } = require('../../src/config/database');

// Mock Web3 and logger
jest.mock('web3', () => ({
  Web3: jest.fn()
}));
jest.mock('../../src/utils/logger');

// Mock database pool
jest.mock('../../src/config/database', () => ({
  pool: {
    connect: jest.fn(),
    query: jest.fn()
  }
}));

describe('AdTransactionService (MVP)', () => {
  let adTransactionService;
  let mockClient;
  let mockContract;
  let mockWeb3;
  let mockAccount;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock database client
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(mockClient);

    // Mock account
    mockAccount = {
      address: '0x1234567890123456789012345678901234567890'
    };

    // Mock Web3 contract (MVP BatchLedger)
    mockContract = {
      methods: {
        commitBatch: jest.fn().mockReturnValue({
          send: jest.fn()
        }),
        getBatchInfo: jest.fn().mockReturnValue({
          call: jest.fn()
        }),
        isBatchCommitted: jest.fn().mockReturnValue({
          call: jest.fn()
        })
      }
    };

    // Mock Web3 instance
    mockWeb3 = {
      eth: {
        accounts: {
          privateKeyToAccount: jest.fn().mockReturnValue(mockAccount),
          wallet: {
            add: jest.fn()
          }
        },
        Contract: jest.fn().mockReturnValue(mockContract)
      }
    };

    const { Web3 } = require('web3');
    Web3.mockImplementation(() => mockWeb3);

    // Set environment variables
    process.env.WEB3_PROVIDER_URL = 'http://localhost:8545';
    process.env.BATCH_LEDGER_ADDRESS = '0x6c8D53600C7f8F97ed32e6162867F3340dE3Ab37';
    process.env.DISTRIBUTOR_ADDRESS = '0x93b6BDa6a0813D808d75aA42e900664Ceb868bcF';
    process.env.PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    process.env.BATCH_SIZE = '50';
    process.env.BATCH_TIMEOUT_MS = '30000';

    adTransactionService = new AdTransactionService();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.WEB3_PROVIDER_URL;
    delete process.env.BATCH_LEDGER_ADDRESS;
    delete process.env.DISTRIBUTOR_ADDRESS;
    delete process.env.PRIVATE_KEY;
    delete process.env.BATCH_SIZE;
    delete process.env.BATCH_TIMEOUT_MS;
  });

  describe('Constructor', () => {
    test('should initialize with valid configuration', () => {
      expect(adTransactionService).toBeDefined();
      expect(adTransactionService.isAvailable()).toBe(true);
      expect(adTransactionService.getContractAddress()).toBe('0x6c8D53600C7f8F97ed32e6162867F3340dE3Ab37');
    });

    test('should handle missing private key gracefully', () => {
      delete process.env.PRIVATE_KEY;
      const service = new AdTransactionService();
      expect(service.isAvailable()).toBe(false);
    });

    test('should handle missing contract address gracefully', () => {
      delete process.env.BATCH_LEDGER_ADDRESS;
      const service = new AdTransactionService();
      expect(service.isAvailable()).toBe(false);
    });
  });

  const mockTransactionData = {
    publisherAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    advertiserAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    aiSearcherAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    campaignId: 'campaign_123',
    adAmountUSDC: 50.0,
    adId: 'ad_456',
    creativeUrl: 'https://example.com/creative.png',
    landingPageUrl: 'https://example.com/landing',
    targetAudience: 'tech-enthusiasts',
    contentUrl: 'https://example.com/content',
    transactionType: 'impression'
  };

  describe('recordAdTransaction', () => {

    test('should successfully record ad transaction and queue for batch', async () => {
      // Mock database insert
      mockClient.query.mockResolvedValue({ rows: [{ id: 10 }] });

      const result = await adTransactionService.recordAdTransaction(mockTransactionData);

      expect(result.success).toBe(true);
      expect(result.dbRecordId).toBe(10);
      expect(result.message).toContain('batch processing');

      // Verify database call
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ad_transactions'),
        expect.arrayContaining([
          mockTransactionData.publisherAddress,
          mockTransactionData.advertiserAddress,
          mockTransactionData.aiSearcherAddress,
          mockTransactionData.campaignId,
          mockTransactionData.adAmountUSDC,
          mockTransactionData.adId,
          mockTransactionData.creativeUrl,
          mockTransactionData.landingPageUrl,
          mockTransactionData.targetAudience,
          mockTransactionData.contentUrl,
          mockTransactionData.transactionType
        ])
      );
    });

    test('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValue(new Error('Database connection failed'));

      const result = await adTransactionService.recordAdTransaction(mockTransactionData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    test('should work without blockchain service available', async () => {
      // Create service without blockchain
      delete process.env.PRIVATE_KEY;
      const offlineService = new AdTransactionService();

      mockClient.query.mockResolvedValue({ rows: [{ id: 12 }] });

      const result = await offlineService.recordAdTransaction(mockTransactionData);

      expect(result.success).toBe(true);
      expect(result.dbRecordId).toBe(12);
      expect(result.message).toContain('batch processing');
    });

    test('should validate required fields', async () => {
      const result = await adTransactionService.recordAdTransaction({
        publisherAddress: mockTransactionData.publisherAddress,
        // Missing required fields
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Batch Processing', () => {
    test('should handle batch processing configuration', () => {
      expect(adTransactionService.batchSize).toBe(50);
      expect(adTransactionService.batchTimeout).toBe(30000);
    });

    test('should queue transactions for batch processing', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ id: 1 }] });

      const result = await adTransactionService.recordAdTransaction(mockTransactionData);

      expect(result.success).toBe(true);
      expect(result.message).toContain('batch processing');
    });
  });

  describe('Utility Methods', () => {
    test('should check if service is available', () => {
      expect(adTransactionService.isAvailable()).toBe(true);
      
      // Test without private key
      delete process.env.PRIVATE_KEY;
      const offlineService = new AdTransactionService();
      expect(offlineService.isAvailable()).toBe(false);
    });

    test('should return contract address', () => {
      expect(adTransactionService.getContractAddress()).toBe(process.env.BATCH_LEDGER_ADDRESS);
    });

    test('should generate unique batch ID', () => {
      const batchId1 = adTransactionService._generateBatchId();
      const batchId2 = adTransactionService._generateBatchId();
      
      expect(batchId1).toMatch(/^0x[0-9a-f]{64}$/);
      expect(batchId2).toMatch(/^0x[0-9a-f]{64}$/);
      expect(batchId1).not.toBe(batchId2);
    });
  });

  describe('Database operations', () => {
    test('should handle database connection errors', async () => {
      pool.connect.mockRejectedValue(new Error('Connection failed'));

      const result = await adTransactionService.recordAdTransaction(mockTransactionData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection failed');
    });

    test('should release database client on success', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ id: 1 }] });

      await adTransactionService.recordAdTransaction(mockTransactionData);

      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should release database client on error', async () => {
      mockClient.query.mockRejectedValue(new Error('Query failed'));

      await adTransactionService.recordAdTransaction(mockTransactionData);

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle missing transaction data gracefully', async () => {
      mockClient.query.mockRejectedValue(new Error('Required fields missing'));
      
      const result = await adTransactionService.recordAdTransaction({});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle invalid campaign ID', async () => {
      mockClient.query.mockRejectedValue(new Error('Invalid campaign ID'));
      
      const invalidData = { ...mockTransactionData, campaignId: null };

      const result = await adTransactionService.recordAdTransaction(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid campaign ID');
    });

    test('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      const result = await adTransactionService.recordAdTransaction(mockTransactionData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });
});