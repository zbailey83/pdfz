import express from 'express';
import axios from 'axios';
import { authenticate, AuthRequest, requirePremium } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { pool } from '../db/connection';

const router = express.Router();

// POST /api/v1/models/attribution/run
router.post('/attribution/run', authenticate, requirePremium, async (req: AuthRequest, res, next) => {
  try {
    if (!req.accountId) {
      throw new AppError('Unauthorized', 401);
    }

    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001';
    
    // Trigger attribution job
    const response = await axios.post(`${mlServiceUrl}/attribution/run`, {
      account_id: req.accountId
    });

    res.json({
      status: 'success',
      data: {
        job_id: response.data.job_id
      }
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return res.status(502).json({
        status: 'error',
        message: 'ML service unavailable'
      });
    }
    next(error);
  }
});

// GET /api/v1/models/attribution/:id
router.get('/attribution/:id', authenticate, requirePremium, async (req: AuthRequest, res, next) => {
  try {
    if (!req.accountId) {
      throw new AppError('Unauthorized', 401);
    }

    // Check cache first
    const cached = await pool.query(
      `SELECT * FROM attribution_results 
       WHERE account_id = $1 AND id = $2 
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [req.accountId, req.params.id]
    );

    if (cached.rows.length > 0) {
      return res.json({
        status: 'success',
        data: cached.rows[0]
      });
    }

    // Fetch from ML service
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001';
    const response = await axios.get(`${mlServiceUrl}/attribution/${req.params.id}`);

    // ML service returns { status, data, message }
    // We need to extract the data or return the status
    if (response.data.status === 'completed' && response.data.data) {
      return res.json({
        status: 'success',
        data: response.data.data
      });
    }

    // Return status for pending/processing
    res.json({
      status: response.data.status || 'unknown',
      message: response.data.message,
      job_id: req.params.id
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return res.status(502).json({
        status: 'error',
        message: 'ML service unavailable'
      });
    }
    next(error);
  }
});

export default router;

