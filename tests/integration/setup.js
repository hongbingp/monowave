const { Pool } = require('pg');
const redis = require('redis');
require('dotenv').config();

// Test database configuration
const testDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME_TEST || 'adchain_test',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

// Test Redis configuration
const testRedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: 1 // Use different database for testing
};

let testPool;
let testRedisClient;

beforeAll(async () => {
  // Set up test database
  testPool = new Pool(testDbConfig);
  
  // Set up test Redis client
  testRedisClient = redis.createClient(testRedisConfig);
  await testRedisClient.connect();
  
  // Create test tables
  await setupTestDatabase();
});

afterAll(async () => {
  // Clean up database
  if (testPool) {
    await testPool.end();
  }
  
  // Clean up Redis
  if (testRedisClient) {
    await testRedisClient.flushDb();
    await testRedisClient.quit();
  }
});

beforeEach(async () => {
  // Clear test data before each test
  await clearTestDatabase();
  await testRedisClient.flushDb();
});

async function setupTestDatabase() {
  const client = await testPool.connect();
  try {
    await client.query('BEGIN');

    // Create test tables (same as production)
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

    // Insert test data
    await client.query(`
      INSERT INTO plans (name, qps, daily_limit, monthly_limit, price_per_call, price_per_byte)
      VALUES ('Test Plan', 100, 10000, 300000, 0.001, 0.0001)
    `);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function clearTestDatabase() {
  const client = await testPool.connect();
  try {
    await client.query('TRUNCATE TABLE ad_events, billing_records, usage_logs, api_keys, users RESTART IDENTITY CASCADE');
  } catch (error) {
    console.error('Error clearing test database:', error);
  } finally {
    client.release();
  }
}

// Export test utilities
global.testPool = testPool;
global.testRedisClient = testRedisClient;
global.testDbConfig = testDbConfig;
global.testRedisConfig = testRedisConfig;