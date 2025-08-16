const { Web3 } = require('web3');
const { pool } = require('../config/database');
const logger = require('../utils/logger');
const crypto = require('crypto');

// Import MVP contract ABIs
const BatchLedgerABI = require('../../contracts/artifacts/contracts/BatchLedger.sol/BatchLedger.json').abi;
const DistributorABI = require('../../contracts/artifacts/contracts/Distributor.sol/Distributor.json').abi;

class AdTransactionService {
  constructor() {
    this.web3 = new Web3(process.env.WEB3_PROVIDER_URL || 'http://127.0.0.1:8546');
    this.batchLedgerAddress = process.env.BATCH_LEDGER_ADDRESS;
    this.distributorAddress = process.env.DISTRIBUTOR_ADDRESS;
    this.privateKey = process.env.PRIVATE_KEY;
    
    // Batch configuration
    this.batchSize = parseInt(process.env.BATCH_SIZE) || 100;
    this.batchTimeout = parseInt(process.env.BATCH_TIMEOUT_MS) || 30000; // 30 seconds
    this.pendingTransactions = [];
    this.batchTimer = null;
    
    if (this.privateKey && this.privateKey !== '') {
      try {
        this.account = this.web3.eth.accounts.privateKeyToAccount(this.privateKey);
        this.web3.eth.accounts.wallet.add(this.account);
        
        if (this.batchLedgerAddress && this.distributorAddress) {
          this.batchLedger = new this.web3.eth.Contract(BatchLedgerABI, this.batchLedgerAddress);
          this.distributor = new this.web3.eth.Contract(DistributorABI, this.distributorAddress);
          
          logger.info('Ad transaction service initialized with MVP contracts', {
            batchLedger: this.batchLedgerAddress,
            distributor: this.distributorAddress,
            batchSize: this.batchSize,
            batchTimeout: this.batchTimeout
          });
        } else {
          logger.warn('MVP contract addresses not configured');
          this.batchLedger = null;
          this.distributor = null;
        }
      } catch (error) {
        logger.error('Failed to initialize ad transaction service:', error);
        this.account = null;
        this.batchLedger = null;
        this.distributor = null;
      }
    } else {
      logger.warn('No private key provided, ad transaction service disabled');
      this.account = null;
      this.batchLedger = null;
      this.distributor = null;
    }
  }

  async recordAdTransaction({
    publisherAddress,
    advertiserAddress,
    aiSearcherAddress,
    campaignId,
    adAmountUSDC,
    adId,
    creativeUrl,
    landingPageUrl,
    targetAudience,
    contentUrl,
    transactionType = 'impression'
  }) {
    try {
      // Always record in database first
      const dbRecord = await this._recordAdTransactionInDatabase({
        publisherAddress,
        advertiserAddress,
        aiSearcherAddress,
        campaignId,
        adAmountUSDC,
        adId,
        creativeUrl,
        landingPageUrl,
        targetAudience,
        contentUrl,
        transactionType
      });

      // Add to pending batch for on-chain commitment
      if (this.account && this.batchLedger) {
        const transactionData = {
          dbId: dbRecord.id,
          publisherAddress,
          advertiserAddress,
          aiSearcherAddress,
          campaignId,
          adAmountUSDC,
          adId,
          transactionType,
          timestamp: Date.now()
        };

        this.pendingTransactions.push(transactionData);
        
        logger.info('Ad transaction added to pending batch', {
          dbId: dbRecord.id,
          batchPosition: this.pendingTransactions.length,
          batchSize: this.batchSize
        });

        // Process batch if size reached or start timer
        if (this.pendingTransactions.length >= this.batchSize) {
          await this._processBatch();
        } else if (!this.batchTimer) {
          this._startBatchTimer();
        }
      }

      return {
        success: true,
        dbRecordId: dbRecord.id,
        message: 'Transaction recorded and queued for batch processing'
      };

    } catch (error) {
      logger.error('Ad transaction recording failed:', error);
      return {
        success: false,
        error: error.message,
        dbRecordId: null
      };
    }
  }

