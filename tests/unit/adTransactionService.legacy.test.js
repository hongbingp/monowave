// LEGACY TEST FILE - Tests old contract architecture
// This file is kept for reference but may not work with current MVP contracts
// New tests for MVP functionality are in separate files

const AdTransactionService = require('../../src/services/adTransactionService');
const { Web3 } = require('web3');
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

describe('AdTransactionService', () => {
  let adTransactionService;
  let mockClient;
  let mockContract;
  let mockWeb3;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock database client
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(mockClient);

    // Mock Web3 contract (MVP BatchLedger)
    mockContract = {
      methods: {
        commitBatch: jest.fn(),
        getBatchInfo: jest.fn(),
        isBatchCommitted: jest.fn(),
        queueTransaction: jest.fn(),
        processPendingTransactions: jest.fn()
      }
    };

    // Mock Web3 instance
    mockWeb3 = {
      eth: {
        accounts: {
          privateKeyToAccount: jest.fn().mockReturnValue({
            address: '0x1234567890123456789012345678901234567890'
          }),
          wallet: {
            add: jest.fn()
          }
        },
        getGasPrice: jest.fn().mockResolvedValue('20000000000'),
        Contract: jest.fn().mockReturnValue(mockContract)
      },
      utils: {
        toWei: jest.fn().mockImplementation((value, unit) => {
          if (unit === 'wei') return value;
          return (parseFloat(value) * Math.pow(10, 18)).toString();
        }),
        fromWei: jest.fn().mockImplementation((value, unit) => {
          if (unit === 'mwei') return (parseFloat(value) / 1000000).toString();
          return (parseFloat(value) / Math.pow(10, 18)).toString();
        })
      }
    };

    // Set environment variables for testing (MVP contracts)
    process.env.PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    process.env.BATCH_LEDGER_ADDRESS = '0x6c8D53600C7f8F97ed32e6162867F3340dE3Ab37';
    process.env.WEB3_PROVIDER_URL = 'http://127.0.0.1:8546';

    // Mock Web3 constructor
    const { Web3 } = require('web3');
    Web3.mockImplementation(() => mockWeb3);

    adTransactionService = new AdTransactionService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  describe('recordAdTransaction', () => {
    const mockTransactionData = {
      publisherAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      advertiserAddress: '0x8ba1f109551bD432803012645Hac136c54C1e92b',
      aiSearcherAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      campaignId: 1001,
      adAmountUSDC: 50.0,
      adId: 'ad_12345',
      creativeUrl: 'https://example.com/ad.jpg',
      landingPageUrl: 'https://example.com/landing',
      targetAudience: 'tech-enthusiasts',
      contentUrl: 'https://example.com/content',
      transactionType: 'impression'
    };

    test('should successfully record ad transaction with blockchain', async () => {
      // Mock successful blockchain transaction
      const mockTx = {
        transactionHash: '0xabcdef123456789',
        gasUsed: 400000,
        blockNumber: 12345,
        events: {
          AdTransactionRecorded: {
            returnValues: {
              transactionId: '5'
            }
          }
        }
      };

      mockContract.methods.recordAdTransaction.mockReturnValue({
        send: jest.fn().mockResolvedValue(mockTx)
      });

      // Mock database inserts
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 10 }] }) // Initial insert
        .mockResolvedValueOnce({}); // Update with blockchain info

      const result = await adTransactionService.recordAdTransaction(mockTransactionData);

      expect(result.success).toBe(true);
      expect(result.txHash).toBe('0xabcdef123456789');
      expect(result.blockchainTransactionId).toBe('5');
      expect(result.dbRecordId).toBe(10);

      // Verify blockchain call
      expect(mockContract.methods.recordAdTransaction).toHaveBeenCalledWith(
        mockTransactionData.publisherAddress,
        mockTransactionData.advertiserAddress,
        mockTransactionData.aiSearcherAddress,
        mockTransactionData.campaignId,
        '50000000', // 50 USDC in wei format
        mockTransactionData.adId,
        mockTransactionData.creativeUrl,
        mockTransactionData.landingPageUrl,
        mockTransactionData.targetAudience,
        mockTransactionData.contentUrl,
        mockTransactionData.transactionType
      );

      // Verify database record
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ad_transactions'),
        expect.arrayContaining([
          mockTransactionData.publisherAddress,
          mockTransactionData.advertiserAddress,
          mockTransactionData.aiSearcherAddress,
          mockTransactionData.campaignId,
          mockTransactionData.adAmountUSDC,
          34.3, // 70% of remaining after 2% platform fee (50 * 0.98 * 0.70)
          14.7, // 30% of remaining after platform fee (50 * 0.98 * 0.30)
          1.0,  // 2% platform fee
          mockTransactionData.adId,
          mockTransactionData.creativeUrl,
          mockTransactionData.landingPageUrl,
          mockTransactionData.targetAudience,
          mockTransactionData.contentUrl,
          mockTransactionData.transactionType
        ])
      );

      // Verify blockchain info update
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE ad_transactions'),
        ['0xabcdef123456789', '5', 10]
      );
    });

    test('should handle blockchain failure gracefully', async () => {
      // Mock blockchain failure
      mockContract.methods.recordAdTransaction.mockReturnValue({
        send: jest.fn().mockRejectedValue(new Error('Gas estimation failed'))
      });

      // Mock database insert
      mockClient.query.mockResolvedValue({ rows: [{ id: 11 }] });

      const result = await adTransactionService.recordAdTransaction(mockTransactionData);

      expect(result.success).toBe(true); // Should still succeed with database
      expect(result.txHash).toBeNull();
      expect(result.blockchainTransactionId).toBeNull();
      expect(result.dbRecordId).toBe(11);
      expect(result.error).toContain('Blockchain recording failed');

      // Verify database record was still created
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ad_transactions'),
        expect.any(Array)
      );
    });

    test('should work without blockchain service available', async () => {
      // Create service without blockchain
      delete process.env.PRIVATE_KEY;
      const offlineService = new AdTransactionService();

      // Mock database insert
      mockClient.query.mockResolvedValue({ rows: [{ id: 12 }] });

      const result = await offlineService.recordAdTransaction(mockTransactionData);

      expect(result.success).toBe(true);
      expect(result.txHash).toBeNull();
      expect(result.blockchainTransactionId).toBeNull();
      expect(result.dbRecordId).toBe(12);
      expect(result.message).toContain('Recorded in database only');

      // Verify database record
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ad_transactions'),
        expect.any(Array)
      );
    });

    test('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database insert failed'));

      const result = await adTransactionService.recordAdTransaction(mockTransactionData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database insert failed');
      expect(result.dbRecordId).toBeNull();
    });

    test('should calculate shares correctly', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ id: 13 }] });

      await adTransactionService.recordAdTransaction({
        ...mockTransactionData,
        adAmountUSDC: 100.0
      });

      // Verify calculation: 100 USDC
      // Platform fee: 100 * 0.02 = 2 USDC
      // Remaining: 98 USDC
      // Publisher share: 98 * 0.70 = 68.6 USDC
      // AI searcher share: 98 * 0.30 = 29.4 USDC
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ad_transactions'),
        expect.arrayContaining([
          expect.any(String), // publisherAddress
          expect.any(String), // advertiserAddress
          expect.any(String), // aiSearcherAddress
          expect.any(Number), // campaignId
          100.0, // adAmount
          68.6,  // publisherShare
          29.4,  // aiSearcherShare
          2.0,   // platformFee
          expect.any(String), // adId
          expect.any(String), // creativeUrl
          expect.any(String), // landingPageUrl
          expect.any(String), // targetAudience
          expect.any(String), // contentUrl
          expect.any(String)  // transactionType
        ])
      );
    });
  });

  describe('settleAdTransaction', () => {
    test('should successfully settle ad transaction', async () => {
      const mockTx = {
        transactionHash: '0xsettlement123',
        gasUsed: 150000
      };

      mockContract.methods.settleAdTransaction.mockReturnValue({
        send: jest.fn().mockResolvedValue(mockTx)
      });

      const result = await adTransactionService.settleAdTransaction(
        5,
        '0xabcdefsettlementhash'
      );

      expect(result.success).toBe(true);
      expect(result.txHash).toBe('0xsettlement123');
      expect(result.gasUsed).toBe(150000);

      expect(mockContract.methods.settleAdTransaction).toHaveBeenCalledWith(
        5,
        '0xabcdefsettlementhash'
      );
    });

    test('should handle settlement failure', async () => {
      mockContract.methods.settleAdTransaction.mockReturnValue({
        send: jest.fn().mockRejectedValue(new Error('Transaction not found'))
      });

      const result = await adTransactionService.settleAdTransaction(
        999,
        '0xbadsettlementhash'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Transaction not found');
    });

    test('should handle blockchain service not available', async () => {
      delete process.env.PRIVATE_KEY;
      const offlineService = new AdTransactionService();

      const result = await offlineService.settleAdTransaction(5, '0xhash');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Blockchain service not available');
    });
  });

  describe('updateTransactionStatus', () => {
    test('should successfully update transaction status', async () => {
      const mockTx = {
        transactionHash: '0xstatus123',
        gasUsed: 100000
      };

      mockContract.methods.updateTransactionStatus.mockReturnValue({
        send: jest.fn().mockResolvedValue(mockTx)
      });

      const result = await adTransactionService.updateTransactionStatus(
        5,
        'completed',
        'Manual completion'
      );

      expect(result.success).toBe(true);
      expect(result.txHash).toBe('0xstatus123');

      expect(mockContract.methods.updateTransactionStatus).toHaveBeenCalledWith(
        5,
        'completed',
        'Manual completion'
      );
    });

    test('should handle status update failure', async () => {
      mockContract.methods.updateTransactionStatus.mockReturnValue({
        send: jest.fn().mockRejectedValue(new Error('Access denied'))
      });

      const result = await adTransactionService.updateTransactionStatus(
        5,
        'disputed',
        'User complaint'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Access denied');
    });
  });

  describe('getAdTransactionDetails', () => {
    test('should retrieve transaction details successfully', async () => {
      const mockDetails = {
        publisher: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        advertiser: '0x8ba1f109551bD432803012645Hac136c54C1e92b',
        aiSearcher: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        campaignId: '1001',
        adAmount: '50000000', // Wei
        publisherShare: '35000000', // Wei
        aiSearcherShare: '15000000', // Wei
        platformFee: '1000000', // Wei
        timestamp: '1640995200',
        adId: 'ad_12345',
        transactionType: 'impression',
        settlementHash: '0xsettlementhash',
        settled: true,
        status: 'completed'
      };

      mockContract.methods.getAdTransactionDetails.mockReturnValue({
        call: jest.fn().mockResolvedValue(mockDetails)
      });

      const result = await adTransactionService.getAdTransactionDetails(5);

      expect(result).toEqual({
        publisher: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        advertiser: '0x8ba1f109551bD432803012645Hac136c54C1e92b',
        aiSearcher: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        campaignId: 1001,
        adAmount: 50.0, // Converted from wei
        publisherShare: 35.0,
        aiSearcherShare: 15.0,
        platformFee: 1.0,
        timestamp: 1640995200,
        adId: 'ad_12345',
        transactionType: 'impression',
        settlementHash: '0xsettlementhash',
        settled: true,
        status: 'completed'
      });
    });

    test('should handle contract call failure', async () => {
      mockContract.methods.getAdTransactionDetails.mockReturnValue({
        call: jest.fn().mockRejectedValue(new Error('Contract call failed'))
      });

      const result = await adTransactionService.getAdTransactionDetails(5);
      expect(result).toBeNull();
    });
  });

  describe('getEntityMetrics', () => {
    test('should retrieve entity metrics successfully', async () => {
      const mockMetrics = {
        impressions: '1000',
        clicks: '50',
        conversions: '5',
        totalRevenue: '500000000', // Wei
        averageCPM: '10000000', // Wei
        averageCPC: '200000000', // Wei
        averageCPA: '2000000000' // Wei
      };

      mockContract.methods.getEntityMetrics.mockReturnValue({
        call: jest.fn().mockResolvedValue(mockMetrics)
      });

      const result = await adTransactionService.getEntityMetrics(
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        'publisher'
      );

      expect(result).toEqual({
        impressions: 1000,
        clicks: 50,
        conversions: 5,
        totalRevenue: 500.0, // Converted from wei
        averageCPM: 10.0,
        averageCPC: 200.0,
        averageCPA: 2000.0
      });

      expect(mockContract.methods.getEntityMetrics).toHaveBeenCalledWith(
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        'publisher'
      );
    });

    test('should handle metrics retrieval failure', async () => {
      mockContract.methods.getEntityMetrics.mockReturnValue({
        call: jest.fn().mockRejectedValue(new Error('Metrics not found'))
      });

      const result = await adTransactionService.getEntityMetrics(
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        'publisher'
      );

      expect(result).toBeNull();
    });
  });

  describe('getCampaignMetrics', () => {
    test('should retrieve campaign metrics successfully', async () => {
      const mockMetrics = {
        impressions: '2000',
        clicks: '100',
        conversions: '10',
        totalRevenue: '1000000000', // Wei
        averageCPM: '15000000', // Wei
        averageCPC: '300000000', // Wei
        averageCPA: '3000000000' // Wei
      };

      mockContract.methods.getCampaignMetrics.mockReturnValue({
        call: jest.fn().mockResolvedValue(mockMetrics)
      });

      const result = await adTransactionService.getCampaignMetrics(1001);

      expect(result).toEqual({
        impressions: 2000,
        clicks: 100,
        conversions: 10,
        totalRevenue: 1000.0,
        averageCPM: 15.0,
        averageCPC: 300.0,
        averageCPA: 3000.0
      });

      expect(mockContract.methods.getCampaignMetrics).toHaveBeenCalledWith(1001);
    });
  });

  describe('getPlatformStats', () => {
    test('should retrieve platform stats successfully', async () => {
      const mockStats = {
        _transactionCounter: '100',
        _totalTransactionVolume: '10000000000', // Wei
        _totalPlatformFees: '200000000', // Wei
        _platformFeeRate: '200' // Basis points
      };

      mockContract.methods.getPlatformStats.mockReturnValue({
        call: jest.fn().mockResolvedValue(mockStats)
      });

      const result = await adTransactionService.getPlatformStats();

      expect(result).toEqual({
        transactionCounter: 100,
        totalTransactionVolume: 10000.0,
        totalPlatformFees: 200.0,
        platformFeeRate: 2.0 // Converted from basis points
      });
    });

    test('should return null when contract not available', async () => {
      delete process.env.AD_TRANSACTION_RECORDER_ADDRESS;
      const offlineService = new AdTransactionService();

      const result = await offlineService.getPlatformStats();
      expect(result).toBeNull();
    });
  });

  describe('Database operations', () => {
    test('should handle database connection errors', async () => {
      pool.connect.mockRejectedValue(new Error('Database connection failed'));

      const result = await adTransactionService.recordAdTransaction({
        publisherAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        advertiserAddress: '0x8ba1f109551bD432803012645Hac136c54C1e92b',
        aiSearcherAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        campaignId: 1001,
        adAmountUSDC: 50.0,
        adId: 'ad_12345',
        creativeUrl: 'https://example.com/ad.jpg',
        landingPageUrl: 'https://example.com/landing',
        targetAudience: 'tech-enthusiasts',
        contentUrl: 'https://example.com/content',
        transactionType: 'impression'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    test('should release database client on success', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ id: 1 }] });

      await adTransactionService.recordAdTransaction({
        publisherAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        advertiserAddress: '0x8ba1f109551bD432803012645Hac136c54C1e92b',
        aiSearcherAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        campaignId: 1001,
        adAmountUSDC: 50.0,
        adId: 'ad_12345',
        creativeUrl: 'https://example.com/ad.jpg',
        landingPageUrl: 'https://example.com/landing',
        targetAudience: 'tech-enthusiasts',
        contentUrl: 'https://example.com/content',
        transactionType: 'impression'
      });

      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should release database client on error', async () => {
      mockClient.query.mockRejectedValue(new Error('Database query failed'));

      await adTransactionService.recordAdTransaction({
        publisherAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        advertiserAddress: '0x8ba1f109551bD432803012645Hac136c54C1e92b',
        aiSearcherAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        campaignId: 1001,
        adAmountUSDC: 50.0,
        adId: 'ad_12345',
        creativeUrl: 'https://example.com/ad.jpg',
        landingPageUrl: 'https://example.com/landing',
        targetAudience: 'tech-enthusiasts',
        contentUrl: 'https://example.com/content',
        transactionType: 'impression'
      });

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle missing transaction data gracefully', async () => {
      const result = await adTransactionService.recordAdTransaction({});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle invalid campaign ID', async () => {
      const result = await adTransactionService.getCampaignMetrics('invalid');

      expect(result).toBeNull();
    });

    test('should handle wei conversion errors gracefully', async () => {
      // Mock database to succeed first, then Web3 utils to throw error
      mockClient.query.mockResolvedValue({ rows: [{ id: 100 }] });
      
      // Mock Web3 utils to throw error during blockchain interaction
      mockWeb3.utils.toWei.mockImplementation(() => {
        throw new Error('Wei conversion failed');
      });

      const result = await adTransactionService.recordAdTransaction({
        publisherAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        advertiserAddress: '0x8ba1f109551bD432803012645Hac136c54C1e92b',
        aiSearcherAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        campaignId: 1001,
        adAmountUSDC: 50.0,
        adId: 'ad_12345',
        creativeUrl: 'https://example.com/ad.jpg',
        landingPageUrl: 'https://example.com/landing',
        targetAudience: 'tech-enthusiasts',
        contentUrl: 'https://example.com/content',
        transactionType: 'impression'
      });

      // Should succeed with database but fail blockchain part
      expect(result.success).toBe(true);
      expect(result.dbRecordId).toBe(100);
      expect(result.error).toContain('Wei conversion failed');
    });
  });
});