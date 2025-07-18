const BillingService = require('../../src/services/billing');
const Web3 = require('web3');

// Mock dependencies
jest.mock('web3');
jest.mock('../../src/config/database', () => ({
  pool: {
    connect: jest.fn(),
    query: jest.fn()
  }
}));

const { pool } = require('../../src/config/database');

describe('BillingService', () => {
  let billingService;
  let mockWeb3Instance;
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Web3 instance
    mockWeb3Instance = {
      eth: {
        accounts: {
          privateKeyToAccount: jest.fn().mockReturnValue({
            address: '0x123456789abcdef'
          }),
          wallet: {
            add: jest.fn()
          }
        },
        getGasPrice: jest.fn().mockResolvedValue('20000000000'),
        getTransactionCount: jest.fn().mockResolvedValue(42),
        abi: {
          encodeFunctionCall: jest.fn().mockReturnValue('0xabcdef123456')
        }
      },
      utils: {
        toWei: jest.fn().mockReturnValue('1000000000000000000'),
        fromWei: jest.fn().mockReturnValue('1.0')
      }
    };
    
    Web3.mockImplementation(() => mockWeb3Instance);
    
    // Mock database client
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    pool.connect.mockResolvedValue(mockClient);
    
    // Set up environment
    process.env.WEB3_PROVIDER_URL = 'http://localhost:8545';
    process.env.CONTRACT_ADDRESS = '0x123456789abcdef';
    process.env.PRIVATE_KEY = '0xabcdef123456789';
    
    billingService = new BillingService();
  });

  describe('constructor', () => {
    it('should initialize Web3 and account', () => {
      expect(Web3).toHaveBeenCalledWith('http://localhost:8545');
      expect(mockWeb3Instance.eth.accounts.privateKeyToAccount).toHaveBeenCalledWith('0xabcdef123456789');
      expect(mockWeb3Instance.eth.accounts.wallet.add).toHaveBeenCalled();
    });
  });

  describe('recordBilling', () => {
    it('should record billing successfully', async () => {
      const mockResult = { rows: [{ id: 1 }] };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await billingService.recordBilling(1, 10.5, 'monthly');

      expect(mockClient.query).toHaveBeenCalledWith(
        'INSERT INTO billing_records (user_id, amount, billing_period, status) VALUES ($1, $2, $3, $4) RETURNING id',
        [1, 10.5, 'monthly', 'pending']
      );
      expect(result).toBe(1);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(billingService.recordBilling(1, 10.5)).rejects.toThrow('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should use default billing period', async () => {
      const mockResult = { rows: [{ id: 1 }] };
      mockClient.query.mockResolvedValue(mockResult);

      await billingService.recordBilling(1, 10.5);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.any(String),
        [1, 10.5, 'monthly', 'pending']
      );
    });
  });

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      const mockBillingResult = { rows: [{ user_id: 1, amount: 10.5 }] };
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // UPDATE billing_records
        .mockResolvedValueOnce(mockBillingResult) // SELECT billing details
        .mockResolvedValueOnce(undefined) // UPDATE users balance
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await billingService.processPayment(1, '0xabcdef123456');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE billing_records SET tx_hash = $1, status = $2, updated_at = NOW() WHERE id = $3',
        ['0xabcdef123456', 'paid', 1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT user_id, amount FROM billing_records WHERE id = $1',
        [1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
        [10.5, 1]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(result).toBe(true);
    });

    it('should handle billing record not found', async () => {
      const mockBillingResult = { rows: [] };
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // UPDATE billing_records
        .mockResolvedValueOnce(mockBillingResult); // SELECT billing details (empty)

      await expect(billingService.processPayment(1, '0xabcdef123456')).rejects.toThrow('Billing record not found');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should rollback on database error', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // UPDATE fails

      await expect(billingService.processPayment(1, '0xabcdef123456')).rejects.toThrow('Database error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('chargeUser', () => {
    it('should simulate blockchain charge', async () => {
      const result = await billingService.chargeUser(1, 0.5);

      expect(mockWeb3Instance.eth.getGasPrice).toHaveBeenCalled();
      expect(mockWeb3Instance.eth.getTransactionCount).toHaveBeenCalled();
      expect(mockWeb3Instance.utils.toWei).toHaveBeenCalledWith('0.5', 'ether');
      expect(mockWeb3Instance.eth.abi.encodeFunctionCall).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'charge',
          type: 'function'
        }),
        [1, expect.any(String)]
      );
      expect(result).toBe('simulated_tx_hash');
    });

    it('should handle blockchain errors', async () => {
      mockWeb3Instance.eth.getGasPrice.mockRejectedValue(new Error('Network error'));

      await expect(billingService.chargeUser(1, 0.5)).rejects.toThrow('Network error');
    });
  });

  describe('distributeRevenue', () => {
    it('should simulate revenue distribution', async () => {
      const publishers = ['0x123', '0x456'];
      const amounts = [1.0, 2.0];

      const result = await billingService.distributeRevenue(publishers, amounts);

      expect(mockWeb3Instance.eth.getGasPrice).toHaveBeenCalled();
      expect(mockWeb3Instance.eth.getTransactionCount).toHaveBeenCalled();
      expect(mockWeb3Instance.utils.toWei).toHaveBeenCalledWith('1', 'ether');
      expect(mockWeb3Instance.utils.toWei).toHaveBeenCalledWith('2', 'ether');
      expect(mockWeb3Instance.eth.abi.encodeFunctionCall).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'distribute',
          type: 'function'
        }),
        [publishers, expect.any(Array)]
      );
      expect(result).toBe('simulated_distribution_tx');
    });

    it('should handle empty publishers array', async () => {
      const result = await billingService.distributeRevenue([], []);

      expect(result).toBe('simulated_distribution_tx');
    });
  });

  describe('getUsageStatistics', () => {
    const mockStats = {
      total_calls: '100',
      total_bytes: '50000',
      total_cost: '5.50',
      successful_calls: '95',
      failed_calls: '5'
    };

    it('should get monthly usage statistics', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockStats] });

      const result = await billingService.getUsageStatistics(1, 'monthly');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("AND created_at >= NOW() - INTERVAL '30 days'"),
        [1]
      );
      expect(result).toEqual(mockStats);
    });

    it('should get daily usage statistics', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockStats] });

      const result = await billingService.getUsageStatistics(1, 'daily');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("AND created_at >= NOW() - INTERVAL '1 day'"),
        [1]
      );
      expect(result).toEqual(mockStats);
    });

    it('should get weekly usage statistics', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockStats] });

      const result = await billingService.getUsageStatistics(1, 'weekly');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("AND created_at >= NOW() - INTERVAL '7 days'"),
        [1]
      );
      expect(result).toEqual(mockStats);
    });

    it('should get all-time usage statistics', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockStats] });

      const result = await billingService.getUsageStatistics(1, 'all');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.not.stringContaining("AND created_at >= NOW() - INTERVAL"),
        [1]
      );
      expect(result).toEqual(mockStats);
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(billingService.getUsageStatistics(1, 'monthly')).rejects.toThrow('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle empty results', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await billingService.getUsageStatistics(1, 'monthly');

      expect(result).toBeUndefined();
    });
  });
});