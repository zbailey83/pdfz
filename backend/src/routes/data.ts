import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { MarketingMetricsModel } from '../models/MarketingMetrics';
import { AppError } from '../middleware/errorHandler';
import { pool } from '../db/connection';
import { getCached, setCached, invalidatePattern } from '../services/redis';
import { measurePerformance } from '../utils/performance';

const router = express.Router();

// POST /api/v1/data/map
router.post('/map', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.accountId) {
      throw new AppError('Unauthorized', 401);
    }

    const { mappings } = req.body; // Array of { raw_name, normalized_name }

    if (!Array.isArray(mappings)) {
      return res.status(400).json({
        status: 'error',
        message: 'Mappings must be an array'
      });
    }

    // Save mappings to channel_normalization table
    for (const mapping of mappings) {
      await pool.query(
        `INSERT INTO channel_normalization (account_id, raw_name, normalized_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (account_id, raw_name)
         DO UPDATE SET normalized_name = EXCLUDED.normalized_name`,
        [req.accountId, mapping.raw_name, mapping.normalized_name]
      );
    }

    // Invalidate cache for this account's data
    await invalidatePattern(`data:summary:${req.accountId}:*`);
    await invalidatePattern(`data:timeseries:${req.accountId}:*`);

    res.json({
      status: 'success',
      message: 'Channel mappings saved'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/data/summary
router.get('/summary', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.accountId) {
      throw new AppError('Unauthorized', 401);
    }

    const days = req.tier === 'free' ? 90 : parseInt(req.query.days as string) || 365;
    const cacheKey = `data:summary:${req.accountId}:${days}`;
    
    // Try cache first
    const cached = await getCached<{
      summary: any;
      time_series: any[];
      period_days: number;
    }>(cacheKey);

    if (cached) {
      return res.json({
        status: 'success',
        data: cached
      });
    }

    // Fetch from database with performance monitoring
    const [summary, timeSeries] = await Promise.all([
      measurePerformance(
        () => MarketingMetricsModel.getSummary(req.accountId, days),
        'getSummary'
      ),
      measurePerformance(
        () => MarketingMetricsModel.getTimeSeries(req.accountId, days),
        'getTimeSeries'
      )
    ]);

    const data = {
      summary,
      time_series: timeSeries,
      period_days: days
    };

    // Cache for 5 minutes
    await setCached(cacheKey, data, 300);

    res.json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
});

export default router;

