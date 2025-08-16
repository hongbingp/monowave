#!/usr/bin/env node

require('dotenv').config();
const { pool } = require('../src/config/database');
const AuthService = require('../src/utils/auth');
const BlockchainService = require('../src/services/blockchainService');
const logger = require('../src/utils/logger');
const axios = require('axios');

const TEST_DATA = {
  aiSearcher: {
    email: 'test-ai-searcher@monowave.com',
    password: 'test123456',
    wallet_address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', // Account #2 from Hardhat
    user_type: 'ai_searcher',
    balance: 100.0 // 100 USDC for testing
  },
  publisher: {
    email: 'test-publisher@monowave.com',
    password: 'test123456',
    wallet_address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Account #1 from Hardhat
    user_type: 'publisher',
    balance: 0.0
  }
};

async function setupTestData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    logger.info('🚀 Starting test data setup...');

    // 1. Create test users
    logger.info('📝 Creating test users...');
    
    // Create AI Searcher user
    const aiSearcherResult = await client.query(
      `INSERT INTO users (email, password_hash, wallet_address, user_type, balance, status, plan_id) 
       VALUES ($1, $2, $3, $4, $5, 'active', 1) 
       ON CONFLICT (email) DO UPDATE SET 
       password_hash = $2, wallet_address = $3, user_type = $4, balance = $5, status = 'active', plan_id = 1
       RETURNING id`,
      [
        TEST_DATA.aiSearcher.email,
        'dummy_hash', // We'll use a dummy hash for testing
        TEST_DATA.aiSearcher.wallet_address,
        TEST_DATA.aiSearcher.user_type,
        TEST_DATA.aiSearcher.balance
      ]
    );
    const aiSearcherId = aiSearcherResult.rows[0].id;
    
    // Create Publisher user
    const publisherResult = await client.query(
      `INSERT INTO users (email, password_hash, wallet_address, user_type, balance, status, plan_id) 
       VALUES ($1, $2, $3, $4, $5, 'active', 1) 
       ON CONFLICT (email) DO UPDATE SET 
       password_hash = $2, wallet_address = $3, user_type = $4, balance = $5, status = 'active', plan_id = 1
       RETURNING id`,
      [
        TEST_DATA.publisher.email,
        'dummy_hash',
        TEST_DATA.publisher.wallet_address,
        TEST_DATA.publisher.user_type,
        TEST_DATA.publisher.balance
      ]
    );
    const publisherId = publisherResult.rows[0].id;

    logger.info(`✅ Created AI Searcher (ID: ${aiSearcherId}) and Publisher (ID: ${publisherId})`);

    // 2. Create AI Searcher registry entry
    logger.info('🤖 Creating AI Searcher registry entry...');
    await client.query(
      `INSERT INTO ai_searchers (user_id, wallet_address, name, description, total_spent, prepaid_balance, is_active, status)
       VALUES ($1, $2, $3, $4, $5, $6, true, 'active')
       ON CONFLICT (wallet_address) DO UPDATE SET
       name = $3, description = $4, total_spent = $5, prepaid_balance = $6, is_active = true, status = 'active'`,
      [
        aiSearcherId,
        TEST_DATA.aiSearcher.wallet_address,
        'Test AI Searcher',
        'AI Searcher for testing crawl pipeline',
        0,
        TEST_DATA.aiSearcher.balance
      ]
    );

    // 3. Create Publisher registry entry
    logger.info('📰 Creating Publisher registry entry...');
    await client.query(
      `INSERT INTO publishers (user_id, wallet_address, name, website, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (wallet_address) DO UPDATE SET
       name = $3, website = $4, is_active = true`,
      [
        publisherId,
        TEST_DATA.publisher.wallet_address,
        'Test Publisher',
        'https://example.com'
      ]
    );

    await client.query('COMMIT');
    
    // 4. Create API Key for AI Searcher (after commit)
    logger.info('🔑 Creating API Key...');
    const apiKeyData = await AuthService.createApiKey(aiSearcherId, 1, 'Test API Key');
    
    // 5. Setup blockchain test data
    logger.info('⛓️ Setting up blockchain test environment...');
    const blockchainService = new BlockchainService();
    
    if (blockchainService.isAvailable()) {
      // Mint test USDC tokens for AI Searcher
      logger.info('🪙 Minting test USDC tokens...');
      const mintResult = await blockchainService.mintTestTokens(
        TEST_DATA.aiSearcher.wallet_address,
        500 // 500 USDC
      );
      
      if (mintResult.success) {
        logger.info(`✅ Minted ${mintResult.amount} USDC to ${TEST_DATA.aiSearcher.wallet_address}`);
        logger.info(`   Transaction hash: ${mintResult.txHash}`);
      } else {
        logger.warn('⚠️ Failed to mint test tokens:', mintResult.error);
      }
      
      // Check blockchain balance
      const blockchainBalance = await blockchainService.getTokenBalance(TEST_DATA.aiSearcher.wallet_address);
      logger.info(`💰 AI Searcher blockchain balance: ${blockchainBalance} USDC`);
    } else {
      logger.warn('⚠️ Blockchain service not available, skipping blockchain setup');
    }
    
    logger.info('✅ Test data setup completed!');
    logger.info('📊 Test Environment Summary:');
    logger.info(`   AI Searcher ID: ${aiSearcherId}`);
    logger.info(`   Publisher ID: ${publisherId}`);
    logger.info(`   API Key: ${apiKeyData.apiKey}`);
    logger.info(`   AI Searcher Balance: ${TEST_DATA.aiSearcher.balance} USDC`);
    
    return {
      aiSearcherId,
      publisherId,
      apiKey: apiKeyData.apiKey,
      apiKeyId: apiKeyData.id
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('❌ Test data setup failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function testCrawlPipeline(testData) {
  logger.info('🧪 Starting crawl pipeline test...');
  
  const crawlRequest = {
    urls: [
      'https://httpbin.org/html', // Simple test URL that returns HTML
      'https://jsonplaceholder.typicode.com/posts/1' // JSON API for testing
    ],
    format: 'summary'
  };
  
  try {
    // Test crawl API endpoint
    logger.info('📡 Making crawl request...');
    
    const response = await axios.post('http://localhost:3000/api/v1/crawl', crawlRequest, {
      headers: {
        'X-API-Key': testData.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    logger.info('✅ Crawl request successful!');
    logger.info('📊 Response summary:');
    logger.info(`   Status: ${response.status}`);
    logger.info(`   Code: ${response.data.code}`);
    logger.info(`   URLs processed: ${Object.keys(response.data.data || {}).length}`);
    logger.info(`   Errors: ${Object.keys(response.data.errors || {}).length}`);
    logger.info(`   Total cost: ${response.data.billing?.totalCost || 0} USDC`);
    logger.info(`   Remaining balance: ${response.data.billing?.remainingBalance || 0} USDC`);
    
    // Log blockchain information
    if (response.data.billing?.blockchain) {
      const blockchain = response.data.billing.blockchain;
      logger.info('⛓️ Blockchain integration:');
      logger.info(`   Enabled: ${blockchain.enabled}`);
      if (blockchain.enabled && blockchain.success) {
        logger.info(`   Transaction hash: ${blockchain.txHash}`);
        logger.info(`   Block number: ${blockchain.blockNumber}`);
      } else if (blockchain.enabled && !blockchain.success) {
        logger.warn(`   Failed to process on blockchain`);
      } else {
        logger.info(`   ${blockchain.message}`);
      }
    }
    
    return response.data;
    
  } catch (error) {
    if (error.response) {
      logger.error('❌ Crawl request failed:');
      logger.error(`   Status: ${error.response.status}`);
      logger.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      logger.error('❌ Network error:', error.message);
    }
    throw error;
  }
}

async function validateDatabaseRecords(testData) {
  logger.info('🔍 Validating database records...');
  
  const client = await pool.connect();
  try {
    // Check usage logs
    const usageLogsResult = await client.query(
      'SELECT * FROM usage_logs WHERE api_key_id = $1 ORDER BY created_at DESC LIMIT 5',
      [testData.apiKeyId]
    );
    
    logger.info(`📝 Found ${usageLogsResult.rows.length} usage log entries`);
    usageLogsResult.rows.forEach((log, index) => {
      logger.info(`   Log ${index + 1}: URL=${log.url}, Cost=${log.cost}, Status=${log.status}`);
    });
    
    // Check user balance
    const userResult = await client.query(
      'SELECT balance FROM users WHERE id = $1',
      [testData.aiSearcherId]
    );
    
    const currentBalance = parseFloat(userResult.rows[0].balance);
    logger.info(`💰 Current AI Searcher balance: ${currentBalance} USDC`);
    
    // Check AI searcher stats
    const aiSearcherResult = await client.query(
      'SELECT total_spent, prepaid_balance FROM ai_searchers WHERE user_id = $1',
      [testData.aiSearcherId]
    );
    
    if (aiSearcherResult.rows.length > 0) {
      const stats = aiSearcherResult.rows[0];
      logger.info(`📊 AI Searcher stats: Total spent=${stats.total_spent}, Prepaid=${stats.prepaid_balance}`);
    }
    
    return {
      usageLogs: usageLogsResult.rows,
      currentBalance,
      initialBalance: TEST_DATA.aiSearcher.balance
    };
    
  } catch (error) {
    logger.error('❌ Database validation failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function checkServerStatus() {
  try {
    logger.info('🔍 Checking if server is running...');
    const response = await axios.get('http://localhost:3000/health', { timeout: 5000 });
    logger.info('✅ Server is running');
    return true;
  } catch (error) {
    logger.error('❌ Server is not running or not responding');
    logger.info('💡 Please start the server with: npm run dev');
    return false;
  }
}

async function runPipelineTest() {
  try {
    logger.info('🚀 Monowave Crawl Pipeline Test');
    logger.info('='.repeat(50));
    
    // Check if server is running
    const serverRunning = await checkServerStatus();
    if (!serverRunning) {
      logger.error('❌ Cannot proceed without server running');
      process.exit(1);
    }
    
    // Setup test data
    const testData = await setupTestData();
    
    // Wait a moment for database to settle
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test the crawl pipeline
    const crawlResult = await testCrawlPipeline(testData);
    
    // Validate database records
    const dbValidation = await validateDatabaseRecords(testData);
    
    logger.info('\n🎉 Pipeline test completed successfully!');
    logger.info('📊 Summary:');
    logger.info(`   Initial balance: ${dbValidation.initialBalance} USDC`);
    logger.info(`   Final balance: ${dbValidation.currentBalance} USDC`);
    logger.info(`   Total charged: ${dbValidation.initialBalance - dbValidation.currentBalance} USDC`);
    logger.info(`   Usage logs created: ${dbValidation.usageLogs.length}`);
    
    process.exit(0);
    
  } catch (error) {
    logger.error('❌ Pipeline test failed:', error);
    process.exit(1);
  }
}

// Run the test if called directly
if (require.main === module) {
  runPipelineTest();
}

module.exports = { setupTestData, testCrawlPipeline, validateDatabaseRecords };