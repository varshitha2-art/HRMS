"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAttendance = getAttendance;
exports.markAttendance = markAttendance;
exports.punchInDirect = punchInDirect;
exports.punchOutDirect = punchOutDirect;
exports.getMonthlyMatrix = getMonthlyMatrix;
exports.applySandwichRuleBatch = applySandwichRuleBatch;
const db_1 = __importDefault(require("../config/db"));
const response_1 = require("../utils/response");
const schemas_1 = require("../validators/schemas");
const attendanceService_1 = require("../services/attendanceService");
const audit_1 = require("../middleware/audit");
const rbacService_1 = require("../services/rbacService");
const payrollService_1 = require("../services/payrollService");
const geofence_1 = require("../utils/geofence");
async function getAttendance(req, res) {
    try {
        if (!req.user)
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        const { date, siteId, departmentId, employeeId, status, month, year, startDate, endDate } = req.query;
        let baseWhere = {};
        if (siteId)
            baseWhere.siteId = siteId;
        if (employeeId)
            baseWhere.employeeId = employeeId;
        if (date) {
            baseWhere.date = date;
        }
        else if (startDate && endDate) {
            baseWhere.date = { gte: startDate, lte: endDate };
        }
        else if (month && year) {
            const prefix = `${year}-${String(month).padStart(2, '0')}`;
            baseWhere.date = { startsWith: prefix };
        }
        if (status)
            baseWhere.status = status;
        if (departmentId) {
            baseWhere.employee = { departmentId };
        }
        // Apply strict database-level RBAC filtering
        const where = await (0, rbacService_1.buildAttendanceWhereClause)(req.user, baseWhere);
        const attendances = await db_1.default.attendance.findMany({
            where,
            orderBy: [{ date: 'desc' }, { employee: { employeeId: 'asc' } }],
            include: {
                employee: {
                    include: {
                        department: true,
                        designation: true,
                        site: true,
                        shift: true,
                    },
                },
                site: true,
                shift: true,
            },
        });
        return (0, response_1.sendSuccess)(res, attendances);
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 500);
    }
}
async function markAttendance(req, res) {
    try {
        if (!req.user)
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        const validated = schemas_1.attendanceMarkSchema.parse(req.body);
        const { employeeId, date, inTime, outTime, status: requestedStatus, siteId, shiftId, remarks } = validated;
        // Fetch employee details
        const employee = await db_1.default.employee.findFirst({
            where: { OR: [{ id: employeeId }, { employeeId }] },
            include: { shift: true },
        });
        if (!employee) {
            return (0, response_1.sendError)(res, 'Employee not found', 404);
        }
        // Security Check: Verify permission to mark attendance for this employee
        const hasAccess = await (0, rbacService_1.canAccessEmployee)(req.user, employee.id);
        if (!hasAccess) {
            return (0, response_1.sendError)(res, 'Access denied: You do not have permission to mark attendance for this employee', 403);
        }
        // Employees must use live GPS-verified Punch In / Punch Out endpoints
        if (req.user.role === 'EMPLOYEE') {
            return (0, response_1.sendError)(res, 'Direct manual attendance entry is restricted for employees. Please use Live GPS Punch In / Punch Out.', 403);
        }
        const effectiveShiftId = shiftId || employee.shiftId;
        const effectiveSiteId = siteId || employee.siteId;
        // Run automatic calculation engine for grace period, late minutes, and overtime
        const metrics = await (0, attendanceService_1.calculateAttendanceMetrics)(effectiveShiftId, inTime, outTime, date, requestedStatus);
        const record = await db_1.default.attendance.upsert({
            where: {
                employeeId_date: {
                    employeeId: employee.id,
                    date,
                },
            },
            update: {
                siteId: effectiveSiteId,
                shiftId: effectiveShiftId,
                inTime: inTime ? new Date(inTime) : null,
                outTime: outTime ? new Date(outTime) : null,
                workingHours: metrics.workingHours,
                lateMinutes: metrics.lateMinutes,
                overtimeHours: metrics.overtimeHours,
                status: metrics.status,
                markedBy: req.user?.role || 'MANUAL',
                remarks: remarks || null,
            },
            create: {
                employeeId: employee.id,
                siteId: effectiveSiteId,
                shiftId: effectiveShiftId,
                date,
                inTime: inTime ? new Date(inTime) : null,
                outTime: outTime ? new Date(outTime) : null,
                workingHours: metrics.workingHours,
                lateMinutes: metrics.lateMinutes,
                overtimeHours: metrics.overtimeHours,
                status: metrics.status,
                markedBy: req.user?.role || 'MANUAL',
                remarks: remarks || null,
            },
            include: {
                employee: {
                    include: { department: true, designation: true },
                },
                site: true,
                shift: true,
            },
        });
        await (0, audit_1.logAuditAction)(req.user?.userId, 'ATTENDANCE', 'UPDATE', record.id, { employeeId: employee.employeeId, date, status: metrics.status, lateMinutes: metrics.lateMinutes }, req.ip);
        // 🥪 Apply Weekend Sandwich Rule (Friday & Monday absence -> Sunday LOP)
        try {
            await (0, attendanceService_1.processWeekendSandwichRule)(employee.id, date, metrics.status, effectiveSiteId, effectiveShiftId);
        }
        catch (sandwichErr) {
            console.warn('Weekend Sandwich Rule processing error:', sandwichErr);
        }
        // ⚡ Real-Time Auto-Sync: Automatically update employee payslip as per attendance without manual approval
        try {
            await (0, payrollService_1.syncEmployeePayslipFromAttendance)(employee.id, date);
        }
        catch (syncErr) {
            console.warn('Payslip auto-sync on markAttendance failed:', syncErr);
        }
        return (0, response_1.sendSuccess)(res, record, 'Attendance updated successfully');
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 400);
    }
}
async function punchInDirect(req, res) {
    try {
        if (!req.user)
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        let targetEmployeeId = req.body.employeeId;
        if (!targetEmployeeId) {
            if (req.user.employee?.id)
                targetEmployeeId = req.user.employee.id;
            else if (req.user.employeeId) {
                const emp = await db_1.default.employee.findUnique({ where: { employeeId: req.user.employeeId } });
                targetEmployeeId = emp?.id;
            }
        }
        if (!targetEmployeeId) {
            return (0, response_1.sendError)(res, 'Employee ID is required', 400);
        }
        const employee = await db_1.default.employee.findFirst({
            where: { OR: [{ id: targetEmployeeId }, { employeeId: targetEmployeeId }] },
            include: { shift: true, site: true },
        });
        if (!employee) {
            return (0, response_1.sendError)(res, 'Employee record not found', 404);
        }
        const hasAccess = await (0, rbacService_1.canAccessEmployee)(req.user, employee.id);
        if (!hasAccess) {
            return (0, response_1.sendError)(res, 'Access denied: You can only punch in for your own profile', 403);
        }
        const date = req.body.date || new Date().toISOString().split('T')[0];
        const now = new Date();
        const inTime = req.body.inTime ? new Date(req.body.inTime) : now;
        const existing = await db_1.default.attendance.findUnique({
            where: {
                employeeId_date: {
                    employeeId: employee.id,
                    date,
                },
            },
        });
        const effectiveShiftId = req.body.shiftId || employee.shiftId;
        const effectiveSiteId = req.body.siteId || employee.siteId;
        // 📍 MANDATORY GEOFENCE ENFORCEMENT
        // Real-time GPS location is mandatory and device must be physically within the site perimeter.
        const rawLat = req.body.latitude;
        const rawLng = req.body.longitude;
        const latitude = rawLat !== undefined && rawLat !== null && rawLat !== '' ? parseFloat(rawLat) : NaN;
        const longitude = rawLng !== undefined && rawLng !== null && rawLng !== '' ? parseFloat(rawLng) : NaN;
        let targetSite = employee.site;
        if (effectiveSiteId && (!targetSite || targetSite.id !== effectiveSiteId)) {
            targetSite = await db_1.default.site.findUnique({ where: { id: effectiveSiteId } });
        }
        const attendanceSetting = await db_1.default.attendanceSetting.findFirst();
        const geoCheck = (0, geofence_1.verifySiteGeofence)(latitude, longitude, targetSite, attendanceSetting);
        if (!geoCheck.isWithinGeofence) {
            return (0, response_1.sendError)(res, geoCheck.rejectionReason || 'Location outside geofence perimeter. Punch not accepted.', 403);
        }
        const metrics = await (0, attendanceService_1.calculateAttendanceMetrics)(effectiveShiftId, inTime.toISOString(), existing?.outTime ? existing.outTime.toISOString() : undefined, date);
        const record = await db_1.default.attendance.upsert({
            where: {
                employeeId_date: {
                    employeeId: employee.id,
                    date,
                },
            },
            update: {
                siteId: effectiveSiteId,
                shiftId: effectiveShiftId,
                inTime,
                status: metrics.status,
                lateMinutes: metrics.lateMinutes,
                workingHours: metrics.workingHours,
                overtimeHours: metrics.overtimeHours,
                verificationType: 'GEO',
                markedBy: req.user.role === 'EMPLOYEE' ? 'SELF_EMPLOYEE' : req.user.role,
                remarks: req.body.remarks || `Direct Punch In at ${geoCheck.siteName} (${Math.round(geoCheck.distanceMeters)}m)`,
            },
            create: {
                employeeId: employee.id,
                siteId: effectiveSiteId,
                shiftId: effectiveShiftId,
                date,
                inTime,
                status: metrics.status,
                lateMinutes: metrics.lateMinutes,
                workingHours: metrics.workingHours,
                overtimeHours: metrics.overtimeHours,
                verificationType: 'GEO',
                markedBy: req.user.role === 'EMPLOYEE' ? 'SELF_EMPLOYEE' : req.user.role,
                remarks: req.body.remarks || `Direct Punch In at ${geoCheck.siteName} (${Math.round(geoCheck.distanceMeters)}m)`,
            },
            include: {
                employee: { include: { department: true, designation: true } },
                site: true,
                shift: true,
            },
        });
        // Create persistent AttendanceLog entry with verified GPS coordinates and site proximity
        try {
            await db_1.default.attendanceLog.create({
                data: {
                    attendanceId: record.id,
                    employeeId: employee.id,
                    punchType: 'IN',
                    location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)} (${Math.round(geoCheck.distanceMeters)}m from ${geoCheck.siteName})`,
                    deviceId: String(req.headers['user-agent'] || 'Web Client').slice(0, 100),
                    notes: `GPS Geofence Verified: ${Math.round(geoCheck.distanceMeters)}m / ${geoCheck.allowedRadius}m perimeter at ${geoCheck.siteName}`,
                },
            });
        }
        catch (logErr) {
            console.warn('Could not record AttendanceLog for punch in:', logErr);
        }
        await (0, audit_1.logAuditAction)(req.user.userId, 'ATTENDANCE', 'PUNCH_IN', record.id, {
            employeeId: employee.employeeId,
            inTime: inTime.toISOString(),
            status: metrics.status,
            latitude,
            longitude,
            distanceMeters: geoCheck.distanceMeters,
            allowedRadius: geoCheck.allowedRadius,
            siteName: geoCheck.siteName,
            verificationType: 'GEO',
        }, req.ip);
        // 🥪 Apply Weekend Sandwich Rule (restores Sunday if Friday or Monday punch in)
        try {
            await (0, attendanceService_1.processWeekendSandwichRule)(employee.id, date, metrics.status, effectiveSiteId, effectiveShiftId);
        }
        catch (sandwichErr) {
            console.warn('Weekend Sandwich Rule processing error:', sandwichErr);
        }
        // ⚡ Real-Time Auto-Sync: Automatically update employee payslip as per attendance without manual approval
        try {
            await (0, payrollService_1.syncEmployeePayslipFromAttendance)(employee.id, date);
        }
        catch (syncErr) {
            console.warn('Payslip auto-sync on punchInDirect failed:', syncErr);
        }
        return (0, response_1.sendSuccess)(res, { ...record, geoVerification: geoCheck }, `Punched In successfully at ${geoCheck.siteName} (${Math.round(geoCheck.distanceMeters)}m from site center)`);
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 400);
    }
}
async function punchOutDirect(req, res) {
    try {
        if (!req.user)
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        let targetEmployeeId = req.body.employeeId;
        if (!targetEmployeeId) {
            if (req.user.employee?.id)
                targetEmployeeId = req.user.employee.id;
            else if (req.user.employeeId) {
                const emp = await db_1.default.employee.findUnique({ where: { employeeId: req.user.employeeId } });
                targetEmployeeId = emp?.id;
            }
        }
        if (!targetEmployeeId) {
            return (0, response_1.sendError)(res, 'Employee ID is required', 400);
        }
        const employee = await db_1.default.employee.findFirst({
            where: { OR: [{ id: targetEmployeeId }, { employeeId: targetEmployeeId }] },
            include: { shift: true, site: true },
        });
        if (!employee) {
            return (0, response_1.sendError)(res, 'Employee record not found', 404);
        }
        const hasAccess = await (0, rbacService_1.canAccessEmployee)(req.user, employee.id);
        if (!hasAccess) {
            return (0, response_1.sendError)(res, 'Access denied: You can only punch out for your own profile', 403);
        }
        const date = req.body.date || new Date().toISOString().split('T')[0];
        const now = new Date();
        const outTime = req.body.outTime ? new Date(req.body.outTime) : now;
        const existing = await db_1.default.attendance.findUnique({
            where: {
                employeeId_date: {
                    employeeId: employee.id,
                    date,
                },
            },
        });
        const effectiveInTime = existing?.inTime || new Date(new Date(date).setHours(9, 0, 0, 0));
        const effectiveShiftId = req.body.shiftId || existing?.shiftId || employee.shiftId;
        const effectiveSiteId = req.body.siteId || existing?.siteId || employee.siteId;
        // 📍 MANDATORY GEOFENCE ENFORCEMENT
        // Real-time GPS location is mandatory and device must be physically within the site perimeter.
        const rawLat = req.body.latitude;
        const rawLng = req.body.longitude;
        const latitude = rawLat !== undefined && rawLat !== null && rawLat !== '' ? parseFloat(rawLat) : NaN;
        const longitude = rawLng !== undefined && rawLng !== null && rawLng !== '' ? parseFloat(rawLng) : NaN;
        let targetSite = employee.site;
        if (effectiveSiteId && (!targetSite || targetSite.id !== effectiveSiteId)) {
            targetSite = await db_1.default.site.findUnique({ where: { id: effectiveSiteId } });
        }
        const attendanceSetting = await db_1.default.attendanceSetting.findFirst();
        const geoCheck = (0, geofence_1.verifySiteGeofence)(latitude, longitude, targetSite, attendanceSetting);
        if (!geoCheck.isWithinGeofence) {
            return (0, response_1.sendError)(res, geoCheck.rejectionReason || 'Location outside geofence perimeter. Punch not accepted.', 403);
        }
        const metrics = await (0, attendanceService_1.calculateAttendanceMetrics)(effectiveShiftId, effectiveInTime.toISOString(), outTime.toISOString(), date);
        const record = await db_1.default.attendance.upsert({
            where: {
                employeeId_date: {
                    employeeId: employee.id,
                    date,
                },
            },
            update: {
                siteId: effectiveSiteId,
                shiftId: effectiveShiftId,
                inTime: effectiveInTime,
                outTime,
                status: metrics.status,
                lateMinutes: metrics.lateMinutes,
                workingHours: metrics.workingHours,
                overtimeHours: metrics.overtimeHours,
                verificationType: 'GEO',
                markedBy: req.user.role === 'EMPLOYEE' ? 'SELF_EMPLOYEE' : req.user.role,
                remarks: req.body.remarks || `Direct Punch Out at ${geoCheck.siteName} (${Math.round(geoCheck.distanceMeters)}m)`,
            },
            create: {
                employeeId: employee.id,
                siteId: effectiveSiteId,
                shiftId: effectiveShiftId,
                date,
                inTime: effectiveInTime,
                outTime,
                status: metrics.status,
                lateMinutes: metrics.lateMinutes,
                workingHours: metrics.workingHours,
                overtimeHours: metrics.overtimeHours,
                verificationType: 'GEO',
                markedBy: req.user.role === 'EMPLOYEE' ? 'SELF_EMPLOYEE' : req.user.role,
                remarks: req.body.remarks || `Direct Punch Out at ${geoCheck.siteName} (${Math.round(geoCheck.distanceMeters)}m)`,
            },
            include: {
                employee: { include: { department: true, designation: true } },
                site: true,
                shift: true,
            },
        });
        // Create persistent AttendanceLog entry with verified GPS coordinates and site proximity
        try {
            await db_1.default.attendanceLog.create({
                data: {
                    attendanceId: record.id,
                    employeeId: employee.id,
                    punchType: 'OUT',
                    location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)} (${Math.round(geoCheck.distanceMeters)}m from ${geoCheck.siteName})`,
                    deviceId: String(req.headers['user-agent'] || 'Web Client').slice(0, 100),
                    notes: `GPS Geofence Verified: ${Math.round(geoCheck.distanceMeters)}m / ${geoCheck.allowedRadius}m perimeter at ${geoCheck.siteName}`,
                },
            });
        }
        catch (logErr) {
            console.warn('Could not record AttendanceLog for punch out:', logErr);
        }
        await (0, audit_1.logAuditAction)(req.user.userId, 'ATTENDANCE', 'PUNCH_OUT', record.id, {
            employeeId: employee.employeeId,
            outTime: outTime.toISOString(),
            workingHours: metrics.workingHours,
            overtimeHours: metrics.overtimeHours,
            latitude,
            longitude,
            distanceMeters: geoCheck.distanceMeters,
            allowedRadius: geoCheck.allowedRadius,
            siteName: geoCheck.siteName,
            verificationType: 'GEO',
        }, req.ip);
        // ⚡ Real-Time Auto-Sync: Automatically update employee payslip as per attendance without manual approval
        try {
            await (0, payrollService_1.syncEmployeePayslipFromAttendance)(employee.id, date);
        }
        catch (syncErr) {
            console.warn('Payslip auto-sync on punchOutDirect failed:', syncErr);
        }
        return (0, response_1.sendSuccess)(res, { ...record, geoVerification: geoCheck }, `Punched out successfully at ${geoCheck.siteName} (${metrics.workingHours} hrs logged)`);
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 400);
    }
}
async function getMonthlyMatrix(req, res) {
    try {
        if (!req.user)
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        const { month = String(new Date().getMonth() + 1), year = String(new Date().getFullYear()), siteId, departmentId, staffStatus = 'ACTIVE', search, } = req.query;
        const m = parseInt(month, 10);
        const y = parseInt(year, 10);
        const totalDays = new Date(y, m, 0).getDate();
        const prefix = `${y}-${String(m).padStart(2, '0')}`;
        let baseEmpWhere = {};
        if (staffStatus === 'ACTIVE') {
            baseEmpWhere.status = { in: ['ACTIVE', 'ON_LEAVE'] };
        }
        else if (staffStatus === 'INACTIVE') {
            baseEmpWhere.status = { in: ['INACTIVE', 'TERMINATED'] };
        }
        else if (staffStatus === 'ALL') {
            // no status filter
        }
        else {
            baseEmpWhere.status = { in: ['ACTIVE', 'ON_LEAVE'] };
        }
        if (siteId)
            baseEmpWhere.siteId = siteId;
        if (departmentId) {
            baseEmpWhere.departmentId = departmentId;
        }
        if (search && search.trim()) {
            const q = search.trim();
            baseEmpWhere.OR = [
                { employeeId: { contains: q } },
                { firstName: { contains: q } },
                { lastName: { contains: q } },
            ];
        }
        const empWhere = await (0, rbacService_1.buildEmployeeWhereClause)(req.user, baseEmpWhere);
        const employees = await db_1.default.employee.findMany({
            where: empWhere,
            orderBy: { employeeId: 'asc' },
            include: {
                designation: true,
                department: true,
                site: true,
                attendances: {
                    where: {
                        date: { startsWith: prefix },
                    },
                },
            },
        });
        const matrix = employees.map(emp => {
            const attendanceMap = {};
            let totalPresent = 0;
            let totalAbsent = 0;
            let totalLate = 0;
            let totalLeave = 0;
            let totalWeekOff = 0;
            let totalHalfDays = 0;
            let totalWorkingHours = 0;
            let totalOvertimeHours = 0;
            for (const att of emp.attendances) {
                attendanceMap[att.date] = {
                    status: att.status,
                    inTime: att.inTime,
                    outTime: att.outTime,
                    lateMinutes: att.lateMinutes,
                    workingHours: att.workingHours,
                    hours: att.workingHours,
                    overtimeHours: att.overtimeHours,
                    ot: att.overtimeHours,
                    shiftId: att.shiftId,
                    remarks: att.remarks,
                };
                if (att.status === 'PRESENT')
                    totalPresent++;
                else if (att.status === 'LATE') {
                    totalPresent++;
                    totalLate++;
                }
                else if (att.status === 'HALF_DAY') {
                    totalHalfDays++;
                    totalPresent += 0.5;
                }
                else if (att.status === 'ABSENT')
                    totalAbsent++;
                else if (att.status === 'LEAVE')
                    totalLeave++;
                else if (att.status === 'WEEK_OFF')
                    totalWeekOff++;
                totalWorkingHours += att.workingHours || 0;
                totalOvertimeHours += att.overtimeHours || 0;
            }
            const payableDays = totalPresent + totalWeekOff + totalLeave;
            const lopDays = Math.max(0, totalDays - payableDays);
            return {
                employee: {
                    id: emp.id,
                    employeeId: emp.employeeId,
                    name: `${emp.firstName} ${emp.lastName}`,
                    firstName: emp.firstName,
                    lastName: emp.lastName,
                    designation: emp.designation?.title,
                    department: emp.department?.name,
                    site: emp.site?.siteName,
                    siteId: emp.siteId,
                    departmentId: emp.departmentId,
                    status: emp.status || 'ACTIVE',
                },
                days: attendanceMap,
                summary: {
                    totalPresent,
                    totalAbsent,
                    totalLate,
                    totalLeave,
                    totalWeekOff,
                    totalHalfDays,
                    totalHalfDay: totalHalfDays,
                    totalHalfDayDays: totalHalfDays * 0.5,
                    totalWorkingHours: Math.round(totalWorkingHours * 10) / 10,
                    totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
                    totalOvertime: Math.round(totalOvertimeHours * 10) / 10,
                    payableDays,
                    lopDays,
                },
            };
        });
        return (0, response_1.sendSuccess)(res, {
            month: m,
            year: y,
            totalDays,
            records: matrix,
        });
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 500);
    }
}
async function applySandwichRuleBatch(req, res) {
    try {
        if (!req.user)
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        const { month, year, siteId } = req.body;
        const m = month ? parseInt(month, 10) : new Date().getMonth() + 1;
        const y = year ? parseInt(year, 10) : new Date().getFullYear();
        const result = await (0, attendanceService_1.applyWeekendSandwichRuleForMonth)(m, y, siteId);
        // Auto resync payslips for affected employees
        const lastDay = new Date(y, m, 0).getDate();
        const lastDayStr = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        for (const empId of result.affectedEmployeeIds) {
            try {
                await (0, payrollService_1.syncEmployeePayslipFromAttendance)(empId, lastDayStr);
            }
            catch (e) {
                console.warn(`Payslip resync error for employee ${empId}:`, e);
            }
        }
        return (0, response_1.sendSuccess)(res, {
            message: `Weekend Sandwich Rule (LOP) applied: ${result.affectedSundaysCount} Sunday(s) adjusted across ${result.affectedEmployeesCount} employee(s).`,
            result,
        });
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 500);
    }
}
