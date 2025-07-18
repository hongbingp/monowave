const { pool } = require('../config/database');
const BillingService = require('../services/billing');
const AuthService = require('../utils/auth');
const logger = require('../utils/logger');
const Joi = require('joi');

const billingService = new BillingService();

const planSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  qps: Joi.number().integer().min(1).default(100),
  dailyLimit: Joi.number().integer().min(1).default(10000),
  monthlyLimit: Joi.number().integer().min(1).default(300000),
  pricePerCall: Joi.number().min(0).default(0.001),
  pricePerByte: Joi.number().min(0).default(0.0001)
});

async function getUsage(req, res) {
  try {
    const { apikey, period = 'monthly' } = req.query;
    
    if (!apikey) {
      return res.status(400).json({
        code: 'MISSING_PARAMETER',
        message: 'API key parameter is required'
      });
    }

    // Validate API key and get key info
    const keyData = await AuthService.validateApiKey(apikey);
    if (!keyData) {
      return res.status(404).json({
        code: 'API_KEY_NOT_FOUND',
        message: 'API key not found'
      });
    }

    // Get usage statistics
    const stats = await billingService.getUsageStatistics(keyData.id, period);
    
    res.json({
      code: 'SUCCESS',
      data: {
        apiKeyId: keyData.id,
        period,
        totalCalls: parseInt(stats.total_calls) || 0,
        totalBytes: parseInt(stats.total_bytes) || 0,
        totalCost: parseFloat(stats.total_cost) || 0,
        successfulCalls: parseInt(stats.successful_calls) || 0,
        failedCalls: parseInt(stats.failed_calls) || 0,
        successRate: parseInt(stats.total_calls) > 0 
          ? (parseInt(stats.successful_calls) / parseInt(stats.total_calls) * 100).toFixed(2)
          : 0
      }
    });
  } catch (error) {
    logger.error('Get usage failed:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve usage statistics'
    });
  }
}

async function getBilling(req, res) {
  try {
    const { status, userId, limit = 50, offset = 0 } = req.query;
    
    let whereClause = '';
    let queryParams = [];
    let paramIndex = 1;
    
    if (status) {
      whereClause += `WHERE status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    if (userId) {
      whereClause += (whereClause ? ' AND ' : 'WHERE ') + `user_id = $${paramIndex}`;
      queryParams.push(userId);
      paramIndex++;
    }
    
    queryParams.push(limit, offset);
    
    const query = `
      SELECT 
        br.id,
        br.user_id,
        br.tx_hash,
        br.amount,
        br.status,
        br.billing_period,
        br.created_at,
        br.updated_at,
        u.email,
        u.wallet_address
      FROM billing_records br
      JOIN users u ON br.user_id = u.id
      ${whereClause}
      ORDER BY br.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const result = await pool.query(query, queryParams);
    
    res.json({
      code: 'SUCCESS',
      data: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.rowCount
      }
    });
  } catch (error) {
    logger.error('Get billing failed:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve billing records'
    });
  }
}

async function createPlan(req, res) {
  try {
    const { error, value } = planSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: error.details[0].message
      });
    }

    const { name, qps, dailyLimit, monthlyLimit, pricePerCall, pricePerByte } = value;
    
    const result = await pool.query(
      'INSERT INTO plans (name, qps, daily_limit, monthly_limit, price_per_call, price_per_byte) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [name, qps, dailyLimit, monthlyLimit, pricePerCall, pricePerByte]
    );
    
    logger.info('Plan created successfully', {
      planId: result.rows[0].id,
      name,
      qps,
      dailyLimit,
      monthlyLimit
    });
    
    res.status(201).json({
      code: 'SUCCESS',
      message: 'Plan created successfully',
      data: {
        planId: result.rows[0].id,
        name,
        qps,
        dailyLimit,
        monthlyLimit,
        pricePerCall,
        pricePerByte
      }
    });
  } catch (error) {
    logger.error('Create plan failed:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to create plan'
    });
  }
}

async function createApiKey(req, res) {
  try {
    const { userId, planId, name, expiresAt } = req.body;
    
    if (!userId || !planId) {
      return res.status(400).json({
        code: 'MISSING_PARAMETERS',
        message: 'userId and planId are required'
      });
    }
    
    // Verify user and plan exist
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }
    
    const planResult = await pool.query('SELECT id FROM plans WHERE id = $1', [planId]);
    if (planResult.rows.length === 0) {
      return res.status(404).json({
        code: 'PLAN_NOT_FOUND',
        message: 'Plan not found'
      });
    }
    
    const keyData = await AuthService.createApiKey(userId, planId, name, expiresAt);
    
    logger.info('API key created successfully', {
      keyId: keyData.id,
      userId,
      planId,
      name
    });
    
    res.status(201).json({
      code: 'SUCCESS',
      message: 'API key created successfully',
      data: {
        keyId: keyData.id,
        apiKey: keyData.apiKey,
        userId,
        planId,
        name,
        expiresAt
      }
    });
  } catch (error) {
    logger.error('Create API key failed:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to create API key'
    });
  }
}

async function deactivateApiKey(req, res) {
  try {
    const { keyId } = req.params;
    
    if (!keyId) {
      return res.status(400).json({
        code: 'MISSING_PARAMETER',
        message: 'Key ID is required'
      });
    }
    
    await AuthService.deactivateApiKey(keyId);
    
    logger.info('API key deactivated successfully', { keyId });
    
    res.json({
      code: 'SUCCESS',
      message: 'API key deactivated successfully'
    });
  } catch (error) {
    logger.error('Deactivate API key failed:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to deactivate API key'
    });
  }
}

async function getApiKeys(req, res) {
  try {
    const { userId, status, limit = 50, offset = 0 } = req.query;
    
    let whereClause = '';
    let queryParams = [];
    let paramIndex = 1;
    
    if (userId) {
      whereClause += `WHERE ak.user_id = $${paramIndex}`;
      queryParams.push(userId);
      paramIndex++;
    }
    
    if (status) {
      whereClause += (whereClause ? ' AND ' : 'WHERE ') + `ak.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    queryParams.push(limit, offset);
    
    const query = `
      SELECT 
        ak.id,
        ak.user_id,
        ak.plan_id,
        ak.name,
        ak.status,
        ak.expires_at,
        ak.created_at,
        ak.updated_at,
        u.email,
        p.name as plan_name
      FROM api_keys ak
      JOIN users u ON ak.user_id = u.id
      JOIN plans p ON ak.plan_id = p.id
      ${whereClause}
      ORDER BY ak.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const result = await pool.query(query, queryParams);
    
    res.json({
      code: 'SUCCESS',
      data: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.rowCount
      }
    });
  } catch (error) {
    logger.error('Get API keys failed:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve API keys'
    });
  }
}

module.exports = {
  getUsage,
  getBilling,
  createPlan,
  createApiKey,
  deactivateApiKey,
  getApiKeys
};