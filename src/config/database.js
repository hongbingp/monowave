const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'monowave',
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

    // Users table - enhanced to support different user types
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        plan_id INTEGER REFERENCES plans(id),
        wallet_address VARCHAR(42) UNIQUE,
        balance DECIMAL(18,8) DEFAULT 0,
        user_type VARCHAR(20) DEFAULT 'ai_searcher',
        status VARCHAR(20) DEFAULT 'pending_approval',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Publishers table - cached from ParticipantRegistry contract (MVP)
    await client.query(`
      CREATE TABLE IF NOT EXISTS publishers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        wallet_address VARCHAR(42) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        website VARCHAR(500),
        total_revenue DECIMAL(18,8) DEFAULT 0,
        pending_revenue DECIMAL(18,8) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // AI Searchers table - cached from ParticipantRegistry contract (MVP)
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_searchers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        wallet_address VARCHAR(42) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        api_endpoint VARCHAR(500),
        total_crawl_requests BIGINT DEFAULT 0,
        total_spent DECIMAL(18,8) DEFAULT 0,
        prepaid_balance DECIMAL(18,8) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        supported_formats TEXT[], -- JSON array as text
        credit_limit DECIMAL(18,8) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending_approval',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Advertisers table - cached from ParticipantRegistry contract (MVP)
    await client.query(`
      CREATE TABLE IF NOT EXISTS advertisers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        wallet_address VARCHAR(42) UNIQUE NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        website VARCHAR(500),
        categories TEXT[], -- JSON array as text
        total_spent DECIMAL(18,8) DEFAULT 0,
        escrow_balance DECIMAL(18,8) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        credit_limit DECIMAL(18,8) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending_approval',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ad Campaigns table - mirrors AdCampaign struct
    await client.query(`
      CREATE TABLE IF NOT EXISTS ad_campaigns (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER UNIQUE NOT NULL,
        advertiser_id INTEGER REFERENCES advertisers(id),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        budget DECIMAL(18,8) NOT NULL,
        spent DECIMAL(18,8) DEFAULT 0,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT true,
        target_categories TEXT[], -- JSON array as text
        max_bid_amount DECIMAL(18,8) NOT NULL,
        creative_url VARCHAR(500),
        landing_page_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // API Keys table - enhanced with more fields from contract
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        key_id INTEGER UNIQUE,
        key_hash VARCHAR(255) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id),
        ai_searcher_id INTEGER REFERENCES ai_searchers(id),
        plan_id INTEGER REFERENCES plans(id),
        name VARCHAR(100),
        daily_limit INTEGER NOT NULL DEFAULT 10000,
        monthly_limit INTEGER NOT NULL DEFAULT 300000,
        rate_limit INTEGER DEFAULT 100,
        status VARCHAR(20) DEFAULT 'active',
        expires_at TIMESTAMP,
        usage_today INTEGER DEFAULT 0,
        usage_this_month INTEGER DEFAULT 0,
        last_usage_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Usage logs table - enhanced
    await client.query(`
      CREATE TABLE IF NOT EXISTS usage_logs (
        id SERIAL PRIMARY KEY,
        api_key_id INTEGER REFERENCES api_keys(id),
        ai_searcher_id INTEGER REFERENCES ai_searchers(id),
        url TEXT NOT NULL,
        format VARCHAR(20) DEFAULT 'raw',
        bytes_processed INTEGER DEFAULT 0,
        request_count INTEGER DEFAULT 1,
        cost DECIMAL(10,8) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'success',
        user_profile TEXT, -- JSON as text
        content_signals TEXT, -- JSON as text
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ad Transactions table - mirrors AdTransaction struct
    await client.query(`
      CREATE TABLE IF NOT EXISTS ad_transactions (
        id SERIAL PRIMARY KEY,
        transaction_id INTEGER UNIQUE NOT NULL,
        publisher_id INTEGER REFERENCES publishers(id),
        advertiser_id INTEGER REFERENCES advertisers(id),
        ai_searcher_id INTEGER REFERENCES ai_searchers(id),
        campaign_id INTEGER REFERENCES ad_campaigns(campaign_id),
        ad_amount DECIMAL(18,8) NOT NULL,
        publisher_share DECIMAL(18,8) NOT NULL,
        ai_searcher_share DECIMAL(18,8) NOT NULL,
        platform_fee DECIMAL(18,8) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ad_id VARCHAR(100) NOT NULL,
        creative_url VARCHAR(500),
        landing_page_url VARCHAR(500),
        target_audience TEXT,
        content_url VARCHAR(500),
        transaction_type VARCHAR(20) DEFAULT 'impression',
        settlement_hash VARCHAR(66),
        settled BOOLEAN DEFAULT false,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Revenue Distributions table - mirrors Distribution struct
    await client.query(`
      CREATE TABLE IF NOT EXISTS revenue_distributions (
        id SERIAL PRIMARY KEY,
        distribution_id INTEGER UNIQUE NOT NULL,
        recipients TEXT NOT NULL, -- JSON array as text
        amounts TEXT NOT NULL, -- JSON array as text  
        total_amount DECIMAL(18,8) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed BOOLEAN DEFAULT false,
        distribution_type VARCHAR(50) DEFAULT 'ad_revenue',
        transaction_hash VARCHAR(66),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ad Metrics table for tracking performance
    await client.query(`
      CREATE TABLE IF NOT EXISTS ad_metrics (
        id SERIAL PRIMARY KEY,
        entity_id INTEGER NOT NULL,
        entity_type VARCHAR(20) NOT NULL, -- 'publisher', 'advertiser', 'campaign'
        impressions BIGINT DEFAULT 0,
        clicks BIGINT DEFAULT 0,
        conversions BIGINT DEFAULT 0,
        total_revenue DECIMAL(18,8) DEFAULT 0,
        average_cpm DECIMAL(18,8) DEFAULT 0,
        average_cpc DECIMAL(18,8) DEFAULT 0,
        average_cpa DECIMAL(18,8) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Billing records table - enhanced
    await client.query(`
      CREATE TABLE IF NOT EXISTS billing_records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        entity_id INTEGER, -- publisher_id, ai_searcher_id, or advertiser_id
        entity_type VARCHAR(20), -- 'publisher', 'ai_searcher', 'advertiser'
        tx_hash VARCHAR(66),
        amount DECIMAL(18,8) NOT NULL,
        operation_type VARCHAR(20) DEFAULT 'charge', -- 'charge', 'deposit', 'withdraw', 'distribute'
        status VARCHAR(20) DEFAULT 'pending',
        billing_period VARCHAR(20) DEFAULT 'monthly',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Access Control Roles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS access_roles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        role_name VARCHAR(50) NOT NULL,
        granted_by INTEGER REFERENCES users(id),
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      )
    `);

    // Create indexes for better performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)');

    await client.query('CREATE INDEX IF NOT EXISTS idx_publishers_wallet_address ON publishers(wallet_address)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_publishers_is_active ON publishers(is_active)');

    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_searchers_wallet_address ON ai_searchers(wallet_address)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_searchers_is_active ON ai_searchers(is_active)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_searchers_status ON ai_searchers(status)');

    await client.query('CREATE INDEX IF NOT EXISTS idx_advertisers_wallet_address ON advertisers(wallet_address)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_advertisers_is_active ON advertisers(is_active)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_advertisers_status ON advertisers(status)');

    await client.query('CREATE INDEX IF NOT EXISTS idx_ad_campaigns_advertiser_id ON ad_campaigns(advertiser_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ad_campaigns_is_active ON ad_campaigns(is_active)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ad_campaigns_campaign_id ON ad_campaigns(campaign_id)');

    await client.query('CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_api_keys_ai_searcher_id ON api_keys(ai_searcher_id)');

    await client.query('CREATE INDEX IF NOT EXISTS idx_usage_logs_api_key ON usage_logs(api_key_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_usage_logs_ai_searcher_id ON usage_logs(ai_searcher_id)');

    await client.query('CREATE INDEX IF NOT EXISTS idx_ad_transactions_publisher_id ON ad_transactions(publisher_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ad_transactions_advertiser_id ON ad_transactions(advertiser_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ad_transactions_ai_searcher_id ON ad_transactions(ai_searcher_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ad_transactions_campaign_id ON ad_transactions(campaign_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ad_transactions_status ON ad_transactions(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ad_transactions_settled ON ad_transactions(settled)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ad_transactions_transaction_type ON ad_transactions(transaction_type)');

    await client.query('CREATE INDEX IF NOT EXISTS idx_revenue_distributions_completed ON revenue_distributions(completed)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_revenue_distributions_distribution_type ON revenue_distributions(distribution_type)');

    await client.query('CREATE INDEX IF NOT EXISTS idx_ad_metrics_entity ON ad_metrics(entity_id, entity_type)');

    await client.query('CREATE INDEX IF NOT EXISTS idx_billing_records_status ON billing_records(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_billing_records_entity ON billing_records(entity_id, entity_type)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_billing_records_operation_type ON billing_records(operation_type)');

    await client.query('CREATE INDEX IF NOT EXISTS idx_access_roles_user_id ON access_roles(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_access_roles_role_name ON access_roles(role_name)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_access_roles_is_active ON access_roles(is_active)');

    // Insert default data
    await client.query(`
      INSERT INTO plans (name, qps, daily_limit, monthly_limit, price_per_call, price_per_byte)
      VALUES 
        ('Basic', 100, 10000, 300000, 0.001, 0.0001),
        ('Pro', 500, 50000, 1500000, 0.0008, 0.00008),
        ('Enterprise', 2000, 200000, 6000000, 0.0005, 0.00005)
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