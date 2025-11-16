import express from 'express';
import { authenticate, AuthRequest, requirePremium } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = express.Router();

// POST /api/v1/integrations/google/connect
router.post('/google/connect', authenticate, requirePremium, async (req: AuthRequest, res, next) => {
  try {
    if (!req.accountId) {
      throw new AppError('Unauthorized', 401);
    }

    // TODO: Implement Google Ads OAuth flow
    res.json({
      status: 'success',
      message: 'Google Ads integration coming soon'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/integrations/meta/connect
router.post('/meta/connect', authenticate, requirePremium, async (req: AuthRequest, res, next) => {
  try {
    if (!req.accountId) {
      throw new AppError('Unauthorized', 401);
    }

    // TODO: Implement Meta Ads OAuth flow
    res.json({
      status: 'success',
      message: 'Meta Ads integration coming soon'
    });
  } catch (error) {
    next(error);
  }
});

export default router;

