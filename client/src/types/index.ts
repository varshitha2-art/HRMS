export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'HR'
  | 'SITE_MANAGER'
  | 'SUPERVISOR'
  | 'EMPLOYEE';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  employeeId?: string | null;
  employee?: Employee;
  lastLogin?: string;
}

export interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  gender: 'Male' | 'Female' | 'Other';
  dob?: string | null;
  mobile: string;
  email?: string | null;
  emergencyContact?: string | null;
  emergencyContactName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  aadhaarNumber?: string | null;
  panNumber?: string | null;
  joiningDate?: string;
  exitDate?: string | null;
  designationId?: string | null;
  departmentId?: string | null;
  siteId?: string | null;
  shiftId?: string | null;
  employmentType: 'FULL_TIME' | 'CONTRACT' | 'TEMPORARY' | 'PART_TIME';
  salaryCtc: number;
  bankAccountNo?: string | null;
  bankIfsc?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  pfNumber?: string | null;
  esiNumber?: string | null;
  uanNumber?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'RESIGNED';
  reportingManagerId?: string | null;
  createdAt: string;
  updatedAt: string;

  department?: Department;
  designation?: Designation;
  site?: Site;
  shift?: Shift;
  reportingManager?: Employee;
  salaryStructures?: SalaryStructure[];
  leaveBalances?: LeaveBalance[];
  documents?: Document[];
  attendances?: Attendance[];
  payrollItems?: PayrollItem[];
  user?: {
    id: string;
    username: string;
    role: UserRole;
    isActive: boolean;
    lastLogin?: string;
  };
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export interface Designation {
  id: string;
  title: string;
  code: string;
  departmentId?: string;
  minSalary?: number;
  maxSalary?: number;
}

export interface Site {
  id: string;
  siteCode: string;
  siteName: string;
  clientName: string;
  location: string;
  address?: string;
  city?: string;
  state?: string;
  siteManagerId?: string;
  supervisorId?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  billingRate?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'SUSPENDED';
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  latitude?: number;
  longitude?: number;
  geofenceRadius?: number;
  _count?: {
    employees: number;
    attendances: number;
  };
  employees?: Employee[];
}

export interface Shift {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  gracePeriodMins: number;
  halfDayHours: number;
  fullDayHours: number;
  isNightShift: boolean;
}

export type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'WEEK_OFF'
  | 'HOLIDAY'
  | 'LEAVE'
  | 'HALF_DAY'
  | 'LATE'
  | 'ON_DUTY'
  | 'LOP';

export interface Attendance {
  id: string;
  employeeId: string;
  siteId?: string;
  shiftId?: string;
  date: string;
  inTime?: string | null;
  outTime?: string | null;
  workingHours: number;
  lateMinutes: number;
  overtimeHours: number;
  status: AttendanceStatus;
  markedBy?: string;
  verificationType?: string;
  remarks?: string;
  createdAt: string;

  employee?: Employee;
  site?: Site;
  shift?: Shift;
}

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  maxDaysPerYear: number;
  isPaid: boolean;
  carryForward: boolean;
  requiresApproval: boolean;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  totalAllocated: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  leaveType: LeaveType;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approvedById?: string;
  approvalNotes?: string;
  appliedAt: string;
  actionedAt?: string;

  employee?: Employee;
  leaveType?: LeaveType;
}

export interface SalaryStructure {
  id: string;
  employeeId: string;
  effectiveDate: string;
  ctc: number;
  basic: number;
  da: number;
  hra: number;
  conveyance: number;
  medicalAllowance: number;
  specialAllowance: number;
  uniformAllowance?: number; // Uniform, Shoes & washing allowance
  leaveWages?: number; // Leave Wages (CL, PL, SL)
  lta: number;
  foodAllowance: number;
  communicationAllowance: number;
  variablePay: number;
  otherAllowance: number;
  grossSalary: number;
  
  employerPf: number;
  employerEsi: number;
  bonus?: number;
  telanganaLwf?: number;
  gratuity: number;
  insuranceBenefit: number;
  
  employeePf: number;
  employeeEsi: number;
  professionalTax: number;
  tdsDeduction: number;
  otherDeduction: number;
  netSalary: number;
  isCurrent: boolean;
}

