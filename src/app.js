const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const errorHandler = require('./middleware/errorHandler');

const crawlRoutes = require('./routes/crawl');
const adminRoutes = require('./routes/admin');
const payRoutes = require('./routes/pay');

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

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
    
    app.listen(PORT, () => {
      logger.info(`AdChain server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;