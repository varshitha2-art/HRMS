"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReportData = getReportData;
const db_1 = __importDefault(require("../config/db"));
const response_1 = require("../utils/response");
const rbacService_1 = require("../services/rbacService");
async function getReportData(req, res) {
    try {
        if (!req.user)
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        const { type, startDate, endDate, siteId, departmentId, month, year, status } = req.query;
        const todayStr = new Date().toISOString().split('T')[0];
        switch (type) {
            case 'EMPLOYEE_MASTER': {
                let baseWhere = {};
                if (siteId)
                    baseWhere.siteId = siteId;
                if (departmentId)
                    baseWhere.departmentId = departmentId;
                if (status)
                    baseWhere.status = status;
                const where = await (0, rbacService_1.buildEmployeeWhereClause)(req.user, baseWhere);
                const employees = await db_1.default.employee.findMany({
                    where,
                    include: { department: true, designation: true, site: true, shift: true },
                    orderBy: { employeeId: 'asc' },
                });
                return (0, response_1.sendSuccess)(res, employees);
            }
            case 'ATTENDANCE_SUMMARY': {
                let baseWhere = {};
                if (startDate && endDate) {
                    baseWhere.date = { gte: startDate, lte: endDate };
                }
                else {
                    baseWhere.date = todayStr;
                }
                if (siteId)
                    baseWhere.siteId = siteId;
                if (status)
                    baseWhere.status = status;
                const where = await (0, rbacService_1.buildAttendanceWhereClause)(req.user, baseWhere);
                const attendances = await db_1.default.attendance.findMany({
                    where,
                    include: {
                        employee: {
                            include: { department: true, designation: true, site: true },
                        },
                        site: true,
                    },
                    orderBy: [{ date: 'desc' }, { employee: { employeeId: 'asc' } }],
                });
                return (0, response_1.sendSuccess)(res, attendances);
            }
            case 'LATE_REPORT': {
                let baseWhere = { status: 'LATE' };
                if (startDate && endDate) {
                    baseWhere.date = { gte: startDate, lte: endDate };
                }
                if (siteId)
                    baseWhere.siteId = siteId;
                const where = await (0, rbacService_1.buildAttendanceWhereClause)(req.user, baseWhere);
                const records = await db_1.default.attendance.findMany({
                    where,
                    include: {
                        employee: { include: { department: true, designation: true, site: true } },
                        site: true,
                    },
                    orderBy: { lateMinutes: 'desc' },
                });
                return (0, response_1.sendSuccess)(res, records);
            }
            case 'OVERTIME_REPORT': {
                let baseWhere = { overtimeHours: { gt: 0 } };
                if (startDate && endDate) {
                    baseWhere.date = { gte: startDate, lte: endDate };
                }
                if (siteId)
                    baseWhere.siteId = siteId;
                const where = await (0, rbacService_1.buildAttendanceWhereClause)(req.user, baseWhere);
                const records = await db_1.default.attendance.findMany({
                    where,
                    include: {
                        employee: { include: { department: true, designation: true, site: true } },
                        site: true,
                    },
                    orderBy: { overtimeHours: 'desc' },
                });
                return (0, response_1.sendSuccess)(res, records);
            }
            case 'LEAVE_REPORT': {
                let baseWhere = {};
                if (status)
                    baseWhere.status = status;
                const where = await (0, rbacService_1.buildLeaveWhereClause)(req.user, baseWhere);
                const records = await db_1.default.leaveRequest.findMany({
                    where,
                    include: {
                        employee: { include: { department: true, designation: true, site: true } },
                        leaveType: true,
                    },
                    orderBy: { appliedAt: 'desc' },
                });
                return (0, response_1.sendSuccess)(res, records);
            }
            case 'BANK_CMP_DISBURSEMENT':
            case 'PAYROLL_REGISTER': {
                if (!['SUPER_ADMIN', 'ADMIN', 'HR'].includes(req.user.role)) {
                    return (0, response_1.sendError)(res, 'Access denied: You do not have permission to view the company payroll register', 403);
                }
                const selectedMonth = month ? parseInt(month, 10) : new Date().getMonth() + 1;
                const selectedYear = year ? parseInt(year, 10) : new Date().getFullYear();
                const payroll = await db_1.default.payroll.findUnique({
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
                return (0, response_1.sendSuccess)(res, payroll || { payrollItems: [] });
            }
            case 'DOCUMENT_EXPIRY': {
                const sixtyDaysFromNow = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
                let baseWhere = { expiryDate: { lte: sixtyDaysFromNow } };
                const where = await (0, rbacService_1.buildDocumentWhereClause)(req.user, baseWhere);
                const docs = await db_1.default.document.findMany({
                    where,
                    include: {
                        employee: {
                            include: { department: true, site: true },
                        },
                    },
                    orderBy: { expiryDate: 'asc' },
                });
                return (0, response_1.sendSuccess)(res, docs);
            }
            case 'NEW_JOINERS': {
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                let baseWhere = { joiningDate: { gte: thirtyDaysAgo } };
                const where = await (0, rbacService_1.buildEmployeeWhereClause)(req.user, baseWhere);
                const joiners = await db_1.default.employee.findMany({
                    where,
                    include: { department: true, designation: true, site: true },
                    orderBy: { joiningDate: 'desc' },
                });
                return (0, response_1.sendSuccess)(res, joiners);
            }
            case 'EXIT_EMPLOYEES': {
                let baseWhere = { status: { in: ['TERMINATED', 'RESIGNED', 'INACTIVE'] } };
                const where = await (0, rbacService_1.buildEmployeeWhereClause)(req.user, baseWhere);
                const exits = await db_1.default.employee.findMany({
                    where,
                    include: { department: true, designation: true, site: true },
                    orderBy: { updatedAt: 'desc' },
                });
                return (0, response_1.sendSuccess)(res, exits);
            }
            default:
                return (0, response_1.sendError)(res, `Unknown report type: ${type}`, 400);
        }
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 500);
    }
}
