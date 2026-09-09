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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const authController = __importStar(require("../controllers/authController"));
const employeeController = __importStar(require("../controllers/employeeController"));
const siteController = __importStar(require("../controllers/siteController"));
const attendanceController = __importStar(require("../controllers/attendanceController"));
const leaveController = __importStar(require("../controllers/leaveController"));
const payrollController = __importStar(require("../controllers/payrollController"));
const documentController = __importStar(require("../controllers/documentController"));
const reportController = __importStar(require("../controllers/reportController"));
const dashboardController = __importStar(require("../controllers/dashboardController"));
const settingsController = __importStar(require("../controllers/settingsController"));
const auditController = __importStar(require("../controllers/auditController"));
const importController = __importStar(require("../controllers/importController"));
const notificationController = __importStar(require("../controllers/notificationController"));
const router = (0, express_1.Router)();
// ==========================================
// AUTHENTICATION
// ==========================================
router.post('/auth/login', authController.login);
router.post('/auth/quick-login', authController.quickDemoLogin);
router.get('/auth/me', auth_1.authenticate, authController.getMe);
router.post('/auth/logout', auth_1.authenticate, authController.logout);
// ==========================================
// DASHBOARD
// ==========================================
router.get('/dashboard/summary', auth_1.authenticate, dashboardController.getDashboardSummary);
// ==========================================
// EMPLOYEES
// ==========================================
router.get('/employees', auth_1.authenticate, employeeController.getEmployees);
router.get('/employees/:id', auth_1.authenticate, employeeController.getEmployeeById);
router.post('/employees', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN', 'ADMIN', 'HR'), employeeController.createEmployee);
router.put('/employees/:id', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN', 'ADMIN', 'HR'), employeeController.updateEmployee);
router.post('/employees/:id/photo', auth_1.authenticate, upload_1.upload.single('photo'), employeeController.uploadEmployeePhoto);
router.delete('/employees/:id/photo', auth_1.authenticate, employeeController.removeEmployeePhoto);
router.put('/employees/:id/salary-structure', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN', 'ADMIN', 'HR'), employeeController.updateSalaryStructure);
router.delete('/employees/:id', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN', 'ADMIN'), employeeController.deleteEmployee);
// ==========================================
// SITES
// ==========================================
router.get('/sites', auth_1.authenticate, siteController.getSites);
router.get('/sites/:id', auth_1.authenticate, siteController.getSiteById);
router.get('/sites/:id/rate-card', auth_1.authenticate, siteController.getSiteRateCard);
router.put('/sites/:id/rate-card', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN', 'ADMIN', 'HR'), siteController.updateSiteRateCard);
router.post('/sites', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN', 'ADMIN'), siteController.createSite);
router.put('/sites/:id', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN', 'ADMIN'), siteController.updateSite);
router.delete('/sites/:id', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN'), siteController.deleteSite);
router.post('/sites/:id/assign', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN', 'ADMIN', 'HR', 'SITE_MANAGER'), siteController.assignEmployeeToSite);
// ==========================================
// ATTENDANCE
// ==========================================
router.get('/attendance', auth_1.authenticate, attendanceController.getAttendance);
router.post('/attendance', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN', 'ADMIN', 'HR', 'SITE_MANAGER', 'SUPERVISOR', 'EMPLOYEE'), attendanceController.markAttendance);
router.post('/attendance/punch-in', auth_1.authenticate, attendanceController.punchInDirect);
router.post('/attendance/punch-out', auth_1.authenticate, attendanceController.punchOutDirect);
router.get('/attendance/monthly', auth_1.authenticate, attendanceController.getMonthlyMatrix);
router.post('/attendance/sandwich-rule', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN', 'ADMIN', 'HR', 'SITE_MANAGER'), attendanceController.applySandwichRuleBatch);
// ==========================================
// LEAVES
// ==========================================
router.get('/leaves', auth_1.authenticate, leaveController.getLeaves);
router.get('/leaves/balance/:id', auth_1.authenticate, leaveController.getEmployeeLeaveBalance);
router.post('/leaves', auth_1.authenticate, leaveController.requestLeave);
router.put('/leaves/:id/approve', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN', 'ADMIN', 'HR', 'SITE_MANAGER', 'SUPERVISOR'), leaveController.approveLeave);
router.put('/leaves/:id/reject', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN', 'ADMIN', 'HR', 'SITE_MANAGER', 'SUPERVISOR'), leaveController.rejectLeave);
// ==========================================
// PAYROLL & PAYSLIP
// ==========================================
router.get('/payroll', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN', 'ADMIN', 'HR'), payrollController.getPayrolls);
router.get('/payroll/my-payslips', auth_1.authenticate, payrollController.getMyPayslips);
router.get('/payroll/:id', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN', 'ADMIN', 'HR'), payrollController.getPayrollById);
router.post('/payroll/generate', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN', 'ADMIN', 'HR'), payrollController.generatePayroll);
router.post('/payroll/calculate-structure', auth_1.authenticate, payrollController.calculateStructureHandler);
router.post('/payroll/apply-calculator-structure', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN', 'ADMIN', 'HR'), payrollController.applyCalculatorStructure);
router.put('/payroll/:id/approve', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN', 'ADMIN'), payrollController.approvePayroll);
router.get('/payroll/payslip/:itemId', auth_1.authenticate, payrollController.getPayslip);
// ==========================================
// DOCUMENTS
// ==========================================
router.get('/documents', auth_1.authenticate, documentController.getDocuments);
router.post('/documents/upload', auth_1.authenticate, upload_1.upload.single('file'), documentController.uploadDocument);
router.delete('/documents/:id', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN', 'ADMIN', 'HR'), documentController.deleteDocument);
// ==========================================
// REPORTS & ANALYTICS
// ==========================================
router.get('/reports', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN', 'ADMIN', 'HR', 'SITE_MANAGER'), reportController.getReportData);
// ==========================================
// DATA IMPORT (EXCEL / CSV)
// ==========================================
router.post('/import/employees', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN', 'ADMIN', 'HR'), upload_1.upload.single('file'), importController.importEmployees);
// ==========================================
// SETTINGS
// ==========================================
router.get('/settings', auth_1.authenticate, settingsController.getAllSettings);
router.put('/settings/company', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN', 'ADMIN'), settingsController.updateCompanySettings);
router.put('/settings/attendance', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN', 'ADMIN'), settingsController.updateAttendanceSettings);
router.put('/settings/payroll', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN', 'ADMIN'), settingsController.updatePayrollSettings);
router.put('/settings/geotag', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN'), settingsController.updateGeotagSettings);
// ==========================================
// AUDIT LOGS
// ==========================================
router.get('/audit-logs', auth_1.authenticate, (0, auth_1.requireRoles)('SUPER_ADMIN', 'ADMIN'), auditController.getAuditLogs);
// ==========================================
// NOTIFICATIONS
// ==========================================
router.get('/notifications', auth_1.authenticate, notificationController.getNotifications);
router.put('/notifications/:id/read', auth_1.authenticate, notificationController.markNotificationAsRead);
exports.default = router;
