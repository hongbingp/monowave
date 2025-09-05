import express from 'express';
import {
  getUsage,
  getBilling,
  createPlan,
  createApiKey,
  deactivateApiKey,
  getApiKeys
} from '../controllers/adminController.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();

router.get('/usage', authenticateJWT, getUsage);
router.get('/billing', authenticateJWT, getBilling);
router.post('/plan', authenticateJWT, createPlan);
router.post('/apikey', authenticateJWT, createApiKey);
router.delete('/apikey/:keyId', authenticateJWT, deactivateApiKey);
router.get('/apikeys', authenticateJWT, getApiKeys);

export default router;