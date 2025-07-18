const express = require('express');
const {
  getUsage,
  getBilling,
  createPlan,
  createApiKey,
  deactivateApiKey,
  getApiKeys
} = require('../controllers/adminController');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

router.get('/usage', authenticateJWT, getUsage);
router.get('/billing', authenticateJWT, getBilling);
router.post('/plan', authenticateJWT, createPlan);
router.post('/apikey', authenticateJWT, createApiKey);
router.delete('/apikey/:keyId', authenticateJWT, deactivateApiKey);
router.get('/apikeys', authenticateJWT, getApiKeys);

module.exports = router;