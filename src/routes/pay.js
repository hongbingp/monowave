const express = require('express');
const { processPayment, getPaymentHistory } = require('../controllers/payController');
const { authenticateApiKey } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticateApiKey, processPayment);
router.get('/history', authenticateApiKey, getPaymentHistory);

module.exports = router;