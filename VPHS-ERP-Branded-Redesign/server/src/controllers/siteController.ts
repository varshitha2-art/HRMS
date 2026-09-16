import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../config/db';
import { sendError, sendSuccess } from '../utils/response';
import { siteCreateSchema } from '../validators/schemas';
import { logAuditAction } from '../middleware/audit';
import {
  buildSiteWhereClause,
  getAccessibleSiteIds,
} from '../services/rbacService';
import { syncAllSiteEmployeesPayslips } from '../services/payrollService';

export async function getSites(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const { status, search } = req.query as Record<string, string>;

    let baseWhere: any = {};
    if (status) baseWhere.status = status;
    if (search) {
      baseWhere.OR = [
        { siteName: { contains: search } },
        { siteCode: { contains: search } },
        { clientName: { contains: search } },
        { location: { contains: search } },
      ];
    }

    // Apply strict database-level RBAC filtering
    const where = await buildSiteWhereClause(req.user, baseWhere);

    const sites = await prisma.site.findMany({
      where,
      orderBy: { siteName: 'asc' },
      include: {
        _count: {
          select: { employees: true, attendances: true },
        },
        employees: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            designation: { select: { title: true } },
            department: { select: { name: true } },
            status: true,
          },
        },
      },
    });

    return sendSuccess(res, sites);
  } catch (error: any) {
    return sendError(res, error.message, 500);
  }
}

export async function getSiteById(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const { id } = req.params;

    const accessibleSiteIds = await getAccessibleSiteIds(req.user);
    if (accessibleSiteIds !== 'ALL') {
      const siteCheck = await prisma.site.findFirst({
        where: { OR: [{ id }, { siteCode: id }] },
        select: { id: true },
      });
      if (!siteCheck || !accessibleSiteIds.includes(siteCheck.id)) {
        return sendError(res, 'Access denied: You do not have permission to view this client site', 403);
      }
    }

    const site = await prisma.site.findFirst({
      where: { OR: [{ id }, { siteCode: id }] },
      include: {
        employees: {
          include: {
            designation: true,
            department: true,
            shift: true,
          },
        },
        siteAssignments: {
          include: { employee: true },
        },
        holidays: true,
      },
    });

    if (!site) {
      return sendError(res, 'Site not found', 404);
    }

    return sendSuccess(res, site);
  } catch (error: any) {
    return sendError(res, error.message, 500);
  }
}

export async function createSite(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || !['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
      return sendError(res, 'Access denied: Insufficient permissions to create sites', 403);
    }

    const validated = siteCreateSchema.parse(req.body);

    const existing = await prisma.site.findUnique({
      where: { siteCode: validated.siteCode },
    });
    if (existing) {
      return sendError(res, `Site code ${validated.siteCode} already exists`, 409);
    }

    const site = await prisma.site.create({
      data: {
        ...validated,
        contractStartDate: validated.contractStartDate ? new Date(validated.contractStartDate) : null,
        contractEndDate: validated.contractEndDate ? new Date(validated.contractEndDate) : null,
      },
    });

    await logAuditAction(req.user?.userId, 'SITE', 'CREATE', site.id, { siteCode: site.siteCode, name: site.siteName }, req.ip);

    return sendSuccess(res, site, 'Site created successfully', undefined, 201);
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
}

export async function updateSite(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || !['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
      return sendError(res, 'Access denied: Insufficient permissions to update sites', 403);
    }

    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.contractStartDate) updateData.contractStartDate = new Date(updateData.contractStartDate);
    if (updateData.contractEndDate) updateData.contractEndDate = new Date(updateData.contractEndDate);

    const site = await prisma.site.update({
      where: { id },
      data: updateData,
    });

    await logAuditAction(req.user?.userId, 'SITE', 'UPDATE', site.id, { siteCode: site.siteCode }, req.ip);

    return sendSuccess(res, site, 'Site updated successfully');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
}

export async function deleteSite(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'SUPER_ADMIN') {
      return sendError(res, 'Access denied: Only Super Admin can deactivate sites', 403);
    }

    const { id } = req.params;
    await prisma.site.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    await logAuditAction(req.user?.userId, 'SITE', 'DELETE', id, { status: 'INACTIVE' }, req.ip);

    return sendSuccess(res, null, 'Site status set to INACTIVE');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
}

export async function assignEmployeeToSite(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || !['SUPER_ADMIN', 'ADMIN', 'HR', 'SITE_MANAGER'].includes(req.user.role)) {
      return sendError(res, 'Access denied', 403);
    }

    const { id } = req.params; // siteId
    const { employeeId, roleAtSite } = req.body;

    const [emp, site] = await Promise.all([
      prisma.employee.findUnique({ where: { id: employeeId } }),
      prisma.site.findUnique({ where: { id } }),
    ]);

    if (!emp || !site) {
      return sendError(res, 'Employee or Site not found', 404);
    }

    // Update employee primary site
    await prisma.employee.update({
      where: { id: employeeId },
      data: { siteId: id },
    });

    // Create assignment record
    const assignment = await prisma.siteAssignment.create({
      data: {
        siteId: id,
        employeeId: employeeId,
        roleAtSite: roleAtSite || 'Staff Member',
        status: 'ACTIVE',
      },
    });

    await logAuditAction(req.user?.userId, 'SITE', 'UPDATE', id, { action: 'Assigned employee', employeeId }, req.ip);

    return sendSuccess(res, assignment, 'Employee assigned to site successfully');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
}

export async function updateSiteRateCard(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || !['SUPER_ADMIN', 'ADMIN', 'HR'].includes(req.user.role)) {
      return sendError(res, 'Access denied: Insufficient permissions to update site rate cards', 403);
    }

    const { id } = req.params;
    const { rateCard } = req.body;

    const rateCardJson = typeof rateCard === 'string' ? rateCard : JSON.stringify(rateCard);

    const site = await prisma.site.update({
      where: { id },
      data: {
        rateCardJson,
      },
    });

    await logAuditAction(req.user?.userId, 'SITE', 'UPDATE', site.id, { action: 'Updated Site Statutory Rate Card', siteCode: site.siteCode }, req.ip);

    // ⚡ Real-Time Auto-Sync: Refresh all employees' payslips for this site to reflect the new rate card automatically
    try {
      await syncAllSiteEmployeesPayslips(site.id);
    } catch (syncErr) {
      console.warn('Payslip auto-sync on site rate card update failed:', syncErr);
    }

    return sendSuccess(res, { id: site.id, siteCode: site.siteCode, siteName: site.siteName, rateCard: rateCard }, 'Site statutory rate card updated successfully');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
}

export async function getSiteRateCard(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const { id } = req.params;
    const site = await prisma.site.findUnique({
      where: { id },
      select: { id: true, siteCode: true, siteName: true, clientName: true, rateCardJson: true, billingRate: true },
    });

    if (!site) return sendError(res, 'Site not found', 404);

    let rateCard = null;
    if (site.rateCardJson) {
      try {
        rateCard = JSON.parse(site.rateCardJson);
      } catch (e) {
        rateCard = null;
      }
    }

    return sendSuccess(res, { ...site, rateCard });
  } catch (error: any) {
    return sendError(res, error.message, 500);
  }
}
