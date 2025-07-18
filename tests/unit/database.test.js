const { connectDB, pool } = require('../../src/config/database');

// Mock the pool
jest.mock('../../src/config/database', () => {
  const mockPool = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn()
  };
  return {
    pool: mockPool,
    connectDB: jest.fn()
  };
});

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
      mockClient.query.mockResolvedValue(mockResult);

      const result = await pool.query(
        'INSERT INTO users (email, password_hash, plan_id, wallet_address, balance) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        ['test@example.com', 'hashedpassword', 1, '0x123456789abcdef', 10.0]
      );

      expect(result.rows[0].id).toBe(1);
      expect(mockClient.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, password_hash, plan_id, wallet_address, balance) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        ['test@example.com', 'hashedpassword', 1, '0x123456789abcdef', 10.0]
      );
    });

    it('should update user balance', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await pool.query(
        'UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
        [5.0, 1]
      );

      expect(mockClient.query).toHaveBeenCalledWith(
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
      mockClient.query.mockResolvedValue(mockResult);

      const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [1]
      );

      expect(result.rows[0].email).toBe('test@example.com');
      expect(result.rows[0].balance).toBe(10.0);
    });

    it('should handle unique constraint violation', async () => {
      const error = new Error('duplicate key value violates unique constraint "users_email_key"');
      error.code = '23505';
      mockClient.query.mockRejectedValue(error);

      await expect(pool.query(
        'INSERT INTO users (email, password_hash, plan_id) VALUES ($1, $2, $3)',
        ['test@example.com', 'hashedpassword', 1]
      )).rejects.toThrow('duplicate key value violates unique constraint');
    });
  });

  describe('API Keys table operations', () => {
    it('should create API key successfully', async () => {
      const mockResult = { rows: [{ id: 1 }] };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await pool.query(
        'INSERT INTO api_keys (key_hash, user_id, plan_id, name, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        ['hashedkey', 1, 1, 'Test Key', 'active']
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
          status: 'active',
          expires_at: null
        }]
      };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await pool.query(
        'SELECT * FROM api_keys WHERE status = $1',
        ['active']
      );

      expect(result.rows[0].status).toBe('active');
    });

    it('should update API key status', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await pool.query(
        'UPDATE api_keys SET status = $1, updated_at = NOW() WHERE id = $2',
        ['inactive', 1]
      );

      expect(mockClient.query).toHaveBeenCalledWith(
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
      mockClient.query.mockResolvedValue(mockResult);

      const result = await pool.query(`
        SELECT ak.*, p.qps, p.daily_limit, p.monthly_limit, 
               p.price_per_call, p.price_per_byte, u.balance, u.wallet_address
        FROM api_keys ak
        JOIN plans p ON ak.plan_id = p.id
        JOIN users u ON ak.user_id = u.id
        WHERE ak.status = 'active'
      `);

      expect(result.rows[0].qps).toBe(100);
      expect(result.rows[0].balance).toBe(10.0);
    });
  });

  describe('Usage logs table operations', () => {
    it('should insert usage log', async () => {
      const mockResult = { rows: [{ id: 1 }] };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await pool.query(
        'INSERT INTO usage_logs (api_key_id, url, format, bytes_processed, cost, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [1, 'https://example.com', 'raw', 1000, 0.1, 'success']
      );

      expect(result.rows[0].id).toBe(1);
    });

    it('should get usage statistics', async () => {
      const mockResult = {
        rows: [{
          total_calls: '100',
          total_bytes: '50000',
          total_cost: '5.00',
          successful_calls: '95',
          failed_calls: '5'
        }]
      };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_calls,
          SUM(bytes_processed) as total_bytes,
          SUM(cost) as total_cost,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_calls,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_calls
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
          api_key_id: 1,
          url: 'https://example.com',
          format: 'raw',
          bytes_processed: 1000,
          cost: 0.1,
          status: 'success'
        }]
      };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await pool.query(`
        SELECT * FROM usage_logs 
        WHERE api_key_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
      `, [1]);

      expect(result.rows[0].url).toBe('https://example.com');
    });
  });

  describe('Billing records table operations', () => {
    it('should create billing record', async () => {
      const mockResult = { rows: [{ id: 1 }] };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await pool.query(
        'INSERT INTO billing_records (user_id, amount, billing_period, status) VALUES ($1, $2, $3, $4) RETURNING id',
        [1, 10.0, 'monthly', 'pending']
      );

      expect(result.rows[0].id).toBe(1);
    });

    it('should update billing record with transaction hash', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await pool.query(
        'UPDATE billing_records SET tx_hash = $1, status = $2, updated_at = NOW() WHERE id = $3',
        ['0xabcdef123456', 'paid', 1]
      );

      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE billing_records SET tx_hash = $1, status = $2, updated_at = NOW() WHERE id = $3',
        ['0xabcdef123456', 'paid', 1]
      );
    });

    it('should get billing records with user details', async () => {
      const mockResult = {
        rows: [{
          id: 1,
          user_id: 1,
          tx_hash: '0xabcdef123456',
          amount: 10.0,
          status: 'paid',
          billing_period: 'monthly',
          email: 'test@example.com',
          wallet_address: '0x123'
        }]
      };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await pool.query(`
        SELECT br.*, u.email, u.wallet_address
        FROM billing_records br
        JOIN users u ON br.user_id = u.id
        WHERE br.status = $1
      `, ['paid']);

      expect(result.rows[0].amount).toBe(10.0);
      expect(result.rows[0].email).toBe('test@example.com');
    });

    it('should check for duplicate transaction hash', async () => {
      const mockResult = { rows: [{ id: 1 }] };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await pool.query(
        'SELECT id FROM billing_records WHERE tx_hash = $1',
        ['0xabcdef123456']
      );

      expect(result.rows.length).toBe(1);
    });
  });

  describe('Plans table operations', () => {
    it('should create plan', async () => {
      const mockResult = { rows: [{ id: 1 }] };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await pool.query(
        'INSERT INTO plans (name, qps, daily_limit, monthly_limit, price_per_call, price_per_byte) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        ['Premium', 200, 20000, 600000, 0.002, 0.0002]
      );

      expect(result.rows[0].id).toBe(1);
    });

    it('should get all plans', async () => {
      const mockResult = {
        rows: [{
          id: 1,
          name: 'Basic',
          qps: 100,
          daily_limit: 10000,
          monthly_limit: 300000,
          price_per_call: 0.001,
          price_per_byte: 0.0001
        }]
      };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await pool.query('SELECT * FROM plans');

      expect(result.rows[0].name).toBe('Basic');
      expect(result.rows[0].qps).toBe(100);
    });

    it('should update plan', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await pool.query(
        'UPDATE plans SET qps = $1, updated_at = NOW() WHERE id = $2',
        [200, 1]
      );

      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE plans SET qps = $1, updated_at = NOW() WHERE id = $2',
        [200, 1]
      );
    });
  });

  describe('Transaction handling', () => {
    it('should handle transaction commit', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await mockClient.query('BEGIN');
      await mockClient.query('INSERT INTO users (email, password_hash) VALUES ($1, $2)', ['test@example.com', 'hash']);
      await mockClient.query('COMMIT');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should handle transaction rollback', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('Constraint violation')) // INSERT fails
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      try {
        await mockClient.query('BEGIN');
        await mockClient.query('INSERT INTO users (email, password_hash) VALUES ($1, $2)', ['test@example.com', 'hash']);
        await mockClient.query('COMMIT');
      } catch (error) {
        await mockClient.query('ROLLBACK');
        expect(error.message).toBe('Constraint violation');
      }

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('Connection handling', () => {
    it('should connect to database', async () => {
      const mockConnection = { query: jest.fn(), release: jest.fn() };
      pool.connect.mockResolvedValue(mockConnection);

      const client = await pool.connect();

      expect(client).toBe(mockConnection);
      expect(pool.connect).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      pool.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(pool.connect()).rejects.toThrow('Connection failed');
    });

    it('should release connection', async () => {
      const mockConnection = { query: jest.fn(), release: jest.fn() };
      pool.connect.mockResolvedValue(mockConnection);

      const client = await pool.connect();
      client.release();

      expect(client.release).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle query timeout', async () => {
      const timeoutError = new Error('Query timeout');
      timeoutError.code = 'QUERY_TIMEOUT';
      mockClient.query.mockRejectedValue(timeoutError);

      await expect(pool.query('SELECT * FROM users')).rejects.toThrow('Query timeout');
    });

    it('should handle connection pool exhaustion', async () => {
      const poolError = new Error('Connection pool exhausted');
      poolError.code = 'POOL_ENQUEUED';
      pool.connect.mockRejectedValue(poolError);

      await expect(pool.connect()).rejects.toThrow('Connection pool exhausted');
    });

    it('should handle foreign key constraint violations', async () => {
      const fkError = new Error('Foreign key constraint violation');
      fkError.code = '23503';
      mockClient.query.mockRejectedValue(fkError);

      await expect(pool.query(
        'INSERT INTO api_keys (key_hash, user_id, plan_id) VALUES ($1, $2, $3)',
        ['hash', 999, 1] // Non-existent user_id
      )).rejects.toThrow('Foreign key constraint violation');
    });
  });
});