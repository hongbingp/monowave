import { pool } from '../config/database.js';
import RevenueService from '../services/revenueService.js';
import AdTransactionService from '../services/adTransactionService.js';
import BlockchainService from '../services/blockchainService.js';
import logger from '../utils/logger.js';

const revenueService = new RevenueService();
const adTransactionService = new AdTransactionService();
const blockchainService = new BlockchainService();

async function getPlatformStats(req, res) {
  try {
    logger.info('Fetching platform statistics');

    // Get database statistics
    const dbStats = await getDatabaseStats();
    
    // Get blockchain statistics if available
    let blockchainStats = {};
    if (revenueService.isAvailable()) {
      const revenueStats = await revenueService.getTotalStats();
      if (revenueStats) {
        blockchainStats.revenue = revenueStats;
      }
    }
    
    if (adTransactionService.isAvailable()) {
      const adStats = await adTransactionService.getPlatformStats();
      if (adStats) {
        blockchainStats.adTransactions = adStats;
      }
    }

    const response = {
      code: 'SUCCESS',
      data: {
        database: dbStats,
        blockchain: blockchainStats,
        services: {
          revenueService: revenueService.isAvailable(),
          adTransactionService: adTransactionService.isAvailable(),
          blockchainService: blockchainService.isAvailable()
        },
        mvp: {
          batchProcessing: true,
          contractAddresses: blockchainService.isAvailable() ? 
            blockchainService.getContractAddresses() : null
        }
      }
    };

    logger.info('Platform statistics retrieved successfully');
    res.json(response);

  } catch (error) {
    logger.error('Failed to get platform stats:', error);
    res.status(500).json({
      code: 'STATS_ERROR',
      message: 'Failed to retrieve platform statistics'
    });
  }
}

