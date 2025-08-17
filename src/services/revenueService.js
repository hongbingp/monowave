const { Web3 } = require('web3');
const { pool } = require('../config/database');
const logger = require('../utils/logger');
const crypto = require('crypto');

// Import MVP contract ABIs
const DistributorABI = require('../../monowave_sc/artifacts/monowave_sc/contracts/Distributor.sol/Distributor.json').abi;
const EscrowABI = require('../../monowave_sc/artifacts/monowave_sc/contracts/Escrow.sol/Escrow.json').abi;
const BatchLedgerABI = require('../../monowave_sc/artifacts/monowave_sc/contracts/BatchLedger.sol/BatchLedger.json').abi;

class RevenueService {
  constructor() {
    this.web3 = new Web3(process.env.WEB3_PROVIDER_URL || 'http://127.0.0.1:8546');
    this.distributorAddress = process.env.DISTRIBUTOR_ADDRESS;
    this.escrowAddress = process.env.ESCROW_ADDRESS;
    this.batchLedgerAddress = process.env.BATCH_LEDGER_ADDRESS;
    this.privateKey = process.env.PRIVATE_KEY;
    
    // Distribution configuration
    this.disputeWindow = parseInt(process.env.DISPUTE_WINDOW_SECONDS) || 86400; // 24 hours
    this.batchSize = parseInt(process.env.REVENUE_BATCH_SIZE) || 50;
    this.pendingDistributions = [];
    
    if (this.privateKey && this.privateKey !== '') {
      try {
        this.account = this.web3.eth.accounts.privateKeyToAccount(this.privateKey);
        this.web3.eth.accounts.wallet.add(this.account);
        
        if (this.distributorAddress && this.escrowAddress && this.batchLedgerAddress) {
          this.distributor = new this.web3.eth.Contract(DistributorABI, this.distributorAddress);
          this.escrow = new this.web3.eth.Contract(EscrowABI, this.escrowAddress);
          this.batchLedger = new this.web3.eth.Contract(BatchLedgerABI, this.batchLedgerAddress);
          
          logger.info('Revenue service initialized with MVP contracts', {
            distributor: this.distributorAddress,
            escrow: this.escrowAddress,
            batchLedger: this.batchLedgerAddress,
            disputeWindow: this.disputeWindow,
            batchSize: this.batchSize
          });
        } else {
          logger.warn('MVP revenue service contract addresses not configured');
          this.distributor = null;
          this.escrow = null;
          this.batchLedger = null;
        }
      } catch (error) {
        logger.error('Failed to initialize revenue service:', error);
        this.account = null;
        this.distributor = null;
        this.escrow = null;
        this.batchLedger = null;
      }
    } else {
      logger.warn('No private key provided, revenue service disabled');
      this.account = null;
      this.distributor = null;
      this.escrow = null;
      this.batchLedger = null;
    }
  }

