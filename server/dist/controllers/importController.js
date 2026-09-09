"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importEmployees = importEmployees;
const db_1 = __importDefault(require("../config/db"));
const response_1 = require("../utils/response");
const audit_1 = require("../middleware/audit");
const xlsx = __importStar(require("xlsx"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../utils/auth");
async function importEmployees(req, res) {
    try {
        const file = req.file;
        if (!file) {
            return (0, response_1.sendError)(res, 'Please upload an Excel (.xlsx/.xls) or CSV file', 400);
        }
        // Read the uploaded workbook
        const workbook = xlsx.readFile(file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
        // Clean temp file
        try {
            fs_1.default.unlinkSync(file.path);
        }
        catch (e) { }
        if (!rows || rows.length === 0) {
            return (0, response_1.sendError)(res, 'The uploaded file is empty', 400);
        }
        const successRecords = [];
        const failedRecords = [];
        // Cache departments, designations, sites for quick ID mapping
        const [departments, designations, sites, shifts, leaveTypes] = await Promise.all([
            db_1.default.department.findMany(),
            db_1.default.designation.findMany(),
            db_1.default.site.findMany(),
            db_1.default.shift.findMany(),
            db_1.default.leaveType.findMany(),
        ]);
        const defaultShift = shifts[0];
        const currentYear = new Date().getFullYear();
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNumber = i + 2; // header is row 1
            const empId = String(row['Employee ID'] || row['employeeId'] || row['ID'] || '').trim();
            const firstName = String(row['First Name'] || row['firstName'] || row['Name'] || '').trim();
            const lastName = String(row['Last Name'] || row['lastName'] || '').trim() || '-';
            const gender = String(row['Gender'] || row['gender'] || 'Male').trim();
            const mobile = String(row['Mobile'] || row['mobile'] || row['Phone'] || '').trim().replace(/[^0-9]/g, '');
            const email = String(row['Email'] || row['email'] || '').trim();
            const designationName = String(row['Designation'] || row['designation'] || '').trim();
            const departmentName = String(row['Department'] || row['department'] || '').trim();
            const siteName = String(row['Site'] || row['site'] || '').trim();
            const salaryCtc = parseFloat(String(row['CTC'] || row['Salary'] || row['salaryCtc'] || '0').replace(/[^0-9.]/g, '')) || 0;
            const aadhaarNumber = String(row['Aadhaar'] || row['aadhaarNumber'] || '').trim();
            const panNumber = String(row['PAN'] || row['panNumber'] || '').trim();
            const bankAccountNo = String(row['Account No'] || row['bankAccountNo'] || '').trim();
            const bankIfsc = String(row['IFSC'] || row['bankIfsc'] || '').trim();
            // Validations
            if (!empId) {
                failedRecords.push({ rowNumber, data: row, reason: 'Missing Employee ID' });
                continue;
            }
            if (!firstName) {
                failedRecords.push({ rowNumber, data: row, reason: 'Missing First Name' });
                continue;
            }
            if (mobile.length < 10) {
                failedRecords.push({ rowNumber, data: row, reason: `Invalid mobile number: "${mobile}" (must be at least 10 digits)` });
                continue;
            }
            // Check duplicate ID in database
            const existing = await db_1.default.employee.findUnique({ where: { employeeId: empId } });
            if (existing) {
                failedRecords.push({ rowNumber, data: row, reason: `Employee ID "${empId}" already exists in database` });
                continue;
            }
            // Find matching relations
            const matchedDept = departments.find(d => d.name.toLowerCase().includes(departmentName.toLowerCase()) || d.code.toLowerCase() === departmentName.toLowerCase());
            const matchedDesig = designations.find(d => d.title.toLowerCase().includes(designationName.toLowerCase()) || d.code.toLowerCase() === designationName.toLowerCase());
            const matchedSite = sites.find(s => s.siteName.toLowerCase().includes(siteName.toLowerCase()) || s.siteCode.toLowerCase() === siteName.toLowerCase());
            try {
                const createdEmp = await db_1.default.employee.create({
                    data: {
                        employeeId: empId,
                        firstName,
                        lastName,
                        gender: ['Male', 'Female', 'Other'].includes(gender) ? gender : 'Male',
                        mobile,
                        email: email || `${empId.toLowerCase()}@vphs.in`,
                        departmentId: matchedDept ? matchedDept.id : departments[0]?.id,
                        designationId: matchedDesig ? matchedDesig.id : designations[0]?.id,
                        siteId: matchedSite ? matchedSite.id : sites[0]?.id,
                        shiftId: defaultShift?.id,
                        salaryCtc,
                        aadhaarNumber,
                        panNumber,
                        bankAccountNo,
                        bankIfsc,
                        status: 'ACTIVE',
                    },
                });
                // Create user login
                const username = empId.toLowerCase().replace(/[^a-z0-9]/g, '');
                await db_1.default.user.create({
                    data: {
                        employeeId: createdEmp.employeeId,
                        username,
                        email: email || `${username}@vphs.in`,
                        passwordHash: (0, auth_1.hashPassword)('password123'),
                        role: 'EMPLOYEE',
                        isActive: true,
                    },
                });
                // Initialize leave balances
                for (const lt of leaveTypes) {
                    await db_1.default.leaveBalance.create({
                        data: {
                            employeeId: createdEmp.id,
                            leaveTypeId: lt.id,
                            year: currentYear,
                            totalAllocated: lt.maxDaysPerYear,
                            remainingDays: lt.maxDaysPerYear,
                        },
                    });
                }
                successRecords.push({
                    employeeId: createdEmp.employeeId,
                    name: `${createdEmp.firstName} ${createdEmp.lastName}`,
                    mobile: createdEmp.mobile,
                    department: matchedDept?.name || 'Assigned',
                });
            }
            catch (err) {
                failedRecords.push({ rowNumber, data: row, reason: err.message || 'Database error' });
            }
        }
        await (0, audit_1.logAuditAction)(req.user?.userId, 'EMPLOYEE', 'CREATE', null, { totalRows: rows.length, successCount: successRecords.length, failureCount: failedRecords.length }, req.ip);
        return (0, response_1.sendSuccess)(res, {
            totalRows: rows.length,
            successCount: successRecords.length,
            failureCount: failedRecords.length,
            successRecords,
            failedRecords,
        }, `Import completed: ${successRecords.length} succeeded, ${failedRecords.length} failed`);
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 500);
    }
}
