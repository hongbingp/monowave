import BillingService from '../services/billing.js';
import BlockchainService from '../services/blockchainService.js';
import { pool } from '../config/database.js';
import logger from '../utils/logger.js';
import Joi from 'joi';

const billingService = new BillingService();
const blockchainService = new BlockchainService();

const paymentSchema = Joi.object({
  txHash: Joi.string().required(),
  billingPeriod: Joi.string().valid('daily', 'weekly', 'monthly').default('monthly'),
  depositToEscrow: Joi.boolean().default(false),
  amount: Joi.number().positive().optional()
});

const escrowDepositSchema = Joi.object({
  amount: Joi.number().positive().required(),
  tokenAddress: Joi.string().optional() // If not provided, uses MockUSDC
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

    const { txHash, billingPeriod, depositToEscrow, amount } = value;
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

    // Use provided amount or extract from blockchain transaction
    const paymentAmount = amount || 10.0; // Fallback for demo purposes

    let escrowResult = null;
    let newBalance = currentBalance + paymentAmount;

    // If depositToEscrow is true and blockchain service is available, deposit to escrow
    if (depositToEscrow && blockchainService.isAvailable() && apiKey.user.walletAddress) {
      try {
        const tokenAddress = blockchainService.getContractAddresses().mockUSDC;
        
        // First, mint test tokens if needed (for testing)
        const mintResult = await blockchainService.mintTestTokens(
          apiKey.user.walletAddress,
          paymentAmount
        );

        if (mintResult.success) {
          // Then deposit to escrow
          escrowResult = await blockchainService.depositToEscrow(
            tokenAddress,
            paymentAmount
          );

          if (escrowResult.success) {
            logger.info('Funds deposited to escrow successfully', {
              userId: apiKey.userId,
              amount: paymentAmount,
              escrowTxHash: escrowResult.txHash,
              mintTxHash: mintResult.txHash
            });
          } else {
            logger.warn('Escrow deposit failed, falling back to database balance update', {
              error: escrowResult.error
            });
          }
        }
      } catch (escrowError) {
        logger.error('Escrow deposit process failed:', escrowError);
        escrowResult = { success: false, error: escrowError.message };
      }
    }

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
        newBalance,
        txHash,
        billingPeriod,
        escrow: escrowResult ? {
          enabled: depositToEscrow,
          success: escrowResult.success,
          txHash: escrowResult.txHash,
          gasUsed: escrowResult.gasUsed,
          error: escrowResult.error || null,
          contractAddress: blockchainService.isAvailable() ? 
            blockchainService.getContractAddresses().escrow : null
        } : {
          enabled: false,
          message: 'Escrow deposit not requested or blockchain service not available'
        }
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

async function depositToEscrow(req, res) {
  try {
    const { error, value } = escrowDepositSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: error.details[0].message
      });
    }

    const { amount, tokenAddress } = value;
    const { apiKey } = req;

    if (!blockchainService.isAvailable()) {
      return res.status(503).json({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Blockchain service not available'
      });
    }

    if (!apiKey.user.walletAddress) {
      return res.status(400).json({
        code: 'WALLET_REQUIRED',
        message: 'User wallet address required for escrow deposits'
      });
    }

    const finalTokenAddress = tokenAddress || blockchainService.getContractAddresses().mockUSDC;

    try {
      // First, mint test tokens (for testing purposes)
      const mintResult = await blockchainService.mintTestTokens(
        apiKey.user.walletAddress,
        amount
      );

      if (!mintResult.success) {
        return res.status(400).json({
          code: 'MINT_FAILED',
          message: 'Failed to mint test tokens: ' + mintResult.error
        });
      }

      // Then deposit to escrow
      const escrowResult = await blockchainService.depositToEscrow(
        finalTokenAddress,
        amount
      );

      if (!escrowResult.success) {
        return res.status(400).json({
          code: 'ESCROW_DEPOSIT_FAILED',
          message: 'Failed to deposit to escrow: ' + escrowResult.error
        });
      }

      // Get updated escrow balance
      const newEscrowBalance = await blockchainService.getEscrowBalance(
        apiKey.user.walletAddress,
        finalTokenAddress
      );

      logger.info('Escrow deposit successful', {
        userId: apiKey.userId,
        walletAddress: apiKey.user.walletAddress,
        amount,
        tokenAddress: finalTokenAddress,
        escrowTxHash: escrowResult.txHash,
        mintTxHash: mintResult.txHash
      });

      res.json({
        code: 'SUCCESS',
        message: 'Funds deposited to escrow successfully',
        data: {
          amount,
          tokenAddress: finalTokenAddress,
          escrowBalance: newEscrowBalance,
          transactions: {
            mint: {
              txHash: mintResult.txHash,
              amount: mintResult.amount
            },
            escrowDeposit: {
              txHash: escrowResult.txHash,
              gasUsed: escrowResult.gasUsed
            }
          },
          contractAddresses: blockchainService.getContractAddresses()
        }
      });

    } catch (error) {
      logger.error('Escrow deposit failed:', error);
      res.status(500).json({
        code: 'ESCROW_ERROR',
        message: 'Failed to process escrow deposit: ' + error.message
      });
    }

  } catch (error) {
    logger.error('Escrow deposit request failed:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to process escrow deposit request'
    });
  }
}

async function getEscrowBalance(req, res) {
  try {
    const { apiKey } = req;
    const { tokenAddress } = req.query;

    if (!blockchainService.isAvailable()) {
      return res.status(503).json({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Blockchain service not available'
      });
    }

    if (!apiKey.user.walletAddress) {
      return res.status(400).json({
        code: 'WALLET_REQUIRED',
        message: 'User wallet address required'
      });
    }

    const finalTokenAddress = tokenAddress || blockchainService.getContractAddresses().mockUSDC;
    
    const escrowBalance = await blockchainService.getEscrowBalance(
      apiKey.user.walletAddress,
      finalTokenAddress
    );

    const tokenBalance = await blockchainService.getTokenBalance(
      apiKey.user.walletAddress,
      finalTokenAddress
    );

    res.json({
      code: 'SUCCESS',
      data: {
        walletAddress: apiKey.user.walletAddress,
        tokenAddress: finalTokenAddress,
        escrowBalance: escrowBalance || 0,
        tokenBalance: tokenBalance || 0,
        databaseBalance: apiKey.user.balance,
        contractAddresses: blockchainService.getContractAddresses()
      }
    });

  } catch (error) {
    logger.error('Get escrow balance failed:', error);
    res.status(500).json({
      code: 'BALANCE_ERROR',
      message: 'Failed to retrieve escrow balance'
    });
  }
}

export { processPayment, getPaymentHistory, depositToEscrow, getEscrowBalance };;