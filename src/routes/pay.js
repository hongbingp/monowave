const express = require('express');
const { processPayment, getPaymentHistory, depositToEscrow, getEscrowBalance } = require('../controllers/payController');
const { authenticateApiKey } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticateApiKey, processPayment);
router.get('/history', authenticateApiKey, getPaymentHistory);

// MVP Escrow endpoints
router.post('/escrow/deposit', authenticateApiKey, depositToEscrow);
router.get('/escrow/balance', authenticateApiKey, getEscrowBalance);

module.exports = router;