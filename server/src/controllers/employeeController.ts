import { Response } from 'express';
import fs from 'fs';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../config/db';
import { sendError, sendSuccess } from '../utils/response';
import { employeeCreateSchema } from '../validators/schemas';
import { logAuditAction } from '../middleware/audit';
import { hashPassword } from '../utils/auth';
import {
  buildEmployeeWhereClause,
  canAccessEmployee,
} from '../services/rbacService';
import { syncEmployeePayslipFromAttendance } from '../services/payrollService';

export async function getEmployees(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const {
      search,
      departmentId,
      siteId,
      status,
      designationId,
      page = '1',
      limit = '50',
    } = req.query as Record<string, string>;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    let baseWhere: any = {};

    if (search) {
      baseWhere.OR = [
        { employeeId: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { mobile: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (departmentId) baseWhere.departmentId = departmentId;
    if (siteId) baseWhere.siteId = siteId;
    if (status) baseWhere.status = status;
    if (designationId) baseWhere.designationId = designationId;

    // Apply strict database-level RBAC filtering
    const where = await buildEmployeeWhereClause(req.user, baseWhere);

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [
          { status: 'asc' },
          { employeeId: 'asc' },
        ],
        include: {
          department: true,
          designation: true,
          site: true,
          shift: true,
          user: {
            select: { id: true, username: true, role: true, isActive: true },
          },
          salaryStructures: {
            where: { isCurrent: true },
            take: 1,
          },
          _count: {
            select: { documents: true, attendances: true },
          },
        },
      }),
      prisma.employee.count({ where }),
    ]);

    return sendSuccess(res, employees, 'Employees fetched successfully', {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error: any) {
    return sendError(res, error.message, 500);
  }
}

export async function getEmployeeById(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const { id } = req.params;

    // RBAC Security Check: Verify if user has permission to access this employee record
    const hasAccess = await canAccessEmployee(req.user, id);
    if (!hasAccess) {
      return sendError(res, 'Access denied: You do not have permission to view this employee record', 403);
    }

    const employee = await prisma.employee.findFirst({
      where: {
        OR: [{ id }, { employeeId: id }],
      },
      include: {
        department: true,
        designation: true,
        site: true,
        shift: true,
        reportingManager: true,
        subordinates: true,
        user: {
          select: { id: true, username: true, role: true, isActive: true, lastLogin: true },
        },
        salaryStructures: {
          orderBy: { effectiveDate: 'desc' },
        },
        leaveBalances: {
          include: { leaveType: true },
        },
        documents: {
          orderBy: { uploadedAt: 'desc' },
        },
        attendances: {
          orderBy: { date: 'desc' },
          take: 30,
        },
        payrollItems: {
          orderBy: { createdAt: 'desc' },
          take: 12,
          include: { payroll: true },
        },
      },
    });

    if (!employee) {
      return sendError(res, 'Employee not found', 404);
    }

    return sendSuccess(res, employee);
  } catch (error: any) {
    return sendError(res, error.message, 500);
  }
}

