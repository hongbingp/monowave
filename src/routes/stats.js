import express from 'express';
const router = express.Router();
import {
  getPlatformStats,
  getUserStats,
  getRevenueReport,
  getAdTransactionReport,
  getBatchProcessingStats
} from '../controllers/statsController.js';

// Platform statistics - overall system stats
router.get('/platform', getPlatformStats);

// User statistics - specific user stats by ID
router.get('/user/:userId', getUserStats);

// Revenue report - revenue distribution analytics
// Query params: startDate, endDate, entityType (publisher|ai_searcher), entityAddress
router.get('/revenue', getRevenueReport);

// Ad transaction report - advertising analytics
// Query params: startDate, endDate, campaignId, transactionType (impression|click|conversion)
router.get('/ad-transactions', getAdTransactionReport);

// MVP batch processing statistics
router.get('/batches', getBatchProcessingStats);

export default router;