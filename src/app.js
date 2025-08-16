const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const errorHandler = require('./middleware/errorHandler');
const BlockchainSyncService = require('./services/blockchainSyncService');
const configService = require('./services/configService');

const crawlRoutes = require('./routes/crawl');
const adminRoutes = require('./routes/admin');
const payRoutes = require('./routes/pay');
const statsRoutes = require('./routes/stats');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

app.use('/api/v1/crawl', crawlRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/pay', payRoutes);
app.use('/api/v1/stats', statsRoutes);

app.get('/health', async (req, res) => {
  try {
    // Get blockchain sync status if available
    let syncStatus = null;
    if (global.blockchainSyncService) {
      syncStatus = await global.blockchainSyncService.getSyncStatus();
    }

    // Get configuration summary
    const configSummary = await configService.getConfigSummary();

    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      mvp: {
        syncService: syncStatus,
        configuration: configSummary
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      mvp: {
        error: 'Failed to get MVP status'
      }
    });
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDB();
    
    // Try to connect to Redis, but don't fail if it's not available
    try {
      await connectRedis();
      logger.info('Redis connected - rate limiting enabled');
    } catch (redisError) {
      logger.warn('Redis not available - rate limiting disabled:', redisError.message);
    }
    
    // Initialize MVP services
    try {
      // Initialize configuration service cache
      await configService.refreshCache();
      logger.info('MVP configuration service initialized');
      
      // Start blockchain sync service if enabled
      const shouldSync = await configService.shouldSyncBlockchainData();
      if (shouldSync) {
        global.blockchainSyncService = new BlockchainSyncService();
        await global.blockchainSyncService.start();
        logger.info('MVP blockchain sync service started');
      } else {
        logger.info('MVP blockchain sync service disabled by configuration');
      }
    } catch (mvpError) {
      logger.warn('MVP services initialization failed:', mvpError.message);
      logger.warn('Server will continue without MVP services');
    }
    
    app.listen(PORT, () => {
      logger.info(`Monowave MVP server running on port ${PORT}`);
      logger.info('MVP features: batch processing, escrow, participant registry, revenue distribution');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
    // Stop blockchain sync service
    if (global.blockchainSyncService) {
      await global.blockchainSyncService.stop();
      logger.info('Blockchain sync service stopped');
    }
    
    // Close database pool
    const { pool } = require('./config/database');
    await pool.end();
    logger.info('Database connections closed');
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;