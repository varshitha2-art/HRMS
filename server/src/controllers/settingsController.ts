import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../config/db';
import { sendError, sendSuccess } from '../utils/response';
import { logAuditAction } from '../middleware/audit';

export async function getAllSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const [company, attendance, payroll] = await Promise.all([
      prisma.companySetting.findFirst(),
      prisma.attendanceSetting.findFirst(),
      prisma.payrollSetting.findFirst(),
    ]);

    return sendSuccess(res, {
      company: company || {},
      attendance: attendance || {},
      payroll: payroll || {},
      shifts: await prisma.shift.findMany(),
      departments: await prisma.department.findMany(),
      designations: await prisma.designation.findMany(),
      leaveTypes: await prisma.leaveType.findMany(),
    });
  } catch (error: any) {
    return sendError(res, error.message, 500);
  }
}

export async function updateCompanySettings(req: AuthenticatedRequest, res: Response) {
  try {
    const existing = await prisma.companySetting.findFirst();
    const updated = await prisma.companySetting.upsert({
      where: { id: existing?.id || 'company_default' },
      update: req.body,
      create: { ...req.body, id: 'company_default' },
    });

    await logAuditAction(req.user?.userId, 'SETTINGS', 'UPDATE', updated.id, { section: 'Company Settings' }, req.ip);

    return sendSuccess(res, updated, 'Company settings updated successfully');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
}

export async function updateAttendanceSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const existing = await prisma.attendanceSetting.findFirst();
    const updated = await prisma.attendanceSetting.upsert({
      where: { id: existing?.id || 'attendance_default' },
      update: req.body,
      create: { ...req.body, id: 'attendance_default' },
    });

    await logAuditAction(req.user?.userId, 'SETTINGS', 'UPDATE', updated.id, { section: 'Attendance Rules' }, req.ip);

    return sendSuccess(res, updated, 'Attendance rules updated successfully');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
}

export async function updatePayrollSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const existing = await prisma.payrollSetting.findFirst();
    const updated = await prisma.payrollSetting.upsert({
      where: { id: existing?.id || 'payroll_default' },
      update: req.body,
      create: { ...req.body, id: 'payroll_default' },
    });

    await logAuditAction(req.user?.userId, 'SETTINGS', 'UPDATE', updated.id, { section: 'Payroll Percentages' }, req.ip);

    return sendSuccess(res, updated, 'Payroll calculation settings updated successfully');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
}

export async function updateGeotagSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const { latitude, longitude, locationName, geofenceRadius = 100, isStrictGeofence = true, siteId } = req.body;

    const latVal = parseFloat(latitude) || 17.4435;
    const lngVal = parseFloat(longitude) || 78.3772;
    const radiusVal = parseInt(geofenceRadius, 10) || 100;
    const strictVal = Boolean(isStrictGeofence);

    const existing = await prisma.attendanceSetting.findFirst();
    const updated = await prisma.attendanceSetting.upsert({
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
    let updatedSite: any = null;
    if (siteId) {
      const existingSite = await prisma.site.findFirst({
        where: { OR: [{ id: siteId }, { siteCode: siteId }] },
      });
      if (existingSite) {
        updatedSite = await prisma.site.update({
          where: { id: existingSite.id },
          data: {
            latitude: latVal,
            longitude: lngVal,
            geofenceRadius: radiusVal,
          },
        });
      }
    } else if (locationName) {
      const cleanName = locationName.split('(')[0].trim();
      if (cleanName.length >= 3) {
        const existingSite = await prisma.site.findFirst({
          where: {
            OR: [
              { siteName: { contains: cleanName } },
              { location: { contains: cleanName } },
            ],
          },
        });
        if (existingSite) {
          updatedSite = await prisma.site.update({
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

    await logAuditAction(
      req.user?.userId,
      'SETTINGS',
      'UPDATE',
      updated.id,
      { section: 'Geotag Configuration', latitude: latVal, longitude: lngVal, locationName, geofenceRadius: radiusVal, isStrictGeofence: strictVal, siteId: updatedSite?.id || siteId },
      req.ip
    );

    return sendSuccess(
      res,
      {
        latitude: latVal,
        longitude: lngVal,
        locationName: locationName || 'Microsoft India Campus (Gachibowli)',
        geofenceRadius: radiusVal,
        isStrictGeofence: strictVal,
        site: updatedSite,
      },
      `Geotag and geofencing parameters updated successfully${updatedSite ? ` for ${updatedSite.siteName}` : ''}`
    );
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
}
