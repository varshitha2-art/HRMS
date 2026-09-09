"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSites = getSites;
exports.getSiteById = getSiteById;
exports.createSite = createSite;
exports.updateSite = updateSite;
exports.deleteSite = deleteSite;
exports.assignEmployeeToSite = assignEmployeeToSite;
exports.updateSiteRateCard = updateSiteRateCard;
exports.getSiteRateCard = getSiteRateCard;
const db_1 = __importDefault(require("../config/db"));
const response_1 = require("../utils/response");
const schemas_1 = require("../validators/schemas");
const audit_1 = require("../middleware/audit");
const rbacService_1 = require("../services/rbacService");
const payrollService_1 = require("../services/payrollService");
async function getSites(req, res) {
    try {
        if (!req.user)
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        const { status, search } = req.query;
        let baseWhere = {};
        if (status)
            baseWhere.status = status;
        if (search) {
            baseWhere.OR = [
                { siteName: { contains: search } },
                { siteCode: { contains: search } },
                { clientName: { contains: search } },
                { location: { contains: search } },
            ];
        }
        // Apply strict database-level RBAC filtering
        const where = await (0, rbacService_1.buildSiteWhereClause)(req.user, baseWhere);
        const sites = await db_1.default.site.findMany({
            where,
            orderBy: { siteName: 'asc' },
            include: {
                _count: {
                    select: { employees: true, attendances: true },
                },
                employees: {
                    select: {
                        id: true,
                        employeeId: true,
                        firstName: true,
                        lastName: true,
                        designation: { select: { title: true } },
                        department: { select: { name: true } },
                        status: true,
                    },
                },
            },
        });
        return (0, response_1.sendSuccess)(res, sites);
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 500);
    }
}
async function getSiteById(req, res) {
    try {
        if (!req.user)
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        const { id } = req.params;
        const accessibleSiteIds = await (0, rbacService_1.getAccessibleSiteIds)(req.user);
        if (accessibleSiteIds !== 'ALL') {
            const siteCheck = await db_1.default.site.findFirst({
                where: { OR: [{ id }, { siteCode: id }] },
                select: { id: true },
            });
            if (!siteCheck || !accessibleSiteIds.includes(siteCheck.id)) {
                return (0, response_1.sendError)(res, 'Access denied: You do not have permission to view this client site', 403);
            }
        }
        const site = await db_1.default.site.findFirst({
            where: { OR: [{ id }, { siteCode: id }] },
            include: {
                employees: {
                    include: {
                        designation: true,
                        department: true,
                        shift: true,
                    },
                },
                siteAssignments: {
                    include: { employee: true },
                },
                holidays: true,
            },
        });
        if (!site) {
            return (0, response_1.sendError)(res, 'Site not found', 404);
        }
        return (0, response_1.sendSuccess)(res, site);
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 500);
    }
}
async function createSite(req, res) {
    try {
        if (!req.user || !['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
            return (0, response_1.sendError)(res, 'Access denied: Insufficient permissions to create sites', 403);
        }
        const validated = schemas_1.siteCreateSchema.parse(req.body);
        const existing = await db_1.default.site.findUnique({
            where: { siteCode: validated.siteCode },
        });
        if (existing) {
            return (0, response_1.sendError)(res, `Site code ${validated.siteCode} already exists`, 409);
        }
        const site = await db_1.default.site.create({
            data: {
                ...validated,
                contractStartDate: validated.contractStartDate ? new Date(validated.contractStartDate) : null,
                contractEndDate: validated.contractEndDate ? new Date(validated.contractEndDate) : null,
            },
        });
        await (0, audit_1.logAuditAction)(req.user?.userId, 'SITE', 'CREATE', site.id, { siteCode: site.siteCode, name: site.siteName }, req.ip);
        return (0, response_1.sendSuccess)(res, site, 'Site created successfully', undefined, 201);
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 400);
    }
}
async function updateSite(req, res) {
    try {
        if (!req.user || !['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
            return (0, response_1.sendError)(res, 'Access denied: Insufficient permissions to update sites', 403);
        }
        const { id } = req.params;
        const updateData = { ...req.body };
        if (updateData.contractStartDate)
            updateData.contractStartDate = new Date(updateData.contractStartDate);
        if (updateData.contractEndDate)
            updateData.contractEndDate = new Date(updateData.contractEndDate);
        const site = await db_1.default.site.update({
            where: { id },
            data: updateData,
        });
        await (0, audit_1.logAuditAction)(req.user?.userId, 'SITE', 'UPDATE', site.id, { siteCode: site.siteCode }, req.ip);
        return (0, response_1.sendSuccess)(res, site, 'Site updated successfully');
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 400);
    }
}
async function deleteSite(req, res) {
    try {
        if (!req.user || req.user.role !== 'SUPER_ADMIN') {
            return (0, response_1.sendError)(res, 'Access denied: Only Super Admin can deactivate sites', 403);
        }
        const { id } = req.params;
        await db_1.default.site.update({
            where: { id },
            data: { status: 'INACTIVE' },
        });
        await (0, audit_1.logAuditAction)(req.user?.userId, 'SITE', 'DELETE', id, { status: 'INACTIVE' }, req.ip);
        return (0, response_1.sendSuccess)(res, null, 'Site status set to INACTIVE');
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 400);
    }
}
async function assignEmployeeToSite(req, res) {
    try {
        if (!req.user || !['SUPER_ADMIN', 'ADMIN', 'HR', 'SITE_MANAGER'].includes(req.user.role)) {
            return (0, response_1.sendError)(res, 'Access denied', 403);
        }
        const { id } = req.params; // siteId
        const { employeeId, roleAtSite } = req.body;
        const [emp, site] = await Promise.all([
            db_1.default.employee.findUnique({ where: { id: employeeId } }),
            db_1.default.site.findUnique({ where: { id } }),
        ]);
        if (!emp || !site) {
            return (0, response_1.sendError)(res, 'Employee or Site not found', 404);
        }
        // Update employee primary site
        await db_1.default.employee.update({
            where: { id: employeeId },
            data: { siteId: id },
        });
        // Create assignment record
        const assignment = await db_1.default.siteAssignment.create({
            data: {
                siteId: id,
                employeeId: employeeId,
                roleAtSite: roleAtSite || 'Staff Member',
                status: 'ACTIVE',
            },
        });
        await (0, audit_1.logAuditAction)(req.user?.userId, 'SITE', 'UPDATE', id, { action: 'Assigned employee', employeeId }, req.ip);
        return (0, response_1.sendSuccess)(res, assignment, 'Employee assigned to site successfully');
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 400);
    }
}
async function updateSiteRateCard(req, res) {
    try {
        if (!req.user || !['SUPER_ADMIN', 'ADMIN', 'HR'].includes(req.user.role)) {
            return (0, response_1.sendError)(res, 'Access denied: Insufficient permissions to update site rate cards', 403);
        }
        const { id } = req.params;
        const { rateCard } = req.body;
        const rateCardJson = typeof rateCard === 'string' ? rateCard : JSON.stringify(rateCard);
        const site = await db_1.default.site.update({
            where: { id },
            data: {
                rateCardJson,
            },
        });
        await (0, audit_1.logAuditAction)(req.user?.userId, 'SITE', 'UPDATE', site.id, { action: 'Updated Site Statutory Rate Card', siteCode: site.siteCode }, req.ip);
        // ⚡ Real-Time Auto-Sync: Refresh all employees' payslips for this site to reflect the new rate card automatically
        try {
            await (0, payrollService_1.syncAllSiteEmployeesPayslips)(site.id);
        }
        catch (syncErr) {
            console.warn('Payslip auto-sync on site rate card update failed:', syncErr);
        }
        return (0, response_1.sendSuccess)(res, { id: site.id, siteCode: site.siteCode, siteName: site.siteName, rateCard: rateCard }, 'Site statutory rate card updated successfully');
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 400);
    }
}
async function getSiteRateCard(req, res) {
    try {
        if (!req.user)
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        const { id } = req.params;
        const site = await db_1.default.site.findUnique({
            where: { id },
            select: { id: true, siteCode: true, siteName: true, clientName: true, rateCardJson: true, billingRate: true },
        });
        if (!site)
            return (0, response_1.sendError)(res, 'Site not found', 404);
        let rateCard = null;
        if (site.rateCardJson) {
            try {
                rateCard = JSON.parse(site.rateCardJson);
            }
            catch (e) {
                rateCard = null;
            }
        }
        return (0, response_1.sendSuccess)(res, { ...site, rateCard });
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 500);
    }
}
