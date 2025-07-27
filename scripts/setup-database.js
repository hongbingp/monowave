#!/usr/bin/env node

require('dotenv').config();
const { connectDB } = require('../src/config/database');
const logger = require('../src/utils/logger');

async function setupDatabase() {
  try {
    logger.info('Starting database setup...');
    
    // Connect to database and initialize tables
    await connectDB();
    
    logger.info('Database setup completed successfully!');
    logger.info('Tables created:');
    logger.info('  - users (enhanced with user_type and status)');
    logger.info('  - publishers (mirrors PublisherRegistry contract)');
    logger.info('  - ai_searchers (mirrors AISearcherRegistry contract)');
    logger.info('  - advertisers (mirrors AdvertiserRegistry contract)');
    logger.info('  - ad_campaigns (mirrors AdCampaign struct)');
    logger.info('  - api_keys (enhanced with contract fields)');
    logger.info('  - usage_logs (enhanced with user_profile and content_signals)');
    logger.info('  - ad_transactions (mirrors AdTransaction struct)');
    logger.info('  - revenue_distributions (mirrors Distribution struct)');
    logger.info('  - ad_metrics (performance tracking)');
    logger.info('  - billing_records (enhanced with entity tracking)');
    logger.info('  - access_roles (role-based access control)');
    logger.info('  - plans (pricing plans)');
    
    logger.info('Default plans inserted: Basic, Pro, Enterprise');
    logger.info('Comprehensive indexes created for optimal performance');
    
    process.exit(0);
  } catch (error) {
    logger.error('Database setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };