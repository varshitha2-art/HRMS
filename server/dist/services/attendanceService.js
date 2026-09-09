"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateAttendanceMetrics = calculateAttendanceMetrics;
exports.parseLocalDate = parseLocalDate;
exports.addDays = addDays;
exports.processWeekendSandwichRule = processWeekendSandwichRule;
exports.applyWeekendSandwichRuleForMonth = applyWeekendSandwichRuleForMonth;
const db_1 = __importDefault(require("../config/db"));
async function calculateAttendanceMetrics(shiftId, inTimeStr, outTimeStr, dateStr, forcedStatus) {
    // Fetch shift configuration or fallback to attendance settings
    let shiftStartTime = '09:30';
    let gracePeriodMins = 15;
    let fullDayHours = 9.0;
    let halfDayHours = 4.0;
    if (shiftId) {
        const shift = await db_1.default.shift.findUnique({ where: { id: shiftId } });
        if (shift) {
            shiftStartTime = shift.startTime;
            gracePeriodMins = shift.gracePeriodMins;
            fullDayHours = shift.fullDayHours || 9.0;
            halfDayHours = shift.halfDayHours || 4.0;
        }
    }
    else {
        const settings = await db_1.default.attendanceSetting.findFirst();
        if (settings) {
            shiftStartTime = settings.defaultShiftStart;
            gracePeriodMins = settings.defaultGracePeriodMins;
            fullDayHours = settings.minHoursFullDay || 9.0;
            halfDayHours = settings.minHoursHalfDay || 4.0;
        }
    }
    // Parse inDate and outDate safely
    let inDate = null;
    let outDate = null;
    let workingHours = 0;
    if (inTimeStr) {
        const parsedIn = new Date(inTimeStr);
        if (!isNaN(parsedIn.getTime())) {
            inDate = parsedIn;
        }
    }
    if (outTimeStr) {
        const parsedOut = new Date(outTimeStr);
        if (!isNaN(parsedOut.getTime())) {
            outDate = parsedOut;
        }
    }
    // Calculate working hours
    if (inDate && outDate) {
        const diffMs = outDate.getTime() - inDate.getTime();
        workingHours = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);
    }
    else if (inDate) {
        workingHours = fullDayHours;
    }
    // Calculate overtime strictly after fullDayHours (default 9hr shift)
    let overtimeHours = 0;
    if (workingHours > fullDayHours) {
        overtimeHours = Math.round((workingHours - fullDayHours) * 100) / 100;
    }
    // Calculate Late Minutes (using clock time to avoid timezone drift)
    let lateMinutes = 0;
    let isPunchLate = false;
    if (inTimeStr) {
        const [shiftHour, shiftMin] = shiftStartTime.split(':').map(Number);
        const shiftMinutesSinceMidnight = shiftHour * 60 + shiftMin;
        const graceLimitMinutes = shiftMinutesSinceMidnight + gracePeriodMins;
        let actualMinutesSinceMidnight = null;
        const timePart = inTimeStr.includes('T') ? inTimeStr.split('T')[1] : inTimeStr;
        const match = timePart.match(/^(\d{1,2}):(\d{2})/);
        if (match) {
            actualMinutesSinceMidnight = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
        }
        else if (inDate) {
            actualMinutesSinceMidnight = inDate.getHours() * 60 + inDate.getMinutes();
        }
        if (actualMinutesSinceMidnight !== null) {
            if (actualMinutesSinceMidnight > graceLimitMinutes) {
                lateMinutes = actualMinutesSinceMidnight - shiftMinutesSinceMidnight;
                isPunchLate = true;
            }
        }
    }
    // =========================================================================
    // Case A: User explicitly specified/forced the status (MANUAL SELECTION)
    // The system MUST STRICTLY HONOR the selected option and NEVER override it!
    // =========================================================================
    if (forcedStatus) {
        if (forcedStatus === 'PRESENT') {
            return {
                status: 'PRESENT',
                lateMinutes: 0, // Admin explicitly marked employee Present (excusing any delay)
                workingHours: workingHours > 0 ? workingHours : fullDayHours,
                overtimeHours,
            };
        }
        if (forcedStatus === 'LATE') {
            return {
                status: 'LATE',
                lateMinutes: lateMinutes > 0 ? lateMinutes : gracePeriodMins,
                workingHours: workingHours > 0 ? workingHours : fullDayHours,
                overtimeHours,
            };
        }
        if (forcedStatus === 'HALF_DAY') {
            return {
                status: 'HALF_DAY',
                lateMinutes: 0,
                workingHours: workingHours > 0 ? workingHours : halfDayHours,
                overtimeHours: 0,
            };
        }
        if (['ABSENT', 'WEEK_OFF', 'LEAVE', 'LOP', 'HOLIDAY'].includes(forcedStatus)) {
            return {
                status: forcedStatus,
                lateMinutes: 0,
                workingHours: 0,
                overtimeHours: 0,
            };
        }
        if (forcedStatus === 'ON_DUTY') {
            return {
                status: 'ON_DUTY',
                lateMinutes: 0,
                workingHours: workingHours > 0 ? workingHours : fullDayHours,
                overtimeHours: 0,
            };
        }
        return {
            status: forcedStatus,
            lateMinutes: 0,
            workingHours,
            overtimeHours,
        };
    }
    // =========================================================================
    // Case B: Automatic Calculation (e.g. Biometric Punch In / Device Integration)
    // No forcedStatus provided, calculate status based on punch times and thresholds
    // =========================================================================
    if (!inDate) {
        return {
            status: 'ABSENT',
            lateMinutes: 0,
            workingHours: 0,
            overtimeHours: 0,
        };
    }
    let computedStatus = isPunchLate ? 'LATE' : 'PRESENT';
    if (outDate) {
        if (workingHours >= halfDayHours && workingHours < fullDayHours) {
            computedStatus = 'HALF_DAY';
        }
        else if (workingHours > 0 && workingHours < halfDayHours) {
            computedStatus = 'ABSENT';
        }
        else if (workingHours >= fullDayHours) {
            computedStatus = isPunchLate ? 'LATE' : 'PRESENT';
        }
    }
    return {
        status: computedStatus,
        lateMinutes: computedStatus === 'LATE' ? lateMinutes : 0,
        workingHours,
        overtimeHours,
    };
}
function parseLocalDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return {
        year: y,
        month: m,
        day: d,
        dayOfWeek: dt.getUTCDay(), // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
    };
}
function addDays(dateStr, days) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days));
    return dt.toISOString().split('T')[0];
}
/**
 * 🥪 Weekend LOP Rule:
 * 1. If Friday is absent -> mark Saturday as ABSENT / LOP (remarks: 'Weekend LOP (Friday Absent)').
 *    If Friday is restored to PRESENT/LEAVE -> restore Saturday to WEEK_OFF.
 * 2. If Monday is absent -> mark Sunday as ABSENT / LOP (remarks: 'Weekend LOP (Monday Absent)').
 *    If Monday is restored to PRESENT/LEAVE -> restore Sunday to WEEK_OFF.
 */
