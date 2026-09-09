import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Helper to hash password using SHA-256 for cross-environment stability and speed
function hashPassword(password: string): string {
  // Use pbkdf2 or simple sha256 with salt
  const salt = 'vphs_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

async function main() {
  console.log('🌱 Starting VPHS Services Pvt. Ltd. ERP Database Seeding...');

  // 1. Clean existing records in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.payrollItem.deleteMany();
  await prisma.payroll.deleteMany();
  await prisma.salaryStructure.deleteMany();
  await prisma.document.deleteMany();
  await prisma.attendanceLog.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.siteAssignment.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.designation.deleteMany();
  await prisma.department.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.site.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.companySetting.deleteMany();
  await prisma.attendanceSetting.deleteMany();
  await prisma.payrollSetting.deleteMany();

  console.log('🧹 Cleaned existing database tables.');

  // 2. Default System Settings
  await prisma.companySetting.create({
    data: {
      id: 'company_default',
      companyName: 'VPHS Services Pvt. Ltd.',
      tagline: 'Facility Management & Enterprise HR Automation Portal',
      logoUrl: '/logo.png',
      address: 'Plot No. 42, Silicon Valley Layout, Madhapur, Hitech City, Hyderabad, Telangana - 500081',
      phone: '+91 40 4567 8900 / +91 98765 43210',
      email: 'contact@vphs.in',
      website: 'https://vphs.in',
      gstNumber: '36AABCV1234F1Z8',
      panNumber: 'AABCV1234F',
      cinNumber: 'U74999TG2020PTC145678',
      bankDetails: 'HDFC Bank Ltd. | A/C: 50200087654321 | IFSC: HDFC0000123 | Branch: Madhapur, Hyderabad',
    },
  });

  await prisma.attendanceSetting.create({
    data: {
      id: 'attendance_default',
      defaultShiftStart: '09:30',
      defaultShiftEnd: '18:30',
      defaultGracePeriodMins: 15,
      minHoursHalfDay: 4.5,
      minHoursFullDay: 9.0,
      overtimeThresholdHours: 9.0,
      overtimeRateMultiplier: 1.5,
      autoMarkAbsentAfterDays: 3,
      allowLatePunchApproval: true,
    },
  });

  await prisma.payrollSetting.create({
    data: {
      id: 'payroll_default',
      basicPercentOfCtc: 50.0,
      daPercentOfBasic: 10.0,
      hraPercentOfBasic: 40.0,
      pfPercentOfBasic: 12.0,
      esiPercentOfGross: 0.75,
      esiGrossLimit: 21000.0,
      ptSlabMonthly: 200.0,
      standardWorkingDaysPerMonth: 30,
      pfEligibleCap: 15000.0,
    },
  });

  // 3. Create Roles
  const roles = [
    { name: 'SUPER_ADMIN', description: 'Full system control, settings, audit logs & admin management' },
    { name: 'ADMIN', description: 'Operations admin with access to employees, sites, attendance & payroll' },
    { name: 'HR', description: 'HR management, onboarding, leaves, documents, payroll prep & reports' },
    { name: 'SITE_MANAGER', description: 'Facility site manager, daily roster, shift scheduling & site reports' },
    { name: 'SUPERVISOR', description: 'Field supervisor for team attendance, late reporting & site tasks' },
    { name: 'EMPLOYEE', description: 'Employee self-service portal, attendance, leave & payslips' },
  ];

  for (const r of roles) {
    const createdRole = await prisma.role.create({ data: r });
    const modules = ['EMPLOYEES', 'SITES', 'ATTENDANCE', 'LEAVE', 'PAYROLL', 'DOCUMENTS', 'REPORTS', 'SETTINGS', 'AUDIT'];
    
    for (const mod of modules) {
      const isSuper = r.name === 'SUPER_ADMIN';
      const isAdmin = r.name === 'ADMIN';
      const isHr = r.name === 'HR';
      const isManager = r.name === 'SITE_MANAGER';
      const isSupervisor = r.name === 'SUPERVISOR';

      await prisma.permission.create({
        data: {
          roleId: createdRole.id,
          module: mod,
          canRead: true,
          canCreate: isSuper || isAdmin || (isHr && mod !== 'SETTINGS' && mod !== 'AUDIT') || (isManager && (mod === 'ATTENDANCE' || mod === 'SITES')),
          canUpdate: isSuper || isAdmin || (isHr && mod !== 'SETTINGS' && mod !== 'AUDIT') || (isManager && mod === 'ATTENDANCE'),
          canDelete: isSuper || (isAdmin && mod !== 'SETTINGS' && mod !== 'AUDIT'),
          canApprove: isSuper || isAdmin || (isHr && (mod === 'LEAVE' || mod === 'PAYROLL')) || ((isManager || isSupervisor) && mod === 'LEAVE'),
        },
      });
    }
  }

  // 4. Create Departments
  const deptOps = await prisma.department.create({ data: { name: 'Operations & Facility Management', code: 'OPS-FAC', description: 'Core facility and client site management' } });
  const deptHk = await prisma.department.create({ data: { name: 'Housekeeping Services', code: 'HK-SERV', description: 'Cleaning, sanitization and hygiene maintenance' } });
  const deptSec = await prisma.department.create({ data: { name: 'Security Services', code: 'SEC-GUARD', description: 'Manned guarding, surveillance and access control' } });
  const deptValet = await prisma.department.create({ data: { name: 'Valet & Parking Logistics', code: 'VALET-LOG', description: 'Valet drivers and parking management' } });
  const deptHr = await prisma.department.create({ data: { name: 'Human Resources', code: 'HR-ADMIN', description: 'Talent acquisition, compliance and employee relations' } });
  const deptFin = await prisma.department.create({ data: { name: 'Finance & Accounts', code: 'FIN-ACC', description: 'Payroll, invoicing, taxation and audit' } });

  // 5. Create Designations
  const desigGm = await prisma.designation.create({ data: { title: 'General Manager - Operations', code: 'GM-OPS', departmentId: deptOps.id, minSalary: 60000, maxSalary: 120000 } });
  const desigHrMgr = await prisma.designation.create({ data: { title: 'HR Manager', code: 'HR-MGR', departmentId: deptHr.id, minSalary: 45000, maxSalary: 75000 } });
  const desigSiteMgr = await prisma.designation.create({ data: { title: 'Facility Site Manager', code: 'SITE-MGR', departmentId: deptOps.id, minSalary: 35000, maxSalary: 55000 } });
  const desigSupervisor = await prisma.designation.create({ data: { title: 'Shift Supervisor', code: 'SHIFT-SUP', departmentId: deptOps.id, minSalary: 25000, maxSalary: 38000 } });
  const desigSecOfficer = await prisma.designation.create({ data: { title: 'Security Officer', code: 'SEC-OFF', departmentId: deptSec.id, minSalary: 22000, maxSalary: 32000 } });
  const desigSecGuard = await prisma.designation.create({ data: { title: 'Security Guard', code: 'SEC-GRD', departmentId: deptSec.id, minSalary: 16000, maxSalary: 22000 } });
  const desigHkSupervisor = await prisma.designation.create({ data: { title: 'Housekeeping Supervisor', code: 'HK-SUP', departmentId: deptHk.id, minSalary: 22000, maxSalary: 30000 } });
  const desigHkAssociate = await prisma.designation.create({ data: { title: 'Housekeeping Associate', code: 'HK-ASC', departmentId: deptHk.id, minSalary: 14000, maxSalary: 19000 } });
  const desigValetDriver = await prisma.designation.create({ data: { title: 'Valet Driver', code: 'VAL-DRV', departmentId: deptValet.id, minSalary: 18000, maxSalary: 25000 } });
  const desigAccountant = await prisma.designation.create({ data: { title: 'Senior Accountant', code: 'SR-ACC', departmentId: deptFin.id, minSalary: 30000, maxSalary: 50000 } });

  // 6. Create Shifts
  const shiftGeneral = await prisma.shift.create({
    data: {
      name: 'General Shift',
      code: 'GEN-0930',
      startTime: '09:30',
      endTime: '18:30',
      gracePeriodMins: 15,
      halfDayHours: 4.5,
      fullDayHours: 9.0,
      isNightShift: false,
    },
  });

  const shiftMorning = await prisma.shift.create({
    data: {
      name: 'Morning Shift',
      code: 'MORN-0600',
      startTime: '06:00',
      endTime: '14:30',
      gracePeriodMins: 15,
      halfDayHours: 4.0,
      fullDayHours: 8.5,
      isNightShift: false,
    },
  });

  const shiftEvening = await prisma.shift.create({
    data: {
      name: 'Evening Shift',
      code: 'EVE-1400',
      startTime: '14:00',
      endTime: '22:30',
      gracePeriodMins: 15,
      halfDayHours: 4.0,
      fullDayHours: 8.5,
      isNightShift: false,
    },
  });

  const shiftNight = await prisma.shift.create({
    data: {
      name: 'Night Shift',
      code: 'NIGHT-2200',
      startTime: '22:00',
      endTime: '06:30',
      gracePeriodMins: 15,
      halfDayHours: 4.0,
      fullDayHours: 8.5,
      isNightShift: true,
    },
  });

  // 7. Create Sites
  const siteMicrosoft = await prisma.site.create({
    data: {
      siteCode: 'MSFT-HYD-01',
      siteName: 'Microsoft Campus - Building 3',
      clientName: 'Microsoft India R&D Pvt. Ltd.',
      location: 'Gachibowli, Hyderabad',
      address: 'Microsoft Campus, ISB Road, Financial District, Gachibowli, Hyderabad - 500032',
      city: 'Hyderabad',
      state: 'Telangana',
      contractStartDate: new Date('2024-01-01'),
      contractEndDate: new Date('2027-12-31'),
      billingRate: 350000,
      status: 'ACTIVE',
      contactPerson: 'Mr. Arvind Sharma (Head of Facilities)',
      contactPhone: '+91 98490 11223',
      contactEmail: 'facilities.india@microsoft.com',
    },
  });

  const siteThirdWave = await prisma.site.create({
    data: {
      siteCode: 'TWC-HYD-02',
      siteName: 'Third Wave Coffee - Multi Outlets',
      clientName: 'Third Wave Coffee Roasters',
      location: 'Jubilee Hills & Hitec City',
      address: 'Road No. 36, Jubilee Hills & Mindspace Cyberabad, Hyderabad - 500081',
      city: 'Hyderabad',
      state: 'Telangana',
      contractStartDate: new Date('2024-06-01'),
      contractEndDate: new Date('2026-05-31'),
      billingRate: 180000,
      status: 'ACTIVE',
      contactPerson: 'Ms. Sneha Rao (Regional Ops Manager)',
      contactPhone: '+91 97000 44556',
      contactEmail: 'ops.hyd@thirdwavecoffee.in',
    },
  });

  const siteAmazon = await prisma.site.create({
    data: {
      siteCode: 'AMZN-HYD-03',
      siteName: 'Amazon Development Center',
      clientName: 'Amazon India Ltd.',
      location: 'Financial District, Nanakramguda',
      address: 'Tower 2, Amazon Campus, Nanakramguda, Hyderabad - 500079',
      city: 'Hyderabad',
      state: 'Telangana',
      contractStartDate: new Date('2024-03-01'),
      contractEndDate: new Date('2027-02-28'),
      billingRate: 420000,
      status: 'ACTIVE',
      contactPerson: 'Mr. Rajesh Nair',
      contactPhone: '+91 99887 66554',
      contactEmail: 'hyd-admin@amazon.com',
    },
  });

  const siteVphsHq = await prisma.site.create({
    data: {
      siteCode: 'VPHS-HQ-00',
      siteName: 'VPHS Corporate Head Office',
      clientName: 'VPHS Services Pvt. Ltd. (Internal)',
      location: 'Madhapur, Hitech City',
      address: 'Plot No. 42, Madhapur, Hitech City, Hyderabad - 500081',
      city: 'Hyderabad',
      state: 'Telangana',
      contractStartDate: new Date('2020-01-01'),
      contractEndDate: new Date('2030-12-31'),
      billingRate: 0,
      status: 'ACTIVE',
      contactPerson: 'Director - VPHS',
      contactPhone: '+91 40 4567 8900',
      contactEmail: 'director@vphs.in',
    },
  });

  // 8. Create Leave Types
  const leaveTypes = [
    { name: 'Casual Leave', code: 'CL', maxDaysPerYear: 12, isPaid: true, carryForward: false, requiresApproval: true },
    { name: 'Sick Leave', code: 'SL', maxDaysPerYear: 12, isPaid: true, carryForward: true, requiresApproval: true },
    { name: 'Earned Leave', code: 'EL', maxDaysPerYear: 15, isPaid: true, carryForward: true, requiresApproval: true },
    { name: 'Emergency Leave', code: 'EML', maxDaysPerYear: 5, isPaid: true, carryForward: false, requiresApproval: true },
    { name: 'Loss of Pay', code: 'LOP', maxDaysPerYear: 365, isPaid: false, carryForward: false, requiresApproval: true },
  ];

  for (const lt of leaveTypes) {
    await prisma.leaveType.create({ data: lt });
  }

  // 9. Create Employees with authentic details
  const employeesData = [
    {
      employeeId: 'VPHS-001',
      firstName: 'Vikram',
      lastName: 'Pratap Singh',
      gender: 'Male',
      dob: new Date('1982-04-15'),
      mobile: '9848012345',
      email: 'vikram.singh@vphs.in',
      emergencyContact: '9848099999',
      emergencyContactName: 'Sunita Singh (Wife)',
      address: 'Flat 402, Royal Palms, Madhapur',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500081',
      aadhaarNumber: '4532 9876 1234',
      panNumber: 'ABVPS1234F',
      joiningDate: new Date('2020-01-10'),
      departmentId: deptOps.id,
      designationId: desigGm.id,
      siteId: siteVphsHq.id,
      shiftId: shiftGeneral.id,
      employmentType: 'FULL_TIME',
      salaryCtc: 85000,
      bankAccountNo: '50200099881122',
      bankIfsc: 'HDFC0000123',
      bankName: 'HDFC Bank',
      bankBranch: 'Madhapur',
      pfNumber: 'AP/HYD/0045678/000/0000001',
      esiNumber: '52000456780000001',
      uanNumber: '100987654321',
      status: 'ACTIVE',
      username: 'admin',
      role: 'SUPER_ADMIN',
    },
    {
      employeeId: 'VPHS-002',
      firstName: 'Priya',
      lastName: 'Sharma',
      gender: 'Female',
      dob: new Date('1990-08-22'),
      mobile: '9701122334',
      email: 'priya.sharma@vphs.in',
      emergencyContact: '9701199887',
      emergencyContactName: 'Rahul Sharma (Brother)',
      address: 'H.No 12-4/1, Kondapur',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500084',
      aadhaarNumber: '8765 4321 9876',
      panNumber: 'BKRPS4321K',
      joiningDate: new Date('2021-03-15'),
      departmentId: deptHr.id,
      designationId: desigHrMgr.id,
      siteId: siteVphsHq.id,
      shiftId: shiftGeneral.id,
      employmentType: 'FULL_TIME',
      salaryCtc: 55000,
      bankAccountNo: '912010045678901',
      bankIfsc: 'UTIB0000543',
      bankName: 'Axis Bank',
      bankBranch: 'Kondapur',
      pfNumber: 'AP/HYD/0045678/000/0000002',
      esiNumber: '52000456780000002',
      uanNumber: '100987654322',
      status: 'ACTIVE',
      username: 'hr_manager',
      role: 'HR',
    },
    {
      employeeId: 'VPHS-025',
      firstName: 'Ramesh',
      lastName: 'Kumar',
      gender: 'Male',
      dob: new Date('1985-05-14'),
      mobile: '9849988776',
      email: 'ramesh.kumar@vphs.in',
      emergencyContact: '9849900011',
      emergencyContactName: 'Lakshmi K. (Wife)',
      address: 'Plot 88, Telecom Nagar, Gachibowli',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500032',
      aadhaarNumber: '7654 3210 1122',
      panNumber: 'CPKSK8877L',
      joiningDate: new Date('2021-06-01'),
      departmentId: deptOps.id,
      designationId: desigSiteMgr.id,
      siteId: siteMicrosoft.id,
      shiftId: shiftGeneral.id,
      employmentType: 'FULL_TIME',
      salaryCtc: 48000,
      bankAccountNo: '302918273645',
      bankIfsc: 'SBIN0004567',
      bankName: 'State Bank of India',
      bankBranch: 'Gachibowli',
      pfNumber: 'AP/HYD/0045678/000/0000025',
      esiNumber: '52000456780000025',
      uanNumber: '100987654323',
      status: 'ACTIVE',
      username: 'ramesh',
      role: 'SITE_MANAGER',
    },
    {
      employeeId: 'VPHS-010',
      firstName: 'Suresh',
      lastName: 'Kumar',
      gender: 'Male',
      dob: new Date('1989-11-05'),
      mobile: '9849011223',
      email: 'suresh.kumar@vphs.in',
      emergencyContact: '9849011000',
      emergencyContactName: 'Radha (Wife)',
      address: 'Plot 14, Hitec City Road, Madhapur',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500081',
      aadhaarNumber: '9988 7766 5544',
      panNumber: 'SKPSK1100K',
      joiningDate: new Date('2022-01-15'),
      departmentId: deptOps.id,
      designationId: desigSupervisor.id,
      siteId: siteMicrosoft.id,
      shiftId: shiftMorning.id,
      employmentType: 'FULL_TIME',
      salaryCtc: 34000,
      bankAccountNo: '620199887711',
      bankIfsc: 'ICIC0000045',
      bankName: 'ICICI Bank',
      bankBranch: 'Madhapur',
      pfNumber: 'AP/HYD/0045678/000/0000010',
      esiNumber: '52000456780000010',
      uanNumber: '100987654310',
      status: 'ACTIVE',
      username: 'suresh',
      role: 'SUPERVISOR',
    },
    {
      employeeId: 'VPHS-004',
      firstName: 'Aamir',
      lastName: 'Khan',
      gender: 'Male',
      dob: new Date('1994-06-18'),
      mobile: '9988112233',
      email: 'aamir.khan@vphs.in',
      emergencyContact: '9988110000',
      emergencyContactName: 'Rashid Khan (Father)',
      address: 'House 5-11, Tolichowki',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500008',
      aadhaarNumber: '6543 2109 3344',
      panNumber: 'DMNAK1122M',
      joiningDate: new Date('2022-06-10'),
      departmentId: deptSec.id,
      designationId: desigSecOfficer.id,
      siteId: siteAmazon.id,
      shiftId: shiftMorning.id,
      employmentType: 'FULL_TIME',
      salaryCtc: 24000,
      bankAccountNo: '620199887766',
      bankIfsc: 'ICIC0000045',
      bankName: 'ICICI Bank',
      bankBranch: 'Tolichowki',
      pfNumber: 'AP/HYD/0045678/000/0000004',
      esiNumber: '52000456780000004',
      uanNumber: '100987654324',
      status: 'ACTIVE',
      username: 'aamir',
      role: 'EMPLOYEE',
    },
    {
      employeeId: 'VPHS-005',
      firstName: 'Dawood',
      lastName: 'Ahmed',
      gender: 'Male',
      dob: new Date('1996-01-25'),
      mobile: '9123456780',
      email: 'dawood.a@vphs.in',
      emergencyContact: '9123456700',
      emergencyContactName: 'Imran (Brother)',
      address: 'B-14, Mehdipatnam',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500028',
      aadhaarNumber: '5432 1098 5566',
      panNumber: 'EPQDA5566N',
      joiningDate: new Date('2023-01-15'),
      departmentId: deptSec.id,
      designationId: desigSecGuard.id,
      siteId: siteMicrosoft.id,
      shiftId: shiftMorning.id,
      employmentType: 'CONTRACT',
      salaryCtc: 18500,
      bankAccountNo: '450912345678',
      bankIfsc: 'PUNB0123400',
      bankName: 'Punjab National Bank',
      bankBranch: 'Mehdipatnam',
      pfNumber: 'AP/HYD/0045678/000/0000005',
      esiNumber: '52000456780000005',
      uanNumber: '100987654325',
      status: 'ACTIVE',
      username: 'employee_dawood',
      role: 'EMPLOYEE',
    },
    {
      employeeId: 'VPHS-006',
      firstName: 'Dheeraj',
      lastName: 'Kumar',
      gender: 'Male',
      dob: new Date('1997-09-12'),
      mobile: '9876501234',
      email: 'dheeraj.k@vphs.in',
      emergencyContact: '9876500000',
      emergencyContactName: 'Manju (Mother)',
      address: 'Qtr 44, Miyapur',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500049',
      aadhaarNumber: '4321 0987 7788',
      panNumber: 'FRTDK7788P',
      joiningDate: new Date('2023-03-20'),
      departmentId: deptHk.id,
      designationId: desigHkAssociate.id,
      siteId: siteMicrosoft.id,
      shiftId: shiftMorning.id,
      employmentType: 'FULL_TIME',
      salaryCtc: 16500,
      bankAccountNo: '501002345678',
      bankIfsc: 'HDFC0000456',
      bankName: 'HDFC Bank',
      bankBranch: 'Miyapur',
      pfNumber: 'AP/HYD/0045678/000/0000006',
      esiNumber: '52000456780000006',
      uanNumber: '100987654326',
      status: 'ACTIVE',
      username: 'employee_dheeraj',
      role: 'EMPLOYEE',
    },
    {
      employeeId: 'VPHS-007',
      firstName: 'Adam',
      lastName: 'Sha',
      gender: 'Male',
      dob: new Date('1993-12-04'),
      mobile: '9765432109',
      email: 'adam.sha@vphs.in',
      emergencyContact: '9765432100',
      emergencyContactName: 'Farhan (Friend)',
      address: 'Lane 3, Hafeezpet',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500049',
      aadhaarNumber: '3210 9876 9900',
      panNumber: 'GTQAS9900Q',
      joiningDate: new Date('2023-05-02'),
      departmentId: deptValet.id,
      designationId: desigValetDriver.id,
      siteId: siteThirdWave.id,
      shiftId: shiftEvening.id,
      employmentType: 'FULL_TIME',
      salaryCtc: 22000,
      bankAccountNo: '304958671234',
      bankIfsc: 'SBIN0011223',
      bankName: 'State Bank of India',
      bankBranch: 'Hafeezpet',
      pfNumber: 'AP/HYD/0045678/000/0000007',
      esiNumber: '52000456780000007',
      uanNumber: '100987654327',
      status: 'ACTIVE',
      username: 'employee_adam',
      role: 'EMPLOYEE',
    },
    {
      employeeId: 'VPHS-008',
      firstName: 'Harish',
      lastName: 'Reddy',
      gender: 'Male',
      dob: new Date('1992-03-30'),
      mobile: '9654321098',
      email: 'harish.r@vphs.in',
      emergencyContact: '9654321000',
      emergencyContactName: 'Anitha (Wife)',
      address: 'Flat 101, Kukatpally',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500072',
      aadhaarNumber: '2109 8765 2211',
      panNumber: 'HYTHR2211R',
      joiningDate: new Date('2022-09-01'),
      departmentId: deptSec.id,
      designationId: desigSecOfficer.id,
      siteId: siteThirdWave.id,
      shiftId: shiftGeneral.id,
      employmentType: 'FULL_TIME',
      salaryCtc: 26000,
      bankAccountNo: '918020055443322',
      bankIfsc: 'UTIB0001234',
      bankName: 'Axis Bank',
      bankBranch: 'Kukatpally',
      pfNumber: 'AP/HYD/0045678/000/0000008',
      esiNumber: '52000456780000008',
      uanNumber: '100987654328',
      status: 'ACTIVE',
      username: 'employee_harish',
      role: 'EMPLOYEE',
    },
    {
      employeeId: 'VPHS-009',
      firstName: 'J. Naveen',
      lastName: 'Kumar',
      gender: 'Male',
      dob: new Date('1995-07-19'),
      mobile: '9543210987',
      email: 'naveen.j@vphs.in',
      emergencyContact: '9543210000',
      emergencyContactName: 'Bhadraiah (Father)',
      address: 'H.No 3-88, Manikonda',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500089',
      aadhaarNumber: '1098 7654 4433',
      panNumber: 'JKLNK4433S',
      joiningDate: new Date('2023-08-11'),
      departmentId: deptHk.id,
      designationId: desigHkSupervisor.id,
      siteId: siteAmazon.id,
      shiftId: shiftMorning.id,
      employmentType: 'FULL_TIME',
      salaryCtc: 24000,
      bankAccountNo: '50200077665544',
      bankIfsc: 'HDFC0000789',
      bankName: 'HDFC Bank',
      bankBranch: 'Manikonda',
      pfNumber: 'AP/HYD/0045678/000/0000009',
      esiNumber: '52000456780000009',
      uanNumber: '100987654329',
      status: 'ACTIVE',
      username: 'employee_naveen',
      role: 'EMPLOYEE',
    },
    {
      employeeId: 'VPHS-013',
      firstName: 'Mehraj',
      lastName: 'Begum',
      gender: 'Female',
      dob: new Date('1998-02-14'),
      mobile: '9432109876',
      email: 'mehraj.b@vphs.in',
      emergencyContact: '9432100000',
      emergencyContactName: 'Feroz (Husband)',
      address: 'House 8-2, Borabanda',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500018',
      aadhaarNumber: '9876 5432 6655',
      panNumber: 'MNBMB6655T',
      joiningDate: new Date('2023-10-01'),
      departmentId: deptHk.id,
      designationId: desigHkAssociate.id,
      siteId: siteAmazon.id,
      shiftId: shiftMorning.id,
      employmentType: 'CONTRACT',
      salaryCtc: 15500,
      bankAccountNo: '401928374650',
      bankIfsc: 'SBIN0008899',
      bankName: 'State Bank of India',
      bankBranch: 'Borabanda',
      pfNumber: 'AP/HYD/0045678/000/0000013',
      esiNumber: '52000456780000013',
      uanNumber: '100987654330',
      status: 'ACTIVE',
      username: 'employee_mehraj',
      role: 'EMPLOYEE',
    },
    {
      employeeId: 'VPHS-011',
      firstName: 'Dakshinya',
      lastName: 'Deep',
      gender: 'Female',
      dob: new Date('1991-05-20'),
      mobile: '9321098765',
      email: 'dakshinya.d@vphs.in',
      emergencyContact: '9321000000',
      emergencyContactName: 'Deepak (Father)',
      address: 'Villa 12, Jubilee Enclave',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500081',
      aadhaarNumber: '8765 4321 8877',
      panNumber: 'DKSDD8877U',
      joiningDate: new Date('2021-08-01'),
      departmentId: deptFin.id,
      designationId: desigAccountant.id,
      siteId: siteVphsHq.id,
      shiftId: shiftGeneral.id,
      employmentType: 'FULL_TIME',
      salaryCtc: 38000,
      bankAccountNo: '914020088997766',
      bankIfsc: 'UTIB0003456',
      bankName: 'Axis Bank',
      bankBranch: 'Hitec City',
      pfNumber: 'AP/HYD/0045678/000/0000011',
      esiNumber: '52000456780000011',
      uanNumber: '100987654331',
      status: 'ACTIVE',
      username: 'finance_dakshinya',
      role: 'ADMIN',
    },
    {
      employeeId: 'VPHS-012',
      firstName: 'Anil',
      lastName: 'Varma',
      gender: 'Male',
      dob: new Date('1995-10-10'),
      mobile: '9210987654',
      email: 'anil.v@vphs.in',
      emergencyContact: '9210000000',
      emergencyContactName: 'Ramesh (Brother)',
      address: 'Flat 204, Pragathi Nagar',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500090',
      aadhaarNumber: '7654 3210 9988',
      panNumber: 'AVMAV9988V',
      joiningDate: new Date('2023-11-15'),
      departmentId: deptSec.id,
      designationId: desigSecGuard.id,
      siteId: siteThirdWave.id,
      shiftId: shiftNight.id,
      employmentType: 'FULL_TIME',
      salaryCtc: 17000,
      bankAccountNo: '50200066554433',
      bankIfsc: 'HDFC0000999',
      bankName: 'HDFC Bank',
      bankBranch: 'Pragathi Nagar',
      pfNumber: 'AP/HYD/0045678/000/0000012',
      esiNumber: '52000456780000012',
      uanNumber: '100987654332',
      status: 'ACTIVE',
      username: 'employee_anil',
      role: 'EMPLOYEE',
    },
  ];

  const allLeaveTypes = await prisma.leaveType.findMany();

  // Create Employees, Users, Salary Structures & Leave Balances
  for (const empData of employeesData) {
    const { username, role, salaryCtc, ...empFields } = empData;

    const createdEmp = await prisma.employee.create({
      data: {
        ...empFields,
        salaryCtc,
      },
    });

    // Create User Login
    await prisma.user.create({
      data: {
        employeeId: createdEmp.employeeId,
        username,
        email: empFields.email || `${username}@vphs.in`,
        passwordHash: hashPassword('password123'), // Default password for all demo accounts
        role,
        isActive: true,
      },
    });

    // Calculate Salary Structure Components
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
        employeeId: createdEmp.id,
        ctc: salaryCtc,
        basic,
        da,
        hra,
        conveyance,
        specialAllowance,
        otherAllowance: 0,
        grossSalary,
        employeePf,
        employeeEsi,
        professionalTax,
        otherDeduction: 0,
        netSalary,
        isCurrent: true,
      },
    });

    // Create Leave Balances for 2026
    for (const lt of allLeaveTypes) {
      await prisma.leaveBalance.create({
        data: {
          employeeId: createdEmp.id,
          leaveTypeId: lt.id,
          year: 2026,
          totalAllocated: lt.maxDaysPerYear,
          usedDays: lt.code === 'CL' ? 1 : 0,
          pendingDays: 0,
          remainingDays: lt.code === 'CL' ? lt.maxDaysPerYear - 1 : lt.maxDaysPerYear,
        },
      });
    }

    // Create Site Assignment
    if (empFields.siteId) {
      await prisma.siteAssignment.create({
        data: {
          employeeId: createdEmp.id,
          siteId: empFields.siteId,
          roleAtSite: 'Staff Member',
          status: 'ACTIVE',
        },
      });
    }

    // Create Sample Documents
    const docTypes = [
      { type: 'AADHAAR', title: 'Aadhaar Card Copy', daysToExpire: 1800, status: 'VALID' },
      { type: 'PAN', title: 'PAN Card Copy', daysToExpire: 3000, status: 'VALID' },
      { type: 'ID_CARD', title: 'VPHS Employee Digital ID', daysToExpire: 365, status: 'VALID' },
      { type: 'JOINING_LETTER', title: 'Signed Joining Letter', daysToExpire: null, status: 'VALID' },
    ];

    if (createdEmp.employeeId === 'VPHS-005') {
      // Add an expiring document for testing alerts
      docTypes.push({ type: 'BANK_PROOF', title: 'Bank Passbook Verification', daysToExpire: 10, status: 'EXPIRING' });
    } else if (createdEmp.employeeId === 'VPHS-006') {
      // Add an expired document
      docTypes.push({ type: 'OTHER', title: 'Medical Fitness Certificate', daysToExpire: -15, status: 'EXPIRED' });
    }

    for (const doc of docTypes) {
      const expiry = doc.daysToExpire !== null ? new Date(Date.now() + doc.daysToExpire * 24 * 60 * 60 * 1000) : null;
      await prisma.document.create({
        data: {
          employeeId: createdEmp.id,
          documentType: doc.type,
          title: doc.title,
          fileUrl: `/uploads/${createdEmp.employeeId}_${doc.type.toLowerCase()}.pdf`,
          fileName: `${createdEmp.employeeId}_${doc.type.toLowerCase()}.pdf`,
          fileSize: 1024 * 250,
          mimeType: 'application/pdf',
          expiryDate: expiry,
          status: doc.status,
          isVerified: true,
        },
      });
    }
  }

  // 9.1 Link Reporting Managers, Site Managers & Multi-Site Assignments
  const rameshEmp = await prisma.employee.findUnique({ where: { employeeId: 'VPHS-025' } });
  const sureshEmp = await prisma.employee.findUnique({ where: { employeeId: 'VPHS-010' } });
  const aamirEmp = await prisma.employee.findUnique({ where: { employeeId: 'VPHS-004' } });
  const vikramEmp = await prisma.employee.findUnique({ where: { employeeId: 'VPHS-001' } });
  const priyaEmp = await prisma.employee.findUnique({ where: { employeeId: 'VPHS-002' } });

  if (rameshEmp) {
    // Ramesh manages Microsoft Campus AND Amazon Development Center
    await prisma.site.update({
      where: { id: siteMicrosoft.id },
      data: { siteManagerId: rameshEmp.id },
    });
    await prisma.site.update({
      where: { id: siteAmazon.id },
      data: { siteManagerId: rameshEmp.id },
    });
    // Add active assignment for Amazon site as well
    await prisma.siteAssignment.create({
      data: {
        employeeId: rameshEmp.id,
        siteId: siteAmazon.id,
        roleAtSite: 'Site Manager',
        status: 'ACTIVE',
      },
    });
  }

  if (sureshEmp) {
    // Suresh supervises security team at Microsoft & Amazon sites
    await prisma.site.update({
      where: { id: siteMicrosoft.id },
      data: { supervisorId: sureshEmp.id },
    });
    await prisma.site.update({
      where: { id: siteAmazon.id },
      data: { supervisorId: sureshEmp.id },
    });

    // Set reporting manager for team subordinates (Aamir Khan, Dawood Ahmed, Dheeraj Kumar)
    await prisma.employee.updateMany({
      where: { employeeId: { in: ['VPHS-004', 'VPHS-005', 'VPHS-006', 'VPHS-007'] } },
      data: { reportingManagerId: sureshEmp.id },
    });
  }

  // 10. Create Attendance Records for Past 14 Days
  console.log('📅 Generating realistic attendance history...');
  const allCreatedEmployees = await prisma.employee.findMany();
  const today = new Date();

  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getDay(); // 0 = Sunday

    for (const emp of allCreatedEmployees) {
      if (dayOfWeek === 0) {
        // Sunday Week Off
        await prisma.attendance.create({
          data: {
            employeeId: emp.id,
            siteId: emp.siteId,
            shiftId: emp.shiftId,
            date: dateStr,
            status: 'WEEK_OFF',
            markedBy: 'SYSTEM',
            workingHours: 0,
            lateMinutes: 0,
            overtimeHours: 0,
            remarks: 'Scheduled weekly off',
          },
        });
        continue;
      }

      // Realistic attendance variance
      let status = 'PRESENT';
      let lateMins = 0;
      let workingHours = 9.0;
      let otHours = 0;
      let inHour = 9;
      let inMin = 20 + Math.floor(Math.random() * 20); // 9:20 - 9:40

      if (emp.employeeId === 'VPHS-005' && i === 2) {
        status = 'LATE';
        inHour = 9;
        inMin = 52; // 22 mins late past 09:45 grace
        lateMins = 22;
        workingHours = 8.6;
      } else if (emp.employeeId === 'VPHS-006' && i === 4) {
        status = 'LEAVE';
        workingHours = 0;
      } else if (emp.employeeId === 'VPHS-007' && i === 1) {
        status = 'PRESENT';
        otHours = 2.0;
        workingHours = 11.0;
      }

      const inTime = status !== 'LEAVE' ? new Date(`${dateStr}T${String(inHour).padStart(2, '0')}:${String(inMin).padStart(2, '0')}:00Z`) : null;
      const outTime = status !== 'LEAVE' ? new Date(`${dateStr}T18:30:00Z`) : null;

      await prisma.attendance.create({
        data: {
          employeeId: emp.id,
          siteId: emp.siteId,
          shiftId: emp.shiftId,
          date: dateStr,
          inTime,
          outTime,
          status,
          workingHours,
          lateMinutes: lateMins,
          overtimeHours: otHours,
          markedBy: 'BIOMETRIC',
          verificationType: 'BIOMETRIC',
          remarks: status === 'LATE' ? 'Late check-in recorded' : (otHours > 0 ? 'Overtime 2 hrs approved' : 'Regular punch'),
        },
      });
    }
  }

  // 11. Create Sample Leave Requests
  const empDawood = allCreatedEmployees.find(e => e.employeeId === 'VPHS-005')!;
  const empDheeraj = allCreatedEmployees.find(e => e.employeeId === 'VPHS-006')!;
  const clLeave = allLeaveTypes.find(l => l.code === 'CL')!;
  const slLeave = allLeaveTypes.find(l => l.code === 'SL')!;

  await prisma.leaveRequest.create({
    data: {
      employeeId: empDawood.id,
      leaveTypeId: clLeave.id,
      startDate: '2026-09-05',
      endDate: '2026-09-06',
      totalDays: 2,
      reason: 'Family function at hometown',
      status: 'PENDING',
    },
  });

  await prisma.leaveRequest.create({
    data: {
      employeeId: empDheeraj.id,
      leaveTypeId: slLeave.id,
      startDate: '2026-08-23',
      endDate: '2026-08-23',
      totalDays: 1,
      reason: 'Fever and doctor appointment',
      status: 'APPROVED',
      approvedById: allCreatedEmployees[1].id,
      approvalNotes: 'Approved by HR Priya Sharma',
      actionedAt: new Date(),
    },
  });

  // 12. Create Processed Payroll for Previous Month (July 2026) & Draft (August 2026)
  console.log('💰 Generating payroll records & registers...');
  const pastPayroll = await prisma.payroll.create({
    data: {
      payrollMonth: 7,
      payrollYear: 2026,
      totalEmployees: allCreatedEmployees.length,
      totalGross: 396500,
      totalDeductions: 38450,
      totalNet: 358050,
      status: 'PAID',
      processedAt: new Date('2026-08-01'),
      approvedAt: new Date('2026-08-02'),
      remarks: 'July 2026 salary disbursed successfully via HDFC NEFT batch',
    },
  });

  for (const emp of allCreatedEmployees) {
    const salary = emp.salaryCtc;
    const basic = salary * 0.5;
    const da = basic * 0.1;
    const hra = basic * 0.4;
    const conveyance = 1600;
    const special = Math.max(0, salary - (basic + da + hra + conveyance));
    const gross = basic + da + hra + conveyance + special;
    const pf = basic <= 15000 ? basic * 0.12 : 1800;
    const esi = gross <= 21000 ? gross * 0.0075 : 0;
    const pt = 200;
    const totalDeductions = pf + esi + pt;
    const net = gross - totalDeductions;

    await prisma.payrollItem.create({
      data: {
        payrollId: pastPayroll.id,
        employeeId: emp.id,
        workingDays: 31,
        presentDays: 27,
        paidLeaveDays: 4,
        lopDays: 0,
        basic,
        da,
        hra,
        conveyance,
        specialAllowance: special,
        overtimePay: 0,
        bonus: 0,
        grossSalary: gross,
        pfDeduction: pf,
        esiDeduction: esi,
        ptDeduction: pt,
        lopDeduction: 0,
        otherDeductions: 0,
        totalDeductions,
        netSalary: net,
        status: 'PAID',
        payslipNumber: `PAY-202607-${emp.employeeId}`,
        paymentDate: new Date('2026-08-05'),
        paymentMode: 'BANK_TRANSFER',
        paymentRef: `NEFT-HDFC-${Math.floor(100000000 + Math.random() * 900000000)}`,
        isPaid: true,
      },
    });
  }

  // 13. Create System Notifications
  const adminUser = await prisma.user.findFirst({ where: { username: 'admin' } })!;
  const hrUser = await prisma.user.findFirst({ where: { username: 'hr_manager' } })!;

  await prisma.notification.createMany({
    data: [
      {
        userId: adminUser.id,
        title: 'System Initialized',
        message: 'Welcome to VPHS Facility Management & ERP Portal. All systems are operational.',
        type: 'SUCCESS',
      },
      {
        userId: adminUser.id,
        title: 'Document Expiry Warning',
        message: 'Employee Dawood Ahmed (VPHS-005) Bank Proof document will expire in 10 days.',
        type: 'WARNING',
        link: '/documents',
      },
      {
        userId: hrUser.id,
        title: 'New Leave Request',
        message: 'Dawood Ahmed (VPHS-005) requested 2 days Casual Leave from 2026-09-05.',
        type: 'LEAVE',
        link: '/leaves',
      },
      {
        userId: hrUser.id,
        title: 'July 2026 Payroll Completed',
        message: 'Payroll disbursed for 12 employees totaling ₹3,58,050.',
        type: 'PAYROLL',
        link: '/payroll',
      },
    ],
  });

  // 14. Create Initial Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: adminUser.id,
        module: 'AUTH',
        action: 'LOGIN',
        details: JSON.stringify({ message: 'Super Admin initial login' }),
        ipAddress: '127.0.0.1',
      },
      {
        userId: hrUser.id,
        module: 'EMPLOYEE',
        action: 'CREATE',
        recordId: 'VPHS-012',
        details: JSON.stringify({ employeeId: 'VPHS-012', name: 'Anil Varma', designation: 'Security Guard' }),
        ipAddress: '127.0.0.1',
      },
      {
        userId: adminUser.id,
        module: 'PAYROLL',
        action: 'APPROVE',
        recordId: pastPayroll.id,
        details: JSON.stringify({ month: 'July 2026', totalNet: 358050, employeeCount: 12 }),
        ipAddress: '127.0.0.1',
      },
    ],
  });

  console.log('✅ VPHS ERP Database Seed completed successfully!');
  console.log('----------------------------------------------------');
  console.log('Demo Logins (Password for all accounts is "password123"):');
  console.log('1. Super Admin:  username: admin');
  console.log('2. HR Manager:   username: hr_manager');
  console.log('3. Site Manager: username: site_manager');
  console.log('4. Supervisor:   username: supervisor');
  console.log('5. Employee:     username: employee_dawood');
  console.log('6. Finance Admin:username: finance_dakshinya');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
