import { Request, Response } from 'express';
import prisma from '../config/db';
import { comparePassword, signToken } from '../utils/auth';
import { sendError, sendSuccess } from '../utils/response';
import { loginSchema } from '../validators/schemas';
import { logAuditAction } from '../middleware/audit';
import { AuthenticatedRequest } from '../middleware/auth';
import { getAccessibleSiteIds } from '../services/rbacService';

const USERNAME_ALIASES: Record<string, string> = {
  rahul: 'rahul',
  'k.rahul': 'rahul',
  'rahul.kumar': 'rahul',
  'k.rahul kumar': 'rahul',
  super_admin: 'rahul',
  superadmin: 'rahul',
  admin: 'admin',
  richardson: 'richardson',
  supriya: 'supriya',
  hr_admin: 'supriya',
  'supriya.gundreddy': 'supriya',
  hr: 'supriya',
  gous: 'gous',
  site_manager: 'gous',
  'abdul.gous': 'gous',
  prithviraj: 'prithviraj',
  supervisor: 'prithviraj',
  'prithviraj.heerekar': 'prithviraj',
  sairam: 'vphs0040',
  rehan: 'vphs0050',
  ramarajyam: 'vphs0010',
  employee: 'vphs0040',
};

const ROLE_DEMO_USERS: Record<string, string> = {
  SUPER_ADMIN: 'rahul',
  HR: 'supriya',
  SITE_MANAGER: 'gous',
  SUPERVISOR: 'prithviraj',
  EMPLOYEE: 'vphs0040',
};

export async function login(req: Request, res: Response) {
  try {
    const validated = loginSchema.parse(req.body);
    const { username, password } = validated;
    const cleanUsername = username.trim();
    const effectiveUsername = USERNAME_ALIASES[cleanUsername.toLowerCase()] || cleanUsername;

    // Search by username or employeeId or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: effectiveUsername },
          { username: cleanUsername },
          { employeeId: cleanUsername },
          { email: cleanUsername },
          { employee: { employeeId: cleanUsername } },
        ],
      },
      include: {
        employee: {
          include: {
            designation: true,
            department: true,
            site: true,
            shift: true,
            siteAssignments: { where: { status: 'ACTIVE' }, include: { site: true } },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return sendError(res, 'Invalid credentials or inactive account', 401);
    }

    const isValid = comparePassword(password, user.passwordHash);
    if (!isValid) {
      return sendError(res, 'Invalid credentials', 401);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = signToken({
      userId: user.id,
      username: user.username,
      employeeId: user.employeeId,
      role: user.role,
      email: user.email,
    });

    const accessibleSites = await getAccessibleSiteIds({
      id: user.id,
      userId: user.id,
      username: user.username,
      employeeId: user.employeeId,
      role: user.role,
      email: user.email,
      employee: user.employee,
    });

    await logAuditAction(user.id, 'AUTH', 'LOGIN', user.id, { username: user.username, role: user.role }, req.ip);

    return sendSuccess(res, {
      token,
      user: {
        id: user.id,
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        department: user.employee?.department?.name || 'General',
        assignedSites: accessibleSites,
        employee: user.employee,
      },
    }, 'Login successful');
  } catch (error: any) {
    return sendError(res, error.message || 'Login failed', 400);
  }
}

export async function quickDemoLogin(req: Request, res: Response) {
  try {
    const { role, username: targetUsername } = req.body;
    let user;

    if (targetUsername) {
      const cleanTarget = targetUsername.trim();
      const mapped = USERNAME_ALIASES[cleanTarget.toLowerCase()] || cleanTarget;
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: mapped },
            { username: cleanTarget },
            { employeeId: cleanTarget },
          ],
          isActive: true,
        },
        include: {
          employee: {
            include: {
              designation: true,
              department: true,
              site: true,
              shift: true,
              siteAssignments: { where: { status: 'ACTIVE' }, include: { site: true } },
            },
          },
        },
      });
    }

    if (!user && role) {
      const targetUser = ROLE_DEMO_USERS[role];
      if (targetUser) {
        user = await prisma.user.findFirst({
          where: { username: targetUser, isActive: true },
          include: {
            employee: {
              include: {
                designation: true,
                department: true,
                site: true,
                shift: true,
                siteAssignments: { where: { status: 'ACTIVE' }, include: { site: true } },
              },
            },
          },
        });
      }
    }

    if (!user) {
      user = await prisma.user.findFirst({
        where: { role: role || 'SUPER_ADMIN', isActive: true },
        include: {
          employee: {
            include: {
              designation: true,
              department: true,
              site: true,
              shift: true,
              siteAssignments: { where: { status: 'ACTIVE' }, include: { site: true } },
            },
          },
        },
      });
    }

    if (!user) {
      return sendError(res, `No active demo user found for role ${role}`, 404);
    }

    const token = signToken({
      userId: user.id,
      username: user.username,
      employeeId: user.employeeId,
      role: user.role,
      email: user.email,
    });

    const accessibleSites = await getAccessibleSiteIds({
      id: user.id,
      userId: user.id,
      username: user.username,
      employeeId: user.employeeId,
      role: user.role,
      email: user.email,
      employee: user.employee,
    });

    await logAuditAction(user.id, 'AUTH', 'LOGIN', user.id, { username: user.username, role: user.role, isQuickDemo: true }, req.ip);

    return sendSuccess(res, {
      token,
      user: {
        id: user.id,
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        department: user.employee?.department?.name || 'General',
        assignedSites: accessibleSites,
        employee: user.employee,
      },
    }, 'Demo login successful');
  } catch (error: any) {
    return sendError(res, error.message, 500);
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        employee: {
          include: {
            designation: true,
            department: true,
            site: true,
            shift: true,
            siteAssignments: { where: { status: 'ACTIVE' }, include: { site: true } },
          },
        },
      },
    });

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    const accessibleSites = await getAccessibleSiteIds({
      id: user.id,
      userId: user.id,
      username: user.username,
      employeeId: user.employeeId,
      role: user.role,
      email: user.email,
      employee: user.employee,
    });

    return sendSuccess(res, {
      id: user.id,
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      department: user.employee?.department?.name || 'General',
      assignedSites: accessibleSites,
      employee: user.employee,
      lastLogin: user.lastLogin,
    });
  } catch (error: any) {
    return sendError(res, error.message, 500);
  }
}

export async function logout(req: AuthenticatedRequest, res: Response) {
  if (req.user) {
    await logAuditAction(req.user.userId, 'AUTH', 'LOGOUT', req.user.userId, {}, req.ip);
  }
  return sendSuccess(res, null, 'Logged out successfully');
}
