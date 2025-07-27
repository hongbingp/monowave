#!/usr/bin/env node

const { pool } = require('../src/config/database');
const logger = require('../src/utils/logger');

async function runMigration(migrationName, migrationSQL) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if migration has already been run
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const result = await client.query('SELECT name FROM migrations WHERE name = $1', [migrationName]);
    if (result.rows.length > 0) {
      logger.info(`Migration '${migrationName}' already executed, skipping...`);
      await client.query('COMMIT');
      return;
    }
    
    logger.info(`Executing migration: ${migrationName}`);
    await client.query(migrationSQL);
    
    // Record migration
    await client.query('INSERT INTO migrations (name) VALUES ($1)', [migrationName]);
    
    await client.query('COMMIT');
    logger.info(`Migration '${migrationName}' completed successfully`);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Migration '${migrationName}' failed:`, error);
    throw error;
  } finally {
    client.release();
  }
}

async function migrateToContractSchema() {
  const migrations = [
    {
      name: '001_add_user_types_and_status',
      sql: `
        -- Add user_type and status columns to users table if they don't exist
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='user_type') THEN
            ALTER TABLE users ADD COLUMN user_type VARCHAR(20) DEFAULT 'ai_searcher';
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='status') THEN
            ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'pending_approval';
          END IF;
          -- Make wallet_address unique if not already
          BEGIN
            ALTER TABLE users ADD CONSTRAINT users_wallet_address_unique UNIQUE (wallet_address);
          EXCEPTION 
            WHEN duplicate_object THEN NULL;
          END;
        END $$;
      `
    },
    {
      name: '002_create_publishers_table',
      sql: `
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
        );
        CREATE INDEX IF NOT EXISTS idx_publishers_wallet_address ON publishers(wallet_address);
        CREATE INDEX IF NOT EXISTS idx_publishers_is_active ON publishers(is_active);
      `
    },
    {
      name: '003_create_ai_searchers_table',
      sql: `
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
          supported_formats TEXT[],
          credit_limit DECIMAL(18,8) DEFAULT 0,
          status VARCHAR(20) DEFAULT 'pending_approval',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_ai_searchers_wallet_address ON ai_searchers(wallet_address);
        CREATE INDEX IF NOT EXISTS idx_ai_searchers_is_active ON ai_searchers(is_active);
        CREATE INDEX IF NOT EXISTS idx_ai_searchers_status ON ai_searchers(status);
      `
    },
    {
      name: '004_create_advertisers_table', 
      sql: `
        CREATE TABLE IF NOT EXISTS advertisers (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          wallet_address VARCHAR(42) UNIQUE NOT NULL,
          company_name VARCHAR(255) NOT NULL,
          website VARCHAR(500),
          categories TEXT[],
          total_spent DECIMAL(18,8) DEFAULT 0,
          escrow_balance DECIMAL(18,8) DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          credit_limit DECIMAL(18,8) DEFAULT 0,
          status VARCHAR(20) DEFAULT 'pending_approval',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_advertisers_wallet_address ON advertisers(wallet_address);
        CREATE INDEX IF NOT EXISTS idx_advertisers_is_active ON advertisers(is_active);
        CREATE INDEX IF NOT EXISTS idx_advertisers_status ON advertisers(status);
      `
    },
    {
      name: '005_enhance_api_keys_table',
      sql: `
        -- Add new columns to api_keys table if they don't exist
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='api_keys' AND column_name='key_id') THEN
            ALTER TABLE api_keys ADD COLUMN key_id INTEGER UNIQUE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='api_keys' AND column_name='ai_searcher_id') THEN
            ALTER TABLE api_keys ADD COLUMN ai_searcher_id INTEGER REFERENCES ai_searchers(id);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='api_keys' AND column_name='daily_limit') THEN
            ALTER TABLE api_keys ADD COLUMN daily_limit INTEGER NOT NULL DEFAULT 10000;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='api_keys' AND column_name='monthly_limit') THEN
            ALTER TABLE api_keys ADD COLUMN monthly_limit INTEGER NOT NULL DEFAULT 300000;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='api_keys' AND column_name='rate_limit') THEN
            ALTER TABLE api_keys ADD COLUMN rate_limit INTEGER DEFAULT 100;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='api_keys' AND column_name='usage_today') THEN
            ALTER TABLE api_keys ADD COLUMN usage_today INTEGER DEFAULT 0;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='api_keys' AND column_name='usage_this_month') THEN
            ALTER TABLE api_keys ADD COLUMN usage_this_month INTEGER DEFAULT 0;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='api_keys' AND column_name='last_usage_reset') THEN
            ALTER TABLE api_keys ADD COLUMN last_usage_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
          END IF;
        END $$;
        CREATE INDEX IF NOT EXISTS idx_api_keys_ai_searcher_id ON api_keys(ai_searcher_id);
      `
    },
    {
      name: '006_enhance_usage_logs_table',
      sql: `
        -- Add new columns to usage_logs table if they don't exist
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usage_logs' AND column_name='ai_searcher_id') THEN
            ALTER TABLE usage_logs ADD COLUMN ai_searcher_id INTEGER REFERENCES ai_searchers(id);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usage_logs' AND column_name='request_count') THEN
            ALTER TABLE usage_logs ADD COLUMN request_count INTEGER DEFAULT 1;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usage_logs' AND column_name='user_profile') THEN
            ALTER TABLE usage_logs ADD COLUMN user_profile TEXT;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usage_logs' AND column_name='content_signals') THEN
            ALTER TABLE usage_logs ADD COLUMN content_signals TEXT;
          END IF;
        END $$;
        CREATE INDEX IF NOT EXISTS idx_usage_logs_ai_searcher_id ON usage_logs(ai_searcher_id);
      `
    }
  ];

  try {
    logger.info('Starting database migration to contract schema...');
    
    for (const migration of migrations) {
      await runMigration(migration.name, migration.sql);
    }
    
    logger.info('Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Database migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  migrateToContractSchema();
}

module.exports = { runMigration, migrateToContractSchema };