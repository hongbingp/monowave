const express = require('express');
const { crawl } = require('../controllers/crawlController');
const { authenticateApiKey } = require('../middleware/auth');
const { checkRateLimit } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/', authenticateApiKey, checkRateLimit, crawl);

module.exports = router;