async function processWeekendSandwichRule(employeeId, markedDate, newStatus, siteId, shiftId) {
    const { dayOfWeek } = parseLocalDate(markedDate);
    if (dayOfWeek === 5) {
        // Marked date is FRIDAY -> target is SATURDAY (Friday + 1 day)
        const satDateStr = addDays(markedDate, 1);
        if (newStatus === 'ABSENT') {
            await db_1.default.attendance.upsert({
                where: { employeeId_date: { employeeId, date: satDateStr } },
                update: {
                    status: 'ABSENT',
                    workingHours: 0,
                    lateMinutes: 0,
                    overtimeHours: 0,
                    inTime: null,
                    outTime: null,
                    remarks: 'Weekend LOP (Friday Absent)',
                },
                create: {
                    employeeId,
                    siteId: siteId || null,
                    shiftId: shiftId || null,
                    date: satDateStr,
                    status: 'ABSENT',
                    workingHours: 0,
                    lateMinutes: 0,
                    overtimeHours: 0,
                    remarks: 'Weekend LOP (Friday Absent)',
                },
            });
        }
        else {
            // Friday is NOT absent -> check if Saturday was marked absent due to Friday absence
            const satAtt = await db_1.default.attendance.findUnique({
                where: { employeeId_date: { employeeId, date: satDateStr } },
            });
            if (satAtt && satAtt.status === 'ABSENT' && (satAtt.remarks?.includes('Friday Absent') || satAtt.remarks?.includes('Sandwich Rule'))) {
                await db_1.default.attendance.update({
                    where: { id: satAtt.id },
                    data: {
                        status: 'WEEK_OFF',
                        workingHours: 0,
                        lateMinutes: 0,
                        overtimeHours: 0,
                        inTime: null,
                        outTime: null,
                        remarks: 'Designated Weekly Off (Saturday)',
                    },
                });
            }
        }
    }
    else if (dayOfWeek === 1) {
        // Marked date is MONDAY -> target is SUNDAY (Monday - 1 day)
        const sunDateStr = addDays(markedDate, -1);
        if (newStatus === 'ABSENT') {
            await db_1.default.attendance.upsert({
                where: { employeeId_date: { employeeId, date: sunDateStr } },
                update: {
                    status: 'ABSENT',
                    workingHours: 0,
                    lateMinutes: 0,
                    overtimeHours: 0,
                    inTime: null,
                    outTime: null,
                    remarks: 'Weekend LOP (Monday Absent)',
                },
                create: {
                    employeeId,
                    siteId: siteId || null,
                    shiftId: shiftId || null,
                    date: sunDateStr,
                    status: 'ABSENT',
                    workingHours: 0,
                    lateMinutes: 0,
                    overtimeHours: 0,
                    remarks: 'Weekend LOP (Monday Absent)',
                },
            });
        }
        else {
            // Monday is NOT absent -> check if Sunday was marked absent due to Monday absence
            const sunAtt = await db_1.default.attendance.findUnique({
                where: { employeeId_date: { employeeId, date: sunDateStr } },
            });
            if (sunAtt && sunAtt.status === 'ABSENT' && (sunAtt.remarks?.includes('Monday Absent') || sunAtt.remarks?.includes('Sandwich Rule'))) {
                await db_1.default.attendance.update({
                    where: { id: sunAtt.id },
                    data: {
                        status: 'WEEK_OFF',
                        workingHours: 0,
                        lateMinutes: 0,
                        overtimeHours: 0,
                        inTime: null,
                        outTime: null,
                        remarks: 'Designated Weekly Off (Sunday)',
                    },
                });
            }
        }
    }
}
/**
 * Batch apply / audit Weekend LOP Rule across an entire month:
 * Friday absent -> Saturday absent
 * Monday absent -> Sunday absent
 */
