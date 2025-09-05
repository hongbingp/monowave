import CrawlerService from '../services/crawler.js';
import BlockchainService from '../services/blockchainService.js';
import RevenueService from '../services/revenueService.js';
import AdTransactionService from '../services/adTransactionService.js';
import { pool } from '../config/database.js';
import logger from '../utils/logger.js';
import Joi from 'joi';

const crawlerService = new CrawlerService();
const blockchainService = new BlockchainService();
const revenueService = new RevenueService();
const adTransactionService = new AdTransactionService();

const crawlSchema = Joi.object({
  urls: Joi.array().items(Joi.string().uri()).min(1).max(10).required(),
  format: Joi.string().valid('raw', 'summary', 'structured').default('raw')
});

async function crawl(req, res) {
  try {
    const { error, value } = crawlSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: error.details[0].message
      });
    }

    const { urls, format } = value;
    const { apiKey } = req;

    // Check if user has sufficient balance (database fallback)
    if (apiKey.user.balance <= 0) {
      // Also check escrow balance if blockchain service is available
      let escrowBalance = 0;
      if (blockchainService.isAvailable() && apiKey.user.walletAddress) {
        escrowBalance = await blockchainService.getEscrowBalance(
          apiKey.user.walletAddress,
          blockchainService.getContractAddresses().mockUSDC
        ) || 0;
      }

      if (escrowBalance <= 0) {
        return res.status(402).json({
          code: 'INSUFFICIENT_BALANCE',
          message: 'Insufficient balance to perform crawling. Please deposit funds to escrow or top up your account balance.',
          data: {
            databaseBalance: apiKey.user.balance,
            escrowBalance
          }
        });
      }
    }

    // Crawl URLs
    const crawlResults = await crawlerService.crawlMultipleUrls(urls, format);
    
    // Calculate costs and log usage
    let totalCost = 0;
    const usageLogs = [];

    for (const [url, result] of Object.entries(crawlResults.results)) {
      const callCost = parseFloat(apiKey.limits.pricePerCall);
      const byteCost = parseFloat(apiKey.limits.pricePerByte) * result.contentLength;
      const cost = callCost + byteCost;
      totalCost += cost;

      usageLogs.push({
        apiKeyId: apiKey.id,
        url,
        format,
        bytesProcessed: result.contentLength,
        cost,
        status: 'success'
      });
    }

    // Log failed URLs
    for (const [url, error] of Object.entries(crawlResults.errors)) {
      usageLogs.push({
        apiKeyId: apiKey.id,
        url,
        format,
        bytesProcessed: 0,
        cost: 0,
        status: 'failed'
      });
    }

    // Save usage logs
    await saveUsageLogs(usageLogs);

    // Validate participant registration and process blockchain charge if available
    let blockchainResult = null;
    if (totalCost > 0 && blockchainService.isAvailable() && apiKey.user.walletAddress) {
      // Check if user is registered as AI Searcher
      const participantInfo = await blockchainService.getParticipantInfo(apiKey.user.walletAddress);
      
      if (!participantInfo || !participantInfo.isAISearcher) {
        // Auto-register user as AI Searcher if not registered
        logger.info('Auto-registering user as AI Searcher', {
          wallet: apiKey.user.walletAddress
        });
        
        const registrationResult = await blockchainService.registerParticipant(
          apiKey.user.walletAddress,
          BlockchainService.ROLES.AI_SEARCHER,
          apiKey.user.walletAddress, // Use same address as payout
          '0x0000000000000000000000000000000000000000000000000000000000000000'
        );

        if (!registrationResult.success) {
          logger.warn('Failed to auto-register user as AI Searcher:', registrationResult.error);
        }
      }

      // Process crawl charge validation (MVP uses batch processing)
      const firstUrl = urls[0];
      blockchainResult = await blockchainService.processCrawlCharge(
        apiKey.id,
        apiKey.user.walletAddress,
        firstUrl,
        totalCost
      );
      
      if (blockchainResult.success) {
        logger.info('Blockchain charge validation successful', {
          apiKeyId: apiKey.id,
          totalCost,
          message: blockchainResult.message
        });
      } else {
        logger.warn('Blockchain charge validation failed, falling back to local balance update', {
          error: blockchainResult.error
        });
      }
    }

    // Update user balance (fallback or supplement to blockchain)
    if (totalCost > 0) {
      await updateUserBalance(apiKey.userId, -totalCost);
    }

    // Process ad revenue distribution (simulate ad matching and revenue)
    let adRevenueResult = null;
    if (totalCost > 0 && Object.keys(crawlResults.results).length > 0) {
      try {
        // Simulate ad matching - in a real scenario, this would be from an ad exchange
        const simulatedAdRevenue = totalCost * 2.5; // Simulate 2.5x revenue from ads
        const publisherWallet = await getPublisherWalletForUrl(urls[0]);
        
        if (publisherWallet && apiKey.user.walletAddress) {
          // Ensure publisher is registered in MVP system
          if (blockchainService.isAvailable()) {
            const publisherInfo = await blockchainService.getParticipantInfo(publisherWallet);
            if (!publisherInfo || !publisherInfo.isPublisher) {
              logger.warn('Publisher not registered in MVP system, skipping blockchain operations', {
                publisherWallet
              });
            }
          }

          // Record ad transaction (MVP uses batch processing)
          const adTransactionResult = await adTransactionService.recordAdTransaction({
            publisherAddress: publisherWallet,
            advertiserAddress: '0x8ba1f109551bD432803012645Hac136c54C1e92b', // Mock advertiser
            aiSearcherAddress: apiKey.user.walletAddress,
            campaignId: 1001, // Mock campaign ID
            adAmountUSDC: simulatedAdRevenue,
            adId: `ad_${Date.now()}`,
            creativeUrl: 'https://example.com/ad-creative.jpg',
            landingPageUrl: 'https://example.com/landing',
            targetAudience: 'tech-enthusiasts',
            contentUrl: urls[0],
            transactionType: 'impression'
          });

          if (adTransactionResult.success) {
            // Queue revenue distribution (MVP uses batch processing)
            const revenueDistributionResult = await revenueService.distributeAdRevenue(
              publisherWallet,
              apiKey.user.walletAddress,
              simulatedAdRevenue,
              {
                campaignId: 1001,
                adId: `ad_${Date.now()}`,
                contentUrl: urls[0],
                crawlCost: totalCost
              }
            );

            adRevenueResult = {
              adTransactionId: adTransactionResult.dbRecordId,
              distributionId: revenueDistributionResult.dbRecordId || null,
              totalAdRevenue: simulatedAdRevenue,
              publisherShare: simulatedAdRevenue * 0.70 * 0.98, // After 2% platform fee
              aiSearcherShare: simulatedAdRevenue * 0.30 * 0.98, // After 2% platform fee
              platformFee: simulatedAdRevenue * 0.02,
              blockchain: {
                batchProcessing: true,
                adTransactionQueued: adTransactionResult.success,
                revenueDistributionQueued: revenueDistributionResult.success,
                message: adTransactionResult.message,
                revenueStatus: revenueDistributionResult.status || 'queued'
              }
            };

            logger.info('Ad revenue queued for batch processing', {
              adTransactionId: adTransactionResult.dbRecordId,
              totalRevenue: simulatedAdRevenue,
              publisherWallet,
              aiSearcherWallet: apiKey.user.walletAddress,
              batchProcessing: true
            });
          }
        }
      } catch (adError) {
        logger.error('Ad revenue processing failed:', adError);
        adRevenueResult = {
          error: 'Ad revenue processing failed: ' + adError.message
        };
      }
    }

    logger.info('Crawl request completed', {
      apiKeyId: apiKey.id,
      urlCount: urls.length,
      totalCost,
      successCount: Object.keys(crawlResults.results).length,
      errorCount: Object.keys(crawlResults.errors).length,
      adRevenue: adRevenueResult?.totalAdRevenue || 0
    });

    res.json({
      code: 'SUCCESS',
      message: 'Crawling completed',
      data: crawlResults.results,
      errors: crawlResults.errors,
      billing: {
        totalCost,
        remainingBalance: apiKey.user.balance - totalCost,
        blockchain: blockchainResult ? {
          enabled: blockchainService.isAvailable(),
          success: blockchainResult.success,
          txHash: blockchainResult.txHash || null,
          blockNumber: blockchainResult.blockNumber || null,
          message: blockchainResult.message || null,
          mvpBatchProcessing: true,
          contractAddresses: blockchainService.isAvailable() ? 
            blockchainService.getContractAddresses() : null
        } : {
          enabled: false,
          message: 'Blockchain service not available'
        }
      },
      adRevenue: adRevenueResult
    });

  } catch (error) {
    logger.error('Crawl request failed:', error);
    res.status(500).json({
      code: 'CRAWL_ERROR',
      message: 'Failed to process crawl request'
    });
  }
}

