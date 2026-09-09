import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../config/db';
import { sendError, sendSuccess } from '../utils/response';
import { leaveRequestSchema } from '../validators/schemas';
import { logAuditAction } from '../middleware/audit';
import {
  buildLeaveWhereClause,
  canAccessEmployee,
} from '../services/rbacService';
import { syncEmployeePayslipFromAttendance } from '../services/payrollService';

export async function getLeaves(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const { status, employeeId, year } = req.query as Record<string, string>;

    let baseWhere: any = {};
    if (status) baseWhere.status = status;
    if (employeeId) baseWhere.employeeId = employeeId;

    // Apply strict database-level RBAC filtering
    const where = await buildLeaveWhereClause(req.user, baseWhere);

    const leaveRequests = await prisma.leaveRequest.findMany({
      where,
      orderBy: { appliedAt: 'desc' },
      include: {
        employee: {
          include: {
            department: true,
            designation: true,
            site: true,
          },
        },
        leaveType: true,
      },
    });

    const leaveTypes = await prisma.leaveType.findMany();

    return sendSuccess(res, {
      requests: leaveRequests,
      leaveTypes,
    });
  } catch (error: any) {
    return sendError(res, error.message, 500);
  }
}

export async function getEmployeeLeaveBalance(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const { id } = req.params; // employeeId or uuid
    const currentYear = new Date().getFullYear();

    const emp = await prisma.employee.findFirst({
      where: { OR: [{ id }, { employeeId: id }] },
    });

    if (!emp) {
      return sendError(res, 'Employee not found', 404);
    }

    // RBAC Security Check
    const hasAccess = await canAccessEmployee(req.user, emp.id);
    if (!hasAccess) {
      return sendError(res, 'Access denied: You cannot view this employee leave balance', 403);
    }

    const balances = await prisma.leaveBalance.findMany({
      where: { employeeId: emp.id, year: currentYear },
      include: { leaveType: true },
    });

    return sendSuccess(res, balances);
  } catch (error: any) {
    return sendError(res, error.message, 500);
  }
}

export async function requestLeave(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const validated = leaveRequestSchema.parse(req.body);
    const { employeeId, leaveTypeId, startDate, endDate, totalDays, reason } = validated;

    const emp = await prisma.employee.findFirst({
      where: { OR: [{ id: employeeId }, { employeeId }] },
    });

    if (!emp) {
      return sendError(res, 'Employee not found', 404);
    }

    // Employees can apply only for themselves; HR/Super Admin can apply on behalf
    const hasAccess = await canAccessEmployee(req.user, emp.id);
    if (!hasAccess) {
      return sendError(res, 'Access denied: You cannot submit leave for this employee', 403);
    }

    // Check balance
    const currentYear = new Date().getFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: emp.id,
          leaveTypeId,
          year: currentYear,
        },
      },
    });

    if (balance && balance.remainingDays < totalDays) {
      const leaveType = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
      if (leaveType && leaveType.code !== 'LOP') {
        return sendError(res, `Insufficient leave balance. Available: ${balance.remainingDays} days.`, 400);
      }
    }

    const newLeave = await prisma.leaveRequest.create({
      data: {
        employeeId: emp.id,
        leaveTypeId,
        startDate: startDate,
        endDate: endDate,
        totalDays,
        reason,
        status: 'PENDING',
      },
      include: {
        employee: {
          include: { department: true, designation: true },
        },
        leaveType: true,
      },
    });

    await logAuditAction(
      req.user?.userId,
      'LEAVE',
      'CREATE',
      newLeave.id,
      { employeeId: emp.employeeId, days: totalDays, type: newLeave.leaveType?.code || 'LEAVE' },
      req.ip
    );

    return sendSuccess(res, newLeave, 'Leave application submitted successfully', undefined, 201);
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
}

