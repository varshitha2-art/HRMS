import prisma from '../config/db';

export interface AuthenticatedUser {
  userId: string;
  username: string;
  employeeId?: string | null;
  role: string;
  email: string;
  id: string;
  employee?: any;
}

/**
 * Returns accessible Site IDs for a given user or 'ALL' if user has global site access.
 */
export async function getAccessibleSiteIds(user: AuthenticatedUser): Promise<string[] | 'ALL'> {
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'HR') {
    return 'ALL';
  }

  const employee = user.employee || (user.employeeId
    ? await prisma.employee.findUnique({ where: { employeeId: user.employeeId }, include: { siteAssignments: true } })
    : null);

  if (!employee) return [];

  if (user.role === 'SITE_MANAGER') {
    // Fetch sites where employee is designated site manager OR assigned in siteAssignments OR assigned siteId
    const managedSites = await prisma.site.findMany({
      where: {
        OR: [
          { siteManagerId: employee.id },
          { siteManagerId: employee.employeeId },
          { id: employee.siteId || '' },
          { siteAssignments: { some: { employeeId: employee.id, status: 'ACTIVE' } } },
        ],
      },
      select: { id: true },
    });

    const ids = Array.from(new Set([
      ...managedSites.map(s => s.id),
      ...(employee.siteId ? [employee.siteId] : []),
      ...(employee.siteAssignments ? employee.siteAssignments.map((a: any) => a.siteId) : []),
    ])).filter(Boolean);

    return ids;
  }

  if (user.role === 'SUPERVISOR') {
    // Supervisor sees their own site + sites of their subordinates
    const subordinateSites = await prisma.employee.findMany({
      where: {
        OR: [
          { reportingManagerId: employee.id },
          { id: employee.id },
        ],
      },
      select: { siteId: true },
    });

    const ids = Array.from(new Set([
      ...(employee.siteId ? [employee.siteId] : []),
      ...subordinateSites.map(s => s.siteId).filter(Boolean),
    ])) as string[];

    return ids;
  }

  // Regular Employee sees only their own site
  return employee.siteId ? [employee.siteId] : [];
}

/**
 * Returns accessible Employee IDs for a given user or 'ALL' if user has global employee access.
 */
export async function getAccessibleEmployeeIds(user: AuthenticatedUser): Promise<string[] | 'ALL'> {
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'HR') {
    return 'ALL';
  }

  const employee = user.employee || (user.employeeId
    ? await prisma.employee.findUnique({ where: { employeeId: user.employeeId } })
    : null);

  if (!employee) return [];

  if (user.role === 'SITE_MANAGER') {
    const siteIds = await getAccessibleSiteIds(user);
    if (siteIds === 'ALL') return 'ALL';
    if (siteIds.length === 0) return [employee.id];

    const siteEmployees = await prisma.employee.findMany({
      where: {
        OR: [
          { siteId: { in: siteIds } },
          { siteAssignments: { some: { siteId: { in: siteIds }, status: 'ACTIVE' } } },
          { id: employee.id },
        ],
      },
      select: { id: true },
    });

    return siteEmployees.map(e => e.id);
  }

  if (user.role === 'SUPERVISOR') {
    // Subordinates + self
    const team = await prisma.employee.findMany({
      where: {
        OR: [
          { reportingManagerId: employee.id },
          { id: employee.id },
        ],
      },
      select: { id: true },
    });

    return team.map(e => e.id);
  }

  // EMPLOYEE sees only themselves
  return [employee.id];
}

/**
 * Builds Prisma `where` clause for Employees table based on logged-in user permissions.
 */
export async function buildEmployeeWhereClause(user: AuthenticatedUser, baseWhere: any = {}) {
  const accessibleIds = await getAccessibleEmployeeIds(user);

  if (accessibleIds === 'ALL') {
    return baseWhere;
  }

  return {
    ...baseWhere,
    id: { in: accessibleIds },
  };
}

/**
 * Builds Prisma `where` clause for Sites table based on logged-in user permissions.
 */
export async function buildSiteWhereClause(user: AuthenticatedUser, baseWhere: any = {}) {
  const accessibleSiteIds = await getAccessibleSiteIds(user);

  if (accessibleSiteIds === 'ALL') {
    return baseWhere;
  }

  return {
    ...baseWhere,
    id: { in: accessibleSiteIds },
  };
}

/**
 * Builds Prisma `where` clause for Attendance table based on logged-in user permissions.
 */
export async function buildAttendanceWhereClause(user: AuthenticatedUser, baseWhere: any = {}) {
  const accessibleIds = await getAccessibleEmployeeIds(user);

  if (accessibleIds === 'ALL') {
    return baseWhere;
  }

  return {
    ...baseWhere,
    employeeId: { in: accessibleIds },
  };
}

/**
 * Builds Prisma `where` clause for LeaveRequests table based on logged-in user permissions.
 */
export async function buildLeaveWhereClause(user: AuthenticatedUser, baseWhere: any = {}) {
  const accessibleIds = await getAccessibleEmployeeIds(user);

  if (accessibleIds === 'ALL') {
    return baseWhere;
  }

  return {
    ...baseWhere,
    employeeId: { in: accessibleIds },
  };
}

/**
 * Builds Prisma `where` clause for Documents table based on logged-in user permissions.
 */
export async function buildDocumentWhereClause(user: AuthenticatedUser, baseWhere: any = {}) {
  const accessibleIds = await getAccessibleEmployeeIds(user);

  if (accessibleIds === 'ALL') {
    return baseWhere;
  }

  return {
    ...baseWhere,
    employeeId: { in: accessibleIds },
  };
}

/**
 * Validates if the user has permission to view/modify a specific employee record.
 */
export async function canAccessEmployee(user: AuthenticatedUser, employeeRecordIdOrCode: string): Promise<boolean> {
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'HR') {
    return true;
  }

  const accessibleIds = await getAccessibleEmployeeIds(user);
  if (accessibleIds === 'ALL') return true;

  const targetEmployee = await prisma.employee.findFirst({
    where: {
      OR: [
        { id: employeeRecordIdOrCode },
        { employeeId: employeeRecordIdOrCode },
      ],
    },
    select: { id: true },
  });

  if (!targetEmployee) return false;
  return accessibleIds.includes(targetEmployee.id);
}

/**
 * Validates if the user has permission to view a specific payslip / payroll item.
 */
export async function canAccessPayrollItem(user: AuthenticatedUser, payrollItemId: string): Promise<boolean> {
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'HR') {
    return true;
  }

  const item = await prisma.payrollItem.findUnique({
    where: { id: payrollItemId },
    include: { employee: true },
  });

  if (!item) return false;

  // Regular employee can ONLY view their own payslip item
  if (user.role === 'EMPLOYEE') {
    return item.employee.employeeId === user.employeeId || item.employeeId === user.employee?.id;
  }

  const accessibleIds = await getAccessibleEmployeeIds(user);
  if (accessibleIds === 'ALL') return true;
  return accessibleIds.includes(item.employeeId);
}