export async function createEmployee(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || !['SUPER_ADMIN', 'ADMIN', 'HR'].includes(req.user.role)) {
      return sendError(res, 'Access denied: Insufficient permissions to create employees', 403);
    }

    const validated = employeeCreateSchema.parse(req.body);
    const { role, salaryCtc, ...empData } = validated;

    // Check duplicate employeeId
    const existing = await prisma.employee.findUnique({
      where: { employeeId: empData.employeeId },
    });
    if (existing) {
      return sendError(res, `Employee ID ${empData.employeeId} already exists`, 409);
    }

    const employee = await prisma.employee.create({
      data: {
        ...empData,
        dob: empData.dob ? new Date(empData.dob) : null,
        joiningDate: empData.joiningDate ? new Date(empData.joiningDate) : new Date(),
        salaryCtc: salaryCtc || 0,
      },
    });

    // Create user login account automatically
    const username = empData.employeeId.toLowerCase().replace(/[^a-z0-9]/g, '');
    await prisma.user.create({
      data: {
        employeeId: employee.employeeId,
        username: username,
        email: empData.email || `${username}@vphs.in`,
        passwordHash: hashPassword('password123'),
        role: role || 'EMPLOYEE',
        isActive: true,
      },
    });

    // Create Salary Structure
    if (salaryCtc > 0) {
      const basic = salaryCtc * 0.5;
      const da = basic * 0.1;
      const hra = basic * 0.4;
      const conveyance = 1600;
      const specialAllowance = Math.max(0, salaryCtc - (basic + da + hra + conveyance));
      const grossSalary = basic + da + hra + conveyance + specialAllowance;
      const employeePf = basic <= 15000 ? basic * 0.12 : 1800;
      const employeeEsi = grossSalary <= 21000 ? grossSalary * 0.0075 : 0;
      const professionalTax = 200;
      const netSalary = grossSalary - (employeePf + employeeEsi + professionalTax);

      await prisma.salaryStructure.create({
        data: {
          employeeId: employee.id,
          ctc: salaryCtc,
          basic,
          da,
          hra,
          conveyance,
          specialAllowance,
          grossSalary,
          employeePf,
          employeeEsi,
          professionalTax,
          netSalary,
          isCurrent: true,
        },
      });
    }

    // Allocate Leave Balances for the current year
    const currentYear = new Date().getFullYear();
    const leaveTypes = await prisma.leaveType.findMany();
    for (const lt of leaveTypes) {
      await prisma.leaveBalance.create({
        data: {
          employeeId: employee.id,
          leaveTypeId: lt.id,
          year: currentYear,
          totalAllocated: lt.maxDaysPerYear,
          usedDays: 0,
          pendingDays: 0,
          remainingDays: lt.maxDaysPerYear,
        },
      });
    }

    if (employee.siteId) {
      await prisma.siteAssignment.create({
        data: {
          employeeId: employee.id,
          siteId: employee.siteId,
          roleAtSite: 'Staff Member',
          status: 'ACTIVE',
        },
      });
    }

    await logAuditAction(
      req.user?.userId,
      'EMPLOYEE',
      'CREATE',
      employee.id,
      { employeeId: employee.employeeId, name: `${employee.firstName} ${employee.lastName}` },
      req.ip
    );

    return sendSuccess(res, employee, 'Employee created successfully', undefined, 201);
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
}

export async function updateEmployee(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || !['SUPER_ADMIN', 'ADMIN', 'HR'].includes(req.user.role)) {
      return sendError(res, 'Access denied: Insufficient permissions to edit employees', 403);
    }

    const { id } = req.params;
    const { role, ...updateData } = req.body;

    // RBAC Security Check
    const hasAccess = await canAccessEmployee(req.user, id);
    if (!hasAccess) {
      return sendError(res, 'Access denied: You do not have permission to update this employee record', 403);
    }

    if (updateData.dob) updateData.dob = new Date(updateData.dob);
    if (updateData.joiningDate) updateData.joiningDate = new Date(updateData.joiningDate);
    if (updateData.exitDate) updateData.exitDate = new Date(updateData.exitDate);

    const employee = await prisma.employee.update({
      where: { id },
      data: updateData,
      include: {
        department: true,
        designation: true,
        site: true,
      },
    });

    if (role && employee.employeeId) {
      await prisma.user.updateMany({
        where: { employeeId: employee.employeeId },
        data: { role },
      });
    }

    await logAuditAction(
      req.user?.userId,
      'EMPLOYEE',
      'UPDATE',
      employee.id,
      { employeeId: employee.employeeId, updatedFields: Object.keys(updateData) },
      req.ip
    );

    return sendSuccess(res, employee, 'Employee updated successfully');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
}

export async function deleteEmployee(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || !['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
      return sendError(res, 'Access denied: Insufficient permissions to delete employees', 403);
    }

    const { id } = req.params;

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return sendError(res, 'Employee not found', 404);
    }

    // Soft delete / Terminate or hard delete if no critical history
    await prisma.employee.update({
      where: { id },
      data: { status: 'TERMINATED', exitDate: new Date() },
    });

    if (employee.employeeId) {
      await prisma.user.updateMany({
        where: { employeeId: employee.employeeId },
        data: { isActive: false },
      });
    }

    await logAuditAction(
      req.user?.userId,
      'EMPLOYEE',
      'DELETE',
      employee.id,
      { employeeId: employee.employeeId, action: 'Terminated employee' },
      req.ip
    );

    return sendSuccess(res, null, 'Employee status marked as TERMINATED');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
}

