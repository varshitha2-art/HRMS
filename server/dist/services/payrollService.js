"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VPHS_STANDARD_RATE_CARD = void 0;
exports.calculateSalaryStructure = calculateSalaryStructure;
exports.generateMonthlyPayroll = generateMonthlyPayroll;
exports.syncEmployeePayslipFromAttendance = syncEmployeePayslipFromAttendance;
exports.syncAllSiteEmployeesPayslips = syncAllSiteEmployeesPayslips;
const db_1 = __importDefault(require("../config/db"));
exports.VPHS_STANDARD_RATE_CARD = {
    basic: 6000,
    da: 10000,
    subTotal1: 16000,
    hra: 6783,
    specialAllowance: 0,
    uniformAllowance: 200,
    leaveWages: 2848,
    grossSalary: 22783,
    employerPf: 1950, // 13% of Basic+DA (or on ₹15,000 cap = ₹1,950)
    employerEsi: 613, // 3.25% of Basic+DA / Gross
    bonus: 1333, // 8.33% of Basic+DA
    telanganaLwfEmployer: 0.17,
    totalMonthlyCtc: 29727,
    headcount: 12,
    annualCtc: 356722,
    // Employee Deductions
    employeePf: 1920, // 12% of Basic+DA (or ₹1,800 on ₹15k cap)
    employeeEsi: 171, // 0.75% of Gross
    professionalTax: 200,
    employeeLwf: 2,
    netSalary: 20610,
};
function calculateSalaryStructure(monthlyCtc, customRules) {
    const ctc = Math.max(0, monthlyCtc);
    const headcount = customRules?.headcount ?? 1;
    // Check if standard ₹29,727 CTC / ₹22,783 Gross preset is matched
    const isVphsStandard = Math.abs(ctc - exports.VPHS_STANDARD_RATE_CARD.totalMonthlyCtc) < 50 || customRules?.isVphsStandard;
    let basic = customRules?.basic ?? (isVphsStandard ? exports.VPHS_STANDARD_RATE_CARD.basic : Math.round((ctc * 0.40)));
    let da = customRules?.da ?? (isVphsStandard ? exports.VPHS_STANDARD_RATE_CARD.da : Math.round(basic * 0.10));
    const subTotal1 = basic + da;
    let hra = customRules?.hra ?? (isVphsStandard ? exports.VPHS_STANDARD_RATE_CARD.hra : Math.round(basic * 0.40));
    const conveyance = customRules?.conveyance ?? 0;
    const medical = customRules?.medicalAllowance ?? 0;
    const uniform = customRules?.uniformAllowance ?? (isVphsStandard ? exports.VPHS_STANDARD_RATE_CARD.uniformAllowance : 200);
    const food = customRules?.foodAllowance ?? 0;
    const communication = customRules?.communicationAllowance ?? 0;
    const lta = customRules?.lta ?? 0;
    const variablePay = customRules?.variablePay ?? 0;
    // Gross Salary (Fixed Earnings)
    const baseEarnings = basic + da + hra + conveyance + medical + food + communication + lta + variablePay;
    // Employer Contributions
    // PF: 13% on min(Basic+DA, 15000) or actual standard ₹1,950
    const employerPf = customRules?.employerPf ?? (isVphsStandard ? exports.VPHS_STANDARD_RATE_CARD.employerPf : Math.min(1950, Math.round((subTotal1 * 13) / 100)));
    // ESI: 3.25% on Basic+DA or Gross = ₹613 standard
    const employerEsi = customRules?.employerEsi ?? (isVphsStandard ? exports.VPHS_STANDARD_RATE_CARD.employerEsi : Math.round((subTotal1 * 3.25) / 100));
    // Bonus: 8.33% on Basic+DA = ₹1,333 standard
    const bonus = customRules?.bonus ?? (isVphsStandard ? exports.VPHS_STANDARD_RATE_CARD.bonus : Math.round((subTotal1 * 8.33) / 100));
    const telanganaLwf = customRules?.telanganaLwfEmployer ?? (isVphsStandard ? exports.VPHS_STANDARD_RATE_CARD.telanganaLwfEmployer : 0.17);
    const gratuity = customRules?.gratuity ?? Math.round(((15 / 26) * subTotal1) / 12);
    const insuranceBenefit = customRules?.insuranceBenefit ?? 0;
    // Special Allowance
    let specialAllowance = customRules?.specialAllowance ?? 0;
    const grossSalary = customRules?.grossSalary ?? (isVphsStandard ? exports.VPHS_STANDARD_RATE_CARD.grossSalary : (baseEarnings + specialAllowance));
    // Auto-calculated Leave Wages (12.5% of Gross = ₹2,848 on ₹22,783)
    const leaveWages = customRules?.leaveWages !== undefined ? customRules.leaveWages : (isVphsStandard ? exports.VPHS_STANDARD_RATE_CARD.leaveWages : Math.round(grossSalary * 0.125));
    const totalEmployerContribution = employerPf + employerEsi + bonus + leaveWages + uniform + telanganaLwf + gratuity + insuranceBenefit;
    // Employee Deductions
    const employeePf = customRules?.employeePf ?? (isVphsStandard ? exports.VPHS_STANDARD_RATE_CARD.employeePf : Math.round((Math.min(subTotal1, 15000) * 12) / 100));
    const employeeEsi = customRules?.employeeEsi ?? (grossSalary <= 21000 ? Math.round((grossSalary * 0.75) / 100) : (isVphsStandard ? exports.VPHS_STANDARD_RATE_CARD.employeeEsi : 0));
    const professionalTax = customRules?.professionalTax ?? (grossSalary > 15000 ? 200 : grossSalary > 10000 ? 150 : 0);
    const employeeLwf = customRules?.employeeLwf ?? (isVphsStandard ? exports.VPHS_STANDARD_RATE_CARD.employeeLwf : 2);
    const tdsDeduction = customRules?.tdsDeduction ?? 0;
    const otherDeductions = customRules?.otherDeductions ?? 0;
    const totalDeductions = employeePf + employeeEsi + professionalTax + employeeLwf + tdsDeduction + otherDeductions;
    const netSalary = Math.max(0, grossSalary - totalDeductions);
    return {
        monthly: {
            ctc,
            headcount,
            basic,
            da,
            subTotal1,
            hra,
            conveyance,
            medicalAllowance: medical,
            specialAllowance,
            uniformAllowance: uniform,
            leaveWages,
            lta,
            foodAllowance: food,
            communicationAllowance: communication,
            variablePay,
            otherAllowance: 0,
            grossSalary,
            employerPf,
            employerEsi,
            bonus,
            telanganaLwf,
            gratuity,
            insuranceBenefit,
            totalEmployerContribution,
            employeePf,
            employeeEsi,
            professionalTax,
            employeeLwf,
            tdsDeduction,
            otherDeductions,
            totalDeductions,
            netSalary,
        },
        annual: {
            ctc: isVphsStandard ? exports.VPHS_STANDARD_RATE_CARD.annualCtc : ctc * 12,
            headcount,
            basic: basic * 12,
            da: da * 12,
            subTotal1: subTotal1 * 12,
            hra: hra * 12,
            conveyance: conveyance * 12,
            medicalAllowance: medical * 12,
            specialAllowance: specialAllowance * 12,
            uniformAllowance: uniform * 12,
            leaveWages: leaveWages * 12,
            lta: lta * 12,
            foodAllowance: food * 12,
            communicationAllowance: communication * 12,
            variablePay: variablePay * 12,
            otherAllowance: 0,
            grossSalary: grossSalary * 12,
            employerPf: employerPf * 12,
            employerEsi: employerEsi * 12,
            bonus: bonus * 12,
            telanganaLwf: telanganaLwf * 12,
            gratuity: gratuity * 12,
            insuranceBenefit: insuranceBenefit * 12,
            totalEmployerContribution: totalEmployerContribution * 12,
            employeePf: employeePf * 12,
            employeeEsi: employeeEsi * 12,
            professionalTax: professionalTax * 12,
            employeeLwf: employeeLwf * 12,
            tdsDeduction: tdsDeduction * 12,
            otherDeductions: 0,
            totalDeductions: totalDeductions * 12,
            netSalary: netSalary * 12,
        },
    };
}
async function generateMonthlyPayroll(month, year, userId, allowOverwrite = true) {
    // 1. Fetch Payroll settings
    const settings = await db_1.default.payrollSetting.findFirst();
    const payrollSetting = settings || {
        basicPercentOfCtc: 40.0,
        daPercentOfBasic: 10.0,
        hraPercentOfBasic: 40.0,
        pfPercentOfBasic: 12.0,
        esiPercentOfGross: 0.75,
        esiGrossLimit: 21000.0,
        ptSlabMonthly: 200.0,
        standardWorkingDaysPerMonth: 30,
        pfEligibleCap: 15000.0,
        employerPfPercent: 13.0,
        employerEsiPercent: 3.25,
        bonusPercent: 8.33,
        telanganaLwfEmployer: 0.17,
        telanganaLwfEmployee: 2.0,
        uniformAllowanceDefault: 200.0,
        leaveWagesMonthlyDefault: 2848.0,
        gratuityPercent: 4.81,
        conveyanceDefault: 0.0,
        medicalDefault: 0.0,
        insuranceDefault: 0.0,
    };
    // 2. Fetch all active employees with salary structure and site
    const employees = await db_1.default.employee.findMany({
        where: { status: { in: ['ACTIVE', 'ON_LEAVE'] } },
        include: {
            salaryStructures: {
                where: { isCurrent: true },
                take: 1,
            },
            site: true,
            department: true,
            designation: true,
        },
    });
    // Calculate days in month
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(totalDaysInMonth).padStart(2, '0')}`;
    // Find or create master Payroll batch record
    let payroll = await db_1.default.payroll.findUnique({
        where: {
            payrollMonth_payrollYear: {
                payrollMonth: month,
                payrollYear: year,
            },
        },
    });
    if (payroll) {
        if (payroll.status === 'PAID' && !allowOverwrite) {
            throw new Error(`Payroll for ${month}/${year} has already been disbursed (PAID).`);
        }
        // Delete existing items to allow fresh recalculation from latest attendance logs & rate cards
        await db_1.default.payrollItem.deleteMany({ where: { payrollId: payroll.id } });
        // Reset/update batch status to CALCULATED ready for review & approval
        payroll = await db_1.default.payroll.update({
            where: { id: payroll.id },
            data: {
                status: 'CALCULATED',
                generatedById: userId || payroll.generatedById,
                processedAt: new Date(),
                remarks: `Recalculated on ${new Date().toLocaleString('en-IN')}`,
            },
        });
    }
    else {
        payroll = await db_1.default.payroll.create({
            data: {
                payrollMonth: month,
                payrollYear: year,
                status: 'CALCULATED',
                generatedById: userId || null,
                processedAt: new Date(),
                remarks: `Initially calculated on ${new Date().toLocaleString('en-IN')}`,
            },
        });
    }
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    for (const emp of employees) {
        // 1. Resolve Rate Card: Check Employee Structure -> Site Facility Rate Card -> Default VPHS Standard
        let rateCard = { ...exports.VPHS_STANDARD_RATE_CARD };
        if (emp.salaryStructures && emp.salaryStructures.length > 0 && emp.salaryStructures[0].basic > 0) {
            const s = emp.salaryStructures[0];
            rateCard = {
                basic: s.basic !== undefined && s.basic !== null ? s.basic : 6000,
                da: s.da !== undefined && s.da !== null ? s.da : 10000,
                subTotal1: (s.basic || 0) + (s.da || 0),
                hra: s.hra !== undefined && s.hra !== null ? s.hra : 6783,
                specialAllowance: s.specialAllowance || 0,
                conveyance: s.conveyance || 0,
                medicalAllowance: s.medicalAllowance || 0,
                uniformAllowance: s.uniformAllowance !== undefined && s.uniformAllowance !== null ? s.uniformAllowance : 200,
                leaveWages: s.leaveWages !== undefined && s.leaveWages !== null ? s.leaveWages : (Math.round((s.grossSalary || 22783) * 0.125) || 2848),
                lta: s.lta || 0,
                foodAllowance: s.foodAllowance || 0,
                communicationAllowance: s.communicationAllowance || 0,
                variablePay: s.variablePay || 0,
                otherAllowance: s.otherAllowance || 0,
                grossSalary: s.grossSalary || 22783,
                employerPf: s.employerPf !== undefined && s.employerPf !== null ? s.employerPf : 1950,
                employerEsi: s.employerEsi !== undefined && s.employerEsi !== null ? s.employerEsi : 613,
                bonus: s.bonus !== undefined && s.bonus !== null ? s.bonus : 1333,
                telanganaLwfEmployer: s.telanganaLwf !== undefined && s.telanganaLwf !== null ? s.telanganaLwf : 0.17,
                employeePf: s.employeePf !== undefined && s.employeePf !== null ? s.employeePf : 1920,
                employeeEsi: s.employeeEsi !== undefined && s.employeeEsi !== null ? s.employeeEsi : 171,
                professionalTax: s.professionalTax !== undefined && s.professionalTax !== null ? s.professionalTax : 200,
                employeeLwf: 2,
                tdsDeduction: s.tdsDeduction || 0,
                netSalary: s.netSalary || 20610,
                ctc: s.ctc || 29727,
            };
        }
        else if (emp.site && emp.site.rateCardJson) {
            try {
                const siteCard = JSON.parse(emp.site.rateCardJson);
                rateCard = {
                    basic: siteCard.basic !== undefined && siteCard.basic !== null ? siteCard.basic : 6000,
                    da: siteCard.da !== undefined && siteCard.da !== null ? siteCard.da : 10000,
                    subTotal1: (siteCard.basic || 0) + (siteCard.da || 0),
                    hra: siteCard.hra !== undefined && siteCard.hra !== null ? siteCard.hra : 6783,
                    specialAllowance: siteCard.specialAllowance || 0,
                    conveyance: siteCard.conveyance || 0,
                    medicalAllowance: siteCard.medicalAllowance || 0,
                    uniformAllowance: siteCard.uniformAllowance !== undefined && siteCard.uniformAllowance !== null ? siteCard.uniformAllowance : 200,
                    leaveWages: siteCard.leaveWages !== undefined && siteCard.leaveWages !== null ? siteCard.leaveWages : (Math.round((siteCard.grossSalary || 22783) * 0.125) || 2848),
                    lta: siteCard.lta || 0,
                    foodAllowance: siteCard.foodAllowance || 0,
                    communicationAllowance: siteCard.communicationAllowance || 0,
                    variablePay: siteCard.variablePay || 0,
                    otherAllowance: siteCard.otherAllowance || 0,
                    grossSalary: siteCard.grossSalary || 22783,
                    employerPf: siteCard.employerPf !== undefined && siteCard.employerPf !== null ? siteCard.employerPf : 1950,
                    employerEsi: siteCard.employerEsi !== undefined && siteCard.employerEsi !== null ? siteCard.employerEsi : 613,
                    bonus: siteCard.bonus !== undefined && siteCard.bonus !== null ? siteCard.bonus : 1333,
                    telanganaLwfEmployer: siteCard.telanganaLwf !== undefined && siteCard.telanganaLwf !== null ? siteCard.telanganaLwf : 0.17,
                    employeePf: siteCard.employeePf !== undefined && siteCard.employeePf !== null ? siteCard.employeePf : 1920,
                    employeeEsi: siteCard.employeeEsi !== undefined && siteCard.employeeEsi !== null ? siteCard.employeeEsi : 171,
                    professionalTax: siteCard.professionalTax !== undefined && siteCard.professionalTax !== null ? siteCard.professionalTax : 200,
                    employeeLwf: 2,
                    tdsDeduction: 0,
                    netSalary: siteCard.netSalary || 20610,
                    ctc: siteCard.ctc || 29727,
                };
            }
            catch (e) { }
        }
        // 2. Fetch Attendance Records for this employee in the month
        const attendances = await db_1.default.attendance.findMany({
            where: {
                employeeId: emp.id,
                date: {
                    gte: startDateStr,
                    lte: endDateStr,
                },
            },
        });
        let presentDays = 0;
        let weeklyOffDays = 0;
        let holidayDays = 0;
        let paidLeaveDays = 0;
        let halfDays = 0;
        let absentDays = 0;
        let overtimeHours = 0;
        let lateMinutes = 0;
        for (const att of attendances) {
            if (['PRESENT', 'ON_DUTY'].includes(att.status)) {
                presentDays += 1;
            }
            else if (att.status === 'LATE') {
                presentDays += 1;
                lateMinutes += att.lateMinutes || 0;
            }
            else if (att.status === 'HALF_DAY') {
                halfDays += 1;
            }
            else if (att.status === 'WEEK_OFF') {
                weeklyOffDays += 1; // Statutory Paid Rest Days
            }
            else if (att.status === 'HOLIDAY') {
                holidayDays += 1; // Statutory Paid Public Holidays
            }
            else if (att.status === 'LEAVE') {
                paidLeaveDays += 1; // Approved Paid Leaves
            }
            else if (att.status === 'ABSENT' || att.status === 'LOP') {
                absentDays += 1; // Loss of pay
            }
            overtimeHours += att.overtimeHours || 0;
        }
        // 3. Compute Payable Days vs Loss of Pay Days
        let payableDays = totalDaysInMonth;
        let lopDays = 0;
        if (attendances.length > 0) {
            payableDays = presentDays + weeklyOffDays + holidayDays + paidLeaveDays + (0.5 * halfDays);
            lopDays = Math.max(0, totalDaysInMonth - payableDays);
        }
        else {
            // Default to full payable days if no attendance was recorded
            payableDays = totalDaysInMonth;
            presentDays = totalDaysInMonth;
            lopDays = 0;
        }
        // 4. Prorate Earnings Components strictly as per attendance ratio
        const attendanceRatio = payableDays / totalDaysInMonth;
        const earnedBasic = Math.round((rateCard.basic / totalDaysInMonth) * payableDays);
        const earnedDa = Math.round((rateCard.da / totalDaysInMonth) * payableDays);
        const earnedWageBase = earnedBasic + earnedDa; // Sub Total 1 Wage Base
        const earnedHra = Math.round((rateCard.hra / totalDaysInMonth) * payableDays);
        const earnedSpecialAllowance = Math.round(((rateCard.specialAllowance || 0) / totalDaysInMonth) * payableDays);
        const earnedConveyance = Math.round(((rateCard.conveyance || 0) / totalDaysInMonth) * payableDays);
        const earnedMedical = Math.round(((rateCard.medicalAllowance || 0) / totalDaysInMonth) * payableDays);
        const earnedUniform = Math.round((rateCard.uniformAllowance / totalDaysInMonth) * payableDays);
        const earnedLeaveWages = Math.round((rateCard.leaveWages / totalDaysInMonth) * payableDays);
        const earnedLta = Math.round(((rateCard.lta || 0) / totalDaysInMonth) * payableDays);
        const earnedFood = Math.round(((rateCard.foodAllowance || 0) / totalDaysInMonth) * payableDays);
        const earnedComm = Math.round(((rateCard.communicationAllowance || 0) / totalDaysInMonth) * payableDays);
        const earnedVariable = Math.round(((rateCard.variablePay || 0) / totalDaysInMonth) * payableDays);
        const earnedOther = Math.round(((rateCard.otherAllowance || 0) / totalDaysInMonth) * payableDays);
        // Overtime Pay Calculation (Hourly OT = Gross / (30 * 8) * 1.5)
        const hourlyOtRate = rateCard.grossSalary / (totalDaysInMonth * 8);
        const overtimePay = Math.round(hourlyOtRate * 1.5 * overtimeHours);
        // Statutory Bonus: 8.33% of Earned Basic + DA
        const bonus = Math.round((earnedWageBase * 8.33) / 100);
        // Total Earned Gross Salary (Gross Pay before Employee Deductions: Basic + DA + HRA + Allowances)
        const grossSalary = earnedBasic + earnedDa + earnedHra + earnedSpecialAllowance + earnedConveyance + earnedMedical + earnedLta + earnedFood + earnedComm + earnedVariable + earnedOther + overtimePay;
        // Loss of Pay Deduction for Slip Reference
        const lopDeduction = Math.round((rateCard.grossSalary / totalDaysInMonth) * lopDays);
        // 5. Statutory Employee Deductions (Calculated strictly as per Statutory Slabs Calculator)
        // Employee PF (12% of Basic+DA = ₹1,920 on full attendance)
        const employeePf = rateCard.employeePf
            ? Math.round((rateCard.employeePf / totalDaysInMonth) * payableDays)
            : Math.round((Math.min(earnedWageBase, 15000) * 12) / 100);
        // Employee ESI (0.75% of Gross = ₹171 on full attendance)
        const employeeEsi = rateCard.employeeEsi
            ? Math.round((rateCard.employeeEsi / totalDaysInMonth) * payableDays)
            : Math.round((grossSalary * 0.75) / 100);
        // Professional Tax (PT Telangana Slabs = ₹200)
        const professionalTax = rateCard.professionalTax ?? (grossSalary > 15000 ? 200 : grossSalary > 10000 ? 150 : 0);
        // Employee LWF (₹2.00)
        const employeeLwf = rateCard.employeeLwf || 2.0;
        const tdsDeduction = rateCard.tdsDeduction || 0;
        const totalEmpDeductions = employeePf + employeeEsi + professionalTax + employeeLwf + tdsDeduction;
        // 6. Net Take-Home Salary
        const netSalary = Math.max(0, grossSalary - totalEmpDeductions);
        // 7. Employer Statutory Contributions & Facility Allowances (Cost to Company - CTC)
        const employerPf = rateCard.employerPf
            ? Math.round((rateCard.employerPf / totalDaysInMonth) * payableDays)
            : Math.round((Math.min(earnedWageBase, 15000) * 13) / 100); // 13% Employer EPF + Admin
        const employerEsi = rateCard.employerEsi
            ? Math.round((rateCard.employerEsi / totalDaysInMonth) * payableDays)
            : Math.round((earnedWageBase * 3.25) / 100); // 3.25% Employer ESI
        const telanganaLwf = rateCard.telanganaLwfEmployer || 0.17;
        const gratuity = Math.round(((15 / 26) * earnedWageBase) / 12);
        totalGross += grossSalary;
        totalDeductions += totalEmpDeductions;
        totalNet += netSalary;
        const payslipNumber = `PAY-${year}${String(month).padStart(2, '0')}-${emp.employeeId}`;
        await db_1.default.payrollItem.create({
            data: {
                payrollId: payroll.id,
                employeeId: emp.id,
                workingDays: totalDaysInMonth,
                presentDays: payableDays, // Total statutory paid days
                paidLeaveDays: paidLeaveDays + weeklyOffDays + holidayDays,
                lopDays,
                // Earned Gross Components
                basic: earnedBasic,
                da: earnedDa,
                hra: earnedHra,
                conveyance: earnedConveyance,
                medicalAllowance: earnedMedical,
                specialAllowance: earnedSpecialAllowance,
                uniformAllowance: earnedUniform,
                leaveWages: earnedLeaveWages,
                lta: earnedLta,
                foodAllowance: earnedFood,
                communicationAllowance: earnedComm,
                variablePay: earnedVariable,
                overtimePay,
                bonus,
                otherAllowance: earnedOther,
                grossSalary,
                // Employer Contributions
                employerPf,
                employerEsi,
                telanganaLwf,
                gratuity,
                insuranceBenefit: 0,
                // Employee Deductions
                pfDeduction: employeePf,
                esiDeduction: employeeEsi,
                ptDeduction: professionalTax,
                tdsDeduction,
                lopDeduction,
                otherDeductions: employeeLwf,
                totalDeductions: totalEmpDeductions,
                netSalary,
                status: 'PENDING',
                payslipNumber,
            },
        });
    }
    // Update master payroll batch summary
    const updatedPayroll = await db_1.default.payroll.update({
        where: { id: payroll.id },
        data: {
            totalEmployees: employees.length,
            totalGross,
            totalDeductions,
            totalNet,
            status: 'CALCULATED',
            processedAt: new Date(),
        },
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
            },
        },
    });
    return updatedPayroll;
}
/**
 * ⚡ Real-Time Attendance-to-Payslip Engine:
 * Automatically calculates and updates an employee's monthly payslip
 * whenever ANY changes happen (attendance punches, shifts, week-offs, leaves, overtime, rate cards)
 * WITHOUT requiring manual batch approval!
 */
async function syncEmployeePayslipFromAttendance(employeeId, dateOrMonth, yearParam) {
    try {
        let month;
        let year;
        if (typeof dateOrMonth === 'string' && dateOrMonth.includes('-')) {
            const parts = dateOrMonth.split('-');
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
        }
        else if (typeof dateOrMonth === 'number') {
            month = dateOrMonth;
            year = yearParam || new Date().getFullYear();
        }
        else {
            const now = new Date();
            month = now.getMonth() + 1;
            year = yearParam || now.getFullYear();
        }
        if (!month || !year)
            return null;
        // Fetch employee with current salary structure and site
        const emp = await db_1.default.employee.findFirst({
            where: { OR: [{ id: employeeId }, { employeeId }] },
            include: {
                salaryStructures: {
                    where: { isCurrent: true },
                    take: 1,
                },
                site: true,
                department: true,
                designation: true,
            },
        });
        if (!emp)
            return null;
        // 1. Resolve Rate Card: Check Employee Structure -> Site Facility Rate Card -> Default VPHS Standard
        let rateCard = { ...exports.VPHS_STANDARD_RATE_CARD };
        if (emp.salaryStructures && emp.salaryStructures.length > 0 && emp.salaryStructures[0].basic > 0) {
            const s = emp.salaryStructures[0];
            rateCard = {
                basic: s.basic !== undefined && s.basic !== null ? s.basic : 6000,
                da: s.da !== undefined && s.da !== null ? s.da : 10000,
                subTotal1: (s.basic || 0) + (s.da || 0),
                hra: s.hra !== undefined && s.hra !== null ? s.hra : 6783,
                specialAllowance: s.specialAllowance || 0,
                conveyance: s.conveyance || 0,
                medicalAllowance: s.medicalAllowance || 0,
                uniformAllowance: s.uniformAllowance !== undefined && s.uniformAllowance !== null ? s.uniformAllowance : 200,
                leaveWages: s.leaveWages !== undefined && s.leaveWages !== null ? s.leaveWages : (Math.round((s.grossSalary || 22783) * 0.125) || 2848),
                lta: s.lta || 0,
                foodAllowance: s.foodAllowance || 0,
                communicationAllowance: s.communicationAllowance || 0,
                variablePay: s.variablePay || 0,
                otherAllowance: s.otherAllowance || 0,
                grossSalary: s.grossSalary || 22783,
                employerPf: s.employerPf !== undefined && s.employerPf !== null ? s.employerPf : 1950,
                employerEsi: s.employerEsi !== undefined && s.employerEsi !== null ? s.employerEsi : 613,
                bonus: s.bonus !== undefined && s.bonus !== null ? s.bonus : 1333,
                telanganaLwfEmployer: s.telanganaLwf !== undefined && s.telanganaLwf !== null ? s.telanganaLwf : 0.17,
                employeePf: s.employeePf !== undefined && s.employeePf !== null ? s.employeePf : 1920,
                employeeEsi: s.employeeEsi !== undefined && s.employeeEsi !== null ? s.employeeEsi : 171,
                professionalTax: s.professionalTax !== undefined && s.professionalTax !== null ? s.professionalTax : 200,
                employeeLwf: 2,
                tdsDeduction: s.tdsDeduction || 0,
                netSalary: s.netSalary || 20610,
                ctc: s.ctc || 29727,
            };
        }
        else if (emp.site && emp.site.rateCardJson) {
            try {
                const siteCard = JSON.parse(emp.site.rateCardJson);
                rateCard = {
                    basic: siteCard.basic !== undefined && siteCard.basic !== null ? siteCard.basic : 6000,
                    da: siteCard.da !== undefined && siteCard.da !== null ? siteCard.da : 10000,
                    subTotal1: (siteCard.basic || 0) + (siteCard.da || 0),
                    hra: siteCard.hra !== undefined && siteCard.hra !== null ? siteCard.hra : 6783,
                    specialAllowance: siteCard.specialAllowance || 0,
                    conveyance: siteCard.conveyance || 0,
                    medicalAllowance: siteCard.medicalAllowance || 0,
                    uniformAllowance: siteCard.uniformAllowance !== undefined && siteCard.uniformAllowance !== null ? siteCard.uniformAllowance : 200,
                    leaveWages: siteCard.leaveWages !== undefined && siteCard.leaveWages !== null ? siteCard.leaveWages : (Math.round((siteCard.grossSalary || 22783) * 0.125) || 2848),
                    lta: siteCard.lta || 0,
                    foodAllowance: siteCard.foodAllowance || 0,
                    communicationAllowance: siteCard.communicationAllowance || 0,
                    variablePay: siteCard.variablePay || 0,
                    otherAllowance: siteCard.otherAllowance || 0,
                    grossSalary: siteCard.grossSalary || 22783,
                    employerPf: siteCard.employerPf !== undefined && siteCard.employerPf !== null ? siteCard.employerPf : 1950,
                    employerEsi: siteCard.employerEsi !== undefined && siteCard.employerEsi !== null ? siteCard.employerEsi : 613,
                    bonus: siteCard.bonus !== undefined && siteCard.bonus !== null ? siteCard.bonus : 1333,
                    telanganaLwfEmployer: siteCard.telanganaLwf !== undefined && siteCard.telanganaLwf !== null ? siteCard.telanganaLwf : 0.17,
                    employeePf: siteCard.employeePf !== undefined && siteCard.employeePf !== null ? siteCard.employeePf : 1920,
                    employeeEsi: siteCard.employeeEsi !== undefined && siteCard.employeeEsi !== null ? siteCard.employeeEsi : 171,
                    professionalTax: siteCard.professionalTax !== undefined && siteCard.professionalTax !== null ? siteCard.professionalTax : 200,
                    employeeLwf: 2,
                    tdsDeduction: 0,
                    netSalary: siteCard.netSalary || 20610,
                    ctc: siteCard.ctc || 29727,
                };
            }
            catch (e) { }
        }
        // 2. Fetch Days in Month & Attendance Records
        const totalDaysInMonth = new Date(year, month, 0).getDate();
        const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(totalDaysInMonth).padStart(2, '0')}`;
        const attendances = await db_1.default.attendance.findMany({
            where: {
                employeeId: emp.id,
                date: {
                    gte: startDateStr,
                    lte: endDateStr,
                },
            },
        });
        let presentDays = 0;
        let weeklyOffDays = 0;
        let holidayDays = 0;
        let paidLeaveDays = 0;
        let halfDays = 0;
        let absentDays = 0;
        let overtimeHours = 0;
        for (const att of attendances) {
            if (['PRESENT', 'ON_DUTY'].includes(att.status)) {
                presentDays += 1;
            }
            else if (att.status === 'LATE') {
                presentDays += 1;
            }
            else if (att.status === 'HALF_DAY') {
                halfDays += 1;
            }
            else if (att.status === 'WEEK_OFF') {
                weeklyOffDays += 1;
            }
            else if (att.status === 'HOLIDAY') {
                holidayDays += 1;
            }
            else if (att.status === 'LEAVE') {
                paidLeaveDays += 1;
            }
            else if (att.status === 'ABSENT') {
                absentDays += 1;
            }
            overtimeHours += att.overtimeHours || 0;
        }
        let payableDays = totalDaysInMonth;
        let lopDays = 0;
        if (attendances.length > 0) {
            payableDays = presentDays + weeklyOffDays + holidayDays + paidLeaveDays + (0.5 * halfDays);
            lopDays = Math.max(0, totalDaysInMonth - payableDays);
        }
        else {
            payableDays = totalDaysInMonth;
            presentDays = totalDaysInMonth;
            lopDays = 0;
        }
        // 3. Prorate Components strictly as per attendance
        const earnedBasic = Math.round((rateCard.basic / totalDaysInMonth) * payableDays);
        const earnedDa = Math.round((rateCard.da / totalDaysInMonth) * payableDays);
        const earnedWageBase = earnedBasic + earnedDa;
        const earnedHra = Math.round((rateCard.hra / totalDaysInMonth) * payableDays);
        const earnedSpecialAllowance = Math.round(((rateCard.specialAllowance || 0) / totalDaysInMonth) * payableDays);
        const earnedConveyance = Math.round(((rateCard.conveyance || 0) / totalDaysInMonth) * payableDays);
        const earnedMedical = Math.round(((rateCard.medicalAllowance || 0) / totalDaysInMonth) * payableDays);
        const earnedUniform = Math.round((rateCard.uniformAllowance / totalDaysInMonth) * payableDays);
        const earnedLeaveWages = Math.round((rateCard.leaveWages / totalDaysInMonth) * payableDays);
        const earnedLta = Math.round(((rateCard.lta || 0) / totalDaysInMonth) * payableDays);
        const earnedFood = Math.round(((rateCard.foodAllowance || 0) / totalDaysInMonth) * payableDays);
        const earnedComm = Math.round(((rateCard.communicationAllowance || 0) / totalDaysInMonth) * payableDays);
        const earnedVariable = Math.round(((rateCard.variablePay || 0) / totalDaysInMonth) * payableDays);
        const earnedOther = Math.round(((rateCard.otherAllowance || 0) / totalDaysInMonth) * payableDays);
        const hourlyOtRate = rateCard.grossSalary / (totalDaysInMonth * 8);
        const overtimePay = Math.round(hourlyOtRate * 1.5 * overtimeHours);
        const bonus = Math.round((earnedWageBase * 8.33) / 100);
        const grossSalary = earnedBasic + earnedDa + earnedHra + earnedSpecialAllowance + earnedConveyance + earnedMedical + earnedLta + earnedFood + earnedComm + earnedVariable + earnedOther + overtimePay;
        const lopDeduction = Math.round((rateCard.grossSalary / totalDaysInMonth) * lopDays);
        const employeePf = rateCard.employeePf
            ? Math.round((rateCard.employeePf / totalDaysInMonth) * payableDays)
            : Math.round((Math.min(earnedWageBase, 15000) * 12) / 100);
        const employeeEsi = rateCard.employeeEsi
            ? Math.round((rateCard.employeeEsi / totalDaysInMonth) * payableDays)
            : Math.round((grossSalary * 0.75) / 100);
        const professionalTax = rateCard.professionalTax ?? (grossSalary > 15000 ? 200 : grossSalary > 10000 ? 150 : 0);
        const employeeLwf = rateCard.employeeLwf || 2.0;
        const tdsDeduction = rateCard.tdsDeduction || 0;
        const totalEmpDeductions = employeePf + employeeEsi + professionalTax + employeeLwf + tdsDeduction;
        const netSalary = Math.max(0, grossSalary - totalEmpDeductions);
        const employerPf = rateCard.employerPf
            ? Math.round((rateCard.employerPf / totalDaysInMonth) * payableDays)
            : Math.round((Math.min(earnedWageBase, 15000) * 13) / 100);
        const employerEsi = rateCard.employerEsi
            ? Math.round((rateCard.employerEsi / totalDaysInMonth) * payableDays)
            : Math.round((earnedWageBase * 3.25) / 100);
        const telanganaLwf = rateCard.telanganaLwfEmployer || 0.17;
        const gratuity = Math.round(((15 / 26) * earnedWageBase) / 12);
        // 4. Ensure master Payroll record exists for this month/year
        let payroll = await db_1.default.payroll.findUnique({
            where: {
                payrollMonth_payrollYear: {
                    payrollMonth: month,
                    payrollYear: year,
                },
            },
        });
        if (!payroll) {
            payroll = await db_1.default.payroll.create({
                data: {
                    payrollMonth: month,
                    payrollYear: year,
                    status: 'CALCULATED',
                    processedAt: new Date(),
                    remarks: `Auto-created via attendance activity`,
                },
            });
        }
        const payslipNumber = `PAY-${year}${String(month).padStart(2, '0')}-${emp.employeeId}`;
        // Check if payroll item already exists
        const existingItem = await db_1.default.payrollItem.findFirst({
            where: {
                payrollId: payroll.id,
                employeeId: emp.id,
            },
        });
        let payrollItem;
        if (existingItem) {
            payrollItem = await db_1.default.payrollItem.update({
                where: { id: existingItem.id },
                data: {
                    workingDays: totalDaysInMonth,
                    presentDays: payableDays,
                    paidLeaveDays: paidLeaveDays + weeklyOffDays + holidayDays,
                    lopDays,
                    basic: earnedBasic,
                    da: earnedDa,
                    hra: earnedHra,
                    conveyance: earnedConveyance,
                    medicalAllowance: earnedMedical,
                    specialAllowance: earnedSpecialAllowance,
                    uniformAllowance: earnedUniform,
                    leaveWages: earnedLeaveWages,
                    lta: earnedLta,
                    foodAllowance: earnedFood,
                    communicationAllowance: earnedComm,
                    variablePay: earnedVariable,
                    otherAllowance: earnedOther,
                    overtimePay,
                    bonus,
                    grossSalary,
                    employerPf,
                    employerEsi,
                    telanganaLwf,
                    gratuity,
                    pfDeduction: employeePf,
                    esiDeduction: employeeEsi,
                    ptDeduction: professionalTax,
                    tdsDeduction,
                    lopDeduction,
                    otherDeductions: employeeLwf,
                    totalDeductions: totalEmpDeductions,
                    netSalary,
                    payslipNumber,
                },
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
        }
        else {
            payrollItem = await db_1.default.payrollItem.create({
                data: {
                    payrollId: payroll.id,
                    employeeId: emp.id,
                    workingDays: totalDaysInMonth,
                    presentDays: payableDays,
                    paidLeaveDays: paidLeaveDays + weeklyOffDays + holidayDays,
                    lopDays,
                    basic: earnedBasic,
                    da: earnedDa,
                    hra: earnedHra,
                    conveyance: earnedConveyance,
                    medicalAllowance: earnedMedical,
                    specialAllowance: earnedSpecialAllowance,
                    uniformAllowance: earnedUniform,
                    leaveWages: earnedLeaveWages,
                    lta: earnedLta,
                    foodAllowance: earnedFood,
                    communicationAllowance: earnedComm,
                    variablePay: earnedVariable,
                    overtimePay,
                    bonus,
                    otherAllowance: earnedOther,
                    grossSalary,
                    employerPf,
                    employerEsi,
                    telanganaLwf,
                    gratuity,
                    insuranceBenefit: 0,
                    pfDeduction: employeePf,
                    esiDeduction: employeeEsi,
                    ptDeduction: professionalTax,
                    tdsDeduction,
                    lopDeduction,
                    otherDeductions: employeeLwf,
                    totalDeductions: totalEmpDeductions,
                    netSalary,
                    status: 'PENDING',
                    payslipNumber,
                },
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
        }
        // Refresh batch summary totals
        const allItems = await db_1.default.payrollItem.findMany({
            where: { payrollId: payroll.id },
            select: { grossSalary: true, totalDeductions: true, netSalary: true },
        });
        const bGross = allItems.reduce((acc, i) => acc + (i.grossSalary || 0), 0);
        const bDeduct = allItems.reduce((acc, i) => acc + (i.totalDeductions || 0), 0);
        const bNet = allItems.reduce((acc, i) => acc + (i.netSalary || 0), 0);
        await db_1.default.payroll.update({
            where: { id: payroll.id },
            data: {
                totalEmployees: allItems.length,
                totalGross: bGross,
                totalDeductions: bDeduct,
                totalNet: bNet,
                processedAt: new Date(),
            },
        });
        return payrollItem;
    }
    catch (err) {
        console.error('Failed to auto-sync employee payslip from attendance:', err);
        return null;
    }
}
async function syncAllSiteEmployeesPayslips(siteId, month, year) {
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();
    const emps = await db_1.default.employee.findMany({
        where: { siteId, status: { in: ['ACTIVE', 'ON_LEAVE'] } },
        select: { id: true },
    });
    for (const emp of emps) {
        await syncEmployeePayslipFromAttendance(emp.id, m, y);
    }
}
