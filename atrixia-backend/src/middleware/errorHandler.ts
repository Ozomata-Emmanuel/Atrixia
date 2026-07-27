import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/error';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      status: err.statusCode
    });
  }

  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    status: 500
  });
};