export async function updateSalaryStructure(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || !['SUPER_ADMIN', 'ADMIN', 'HR'].includes(req.user.role)) {
      return sendError(res, 'Access denied: Insufficient permissions to modify salary structures', 403);
    }

    const { id } = req.params;
    const data = req.body;

    const employee = await prisma.employee.findFirst({
      where: {
        OR: [{ id }, { employeeId: id }],
      },
    });

    if (!employee) {
      return sendError(res, 'Employee not found', 404);
    }

    const ctc = parseFloat(data.ctc) || employee.salaryCtc || 0;
    const basic = parseFloat(data.basic) || Math.round(ctc * 0.4);
    const da = parseFloat(data.da) || 0;
    const hra = parseFloat(data.hra) || Math.round(basic * 0.4);
    const conveyance = data.conveyance !== undefined ? (parseFloat(data.conveyance) || 0) : 0;
    const medicalAllowance = data.medicalAllowance !== undefined ? (parseFloat(data.medicalAllowance) || 0) : 0;
    const specialAllowance = parseFloat(data.specialAllowance) || 0;
    const uniformAllowance = data.uniformAllowance !== undefined ? (parseFloat(data.uniformAllowance) || 0) : 200;
    const leaveWages = data.leaveWages !== undefined ? (parseFloat(data.leaveWages) || 0) : Math.round((parseFloat(data.grossSalary) || 22783) * 0.125);
    const lta = parseFloat(data.lta) || 0;
    const foodAllowance = parseFloat(data.foodAllowance) || 0;
    const communicationAllowance = parseFloat(data.communicationAllowance) || 0;
    const variablePay = parseFloat(data.variablePay) || 0;
    const otherAllowance = parseFloat(data.otherAllowance) || 0;

    const grossSalary = data.grossSalary !== undefined
      ? (parseFloat(data.grossSalary) || 0)
      : (basic + da + hra + conveyance + medicalAllowance + specialAllowance + lta + foodAllowance + communicationAllowance + variablePay + otherAllowance);

    const employerPf = data.employerPf !== undefined ? (parseFloat(data.employerPf) || 0) : Math.round((Math.min(basic + da, 15000) * 13) / 100);
    const employerEsi = data.employerEsi !== undefined ? (parseFloat(data.employerEsi) || 0) : (grossSalary <= 21000 ? Math.round((basic + da) * 0.0325) : 0);
    const bonus = data.bonus !== undefined ? (parseFloat(data.bonus) || 0) : Math.round(((basic + da) * 8.33) / 100);
    const telanganaLwf = data.telanganaLwf !== undefined ? (parseFloat(data.telanganaLwf) || 0) : 0.17;
    const gratuity = parseFloat(data.gratuity) || 0;
    const insuranceBenefit = parseFloat(data.insuranceBenefit) || 0;

    const employeePf = data.employeePf !== undefined ? (parseFloat(data.employeePf) || 0) : Math.round((Math.min(basic + da, 15000) * 12) / 100);
    const employeeEsi = data.employeeEsi !== undefined ? (parseFloat(data.employeeEsi) || 0) : (grossSalary <= 21000 ? Math.round(grossSalary * 0.0075) : 0);
    const professionalTax = data.professionalTax !== undefined ? (parseFloat(data.professionalTax) || 0) : (grossSalary > 15000 ? 200 : 0);
    const tdsDeduction = parseFloat(data.tdsDeduction) || 0;
    const otherDeduction = parseFloat(data.otherDeduction) || (data.employeeLwf || 2);

    const totalDeductions = employeePf + employeeEsi + professionalTax + tdsDeduction + otherDeduction;
    const netSalary = data.netSalary !== undefined ? (parseFloat(data.netSalary) || 0) : Math.max(0, grossSalary - totalDeductions);

    // Set existing structures to non-current
    await prisma.salaryStructure.updateMany({
      where: { employeeId: employee.id },
      data: { isCurrent: false },
    });

    // Create new current salary structure with manual overrides
    const newStructure = await prisma.salaryStructure.create({
      data: {
        employeeId: employee.id,
        ctc,
        basic,
        da,
        hra,
        conveyance,
        medicalAllowance,
        specialAllowance,
        uniformAllowance,
        leaveWages,
        lta,
        foodAllowance,
        communicationAllowance,
        variablePay,
        otherAllowance,
        grossSalary,
        employerPf,
        employerEsi,
        bonus,
        telanganaLwf,
        gratuity,
        insuranceBenefit,
        employeePf,
        employeeEsi,
        professionalTax,
        tdsDeduction,
        otherDeduction,
        netSalary,
        isCurrent: true,
        effectiveDate: new Date(),
      },
    });

    // Update employee salaryCtc field
    await prisma.employee.update({
      where: { id: employee.id },
      data: { salaryCtc: ctc },
    });

    await logAuditAction(
      req.user?.userId,
      'PAYROLL',
      'UPDATE',
      employee.id,
      { employeeId: employee.employeeId, newCtc: ctc, netSalary },
      req.ip
    );

    // ⚡ Real-Time Auto-Sync: Automatically update employee payslip as per attendance without manual approval
    try {
      const now = new Date();
      await syncEmployeePayslipFromAttendance(employee.id, now.getMonth() + 1, now.getFullYear());
      // Also sync August 2026 if batch exists
      const augBatch = await prisma.payroll.findUnique({
        where: { payrollMonth_payrollYear: { payrollMonth: 8, payrollYear: 2026 } }
      });
      if (augBatch) {
        await syncEmployeePayslipFromAttendance(employee.id, 8, 2026);
      }
    } catch (syncErr) {
      console.warn('Payslip auto-sync on salary structure update failed:', syncErr);
    }

    return sendSuccess(res, newStructure, 'Custom salary structure updated successfully');
  } catch (error: any) {
    return sendError(res, error.message, 400);
  }
}

