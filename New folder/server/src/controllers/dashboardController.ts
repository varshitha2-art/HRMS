import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../config/db';
import { sendError, sendSuccess } from '../utils/response';
import {
  getAccessibleSiteIds,
  getAccessibleEmployeeIds,
  buildEmployeeWhereClause,
  buildAttendanceWhereClause,
} from '../services/rbacService';

export async function getDashboardSummary(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const user = req.user;
    const todayStr = new Date().toISOString().split('T')[0];
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const accessibleSiteIds = await getAccessibleSiteIds(user);
    const accessibleEmpIds = await getAccessibleEmployeeIds(user);

    // =========================================================================
    // 1. EMPLOYEE DASHBOARD
    // =========================================================================
    if (user.role === 'EMPLOYEE') {
      const employee = user.employee || (user.employeeId
        ? await prisma.employee.findUnique({
            where: { employeeId: user.employeeId },
            include: {
              department: true,
              designation: true,
              site: true,
              shift: true,
              reportingManager: true,
            },
          })
        : null);

      if (!employee) {
        return sendSuccess(res, {
          role: 'EMPLOYEE',
          metrics: { myAttendance: '0/0 Days', myLeaveBalance: 0, myDocumentsCount: 0 },
        });
      }

      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      const [
        monthlyAttendances,
        todayAttendance,
        leaveBalances,
        latestPayrollItem,
        myDocuments,
      ] = await Promise.all([
        prisma.attendance.findMany({
          where: {
            employeeId: employee.id,
            date: { startsWith: `${currentYear}-${String(currentMonth).padStart(2, '0')}` },
          },
        }),
        prisma.attendance.findUnique({
          where: {
            employeeId_date: {
              employeeId: employee.id,
              date: todayStr,
            },
          },
        }),
        prisma.leaveBalance.findMany({
          where: { employeeId: employee.id, year: currentYear },
          include: { leaveType: true },
        }),
        prisma.payrollItem.findFirst({
          where: { employeeId: employee.id },
          orderBy: { createdAt: 'desc' },
          include: { payroll: true },
        }),
        prisma.document.findMany({
          where: { employeeId: employee.id },
          take: 5,
        }),
      ]);

      const presentDays = monthlyAttendances.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
      const totalMonthDays = monthlyAttendances.length || 26;
      const totalLeaveRemaining = leaveBalances.reduce((acc, lb) => acc + lb.remainingDays, 0);

      return sendSuccess(res, {
        role: 'EMPLOYEE',
        user: {
          name: `${employee.firstName} ${employee.lastName}`,
          employeeId: employee.employeeId,
          designation: employee.designation?.title || 'Staff Member',
          department: employee.department?.name || 'Operations',
          site: employee.site?.siteName || 'Corporate HQ',
          shift: employee.shift?.name || 'General Shift',
          joiningDate: employee.joiningDate,
          mobile: employee.mobile,
          email: employee.email,
        },
        metrics: {
          myAttendance: `${presentDays}/${totalMonthDays} Days`,
          myAttendanceRate: `${Math.round((presentDays / Math.max(1, totalMonthDays)) * 100)}%`,
          myLeaveBalance: `${totalLeaveRemaining} Days`,
          todayStatus: todayAttendance?.status || 'NOT_MARKED',
          todayPunchIn: todayAttendance?.inTime ? new Date(todayAttendance.inTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
          todayPunchOut: todayAttendance?.outTime ? new Date(todayAttendance.outTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
          myDocumentsCount: myDocuments.length,
          latestPayslip: latestPayrollItem ? {
            month: `${latestPayrollItem.payroll.payrollMonth}/${latestPayrollItem.payroll.payrollYear}`,
            netSalary: latestPayrollItem.netSalary,
            grossSalary: latestPayrollItem.grossSalary,
            status: latestPayrollItem.status,
            id: latestPayrollItem.id,
          } : null,
        },
        leaveBalances: leaveBalances.map(lb => ({
          type: lb.leaveType.name,
          code: lb.leaveType.code,
          allocated: lb.totalAllocated,
          used: lb.usedDays,
          remaining: lb.remainingDays,
        })),
        recentAttendances: monthlyAttendances.slice(-7),
        documents: myDocuments,
      });
    }

    // =========================================================================
    // 2. SUPERVISOR DASHBOARD
    // =========================================================================
    if (user.role === 'SUPERVISOR') {
      const empWhere = await buildEmployeeWhereClause(user);
      const attWhere = await buildAttendanceWhereClause(user, { date: todayStr });

      const [
        myTeamCount,
        todayAttendances,
        pendingTeamLeaves,
        teamMembers,
      ] = await Promise.all([
        prisma.employee.count({ where: empWhere }),
        prisma.attendance.findMany({
          where: attWhere,
          select: { status: true, lateMinutes: true, employeeId: true },
        }),
        prisma.leaveRequest.count({
          where: {
            employee: empWhere,
            status: 'PENDING',
          },
        }),
        prisma.employee.findMany({
          where: empWhere,
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            designation: { select: { title: true } },
            site: { select: { siteName: true } },
            shift: { select: { name: true } },
          },
          take: 10,
        }),
      ]);

      let present = 0;
      let absent = 0;
      let late = 0;
      let onLeave = 0;

      for (const a of todayAttendances) {
        if (a.status === 'PRESENT') present++;
        else if (a.status === 'LATE') { present++; late++; }
        else if (a.status === 'ABSENT') absent++;
        else if (a.status === 'LEAVE') onLeave++;
      }

      return sendSuccess(res, {
        role: 'SUPERVISOR',
        metrics: {
          myTeam: myTeamCount,
          presentToday: present,
          absentToday: absent,
          lateToday: late,
          onLeaveToday: onLeave,
          pendingLeaves: pendingTeamLeaves,
        },
        teamMembers,
      });
    }

    // =========================================================================
    // 3. SITE MANAGER DASHBOARD
    // =========================================================================
    if (user.role === 'SITE_MANAGER') {
      const siteWhere = accessibleSiteIds === 'ALL' ? {} : { id: { in: accessibleSiteIds } };
      const empWhere = await buildEmployeeWhereClause(user);
      const attWhere = await buildAttendanceWhereClause(user, { date: todayStr });

      const [
        mySitesCount,
        myEmployeesCount,
        todayAttendances,
        pendingLeaves,
        assignedSites,
      ] = await Promise.all([
        prisma.site.count({ where: siteWhere }),
        prisma.employee.count({ where: { ...empWhere, status: 'ACTIVE' } }),
        prisma.attendance.findMany({
          where: attWhere,
          select: { status: true, lateMinutes: true },
        }),
        prisma.leaveRequest.count({
          where: {
            employee: empWhere,
            status: 'PENDING',
          },
        }),
        prisma.site.findMany({
          where: siteWhere,
          select: {
            id: true,
            siteName: true,
            clientName: true,
            location: true,
            _count: { select: { employees: true } },
          },
        }),
      ]);

      let present = 0;
      let absent = 0;
      let late = 0;
      let onLeave = 0;

      for (const a of todayAttendances) {
        if (a.status === 'PRESENT') present++;
        else if (a.status === 'LATE') { present++; late++; }
        else if (a.status === 'ABSENT') absent++;
        else if (a.status === 'LEAVE') onLeave++;
      }

      return sendSuccess(res, {
        role: 'SITE_MANAGER',
        metrics: {
          mySites: mySitesCount,
          myEmployees: myEmployeesCount,
          todayPresent: present,
          todayAbsent: absent,
          todayLate: late,
          todayLeave: onLeave,
          pendingLeaves,
        },
        assignedSites: assignedSites.map(s => ({
          name: s.siteName,
          client: s.clientName,
          location: s.location,
          employees: s._count.employees,
        })),
      });
    }

    // =========================================================================
    // 4. SUPER ADMIN & HR ADMIN DASHBOARD
    // =========================================================================
    const [
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      totalSites,
      todayAttendances,
      pendingLeaves,
      expiringDocs,
      newJoiners,
      latestPayroll,
      departmentCounts,
      siteEmployees,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where: { status: 'ACTIVE' } }),
      prisma.employee.count({ where: { status: { in: ['INACTIVE', 'TERMINATED', 'RESIGNED'] } } }),
      prisma.site.count({ where: { status: 'ACTIVE' } }),
      prisma.attendance.findMany({
        where: { date: todayStr },
        select: { status: true, lateMinutes: true },
      }),
      prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      prisma.document.count({
        where: { expiryDate: { lte: thirtyDaysFromNow } },
      }),
      prisma.employee.count({
        where: { joiningDate: { gte: thirtyDaysAgo } },
      }),
      prisma.payroll.findFirst({
        orderBy: [{ payrollYear: 'desc' }, { payrollMonth: 'desc' }],
      }),
      prisma.department.findMany({
        select: {
          name: true,
          _count: { select: { employees: true } },
        },
      }),
      prisma.site.findMany({
        where: { status: 'ACTIVE' },
        select: {
          siteName: true,
          siteCode: true,
          _count: { select: { employees: true } },
        },
      }),
      prisma.auditLog.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { username: true, role: true } },
        },
      }),
    ]);

    let todayPresent = 0;
    let todayAbsent = 0;
    let todayLate = 0;
    let todayLeave = 0;

    for (const att of todayAttendances) {
      if (att.status === 'PRESENT') todayPresent++;
      else if (att.status === 'LATE') { todayPresent++; todayLate++; }
      else if (att.status === 'ABSENT') todayAbsent++;
      else if (att.status === 'LEAVE') todayLeave++;
    }

    // 7-day trend
    const trendDays: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      trendDays.push(d.toISOString().split('T')[0]);
    }

    const pastWeekAttendances = await prisma.attendance.findMany({
      where: { date: { in: trendDays } },
      select: { date: true, status: true },
    });

    const attendanceTrend = trendDays.map(dateStr => {
      const dayRecords = pastWeekAttendances.filter(a => a.date === dateStr);
      const present = dayRecords.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
      const absent = dayRecords.filter(a => a.status === 'ABSENT').length;
      const late = dayRecords.filter(a => a.status === 'LATE').length;
      const leave = dayRecords.filter(a => a.status === 'LEAVE').length;

      const dateObj = new Date(dateStr);
      const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });

      return {
        date: dateStr,
        label: dayLabel,
        present,
        absent,
        late,
        leave,
      };
    });

    return sendSuccess(res, {
      role: user.role,
      metrics: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        totalSites,
        todayPresent,
        todayAbsent,
        todayLate,
        todayLeave,
        pendingLeaves,
        expiringDocs,
        newJoiners,
        payrollStatus: latestPayroll ? `${latestPayroll.status} (${latestPayroll.payrollMonth}/${latestPayroll.payrollYear})` : 'NO_RUN',
        latestPayroll,
      },
      charts: {
        attendanceTrend,
        siteDistribution: siteEmployees.map(s => ({
          name: s.siteName.replace(' - Building 3', '').replace(' - Multi Outlets', ''),
          employees: s._count.employees,
        })),
        departmentDistribution: departmentCounts.map(d => ({
          name: d.name,
          count: d._count.employees,
        })),
      },
      recentActivity: recentAuditLogs,
    });
  } catch (error: any) {
    return sendError(res, error.message, 500);
  }
}
