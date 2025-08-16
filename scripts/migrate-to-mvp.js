#!/usr/bin/env node

require('dotenv').config();
const { pool } = require('../src/config/database');
const logger = require('../src/utils/logger');

async function runMigration(migrationName, migrationSQL) {
  const client = await pool.connect();
  try {
    logger.info(`Running migration: ${migrationName}`);
    await client.query('BEGIN');
    
    // Check if migration already ran
    const migrationCheck = await client.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'migrations'
    `);
    
    if (migrationCheck.rows.length === 0) {
      await client.query(`
        CREATE TABLE migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    
    const existingMigration = await client.query(
      'SELECT 1 FROM migrations WHERE name = $1',
      [migrationName]
    );
    
    if (existingMigration.rows.length > 0) {
      logger.info(`Migration ${migrationName} already executed, skipping...`);
      await client.query('COMMIT');
      return;
    }
    
    await client.query(migrationSQL);
    await client.query(
      'INSERT INTO migrations (name) VALUES ($1)',
      [migrationName]
    );
    
    await client.query('COMMIT');
    logger.info(`Migration ${migrationName} completed successfully`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Migration ${migrationName} failed:`, error);
    throw error;
  } finally {
    client.release();
  }
}

async function migrateToMvp() {
  const migrations = [
    {
      name: '001_add_mvp_batch_fields_to_ad_transactions',
      sql: `
        -- Add MVP batch processing fields to ad_transactions table
        DO $$ 
        BEGIN 
          -- Add batch_id field for MVP batch processing
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ad_transactions' AND column_name='batch_id') THEN
            ALTER TABLE ad_transactions ADD COLUMN batch_id VARCHAR(66);
          END IF;
          
          -- Add merkle_root field for MVP Merkle tree verification
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ad_transactions' AND column_name='merkle_root') THEN
            ALTER TABLE ad_transactions ADD COLUMN merkle_root VARCHAR(66);
          END IF;
          
          -- Add batch_processed_at timestamp
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ad_transactions' AND column_name='batch_processed_at') THEN
            ALTER TABLE ad_transactions ADD COLUMN batch_processed_at TIMESTAMP;
          END IF;
          
          -- Add error_message field for batch processing errors
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ad_transactions' AND column_name='error_message') THEN
            ALTER TABLE ad_transactions ADD COLUMN error_message TEXT;
          END IF;
          
          -- Update status enum to include batch-related statuses
          -- Note: PostgreSQL doesn't have easy enum modification, so we use VARCHAR constraints
          -- Add constraint to ensure valid status values
          BEGIN
            ALTER TABLE ad_transactions DROP CONSTRAINT IF EXISTS ad_transactions_status_check;
            ALTER TABLE ad_transactions ADD CONSTRAINT ad_transactions_status_check 
              CHECK (status IN ('pending', 'completed', 'failed', 'batched', 'batch_failed'));
          EXCEPTION 
            WHEN duplicate_object THEN NULL;
          END;
          
          -- Convert existing foreign key references to address-based for MVP compatibility
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ad_transactions' AND column_name='publisher_address') THEN
            ALTER TABLE ad_transactions ADD COLUMN publisher_address VARCHAR(42);
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ad_transactions' AND column_name='advertiser_address') THEN
            ALTER TABLE ad_transactions ADD COLUMN advertiser_address VARCHAR(42);
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ad_transactions' AND column_name='ai_searcher_address') THEN
            ALTER TABLE ad_transactions ADD COLUMN ai_searcher_address VARCHAR(42);
          END IF;
          
          -- Add blockchain_tx_hash for tracking blockchain transactions
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ad_transactions' AND column_name='blockchain_tx_hash') THEN
            ALTER TABLE ad_transactions ADD COLUMN blockchain_tx_hash VARCHAR(66);
          END IF;
          
          -- Make transaction_id nullable since MVP uses batch IDs
          BEGIN
            ALTER TABLE ad_transactions ALTER COLUMN transaction_id DROP NOT NULL;
          EXCEPTION 
            WHEN others THEN NULL;
          END;
        END $$;
      `
    },
    {
      name: '002_add_mvp_fields_to_revenue_distributions',
      sql: `
        -- Add MVP fields to revenue_distributions table
        DO $$ 
        BEGIN 
          -- Add publisher_address and ai_searcher_address for MVP compatibility
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='revenue_distributions' AND column_name='publisher_address') THEN
            ALTER TABLE revenue_distributions ADD COLUMN publisher_address VARCHAR(42);
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='revenue_distributions' AND column_name='ai_searcher_address') THEN
            ALTER TABLE revenue_distributions ADD COLUMN ai_searcher_address VARCHAR(42);
          END IF;
          
          -- Add individual amounts for MVP
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='revenue_distributions' AND column_name='publisher_amount') THEN
            ALTER TABLE revenue_distributions ADD COLUMN publisher_amount DECIMAL(18,8);
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='revenue_distributions' AND column_name='ai_searcher_amount') THEN
            ALTER TABLE revenue_distributions ADD COLUMN ai_searcher_amount DECIMAL(18,8);
          END IF;
          
          -- Add blockchain_tx_hash
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='revenue_distributions' AND column_name='blockchain_tx_hash') THEN
            ALTER TABLE revenue_distributions ADD COLUMN blockchain_tx_hash VARCHAR(66);
          END IF;
          
          -- Add status field for MVP batch processing
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='revenue_distributions' AND column_name='status') THEN
            ALTER TABLE revenue_distributions ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
          END IF;
          
          -- Add metadata field for additional information
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='revenue_distributions' AND column_name='metadata') THEN
            ALTER TABLE revenue_distributions ADD COLUMN metadata TEXT;
          END IF;
          
          -- Add error_message field
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='revenue_distributions' AND column_name='error_message') THEN
            ALTER TABLE revenue_distributions ADD COLUMN error_message TEXT;
          END IF;
          
          -- Make distribution_id nullable for MVP batch processing
          BEGIN
            ALTER TABLE revenue_distributions ALTER COLUMN distribution_id DROP NOT NULL;
          EXCEPTION 
            WHEN others THEN NULL;
          END;
          
          -- Update status constraint
          BEGIN
            ALTER TABLE revenue_distributions DROP CONSTRAINT IF EXISTS revenue_distributions_status_check;
            ALTER TABLE revenue_distributions ADD CONSTRAINT revenue_distributions_status_check 
              CHECK (status IN ('pending', 'completed', 'failed', 'queued', 'batched', 'offline'));
          EXCEPTION 
            WHEN duplicate_object THEN NULL;
          END;
        END $$;
      `
    },
    {
      name: '003_create_revenue_batches_table',
      sql: `
        -- Create revenue_batches table for MVP batch processing
        CREATE TABLE IF NOT EXISTS revenue_batches (
          id SERIAL PRIMARY KEY,
          batch_id VARCHAR(66) UNIQUE NOT NULL,
          commit_tx_hash VARCHAR(66),
          payout_tx_hash VARCHAR(66),
          merkle_root VARCHAR(66),
          distribution_count INTEGER NOT NULL DEFAULT 0,
          total_amount DECIMAL(18,8) NOT NULL DEFAULT 0,
          token_address VARCHAR(42),
          window_end TIMESTAMP,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT revenue_batches_status_check 
            CHECK (status IN ('active', 'completed', 'disputed', 'reversed'))
        );
        
        -- Create indexes for revenue_batches
        CREATE INDEX IF NOT EXISTS idx_revenue_batches_batch_id ON revenue_batches(batch_id);
        CREATE INDEX IF NOT EXISTS idx_revenue_batches_status ON revenue_batches(status);
        CREATE INDEX IF NOT EXISTS idx_revenue_batches_created_at ON revenue_batches(created_at);
      `
    },
    {
      name: '004_create_participant_registry_cache',
      sql: `
        -- Create participant_registry_cache table to cache blockchain participant data
        CREATE TABLE IF NOT EXISTS participant_registry_cache (
          id SERIAL PRIMARY KEY,
          wallet_address VARCHAR(42) UNIQUE NOT NULL,
          payout_address VARCHAR(42),
          role_bitmap INTEGER NOT NULL DEFAULT 0,
          status INTEGER NOT NULL DEFAULT 0,
          metadata VARCHAR(66),
          is_publisher BOOLEAN GENERATED ALWAYS AS ((role_bitmap & 1) != 0) STORED,
          is_advertiser BOOLEAN GENERATED ALWAYS AS ((role_bitmap & 2) != 0) STORED,
          is_ai_searcher BOOLEAN GENERATED ALWAYS AS ((role_bitmap & 4) != 0) STORED,
          last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Create indexes for participant registry cache
        CREATE INDEX IF NOT EXISTS idx_participant_cache_wallet ON participant_registry_cache(wallet_address);
        CREATE INDEX IF NOT EXISTS idx_participant_cache_publisher ON participant_registry_cache(is_publisher) WHERE is_publisher = true;
        CREATE INDEX IF NOT EXISTS idx_participant_cache_advertiser ON participant_registry_cache(is_advertiser) WHERE is_advertiser = true;
        CREATE INDEX IF NOT EXISTS idx_participant_cache_ai_searcher ON participant_registry_cache(is_ai_searcher) WHERE is_ai_searcher = true;
        CREATE INDEX IF NOT EXISTS idx_participant_cache_status ON participant_registry_cache(status);
      `
    },
    {
      name: '005_create_escrow_balance_cache',
      sql: `
        -- Create escrow_balance_cache table to cache blockchain escrow balances
        CREATE TABLE IF NOT EXISTS escrow_balance_cache (
          id SERIAL PRIMARY KEY,
          wallet_address VARCHAR(42) NOT NULL,
          token_address VARCHAR(42) NOT NULL,
          balance DECIMAL(18,8) NOT NULL DEFAULT 0,
          last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          UNIQUE(wallet_address, token_address)
        );
        
        -- Create indexes for escrow balance cache
        CREATE INDEX IF NOT EXISTS idx_escrow_cache_wallet ON escrow_balance_cache(wallet_address);
        CREATE INDEX IF NOT EXISTS idx_escrow_cache_token ON escrow_balance_cache(token_address);
        CREATE INDEX IF NOT EXISTS idx_escrow_cache_balance ON escrow_balance_cache(balance);
        CREATE INDEX IF NOT EXISTS idx_escrow_cache_synced ON escrow_balance_cache(last_synced_at);
      `
    },
    {
      name: '006_add_mvp_indexes_for_performance',
      sql: `
        -- Add performance indexes for MVP batch processing
        
        -- Ad transactions indexes for batch processing
        CREATE INDEX IF NOT EXISTS idx_ad_transactions_batch_id ON ad_transactions(batch_id);
        CREATE INDEX IF NOT EXISTS idx_ad_transactions_batch_status ON ad_transactions(status) WHERE status IN ('pending', 'batched', 'batch_failed');
        CREATE INDEX IF NOT EXISTS idx_ad_transactions_addresses ON ad_transactions(publisher_address, advertiser_address, ai_searcher_address);
        CREATE INDEX IF NOT EXISTS idx_ad_transactions_batch_processed ON ad_transactions(batch_processed_at);
        CREATE INDEX IF NOT EXISTS idx_ad_transactions_blockchain_tx ON ad_transactions(blockchain_tx_hash);
        
        -- Revenue distributions indexes for batch processing
        CREATE INDEX IF NOT EXISTS idx_revenue_distributions_addresses ON revenue_distributions(publisher_address, ai_searcher_address);
        CREATE INDEX IF NOT EXISTS idx_revenue_distributions_status ON revenue_distributions(status);
        CREATE INDEX IF NOT EXISTS idx_revenue_distributions_blockchain_tx ON revenue_distributions(blockchain_tx_hash);
        
        -- Composite indexes for common queries
        CREATE INDEX IF NOT EXISTS idx_ad_transactions_status_created ON ad_transactions(status, created_at);
        CREATE INDEX IF NOT EXISTS idx_revenue_distributions_status_created ON revenue_distributions(status, created_at);
        
        -- Index for batch processing queries (without time-based predicates)
        CREATE INDEX IF NOT EXISTS idx_ad_transactions_pending_recent ON ad_transactions(created_at) 
          WHERE status = 'pending';
        CREATE INDEX IF NOT EXISTS idx_revenue_distributions_queued_recent ON revenue_distributions(created_at) 
          WHERE status = 'queued';
      `
    },
    {
      name: '007_add_mvp_configuration_table',
      sql: `
        -- Create mvp_configuration table for storing MVP system settings
        CREATE TABLE IF NOT EXISTS mvp_configuration (
          id SERIAL PRIMARY KEY,
          key VARCHAR(100) UNIQUE NOT NULL,
          value TEXT NOT NULL,
          value_type VARCHAR(20) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
          description TEXT,
          category VARCHAR(50) DEFAULT 'general',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Insert default MVP configuration
        INSERT INTO mvp_configuration (key, value, value_type, description, category) VALUES
          ('batch_size', '100', 'number', 'Default batch size for ad transactions', 'batching'),
          ('batch_timeout_ms', '30000', 'number', 'Batch timeout in milliseconds', 'batching'),
          ('revenue_batch_size', '50', 'number', 'Default batch size for revenue distributions', 'batching'),
          ('dispute_window_seconds', '86400', 'number', 'Dispute window in seconds (24 hours)', 'revenue'),
          ('platform_fee_bps', '200', 'number', 'Platform fee in basis points (2%)', 'revenue'),
          ('publisher_share_bps', '7000', 'number', 'Publisher share in basis points (70%)', 'revenue'),
          ('ai_searcher_share_bps', '3000', 'number', 'AI searcher share in basis points (30%)', 'revenue'),
          ('auto_register_participants', 'true', 'boolean', 'Automatically register participants', 'participants'),
          ('sync_blockchain_data', 'true', 'boolean', 'Sync blockchain data to cache tables', 'sync'),
          ('sync_interval_minutes', '5', 'number', 'Blockchain sync interval in minutes', 'sync')
        ON CONFLICT (key) DO NOTHING;
        
        -- Create index for configuration
        CREATE INDEX IF NOT EXISTS idx_mvp_config_key ON mvp_configuration(key);
        CREATE INDEX IF NOT EXISTS idx_mvp_config_category ON mvp_configuration(category);
        CREATE INDEX IF NOT EXISTS idx_mvp_config_active ON mvp_configuration(is_active);
      `
    }
  ];

  try {
    logger.info('Starting MVP database migration...');
    
    for (const migration of migrations) {
      await runMigration(migration.name, migration.sql);
    }
    
    logger.info('🎉 MVP database migration completed successfully!');
    logger.info('\nMigration Summary:');
    logger.info('✅ Added batch processing fields to ad_transactions');
    logger.info('✅ Added MVP fields to revenue_distributions');
    logger.info('✅ Created revenue_batches table for batch tracking');
    logger.info('✅ Created participant_registry_cache for blockchain sync');
    logger.info('✅ Created escrow_balance_cache for balance tracking');
    logger.info('✅ Added performance indexes for batch processing');
    logger.info('✅ Created MVP configuration table with defaults');
    
    logger.info('\nNext steps:');
    logger.info('1. Update environment variables for MVP contract addresses');
    logger.info('2. Run blockchain sync to populate cache tables');
    logger.info('3. Test batch processing functionality');
    
  } catch (error) {
    logger.error('❌ MVP database migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  migrateToMvp()
    .then(() => process.exit(0))
    .catch(error => {
      logger.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateToMvp };
