"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPayrolls = getPayrolls;
exports.getPayrollById = getPayrollById;
exports.generatePayroll = generatePayroll;
exports.approvePayroll = approvePayroll;
exports.getPayslip = getPayslip;
exports.getMyPayslips = getMyPayslips;
exports.calculateStructureHandler = calculateStructureHandler;
exports.applyCalculatorStructure = applyCalculatorStructure;
const db_1 = __importDefault(require("../config/db"));
const response_1 = require("../utils/response");
const schemas_1 = require("../validators/schemas");
const payrollService_1 = require("../services/payrollService");
const audit_1 = require("../middleware/audit");
const rbacService_1 = require("../services/rbacService");
async function getPayrolls(req, res) {
    try {
        if (!req.user || !['SUPER_ADMIN', 'ADMIN', 'HR'].includes(req.user.role)) {
            return (0, response_1.sendError)(res, 'Access denied: You do not have permission to view company payroll', 403);
        }
        const { year } = req.query;
        const where = {};
        if (year)
            where.payrollYear = parseInt(year, 10);
        const payrolls = await db_1.default.payroll.findMany({
            where,
            orderBy: [{ payrollYear: 'desc' }, { payrollMonth: 'desc' }],
            include: {
                _count: {
                    select: { payrollItems: true },
                },
            },
        });
        return (0, response_1.sendSuccess)(res, payrolls);
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 500);
    }
}
async function getPayrollById(req, res) {
    try {
        if (!req.user || !['SUPER_ADMIN', 'ADMIN', 'HR'].includes(req.user.role)) {
            return (0, response_1.sendError)(res, 'Access denied: You do not have permission to view company payroll', 403);
        }
        const { id } = req.params;
        const payroll = await db_1.default.payroll.findUnique({
            where: { id },
            include: {
                payrollItems: {
                    include: {
                        employee: {
                            include: {
                                designation: true,
                                department: true,
                                site: true,
                            },
                        },
                    },
                    orderBy: { employee: { employeeId: 'asc' } },
                },
            },
        });
        if (!payroll) {
            return (0, response_1.sendError)(res, 'Payroll record not found', 404);
        }
        return (0, response_1.sendSuccess)(res, payroll);
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 500);
    }
}
async function generatePayroll(req, res) {
    try {
        if (!req.user || !['SUPER_ADMIN', 'ADMIN', 'HR'].includes(req.user.role)) {
            return (0, response_1.sendError)(res, 'Access denied: You do not have permission to execute payroll generation', 403);
        }
        const validated = schemas_1.payrollGenerateSchema.parse(req.body);
        const { month, year, allowOverwrite = true } = validated;
        const payroll = await (0, payrollService_1.generateMonthlyPayroll)(month, year, req.user?.userId, allowOverwrite);
        await (0, audit_1.logAuditAction)(req.user?.userId, 'PAYROLL', 'GENERATE', payroll.id, { month, year, totalNet: payroll.totalNet, employeesCount: payroll.totalEmployees, status: payroll.status }, req.ip);
        return (0, response_1.sendSuccess)(res, payroll, `Payroll for ${month}/${year} calculated successfully (${payroll.totalEmployees} employees processed)`);
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 400);
    }
}
async function approvePayroll(req, res) {
    try {
        if (!req.user || !['SUPER_ADMIN', 'ADMIN', 'HR'].includes(req.user.role)) {
            return (0, response_1.sendError)(res, 'Access denied: You do not have permission to approve payroll batches', 403);
        }
        const { id } = req.params;
        const { status = 'APPROVED', remarks } = req.body;
        const payroll = await db_1.default.payroll.findUnique({ where: { id } });
        if (!payroll) {
            return (0, response_1.sendError)(res, 'Payroll not found', 404);
        }
        const updated = await db_1.default.payroll.update({
            where: { id },
            data: {
                status,
                approvedById: status === 'APPROVED' ? (req.user?.userId || null) : payroll.approvedById,
                approvedAt: status === 'APPROVED' ? new Date() : payroll.approvedAt,
                remarks: remarks || payroll.remarks,
            },
        });
        // Update all payroll items status to match
        await db_1.default.payrollItem.updateMany({
            where: { payrollId: id },
            data: {
                status: status === 'PAID' ? 'PAID' : status === 'APPROVED' ? 'APPROVED' : 'PENDING'
            },
        });
        await (0, audit_1.logAuditAction)(req.user?.userId, 'PAYROLL', status === 'APPROVED' ? 'APPROVE' : status === 'PAID' ? 'DISBURSE' : 'STATUS_UPDATE', payroll.id, { status, month: payroll.payrollMonth, year: payroll.payrollYear, remarks }, req.ip);
        return (0, response_1.sendSuccess)(res, updated, `Payroll batch marked as ${status}`);
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 400);
    }
}
async function getPayslip(req, res) {
    try {
        if (!req.user)
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        const { itemId } = req.params;
        // RBAC Security Check: Must be the employee itself or an authorized HR/Super Admin
        const hasAccess = await (0, rbacService_1.canAccessPayrollItem)(req.user, itemId);
        if (!hasAccess) {
            return (0, response_1.sendError)(res, 'Access denied: You are not authorized to view this payslip', 403);
        }
        let item = await db_1.default.payrollItem.findUnique({
            where: { id: itemId },
            include: {
                payroll: true,
                employee: {
                    include: {
                        department: true,
                        designation: true,
                        site: true,
                    },
                },
            },
        });
        if (!item) {
            return (0, response_1.sendError)(res, 'Payslip not found', 404);
        }
        // ⚡ Real-Time Auto-Sync: Ensure payslip is always 100% up-to-date with latest attendance without waiting for manual approval
        try {
            const refreshed = await (0, payrollService_1.syncEmployeePayslipFromAttendance)(item.employeeId, item.payroll.payrollMonth, item.payroll.payrollYear);
            if (refreshed) {
                item = refreshed;
            }
        }
        catch (syncErr) {
            console.warn('Live attendance auto-sync skipped during getPayslip:', syncErr);
        }
        const companySetting = await db_1.default.companySetting.findFirst();
        return (0, response_1.sendSuccess)(res, {
            payslip: item,
            company: companySetting,
        });
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 500);
    }
}
async function getMyPayslips(req, res) {
    try {
        if (!req.user?.employeeId && !req.user?.employee?.id) {
            return (0, response_1.sendError)(res, 'Employee account not linked', 400);
        }
        const empId = req.user.employee?.id || (await db_1.default.employee.findUnique({
            where: { employeeId: req.user.employeeId },
            select: { id: true },
        }))?.id;
        if (!empId) {
            return (0, response_1.sendError)(res, 'Employee record not found', 404);
        }
        // Ensure the current month is synced from attendance automatically
        try {
            const now = new Date();
            await (0, payrollService_1.syncEmployeePayslipFromAttendance)(empId, now.getMonth() + 1, now.getFullYear());
        }
        catch (e) {
            // non-blocking
        }
        const payslips = await db_1.default.payrollItem.findMany({
            where: { employeeId: empId },
            include: {
                payroll: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return (0, response_1.sendSuccess)(res, payslips);
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 500);
    }
}
async function calculateStructureHandler(req, res) {
    try {
        const { monthlyCtc, annualCtc, customRules } = req.body;
        let ctc = parseFloat(monthlyCtc);
        if (!ctc && annualCtc) {
            ctc = parseFloat(annualCtc) / 12;
        }
        if (isNaN(ctc) || ctc < 0) {
            return (0, response_1.sendError)(res, 'Valid CTC amount is required', 400);
        }
        const payrollSetting = await db_1.default.payrollSetting.findFirst();
        const result = (0, payrollService_1.calculateSalaryStructure)(ctc, { ...payrollSetting, ...customRules });
        return (0, response_1.sendSuccess)(res, result);
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 500);
    }
}
async function applyCalculatorStructure(req, res) {
    try {
        if (!req.user || !['SUPER_ADMIN', 'ADMIN', 'HR'].includes(req.user.role)) {
            return (0, response_1.sendError)(res, 'Access denied: You do not have permission to apply salary structures', 403);
        }
        const { structure, target = 'ALL', employeeId, siteId, month, year } = req.body;
        if (!structure) {
            return (0, response_1.sendError)(res, 'Salary structure data is required', 400);
        }
        const now = new Date();
        const targetMonth = month ? parseInt(month, 10) : (now.getMonth() + 1);
        const targetYear = year ? parseInt(year, 10) : now.getFullYear();
        // Determine target employees
        let employees = [];
        if (target === 'EMPLOYEE' && employeeId) {
            const emp = await db_1.default.employee.findUnique({
                where: { id: employeeId },
                select: { id: true, employeeId: true, siteId: true },
            });
            if (emp)
                employees = [emp];
        }
        else if (target === 'SITE' && siteId && siteId !== 'ALL') {
            employees = await db_1.default.employee.findMany({
                where: { siteId, status: { in: ['ACTIVE', 'ON_LEAVE'] } },
                select: { id: true, employeeId: true, siteId: true },
            });
        }
        else {
            // ALL or all sites
            employees = await db_1.default.employee.findMany({
                where: { status: { in: ['ACTIVE', 'ON_LEAVE'] } },
                select: { id: true, employeeId: true, siteId: true },
            });
        }
        if (employees.length === 0) {
            return (0, response_1.sendError)(res, 'No employees found matching the target criteria', 404);
        }
        // Cleanly parse all salary components from the calculator payload
        const ctc = parseFloat(structure.ctc) || 0;
        const basic = parseFloat(structure.basic) || 0;
        const da = parseFloat(structure.da) || 0;
        const hra = parseFloat(structure.hra) || 0;
        const conveyance = structure.conveyance !== undefined ? (parseFloat(structure.conveyance) || 0) : 0;
        const medicalAllowance = structure.medicalAllowance !== undefined ? (parseFloat(structure.medicalAllowance) || 0) : 0;
        const specialAllowance = parseFloat(structure.specialAllowance) || 0;
        const uniformAllowance = structure.uniformAllowance !== undefined ? (parseFloat(structure.uniformAllowance) || 0) : 200;
        const leaveWages = structure.leaveWages !== undefined ? (parseFloat(structure.leaveWages) || 0) : (Math.round((parseFloat(structure.grossSalary) || 22783) * 0.125) || 2848);
        const lta = parseFloat(structure.lta) || 0;
        const foodAllowance = parseFloat(structure.foodAllowance) || 0;
        const communicationAllowance = parseFloat(structure.communicationAllowance) || 0;
        const variablePay = parseFloat(structure.variablePay) || 0;
        const otherAllowance = parseFloat(structure.otherAllowance) || 0;
        const grossSalary = structure.grossSalary !== undefined
            ? (parseFloat(structure.grossSalary) || 0)
            : (basic + da + hra + conveyance + medicalAllowance + specialAllowance + lta + foodAllowance + communicationAllowance + variablePay + otherAllowance);
        const employerPf = structure.employerPf !== undefined ? (parseFloat(structure.employerPf) || 0) : Math.round((Math.min(basic + da, 15000) * 13) / 100);
        const employerEsi = structure.employerEsi !== undefined ? (parseFloat(structure.employerEsi) || 0) : (grossSalary <= 21000 ? Math.round((basic + da) * 0.0325) : 0);
        const bonus = structure.bonus !== undefined ? (parseFloat(structure.bonus) || 0) : Math.round(((basic + da) * 8.33) / 100);
        const telanganaLwf = structure.telanganaLwf !== undefined ? (parseFloat(structure.telanganaLwf) || 0) : 0.17;
        const gratuity = parseFloat(structure.gratuity) || 0;
        const insuranceBenefit = parseFloat(structure.insuranceBenefit) || 0;
        const employeePf = structure.employeePf !== undefined ? (parseFloat(structure.employeePf) || 0) : Math.round((Math.min(basic + da, 15000) * 12) / 100);
        const employeeEsi = structure.employeeEsi !== undefined ? (parseFloat(structure.employeeEsi) || 0) : (grossSalary <= 21000 ? Math.round(grossSalary * 0.0075) : 0);
        const professionalTax = structure.professionalTax !== undefined ? (parseFloat(structure.professionalTax) || 0) : (grossSalary > 15000 ? 200 : 0);
        const tdsDeduction = parseFloat(structure.tdsDeduction) || 0;
        const otherDeduction = parseFloat(structure.otherDeduction) || (structure.employeeLwf || 2);
        const totalDeductions = employeePf + employeeEsi + professionalTax + tdsDeduction + otherDeduction;
        const netSalary = structure.netSalary !== undefined ? (parseFloat(structure.netSalary) || 0) : Math.max(0, grossSalary - totalDeductions);
        // If site targeted, update site.rateCardJson
        if (siteId && siteId !== 'ALL') {
            try {
                await db_1.default.site.update({
                    where: { id: siteId },
                    data: {
                        rateCardJson: JSON.stringify({
                            basic,
                            da,
                            hra,
                            conveyance,
                            medicalAllowance,
                            specialAllowance,
                            uniformAllowance,
                            leaveWages,
                            lta,
                            foodAllowance,
                            communicationAllowance,
                            variablePay,
                            otherAllowance,
                            grossSalary,
                            employerPf,
                            employerEsi,
                            bonus,
                            telanganaLwf,
                            gratuity,
                            insuranceBenefit,
                            employeePf,
                            employeeEsi,
                            professionalTax,
                            employeeLwf: 2,
                            tdsDeduction,
                            netSalary,
                            ctc,
                        }),
                    },
                });
            }
            catch (siteErr) {
                console.warn('Could not update site rateCardJson:', siteErr);
            }
        }
        // Update SalaryStructure for each employee and sync payslip
        for (const emp of employees) {
            await db_1.default.salaryStructure.updateMany({
                where: { employeeId: emp.id },
                data: { isCurrent: false },
            });
            await db_1.default.salaryStructure.create({
                data: {
                    employeeId: emp.id,
                    ctc,
                    basic,
                    da,
                    hra,
                    conveyance,
                    medicalAllowance,
                    specialAllowance,
                    uniformAllowance,
                    leaveWages,
                    lta,
                    foodAllowance,
                    communicationAllowance,
                    variablePay,
                    otherAllowance,
                    grossSalary,
                    employerPf,
                    employerEsi,
                    bonus,
                    telanganaLwf,
                    gratuity,
                    insuranceBenefit,
                    employeePf,
                    employeeEsi,
                    professionalTax,
                    tdsDeduction,
                    otherDeduction,
                    netSalary,
                    isCurrent: true,
                    effectiveDate: new Date(),
                },
            });
            await db_1.default.employee.update({
                where: { id: emp.id },
                data: { salaryCtc: ctc },
            });
            // Synchronize payslips for active payroll batches
            try {
                await (0, payrollService_1.syncEmployeePayslipFromAttendance)(emp.id, targetMonth, targetYear);
                if (targetMonth !== 8) {
                    const augPayroll = await db_1.default.payroll.findUnique({
                        where: { payrollMonth_payrollYear: { payrollMonth: 8, payrollYear: 2026 } },
                    });
                    if (augPayroll)
                        await (0, payrollService_1.syncEmployeePayslipFromAttendance)(emp.id, 8, 2026);
                }
                if (targetMonth !== 9) {
                    const sepPayroll = await db_1.default.payroll.findUnique({
                        where: { payrollMonth_payrollYear: { payrollMonth: 9, payrollYear: 2026 } },
                    });
                    if (sepPayroll)
                        await (0, payrollService_1.syncEmployeePayslipFromAttendance)(emp.id, 9, 2026);
                }
            }
            catch (syncErr) {
                console.warn(`Sync failed for emp ${emp.id}:`, syncErr);
            }
        }
        await (0, audit_1.logAuditAction)(req.user?.userId, 'PAYROLL', 'APPLY_STRUCTURE', siteId || employeeId || 'ALL', { count: employees.length, target, ctc, grossSalary, netSalary }, req.ip);
        return (0, response_1.sendSuccess)(res, {
            updatedCount: employees.length,
            target,
            structure: { ctc, grossSalary, netSalary },
        }, `Applied salary structure to ${employees.length} employee(s) and synchronized monthly payroll register & payslips.`);
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 500);
    }
}
