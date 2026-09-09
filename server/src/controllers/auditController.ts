import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../config/db';
import { sendError, sendSuccess } from '../utils/response';

export async function getAuditLogs(req: AuthenticatedRequest, res: Response) {
  try {
    const { module, action, search, page = '1', limit = '50' } = req.query as Record<string, string>;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (module) where.module = module;
    if (action) where.action = action;
    if (search) {
      where.OR = [
        { details: { contains: search } },
        { user: { username: { contains: search } } },
        { recordId: { contains: search } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, role: true, email: true },
          },
          employee: {
            select: { id: true, employeeId: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return sendSuccess(res, logs, undefined, {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error: any) {
    return sendError(res, error.message, 500);
  }
}
