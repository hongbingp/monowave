import logger from '../utils/logger.js';

function errorHandler(error, req, res, next) {
  logger.error('Unhandled error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: error.message,
      details: error.details
    });
  }

  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      code: 'INVALID_TOKEN',
      message: 'Invalid token'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      code: 'TOKEN_EXPIRED',
      message: 'Token has expired'
    });
  }

  if (error.code === 'ECONNREFUSED') {
    return res.status(503).json({
      code: 'SERVICE_UNAVAILABLE',
      message: 'External service unavailable'
    });
  }

  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message
  });
}

export default errorHandler;