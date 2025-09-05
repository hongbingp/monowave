import express from 'express';
import { crawl } from '../controllers/crawlController.js';
import { authenticateApiKey } from '../middleware/auth.js';
import { checkRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

router.post('/', authenticateApiKey, checkRateLimit, crawl);

export default router;