export async function uploadEmployeePhoto(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const { id } = req.params;
    const employee = await prisma.employee.findFirst({
      where: { OR: [{ id }, { employeeId: id }] },
    });

    if (!employee) {
      if (req.file) fs.unlinkSync(req.file.path);
      return sendError(res, 'Employee not found', 404);
    }

    // Permission check: allow logged-in employee to update their own photo, or HR / Admin
    const isSelf = req.user.employeeId === employee.employeeId || req.user.employeeId === employee.id;
    const isElevated = ['SUPER_ADMIN', 'ADMIN', 'HR'].includes(req.user.role);
    if (!isSelf && !isElevated) {
      if (req.file) fs.unlinkSync(req.file.path);
      return sendError(res, 'Access denied: You can only update your own photo', 403);
    }

    let photoUrl = '';
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.photoUrl) {
      photoUrl = req.body.photoUrl;
    } else {
      return sendError(res, 'No photo file or photoUrl provided', 400);
    }

    const updated = await prisma.employee.update({
      where: { id: employee.id },
      data: { photoUrl },
      include: {
        department: true,
        designation: true,
        site: true,
        shift: true,
      },
    });

    await logAuditAction(
      req.user.userId,
      'EMPLOYEE',
      'UPDATE',
      employee.id,
      { employeeId: employee.employeeId, action: 'UPDATE_PHOTO', photoUrl },
      req.ip
    );

    return sendSuccess(res, updated, 'Employee photo updated successfully');
  } catch (error: any) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return sendError(res, error.message, 500);
  }
}

export async function removeEmployeePhoto(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);

    const { id } = req.params;
    const employee = await prisma.employee.findFirst({
      where: { OR: [{ id }, { employeeId: id }] },
    });

    if (!employee) return sendError(res, 'Employee not found', 404);

    const isSelf = req.user.employeeId === employee.employeeId || req.user.employeeId === employee.id;
    const isElevated = ['SUPER_ADMIN', 'ADMIN', 'HR'].includes(req.user.role);
    if (!isSelf && !isElevated) {
      return sendError(res, 'Access denied: You can only update your own photo', 403);
    }

    const updated = await prisma.employee.update({
      where: { id: employee.id },
      data: { photoUrl: null },
      include: {
        department: true,
        designation: true,
        site: true,
        shift: true,
      },
    });

    await logAuditAction(
      req.user.userId,
      'EMPLOYEE',
      'UPDATE',
      employee.id,
      { employeeId: employee.employeeId, action: 'REMOVE_PHOTO' },
      req.ip
    );

    return sendSuccess(res, updated, 'Employee photo removed successfully');
  } catch (error: any) {
    return sendError(res, error.message, 500);
  }
}
