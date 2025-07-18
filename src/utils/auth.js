const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

class AuthService {
  static generateApiKey() {
    const prefix = process.env.API_KEY_PREFIX || 'ac_';
    const randomBytes = crypto.randomBytes(24).toString('hex');
    return `${prefix}${randomBytes}`;
  }

  static async hashApiKey(apiKey) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(apiKey, salt);
  }

  static async verifyApiKey(apiKey, hash) {
    return bcrypt.compare(apiKey, hash);
  }

  static async createApiKey(userId, planId, name = null, expiresAt = null) {
    const apiKey = this.generateApiKey();
    const keyHash = await this.hashApiKey(apiKey);
    
    const query = `
      INSERT INTO api_keys (key_hash, user_id, plan_id, name, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    
    const result = await pool.query(query, [keyHash, userId, planId, name, expiresAt]);
    
    return {
      id: result.rows[0].id,
      apiKey,
      keyHash
    };
  }

  static async validateApiKey(apiKey) {
    const query = `
      SELECT ak.id, ak.key_hash, ak.user_id, ak.plan_id, ak.status, ak.expires_at,
             p.qps, p.daily_limit, p.monthly_limit, p.price_per_call, p.price_per_byte,
             u.balance, u.wallet_address
      FROM api_keys ak
      JOIN plans p ON ak.plan_id = p.id
      JOIN users u ON ak.user_id = u.id
      WHERE ak.status = 'active'
        AND (ak.expires_at IS NULL OR ak.expires_at > NOW())
    `;
    
    const result = await pool.query(query);
    
    for (const row of result.rows) {
      const isValid = await this.verifyApiKey(apiKey, row.key_hash);
      if (isValid) {
        return {
          id: row.id,
          userId: row.user_id,
          planId: row.plan_id,
          limits: {
            qps: row.qps,
            dailyLimit: row.daily_limit,
            monthlyLimit: row.monthly_limit,
            pricePerCall: row.price_per_call,
            pricePerByte: row.price_per_byte
          },
          user: {
            balance: row.balance,
            walletAddress: row.wallet_address
          }
        };
      }
    }
    
    return null;
  }

  static async deactivateApiKey(keyId) {
    const query = 'UPDATE api_keys SET status = $1, updated_at = NOW() WHERE id = $2';
    await pool.query(query, ['inactive', keyId]);
  }

  static generateJWT(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
  }

  static verifyJWT(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }
}

module.exports = AuthService;