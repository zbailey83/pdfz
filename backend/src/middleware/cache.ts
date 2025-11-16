import { Request, Response, NextFunction } from 'express';
import { getCached, setCached } from '../services/redis';
import { AuthRequest } from './auth';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyGenerator?: (req: Request) => string;
}

export function cacheMiddleware(options: CacheOptions = {}) {
  const { ttl = 300, keyGenerator } = options; // Default 5 minutes

  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator
      ? keyGenerator(req)
      : `cache:${req.path}:${JSON.stringify(req.query)}:${req.accountId || 'anonymous'}`;

    try {
      // Try to get from cache
      const cached = await getCached(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = function (body: any) {
        setCached(cacheKey, body, ttl).catch(console.error);
        return originalJson(body);
      };

      next();
    } catch (error) {
      // If caching fails, continue without cache
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

