import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username or Employee ID is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export const employeeCreateSchema = z.object({
  employeeId: z.string().min(2, 'Employee ID must be at least 2 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  photoUrl: z.string().optional().nullable(),
  gender: z.enum(['Male', 'Female', 'Other']),
  dob: z.string().optional(),
  mobile: z.string().min(10, 'Mobile must be at least 10 digits'),
  email: z.string().email().optional().or(z.literal('')),
  emergencyContact: z.string().optional(),
  emergencyContactName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  aadhaarNumber: z.string().optional(),
  panNumber: z.string().optional(),
  joiningDate: z.string().optional(),
  designationId: z.string().optional(),
  departmentId: z.string().optional(),
  siteId: z.string().optional(),
  shiftId: z.string().optional(),
  employmentType: z.enum(['FULL_TIME', 'CONTRACT', 'TEMPORARY', 'PART_TIME']).default('FULL_TIME'),
  salaryCtc: z.number().nonnegative().default(0),
  bankAccountNo: z.string().optional(),
  bankIfsc: z.string().optional(),
  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  pfNumber: z.string().optional(),
  esiNumber: z.string().optional(),
  uanNumber: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED', 'RESIGNED']).default('ACTIVE'),
  reportingManagerId: z.string().optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'HR', 'SITE_MANAGER', 'SUPERVISOR', 'EMPLOYEE']).default('EMPLOYEE'),
});

export const siteCreateSchema = z.object({
  siteCode: z.string().min(2, 'Site Code is required'),
  siteName: z.string().min(2, 'Site Name is required'),
  clientName: z.string().min(2, 'Client Name is required'),
  location: z.string().min(2, 'Location is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  siteManagerId: z.string().optional(),
  supervisorId: z.string().optional(),
  contractStartDate: z.string().optional(),
  contractEndDate: z.string().optional(),
  billingRate: z.number().nonnegative().optional().default(0),
  status: z.enum(['ACTIVE', 'INACTIVE', 'COMPLETED', 'SUSPENDED']).default('ACTIVE'),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  geofenceRadius: z.number().optional(),
});

export const punchSchema = z.object({
  employeeId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  inTime: z.string().optional(),
  outTime: z.string().optional(),
  siteId: z.string().optional(),
  shiftId: z.string().optional(),
  remarks: z.string().optional(),
  latitude: z.number({ required_error: 'GPS Latitude is required' }),
  longitude: z.number({ required_error: 'GPS Longitude is required' }),
  accuracy: z.number().optional(),
});

export const attendanceMarkSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  inTime: z.string().optional().nullable(),
  outTime: z.string().optional().nullable(),
  status: z.enum(['PRESENT', 'ABSENT', 'WEEK_OFF', 'HOLIDAY', 'LEAVE', 'HALF_DAY', 'LATE', 'ON_DUTY', 'LOP']).default('PRESENT'),
  siteId: z.string().optional().nullable(),
  shiftId: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export const leaveRequestSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  leaveTypeId: z.string().min(1, 'Leave Type is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
  totalDays: z.number().positive(),
  reason: z.string().min(3, 'Please provide a valid reason'),
});

export const payrollGenerateSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2050),
  siteId: z.string().optional(),
  departmentId: z.string().optional(),
  allowOverwrite: z.boolean().optional().default(true),
  forceRecalculate: z.boolean().optional().default(true),
});
