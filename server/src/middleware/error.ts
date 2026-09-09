import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('🔥 Server Error:', err);

  // Prisma unique constraint error
  if (err.code === 'P2002') {
    const field = err.meta?.target ? `for ${err.meta.target}` : '';
    return sendError(res, `A duplicate record already exists ${field}`, 409);
  }

  // Prisma record not found error
  if (err.code === 'P2025') {
    return sendError(res, 'Requested record was not found in the database', 404);
  }

  // Generic handled or unhandled errors
  const message = err.message || 'An internal server error occurred';
  const statusCode = err.statusCode || 500;

  return sendError(res, message, statusCode);
}