async function getUserStats(req, res) {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'User ID is required'
      });
    }

    logger.info('Fetching user statistics', { userId });

    // Get user information
    const userResult = await pool.query(
      `SELECT id, email, wallet_address, user_type, balance, status, created_at,
              (SELECT COUNT(*) FROM api_keys WHERE user_id = $1) as api_key_count
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];
    
    // Get usage statistics
    const usageStats = await getUserUsageStats(userId);
    
    // Get revenue statistics if user has a wallet
    let revenueStats = null;
    if (user.wallet_address) {
      revenueStats = await getUserRevenueStats(user.wallet_address, user.user_type);
    }

    const response = {
      code: 'SUCCESS',
      data: {
        user: {
          id: user.id,
          email: user.email,
          walletAddress: user.wallet_address,
          userType: user.user_type,
          balance: parseFloat(user.balance),
          status: user.status,
          createdAt: user.created_at,
          apiKeyCount: parseInt(user.api_key_count)
        },
        usage: usageStats,
        revenue: revenueStats
      }
    };

    logger.info('User statistics retrieved successfully', { userId });
    res.json(response);

  } catch (error) {
    logger.error('Failed to get user stats:', error);
    res.status(500).json({
      code: 'STATS_ERROR',
      message: 'Failed to retrieve user statistics'
    });
  }
}

async function getRevenueReport(req, res) {
  try {
    const { startDate, endDate, entityType, entityAddress } = req.query;
    
    logger.info('Generating revenue report', {
      startDate,
      endDate,
      entityType,
      entityAddress
    });

    // Get database revenue records
    const dbRevenue = await getDatabaseRevenueReport({
      startDate,
      endDate,
      entityType,
      entityAddress
    });

    // Get blockchain metrics if available and entity address is provided
    let blockchainMetrics = null;
    if (entityAddress && entityType && adTransactionService.isAvailable()) {
      try {
        blockchainMetrics = await adTransactionService.getEntityMetrics(
          entityAddress, 
          entityType
        );
      } catch (error) {
        logger.warn('Failed to get blockchain metrics:', error);
      }
    }

    const response = {
      code: 'SUCCESS',
      data: {
        database: dbRevenue,
        blockchain: blockchainMetrics,
        filters: {
          startDate,
          endDate,
          entityType,
          entityAddress
        }
      }
    };

    logger.info('Revenue report generated successfully');
    res.json(response);

  } catch (error) {
    logger.error('Failed to generate revenue report:', error);
    res.status(500).json({
      code: 'REPORT_ERROR',
      message: 'Failed to generate revenue report'
    });
  }
}

async function getAdTransactionReport(req, res) {
  try {
    const { startDate, endDate, campaignId, transactionType } = req.query;
    
    logger.info('Generating ad transaction report', {
      startDate,
      endDate,
      campaignId,
      transactionType
    });

    // Get database ad transaction records
    const dbTransactions = await getDatabaseAdTransactionReport({
      startDate,
      endDate,
      campaignId,
      transactionType
    });

    // Get campaign metrics if campaign ID is provided and service is available
    let campaignMetrics = null;
    if (campaignId && adTransactionService.isAvailable()) {
      try {
        campaignMetrics = await adTransactionService.getCampaignMetrics(
          parseInt(campaignId)
        );
      } catch (error) {
        logger.warn('Failed to get campaign metrics:', error);
      }
    }

    const response = {
      code: 'SUCCESS',
      data: {
        transactions: dbTransactions.transactions,
        summary: dbTransactions.summary,
        campaignMetrics,
        filters: {
          startDate,
          endDate,
          campaignId,
          transactionType
        }
      }
    };

    logger.info('Ad transaction report generated successfully');
    res.json(response);

  } catch (error) {
    logger.error('Failed to generate ad transaction report:', error);
    res.status(500).json({
      code: 'REPORT_ERROR',
      message: 'Failed to generate ad transaction report'
    });
  }
}

// Helper functions

async function getDatabaseStats() {
  const client = await pool.connect();
  try {
    const [
      userCount,
      apiKeyCount,
      usageLogCount,
      revenueDistCount,
      adTransactionCount,
      totalRevenue
    ] = await Promise.all([
      client.query('SELECT COUNT(*) as count FROM users'),
      client.query('SELECT COUNT(*) as count FROM api_keys'),
      client.query('SELECT COUNT(*) as count FROM usage_logs'),
      client.query('SELECT COUNT(*) as count FROM revenue_distributions'),
      client.query('SELECT COUNT(*) as count FROM ad_transactions'),
      client.query('SELECT COALESCE(SUM(total_amount), 0) as total FROM revenue_distributions WHERE status = \'completed\'')
    ]);

    return {
      users: parseInt(userCount.rows[0].count),
      apiKeys: parseInt(apiKeyCount.rows[0].count),
      usageLogs: parseInt(usageLogCount.rows[0].count),
      revenueDistributions: parseInt(revenueDistCount.rows[0].count),
      adTransactions: parseInt(adTransactionCount.rows[0].count),
      totalRevenue: parseFloat(totalRevenue.rows[0].total)
    };
  } finally {
    client.release();
  }
}

async function getUserUsageStats(userId) {
  const client = await pool.connect();
  try {
    const usageResult = await client.query(
      `SELECT 
         COUNT(*) as total_requests,
         COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_requests,
         COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_requests,
         COALESCE(SUM(cost), 0) as total_cost,
         COALESCE(SUM(bytes_processed), 0) as total_bytes_processed,
         MIN(created_at) as first_request,
         MAX(created_at) as last_request
       FROM usage_logs ul
       JOIN api_keys ak ON ak.id = ul.api_key_id
       WHERE ak.user_id = $1`,
      [userId]
    );

    const usage = usageResult.rows[0];
    return {
      totalRequests: parseInt(usage.total_requests),
      successfulRequests: parseInt(usage.successful_requests),
      failedRequests: parseInt(usage.failed_requests),
      totalCost: parseFloat(usage.total_cost),
      totalBytesProcessed: parseInt(usage.total_bytes_processed),
      firstRequest: usage.first_request,
      lastRequest: usage.last_request,
      successRate: usage.total_requests > 0 ? 
        (usage.successful_requests / usage.total_requests * 100).toFixed(2) : 0
    };
  } finally {
    client.release();
  }
}

async function getUserRevenueStats(walletAddress, userType) {
  const client = await pool.connect();
  try {
    let stats = null;

    if (userType === 'publisher') {
      const result = await client.query(
        `SELECT 
           COUNT(*) as distribution_count,
           COALESCE(SUM(publisher_amount), 0) as total_received,
           MIN(created_at) as first_distribution,
           MAX(created_at) as last_distribution
         FROM revenue_distributions
         WHERE publisher_address = $1 AND status = 'completed'`,
        [walletAddress]
      );
      
      const row = result.rows[0];
      stats = {
        type: 'publisher',
        distributionCount: parseInt(row.distribution_count),
        totalReceived: parseFloat(row.total_received),
        firstDistribution: row.first_distribution,
        lastDistribution: row.last_distribution
      };
    } else if (userType === 'ai_searcher') {
      const result = await client.query(
        `SELECT 
           COUNT(*) as distribution_count,
           COALESCE(SUM(ai_searcher_amount), 0) as total_received,
           MIN(created_at) as first_distribution,
           MAX(created_at) as last_distribution
         FROM revenue_distributions
         WHERE ai_searcher_address = $1 AND status = 'completed'`,
        [walletAddress]
      );
      
      const row = result.rows[0];
      stats = {
        type: 'ai_searcher',
        distributionCount: parseInt(row.distribution_count),
        totalReceived: parseFloat(row.total_received),
        firstDistribution: row.first_distribution,
        lastDistribution: row.last_distribution
      };
    }

    // Get blockchain stats if available
    if (stats && revenueService.isAvailable()) {
      try {
        const totalReceived = await revenueService.getRecipientTotalReceived(walletAddress);
        if (totalReceived !== null) {
          stats.blockchainTotalReceived = totalReceived;
        }
      } catch (error) {
        logger.warn('Failed to get blockchain revenue stats:', error);
      }
    }

    return stats;
  } finally {
    client.release();
  }
}

async function getDatabaseRevenueReport({ startDate, endDate, entityType, entityAddress }) {
  const client = await pool.connect();
  try {
    let whereClause = "WHERE status = 'completed'";
    const queryParams = [];
    let paramIndex = 1;

    if (startDate) {
      whereClause += ` AND created_at >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND created_at <= $${paramIndex}`;
      queryParams.push(endDate);
      paramIndex++;
    }

    if (entityAddress && entityType) {
      if (entityType === 'publisher') {
        whereClause += ` AND publisher_address = $${paramIndex}`;
      } else if (entityType === 'ai_searcher') {
        whereClause += ` AND ai_searcher_address = $${paramIndex}`;
      }
      queryParams.push(entityAddress);
    }

    const query = `
      SELECT 
        COUNT(*) as distribution_count,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(publisher_amount), 0) as publisher_total,
        COALESCE(SUM(ai_searcher_amount), 0) as ai_searcher_total,
        MIN(created_at) as earliest_distribution,
        MAX(created_at) as latest_distribution
      FROM revenue_distributions
      ${whereClause}
    `;

    const result = await client.query(query, queryParams);
    const row = result.rows[0];

    return {
      distributionCount: parseInt(row.distribution_count),
      totalAmount: parseFloat(row.total_amount),
      publisherTotal: parseFloat(row.publisher_total),
      aiSearcherTotal: parseFloat(row.ai_searcher_total),
      earliestDistribution: row.earliest_distribution,
      latestDistribution: row.latest_distribution
    };
  } finally {
    client.release();
  }
}

async function getDatabaseAdTransactionReport({ startDate, endDate, campaignId, transactionType }) {
  const client = await pool.connect();
  try {
    let whereClause = "WHERE 1=1";
    const queryParams = [];
    let paramIndex = 1;

    if (startDate) {
      whereClause += ` AND created_at >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND created_at <= $${paramIndex}`;
      queryParams.push(endDate);
      paramIndex++;
    }

    if (campaignId) {
      whereClause += ` AND campaign_id = $${paramIndex}`;
      queryParams.push(campaignId);
      paramIndex++;
    }

    if (transactionType) {
      whereClause += ` AND transaction_type = $${paramIndex}`;
      queryParams.push(transactionType);
      paramIndex++;
    }

    // Get transaction summary
    const summaryQuery = `
      SELECT 
        COUNT(*) as transaction_count,
        COUNT(CASE WHEN transaction_type = 'impression' THEN 1 END) as impressions,
        COUNT(CASE WHEN transaction_type = 'click' THEN 1 END) as clicks,
        COUNT(CASE WHEN transaction_type = 'conversion' THEN 1 END) as conversions,
        COALESCE(SUM(ad_amount), 0) as total_amount,
        COALESCE(SUM(publisher_share), 0) as publisher_total,
        COALESCE(SUM(ai_searcher_share), 0) as ai_searcher_total,
        COALESCE(SUM(platform_fee), 0) as platform_fees
      FROM ad_transactions
      ${whereClause}
    `;

    // Get recent transactions (limit 100)
    const transactionsQuery = `
      SELECT 
        id, publisher_address, advertiser_address, ai_searcher_address,
        campaign_id, ad_amount, transaction_type, status, created_at
      FROM ad_transactions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const [summaryResult, transactionsResult] = await Promise.all([
      client.query(summaryQuery, queryParams),
      client.query(transactionsQuery, queryParams)
    ]);

    const summary = summaryResult.rows[0];

    return {
      summary: {
        transactionCount: parseInt(summary.transaction_count),
        impressions: parseInt(summary.impressions),
        clicks: parseInt(summary.clicks),
        conversions: parseInt(summary.conversions),
        totalAmount: parseFloat(summary.total_amount),
        publisherTotal: parseFloat(summary.publisher_total),
        aiSearcherTotal: parseFloat(summary.ai_searcher_total),
        platformFees: parseFloat(summary.platform_fees),
        ctr: summary.impressions > 0 ? 
          (summary.clicks / summary.impressions * 100).toFixed(2) : 0,
        conversionRate: summary.clicks > 0 ? 
          (summary.conversions / summary.clicks * 100).toFixed(2) : 0
      },
      transactions: transactionsResult.rows.map(tx => ({
        id: tx.id,
        publisherAddress: tx.publisher_address,
        advertiserAddress: tx.advertiser_address,
        aiSearcherAddress: tx.ai_searcher_address,
        campaignId: tx.campaign_id,
        adAmount: parseFloat(tx.ad_amount),
        transactionType: tx.transaction_type,
        status: tx.status,
        createdAt: tx.created_at
      }))
    };
  } finally {
    client.release();
  }
}

