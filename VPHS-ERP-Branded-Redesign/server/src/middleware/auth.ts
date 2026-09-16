import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/auth';
import { sendError } from '../utils/response';
import prisma from '../config/db';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload & {
    id: string;
    employee?: any;
  };
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication token missing or invalid', 401);
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    let employee: any = null;
    if (payload.employeeId) {
      employee = await prisma.employee.findUnique({
        where: { employeeId: payload.employeeId },
        include: {
          siteAssignments: { where: { status: 'ACTIVE' } },
          department: true,
          designation: true,
          site: true,
        },
      });
    }

    req.user = {
      ...payload,
      id: payload.userId,
      employee,
    };

    next();
  } catch (error: any) {
    return sendError(res, 'Session expired or invalid token', 401);
  }
}

export function requireRoles(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    // SUPER_ADMIN has access to everything
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`, 403);
    }

    next();
  };
}
