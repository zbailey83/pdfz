import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  userId?: string;
  accountId?: string;
  tier?: 'free' | 'premium';
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, secret) as {
      userId: string;
      accountId: string;
      tier: 'free' | 'premium';
    };

    req.userId = decoded.userId;
    req.accountId = decoded.accountId;
    req.tier = decoded.tier;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else {
      next(error);
    }
  }
};

export const requirePremium = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.tier !== 'premium') {
    return res.status(403).json({
      status: 'error',
      message: 'Premium feature. Please upgrade to access this feature.'
    });
  }
  next();
};

