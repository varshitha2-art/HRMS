"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllSettings = getAllSettings;
exports.updateCompanySettings = updateCompanySettings;
exports.updateAttendanceSettings = updateAttendanceSettings;
exports.updatePayrollSettings = updatePayrollSettings;
exports.updateGeotagSettings = updateGeotagSettings;
const db_1 = __importDefault(require("../config/db"));
const response_1 = require("../utils/response");
const audit_1 = require("../middleware/audit");
async function getAllSettings(req, res) {
    try {
        const [company, attendance, payroll] = await Promise.all([
            db_1.default.companySetting.findFirst(),
            db_1.default.attendanceSetting.findFirst(),
            db_1.default.payrollSetting.findFirst(),
        ]);
        return (0, response_1.sendSuccess)(res, {
            company: company || {},
            attendance: attendance || {},
            payroll: payroll || {},
            shifts: await db_1.default.shift.findMany(),
            departments: await db_1.default.department.findMany(),
            designations: await db_1.default.designation.findMany(),
            leaveTypes: await db_1.default.leaveType.findMany(),
        });
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 500);
    }
}
async function updateCompanySettings(req, res) {
    try {
        const existing = await db_1.default.companySetting.findFirst();
        const updated = await db_1.default.companySetting.upsert({
            where: { id: existing?.id || 'company_default' },
            update: req.body,
            create: { ...req.body, id: 'company_default' },
        });
        await (0, audit_1.logAuditAction)(req.user?.userId, 'SETTINGS', 'UPDATE', updated.id, { section: 'Company Settings' }, req.ip);
        return (0, response_1.sendSuccess)(res, updated, 'Company settings updated successfully');
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 400);
    }
}
async function updateAttendanceSettings(req, res) {
    try {
        const existing = await db_1.default.attendanceSetting.findFirst();
        const updated = await db_1.default.attendanceSetting.upsert({
            where: { id: existing?.id || 'attendance_default' },
            update: req.body,
            create: { ...req.body, id: 'attendance_default' },
        });
        await (0, audit_1.logAuditAction)(req.user?.userId, 'SETTINGS', 'UPDATE', updated.id, { section: 'Attendance Rules' }, req.ip);
        return (0, response_1.sendSuccess)(res, updated, 'Attendance rules updated successfully');
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 400);
    }
}
async function updatePayrollSettings(req, res) {
    try {
        const existing = await db_1.default.payrollSetting.findFirst();
        const updated = await db_1.default.payrollSetting.upsert({
            where: { id: existing?.id || 'payroll_default' },
            update: req.body,
            create: { ...req.body, id: 'payroll_default' },
        });
        await (0, audit_1.logAuditAction)(req.user?.userId, 'SETTINGS', 'UPDATE', updated.id, { section: 'Payroll Percentages' }, req.ip);
        return (0, response_1.sendSuccess)(res, updated, 'Payroll calculation settings updated successfully');
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 400);
    }
}
async function updateGeotagSettings(req, res) {
    try {
        const { latitude, longitude, locationName, geofenceRadius = 100, isStrictGeofence = true, siteId } = req.body;
        const latVal = parseFloat(latitude) || 17.4435;
        const lngVal = parseFloat(longitude) || 78.3772;
        const radiusVal = parseInt(geofenceRadius, 10) || 100;
        const strictVal = Boolean(isStrictGeofence);
        const existing = await db_1.default.attendanceSetting.findFirst();
        const updated = await db_1.default.attendanceSetting.upsert({
            where: { id: existing?.id || 'attendance_default' },
            update: {
                latitude: latVal,
                longitude: lngVal,
                geofenceRadius: radiusVal,
                isStrictGeofence: strictVal,
                locationName: locationName || 'Microsoft India Campus (Gachibowli)',
            },
            create: {
                id: 'attendance_default',
                latitude: latVal,
                longitude: lngVal,
                geofenceRadius: radiusVal,
                isStrictGeofence: strictVal,
                locationName: locationName || 'Microsoft India Campus (Gachibowli)',
            },
        });
        // If siteId provided, or locationName matches a site, update site coordinates and geofence radius
        let updatedSite = null;
        if (siteId) {
            const existingSite = await db_1.default.site.findFirst({
                where: { OR: [{ id: siteId }, { siteCode: siteId }] },
            });
            if (existingSite) {
                updatedSite = await db_1.default.site.update({
                    where: { id: existingSite.id },
                    data: {
                        latitude: latVal,
                        longitude: lngVal,
                        geofenceRadius: radiusVal,
                    },
                });
            }
        }
        else if (locationName) {
            const cleanName = locationName.split('(')[0].trim();
            if (cleanName.length >= 3) {
                const existingSite = await db_1.default.site.findFirst({
                    where: {
                        OR: [
                            { siteName: { contains: cleanName } },
                            { location: { contains: cleanName } },
                        ],
                    },
                });
                if (existingSite) {
                    updatedSite = await db_1.default.site.update({
                        where: { id: existingSite.id },
                        data: {
                            latitude: latVal,
                            longitude: lngVal,
                            geofenceRadius: radiusVal,
                        },
                    });
                }
            }
        }
        await (0, audit_1.logAuditAction)(req.user?.userId, 'SETTINGS', 'UPDATE', updated.id, { section: 'Geotag Configuration', latitude: latVal, longitude: lngVal, locationName, geofenceRadius: radiusVal, isStrictGeofence: strictVal, siteId: updatedSite?.id || siteId }, req.ip);
        return (0, response_1.sendSuccess)(res, {
            latitude: latVal,
            longitude: lngVal,
            locationName: locationName || 'Microsoft India Campus (Gachibowli)',
            geofenceRadius: radiusVal,
            isStrictGeofence: strictVal,
            site: updatedSite,
        }, `Geotag and geofencing parameters updated successfully${updatedSite ? ` for ${updatedSite.siteName}` : ''}`);
    }
    catch (error) {
        return (0, response_1.sendError)(res, error.message, 400);
    }
}
