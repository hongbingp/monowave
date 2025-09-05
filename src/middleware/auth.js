import AuthService from '../utils/auth.js';
import logger from '../utils/logger.js';

async function authenticateApiKey(req, res, next) {
  try {
    const apiKey = req.header('X-API-Key');
    
    if (!apiKey) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'API key is required'
      });
    }

    const keyData = await AuthService.validateApiKey(apiKey);
    
    if (!keyData) {
      return res.status(401).json({
        code: 'INVALID_API_KEY',
        message: 'Invalid or expired API key'
      });
    }

    req.apiKey = keyData;
    next();
  } catch (error) {
    logger.error('API key authentication error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Authentication failed'
    });
  }
}

function authenticateJWT(req, res, next) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Access token is required'
      });
    }

    const decoded = AuthService.verifyJWT(token);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('JWT authentication error:', error);
    res.status(401).json({
      code: 'INVALID_TOKEN',
      message: 'Invalid or expired token'
    });
  }
}

export { authenticateApiKey, authenticateJWT };;