import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../config/db';
import { sendError, sendSuccess } from '../utils/response';
import {
  buildEmployeeWhereClause,
  buildAttendanceWhereClause,
  buildLeaveWhereClause,
  buildDocumentWhereClause,
} from '../services/rbacService';

export async function getReportData(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const { type, startDate, endDate, siteId, departmentId, month, year, status } = req.query as Record<string, string>;

    const todayStr = new Date().toISOString().split('T')[0];

    switch (type) {
      case 'EMPLOYEE_MASTER': {
        let baseWhere: any = {};
        if (siteId) baseWhere.siteId = siteId;
        if (departmentId) baseWhere.departmentId = departmentId;
        if (status) baseWhere.status = status;

        const where = await buildEmployeeWhereClause(req.user, baseWhere);

        const employees = await prisma.employee.findMany({
          where,
          include: { department: true, designation: true, site: true, shift: true },
          orderBy: { employeeId: 'asc' },
        });

        return sendSuccess(res, employees);
      }

      case 'ATTENDANCE_SUMMARY': {
        let baseWhere: any = {};
        if (startDate && endDate) {
          baseWhere.date = { gte: startDate, lte: endDate };
        } else {
          baseWhere.date = todayStr;
        }
        if (siteId) baseWhere.siteId = siteId;
        if (status) baseWhere.status = status;

        const where = await buildAttendanceWhereClause(req.user, baseWhere);

        const attendances = await prisma.attendance.findMany({
          where,
          include: {
            employee: {
              include: { department: true, designation: true, site: true },
            },
            site: true,
          },
          orderBy: [{ date: 'desc' }, { employee: { employeeId: 'asc' } }],
        });

        return sendSuccess(res, attendances);
      }

      case 'LATE_REPORT': {
        let baseWhere: any = { status: 'LATE' };
        if (startDate && endDate) {
          baseWhere.date = { gte: startDate, lte: endDate };
        }
        if (siteId) baseWhere.siteId = siteId;

        const where = await buildAttendanceWhereClause(req.user, baseWhere);

        const records = await prisma.attendance.findMany({
          where,
          include: {
            employee: { include: { department: true, designation: true, site: true } },
            site: true,
          },
          orderBy: { lateMinutes: 'desc' },
        });

        return sendSuccess(res, records);
      }

      case 'OVERTIME_REPORT': {
        let baseWhere: any = { overtimeHours: { gt: 0 } };
        if (startDate && endDate) {
          baseWhere.date = { gte: startDate, lte: endDate };
        }
        if (siteId) baseWhere.siteId = siteId;

        const where = await buildAttendanceWhereClause(req.user, baseWhere);

        const records = await prisma.attendance.findMany({
          where,
          include: {
            employee: { include: { department: true, designation: true, site: true } },
            site: true,
          },
          orderBy: { overtimeHours: 'desc' },
        });

        return sendSuccess(res, records);
      }

      case 'LEAVE_REPORT': {
        let baseWhere: any = {};
        if (status) baseWhere.status = status;

        const where = await buildLeaveWhereClause(req.user, baseWhere);

        const records = await prisma.leaveRequest.findMany({
          where,
          include: {
            employee: { include: { department: true, designation: true, site: true } },
            leaveType: true,
          },
          orderBy: { appliedAt: 'desc' },
        });

        return sendSuccess(res, records);
      }

      case 'BANK_CMP_DISBURSEMENT':
      case 'PAYROLL_REGISTER': {
        if (!['SUPER_ADMIN', 'ADMIN', 'HR'].includes(req.user.role)) {
          return sendError(res, 'Access denied: You do not have permission to view the company payroll register', 403);
        }

        const selectedMonth = month ? parseInt(month, 10) : new Date().getMonth() + 1;
        const selectedYear = year ? parseInt(year, 10) : new Date().getFullYear();

        const payroll = await prisma.payroll.findUnique({
          where: {
            payrollMonth_payrollYear: {
              payrollMonth: selectedMonth,
              payrollYear: selectedYear,
            },
          },
          include: {
            payrollItems: {
              include: {
                employee: {
                  include: { department: true, designation: true, site: true },
                },
              },
              orderBy: { employee: { employeeId: 'asc' } },
            },
          },
        });

        return sendSuccess(res, payroll || { payrollItems: [] });
      }

      case 'DOCUMENT_EXPIRY': {
        const sixtyDaysFromNow = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
        let baseWhere: any = { expiryDate: { lte: sixtyDaysFromNow } };

        const where = await buildDocumentWhereClause(req.user, baseWhere);

        const docs = await prisma.document.findMany({
          where,
          include: {
            employee: {
              include: { department: true, site: true },
            },
          },
          orderBy: { expiryDate: 'asc' },
        });

        return sendSuccess(res, docs);
      }

      case 'NEW_JOINERS': {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        let baseWhere: any = { joiningDate: { gte: thirtyDaysAgo } };

        const where = await buildEmployeeWhereClause(req.user, baseWhere);

        const joiners = await prisma.employee.findMany({
          where,
          include: { department: true, designation: true, site: true },
          orderBy: { joiningDate: 'desc' },
        });

        return sendSuccess(res, joiners);
      }

      case 'EXIT_EMPLOYEES': {
        let baseWhere: any = { status: { in: ['TERMINATED', 'RESIGNED', 'INACTIVE'] } };

        const where = await buildEmployeeWhereClause(req.user, baseWhere);

        const exits = await prisma.employee.findMany({
          where,
          include: { department: true, designation: true, site: true },
          orderBy: { updatedAt: 'desc' },
        });

        return sendSuccess(res, exits);
      }

      default:
        return sendError(res, `Unknown report type: ${type}`, 400);
    }
  } catch (error: any) {
    return sendError(res, error.message, 500);
  }
}
