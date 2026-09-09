import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import prisma from '../config/db';

export async function logAuditAction(
  userId: string | null | undefined,
  module: string,
  action: string,
  recordId?: string | null,
  details?: any,
  ipAddress?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        module,
        action,
        recordId: recordId || null,
        details: typeof details === 'string' ? details : JSON.stringify(details || {}),
        ipAddress: ipAddress || '127.0.0.1',
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
