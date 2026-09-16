import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  meta?: Record<string, any>;
}

export function sendSuccess<T>(res: Response, data: T, message?: string, meta?: Record<string, any>, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
  });
}

export function sendError(res: Response, error: string, statusCode = 400, message?: string) {
  return res.status(statusCode).json({
    success: false,
    message: message || error,
    error,
  });
}
