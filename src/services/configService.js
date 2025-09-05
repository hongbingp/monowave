import { pool } from '../config/database.js';
import logger from '../utils/logger.js';

class ConfigService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.lastCacheUpdate = 0;
  }

  async get(key, defaultValue = null) {
    try {
      // Check cache first
      if (this.isCacheValid() && this.cache.has(key)) {
        return this.cache.get(key);
      }

      // Refresh cache if needed
      if (!this.isCacheValid()) {
        await this.refreshCache();
      }

      // Return from cache or default
      return this.cache.get(key) || defaultValue;

    } catch (error) {
      logger.error('Failed to get configuration:', { key, error: error.message });
      return defaultValue;
    }
  }

  async set(key, value, description = null, category = 'general') {
    const client = await pool.connect();
    try {
      // Determine value type
      const valueType = this.getValueType(value);
      const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);

      await client.query(`
        INSERT INTO mvp_configuration (key, value, value_type, description, category)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          value_type = EXCLUDED.value_type,
          description = COALESCE(EXCLUDED.description, mvp_configuration.description),
          category = EXCLUDED.category,
          updated_at = NOW()
      `, [key, valueStr, valueType, description, category]);

      // Update cache
      this.cache.set(key, this.parseValue(valueStr, valueType));

      logger.info('Configuration updated', { key, value, category });

    } catch (error) {
      logger.error('Failed to set configuration:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getAll(category = null) {
    const client = await pool.connect();
    try {
      let query = 'SELECT * FROM mvp_configuration WHERE is_active = true';
      const params = [];

      if (category) {
        query += ' AND category = $1';
        params.push(category);
      }

      query += ' ORDER BY category, key';

      const result = await client.query(query, params);
      const configs = {};

      for (const row of result.rows) {
        configs[row.key] = {
          value: this.parseValue(row.value, row.value_type),
          type: row.value_type,
          description: row.description,
          category: row.category,
          updatedAt: row.updated_at
        };
      }

      return configs;

    } catch (error) {
      logger.error('Failed to get all configurations:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async refreshCache() {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT key, value, value_type 
        FROM mvp_configuration 
        WHERE is_active = true
      `);

      this.cache.clear();
      for (const row of result.rows) {
        this.cache.set(row.key, this.parseValue(row.value, row.value_type));
      }

      this.lastCacheUpdate = Date.now();

    } catch (error) {
      logger.error('Failed to refresh configuration cache:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  isCacheValid() {
    return Date.now() - this.lastCacheUpdate < this.cacheExpiry;
  }

  getValueType(value) {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'object') return 'json';
    return 'string';
  }

  parseValue(value, type) {
    switch (type) {
      case 'boolean':
        return value === 'true' || value === true;
      case 'number':
        return parseFloat(value);
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  // Convenience methods for common configurations
  async getBatchSize() {
    return await this.get('batch_size', 100);
  }

  async getBatchTimeout() {
    return await this.get('batch_timeout_ms', 30000);
  }

  async getRevenueBatchSize() {
    return await this.get('revenue_batch_size', 50);
  }

  async getDisputeWindow() {
    return await this.get('dispute_window_seconds', 86400);
  }

  async getPlatformFeeBps() {
    return await this.get('platform_fee_bps', 200);
  }

  async getPublisherShareBps() {
    return await this.get('publisher_share_bps', 7000);
  }

  async getAiSearcherShareBps() {
    return await this.get('ai_searcher_share_bps', 3000);
  }

  async shouldAutoRegisterParticipants() {
    return await this.get('auto_register_participants', true);
  }

  async shouldSyncBlockchainData() {
    return await this.get('sync_blockchain_data', true);
  }

  async getSyncInterval() {
    return await this.get('sync_interval_minutes', 5);
  }

  // Calculate revenue shares based on configuration
  async calculateRevenueShares(totalAmount) {
    const platformFeeBps = await this.getPlatformFeeBps();
    const publisherShareBps = await this.getPublisherShareBps();
    const aiSearcherShareBps = await this.getAiSearcherShareBps();

    const platformFee = totalAmount * (platformFeeBps / 10000);
    const remainingAmount = totalAmount - platformFee;
    const publisherShare = remainingAmount * (publisherShareBps / 10000);
    const aiSearcherShare = remainingAmount * (aiSearcherShareBps / 10000);

    return {
      platformFee,
      publisherShare,
      aiSearcherShare,
      remainingAmount,
      totalAmount
    };
  }

  // Update batch configuration
  async updateBatchConfig(config) {
    const updates = [];
    
    if (config.batchSize !== undefined) {
      updates.push(this.set('batch_size', config.batchSize, 'Ad transaction batch size', 'batching'));
    }
    
    if (config.batchTimeout !== undefined) {
      updates.push(this.set('batch_timeout_ms', config.batchTimeout, 'Batch timeout in milliseconds', 'batching'));
    }
    
    if (config.revenueBatchSize !== undefined) {
      updates.push(this.set('revenue_batch_size', config.revenueBatchSize, 'Revenue distribution batch size', 'batching'));
    }

    await Promise.all(updates);
    await this.refreshCache();
  }

  // Update revenue configuration
  async updateRevenueConfig(config) {
    const updates = [];
    
    if (config.disputeWindow !== undefined) {
      updates.push(this.set('dispute_window_seconds', config.disputeWindow, 'Dispute window in seconds', 'revenue'));
    }
    
    if (config.platformFeeBps !== undefined) {
      updates.push(this.set('platform_fee_bps', config.platformFeeBps, 'Platform fee in basis points', 'revenue'));
    }
    
    if (config.publisherShareBps !== undefined) {
      updates.push(this.set('publisher_share_bps', config.publisherShareBps, 'Publisher share in basis points', 'revenue'));
    }
    
    if (config.aiSearcherShareBps !== undefined) {
      updates.push(this.set('ai_searcher_share_bps', config.aiSearcherShareBps, 'AI searcher share in basis points', 'revenue'));
    }

    await Promise.all(updates);
    await this.refreshCache();
  }

  // Get configuration summary for API responses
  async getConfigSummary() {
    return {
      batching: {
        batchSize: await this.getBatchSize(),
        batchTimeout: await this.getBatchTimeout(),
        revenueBatchSize: await this.getRevenueBatchSize()
      },
      revenue: {
        disputeWindow: await this.getDisputeWindow(),
        platformFeeBps: await this.getPlatformFeeBps(),
        publisherShareBps: await this.getPublisherShareBps(),
        aiSearcherShareBps: await this.getAiSearcherShareBps()
      },
      participants: {
        autoRegister: await this.shouldAutoRegisterParticipants()
      },
      sync: {
        enabled: await this.shouldSyncBlockchainData(),
        intervalMinutes: await this.getSyncInterval()
      }
    };
  }
}

// Singleton instance
const configService = new ConfigService();

export default configService;
