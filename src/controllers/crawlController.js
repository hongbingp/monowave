const CrawlerService = require('../services/crawler');
const BlockchainService = require('../services/blockchainService');
const { pool } = require('../config/database');
const logger = require('../utils/logger');
const Joi = require('joi');

const crawlerService = new CrawlerService();
const blockchainService = new BlockchainService();

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

    // Check if user has sufficient balance
    if (apiKey.user.balance <= 0) {
      return res.status(402).json({
        code: 'INSUFFICIENT_BALANCE',
        message: 'Insufficient balance to perform crawling'
      });
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

    // Process blockchain charge if available
    let blockchainResult = null;
    if (totalCost > 0 && blockchainService.isAvailable()) {
      // Use the first URL as representative for the charge
      const firstUrl = urls[0];
      blockchainResult = await blockchainService.processCrawlCharge(
        apiKey.id,
        apiKey.user.walletAddress,
        firstUrl,
        totalCost
      );
      
      if (blockchainResult.success) {
        logger.info('Blockchain charge processed successfully', {
          apiKeyId: apiKey.id,
          totalCost,
          txHash: blockchainResult.txHash
        });
      } else {
        logger.warn('Blockchain charge failed, falling back to local balance update', {
          error: blockchainResult.error
        });
      }
    }

    // Update user balance (fallback or supplement to blockchain)
    if (totalCost > 0) {
      await updateUserBalance(apiKey.userId, -totalCost);
    }

    logger.info('Crawl request completed', {
      apiKeyId: apiKey.id,
      urlCount: urls.length,
      totalCost,
      successCount: Object.keys(crawlResults.results).length,
      errorCount: Object.keys(crawlResults.errors).length
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
          txHash: blockchainResult.txHash,
          blockNumber: blockchainResult.blockNumber
        } : {
          enabled: false,
          message: 'Blockchain service not available'
        }
      }
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

module.exports = { crawl };