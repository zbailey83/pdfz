import express from 'express';
import axios from 'axios';
import { authenticate, AuthRequest, requirePremium } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = express.Router();

// GET /api/v1/forecast
router.get('/', authenticate, requirePremium, async (req: AuthRequest, res, next) => {
  try {
    if (!req.accountId) {
      throw new AppError('Unauthorized', 401);
    }

    const horizon = parseInt(req.query.horizon as string) || 30;

    if (horizon < 7 || horizon > 90) {
      return res.status(400).json({
        status: 'error',
        message: 'Horizon must be between 7 and 90 days'
      });
    }

    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001';
    
    const response = await axios.get(`${mlServiceUrl}/forecast`, {
      params: {
        account_id: req.accountId,
        horizon
      }
    });

    res.json({
      status: 'success',
      data: response.data.data
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 502;
      const message = error.response?.data?.detail || 'ML service unavailable';
      return res.status(status).json({
        status: 'error',
        message
      });
    }
    next(error);
  }
});

export default router;

