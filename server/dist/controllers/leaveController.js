"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeaves = getLeaves;
exports.getEmployeeLeaveBalance = getEmployeeLeaveBalance;
exports.requestLeave = requestLeave;
exports.approveLeave = approveLeave;
exports.rejectLeave = rejectLeave;
const db_1 = __importDefault(require("../config/db"));
const response_1 = require("../utils/response");
const schemas_1 = require("../validators/schemas");
const audit_1 = require("../middleware/audit");
const rbacService_1 = require("../services/rbacService");
const payrollService_1 = require("../services/payrollService");
async function getLeaves(req, res) {
    try {
        if (!req.user)
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        const { status, employeeId, year } = req.query;
        let baseWhere = {};
        if (status)
            baseWhere.status = status;
        if (employeeId)
            baseWhere.employeeId = employeeId;
        // Apply strict database-level RBAC filtering
        const where = await (0, rbacService_1.buildLeaveWhereClause)(req.user, baseWhere);
        const leaveRequests = await db_1.default.leaveRequest.findMany({
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
        const leaveTypes = await db_1.default.leaveType.findMany();
        return (0, response_1.sendSuccess)(res, {
            requests: leaveRequests,
            leaveTypes,
        });
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 500);
    }
}
async function getEmployeeLeaveBalance(req, res) {
    try {
        if (!req.user)
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        const { id } = req.params; // employeeId or uuid
        const currentYear = new Date().getFullYear();
        const emp = await db_1.default.employee.findFirst({
            where: { OR: [{ id }, { employeeId: id }] },
        });
        if (!emp) {
            return (0, response_1.sendError)(res, 'Employee not found', 404);
        }
        // RBAC Security Check
        const hasAccess = await (0, rbacService_1.canAccessEmployee)(req.user, emp.id);
        if (!hasAccess) {
            return (0, response_1.sendError)(res, 'Access denied: You cannot view this employee leave balance', 403);
        }
        const balances = await db_1.default.leaveBalance.findMany({
            where: { employeeId: emp.id, year: currentYear },
            include: { leaveType: true },
        });
        return (0, response_1.sendSuccess)(res, balances);
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 500);
    }
}
async function requestLeave(req, res) {
    try {
        if (!req.user)
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        const validated = schemas_1.leaveRequestSchema.parse(req.body);
        const { employeeId, leaveTypeId, startDate, endDate, totalDays, reason } = validated;
        const emp = await db_1.default.employee.findFirst({
            where: { OR: [{ id: employeeId }, { employeeId }] },
        });
        if (!emp) {
            return (0, response_1.sendError)(res, 'Employee not found', 404);
        }
        // Employees can apply only for themselves; HR/Super Admin can apply on behalf
        const hasAccess = await (0, rbacService_1.canAccessEmployee)(req.user, emp.id);
        if (!hasAccess) {
            return (0, response_1.sendError)(res, 'Access denied: You cannot submit leave for this employee', 403);
        }
        // Check balance
        const currentYear = new Date().getFullYear();
        const balance = await db_1.default.leaveBalance.findUnique({
            where: {
                employeeId_leaveTypeId_year: {
                    employeeId: emp.id,
                    leaveTypeId,
                    year: currentYear,
                },
            },
        });
        if (balance && balance.remainingDays < totalDays) {
            const leaveType = await db_1.default.leaveType.findUnique({ where: { id: leaveTypeId } });
            if (leaveType && leaveType.code !== 'LOP') {
                return (0, response_1.sendError)(res, `Insufficient leave balance. Available: ${balance.remainingDays} days.`, 400);
            }
        }
        const newLeave = await db_1.default.leaveRequest.create({
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
        await (0, audit_1.logAuditAction)(req.user?.userId, 'LEAVE', 'CREATE', newLeave.id, { employeeId: emp.employeeId, days: totalDays, type: newLeave.leaveType?.code || 'LEAVE' }, req.ip);
        return (0, response_1.sendSuccess)(res, newLeave, 'Leave application submitted successfully', undefined, 201);
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 400);
    }
}
async function approveLeave(req, res) {
    try {
        if (!req.user || !['SUPER_ADMIN', 'ADMIN', 'HR', 'SITE_MANAGER', 'SUPERVISOR'].includes(req.user.role)) {
            return (0, response_1.sendError)(res, 'Access denied: You do not have permission to approve leaves', 403);
        }
        const { id } = req.params;
        const { notes } = req.body;
        const leave = await db_1.default.leaveRequest.findUnique({
            where: { id },
            include: { employee: true, leaveType: true },
        });
        if (!leave) {
            return (0, response_1.sendError)(res, 'Leave request not found', 404);
        }
        // RBAC check: Must manage or supervise this employee
        const hasAccess = await (0, rbacService_1.canAccessEmployee)(req.user, leave.employeeId);
        if (!hasAccess) {
            return (0, response_1.sendError)(res, 'Access denied: You are not authorized to approve leave for this employee', 403);
        }
        if (leave.status !== 'PENDING') {
            return (0, response_1.sendError)(res, `Leave request is already ${leave.status}`, 400);
        }
        // 1. Update Leave Request
        const updated = await db_1.default.leaveRequest.update({
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
        const balance = await db_1.default.leaveBalance.findUnique({
            where: {
                employeeId_leaveTypeId_year: {
                    employeeId: leave.employeeId,
                    leaveTypeId: leave.leaveTypeId,
                    year: currentYear,
                },
            },
        });
        if (balance) {
            await db_1.default.leaveBalance.update({
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
            await db_1.default.attendance.upsert({
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
            await (0, payrollService_1.syncEmployeePayslipFromAttendance)(leave.employeeId, leave.startDate);
            const startM = new Date(leave.startDate).getMonth();
            const endM = new Date(leave.endDate).getMonth();
            if (startM !== endM) {
                await (0, payrollService_1.syncEmployeePayslipFromAttendance)(leave.employeeId, leave.endDate);
            }
        }
        catch (syncErr) {
            console.warn('Payslip auto-sync on leave approval failed:', syncErr);
        }
        // Notify employee
        const empUser = await db_1.default.user.findFirst({ where: { employeeId: leave.employee.employeeId } });
        if (empUser) {
            await db_1.default.notification.create({
                data: {
                    userId: empUser.id,
                    title: 'Leave Approved',
                    message: `Your leave request for ${leave.startDate} to ${leave.endDate} has been approved.`,
                    type: 'SUCCESS',
                    link: '/leaves',
                },
            });
        }
        await (0, audit_1.logAuditAction)(req.user?.userId, 'LEAVE', 'APPROVE', leave.id, { employeeId: leave.employee.employeeId, days: leave.totalDays }, req.ip);
        return (0, response_1.sendSuccess)(res, updated, 'Leave approved and attendance updated automatically');
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 400);
    }
}
async function rejectLeave(req, res) {
    try {
        if (!req.user || !['SUPER_ADMIN', 'ADMIN', 'HR', 'SITE_MANAGER', 'SUPERVISOR'].includes(req.user.role)) {
            return (0, response_1.sendError)(res, 'Access denied: You do not have permission to reject leaves', 403);
        }
        const { id } = req.params;
        const { notes } = req.body;
        const leave = await db_1.default.leaveRequest.findUnique({
            where: { id },
            include: { employee: true },
        });
        if (!leave)
            return (0, response_1.sendError)(res, 'Leave request not found', 404);
        const hasAccess = await (0, rbacService_1.canAccessEmployee)(req.user, leave.employeeId);
        if (!hasAccess) {
            return (0, response_1.sendError)(res, 'Access denied: You are not authorized to reject leave for this employee', 403);
        }
        const updated = await db_1.default.leaveRequest.update({
            where: { id },
            data: {
                status: 'REJECTED',
                approvedById: req.user?.userId || null,
                approvalNotes: notes || 'Rejected',
                actionedAt: new Date(),
            },
        });
        await (0, audit_1.logAuditAction)(req.user?.userId, 'LEAVE', 'REJECT', leave.id, { employeeId: leave.employee.employeeId, reason: notes }, req.ip);
        return (0, response_1.sendSuccess)(res, updated, 'Leave request marked as rejected');
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 400);
    }
}
