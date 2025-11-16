import express from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AccountModel } from '../models/Account';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { pool } from '../db/connection';

const router = express.Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

function generateTokens(userId: string, accountId: string, tier: 'free' | 'premium') {
  const jwtSecret = process.env.JWT_SECRET!;
  const refreshSecret = process.env.JWT_REFRESH_SECRET!;
  const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
  const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  const accessToken = jwt.sign(
    { userId, accountId, tier },
    jwtSecret,
    { expiresIn }
  );

  const refreshToken = jwt.sign(
    { userId, accountId, tier },
    refreshSecret,
    { expiresIn: refreshExpiresIn }
  );

  return { accessToken, refreshToken };
}

// POST /api/v1/auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password } = signupSchema.parse(req.body);

    // Check if email exists
    const existing = await AccountModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({
        status: 'error',
        message: 'Email already registered'
      });
    }

    // Create account
    const account = await AccountModel.create({ email, password });

    const { accessToken, refreshToken } = generateTokens(
      account.id,
      account.id,
      account.tier
    );

    res.status(201).json({
      status: 'success',
      data: {
        account: {
          id: account.id,
          email: account.email,
          tier: account.tier
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: error.errors
      });
    }
    next(error);
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const account = await AccountModel.findByEmail(email);
    if (!account) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    const isValid = await AccountModel.verifyPassword(account, password);
    if (!isValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    const { accessToken, refreshToken } = generateTokens(
      account.id,
      account.id,
      account.tier
    );

    res.json({
      status: 'success',
      data: {
        account: {
          id: account.id,
          email: account.email,
          tier: account.tier
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: error.errors
      });
    }
    next(error);
  }
});

// POST /api/v1/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Refresh token required'
      });
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET!;
    const decoded = jwt.verify(refreshToken, refreshSecret) as {
      userId: string;
      accountId: string;
      tier: 'free' | 'premium';
    };

    const account = await AccountModel.findById(decoded.accountId);
    if (!account) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token'
      });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      account.id,
      account.id,
      account.tier
    );

    res.json({
      status: 'success',
      data: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token'
      });
    }
    next(error);
  }
});

// DELETE /api/v1/auth/account
router.delete('/account', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.accountId) {
      throw new AppError('Unauthorized', 401);
    }

    await AccountModel.delete(req.accountId);

    res.json({
      status: 'success',
      message: 'Account deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;

