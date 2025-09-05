import express from 'express';
import { processPayment, getPaymentHistory, depositToEscrow, getEscrowBalance } from '../controllers/payController.js';
import { authenticateApiKey } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticateApiKey, processPayment);
router.get('/history', authenticateApiKey, getPaymentHistory);

// MVP Escrow endpoints
router.post('/escrow/deposit', authenticateApiKey, depositToEscrow);
router.get('/escrow/balance', authenticateApiKey, getEscrowBalance);

export default router;