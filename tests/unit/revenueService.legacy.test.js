// LEGACY TEST FILE - Tests old contract architecture
// This file is kept for reference but may not work with current MVP contracts
// New tests for MVP functionality are in separate files

const RevenueService = require('../../src/services/revenueService');
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

describe('RevenueService', () => {
  let revenueService;
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

    // Mock Web3 contract
    mockContract = {
      methods: {
        distributeAdRevenue: jest.fn(),
        distribute: jest.fn(),
        getDistributionDetails: jest.fn(),
        getRecipientTotalReceived: jest.fn(),
        getShareConfiguration: jest.fn(),
        getTotalStats: jest.fn()
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

    // Set environment variables for testing
    process.env.PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    process.env.REVENUE_DISTRIBUTOR_ADDRESS = '0x93b6BDa6a0813D808d75aA42e900664Ceb868bcF';
    process.env.WEB3_PROVIDER_URL = 'http://127.0.0.1:8546';

    // Mock Web3 constructor
    const { Web3 } = require('web3');
    Web3.mockImplementation(() => mockWeb3);

    revenueService = new RevenueService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with valid configuration', () => {
      expect(revenueService).toBeDefined();
      expect(revenueService.isAvailable()).toBe(true);
      expect(revenueService.getContractAddress()).toBe('0x93b6BDa6a0813D808d75aA42e900664Ceb868bcF');
    });

    test('should handle missing private key gracefully', () => {
      delete process.env.PRIVATE_KEY;
      const service = new RevenueService();
      expect(service.isAvailable()).toBe(false);
    });

    test('should handle missing contract address gracefully', () => {
      delete process.env.REVENUE_DISTRIBUTOR_ADDRESS;
      const service = new RevenueService();
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('distributeAdRevenue', () => {
    const mockPublisherAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    const mockAISearcherAddress = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
    const mockRevenue = 100.0;

    test('should successfully distribute ad revenue with blockchain', async () => {
      // Mock successful blockchain transaction
      const mockTx = {
        transactionHash: '0xabcdef123456789',
        gasUsed: 250000,
        blockNumber: 12345,
        events: {
          RevenueDistributed: {
            returnValues: {
              distributionId: '1'
            }
          }
        }
      };

      mockContract.methods.distributeAdRevenue.mockReturnValue({
        send: jest.fn().mockResolvedValue(mockTx)
      });

      // Mock database insert
      mockClient.query.mockResolvedValue({
        rows: [{ id: 1 }]
      });

      const result = await revenueService.distributeAdRevenue(
        mockPublisherAddress,
        mockAISearcherAddress,
        mockRevenue
      );

      expect(result.success).toBe(true);
      expect(result.txHash).toBe('0xabcdef123456789');
      expect(result.distributionId).toBe('1');
      expect(result.dbRecordId).toBe(1);

      // Verify blockchain call
      expect(mockContract.methods.distributeAdRevenue).toHaveBeenCalledWith(
        mockPublisherAddress,
        mockAISearcherAddress,
        '100000000' // 100 USDC in wei format
      );

      // Verify database record
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO revenue_distributions'),
        expect.arrayContaining([
          mockPublisherAddress,
          mockAISearcherAddress,
          mockRevenue,
          70.0, // 70% publisher share
          30.0, // 30% AI searcher share
          'ad_revenue',
          '0xabcdef123456789',
          'completed',
          null
        ])
      );
    });

    test('should handle blockchain failure gracefully', async () => {
      // Mock blockchain failure
      mockContract.methods.distributeAdRevenue.mockReturnValue({
        send: jest.fn().mockRejectedValue(new Error('Gas estimation failed'))
      });

      // Mock database insert for failure case
      mockClient.query.mockResolvedValue({
        rows: [{ id: 2 }]
      });

      const result = await revenueService.distributeAdRevenue(
        mockPublisherAddress,
        mockAISearcherAddress,
        mockRevenue
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Gas estimation failed');
      expect(result.txHash).toBeNull();

      // Verify failed record was still created in database
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO revenue_distributions'),
        expect.arrayContaining([
          mockPublisherAddress,
          mockAISearcherAddress,
          mockRevenue,
          70.0,
          30.0,
          'ad_revenue',
          null, // no tx hash for failed transaction
          'failed',
          'Gas estimation failed'
        ])
      );
    });

    test('should work without blockchain service available', async () => {
      // Create service without blockchain
      delete process.env.PRIVATE_KEY;
      const offlineService = new RevenueService();

      // Mock database insert
      mockClient.query.mockResolvedValue({
        rows: [{ id: 3 }]
      });

      const result = await offlineService.distributeAdRevenue(
        mockPublisherAddress,
        mockAISearcherAddress,
        mockRevenue
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(3); // Returns database record directly when no blockchain
      expect(result.txHash).toBeUndefined();

      // Verify database record
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO revenue_distributions'),
        expect.arrayContaining([
          mockPublisherAddress,
          mockAISearcherAddress,
          mockRevenue,
          70.0,
          30.0,
          'ad_revenue',
          null, // no blockchain tx
          'completed',
          null
        ])
      );
    });

    test('should validate input parameters', async () => {
      // Test invalid publisher address
      await expect(
        revenueService.distributeAdRevenue('', mockAISearcherAddress, mockRevenue)
      ).rejects.toThrow();

      // Test invalid AI searcher address
      await expect(
        revenueService.distributeAdRevenue(mockPublisherAddress, '', mockRevenue)
      ).rejects.toThrow();

      // Test invalid revenue amount
      await expect(
        revenueService.distributeAdRevenue(mockPublisherAddress, mockAISearcherAddress, 0)
      ).rejects.toThrow();
    });
  });

  describe('distributeCustomRevenue', () => {
    const mockRecipients = [
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
    ];
    const mockAmounts = [75.0, 25.0];

    test('should successfully distribute custom revenue', async () => {
      const mockTx = {
        transactionHash: '0xabcdef789012345',
        gasUsed: 300000,
        events: {
          BatchDistributionCompleted: {
            returnValues: {
              distributionId: '2'
            }
          }
        }
      };

      mockContract.methods.distribute.mockReturnValue({
        send: jest.fn().mockResolvedValue(mockTx)
      });

      const result = await revenueService.distributeCustomRevenue(
        mockRecipients,
        mockAmounts,
        'bonus'
      );

      expect(result.success).toBe(true);
      expect(result.txHash).toBe('0xabcdef789012345');
      expect(result.distributionId).toBe('2');

      // Verify blockchain call with wei amounts
      expect(mockContract.methods.distribute).toHaveBeenCalledWith(
        mockRecipients,
        ['75000000', '25000000'], // Amounts in wei
        'bonus'
      );
    });

    test('should handle blockchain service not available', async () => {
      delete process.env.PRIVATE_KEY;
      const offlineService = new RevenueService();

      const result = await offlineService.distributeCustomRevenue(
        mockRecipients,
        mockAmounts,
        'bonus'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Revenue service not available');
    });
  });

  describe('getDistributionDetails', () => {
    test('should retrieve distribution details successfully', async () => {
      const mockDetails = {
        recipients: ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8', '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'],
        amounts: ['70000000', '30000000'], // Wei amounts
        totalAmount: '100000000',
        timestamp: '1640995200',
        completed: true,
        distributionType: 'ad_revenue',
        transactionHash: '0xabcdef123456789'
      };

      mockContract.methods.getDistributionDetails.mockReturnValue({
        call: jest.fn().mockResolvedValue(mockDetails)
      });

      const result = await revenueService.getDistributionDetails(1);

      expect(result).toEqual({
        recipients: mockDetails.recipients,
        amounts: [70.0, 30.0], // Converted back to USDC
        totalAmount: 100.0,
        timestamp: 1640995200,
        completed: true,
        distributionType: 'ad_revenue',
        transactionHash: '0xabcdef123456789'
      });
    });

    test('should handle contract call failure', async () => {
      mockContract.methods.getDistributionDetails.mockReturnValue({
        call: jest.fn().mockRejectedValue(new Error('Contract call failed'))
      });

      const result = await revenueService.getDistributionDetails(1);
      expect(result).toBeNull();
    });
  });

  describe('getRecipientTotalReceived', () => {
    test('should retrieve recipient total successfully', async () => {
      mockContract.methods.getRecipientTotalReceived.mockReturnValue({
        call: jest.fn().mockResolvedValue('150000000') // 150 USDC in wei
      });

      const result = await revenueService.getRecipientTotalReceived(
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
      );

      expect(result).toBe(150.0);
    });

    test('should return null when contract not available', async () => {
      delete process.env.REVENUE_DISTRIBUTOR_ADDRESS;
      const offlineService = new RevenueService();

      const result = await offlineService.getRecipientTotalReceived(
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
      );

      expect(result).toBeNull();
    });
  });

  describe('getShareConfiguration', () => {
    test('should retrieve share configuration successfully', async () => {
      mockContract.methods.getShareConfiguration.mockReturnValue({
        call: jest.fn().mockResolvedValue(['7000', '3000']) // Basis points
      });

      const result = await revenueService.getShareConfiguration();

      expect(result).toEqual({
        publisherShare: 70.0, // Converted from basis points
        aiSearcherShare: 30.0
      });
    });

    test('should return default values when contract not available', async () => {
      delete process.env.REVENUE_DISTRIBUTOR_ADDRESS;
      const offlineService = new RevenueService();

      const result = await offlineService.getShareConfiguration();

      expect(result).toEqual({
        publisherShare: 70,
        aiSearcherShare: 30
      });
    });
  });

  describe('getTotalStats', () => {
    test('should retrieve total stats successfully', async () => {
      const mockStats = {
        _totalDistributed: '1000000000', // 1000 USDC in wei
        _distributionCounter: '10',
        _totalPendingDistributions: '50000000' // 50 USDC in wei
      };

      mockContract.methods.getTotalStats.mockReturnValue({
        call: jest.fn().mockResolvedValue(mockStats)
      });

      const result = await revenueService.getTotalStats();

      expect(result).toEqual({
        totalDistributed: 1000.0,
        distributionCounter: 10,
        totalPendingDistributions: 50.0
      });
    });

    test('should return null when contract not available', async () => {
      delete process.env.REVENUE_DISTRIBUTOR_ADDRESS;
      const offlineService = new RevenueService();

      const result = await offlineService.getTotalStats();
      expect(result).toBeNull();
    });
  });

  describe('Database operations', () => {
    test('should handle database connection errors', async () => {
      pool.connect.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        revenueService.distributeAdRevenue(
          '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
          100.0
        )
      ).rejects.toThrow('Database connection failed');
    });

    test('should release database client on success', async () => {
      mockContract.methods.distributeAdRevenue.mockReturnValue({
        send: jest.fn().mockResolvedValue({
          transactionHash: '0xtest',
          gasUsed: 250000,
          blockNumber: 12345,
          events: {}
        })
      });

      mockClient.query.mockResolvedValue({ rows: [{ id: 1 }] });

      await revenueService.distributeAdRevenue(
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        100.0
      );

      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should release database client on error', async () => {
      mockClient.query.mockRejectedValue(new Error('Database query failed'));

      await expect(
        revenueService.distributeAdRevenue(
          '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
          100.0
        )
      ).rejects.toThrow('Database query failed');

      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});