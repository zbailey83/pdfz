import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode?: number;
  code?: string;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode || 500;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  console.error('Error:', {
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

