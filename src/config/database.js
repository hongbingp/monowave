const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'adchain',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function connectDB() {
  try {
    await pool.connect();
    logger.info('PostgreSQL connected successfully');
    await initializeTables();
  } catch (error) {
    logger.error('PostgreSQL connection failed:', error);
    throw error;
  }
}

async function initializeTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Plans table
    await client.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        qps INTEGER NOT NULL DEFAULT 100,
        daily_limit INTEGER NOT NULL DEFAULT 10000,
        monthly_limit INTEGER NOT NULL DEFAULT 300000,
        price_per_call DECIMAL(10,8) NOT NULL DEFAULT 0.001,
        price_per_byte DECIMAL(10,8) NOT NULL DEFAULT 0.0001,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        plan_id INTEGER REFERENCES plans(id),
        wallet_address VARCHAR(42),
        balance DECIMAL(18,8) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // API Keys table
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        key_hash VARCHAR(255) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id),
        plan_id INTEGER REFERENCES plans(id),
        name VARCHAR(100),
        status VARCHAR(20) DEFAULT 'active',
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Usage logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS usage_logs (
        id SERIAL PRIMARY KEY,
        api_key_id INTEGER REFERENCES api_keys(id),
        url TEXT NOT NULL,
        format VARCHAR(20) DEFAULT 'raw',
        bytes_processed INTEGER DEFAULT 0,
        cost DECIMAL(10,8) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'success',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Billing records table
    await client.query(`
      CREATE TABLE IF NOT EXISTS billing_records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        tx_hash VARCHAR(66),
        amount DECIMAL(18,8) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        billing_period VARCHAR(20) DEFAULT 'monthly',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ad events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ad_events (
        id SERIAL PRIMARY KEY,
        publisher_id INTEGER REFERENCES users(id),
        event_type VARCHAR(20) NOT NULL,
        ad_id VARCHAR(100),
        revenue DECIMAL(10,8) DEFAULT 0,
        tx_hash VARCHAR(66),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_usage_logs_api_key ON usage_logs(api_key_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_billing_records_status ON billing_records(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ad_events_publisher ON ad_events(publisher_id)');

    // Insert default plan
    await client.query(`
      INSERT INTO plans (name, qps, daily_limit, monthly_limit, price_per_call, price_per_byte)
      VALUES ('Basic', 100, 10000, 300000, 0.001, 0.0001)
      ON CONFLICT DO NOTHING
    `);

    await client.query('COMMIT');
    logger.info('Database tables initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, connectDB };