const BlockchainSyncService = require('../../src/services/blockchainSyncService');
const BlockchainService = require('../../src/services/blockchainService');

// Mock dependencies
jest.mock('../../src/services/blockchainService');
jest.mock('../../src/config/database', () => ({
  pool: {
    connect: jest.fn(),
    end: jest.fn()
  }
}));
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const { pool } = require('../../src/config/database');

describe('BlockchainSyncService', () => {
  let syncService;
  let mockClient;
  let mockBlockchainService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock database client
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(mockClient);

    // Mock BlockchainService
    mockBlockchainService = {
      isAvailable: jest.fn().mockReturnValue(true),
      getParticipantInfo: jest.fn(),
      getEscrowBalance: jest.fn(),
      getContractAddresses: jest.fn().mockReturnValue({
        mockUSDC: '0x1234567890123456789012345678901234567890'
      })
    };
    BlockchainService.mockImplementation(() => mockBlockchainService);

    syncService = new BlockchainSyncService();
  });

  afterEach(() => {
    if (syncService.isRunning) {
      syncService.stop();
    }
  });

  describe('Constructor', () => {
    test('should initialize with default values', () => {
      expect(syncService.syncInterval).toBe(5);
      expect(syncService.isRunning).toBe(false);
      expect(syncService.syncTimer).toBeNull();
    });

    test('should use environment variable for sync interval', () => {
      process.env.SYNC_INTERVAL_MINUTES = '10';
      const service = new BlockchainSyncService();
      expect(service.syncInterval).toBe(10);
      delete process.env.SYNC_INTERVAL_MINUTES;
    });
  });

  describe('start', () => {
    test('should start sync service when blockchain is available', async () => {
      const performSyncSpy = jest.spyOn(syncService, 'performSync').mockResolvedValue();
      
      await syncService.start();
      
      expect(syncService.isRunning).toBe(true);
      expect(performSyncSpy).toHaveBeenCalledTimes(1);
      expect(syncService.syncTimer).toBeDefined();
    });

    test('should not start when blockchain service is unavailable', async () => {
      mockBlockchainService.isAvailable.mockReturnValue(false);
      
      await syncService.start();
      
      expect(syncService.isRunning).toBe(false);
      expect(syncService.syncTimer).toBeNull();
    });

    test('should not start if already running', async () => {
      syncService.isRunning = true;
      const performSyncSpy = jest.spyOn(syncService, 'performSync').mockResolvedValue();
      
      await syncService.start();
      
      expect(performSyncSpy).not.toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    test('should stop running sync service', async () => {
      syncService.isRunning = true;
      syncService.syncTimer = setInterval(() => {}, 1000);
      
      await syncService.stop();
      
      expect(syncService.isRunning).toBe(false);
      expect(syncService.syncTimer).toBeNull();
    });

    test('should handle stop when not running', async () => {
      await expect(syncService.stop()).resolves.not.toThrow();
    });
  });

  describe('syncParticipantRegistry', () => {
    beforeEach(() => {
      mockClient.query
        .mockResolvedValueOnce({ // Get unique wallet addresses
          rows: [
            { wallet_address: '0xabc123' },
            { wallet_address: '0xdef456' }
          ]
        });
    });

    test('should sync participant data successfully', async () => {
      mockBlockchainService.getParticipantInfo
        .mockResolvedValueOnce({
          payoutAddress: '0xabc123',
          roleBitmap: 1,
          status: 1,
          metadata: '0x1234'
        })
        .mockResolvedValueOnce({
          payoutAddress: '0xdef456',
          roleBitmap: 2,
          status: 1,
          metadata: '0x5678'
        });

      await syncService.syncParticipantRegistry();

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO participant_registry_cache'),
        ['0xabc123', '0xabc123', 1, 1, '0x1234']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO participant_registry_cache'),
        ['0xdef456', '0xdef456', 2, 1, '0x5678']
      );
    });

    test('should handle participants not found on blockchain', async () => {
      mockBlockchainService.getParticipantInfo
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await syncService.syncParticipantRegistry();

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO participant_registry_cache'),
        expect.arrayContaining(['0xabc123'])
      );
    });

    test('should handle blockchain service errors gracefully', async () => {
      mockBlockchainService.getParticipantInfo
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          payoutAddress: '0xdef456',
          roleBitmap: 2,
          status: 1,
          metadata: '0x5678'
        });

      await expect(syncService.syncParticipantRegistry()).resolves.not.toThrow();
    });
  });

  describe('syncEscrowBalances', () => {
    beforeEach(() => {
      mockClient.query
        .mockResolvedValueOnce({ // Get active participants
          rows: [
            { wallet_address: '0xabc123' },
            { wallet_address: '0xdef456' }
          ]
        });
    });

    test('should sync escrow balances successfully', async () => {
      mockBlockchainService.getEscrowBalance
        .mockResolvedValueOnce(100.5)
        .mockResolvedValueOnce(250.75);

      await syncService.syncEscrowBalances();

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO escrow_balance_cache'),
        ['0xabc123', '0x1234567890123456789012345678901234567890', 100.5]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO escrow_balance_cache'),
        ['0xdef456', '0x1234567890123456789012345678901234567890', 250.75]
      );
    });

    test('should handle null balances', async () => {
      mockBlockchainService.getEscrowBalance
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(0);

      await syncService.syncEscrowBalances();

      // Should only insert the non-null balance
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO escrow_balance_cache'),
        ['0xdef456', '0x1234567890123456789012345678901234567890', 0]
      );
    });
  });

  describe('getCachedParticipantInfo', () => {
    test('should return cached participant info', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{
          payout_address: '0xabc123',
          role_bitmap: 1,
          status: 1,
          metadata: '0x1234',
          is_publisher: true,
          is_advertiser: false,
          is_ai_searcher: false,
          last_synced_at: new Date()
        }]
      });

      const result = await syncService.getCachedParticipantInfo('0xabc123');

      expect(result).toEqual({
        payoutAddress: '0xabc123',
        roleBitmap: 1,
        status: 1,
        metadata: '0x1234',
        isPublisher: true,
        isAdvertiser: false,
        isAISearcher: false,
        lastSynced: expect.any(Date)
      });
    });

    test('should return null when no cached data', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await syncService.getCachedParticipantInfo('0xabc123');

      expect(result).toBeNull();
    });

    test('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      const result = await syncService.getCachedParticipantInfo('0xabc123');

      expect(result).toBeNull();
    });
  });

  describe('getCachedEscrowBalance', () => {
    test('should return cached escrow balance', async () => {
      const mockDate = new Date();
      mockClient.query.mockResolvedValue({
        rows: [{
          balance: '100.50',
          last_synced_at: mockDate
        }]
      });

      const result = await syncService.getCachedEscrowBalance(
        '0xabc123',
        '0x1234567890123456789012345678901234567890'
      );

      expect(result).toEqual({
        balance: 100.5,
        lastSynced: mockDate
      });
    });

    test('should return null when no cached data', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await syncService.getCachedEscrowBalance(
        '0xabc123',
        '0x1234567890123456789012345678901234567890'
      );

      expect(result).toBeNull();
    });
  });

  describe('getSyncStatus', () => {
    test('should return sync status', async () => {
      mockClient.query
        .mockResolvedValueOnce({ // Participant stats
          rows: [{
            total_participants: '10',
            recent_synced: '8',
            last_sync: new Date()
          }]
        })
        .mockResolvedValueOnce({ // Escrow stats
          rows: [{
            total_balances: '15',
            recent_synced: '12',
            last_sync: new Date()
          }]
        });

      const status = await syncService.getSyncStatus();

      expect(status).toEqual({
        isRunning: false,
        syncInterval: 5,
        blockchainAvailable: true,
        participants: {
          total: 10,
          recentlySynced: 8,
          lastSync: expect.any(Date)
        },
        escrowBalances: {
          total: 15,
          recentlySynced: 12,
          lastSync: expect.any(Date)
        }
      });
    });
  });

  describe('forceSyncWallet', () => {
    test('should force sync specific wallet', async () => {
      mockBlockchainService.getParticipantInfo.mockResolvedValue({
        payoutAddress: '0xabc123',
        roleBitmap: 1,
        status: 1,
        metadata: '0x1234'
      });
      mockBlockchainService.getEscrowBalance.mockResolvedValue(100.5);

      const result = await syncService.forceSyncWallet('0xabc123');

      expect(result).toEqual({
        participantInfo: {
          payoutAddress: '0xabc123',
          roleBitmap: 1,
          status: 1,
          metadata: '0x1234'
        },
        escrowBalance: 100.5
      });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO participant_registry_cache'),
        ['0xabc123', '0xabc123', 1, 1, '0x1234']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO escrow_balance_cache'),
        ['0xabc123', '0x1234567890123456789012345678901234567890', 100.5]
      );
    });

    test('should throw error when blockchain service unavailable', async () => {
      mockBlockchainService.isAvailable.mockReturnValue(false);

      await expect(syncService.forceSyncWallet('0xabc123'))
        .rejects.toThrow('Blockchain service not available');
    });
  });
});