  async _processBatch() {
    if (this.pendingTransactions.length === 0) {
      return;
    }

    const batchTransactions = [...this.pendingTransactions];
    this.pendingTransactions = [];
    
    // Clear timer if running
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      // Generate batch ID and Merkle tree
      const batchId = this._generateBatchId();
      const { merkleRoot, leaves } = this._buildMerkleTree(batchTransactions);

      logger.info('Processing ad transaction batch', {
        batchId,
        transactionCount: batchTransactions.length,
        merkleRoot
      });

      // Commit batch to blockchain
      const tx = await this.batchLedger.methods
        .commitBatch(batchId, merkleRoot, batchTransactions.length, 'Ad transactions batch')
        .send({
          from: this.account.address,
          gas: 200000,
          gasPrice: await this.web3.eth.getGasPrice()
        });

      // Update database records with batch info
      await this._updateBatchInDatabase(batchTransactions, batchId, tx.transactionHash, merkleRoot);

      logger.info('Ad transaction batch processed successfully', {
        batchId,
        txHash: tx.transactionHash,
        gasUsed: tx.gasUsed,
        transactionCount: batchTransactions.length
      });

      return {
        success: true,
        batchId,
        txHash: tx.transactionHash,
        transactionCount: batchTransactions.length
      };

    } catch (error) {
      logger.error('Batch processing failed:', error);
      
      // Mark transactions as failed in database
      await this._markBatchAsFailed(batchTransactions, error.message);
      
      return {
        success: false,
        error: error.message,
        transactionCount: batchTransactions.length
      };
    }
  }

  _startBatchTimer() {
    this.batchTimer = setTimeout(async () => {
      logger.info('Batch timeout reached, processing pending transactions');
      await this._processBatch();
    }, this.batchTimeout);
  }

  _generateBatchId() {
    return '0x' + crypto.randomBytes(32).toString('hex');
  }

  _buildMerkleTree(transactions) {
    // Simple Merkle tree implementation for ad transactions
    const leaves = transactions.map(tx => {
      const data = this.web3.utils.solidityKeccak256(
        ['address', 'address', 'address', 'uint256', 'uint256', 'string', 'string'],
        [
          tx.publisherAddress,
          tx.advertiserAddress,
          tx.aiSearcherAddress,
          tx.campaignId,
          this.web3.utils.toWei((tx.adAmountUSDC * 1000000).toString(), 'wei'),
          tx.adId,
          tx.transactionType
        ]
      );
      return data;
    });

    // For simplicity, use the hash of all leaves as root
    // In production, implement proper Merkle tree
    const merkleRoot = this.web3.utils.solidityKeccak256(['bytes32[]'], [leaves]);

    return { merkleRoot, leaves };
  }

  // Legacy methods for backward compatibility
  async settleAdTransaction(transactionId, settlementHash) {
    logger.warn('settleAdTransaction is deprecated in MVP - use batch settlement instead');
    return { success: false, error: 'Method deprecated - use batch settlement' };
  }

  async updateTransactionStatus(transactionId, newStatus, reason = '') {
    const client = await pool.connect();
    
    try {
      await client.query(
        'UPDATE ad_transactions SET status = $1, error_message = $2, updated_at = NOW() WHERE id = $3',
        [newStatus, reason, transactionId]
      );

      logger.info('Transaction status updated in database', {
        transactionId,
        newStatus,
        reason
      });

      return { success: true };

    } catch (error) {
      logger.error('Failed to update transaction status:', error);
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  }

  async getAdTransactionDetails(transactionId) {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM ad_transactions WHERE id = $1',
        [transactionId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const tx = result.rows[0];
      return {
        id: tx.id,
        publisher: tx.publisher_address,
        advertiser: tx.advertiser_address,
        aiSearcher: tx.ai_searcher_address,
        campaignId: tx.campaign_id,
        adAmount: parseFloat(tx.ad_amount),
        publisherShare: parseFloat(tx.publisher_share),
        aiSearcherShare: parseFloat(tx.ai_searcher_share),
        platformFee: parseFloat(tx.platform_fee),
        timestamp: tx.created_at,
        adId: tx.ad_id,
        transactionType: tx.transaction_type,
        status: tx.status,
        batchId: tx.batch_id,
        blockchainTxHash: tx.blockchain_tx_hash
      };

    } catch (error) {
      logger.error('Failed to get ad transaction details:', error);
      return null;
    } finally {
      client.release();
    }
  }

  async getEntityMetrics(entityAddress, entityType) {
    const client = await pool.connect();
    
    try {
      let query;
      let params;

      switch (entityType) {
        case 'publisher':
          query = `
            SELECT 
              COUNT(*) as total_transactions,
              COUNT(CASE WHEN transaction_type = 'impression' THEN 1 END) as impressions,
              COUNT(CASE WHEN transaction_type = 'click' THEN 1 END) as clicks,
              COUNT(CASE WHEN transaction_type = 'conversion' THEN 1 END) as conversions,
              COALESCE(SUM(publisher_share), 0) as total_revenue,
              COALESCE(AVG(ad_amount), 0) as avg_transaction_value
            FROM ad_transactions 
            WHERE publisher_address = $1 AND status != 'failed'
          `;
          params = [entityAddress];
          break;
        case 'advertiser':
          query = `
            SELECT 
              COUNT(*) as total_transactions,
              COUNT(CASE WHEN transaction_type = 'impression' THEN 1 END) as impressions,
              COUNT(CASE WHEN transaction_type = 'click' THEN 1 END) as clicks,
              COUNT(CASE WHEN transaction_type = 'conversion' THEN 1 END) as conversions,
              COALESCE(SUM(ad_amount), 0) as total_spent,
              COALESCE(AVG(ad_amount), 0) as avg_transaction_value
            FROM ad_transactions 
            WHERE advertiser_address = $1 AND status != 'failed'
          `;
          params = [entityAddress];
          break;
        case 'ai_searcher':
          query = `
            SELECT 
              COUNT(*) as total_transactions,
              COUNT(CASE WHEN transaction_type = 'impression' THEN 1 END) as impressions,
              COUNT(CASE WHEN transaction_type = 'click' THEN 1 END) as clicks,
              COUNT(CASE WHEN transaction_type = 'conversion' THEN 1 END) as conversions,
              COALESCE(SUM(ai_searcher_share), 0) as total_revenue,
              COALESCE(AVG(ad_amount), 0) as avg_transaction_value
            FROM ad_transactions 
            WHERE ai_searcher_address = $1 AND status != 'failed'
          `;
          params = [entityAddress];
          break;
        default:
          throw new Error('Invalid entity type');
      }

      const result = await client.query(query, params);
      const metrics = result.rows[0];

      return {
        totalTransactions: parseInt(metrics.total_transactions),
        impressions: parseInt(metrics.impressions),
        clicks: parseInt(metrics.clicks),
        conversions: parseInt(metrics.conversions),
        totalRevenue: parseFloat(metrics.total_revenue || metrics.total_spent || 0),
        avgTransactionValue: parseFloat(metrics.avg_transaction_value),
        ctr: metrics.impressions > 0 ? (metrics.clicks / metrics.impressions * 100) : 0,
        conversionRate: metrics.clicks > 0 ? (metrics.conversions / metrics.clicks * 100) : 0
      };

    } catch (error) {
      logger.error('Failed to get entity metrics:', error);
      return null;
    } finally {
      client.release();
    }
  }

  async getCampaignMetrics(campaignId) {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN transaction_type = 'impression' THEN 1 END) as impressions,
          COUNT(CASE WHEN transaction_type = 'click' THEN 1 END) as clicks,
          COUNT(CASE WHEN transaction_type = 'conversion' THEN 1 END) as conversions,
          COALESCE(SUM(ad_amount), 0) as total_spent,
          COALESCE(AVG(ad_amount), 0) as avg_transaction_value
        FROM ad_transactions 
        WHERE campaign_id = $1 AND status != 'failed'
      `, [campaignId]);

      const metrics = result.rows[0];

      return {
        campaignId: parseInt(campaignId),
        totalTransactions: parseInt(metrics.total_transactions),
        impressions: parseInt(metrics.impressions),
        clicks: parseInt(metrics.clicks),
        conversions: parseInt(metrics.conversions),
        totalSpent: parseFloat(metrics.total_spent),
        avgTransactionValue: parseFloat(metrics.avg_transaction_value),
        ctr: metrics.impressions > 0 ? (metrics.clicks / metrics.impressions * 100) : 0,
        conversionRate: metrics.clicks > 0 ? (metrics.conversions / metrics.clicks * 100) : 0
      };

    } catch (error) {
      logger.error('Failed to get campaign metrics:', error);
      return null;
    } finally {
      client.release();
    }
  }

  async getPlatformStats() {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          COUNT(*) as total_transactions,
          COUNT(DISTINCT publisher_address) as unique_publishers,
          COUNT(DISTINCT advertiser_address) as unique_advertisers,
          COUNT(DISTINCT ai_searcher_address) as unique_ai_searchers,
          COALESCE(SUM(ad_amount), 0) as total_volume,
          COALESCE(SUM(platform_fee), 0) as total_platform_fees,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions,
          COUNT(CASE WHEN batch_id IS NOT NULL THEN 1 END) as batched_transactions
        FROM ad_transactions
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);

      const stats = result.rows[0];

      return {
        transactionCounter: parseInt(stats.total_transactions),
        totalTransactionVolume: parseFloat(stats.total_volume),
        totalPlatformFees: parseFloat(stats.total_platform_fees),
        platformFeeRate: 2.0, // Fixed 2% in MVP
        uniquePublishers: parseInt(stats.unique_publishers),
        uniqueAdvertisers: parseInt(stats.unique_advertisers),
        uniqueAISearchers: parseInt(stats.unique_ai_searchers),
        completedTransactions: parseInt(stats.completed_transactions),
        pendingTransactions: parseInt(stats.pending_transactions),
        batchedTransactions: parseInt(stats.batched_transactions),
        batchingRate: stats.total_transactions > 0 ? 
          (stats.batched_transactions / stats.total_transactions * 100) : 0
      };

    } catch (error) {
      logger.error('Failed to get platform stats:', error);
      return null;
    } finally {
      client.release();
    }
  }

  async _recordAdTransactionInDatabase({
    publisherAddress,
    advertiserAddress,
    aiSearcherAddress,
    campaignId,
    adAmountUSDC,
    adId,
    creativeUrl,
    landingPageUrl,
    targetAudience,
    contentUrl,
    transactionType
  }) {
    const client = await pool.connect();
    
    try {
      // Calculate platform fee (2%) and shares (70% publisher, 30% AI searcher)
      const platformFee = adAmountUSDC * 0.02;
      const remainingAmount = adAmountUSDC - platformFee;
      const publisherShare = remainingAmount * 0.70;
      const aiSearcherShare = remainingAmount * 0.30;

      const result = await client.query(
        `INSERT INTO ad_transactions 
         (publisher_address, advertiser_address, ai_searcher_address, campaign_id, 
          ad_amount, publisher_share, ai_searcher_share, platform_fee,
          ad_id, creative_url, landing_page_url, target_audience, content_url,
          transaction_type, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending', NOW())
         RETURNING id`,
        [
          publisherAddress,
          advertiserAddress,
          aiSearcherAddress,
          campaignId,
          adAmountUSDC,
          publisherShare,
          aiSearcherShare,
          platformFee,
          adId,
          creativeUrl,
          landingPageUrl,
          targetAudience,
          contentUrl,
          transactionType
        ]
      );

      logger.info('Ad transaction recorded in database', {
        id: result.rows[0].id,
        publisherAddress,
        advertiserAddress,
        adAmount: adAmountUSDC,
        transactionType
      });

      return { id: result.rows[0].id };

    } catch (error) {
      logger.error('Failed to record ad transaction in database:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async _updateBatchInDatabase(transactions, batchId, txHash, merkleRoot) {
    const client = await pool.connect();
    
    try {
      const dbIds = transactions.map(tx => tx.dbId);
      
      await client.query(
        `UPDATE ad_transactions 
         SET batch_id = $1, blockchain_tx_hash = $2, merkle_root = $3, 
             status = 'batched', batch_processed_at = NOW()
         WHERE id = ANY($4::int[])`,
        [batchId, txHash, merkleRoot, dbIds]
      );

      logger.info('Database records updated with batch info', {
        batchId,
        txHash,
        recordCount: dbIds.length
      });

    } catch (error) {
      logger.error('Failed to update batch in database:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async _markBatchAsFailed(transactions, errorMessage) {
    const client = await pool.connect();
    
    try {
      const dbIds = transactions.map(tx => tx.dbId);
      
      await client.query(
        `UPDATE ad_transactions 
         SET status = 'batch_failed', error_message = $1, batch_processed_at = NOW()
         WHERE id = ANY($2::int[])`,
        [errorMessage, dbIds]
      );

      logger.info('Batch marked as failed in database', {
        recordCount: dbIds.length,
        error: errorMessage
      });

    } catch (error) {
      logger.error('Failed to mark batch as failed:', error);
    } finally {
      client.release();
    }
  }

  isAvailable() {
    return this.account !== null && this.batchLedger !== null;
  }

  getContractAddress() {
    return this.batchLedgerAddress;
  }

  getContractAddresses() {
    return {
      batchLedger: this.batchLedgerAddress,
      distributor: this.distributorAddress
    };
  }

  // Flush pending transactions (useful for testing or shutdown)
  async flushPendingTransactions() {
    if (this.pendingTransactions.length > 0) {
      logger.info('Flushing pending transactions', {
        count: this.pendingTransactions.length
      });
      await this._processBatch();
    }
  }
}

module.exports = AdTransactionService;