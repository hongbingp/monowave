import { pool } from '../config/database.js';
import BlockchainService from './blockchainService.js';
import logger from '../utils/logger.js';

class BlockchainSyncService {
  constructor() {
    this.blockchainService = new BlockchainService();
    this.syncInterval = parseInt(process.env.SYNC_INTERVAL_MINUTES) || 5; // minutes
    this.isRunning = false;
    this.syncTimer = null;
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Blockchain sync service already running');
      return;
    }

    if (!this.blockchainService.isAvailable()) {
      logger.warn('Blockchain service not available, sync service disabled');
      return;
    }

    this.isRunning = true;
    logger.info('Starting blockchain sync service', {
      interval: `${this.syncInterval} minutes`
    });

    // Run initial sync
    await this.performSync();

    // Schedule periodic sync
    this.syncTimer = setInterval(async () => {
      try {
        await this.performSync();
      } catch (error) {
        logger.error('Scheduled sync failed:', error);
      }
    }, this.syncInterval * 60 * 1000);
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    logger.info('Blockchain sync service stopped');
  }

  async performSync() {
    if (!this.blockchainService.isAvailable()) {
      logger.warn('Blockchain service not available, skipping sync');
      return;
    }

    try {
      logger.info('Starting blockchain data sync...');

      // Sync participant registry data
      await this.syncParticipantRegistry();

      // Sync escrow balances for active participants
      await this.syncEscrowBalances();

      // Clean up old cache entries
      await this.cleanupOldCacheEntries();

      logger.info('Blockchain data sync completed successfully');

    } catch (error) {
      logger.error('Blockchain sync failed:', error);
      throw error;
    }
  }

  async syncParticipantRegistry() {
    const client = await pool.connect();
    try {
      logger.info('Syncing participant registry data...');

      // Get all unique wallet addresses from the system
      const walletsResult = await client.query(`
        SELECT DISTINCT wallet_address 
        FROM (
          SELECT wallet_address FROM users WHERE wallet_address IS NOT NULL
          UNION
          SELECT publisher_address as wallet_address FROM ad_transactions WHERE publisher_address IS NOT NULL
          UNION  
          SELECT advertiser_address as wallet_address FROM ad_transactions WHERE advertiser_address IS NOT NULL
          UNION
          SELECT ai_searcher_address as wallet_address FROM ad_transactions WHERE ai_searcher_address IS NOT NULL
          UNION
          SELECT publisher_address as wallet_address FROM revenue_distributions WHERE publisher_address IS NOT NULL
          UNION
          SELECT ai_searcher_address as wallet_address FROM revenue_distributions WHERE ai_searcher_address IS NOT NULL
        ) as all_wallets
        WHERE wallet_address IS NOT NULL
      `);

      let syncedCount = 0;
      let errorCount = 0;

      for (const wallet of walletsResult.rows) {
        try {
          const walletAddress = wallet.wallet_address;
          
          // Get participant info from blockchain
          const participantInfo = await this.blockchainService.getParticipantInfo(walletAddress);
          
          if (participantInfo) {
            // Upsert to cache table
            await client.query(`
              INSERT INTO participant_registry_cache (
                wallet_address, payout_address, role_bitmap, status, metadata, last_synced_at
              ) VALUES ($1, $2, $3, $4, $5, NOW())
              ON CONFLICT (wallet_address) DO UPDATE SET
                payout_address = EXCLUDED.payout_address,
                role_bitmap = EXCLUDED.role_bitmap,
                status = EXCLUDED.status,
                metadata = EXCLUDED.metadata,
                last_synced_at = NOW(),
                updated_at = NOW()
            `, [
              walletAddress,
              participantInfo.payoutAddress,
              participantInfo.roleBitmap,
              participantInfo.status,
              participantInfo.metadata
            ]);
            
            syncedCount++;
          } else {
            // Mark as not found (status = 0, role_bitmap = 0)
            await client.query(`
              INSERT INTO participant_registry_cache (
                wallet_address, payout_address, role_bitmap, status, metadata, last_synced_at
              ) VALUES ($1, NULL, 0, 0, '0x0000000000000000000000000000000000000000000000000000000000000000', NOW())
              ON CONFLICT (wallet_address) DO UPDATE SET
                payout_address = NULL,
                role_bitmap = 0,
                status = 0,
                last_synced_at = NOW(),
                updated_at = NOW()
            `, [walletAddress]);
          }

        } catch (error) {
          logger.warn('Failed to sync participant data for wallet:', {
            wallet: wallet.wallet_address,
            error: error.message
          });
          errorCount++;
        }
      }

      logger.info('Participant registry sync completed', {
        totalWallets: walletsResult.rows.length,
        syncedCount,
        errorCount
      });

    } catch (error) {
      logger.error('Participant registry sync failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async syncEscrowBalances() {
    const client = await pool.connect();
    try {
      logger.info('Syncing escrow balances...');

      // Get active participants and the USDC token address
      const usdcAddress = this.blockchainService.getContractAddresses().mockUSDC;
      
      const participantsResult = await client.query(`
        SELECT DISTINCT wallet_address 
        FROM participant_registry_cache 
        WHERE role_bitmap > 0 
        AND last_synced_at >= NOW() - INTERVAL '1 hour'
      `);

      let syncedCount = 0;
      let errorCount = 0;

      for (const participant of participantsResult.rows) {
        try {
          const walletAddress = participant.wallet_address;
          
          // Get escrow balance from blockchain
          const escrowBalance = await this.blockchainService.getEscrowBalance(
            walletAddress,
            usdcAddress
          );
          
          if (escrowBalance !== null) {
            // Upsert to cache table
            await client.query(`
              INSERT INTO escrow_balance_cache (
                wallet_address, token_address, balance, last_synced_at
              ) VALUES ($1, $2, $3, NOW())
              ON CONFLICT (wallet_address, token_address) DO UPDATE SET
                balance = EXCLUDED.balance,
                last_synced_at = NOW(),
                updated_at = NOW()
            `, [walletAddress, usdcAddress, escrowBalance]);
            
            syncedCount++;
          }

        } catch (error) {
          logger.warn('Failed to sync escrow balance for wallet:', {
            wallet: participant.wallet_address,
            error: error.message
          });
          errorCount++;
        }
      }

      logger.info('Escrow balance sync completed', {
        totalParticipants: participantsResult.rows.length,
        syncedCount,
        errorCount
      });

    } catch (error) {
      logger.error('Escrow balance sync failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async cleanupOldCacheEntries() {
    const client = await pool.connect();
    try {
      logger.info('Cleaning up old cache entries...');

      // Remove participant cache entries older than 24 hours
      const participantCleanup = await client.query(`
        DELETE FROM participant_registry_cache 
        WHERE last_synced_at < NOW() - INTERVAL '24 hours'
      `);

      // Remove escrow balance cache entries older than 6 hours
      const escrowCleanup = await client.query(`
        DELETE FROM escrow_balance_cache 
        WHERE last_synced_at < NOW() - INTERVAL '6 hours'
      `);

      logger.info('Cache cleanup completed', {
        participantEntriesRemoved: participantCleanup.rowCount,
        escrowEntriesRemoved: escrowCleanup.rowCount
      });

    } catch (error) {
      logger.error('Cache cleanup failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Helper methods for other services to use cached data
  async getCachedParticipantInfo(walletAddress) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM participant_registry_cache 
        WHERE wallet_address = $1 
        AND last_synced_at >= NOW() - INTERVAL '30 minutes'
      `, [walletAddress]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        payoutAddress: row.payout_address,
        roleBitmap: row.role_bitmap,
        status: row.status,
        metadata: row.metadata,
        isPublisher: row.is_publisher,
        isAdvertiser: row.is_advertiser,
        isAISearcher: row.is_ai_searcher,
        lastSynced: row.last_synced_at
      };

    } catch (error) {
      logger.error('Failed to get cached participant info:', error);
      return null;
    } finally {
      client.release();
    }
  }

  async getCachedEscrowBalance(walletAddress, tokenAddress) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT balance, last_synced_at FROM escrow_balance_cache 
        WHERE wallet_address = $1 AND token_address = $2
        AND last_synced_at >= NOW() - INTERVAL '10 minutes'
      `, [walletAddress, tokenAddress]);

      if (result.rows.length === 0) {
        return null;
      }

      return {
        balance: parseFloat(result.rows[0].balance),
        lastSynced: result.rows[0].last_synced_at
      };

    } catch (error) {
      logger.error('Failed to get cached escrow balance:', error);
      return null;
    } finally {
      client.release();
    }
  }

  // Force sync for specific wallet
  async forceSyncWallet(walletAddress) {
    if (!this.blockchainService.isAvailable()) {
      throw new Error('Blockchain service not available');
    }

    const client = await pool.connect();
    try {
      logger.info('Force syncing wallet data', { walletAddress });

      // Sync participant info
      const participantInfo = await this.blockchainService.getParticipantInfo(walletAddress);
      
      if (participantInfo) {
        await client.query(`
          INSERT INTO participant_registry_cache (
            wallet_address, payout_address, role_bitmap, status, metadata, last_synced_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (wallet_address) DO UPDATE SET
            payout_address = EXCLUDED.payout_address,
            role_bitmap = EXCLUDED.role_bitmap,
            status = EXCLUDED.status,
            metadata = EXCLUDED.metadata,
            last_synced_at = NOW(),
            updated_at = NOW()
        `, [
          walletAddress,
          participantInfo.payoutAddress,
          participantInfo.roleBitmap,
          participantInfo.status,
          participantInfo.metadata
        ]);
      }

      // Sync escrow balance
      const usdcAddress = this.blockchainService.getContractAddresses().mockUSDC;
      const escrowBalance = await this.blockchainService.getEscrowBalance(
        walletAddress,
        usdcAddress
      );

      if (escrowBalance !== null) {
        await client.query(`
          INSERT INTO escrow_balance_cache (
            wallet_address, token_address, balance, last_synced_at
          ) VALUES ($1, $2, $3, NOW())
          ON CONFLICT (wallet_address, token_address) DO UPDATE SET
            balance = EXCLUDED.balance,
            last_synced_at = NOW(),
            updated_at = NOW()
        `, [walletAddress, usdcAddress, escrowBalance]);
      }

      logger.info('Wallet force sync completed', { walletAddress });
      return { participantInfo, escrowBalance };

    } catch (error) {
      logger.error('Wallet force sync failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get sync status
  async getSyncStatus() {
    const client = await pool.connect();
    try {
      const [participantStats, escrowStats] = await Promise.all([
        client.query(`
          SELECT 
            COUNT(*) as total_participants,
            COUNT(CASE WHEN last_synced_at >= NOW() - INTERVAL '30 minutes' THEN 1 END) as recent_synced,
            MAX(last_synced_at) as last_sync
          FROM participant_registry_cache
        `),
        client.query(`
          SELECT 
            COUNT(*) as total_balances,
            COUNT(CASE WHEN last_synced_at >= NOW() - INTERVAL '10 minutes' THEN 1 END) as recent_synced,
            MAX(last_synced_at) as last_sync
          FROM escrow_balance_cache
        `)
      ]);

      return {
        isRunning: this.isRunning,
        syncInterval: this.syncInterval,
        blockchainAvailable: this.blockchainService.isAvailable(),
        participants: {
          total: parseInt(participantStats.rows[0].total_participants),
          recentlySynced: parseInt(participantStats.rows[0].recent_synced),
          lastSync: participantStats.rows[0].last_sync
        },
        escrowBalances: {
          total: parseInt(escrowStats.rows[0].total_balances),
          recentlySynced: parseInt(escrowStats.rows[0].recent_synced),
          lastSync: escrowStats.rows[0].last_sync
        }
      };

    } catch (error) {
      logger.error('Failed to get sync status:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default BlockchainSyncService;
