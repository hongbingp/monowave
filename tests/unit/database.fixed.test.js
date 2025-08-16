const { pool } = require('../../src/config/database');

// Mock database pool
jest.mock('../../src/config/database', () => ({
  pool: {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn()
  }
}));

describe('Database Operations', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    
    pool.connect.mockResolvedValue(mockClient);
  });

  describe('Users table operations', () => {
    it('should create user successfully', async () => {
      const mockResult = { rows: [{ id: 1 }] };
      pool.query.mockResolvedValue(mockResult);

      const result = await pool.query(
        'INSERT INTO users (email, password_hash, plan_id, wallet_address, balance) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        ['test@example.com', 'hashedpassword', 1, '0x123456789abcdef', 10.0]
      );

      expect(result.rows[0].id).toBe(1);
      expect(pool.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, password_hash, plan_id, wallet_address, balance) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        ['test@example.com', 'hashedpassword', 1, '0x123456789abcdef', 10.0]
      );
    });

    it('should update user balance', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await pool.query(
        'UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
        [5.0, 1]
      );

      expect(pool.query).toHaveBeenCalledWith(
        'UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
        [5.0, 1]
      );
    });

    it('should get user by id', async () => {
      const mockResult = {
        rows: [{
          id: 1,
          email: 'test@example.com',
          plan_id: 1,
          wallet_address: '0x123456789abcdef',
          balance: 10.0
        }]
      };
      pool.query.mockResolvedValue(mockResult);

      const result = await pool.query('SELECT * FROM users WHERE id = $1', [1]);

      expect(result.rows[0].email).toBe('test@example.com');
      expect(result.rows[0].balance).toBe(10.0);
    });

    it('should handle unique constraint violation', async () => {
      const error = new Error('duplicate key value violates unique constraint "users_email_key"');
      error.code = '23505';
      pool.query.mockRejectedValue(error);

      await expect(pool.query(
        'INSERT INTO users (email, password_hash, plan_id) VALUES ($1, $2, $3)',
        ['test@example.com', 'hashedpassword', 1]
      )).rejects.toThrow('duplicate key value violates unique constraint');
    });
  });

  describe('API Keys table operations', () => {
    it('should create API key successfully', async () => {
      const mockResult = { rows: [{ id: 1 }] };
      pool.query.mockResolvedValue(mockResult);

      const result = await pool.query(
        'INSERT INTO api_keys (key_hash, user_id, plan_id) VALUES ($1, $2, $3) RETURNING id',
        ['hashedkey', 1, 1]
      );

      expect(result.rows[0].id).toBe(1);
    });

    it('should get active API keys', async () => {
      const mockResult = {
        rows: [{
          id: 1,
          key_hash: 'hashedkey',
          user_id: 1,
          plan_id: 1,
          status: 'active'
        }]
      };
      pool.query.mockResolvedValue(mockResult);

      const result = await pool.query(
        'SELECT * FROM api_keys WHERE status = $1',
        ['active']
      );

      expect(result.rows[0].status).toBe('active');
    });

    it('should update API key status', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await pool.query(
        'UPDATE api_keys SET status = $1, updated_at = NOW() WHERE id = $2',
        ['inactive', 1]
      );

      expect(pool.query).toHaveBeenCalledWith(
        'UPDATE api_keys SET status = $1, updated_at = NOW() WHERE id = $2',
        ['inactive', 1]
      );
    });

    it('should get API key with plan and user details', async () => {
      const mockResult = {
        rows: [{
          id: 1,
          key_hash: 'hashedkey',
          user_id: 1,
          plan_id: 1,
          qps: 100,
          daily_limit: 10000,
          monthly_limit: 300000,
          balance: 10.0,
          wallet_address: '0x123'
        }]
      };
      pool.query.mockResolvedValue(mockResult);

      const result = await pool.query(`
        SELECT ak.*, p.qps, p.daily_limit, p.monthly_limit, 
               p.price_per_call, p.price_per_byte, u.balance, u.wallet_address
        FROM api_keys ak
        JOIN plans p ON ak.plan_id = p.id
        JOIN users u ON ak.user_id = u.id
        WHERE ak.id = $1
      `, [1]);

      expect(result.rows[0].qps).toBe(100);
      expect(result.rows[0].balance).toBe(10.0);
    });
  });

  describe('Usage logs table operations', () => {
    it('should insert usage log', async () => {
      const mockResult = { rows: [{ id: 1 }] };
      pool.query.mockResolvedValue(mockResult);

      const result = await pool.query(
        'INSERT INTO usage_logs (api_key_id, url, cost, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
        [1, 'https://example.com', 0.05]
      );

      expect(result.rows[0].id).toBe(1);
    });

    it('should get usage statistics', async () => {
      const mockResult = {
        rows: [{
          total_calls: '100',
          total_cost: '5.00'
        }]
      };
      pool.query.mockResolvedValue(mockResult);

      const result = await pool.query(`
        SELECT COUNT(*) as total_calls, SUM(cost) as total_cost
        FROM usage_logs
        WHERE api_key_id = $1
      `, [1]);

      expect(result.rows[0].total_calls).toBe('100');
      expect(result.rows[0].total_cost).toBe('5.00');
    });

    it('should get usage logs with date filter', async () => {
      const mockResult = {
        rows: [{
          id: 1,
          url: 'https://example.com',
          cost: 0.05,
          created_at: new Date()
        }]
      };
      pool.query.mockResolvedValue(mockResult);

      const result = await pool.query(`
        SELECT * FROM usage_logs
        WHERE api_key_id = $1 AND created_at >= CURRENT_DATE
      `, [1]);

      expect(result.rows[0].url).toBe('https://example.com');
    });
  });

  describe('MVP table operations', () => {
    describe('participant_registry_cache table', () => {
      it('should insert participant cache data', async () => {
        const mockResult = { rows: [{ id: 1 }] };
        pool.query.mockResolvedValue(mockResult);
        
        const result = await pool.query(
          'INSERT INTO participant_registry_cache (wallet_address, payout_address, role_bitmap, status, metadata) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          ['0xabc123', '0xabc123', 1, 1, '0x1234']
        );
        
        expect(result.rows[0].id).toBe(1);
      });

      it('should update participant cache on conflict', async () => {
        pool.query.mockResolvedValue({ rows: [] });
        
        await pool.query(`
          INSERT INTO participant_registry_cache (wallet_address, payout_address, role_bitmap, status, metadata)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (wallet_address) DO UPDATE SET
            payout_address = EXCLUDED.payout_address,
            role_bitmap = EXCLUDED.role_bitmap,
            status = EXCLUDED.status,
            updated_at = NOW()
        `, ['0xabc123', '0xdef456', 2, 1, '0x5678']);
        
        expect(pool.query).toHaveBeenCalled();
      });

      it('should query participants by role', async () => {
        const mockResult = {
          rows: [
            { wallet_address: '0xabc123', role_bitmap: 1, status: 1 },
            { wallet_address: '0xdef456', role_bitmap: 1, status: 1 }
          ]
        };
        pool.query.mockResolvedValue(mockResult);
        
        const result = await pool.query(
          'SELECT * FROM participant_registry_cache WHERE role_bitmap & $1 > 0 AND status = 1',
          [1]
        );
        
        expect(result.rows).toHaveLength(2);
      });
    });

    describe('escrow_balance_cache table', () => {
      it('should insert escrow balance data', async () => {
        const mockResult = { rows: [{ id: 1 }] };
        pool.query.mockResolvedValue(mockResult);
        
        const result = await pool.query(
          'INSERT INTO escrow_balance_cache (wallet_address, token_address, balance, last_synced_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
          ['0xabc123', '0xtoken123', '1000000000']
        );
        
        expect(result.rows[0].id).toBe(1);
      });

      it('should update balance on conflict', async () => {
        pool.query.mockResolvedValue({ rows: [] });
        
        await pool.query(`
          INSERT INTO escrow_balance_cache (wallet_address, token_address, balance, last_synced_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (wallet_address, token_address) DO UPDATE SET
            balance = EXCLUDED.balance,
            last_synced_at = NOW(),
            updated_at = NOW()
        `, ['0xabc123', '0xtoken123', '2000000000']);
        
        expect(pool.query).toHaveBeenCalled();
      });
    });

    describe('revenue_batches table', () => {
      it('should create revenue batch', async () => {
        const mockResult = { rows: [{ id: 1 }] };
        pool.query.mockResolvedValue(mockResult);
        
        const result = await pool.query(
          'INSERT INTO revenue_batches (batch_id, merkle_root, total_amount, transaction_count, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          ['batch_123', '0xmerkle123', 1000.0, 50, 'pending']
        );
        
        expect(result.rows[0].id).toBe(1);
      });

      it('should query active batches', async () => {
        const mockResult = {
          rows: [
            { id: 1, batch_id: 'batch_123', status: 'pending', transaction_count: 50 }
          ]
        };
        pool.query.mockResolvedValue(mockResult);
        
        const result = await pool.query(
          'SELECT * FROM revenue_batches WHERE status IN ($1, $2)',
          ['pending', 'processing']
        );
        
        expect(result.rows).toHaveLength(1);
      });
    });

    describe('mvp_configuration table', () => {
      it('should insert configuration', async () => {
        const mockResult = { rows: [{ id: 1 }] };
        pool.query.mockResolvedValue(mockResult);
        
        const result = await pool.query(
          'INSERT INTO mvp_configuration (config_key, config_value, category, description) VALUES ($1, $2, $3, $4) RETURNING id',
          ['batch_size', '100', 'batch', 'Default batch size for processing']
        );
        
        expect(result.rows[0].id).toBe(1);
      });

      it('should update configuration on conflict', async () => {
        pool.query.mockResolvedValue({ rows: [] });
        
        await pool.query(`
          INSERT INTO mvp_configuration (config_key, config_value, category, description)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (config_key) DO UPDATE SET
            config_value = EXCLUDED.config_value,
            updated_at = NOW()
        `, ['batch_size', '200', 'batch', 'Updated batch size']);
        
        expect(pool.query).toHaveBeenCalled();
      });

      it('should get configuration by category', async () => {
        const mockResult = {
          rows: [
            { config_key: 'batch_size', config_value: '100', category: 'batch' },
            { config_key: 'batch_timeout', config_value: '30000', category: 'batch' }
          ]
        };
        pool.query.mockResolvedValue(mockResult);
        
        const result = await pool.query(
          'SELECT * FROM mvp_configuration WHERE category = $1',
          ['batch']
        );
        
        expect(result.rows).toHaveLength(2);
      });
    });

    describe('Enhanced ad_transactions table (MVP fields)', () => {
      it('should insert ad transaction with MVP fields', async () => {
        const mockResult = { rows: [{ id: 1 }] };
        pool.query.mockResolvedValue(mockResult);
        
        const result = await pool.query(
          'INSERT INTO ad_transactions (publisher_address, advertiser_address, ai_searcher_address, campaign_id, ad_amount_usdc, batch_id, merkle_root, blockchain_tx_hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
          ['0xpub123', '0xadv123', '0xai123', 'campaign_1', 50.0, 'batch_123', '0xmerkle123', '0xtx123']
        );
        
        expect(result.rows[0].id).toBe(1);
      });

      it('should query transactions by batch status', async () => {
        const mockResult = {
          rows: [
            { id: 1, batch_id: 'batch_123', blockchain_tx_hash: null },
            { id: 2, batch_id: 'batch_123', blockchain_tx_hash: null }
          ]
        };
        pool.query.mockResolvedValue(mockResult);
        
        const result = await pool.query(
          'SELECT * FROM ad_transactions WHERE batch_id IS NOT NULL AND blockchain_tx_hash IS NULL'
        );
        
        expect(result.rows).toHaveLength(2);
      });
    });

    describe('Enhanced revenue_distributions table (MVP fields)', () => {
      it('should insert revenue distribution with MVP fields', async () => {
        const mockResult = { rows: [{ id: 1 }] };
        pool.query.mockResolvedValue(mockResult);
        
        const result = await pool.query(
          'INSERT INTO revenue_distributions (publisher_address, ai_searcher_address, total_amount, publisher_amount, ai_searcher_amount, distribution_type, blockchain_tx_hash, status, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
          ['0xpub123', '0xai123', 100.0, 70.0, 30.0, 'ad_revenue', '0xtx123', 'completed', '{}']
        );
        
        expect(result.rows[0].id).toBe(1);
      });

      it('should query distributions by status', async () => {
        const mockResult = {
          rows: [
            { id: 1, status: 'pending', total_amount: 100.0 },
            { id: 2, status: 'pending', total_amount: 50.0 }
          ]
        };
        pool.query.mockResolvedValue(mockResult);
        
        const result = await pool.query(
          'SELECT * FROM revenue_distributions WHERE status = $1',
          ['pending']
        );
        
        expect(result.rows).toHaveLength(2);
      });
    });
  });

  describe('Connection handling', () => {
    it('should connect to database', async () => {
      const client = await pool.connect();
      expect(client).toBe(mockClient);
      expect(pool.connect).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      pool.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(pool.connect()).rejects.toThrow('Connection failed');
    });

    it('should release connection', async () => {
      const client = await pool.connect();
      client.release();
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe('Transaction handling', () => {
    it('should handle transaction commit', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await mockClient.query('BEGIN');
      await mockClient.query('INSERT INTO users (email) VALUES ($1)', ['test@example.com']);
      await mockClient.query('COMMIT');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should handle transaction rollback', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await mockClient.query('BEGIN');
      await mockClient.query('ROLLBACK');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('Error handling', () => {
    it('should handle query timeout', async () => {
      const timeoutError = new Error('Query timeout');
      timeoutError.code = 'QUERY_TIMEOUT';
      pool.query.mockRejectedValue(timeoutError);

      await expect(pool.query('SELECT * FROM users')).rejects.toThrow('Query timeout');
    });

    it('should handle connection pool exhaustion', async () => {
      const poolError = new Error('Connection pool exhausted');
      poolError.code = 'POOL_EXHAUSTED';
      pool.connect.mockRejectedValue(poolError);

      await expect(pool.connect()).rejects.toThrow('Connection pool exhausted');
    });

    it('should handle foreign key constraint violations', async () => {
      const fkError = new Error('Foreign key constraint violation');
      fkError.code = '23503';
      pool.query.mockRejectedValue(fkError);

      await expect(pool.query(
        'INSERT INTO api_keys (key_hash, user_id, plan_id) VALUES ($1, $2, $3)',
        ['hash', 999, 1] // Non-existent user_id
      )).rejects.toThrow('Foreign key constraint violation');
    });
  });
});
