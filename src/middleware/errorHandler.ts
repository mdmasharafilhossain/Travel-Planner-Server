import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';  

export interface ErrorResponse {
  success: false;
  message: string;
  error?: any;
  stack?: string;
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Zod validation error handle
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    error = new AppError(formattedErrors || 'Validation failed', 400);
  }

  // Prisma Known Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        error = new AppError('Duplicate field value entered', 400);
        break;
      case 'P2025':
        error = new AppError('Record not found', 404);
        break;
      case 'P2003':
        error = new AppError('Foreign key constraint failed', 400);
        break;
      default:
        error = new AppError('Database error occurred', 500);
        break;
    }
  }

  // Prisma Unknown Errors
  if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    error = new AppError('Database connection error', 503);
  }

  // Prisma Validation Errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    error = new AppError('Invalid data provided', 400);
  }

  // Mongoose duplicate key
  if ((err as any).code === 11000) {
    const message = 'Duplicate field value entered';
    error = new AppError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values((err as any).errors)
      .map((val: any) => val.message)
      .join(', ');
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expired', 401);
  }

  // CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, 404);
  }

  const statusCode = (error as AppError).statusCode || 500;
  const message = error.message || 'Internal Server Error';

  const errorResponse: ErrorResponse = {
    success: false,
    message
  };

  
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.error = err;
  }

  res.status(statusCode).json(errorResponse);
};