  async distributeAdRevenue(publisherAddress, aiSearcherAddress, totalRevenueUSDC, metadata = {}) {
    if (!this.account || !this.distributor) {
      logger.warn('Revenue service not available, recording database entry only');
      return await this._recordDistributionInDatabase(
        publisherAddress, 
        aiSearcherAddress, 
        totalRevenueUSDC, 
        'ad_revenue',
        null,
        'offline',
        JSON.stringify(metadata)
      );
    }

    try {
      // Add to pending distributions for batch processing
      const distributionData = {
        publisherAddress,
        aiSearcherAddress,
        totalRevenueUSDC,
        metadata,
        timestamp: Date.now(),
        type: 'ad_revenue'
      };

      this.pendingDistributions.push(distributionData);
      
      logger.info('Ad revenue distribution queued', {
        publisher: publisherAddress,
        aiSearcher: aiSearcherAddress,
        totalRevenue: totalRevenueUSDC,
        queueSize: this.pendingDistributions.length
      });

      // Process batch if size reached
      if (this.pendingDistributions.length >= this.batchSize) {
        return await this._processBatchDistribution();
      }

      // Record in database as pending
      const dbRecord = await this._recordDistributionInDatabase(
        publisherAddress,
        aiSearcherAddress,
        totalRevenueUSDC,
        'ad_revenue',
        null,
        'queued',
        JSON.stringify(metadata)
      );

      return {
        success: true,
        status: 'queued',
        dbRecordId: dbRecord.id,
        message: 'Distribution queued for batch processing'
      };

    } catch (error) {
      logger.error('Revenue distribution queueing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async _processBatchDistribution() {
    if (this.pendingDistributions.length === 0) {
      return { success: true, message: 'No pending distributions' };
    }

    const distributions = [...this.pendingDistributions];
    this.pendingDistributions = [];

    try {
      // Generate batch ID and commitment
      const batchId = this._generateBatchId();
      const { merkleRoot, leaves, payouts } = this._buildDistributionMerkleTree(distributions);

      logger.info('Processing revenue distribution batch', {
        batchId,
        distributionCount: distributions.length,
        merkleRoot,
        totalAmount: distributions.reduce((sum, d) => sum + d.totalRevenueUSDC, 0)
      });

      // Step 1: Commit batch to BatchLedger
      const commitTx = await this.batchLedger.methods
        .commitBatch(batchId, merkleRoot, distributions.length, 'Revenue distribution batch')
        .send({
          from: this.account.address,
          gas: 200000,
          gasPrice: await this.web3.eth.getGasPrice()
        });

      logger.info('Revenue batch committed to ledger', {
        batchId,
        commitTxHash: commitTx.transactionHash
      });

      // Step 2: Open payout in Distributor
      const tokenAddress = process.env.MOCK_USDC_ADDRESS; // Use configured token
      const windowEnd = Math.floor(Date.now() / 1000) + this.disputeWindow;

      const payoutTx = await this.distributor.methods
        .openPayout(batchId, tokenAddress, merkleRoot, windowEnd)
        .send({
          from: this.account.address,
          gas: 300000,
          gasPrice: await this.web3.eth.getGasPrice()
        });

      logger.info('Revenue payout opened', {
        batchId,
        payoutTxHash: payoutTx.transactionHash,
        windowEnd: new Date(windowEnd * 1000).toISOString()
      });

      // Step 3: Record in database with payout info
      await this._updateBatchDistributionInDatabase(
        distributions, 
        batchId, 
        commitTx.transactionHash,
        payoutTx.transactionHash,
        merkleRoot,
        payouts
      );

      logger.info('Revenue distribution batch processed successfully', {
        batchId,
        distributionCount: distributions.length,
        commitTxHash: commitTx.transactionHash,
        payoutTxHash: payoutTx.transactionHash
      });

      return {
        success: true,
        batchId,
        commitTxHash: commitTx.transactionHash,
        payoutTxHash: payoutTx.transactionHash,
        distributionCount: distributions.length,
        merkleRoot,
        windowEnd
      };

    } catch (error) {
      logger.error('Batch distribution processing failed:', error);
      
      // Mark distributions as failed in database
      await this._markDistributionsAsFailed(distributions, error.message);
      
      return {
        success: false,
        error: error.message,
        distributionCount: distributions.length
      };
    }
  }

  _buildDistributionMerkleTree(distributions) {
    const payouts = [];
    const leaves = [];

    distributions.forEach((dist, index) => {
      // Calculate shares (70% publisher, 30% AI searcher after 2% platform fee)
      const platformFee = dist.totalRevenueUSDC * 0.02;
      const remainingAmount = dist.totalRevenueUSDC - platformFee;
      const publisherShare = remainingAmount * 0.70;
      const aiSearcherShare = remainingAmount * 0.30;

      // Create payout entries
      payouts.push({
        recipient: dist.publisherAddress,
        amount: publisherShare,
        index: index * 2,
        type: 'publisher_share'
      });

      payouts.push({
        recipient: dist.aiSearcherAddress,
        amount: aiSearcherShare,
        index: index * 2 + 1,
        type: 'ai_searcher_share'
      });

      // Create Merkle leaves (simplified)
      const publisherLeaf = this.web3.utils.solidityKeccak256(
        ['address', 'uint256', 'uint256'],
        [dist.publisherAddress, this.web3.utils.toWei((publisherShare * 1000000).toString(), 'wei'), index * 2]
      );

      const aiSearcherLeaf = this.web3.utils.solidityKeccak256(
        ['address', 'uint256', 'uint256'],
        [dist.aiSearcherAddress, this.web3.utils.toWei((aiSearcherShare * 1000000).toString(), 'wei'), index * 2 + 1]
      );

      leaves.push(publisherLeaf, aiSearcherLeaf);
    });

    // Simple Merkle root calculation (in production, use proper Merkle tree)
    const merkleRoot = this.web3.utils.solidityKeccak256(['bytes32[]'], [leaves]);

    return { merkleRoot, leaves, payouts };
  }

  // Legacy method for backward compatibility
  async distributeCustomRevenue(recipients, amounts, distributionType = 'custom') {
    logger.warn('distributeCustomRevenue is deprecated in MVP - use distributeAdRevenue instead');
    
    // Convert to ad revenue format for compatibility
    if (recipients.length === 2 && amounts.length === 2) {
      const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0);
      return await this.distributeAdRevenue(recipients[0], recipients[1], totalAmount, {
        type: distributionType,
        originalAmounts: amounts
      });
    }
    
    return { success: false, error: 'Method deprecated - use distributeAdRevenue for two-party distributions' };
  }

  async claimPayout(batchId, recipient, amount, proof) {
    if (!this.account || !this.distributor) {
      return { success: false, error: 'Service not available' };
    }

    try {
      const amountWei = this.web3.utils.toWei((amount * 1000000).toString(), 'wei');
      
      logger.info('Processing payout claim', {
        batchId,
        recipient,
        amount,
        proof: proof.length
      });

      const tx = await this.distributor.methods
        .claim(batchId, recipient, amountWei, proof)
        .send({
          from: this.account.address,
          gas: 300000,
          gasPrice: await this.web3.eth.getGasPrice()
        });

      logger.info('Payout claimed successfully', {
        batchId,
        recipient,
        amount,
        txHash: tx.transactionHash
      });

      return {
        success: true,
        txHash: tx.transactionHash,
        gasUsed: tx.gasUsed
      };

    } catch (error) {
      logger.error('Payout claim failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async settleBatch(batchId) {
    if (!this.account || !this.distributor) {
      return { success: false, error: 'Service not available' };
    }

    try {
      logger.info('Settling revenue batch', { batchId });

      const tx = await this.distributor.methods
        .settle(batchId)
        .send({
          from: this.account.address,
          gas: 200000,
          gasPrice: await this.web3.eth.getGasPrice()
        });

      logger.info('Revenue batch settled successfully', {
        batchId,
        txHash: tx.transactionHash
      });

      return {
        success: true,
        txHash: tx.transactionHash,
        gasUsed: tx.gasUsed
      };

    } catch (error) {
      logger.error('Batch settlement failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Legacy methods for backward compatibility
  async getDistributionDetails(distributionId) {
    // Map to batch payout status for MVP
    const payoutStatus = await this.getPayoutStatus(distributionId);
    if (!payoutStatus) {
      return null;
    }

    return {
      recipients: [], // Would need to reconstruct from Merkle tree
      amounts: [],
      totalAmount: 0,
      timestamp: 0,
      completed: payoutStatus.state === 1, // settled
      distributionType: 'ad_revenue',
      transactionHash: distributionId
    };
  }

  async getRecipientTotalReceived(recipientAddress) {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN publisher_address = $1 THEN publisher_amount ELSE 0 END), 0) as publisher_total,
          COALESCE(SUM(CASE WHEN ai_searcher_address = $1 THEN ai_searcher_amount ELSE 0 END), 0) as ai_searcher_total
        FROM revenue_distributions 
        WHERE (publisher_address = $1 OR ai_searcher_address = $1) AND status = 'completed'
      `, [recipientAddress]);

      const totals = result.rows[0];
      return parseFloat(totals.publisher_total) + parseFloat(totals.ai_searcher_total);

    } catch (error) {
      logger.error('Failed to get recipient total received:', error);
      return null;
    } finally {
      client.release();
    }
  }

  async getShareConfiguration() {
    // Fixed configuration in MVP
    return {
      publisherShare: 70,
      aiSearcherShare: 30
    };
  }

  async getTotalStats() {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          COUNT(*) as total_distributions,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_distributions,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_distributions,
          COALESCE(SUM(total_amount), 0) as total_distributed,
          COUNT(DISTINCT batch_id) as total_batches
        FROM revenue_distributions
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);

      const stats = result.rows[0];

      return {
        totalDistributed: parseFloat(stats.total_distributed),
        distributionCounter: parseInt(stats.total_distributions),
        totalPendingDistributions: parseFloat(0), // Would need to calculate from pending batches
        completedDistributions: parseInt(stats.completed_distributions),
        pendingDistributions: parseInt(stats.pending_distributions),
        totalBatches: parseInt(stats.total_batches)
      };

    } catch (error) {
      logger.error('Failed to get total stats:', error);
      return null;
    } finally {
      client.release();
    }
  }

  async getPayoutStatus(batchId) {
    if (!this.distributor) {
      return null;
    }

    try {
      const payout = await this.distributor.methods
        .payouts(batchId)
        .call();

      return {
        tokenAddress: payout.tokenAddress,
        merkleRoot: payout.merkleRoot,
        windowEnd: parseInt(payout.windowEnd),
        state: parseInt(payout.state), // 0=pending, 1=settled, 2=disputed, 3=reversed
        stateName: ['pending', 'settled', 'disputed', 'reversed'][parseInt(payout.state)]
      };

    } catch (error) {
      logger.error('Failed to get payout status:', error);
      return null;
    }
  }

  async disputePayout(batchId, reason = '') {
    if (!this.account || !this.distributor) {
      return { success: false, error: 'Service not available' };
    }

    try {
      logger.info('Disputing revenue payout', { batchId, reason });

      const tx = await this.distributor.methods
        .dispute(batchId, reason)
        .send({
          from: this.account.address,
          gas: 200000,
          gasPrice: await this.web3.eth.getGasPrice()
        });

      logger.info('Revenue payout disputed successfully', {
        batchId,
        reason,
        txHash: tx.transactionHash
      });

      return {
        success: true,
        txHash: tx.transactionHash,
        gasUsed: tx.gasUsed
      };

    } catch (error) {
      logger.error('Payout dispute failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  _generateBatchId() {
    return '0x' + crypto.randomBytes(32).toString('hex');
  }

  async _recordDistributionInDatabase(publisherAddress, aiSearcherAddress, totalAmount, distributionType, txHash, status = 'pending', metadata = null) {
    const client = await pool.connect();
    
    try {
      // Calculate shares
      const platformFee = totalAmount * 0.02;
      const remainingAmount = totalAmount - platformFee;
      const publisherAmount = remainingAmount * 0.70;
      const aiSearcherAmount = remainingAmount * 0.30;

      const result = await client.query(
        `INSERT INTO revenue_distributions 
         (publisher_address, ai_searcher_address, total_amount, publisher_amount, ai_searcher_amount, 
          distribution_type, blockchain_tx_hash, status, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         RETURNING id`,
        [
          publisherAddress,
          aiSearcherAddress,
          totalAmount,
          publisherAmount,
          aiSearcherAmount,
          distributionType,
          txHash,
          status,
          metadata
        ]
      );

      return { id: result.rows[0].id };

    } catch (error) {
      logger.error('Failed to record distribution in database:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async _updateBatchDistributionInDatabase(distributions, batchId, commitTxHash, payoutTxHash, merkleRoot, payouts) {
    const client = await pool.connect();
    
    try {
      // Create batch record
      await client.query(
        `INSERT INTO revenue_batches 
         (batch_id, commit_tx_hash, payout_tx_hash, merkle_root, distribution_count, 
          total_amount, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW())`,
        [
          batchId,
          commitTxHash, 
          payoutTxHash,
          merkleRoot,
          distributions.length,
          distributions.reduce((sum, d) => sum + d.totalRevenueUSDC, 0)
        ]
      );

      // Update individual distribution records
      for (let i = 0; i < distributions.length; i++) {
        const dist = distributions[i];
        await this._recordDistributionInDatabase(
          dist.publisherAddress,
          dist.aiSearcherAddress,
          dist.totalRevenueUSDC,
          dist.type,
          payoutTxHash,
          'batched',
          JSON.stringify({ ...dist.metadata, batchId, merkleRoot })
        );
      }

      logger.info('Batch distribution updated in database', {
        batchId,
        distributionCount: distributions.length
      });

    } catch (error) {
      logger.error('Failed to update batch distribution in database:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async _markDistributionsAsFailed(distributions, errorMessage) {
    for (const dist of distributions) {
      try {
        await this._recordDistributionInDatabase(
          dist.publisherAddress,
          dist.aiSearcherAddress,
          dist.totalRevenueUSDC,
          dist.type,
          null,
          'failed',
          JSON.stringify({ ...dist.metadata, error: errorMessage })
        );
      } catch (error) {
        logger.error('Failed to mark distribution as failed:', error);
      }
    }
  }

  isAvailable() {
    return this.account !== null && this.distributor !== null;
  }

  getContractAddress() {
    return this.distributorAddress;
  }

  getContractAddresses() {
    return {
      distributor: this.distributorAddress,
      escrow: this.escrowAddress,
      batchLedger: this.batchLedgerAddress
    };
  }

  // Flush pending distributions (useful for testing or shutdown)
  async flushPendingDistributions() {
    if (this.pendingDistributions.length > 0) {
      logger.info('Flushing pending distributions', {
        count: this.pendingDistributions.length
      });
      return await this._processBatchDistribution();
    }
    return { success: true, message: 'No pending distributions' };
  }
}

module.exports = RevenueService;