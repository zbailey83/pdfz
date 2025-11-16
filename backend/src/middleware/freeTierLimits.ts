import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const FREE_TIER_LIMITS = {
  maxChannels: 5,
  maxDataRows: 500,
  historicalDays: 90,
  exportFormats: ['pdf'] as const,
  advancedFeatures: false
};

export function enforceFreeTier(user: { tier: 'free' | 'premium' }, data: {
  rows?: number;
  channels?: number;
  days?: number;
}): void {
  if (user.tier === 'free') {
    if (data.rows && data.rows > FREE_TIER_LIMITS.maxDataRows) {
      throw new Error(`Free tier limit: ${FREE_TIER_LIMITS.maxDataRows} rows per month. Please upgrade to Premium.`);
    }
    if (data.channels && data.channels > FREE_TIER_LIMITS.maxChannels) {
      throw new Error(`Free tier limit: ${FREE_TIER_LIMITS.maxChannels} channels. Please upgrade to Premium.`);
    }
    if (data.days && data.days > FREE_TIER_LIMITS.historicalDays) {
      throw new Error(`Free tier limit: ${FREE_TIER_LIMITS.historicalDays} days of history. Please upgrade to Premium.`);
    }
  }
}

export const checkFreeTierLimits = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.tier === 'free') {
      // This middleware can be used to check limits on specific endpoints
      // Individual routes should call enforceFreeTier with specific data
    }
    next();
  } catch (error) {
    next(error);
  }
};