async function getBatchProcessingStats(req, res) {
  try {
    logger.info('Fetching batch processing statistics');

    // Get ad transaction batch stats
    const adTransactionBatchStats = await getAdTransactionBatchStats();
    
    // Get revenue distribution batch stats  
    const revenueBatchStats = await getRevenueBatchStats();

    // Get blockchain service status and contract addresses
    const blockchainStatus = {
      available: blockchainService.isAvailable(),
      contractAddresses: blockchainService.isAvailable() ? 
        blockchainService.getContractAddresses() : null
    };

    // Get pending batch counts
    const pendingStats = await getPendingBatchStats();

    const response = {
      code: 'SUCCESS',
      data: {
        adTransactions: adTransactionBatchStats,
        revenueDistributions: revenueBatchStats,
        pending: pendingStats,
        blockchain: blockchainStatus,
        batchConfiguration: {
          adTransactionBatchSize: process.env.BATCH_SIZE || 100,
          adTransactionBatchTimeout: process.env.BATCH_TIMEOUT_MS || 30000,
          revenueBatchSize: process.env.REVENUE_BATCH_SIZE || 50,
          disputeWindow: process.env.DISPUTE_WINDOW_SECONDS || 86400
        }
      }
    };

    logger.info('Batch processing statistics retrieved successfully');
    res.json(response);

  } catch (error) {
    logger.error('Failed to get batch processing stats:', error);
    res.status(500).json({
      code: 'BATCH_STATS_ERROR',
      message: 'Failed to retrieve batch processing statistics'
    });
  }
}