export interface SalaryBreakdownResult {
  monthly: {
    ctc: number;
    headcount?: number;
    basic: number;
    da: number;
    hra: number;
    conveyance: number;
    medicalAllowance: number;
    specialAllowance: number;
    uniformAllowance?: number;
    leaveWages?: number;
    lta: number;
    foodAllowance: number;
    communicationAllowance: number;
    variablePay: number;
    otherAllowance: number;
    grossSalary: number;

    employerPf: number;
    employerEsi: number;
    bonus?: number;
    telanganaLwf?: number;
    gratuity: number;
    insuranceBenefit: number;
    totalEmployerContribution: number;

    employeePf: number;
    employeeEsi: number;
    professionalTax: number;
    employeeLwf?: number;
    tdsDeduction: number;
    otherDeductions: number;
    totalDeductions: number;

    netSalary: number;
  };
  annual: {
    ctc: number;
    headcount?: number;
    basic: number;
    da: number;
    hra: number;
    conveyance: number;
    medicalAllowance: number;
    specialAllowance: number;
    uniformAllowance?: number;
    leaveWages?: number;
    lta: number;
    foodAllowance: number;
    communicationAllowance: number;
    variablePay: number;
    otherAllowance: number;
    grossSalary: number;

    employerPf: number;
    employerEsi: number;
    bonus?: number;
    telanganaLwf?: number;
    gratuity: number;
    insuranceBenefit: number;
    totalEmployerContribution: number;

    employeePf: number;
    employeeEsi: number;
    professionalTax: number;
    employeeLwf?: number;
    tdsDeduction: number;
    otherDeductions: number;
    totalDeductions: number;

    netSalary: number;
  };
}

export interface Payroll {
  id: string;
  payrollMonth: number;
  payrollYear: number;
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  status: 'DRAFT' | 'CALCULATED' | 'VERIFIED' | 'APPROVED' | 'PAID';
  processedAt?: string;
  approvedAt?: string;
  remarks?: string;
  payrollItems?: PayrollItem[];
  _count?: {
    payrollItems: number;
  };
}

export interface PayrollItem {
  id: string;
  payrollId: string;
  employeeId: string;
  workingDays: number;
  presentDays: number;
  paidLeaveDays: number;
  lopDays: number;
  
  // Earnings
  basic: number;
  da: number;
  hra: number;
  conveyance: number;
  medicalAllowance?: number;
  specialAllowance: number;
  uniformAllowance?: number;
  leaveWages?: number;
  lta?: number;
  foodAllowance?: number;
  communicationAllowance?: number;
  variablePay?: number;
  overtimePay: number;
  bonus: number;
  otherAllowance?: number;
  grossSalary: number;
  
  // Employer Contributions
  employerPf?: number;
  employerEsi?: number;
  telanganaLwf?: number;
  gratuity?: number;
  insuranceBenefit?: number;
  
  // Employee Deductions
  pfDeduction: number;
  esiDeduction: number;
  ptDeduction: number;
  tdsDeduction?: number;
  lopDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  
  netSalary: number;
  status: string;
  payslipNumber: string;
  paymentDate?: string;
  paymentMode?: string;
  paymentRef?: string;
  isPaid: boolean;

  payroll?: Payroll;
  employee?: Employee;
}

export interface Document {
  id: string;
  employeeId: string;
  documentType: string;
  title: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  expiryDate?: string | null;
  status: 'VALID' | 'EXPIRING' | 'EXPIRED' | 'MISSING';
  isVerified: boolean;
  uploadedAt: string;

  employee?: Employee;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface CompanySetting {
  id: string;
  companyName: string;
  tagline: string;
  logoUrl?: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  gstNumber: string;
  panNumber: string;
  cinNumber: string;
  bankDetails?: string;
}

export interface AttendanceSetting {
  id: string;
  defaultShiftStart: string;
  defaultShiftEnd: string;
  defaultGracePeriodMins: number;
  minHoursHalfDay: number;
  minHoursFullDay: number;
  overtimeThresholdHours: number;
  overtimeRateMultiplier: number;
  autoMarkAbsentAfterDays: number;
  allowLatePunchApproval: boolean;
}

export interface PayrollSetting {
  id: string;
  basicPercentOfCtc: number;
  daPercentOfBasic: number;
  hraPercentOfBasic: number;
  pfPercentOfBasic: number;
  esiPercentOfGross: number;
  esiGrossLimit: number;
  ptSlabMonthly: number;
  standardWorkingDaysPerMonth: number;
  pfEligibleCap: number;
  employerPfPercent?: number;
  employerEsiPercent?: number;
  bonusPercent?: number;
  telanganaLwfEmployer?: number;
  telanganaLwfEmployee?: number;
  uniformAllowanceDefault?: number;
  leaveWagesMonthlyDefault?: number;
  gratuityPercent?: number;
  conveyanceDefault?: number;
  medicalDefault?: number;
  insuranceDefault?: number;
}

export interface AuditLog {
  id: string;
  userId?: string;
  employeeId?: string;
  module: string;
  action: string;
  recordId?: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    role: string;
    email: string;
  };
  employee?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
  };
}