async function applyWeekendSandwichRuleForMonth(month, year, siteId) {
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(totalDaysInMonth).padStart(2, '0')}`;
    const empWhere = { status: 'ACTIVE' };
    if (siteId)
        empWhere.siteId = siteId;
    const employees = await db_1.default.employee.findMany({
        where: empWhere,
        select: { id: true, employeeId: true, firstName: true, lastName: true, siteId: true, shiftId: true },
    });
    let affectedWeekendsCount = 0;
    const affectedEmployeeIds = new Set();
    for (const emp of employees) {
        const attendances = await db_1.default.attendance.findMany({
            where: {
                employeeId: emp.id,
                date: { gte: startDateStr, lte: endDateStr },
            },
        });
        const attMap = new Map();
        for (const a of attendances) {
            attMap.set(a.date, a);
        }
        for (let day = 1; day <= totalDaysInMonth; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const { dayOfWeek } = parseLocalDate(dateStr);
            // Rule 1: If Friday is absent -> mark Saturday as absent
            if (dayOfWeek === 5) {
                const friAtt = attMap.get(dateStr);
                const satDateStr = addDays(dateStr, 1);
                const satAtt = attMap.get(satDateStr);
                if (friAtt?.status === 'ABSENT') {
                    await db_1.default.attendance.upsert({
                        where: { employeeId_date: { employeeId: emp.id, date: satDateStr } },
                        update: {
                            status: 'ABSENT',
                            workingHours: 0,
                            lateMinutes: 0,
                            overtimeHours: 0,
                            inTime: null,
                            outTime: null,
                            remarks: 'Weekend LOP (Friday Absent)',
                        },
                        create: {
                            employeeId: emp.id,
                            siteId: emp.siteId,
                            shiftId: emp.shiftId,
                            date: satDateStr,
                            status: 'ABSENT',
                            workingHours: 0,
                            lateMinutes: 0,
                            overtimeHours: 0,
                            remarks: 'Weekend LOP (Friday Absent)',
                        },
                    });
                    affectedWeekendsCount++;
                    affectedEmployeeIds.add(emp.id);
                }
                else if (satAtt?.remarks?.includes('Friday Absent') && satAtt?.status === 'ABSENT') {
                    await db_1.default.attendance.update({
                        where: { id: satAtt.id },
                        data: {
                            status: 'WEEK_OFF',
                            workingHours: 0,
                            lateMinutes: 0,
                            overtimeHours: 0,
                            inTime: null,
                            outTime: null,
                            remarks: 'Designated Weekly Off (Saturday)',
                        },
                    });
                    affectedEmployeeIds.add(emp.id);
                }
            }
            // Rule 2: If Monday is absent -> mark Sunday as absent
            if (dayOfWeek === 1) {
                const monAtt = attMap.get(dateStr);
                const sunDateStr = addDays(dateStr, -1);
                const sunAtt = attMap.get(sunDateStr);
                if (monAtt?.status === 'ABSENT') {
                    await db_1.default.attendance.upsert({
                        where: { employeeId_date: { employeeId: emp.id, date: sunDateStr } },
                        update: {
                            status: 'ABSENT',
                            workingHours: 0,
                            lateMinutes: 0,
                            overtimeHours: 0,
                            inTime: null,
                            outTime: null,
                            remarks: 'Weekend LOP (Monday Absent)',
                        },
                        create: {
                            employeeId: emp.id,
                            siteId: emp.siteId,
                            shiftId: emp.shiftId,
                            date: sunDateStr,
                            status: 'ABSENT',
                            workingHours: 0,
                            lateMinutes: 0,
                            overtimeHours: 0,
                            remarks: 'Weekend LOP (Monday Absent)',
                        },
                    });
                    affectedWeekendsCount++;
                    affectedEmployeeIds.add(emp.id);
                }
                else if ((sunAtt?.remarks?.includes('Monday Absent') || sunAtt?.remarks?.includes('Sandwich Rule')) && sunAtt?.status === 'ABSENT') {
                    await db_1.default.attendance.update({
                        where: { id: sunAtt.id },
                        data: {
                            status: 'WEEK_OFF',
                            workingHours: 0,
                            lateMinutes: 0,
                            overtimeHours: 0,
                            inTime: null,
                            outTime: null,
                            remarks: 'Designated Weekly Off (Sunday)',
                        },
                    });
                    affectedEmployeeIds.add(emp.id);
                }
            }
        }
    }
    return {
        affectedWeekendsCount,
        affectedSundaysCount: affectedWeekendsCount,
        affectedEmployeesCount: affectedEmployeeIds.size,
        affectedEmployeeIds: Array.from(affectedEmployeeIds),
    };
}
