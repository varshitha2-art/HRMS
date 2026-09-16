import { Router } from 'express';
import { authenticate, requireRoles } from '../middleware/auth';
import { upload } from '../middleware/upload';

import * as authController from '../controllers/authController';
import * as employeeController from '../controllers/employeeController';
import * as siteController from '../controllers/siteController';
import * as attendanceController from '../controllers/attendanceController';
import * as leaveController from '../controllers/leaveController';
import * as payrollController from '../controllers/payrollController';
import * as documentController from '../controllers/documentController';
import * as reportController from '../controllers/reportController';
import * as dashboardController from '../controllers/dashboardController';
import * as settingsController from '../controllers/settingsController';
import * as auditController from '../controllers/auditController';
import * as importController from '../controllers/importController';
import * as notificationController from '../controllers/notificationController';

const router = Router();

// ==========================================
// AUTHENTICATION
// ==========================================
router.post('/auth/login', authController.login);
router.post('/auth/quick-login', authController.quickDemoLogin);
router.get('/auth/me', authenticate, authController.getMe);
router.post('/auth/logout', authenticate, authController.logout);

// ==========================================
// DASHBOARD
// ==========================================
router.get('/dashboard/summary', authenticate, dashboardController.getDashboardSummary);

// ==========================================
// EMPLOYEES
// ==========================================
router.get('/employees', authenticate, employeeController.getEmployees);
router.get('/employees/:id', authenticate, employeeController.getEmployeeById);
router.post('/employees', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN', 'HR'), employeeController.createEmployee);
router.put('/employees/:id', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN', 'HR'), employeeController.updateEmployee);
router.post('/employees/:id/photo', authenticate, upload.single('photo'), employeeController.uploadEmployeePhoto);
router.delete('/employees/:id/photo', authenticate, employeeController.removeEmployeePhoto);
router.put('/employees/:id/salary-structure', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN', 'HR'), employeeController.updateSalaryStructure);
router.delete('/employees/:id', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN'), employeeController.deleteEmployee);

// ==========================================
// SITES
// ==========================================
router.get('/sites', authenticate, siteController.getSites);
router.get('/sites/:id', authenticate, siteController.getSiteById);
router.get('/sites/:id/rate-card', authenticate, siteController.getSiteRateCard);
router.put('/sites/:id/rate-card', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN', 'HR'), siteController.updateSiteRateCard);
router.post('/sites', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN'), siteController.createSite);
router.put('/sites/:id', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN'), siteController.updateSite);
router.delete('/sites/:id', authenticate, requireRoles('SUPER_ADMIN'), siteController.deleteSite);
router.post('/sites/:id/assign', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN', 'HR', 'SITE_MANAGER'), siteController.assignEmployeeToSite);

// ==========================================
// ATTENDANCE
// ==========================================
router.get('/attendance', authenticate, attendanceController.getAttendance);
router.post('/attendance', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN', 'HR', 'SITE_MANAGER', 'SUPERVISOR', 'EMPLOYEE'), attendanceController.markAttendance);
router.post('/attendance/punch-in', authenticate, attendanceController.punchInDirect);
router.post('/attendance/punch-out', authenticate, attendanceController.punchOutDirect);
router.get('/attendance/monthly', authenticate, attendanceController.getMonthlyMatrix);
router.post('/attendance/sandwich-rule', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN', 'HR', 'SITE_MANAGER'), attendanceController.applySandwichRuleBatch);

// ==========================================
// LEAVES
// ==========================================
router.get('/leaves', authenticate, leaveController.getLeaves);
router.get('/leaves/balance/:id', authenticate, leaveController.getEmployeeLeaveBalance);
router.post('/leaves', authenticate, leaveController.requestLeave);
router.put('/leaves/:id/approve', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN', 'HR', 'SITE_MANAGER', 'SUPERVISOR'), leaveController.approveLeave);
router.put('/leaves/:id/reject', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN', 'HR', 'SITE_MANAGER', 'SUPERVISOR'), leaveController.rejectLeave);

// ==========================================
// PAYROLL & PAYSLIP
// ==========================================
router.get('/payroll', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN', 'HR'), payrollController.getPayrolls);
router.get('/payroll/my-payslips', authenticate, payrollController.getMyPayslips);
router.get('/payroll/:id', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN', 'HR'), payrollController.getPayrollById);
router.post('/payroll/generate', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN', 'HR'), payrollController.generatePayroll);
router.post('/payroll/calculate-structure', authenticate, payrollController.calculateStructureHandler);
router.post('/payroll/apply-calculator-structure', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN', 'HR'), payrollController.applyCalculatorStructure);
router.put('/payroll/:id/approve', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN'), payrollController.approvePayroll);
router.get('/payroll/payslip/:itemId', authenticate, payrollController.getPayslip);

// ==========================================
// DOCUMENTS
// ==========================================
router.get('/documents', authenticate, documentController.getDocuments);
router.post('/documents/upload', authenticate, upload.single('file'), documentController.uploadDocument);
router.delete('/documents/:id', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN', 'HR'), documentController.deleteDocument);

// ==========================================
// REPORTS & ANALYTICS
// ==========================================
router.get('/reports', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN', 'HR', 'SITE_MANAGER'), reportController.getReportData);

// ==========================================
// DATA IMPORT (EXCEL / CSV)
// ==========================================
router.post('/import/employees', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN', 'HR'), upload.single('file'), importController.importEmployees);

// ==========================================
// SETTINGS
// ==========================================
router.get('/settings', authenticate, settingsController.getAllSettings);
router.put('/settings/company', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN'), settingsController.updateCompanySettings);
router.put('/settings/attendance', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN'), settingsController.updateAttendanceSettings);
router.put('/settings/payroll', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN'), settingsController.updatePayrollSettings);
router.put('/settings/geotag', authenticate, requireRoles('SUPER_ADMIN'), settingsController.updateGeotagSettings);

// ==========================================
// AUDIT LOGS
// ==========================================
router.get('/audit-logs', authenticate, requireRoles('SUPER_ADMIN', 'ADMIN'), auditController.getAuditLogs);

// ==========================================
// NOTIFICATIONS
// ==========================================
router.get('/notifications', authenticate, notificationController.getNotifications);
router.put('/notifications/:id/read', authenticate, notificationController.markNotificationAsRead);

export default router;
