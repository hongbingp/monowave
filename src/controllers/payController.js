const BillingService = require('../services/billing');
const { pool } = require('../config/database');
const logger = require('../utils/logger');
const Joi = require('joi');

const billingService = new BillingService();

const paymentSchema = Joi.object({
  txHash: Joi.string().required(),
  billingPeriod: Joi.string().valid('daily', 'weekly', 'monthly').default('monthly')
});

async function processPayment(req, res) {
  try {
    const { error, value } = paymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: error.details[0].message
      });
    }

    const { txHash, billingPeriod } = value;
    const { apiKey } = req;

    // Check if transaction hash already exists
    const existingRecord = await pool.query(
      'SELECT id FROM billing_records WHERE tx_hash = $1',
      [txHash]
    );

    if (existingRecord.rows.length > 0) {
      return res.status(400).json({
        code: 'DUPLICATE_TRANSACTION',
        message: 'Transaction hash already processed'
      });
    }

    // Get user's current balance and create billing record
    const userResult = await pool.query(
      'SELECT balance FROM users WHERE id = $1',
      [apiKey.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    const currentBalance = parseFloat(userResult.rows[0].balance);

    // For demo purposes, we'll assume the payment amount is extracted from the transaction
    // In a real implementation, you would query the blockchain to get the actual payment amount
    const paymentAmount = 10.0; // This should be extracted from the blockchain transaction

    // Create billing record
    const billingId = await billingService.recordBilling(apiKey.userId, paymentAmount, billingPeriod);

    // Process the payment
    await billingService.processPayment(billingId, txHash);

    logger.info('Payment processed successfully', {
      userId: apiKey.userId,
      amount: paymentAmount,
      txHash,
      billingPeriod,
      billingId
    });

    res.json({
      code: 'SUCCESS',
      message: 'Payment processed successfully',
      data: {
        billingId,
        amount: paymentAmount,
        newBalance: currentBalance + paymentAmount,
        txHash,
        billingPeriod
      }
    });

  } catch (error) {
    logger.error('Payment processing failed:', error);
    res.status(500).json({
      code: 'PAYMENT_ERROR',
      message: 'Failed to process payment'
    });
  }
}

async function getPaymentHistory(req, res) {
  try {
    const { period, limit = 50, offset = 0 } = req.query;
    const { apiKey } = req;

    let whereClause = 'WHERE user_id = $1';
    let queryParams = [apiKey.userId];
    let paramIndex = 2;

    if (period) {
      whereClause += ` AND billing_period = $${paramIndex}`;
      queryParams.push(period);
      paramIndex++;
    }

    queryParams.push(limit, offset);

    const query = `
      SELECT 
        id,
        tx_hash,
        amount,
        status,
        billing_period,
        created_at,
        updated_at
      FROM billing_records
      ${whereClause}
      ORDER BY created_at DESC
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
    logger.error('Get payment history failed:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve payment history'
    });
  }
}

module.exports = {
  processPayment,
  getPaymentHistory
};