const Web3 = require('web3');
const { pool } = require('../config/database');
const logger = require('../utils/logger');

class BillingService {
  constructor() {
    this.web3 = new Web3(process.env.WEB3_PROVIDER_URL);
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    this.privateKey = process.env.PRIVATE_KEY;
    this.account = this.web3.eth.accounts.privateKeyToAccount(this.privateKey);
    this.web3.eth.accounts.wallet.add(this.account);
  }

  async recordBilling(userId, amount, billingPeriod = 'monthly') {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO billing_records (user_id, amount, billing_period, status) VALUES ($1, $2, $3, $4) RETURNING id',
        [userId, amount, billingPeriod, 'pending']
      );
      
      return result.rows[0].id;
    } catch (error) {
      logger.error('Failed to record billing:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async processPayment(billingId, txHash) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Update billing record
      await client.query(
        'UPDATE billing_records SET tx_hash = $1, status = $2, updated_at = NOW() WHERE id = $3',
        [txHash, 'paid', billingId]
      );
      
      // Get billing details
      const billingResult = await client.query(
        'SELECT user_id, amount FROM billing_records WHERE id = $1',
        [billingId]
      );
      
      if (billingResult.rows.length === 0) {
        throw new Error('Billing record not found');
      }
      
      const { user_id, amount } = billingResult.rows[0];
      
      // Update user balance
      await client.query(
        'UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
        [amount, user_id]
      );
      
      await client.query('COMMIT');
      
      logger.info('Payment processed successfully', {
        billingId,
        userId: user_id,
        amount,
        txHash
      });
      
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Payment processing failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async chargeUser(apiKeyId, amount) {
    try {
      // This would typically call a smart contract function
      // For now, we'll simulate the blockchain interaction
      const gasPrice = await this.web3.eth.getGasPrice();
      const nonce = await this.web3.eth.getTransactionCount(this.account.address);
      
      // Simulate contract call
      const simulatedTx = {
        from: this.account.address,
        to: this.contractAddress,
        value: this.web3.utils.toWei(amount.toString(), 'ether'),
        gas: 100000,
        gasPrice: gasPrice,
        nonce: nonce,
        data: this.web3.eth.abi.encodeFunctionCall({
          name: 'charge',
          type: 'function',
          inputs: [{
            type: 'uint256',
            name: 'apiKeyId'
          }, {
            type: 'uint256',
            name: 'amount'
          }]
        }, [apiKeyId, this.web3.utils.toWei(amount.toString(), 'ether')])
      };
      
      logger.info('Blockchain charge simulated', {
        apiKeyId,
        amount,
        txHash: 'simulated_tx_hash'
      });
      
      return 'simulated_tx_hash';
    } catch (error) {
      logger.error('Blockchain charge failed:', error);
      throw error;
    }
  }

  async distributeRevenue(publishers, amounts) {
    try {
      // This would batch distribute revenue to publishers via smart contract
      const gasPrice = await this.web3.eth.getGasPrice();
      const nonce = await this.web3.eth.getTransactionCount(this.account.address);
      
      // Simulate batch distribution
      const simulatedTx = {
        from: this.account.address,
        to: this.contractAddress,
        value: '0',
        gas: 200000,
        gasPrice: gasPrice,
        nonce: nonce,
        data: this.web3.eth.abi.encodeFunctionCall({
          name: 'distribute',
          type: 'function',
          inputs: [{
            type: 'address[]',
            name: 'publishers'
          }, {
            type: 'uint256[]',
            name: 'amounts'
          }]
        }, [publishers, amounts.map(amount => this.web3.utils.toWei(amount.toString(), 'ether'))])
      };
      
      logger.info('Revenue distribution simulated', {
        publisherCount: publishers.length,
        totalAmount: amounts.reduce((sum, amount) => sum + amount, 0),
        txHash: 'simulated_distribution_tx'
      });
      
      return 'simulated_distribution_tx';
    } catch (error) {
      logger.error('Revenue distribution failed:', error);
      throw error;
    }
  }

  async getUsageStatistics(apiKeyId, period = 'monthly') {
    const client = await pool.connect();
    try {
      let dateCondition = '';
      switch (period) {
        case 'daily':
          dateCondition = "AND created_at >= NOW() - INTERVAL '1 day'";
          break;
        case 'weekly':
          dateCondition = "AND created_at >= NOW() - INTERVAL '7 days'";
          break;
        case 'monthly':
          dateCondition = "AND created_at >= NOW() - INTERVAL '30 days'";
          break;
        default:
          dateCondition = '';
      }
      
      const result = await client.query(`
        SELECT 
          COUNT(*) as total_calls,
          SUM(bytes_processed) as total_bytes,
          SUM(cost) as total_cost,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_calls,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_calls
        FROM usage_logs 
        WHERE api_key_id = $1 ${dateCondition}
      `, [apiKeyId]);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get usage statistics:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = BillingService;