async function getAdTransactionBatchStats() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        COUNT(CASE WHEN batch_id IS NOT NULL THEN 1 END) as batched_transactions,
        COUNT(CASE WHEN batch_id IS NULL AND status = 'pending' THEN 1 END) as pending_transactions,
        COUNT(CASE WHEN status = 'batch_failed' THEN 1 END) as failed_batch_transactions,
        COUNT(DISTINCT batch_id) as unique_batches,
        MIN(batch_processed_at) as first_batch_processed,
        MAX(batch_processed_at) as last_batch_processed
      FROM ad_transactions
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `);

    const stats = result.rows[0];
    return {
      batchedTransactions: parseInt(stats.batched_transactions),
      pendingTransactions: parseInt(stats.pending_transactions),
      failedBatchTransactions: parseInt(stats.failed_batch_transactions),
      uniqueBatches: parseInt(stats.unique_batches),
      firstBatchProcessed: stats.first_batch_processed,
      lastBatchProcessed: stats.last_batch_processed,
      avgTransactionsPerBatch: stats.unique_batches > 0 ? 
        (stats.batched_transactions / stats.unique_batches).toFixed(2) : 0
    };
  } finally {
    client.release();
  }
}

async function getRevenueBatchStats() {
  const client = await pool.connect();
  try {
    // Check if revenue_batches table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'revenue_batches'
      );
    `);

    if (!tableExists.rows[0].exists) {
      return {
        message: 'Revenue batches table not yet created',
        totalBatches: 0,
        activeBatches: 0,
        completedBatches: 0
      };
    }

    const result = await client.query(`
      SELECT 
        COUNT(*) as total_batches,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_batches,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_batches,
        COALESCE(SUM(total_amount), 0) as total_amount_processed,
        MIN(created_at) as first_batch_created,
        MAX(created_at) as last_batch_created
      FROM revenue_batches
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `);

    const stats = result.rows[0];
    return {
      totalBatches: parseInt(stats.total_batches),
      activeBatches: parseInt(stats.active_batches),
      completedBatches: parseInt(stats.completed_batches),
      totalAmountProcessed: parseFloat(stats.total_amount_processed),
      firstBatchCreated: stats.first_batch_created,
      lastBatchCreated: stats.last_batch_created
    };
  } finally {
    client.release();
  }
}

async function getPendingBatchStats() {
  // Note: This would require access to the service instances' pending arrays
  // For now, we'll return estimated counts based on recent transactions
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        COUNT(CASE WHEN batch_id IS NULL AND status = 'pending' AND created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as recent_pending_ad_transactions,
        COUNT(CASE WHEN status = 'queued' AND created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as recent_queued_distributions
      FROM ad_transactions at
      LEFT JOIN revenue_distributions rd ON rd.created_at >= NOW() - INTERVAL '1 hour'
    `);

    const stats = result.rows[0];
    return {
      estimatedPendingAdTransactions: parseInt(stats.recent_pending_ad_transactions),
      estimatedQueuedDistributions: parseInt(stats.recent_queued_distributions),
      note: 'Pending counts are estimated based on recent database records'
    };
  } finally {
    client.release();
  }
}

export { getPlatformStats, getUserStats, getRevenueReport, getAdTransactionReport, getBatchProcessingStats };;