export async function approveLeave(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || !['SUPER_ADMIN', 'ADMIN', 'HR', 'SITE_MANAGER', 'SUPERVISOR'].includes(req.user.role)) {
      return sendError(res, 'Access denied: You do not have permission to approve leaves', 403);
    }

    const { id } = req.params;
    const { notes } = req.body;

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true, leaveType: true },
    });

    if (!leave) {
      return sendError(res, 'Leave request not found', 404);
    }

    // RBAC check: Must manage or supervise this employee
    const hasAccess = await canAccessEmployee(req.user, leave.employeeId);
    if (!hasAccess) {
      return sendError(res, 'Access denied: You are not authorized to approve leave for this employee', 403);
    }

    if (leave.status !== 'PENDING') {
      return sendError(res, `Leave request is already ${leave.status}`, 400);
    }

    // 1. Update Leave Request
    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: req.user?.userId || null,
        approvalNotes: notes || 'Approved by HR/Supervisor',
        actionedAt: new Date(),
      },
    });

    // 2. Deduct from Leave Balance
    const currentYear = new Date().getFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: leave.employeeId,
          leaveTypeId: leave.leaveTypeId,
          year: currentYear,
        },
      },
    });

    if (balance) {
      await prisma.leaveBalance.update({
        where: { id: balance.id },
        data: {
          usedDays: balance.usedDays + leave.totalDays,
          remainingDays: Math.max(0, balance.remainingDays - leave.totalDays),
        },
      });
    }

    // 3. Automatically sync to Attendance table for the date range
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: leave.employeeId,
            date: dateStr,
          },
        },
        update: {
          status: 'LEAVE',
          remarks: `Approved Leave: ${leave.leaveType.name}`,
          workingHours: 0,
          lateMinutes: 0,
          overtimeHours: 0,
        },
        create: {
          employeeId: leave.employeeId,
          siteId: leave.employee.siteId,
          date: dateStr,
          status: 'LEAVE',
          remarks: `Approved Leave: ${leave.leaveType.name}`,
          markedBy: 'SYSTEM',
        },
      });
    }

    // ⚡ Real-Time Auto-Sync: Automatically update employee payslip as per attendance without manual approval
    try {
      await syncEmployeePayslipFromAttendance(leave.employeeId, leave.startDate);
      const startM = new Date(leave.startDate).getMonth();
      const endM = new Date(leave.endDate).getMonth();
      if (startM !== endM) {
        await syncEmployeePayslipFromAttendance(leave.employeeId, leave.endDate);
      }
    } catch (syncErr) {
      console.warn('Payslip auto-sync on leave approval failed:', syncErr);
    }

    // Notify employee
    const empUser = await prisma.user.findFirst({ where: { employeeId: leave.employee.employeeId } });
    if (empUser) {
      await prisma.notification.create({
        data: {
          userId: empUser.id,
          title: 'Leave Approved',
          message: `Your leave request for ${leave.startDate} to ${leave.endDate} has been approved.`,
          type: 'SUCCESS',
          link: '/leaves',
        },
      });
    }

    await logAuditAction(req.user?.userId, 'LEAVE', 'APPROVE', leave.id, { employeeId: leave.employee.employeeId, days: leave.totalDays }, req.ip);

    return sendSuccess(res, updated, 'Leave approved and attendance updated automatically');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
}

export async function rejectLeave(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || !['SUPER_ADMIN', 'ADMIN', 'HR', 'SITE_MANAGER', 'SUPERVISOR'].includes(req.user.role)) {
      return sendError(res, 'Access denied: You do not have permission to reject leaves', 403);
    }

    const { id } = req.params;
    const { notes } = req.body;

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!leave) return sendError(res, 'Leave request not found', 404);

    const hasAccess = await canAccessEmployee(req.user, leave.employeeId);
    if (!hasAccess) {
      return sendError(res, 'Access denied: You are not authorized to reject leave for this employee', 403);
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: req.user?.userId || null,
        approvalNotes: notes || 'Rejected',
        actionedAt: new Date(),
      },
    });

    await logAuditAction(req.user?.userId, 'LEAVE', 'REJECT', leave.id, { employeeId: leave.employee.employeeId, reason: notes }, req.ip);

    return sendSuccess(res, updated, 'Leave request marked as rejected');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
}