async function saveUsageLogs(logs) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const log of logs) {
      await client.query(
        'INSERT INTO usage_logs (api_key_id, url, format, bytes_processed, cost, status) VALUES ($1, $2, $3, $4, $5, $6)',
        [log.apiKeyId, log.url, log.format, log.bytesProcessed, log.cost, log.status]
      );
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateUserBalance(userId, amount) {
  await pool.query(
    'UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
    [amount, userId]
  );
}

async function getPublisherWalletForUrl(url) {
  try {
    // Extract domain from URL
    const domain = new URL(url).hostname;
    
    // First, try to find a publisher by exact domain match
    const result = await pool.query(
      `SELECT p.wallet_address 
       FROM publishers p 
       JOIN users u ON u.id = p.user_id 
       WHERE p.website = $1 AND p.is_active = true AND u.status = 'active'
       LIMIT 1`,
      [`https://${domain}`]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0].wallet_address;
    }
    
    // If no exact match, return a default test publisher wallet
    // In a real system, this would involve more sophisticated domain matching
    const defaultResult = await pool.query(
      `SELECT wallet_address 
       FROM publishers 
       WHERE is_active = true 
       ORDER BY created_at DESC 
       LIMIT 1`
    );
    
    if (defaultResult.rows.length > 0) {
      return defaultResult.rows[0].wallet_address;
    }
    
    return null;
  } catch (error) {
    logger.error('Failed to get publisher wallet for URL:', error);
    return null;
  }
}

export { crawl };;