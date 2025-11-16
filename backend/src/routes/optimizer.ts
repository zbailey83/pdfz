import express from 'express';
import axios from 'axios';
import { authenticate, AuthRequest, requirePremium } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = express.Router();

// POST /api/v1/optimizer/run
router.post('/run', authenticate, requirePremium, async (req: AuthRequest, res, next) => {
  try {
    if (!req.accountId) {
      throw new AppError('Unauthorized', 401);
    }

    const { budget, constraints } = req.body;

    if (!budget || budget <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Budget must be greater than 0'
      });
    }

    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001';
    
    const response = await axios.post(`${mlServiceUrl}/optimizer/run`, {
      account_id: req.accountId,
      budget,
      constraints: constraints || {}
    });

    res.json({
      status: 'success',
      data: response.data
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
