import React, { useState } from 'react';
import {
  User,
  Briefcase,
  FolderLock,
  Building2,
  Receipt,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Eye,
  FileText,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Sun,
  Moon,
  RefreshCw,
  FileCheck,
  Camera,
  Edit3,
} from 'lucide-react';
import { Department, Designation, Site, Shift, Employee } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import api from '../../services/api';
import { useNotifications } from '../../contexts/NotificationContext';

interface OnboardingWizardProps {
  departments: Department[];
  designations: Designation[];
  sites: Site[];
  shifts: Shift[];
  employees: Employee[];
  onComplete: (newEmployee: Employee) => void;
  onCancel: () => void;
}

export const EmployeeOnboardingWizard: React.FC<OnboardingWizardProps> = ({
  departments,
  designations,
  sites,
  shifts,
  employees,
  onComplete,
  onCancel,
}) => {
  const { showToast } = useNotifications();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  const isLight = themeMode === 'light';

  // STEP 1: PERSONAL INFORMATION
  const [personalInfo, setPersonalInfo] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    fatherName: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    dob: '1995-01-01',
    mobile: '',
    alternateMobile: '',
    emergencyContact: '',
    emergencyContactName: '',
    email: '',
    officialEmail: '',
    currentAddress: '',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500081',
    permanentAddress: '',
    sameAsCurrentAddress: true,
  });

  // Step 1 Files
  const [page1Files, setPage1Files] = useState<{
    photo: string | null;
    signature: string | null;
    idProof: string | null;
  }>({
    photo: 'profile_photo.jpg',
    signature: 'specimen_signature.png',
    idProof: 'address_proof.pdf',
  });
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

  // STEP 2: PROFESSIONAL EXPERIENCE
  const [isFresher, setIsFresher] = useState<boolean>(false);
  const [experiences, setExperiences] = useState<Array<{
    companyName: string;
    designation: string;
    department: string;
    dateOfJoining: string;
    dateOfLeaving: string;
    totalExperience: string;
    previousSalary: number;
    reasonForLeaving: string;
    expCertificateName: string | null;
    offerLetterName: string | null;
  }>>([
    {
      companyName: 'G4S Facility Solutions Pvt Ltd',
      designation: 'Security Officer',
      department: 'Security & Facility Operations',
      dateOfJoining: '2023-01-01',
      dateOfLeaving: '2025-12-31',
      totalExperience: '3 Years',
      previousSalary: 22000,
      reasonForLeaving: 'Career Growth & Better Compensation',
      expCertificateName: 'G4S_Relieving_Certificate.pdf',
      offerLetterName: 'G4S_Appointment_Letter.pdf',
    },
  ]);
  const [resumeFileName, setResumeFileName] = useState<string | null>('Updated_Resume_2026.pdf');

  // STEP 3: EMPLOYEE DOCUMENTS
  const [documentsState, setDocumentsState] = useState([
    { type: 'AADHAAR', name: 'Aadhaar Card', number: '5432 1098 7654', fileName: 'Aadhaar_Front_Back.pdf', status: 'VERIFIED' },
    { type: 'PAN', name: 'PAN Card', number: 'ABCDE1234F', fileName: 'PAN_Card_Scanned.pdf', status: 'VERIFIED' },
    { type: 'DRIVING_LICENSE', name: 'Driving Licence', number: 'TS09-20210008765', fileName: 'Driving_Licence.pdf', status: 'PENDING' },
    { type: 'VOTER_ID', name: 'Voter ID Card', number: 'ABC9876543', fileName: 'Voter_ID.pdf', status: 'PENDING' },
    { type: 'UAN', name: 'Universal Account Number (UAN)', number: '101234567890', fileName: 'UAN_Card.pdf', status: 'VERIFIED' },
    { type: 'ESI_NUMBER', name: 'ESI Registration Number', number: '52000123456780001', fileName: 'ESIC_ePehchan.pdf', status: 'VERIFIED' },
    { type: 'PF_NUMBER', name: 'PF Account Number', number: 'TS/HYD/1234567/001', fileName: 'PF_Passbook.pdf', status: 'VERIFIED' },
    { type: 'PASSPORT', name: 'Passport Number', number: 'P1234567', fileName: null, status: 'PENDING' },
    { type: 'EDUCATION', name: 'Educational Highest Degree', number: 'DEG-2018-9876', fileName: 'Degree_Certificate.pdf', status: 'VERIFIED' },
    { type: 'EXPERIENCE', name: 'Relieving / Experience Letter', number: 'REL-2025-01', fileName: 'Relieving_Letter.pdf', status: 'VERIFIED' },
    { type: 'PHOTO', name: 'Recent Passport Size Photograph', number: 'PHOTO-01', fileName: 'Passport_Photo.jpg', status: 'VERIFIED' },
    { type: 'SIGNATURE', name: 'Employee Specimen Signature', number: 'SIG-01', fileName: 'Specimen_Sign.png', status: 'VERIFIED' },
  ]);

  // STEP 4: DESIGNATION & SITE ALLOCATION
  const [allocation, setAllocation] = useState({
    employeeId: `VPHS-${String(employees.length + 1).padStart(3, '0')}`,
    departmentId: departments[0]?.id || '',
    designationId: designations[0]?.id || '',
    siteId: sites[0]?.id || '',
    shiftId: shifts[0]?.id || '',
    reportingManagerId: '',
    employmentType: 'FULL_TIME' as 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE',
    joiningDate: new Date().toISOString().split('T')[0],
  });
  const [page4Files, setPage4Files] = useState<{
    siteAllocationLetter: string | null;
    shiftRosterOrder: string | null;
  }>({
    siteAllocationLetter: 'Client_Site_Allocation_Order.pdf',
    shiftRosterOrder: 'Shift_Roster_Assignment.pdf',
  });

  // STEP 5: SALARY STRUCTURE
  const [salaryMode, setSalaryMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [salaryConfig, setSalaryConfig] = useState({
    paymentFrequency: 'MONTHLY',
    effectiveDate: new Date().toISOString().split('T')[0],
    salaryCtc: 30000,
    basic: 15000,
    hra: 6000,
    conveyance: 1600,
    medicalAllowance: 1250,
    specialAllowance: 4346,
    otherAllowance: 0,
    grossSalary: 28196,
    employerPf: 1800,
    employerEsi: 0,
    gratuity: 721,
    insuranceBenefit: 500,
    employeePf: 1800,
    employeeEsi: 0,
    professionalTax: 200,
    tdsDeduction: 0,
    totalDeductions: 2000,
    netSalary: 26196,
  });
  const [page5Files, setPage5Files] = useState<{
    salaryAnnexure: string | null;
  }>({
    salaryAnnexure: 'CTC_Salary_Annexure_Signed.pdf',
  });

  // STEP 6: BANK ACCOUNT DETAILS
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: '',
    bankName: 'HDFC Bank',
    accountNumber: '',
    confirmAccountNumber: '',
    bankIfsc: 'HDFC0000123',
    bankBranch: 'Madhapur Hitech City',
    accountType: 'Savings' as 'Savings' | 'Current',
    upiId: '',
    verificationStatus: 'VERIFIED' as 'VERIFIED' | 'PENDING',
  });
  const [page6Files, setPage6Files] = useState<{
    cancelledCheque: string | null;
    upiQrProof: string | null;
  }>({
    cancelledCheque: 'Cancelled_Cheque_HDFC.pdf',
    upiQrProof: 'UPI_QR_Verification.png',
  });

  const updateSalaryByCtc = (ctc: number) => {
    const basic = Math.round(ctc * 0.5);
    const hra = Math.round(basic * 0.4);
    const conveyance = 1600;
    const medicalAllowance = 1250;
    const employerPf = Math.min(basic, 15000) * 0.12;
    const employerEsi = ctc <= 21000 ? Math.round(ctc * 0.0325) : 0;
    const gratuity = Math.round((basic * 15) / 26 / 12);
    const insuranceBenefit = 500;
    const employerCost = employerPf + employerEsi + gratuity + insuranceBenefit;
    const grossSalary = Math.max(0, Math.round(ctc - employerCost));
    const specialAllowance = Math.max(0, grossSalary - (basic + hra + conveyance + medicalAllowance));
    const employeePf = Math.min(basic, 15000) * 0.12;
    const employeeEsi = grossSalary <= 21000 ? Math.round(grossSalary * 0.0075) : 0;
    const professionalTax = grossSalary > 20000 ? 200 : grossSalary > 15000 ? 150 : 0;
    const totalDeductions = employeePf + employeeEsi + professionalTax;
    const netSalary = Math.max(0, grossSalary - totalDeductions);

    setSalaryConfig({
      ...salaryConfig,
      salaryCtc: ctc,
      basic,
      hra,
      conveyance,
      medicalAllowance,
      specialAllowance,
      otherAllowance: 0,
      grossSalary,
      employerPf,
      employerEsi,
      gratuity,
      insuranceBenefit,
      employeePf,
      employeeEsi,
      professionalTax,
      tdsDeduction: 0,
      totalDeductions,
      netSalary,
    });
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!personalInfo.firstName.trim() || !personalInfo.lastName.trim()) {
        showToast('Please enter both First Name and Last Name.', 'error');
        return;
      }
      if (!personalInfo.mobile.trim()) {
        showToast('Please enter primary Mobile Number.', 'error');
        return;
      }
    }
    if (currentStep === 4) {
      if (!allocation.employeeId.trim()) {
        showToast('Please specify a valid Employee ID.', 'error');
        return;
      }
    }
    if (currentStep === 6) {
      if (bankDetails.accountNumber && bankDetails.confirmAccountNumber) {
        if (bankDetails.accountNumber !== bankDetails.confirmAccountNumber) {
          showToast('Bank Account numbers do not match.', 'error');
          return;
        }
      }
    }
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSubmit = async () => {
    if (!personalInfo.firstName.trim() || !personalInfo.lastName.trim()) {
      showToast('First Name and Last Name are required', 'error');
      setCurrentStep(1);
      return;
    }
    if (!allocation.employeeId.trim()) {
      showToast('Employee ID is required', 'error');
      setCurrentStep(4);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        employeeId: allocation.employeeId,
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        gender: personalInfo.gender,
        dob: personalInfo.dob,
        mobile: personalInfo.mobile,
        email: personalInfo.officialEmail || personalInfo.email || `${allocation.employeeId.toLowerCase()}@vphs.in`,
        emergencyContact: personalInfo.emergencyContact,
        emergencyContactName: personalInfo.emergencyContactName || personalInfo.fatherName,
        address: personalInfo.currentAddress,
        city: personalInfo.city,
        state: personalInfo.state,
        pincode: personalInfo.pincode,
        aadhaarNumber: documentsState.find(d => d.type === 'AADHAAR')?.number || '5432 1098 7654',
        panNumber: documentsState.find(d => d.type === 'PAN')?.number || 'ABCDE1234F',
        pfNumber: documentsState.find(d => d.type === 'PF_NUMBER')?.number || 'TS/HYD/1234567/001',
        esiNumber: documentsState.find(d => d.type === 'ESI_NUMBER')?.number || '52000123456780001',
        uanNumber: documentsState.find(d => d.type === 'UAN')?.number || '101234567890',
        joiningDate: allocation.joiningDate,
        departmentId: allocation.departmentId || departments[0]?.id,
        designationId: allocation.designationId || designations[0]?.id,
        siteId: allocation.siteId || sites[0]?.id,
        shiftId: allocation.shiftId || shifts[0]?.id,
        reportingManagerId: allocation.reportingManagerId || null,
        employmentType: allocation.employmentType,
        salaryCtc: salaryConfig.salaryCtc,
        bankAccountNo: bankDetails.accountNumber || '50200012345678',
        bankIfsc: bankDetails.bankIfsc || 'HDFC0000123',
        bankName: bankDetails.bankName || 'HDFC Bank',
        bankBranch: bankDetails.bankBranch || 'Madhapur Branch',
        status: allocation.status,
        photoUrl: photoDataUrl || undefined,
      };

      const res: any = await api.post('/employees', payload);

      if (res.success && res.data) {
        if (salaryMode === 'MANUAL') {
          await api.put(`/employees/${res.data.id}/salary-structure`, {
            ctc: salaryConfig.salaryCtc,
            basic: salaryConfig.basic,
            hra: salaryConfig.hra,
            conveyance: salaryConfig.conveyance,
            medicalAllowance: salaryConfig.medicalAllowance,
            specialAllowance: salaryConfig.specialAllowance,
            otherAllowance: salaryConfig.otherAllowance,
            grossSalary: salaryConfig.grossSalary,
            employerPf: salaryConfig.employerPf,
            employerEsi: salaryConfig.employerEsi,
            gratuity: salaryConfig.gratuity,
            insuranceBenefit: salaryConfig.insuranceBenefit,
            employeePf: salaryConfig.employeePf,
            employeeEsi: salaryConfig.employeeEsi,
            professionalTax: salaryConfig.professionalTax,
            tdsDeduction: salaryConfig.tdsDeduction,
            netSalary: salaryConfig.netSalary,
          });
        }

        showToast(`Employee ${personalInfo.firstName} ${personalInfo.lastName} (${allocation.employeeId}) onboarded successfully!`, 'success');
        onComplete(res.data);
      }
    } catch (err: any) {
      showToast(err.message || 'Onboarding submission failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = [
    { num: 1, name: 'Personal Details', icon: <User className="w-4 h-4" /> },
    { num: 2, name: 'Professional Experience', icon: <Briefcase className="w-4 h-4" /> },
    { num: 3, name: 'KYC & Documents', icon: <FolderLock className="w-4 h-4" /> },
    { num: 4, name: 'Site & Shift Allocation', icon: <Building2 className="w-4 h-4" /> },
    { num: 5, name: 'Salary & CTC Breakup', icon: <Receipt className="w-4 h-4" /> },
    { num: 6, name: 'Bank & Payouts', icon: <CreditCard className="w-4 h-4" /> },
  ];

  // Theme helper classes
  const themeCardBg = isLight ? 'bg-white border-slate-200 shadow-xl' : 'bg-vphs-card border-vphs-border shadow-2xl';
  const themeHeaderBg = isLight ? 'bg-gradient-to-r from-white via-slate-50 to-amber-50/50 border-slate-200 shadow-lg' : 'bg-gradient-to-r from-vphs-card via-[#121e3d] to-vphs-cardLight border-vphs-border shadow-2xl';
  const themeInput = isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-sm' : 'bg-slate-900 border-vphs-border text-white focus:border-amber-500';
  const themeSubCard = isLight ? 'bg-slate-50/90 border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800';
  const themeTextPrimary = isLight ? 'text-slate-900' : 'text-white';
  const themeTextMuted = isLight ? 'text-slate-500' : 'text-slate-400';
  const themeLabel = isLight ? 'text-slate-700 font-semibold' : 'text-slate-300 font-semibold';
  const themeBorder = isLight ? 'border-slate-200' : 'border-vphs-border';

  return (
    <div className={`space-y-6 max-w-5xl mx-auto pb-12 transition-colors duration-200 ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>
      {/* Wizard Header */}
      <div className={`border rounded-3xl p-6 ${themeHeaderBg}`}>
        <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b ${themeBorder}`}>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                Enterprise HR Workforce Management
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isLight ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
              }`}>
                📁 Upload & ✏️ Manual Edit Enabled on Every Page
              </span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2 ${themeTextPrimary}`}>
              <Sparkles className="w-6 h-6 text-amber-500" /> Complete 6-Step Employee Onboarding Wizard
            </h1>
            <p className={`text-xs mt-1 ${themeTextMuted}`}>
              Every step supports mandatory file uploads, digital attachments, and full manual edit / override controls.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border font-mono ${
              isLight ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-slate-950 text-amber-400 border-slate-800'
            }`}>
              Step {currentStep} of 6
            </span>
            <button
              onClick={onCancel}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>

        {/* 6 Step Progress Navigation Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-5">
          {stepTitles.map(step => (
            <button
              key={step.num}
              onClick={() => setCurrentStep(step.num)}
              className={`p-3 rounded-2xl border text-left transition-all ${
                currentStep === step.num
                  ? isLight
                    ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-md shadow-amber-500/10 font-bold ring-2 ring-amber-400/30'
                    : 'bg-amber-500/15 border-amber-400 text-amber-400 shadow-lg shadow-amber-500/10 font-bold'
                  : currentStep > step.num
                  ? isLight
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-800'
                    : 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400'
                  : isLight
                  ? 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                <span className={currentStep === step.num ? (isLight ? 'text-amber-700 font-extrabold' : 'text-amber-400') : 'text-slate-400'}>
                  0{step.num}
                </span>
                {currentStep > step.num ? (
                  <CheckCircle2 className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                ) : (
                  step.icon
                )}
              </div>
              <span className={`text-xs block font-bold truncate ${
                currentStep === step.num ? (isLight ? 'text-slate-900' : 'text-white') : (isLight ? 'text-slate-700' : 'text-slate-300')
              }`}>
                {step.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* STEP CONTAINER */}
      <div className={`border rounded-3xl p-6 sm:p-8 space-y-6 ${themeCardBg}`}>
        
        {/* ========================================================= */}
        {/* PAGE 1: PERSONAL INFORMATION */}
        {/* ========================================================= */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200 text-xs">
            <div className={`border-b pb-3 flex justify-between items-center ${themeBorder}`}>
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${themeTextPrimary}`}>
                  <User className="w-4 h-4 text-amber-500" /> Page 1 — Personal & Contact Information
                </h3>
                <p className={`text-[11px] ${themeTextMuted}`}>Legal identity, emergency contacts, addresses, profile photograph & signature uploads.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                  isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  <Edit3 className="w-3 h-3" /> Manual Edit Enabled
                </span>
                <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${isLight ? 'bg-amber-100 text-amber-900' : 'text-amber-400'}`}>* Mandatory</span>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={`block mb-1 ${themeLabel}`}>First Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh"
                  value={personalInfo.firstName}
                  onChange={e => setPersonalInfo({ ...personalInfo, firstName: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-semibold ${themeInput}`}
                />
              </div>
              <div>
                <label className={`block mb-1 ${themeLabel}`}>Middle Name</label>
                <input
                  type="text"
                  placeholder="e.g. Kumar"
                  value={personalInfo.middleName}
                  onChange={e => setPersonalInfo({ ...personalInfo, middleName: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 text-xs ${themeInput}`}
                />
              </div>
              <div>
                <label className={`block mb-1 ${themeLabel}`}>Last Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Choudhary"
                  value={personalInfo.lastName}
                  onChange={e => setPersonalInfo({ ...personalInfo, lastName: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-semibold ${themeInput}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={`block mb-1 ${themeLabel}`}>Father's / Guardian's Name</label>
                <input
                  type="text"
                  placeholder="e.g. S. Choudhary"
                  value={personalInfo.fatherName}
                  onChange={e => setPersonalInfo({ ...personalInfo, fatherName: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 text-xs ${themeInput}`}
                />
              </div>
              <div>
                <label className={`block mb-1 ${themeLabel}`}>Gender *</label>
                <select
                  value={personalInfo.gender}
                  onChange={e => setPersonalInfo({ ...personalInfo, gender: e.target.value as any })}
                  className={`w-full rounded-xl px-3 py-2 text-xs ${themeInput}`}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className={`block mb-1 ${themeLabel}`}>Date of Birth *</label>
                <input
                  type="date"
                  value={personalInfo.dob}
                  onChange={e => setPersonalInfo({ ...personalInfo, dob: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 text-xs ${themeInput}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={`block mb-1 ${themeLabel}`}>Primary Mobile Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="10-digit mobile"
                  value={personalInfo.mobile}
                  onChange={e => setPersonalInfo({ ...personalInfo, mobile: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-mono font-semibold ${themeInput}`}
                />
              </div>
              <div>
                <label className={`block mb-1 ${themeLabel}`}>Alternate Mobile Number</label>
                <input
                  type="tel"
                  placeholder="Optional alternate"
                  value={personalInfo.alternateMobile}
                  onChange={e => setPersonalInfo({ ...personalInfo, alternateMobile: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${themeInput}`}
                />
              </div>
              <div>
                <label className={`block mb-1 ${themeLabel}`}>Emergency Contact Number</label>
                <input
                  type="tel"
                  placeholder="Emergency phone"
                  value={personalInfo.emergencyContact}
                  onChange={e => setPersonalInfo({ ...personalInfo, emergencyContact: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${themeInput}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block mb-1 ${themeLabel}`}>Personal Email Address</label>
                <input
                  type="email"
                  placeholder="personal@email.com"
                  value={personalInfo.email}
                  onChange={e => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 text-xs ${themeInput}`}
                />
              </div>
              <div>
                <label className={`block mb-1 ${themeLabel}`}>Official Company Email</label>
                <input
                  type="email"
                  placeholder="employee@vphs.in"
                  value={personalInfo.officialEmail}
                  onChange={e => setPersonalInfo({ ...personalInfo, officialEmail: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 text-xs ${themeInput}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className={`block mb-1 ${themeLabel}`}>Current Residential Address</label>
                <textarea
                  rows={2}
                  placeholder="Street, Landmark, Apartment, Hyderabad"
                  value={personalInfo.currentAddress}
                  onChange={e => setPersonalInfo({ ...personalInfo, currentAddress: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 text-xs ${themeInput}`}
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className={themeLabel}>Permanent Address</label>
                  <label className={`flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                    <input
                      type="checkbox"
                      checked={personalInfo.sameAsCurrentAddress}
                      onChange={e => setPersonalInfo({ ...personalInfo, sameAsCurrentAddress: e.target.checked })}
                      className="accent-amber-500"
                    />
                    Same as Current
                  </label>
                </div>
                <textarea
                  rows={2}
                  disabled={personalInfo.sameAsCurrentAddress}
                  placeholder={personalInfo.sameAsCurrentAddress ? 'Same as current address' : 'Permanent native address'}
                  value={personalInfo.sameAsCurrentAddress ? personalInfo.currentAddress : personalInfo.permanentAddress}
                  onChange={e => setPersonalInfo({ ...personalInfo, permanentAddress: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 text-xs disabled:opacity-60 ${themeInput}`}
                />
              </div>
            </div>

            {/* PAGE 1: UPLOAD FILES SECTION */}
            <div className={`mt-4 p-4 rounded-2xl border ${themeSubCard}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`font-bold uppercase text-[11px] flex items-center gap-1.5 ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                  <Upload className="w-3.5 h-3.5" /> Page 1 Mandatory Uploads (Photo, Signature & Address Proof)
                </span>
                <span className="text-[10px] text-slate-400">JPG, PNG, PDF up to 10MB</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Photo Upload */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                  <span className="font-semibold text-slate-800 text-[11px] block">1. Passport Photo *</span>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {photoDataUrl && (
                        <img src={photoDataUrl} alt="Preview" className="w-6 h-6 rounded-md object-cover border border-amber-400 flex-shrink-0" />
                      )}
                      <span className="text-[11px] font-mono text-slate-600 truncate">
                        {page1Files.photo || 'No file chosen'}
                      </span>
                    </div>
                    <label className="cursor-pointer px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] rounded-lg shadow-sm flex items-center gap-1 flex-shrink-0">
                      <Camera className="w-3 h-3" /> Browse
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) {
                              showToast('Passport Photo must be under 10MB', 'error');
                              return;
                            }
                            setPage1Files(prev => ({ ...prev, photo: file.name }));
                            const reader = new FileReader();
                            reader.onload = () => {
                              setPhotoDataUrl(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                            showToast('Passport Photo attached successfully', 'success');
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Signature Upload */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                  <span className="font-semibold text-slate-800 text-[11px] block">2. Specimen Signature *</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-slate-600 truncate">
                      {page1Files.signature || 'No file chosen'}
                    </span>
                    <label className="cursor-pointer px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] rounded-lg shadow-sm flex items-center gap-1">
                      <Upload className="w-3 h-3" /> Browse
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={e => {
                          if (e.target.files?.[0]) {
                            setPage1Files({ ...page1Files, signature: e.target.files[0].name });
                            showToast('Specimen Signature attached successfully', 'success');
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Address Proof */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                  <span className="font-semibold text-slate-800 text-[11px] block">3. Address Proof Copy</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-slate-600 truncate">
                      {page1Files.idProof || 'No file chosen'}
                    </span>
                    <label className="cursor-pointer px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] rounded-lg shadow-sm flex items-center gap-1">
                      <FileCheck className="w-3 h-3" /> Browse
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={e => {
                          if (e.target.files?.[0]) {
                            setPage1Files({ ...page1Files, idProof: e.target.files[0].name });
                            showToast('Address proof attached successfully', 'success');
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PAGE 2: PROFESSIONAL EXPERIENCE */}
        {/* ========================================================= */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-in fade-in duration-200 text-xs">
            <div className={`border-b pb-3 flex justify-between items-center ${themeBorder}`}>
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${themeTextPrimary}`}>
                  <Briefcase className="w-4 h-4 text-cyan-600" /> Page 2 — Professional Background & Work History
                </h3>
                <p className={`text-[11px] ${themeTextMuted}`}>Prior organization details, experience certificate uploads, offer letter uploads, and resume.</p>
              </div>

              {/* Fresher Toggle */}
              <div className={`flex p-1 rounded-xl border text-xs ${isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-900 border-vphs-border'}`}>
                <button
                  type="button"
                  onClick={() => setIsFresher(false)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    !isFresher
                      ? isLight ? 'bg-white text-cyan-900 shadow-sm border border-slate-200' : 'bg-cyan-500 text-slate-950 shadow'
                      : 'text-slate-500'
                  }`}
                >
                  Experienced Candidate
                </button>
                <button
                  type="button"
                  onClick={() => setIsFresher(true)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    isFresher
                      ? isLight ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-500 text-slate-950 shadow'
                      : 'text-slate-500'
                  }`}
                >
                  Fresher / First Job
                </button>
              </div>
            </div>

            {/* Resume Upload Box (Applies to all) */}
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${themeSubCard}`}>
              <div>
                <span className={`font-bold ${themeTextPrimary} block`}>📄 Upload Updated Resume / Curriculum Vitae (CV)</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Attached: {resumeFileName || 'No resume file attached'}
                </span>
              </div>
              <label className="cursor-pointer px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-colors">
                <Upload className="w-3.5 h-3.5" /> Upload Resume (PDF/DOCX)
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files?.[0]) {
                      setResumeFileName(e.target.files[0].name);
                      showToast('Resume uploaded successfully', 'success');
                    }
                  }}
                />
              </label>
            </div>

            {isFresher ? (
              <div className={`p-12 text-center rounded-2xl border border-dashed space-y-2 ${isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-900/40 border-slate-800'}`}>
                <Sparkles className="w-10 h-10 mx-auto text-emerald-600" />
                <h4 className={`text-sm font-bold ${themeTextPrimary}`}>Fresher Profile Selected</h4>
                <p className={`text-xs max-w-sm mx-auto ${themeTextMuted}`}>
                  No prior experience records required. You can proceed directly to upload educational documents in Step 3.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {experiences.map((exp, idx) => (
                  <div key={idx} className={`p-4 rounded-2xl border space-y-3 relative ${themeSubCard}`}>
                    <div className="flex justify-between items-center">
                      <span className={`font-bold uppercase text-[11px] flex items-center gap-1.5 ${isLight ? 'text-cyan-800' : 'text-cyan-400'}`}>
                        <Edit3 className="w-3.5 h-3.5" /> Employment Record #{idx + 1} (Editable)
                      </span>
                      {experiences.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setExperiences(experiences.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className={`block mb-1 ${themeLabel}`}>Previous Company Name</label>
                        <input
                          type="text"
                          placeholder="e.g. G4S Secure Solutions"
                          value={exp.companyName}
                          onChange={e => {
                            const copy = [...experiences];
                            copy[idx].companyName = e.target.value;
                            setExperiences(copy);
                          }}
                          className={`w-full rounded-xl px-3 py-2 ${themeInput}`}
                        />
                      </div>
                      <div>
                        <label className={`block mb-1 ${themeLabel}`}>Designation Held</label>
                        <input
                          type="text"
                          placeholder="e.g. Facility Executive"
                          value={exp.designation}
                          onChange={e => {
                            const copy = [...experiences];
                            copy[idx].designation = e.target.value;
                            setExperiences(copy);
                          }}
                          className={`w-full rounded-xl px-3 py-2 ${themeInput}`}
                        />
                      </div>
                      <div>
                        <label className={`block mb-1 ${themeLabel}`}>Previous Department</label>
                        <input
                          type="text"
                          placeholder="Operations / Security"
                          value={exp.department}
                          onChange={e => {
                            const copy = [...experiences];
                            copy[idx].department = e.target.value;
                            setExperiences(copy);
                          }}
                          className={`w-full rounded-xl px-3 py-2 ${themeInput}`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className={`block mb-1 ${themeLabel}`}>Date of Joining</label>
                        <input
                          type="date"
                          value={exp.dateOfJoining}
                          onChange={e => {
                            const copy = [...experiences];
                            copy[idx].dateOfJoining = e.target.value;
                            setExperiences(copy);
                          }}
                          className={`w-full rounded-xl px-3 py-2 ${themeInput}`}
                        />
                      </div>
                      <div>
                        <label className={`block mb-1 ${themeLabel}`}>Date of Leaving</label>
                        <input
                          type="date"
                          value={exp.dateOfLeaving}
                          onChange={e => {
                            const copy = [...experiences];
                            copy[idx].dateOfLeaving = e.target.value;
                            setExperiences(copy);
                          }}
                          className={`w-full rounded-xl px-3 py-2 ${themeInput}`}
                        />
                      </div>
                      <div>
                        <label className={`block mb-1 ${themeLabel}`}>Previous CTC (₹ / Mo)</label>
                        <input
                          type="number"
                          value={exp.previousSalary}
                          onChange={e => {
                            const copy = [...experiences];
                            copy[idx].previousSalary = parseFloat(e.target.value) || 0;
                            setExperiences(copy);
                          }}
                          className={`w-full rounded-xl px-3 py-2 font-mono ${themeInput}`}
                        />
                      </div>
                      <div>
                        <label className={`block mb-1 ${themeLabel}`}>Reason for Leaving</label>
                        <input
                          type="text"
                          placeholder="e.g. Higher compensation"
                          value={exp.reasonForLeaving}
                          onChange={e => {
                            const copy = [...experiences];
                            copy[idx].reasonForLeaving = e.target.value;
                            setExperiences(copy);
                          }}
                          className={`w-full rounded-xl px-3 py-2 ${themeInput}`}
                        />
                      </div>
                    </div>

                    {/* Files for this experience item */}
                    <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                        <div className="truncate pr-2">
                          <span className="text-[10px] font-bold text-slate-500 block">Experience Certificate:</span>
                          <span className="text-xs font-mono text-slate-800 truncate block">
                            {exp.expCertificateName || 'No certificate attached'}
                          </span>
                        </div>
                        <label className="cursor-pointer px-2.5 py-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-[10px] rounded-lg shadow-sm flex items-center gap-1 flex-shrink-0">
                          <Upload className="w-3 h-3" /> Upload
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            className="hidden"
                            onChange={e => {
                              if (e.target.files?.[0]) {
                                const copy = [...experiences];
                                copy[idx].expCertificateName = e.target.files[0].name;
                                setExperiences(copy);
                                showToast('Experience certificate attached', 'success');
                              }
                            }}
                          />
                        </label>
                      </div>

                      <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                        <div className="truncate pr-2">
                          <span className="text-[10px] font-bold text-slate-500 block">Appointment / Offer Letter:</span>
                          <span className="text-xs font-mono text-slate-800 truncate block">
                            {exp.offerLetterName || 'No offer letter attached'}
                          </span>
                        </div>
                        <label className="cursor-pointer px-2.5 py-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-[10px] rounded-lg shadow-sm flex items-center gap-1 flex-shrink-0">
                          <Upload className="w-3 h-3" /> Upload
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            className="hidden"
                            onChange={e => {
                              if (e.target.files?.[0]) {
                                const copy = [...experiences];
                                copy[idx].offerLetterName = e.target.files[0].name;
                                setExperiences(copy);
                                showToast('Offer letter attached', 'success');
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setExperiences([...experiences, {
                    companyName: '',
                    designation: '',
                    department: '',
                    dateOfJoining: '2020-01-01',
                    dateOfLeaving: '2023-01-01',
                    totalExperience: '3 Years',
                    previousSalary: 18000,
                    reasonForLeaving: 'Relocation',
                    expCertificateName: null,
                    offerLetterName: null,
                  }])}
                  className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 border transition-colors ${
                    isLight ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-300' : 'bg-slate-900 hover:bg-slate-800 text-cyan-400 border-cyan-500/30'
                  }`}
                >
                  <Plus className="w-4 h-4" /> Add Another Experience Record
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* PAGE 3: EMPLOYEE DOCUMENTS & KYC */}
        {/* ========================================================= */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-in fade-in duration-200 text-xs">
            <div className={`border-b pb-3 flex justify-between items-center ${themeBorder}`}>
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${themeTextPrimary}`}>
                  <FolderLock className="w-4 h-4 text-purple-600" /> Page 3 — Statutory Documents Vault & KYC Verification
                </h3>
                <p className={`text-[11px] ${themeTextMuted}`}>Each document supports direct ID editing, Upload, View, Replace, Delete, and Verification status.</p>
              </div>
              <span className={`font-mono text-[11px] font-bold ${isLight ? 'text-purple-700' : 'text-purple-400'}`}>PDF, PNG, JPG Supported</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {documentsState.map((doc, idx) => (
                <div key={doc.type} className={`p-3.5 rounded-2xl border space-y-2.5 ${themeSubCard}`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-bold text-sm ${themeTextPrimary}`}>{doc.name}</span>
                    
                    {/* Verification Status Selector (Manual Edit) */}
                    <select
                      value={doc.status}
                      onChange={e => {
                        const copy = [...documentsState];
                        copy[idx].status = e.target.value;
                        setDocumentsState(copy);
                        showToast(`${doc.name} status updated to ${e.target.value}`, 'info');
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                        doc.status === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : doc.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}
                    >
                      <option value="VERIFIED">VERIFIED</option>
                      <option value="PENDING">PENDING</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>

                  {/* Document Number Input */}
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Document Number / ID:</label>
                    <input
                      type="text"
                      placeholder={`Enter ${doc.name} Number`}
                      value={doc.number}
                      onChange={e => {
                        const copy = [...documentsState];
                        copy[idx].number = e.target.value;
                        setDocumentsState(copy);
                      }}
                      className={`w-full rounded-xl px-3 py-1.5 font-mono text-xs uppercase ${themeInput}`}
                    />
                  </div>

                  {/* Attached File Bar with Upload / Replace / Delete / View */}
                  <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-2 text-xs">
                    <div className="flex items-center gap-1.5 truncate max-w-[55%]">
                      <FileText className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                      <span className="font-mono text-[11px] text-slate-700 truncate">
                        {doc.fileName || 'No file attached'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {doc.fileName && (
                        <button
                          type="button"
                          onClick={() => showToast(`Opening ${doc.fileName} preview`, 'info')}
                          className="p-1 text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg"
                          title="View Document"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <label className="cursor-pointer px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] rounded-lg shadow-sm flex items-center gap-1">
                        <Upload className="w-3 h-3" /> {doc.fileName ? 'Replace' : 'Upload'}
                        <input
                          type="file"
                          className="hidden"
                          onChange={e => {
                            if (e.target.files?.[0]) {
                              const copy = [...documentsState];
                              copy[idx].fileName = e.target.files[0].name;
                              copy[idx].status = 'VERIFIED';
                              setDocumentsState(copy);
                              showToast(`${doc.name} uploaded and attached`, 'success');
                            }
                          }}
                        />
                      </label>

                      {doc.fileName && (
                        <button
                          type="button"
                          onClick={() => {
                            const copy = [...documentsState];
                            copy[idx].fileName = null;
                            copy[idx].status = 'PENDING';
                            setDocumentsState(copy);
                            showToast(`${doc.name} file removed`, 'info');
                          }}
                          className="p-1 text-rose-500 hover:text-rose-700 bg-rose-50 rounded-lg"
                          title="Delete File"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PAGE 4: DESIGNATION & SITE ALLOCATION */}
        {/* ========================================================= */}
        {currentStep === 4 && (
          <div className="space-y-5 animate-in fade-in duration-200 text-xs">
            <div className={`border-b pb-3 flex justify-between items-center ${themeBorder}`}>
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${themeTextPrimary}`}>
                  <Building2 className="w-4 h-4 text-emerald-600" /> Page 4 — Designation, Client Site & Shift Allocation
                </h3>
                <p className={`text-[11px] ${themeTextMuted}`}>Assign workforce to corporate client facilities, shift rosters, and upload allocation orders.</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                <Edit3 className="w-3 h-3" /> Manual Overrides Enabled
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={`block mb-1 ${themeLabel}`}>Employee ID * (Manual / Auto)</label>
                <input
                  type="text"
                  required
                  value={allocation.employeeId}
                  onChange={e => setAllocation({ ...allocation, employeeId: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 font-bold font-mono text-sm ${
                    isLight ? 'bg-amber-50 text-amber-900 border-amber-300' : 'bg-slate-900 text-amber-400 border-vphs-border'
                  }`}
                />
              </div>

              <div>
                <label className={`block mb-1 ${themeLabel}`}>Department *</label>
                <select
                  value={allocation.departmentId}
                  onChange={e => setAllocation({ ...allocation, departmentId: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 ${themeInput}`}
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block mb-1 ${themeLabel}`}>Designation *</label>
                <select
                  value={allocation.designationId}
                  onChange={e => setAllocation({ ...allocation, designationId: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 ${themeInput}`}
                >
                  {designations.map(d => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={`block mb-1 ${themeLabel}`}>Assigned Client Site *</label>
                <select
                  value={allocation.siteId}
                  onChange={e => setAllocation({ ...allocation, siteId: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 font-semibold ${
                    isLight ? 'bg-cyan-50 text-cyan-950 border-cyan-300' : 'bg-slate-900 text-cyan-300 border-vphs-border'
                  }`}
                >
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>{s.siteName} ({s.clientName})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block mb-1 ${themeLabel}`}>Shift Schedule *</label>
                <select
                  value={allocation.shiftId}
                  onChange={e => setAllocation({ ...allocation, shiftId: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 ${themeInput}`}
                >
                  {shifts.map(sh => (
                    <option key={sh.id} value={sh.id}>{sh.name} ({sh.startTime} - {sh.endTime})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block mb-1 ${themeLabel}`}>Reporting Manager / Supervisor</label>
                <select
                  value={allocation.reportingManagerId}
                  onChange={e => setAllocation({ ...allocation, reportingManagerId: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 ${themeInput}`}
                >
                  <option value="">None / Operations Admin</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={`block mb-1 ${themeLabel}`}>Employment Type</label>
                <select
                  value={allocation.employmentType}
                  onChange={e => setAllocation({ ...allocation, employmentType: e.target.value as any })}
                  className={`w-full rounded-xl px-3 py-2 ${themeInput}`}
                >
                  <option value="FULL_TIME">Full Time (Regular)</option>
                  <option value="CONTRACT">Contract Basis</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="TEMPORARY">Temporary / Seasonal</option>
                </select>
              </div>

              <div>
                <label className={`block mb-1 ${themeLabel}`}>Employee Status</label>
                <select
                  value={allocation.status}
                  onChange={e => setAllocation({ ...allocation, status: e.target.value as any })}
                  className={`w-full rounded-xl px-3 py-2 ${themeInput}`}
                >
                  <option value="ACTIVE">Active (On Duty)</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ON_LEAVE">On Leave</option>
                </select>
              </div>

              <div>
                <label className={`block mb-1 ${themeLabel}`}>Date of Joining</label>
                <input
                  type="date"
                  value={allocation.joiningDate}
                  onChange={e => setAllocation({ ...allocation, joiningDate: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 ${themeInput}`}
                />
              </div>
            </div>

            {/* PAGE 4: UPLOADS */}
            <div className={`mt-4 p-4 rounded-2xl border ${themeSubCard}`}>
              <span className={`font-bold uppercase text-[11px] block mb-3 flex items-center gap-1.5 ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>
                <Upload className="w-3.5 h-3.5" /> Page 4 Required Uploads (Site Allocation Letter & Shift Order)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                  <span className="font-semibold text-slate-800 text-[11px] block">1. Client Site Allocation Letter</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-slate-600 truncate">
                      {page4Files.siteAllocationLetter || 'No letter attached'}
                    </span>
                    <label className="cursor-pointer px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-sm flex items-center gap-1">
                      <Upload className="w-3 h-3" /> Browse
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={e => {
                          if (e.target.files?.[0]) {
                            setPage4Files({ ...page4Files, siteAllocationLetter: e.target.files[0].name });
                            showToast('Site Allocation Letter attached', 'success');
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                  <span className="font-semibold text-slate-800 text-[11px] block">2. Shift Roster Assignment Order</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-slate-600 truncate">
                      {page4Files.shiftRosterOrder || 'No roster order attached'}
                    </span>
                    <label className="cursor-pointer px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-sm flex items-center gap-1">
                      <Upload className="w-3 h-3" /> Browse
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={e => {
                          if (e.target.files?.[0]) {
                            setPage4Files({ ...page4Files, shiftRosterOrder: e.target.files[0].name });
                            showToast('Shift Roster Order attached', 'success');
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PAGE 5: SALARY STRUCTURE & CTC BREAKUP */}
        {/* ========================================================= */}
        {currentStep === 5 && (
          <div className="space-y-5 animate-in fade-in duration-200 text-xs">
            <div className={`border-b pb-3 flex justify-between items-center ${themeBorder}`}>
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${themeTextPrimary}`}>
                  <Receipt className="w-4 h-4 text-amber-500" /> Page 5 — Salary Structure, Allowances & CTC Breakdown
                </h3>
                <p className={`text-[11px] ${themeTextMuted}`}>Auto statutory formulas or manual override for Basic, HRA, PF, ESI, and signed salary agreement upload.</p>
              </div>

              <div className={`flex p-1 rounded-xl border text-xs ${isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-900 border-vphs-border'}`}>
                <button
                  type="button"
                  onClick={() => {
                    setSalaryMode('AUTO');
                    updateSalaryByCtc(salaryConfig.salaryCtc);
                    showToast('Auto Calculation Mode activated', 'info');
                  }}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    salaryMode === 'AUTO'
                      ? isLight ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-500'
                  }`}
                >
                  ⚡ Auto Formulas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSalaryMode('MANUAL');
                    showToast('Manual Edit Mode activated for all salary components', 'info');
                  }}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    salaryMode === 'MANUAL'
                      ? isLight ? 'bg-cyan-600 text-white shadow-sm' : 'bg-cyan-500 text-slate-950 shadow'
                      : 'text-slate-500'
                  }`}
                >
                  ✏️ Manual Override
                </button>
              </div>
            </div>

            {/* Target CTC Input */}
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
              isLight ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-900/60 border-slate-800'
            }`}>
              <div className="flex items-center gap-3">
                <span className={`font-bold ${themeTextPrimary}`}>Monthly CTC (₹):</span>
                <input
                  type="number"
                  step="500"
                  value={salaryConfig.salaryCtc}
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    if (salaryMode === 'AUTO') updateSalaryByCtc(val);
                    else setSalaryConfig({ ...salaryConfig, salaryCtc: val });
                  }}
                  className={`w-36 rounded-xl px-3 py-1.5 font-mono font-extrabold text-sm ${
                    isLight ? 'bg-white border-slate-300 text-amber-700 shadow-sm' : 'bg-slate-950 border-slate-700 text-amber-400'
                  }`}
                />
              </div>

              <div className="flex items-center gap-4 font-mono text-xs">
                <span className={themeTextMuted}>Annual CTC: <strong className={themeTextPrimary}>{formatCurrency(salaryConfig.salaryCtc * 12)}</strong></span>
                <span className={themeTextMuted}>In-Hand: <strong className="text-emerald-600">{formatCurrency(salaryConfig.netSalary)}</strong></span>
              </div>
            </div>

            {/* Earnings vs Deductions Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Earnings */}
              <div className={`p-4 rounded-2xl border space-y-2.5 ${themeSubCard}`}>
                <span className={`font-bold uppercase text-[11px] block pb-1 border-b ${
                  isLight ? 'text-cyan-800 border-slate-200' : 'text-cyan-400 border-slate-800'
                }`}>
                  Fixed Earnings (Gross Components)
                </span>

                <div className="flex justify-between items-center">
                  <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Basic Salary:</span>
                  <input
                    type="number"
                    disabled={salaryMode === 'AUTO'}
                    value={salaryConfig.basic}
                    onChange={e => setSalaryConfig({ ...salaryConfig, basic: parseFloat(e.target.value) || 0 })}
                    className={`w-28 rounded-lg px-2 py-1 text-right font-mono disabled:opacity-75 ${themeInput}`}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>House Rent Allowance (HRA):</span>
                  <input
                    type="number"
                    disabled={salaryMode === 'AUTO'}
                    value={salaryConfig.hra}
                    onChange={e => setSalaryConfig({ ...salaryConfig, hra: parseFloat(e.target.value) || 0 })}
                    className={`w-28 rounded-lg px-2 py-1 text-right font-mono disabled:opacity-75 ${themeInput}`}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Conveyance Allowance:</span>
                  <input
                    type="number"
                    disabled={salaryMode === 'AUTO'}
                    value={salaryConfig.conveyance}
                    onChange={e => setSalaryConfig({ ...salaryConfig, conveyance: parseFloat(e.target.value) || 0 })}
                    className={`w-28 rounded-lg px-2 py-1 text-right font-mono disabled:opacity-75 ${themeInput}`}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Medical Allowance:</span>
                  <input
                    type="number"
                    disabled={salaryMode === 'AUTO'}
                    value={salaryConfig.medicalAllowance}
                    onChange={e => setSalaryConfig({ ...salaryConfig, medicalAllowance: parseFloat(e.target.value) || 0 })}
                    className={`w-28 rounded-lg px-2 py-1 text-right font-mono disabled:opacity-75 ${themeInput}`}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Special Allowance:</span>
                  <input
                    type="number"
                    disabled={salaryMode === 'AUTO'}
                    value={salaryConfig.specialAllowance}
                    onChange={e => setSalaryConfig({ ...salaryConfig, specialAllowance: parseFloat(e.target.value) || 0 })}
                    className={`w-28 rounded-lg px-2 py-1 text-right font-mono font-bold disabled:opacity-75 ${
                      isLight ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-slate-950 border-slate-800 text-amber-400'
                    }`}
                  />
                </div>

                <div className={`flex justify-between items-center pt-2 border-t font-bold ${
                  isLight ? 'border-slate-200 text-cyan-900' : 'border-slate-800 text-cyan-300'
                }`}>
                  <span>Gross Monthly Salary (A):</span>
                  <span className="font-mono text-sm">{formatCurrency(salaryConfig.grossSalary)}</span>
                </div>
              </div>

              {/* Deductions & Employer Benefit */}
              <div className={`p-4 rounded-2xl border space-y-2.5 ${themeSubCard}`}>
                <span className={`font-bold uppercase text-[11px] block pb-1 border-b ${
                  isLight ? 'text-rose-800 border-slate-200' : 'text-rose-400 border-slate-800'
                }`}>
                  Statutory Deductions (From Gross)
                </span>

                <div className="flex justify-between items-center">
                  <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Employee EPF (12%):</span>
                  <input
                    type="number"
                    disabled={salaryMode === 'AUTO'}
                    value={salaryConfig.employeePf}
                    onChange={e => setSalaryConfig({ ...salaryConfig, employeePf: parseFloat(e.target.value) || 0 })}
                    className={`w-28 rounded-lg px-2 py-1 text-right font-mono text-rose-600 disabled:opacity-75 ${themeInput}`}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Employee ESI (0.75%):</span>
                  <input
                    type="number"
                    disabled={salaryMode === 'AUTO'}
                    value={salaryConfig.employeeEsi}
                    onChange={e => setSalaryConfig({ ...salaryConfig, employeeEsi: parseFloat(e.target.value) || 0 })}
                    className={`w-28 rounded-lg px-2 py-1 text-right font-mono text-rose-600 disabled:opacity-75 ${themeInput}`}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Professional Tax (PT):</span>
                  <input
                    type="number"
                    disabled={salaryMode === 'AUTO'}
                    value={salaryConfig.professionalTax}
                    onChange={e => setSalaryConfig({ ...salaryConfig, professionalTax: parseFloat(e.target.value) || 0 })}
                    className={`w-28 rounded-lg px-2 py-1 text-right font-mono text-rose-600 disabled:opacity-75 ${themeInput}`}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Employer Cost (EPF+Gratuity):</span>
                  <span className="font-mono text-purple-600 font-semibold">{formatCurrency(salaryConfig.employerPf + salaryConfig.gratuity + salaryConfig.insuranceBenefit)}</span>
                </div>

                <div className={`flex justify-between items-center pt-2 border-t font-bold ${
                  isLight ? 'border-slate-200 text-emerald-700' : 'border-slate-800 text-emerald-400'
                }`}>
                  <span>Net Take-Home Salary:</span>
                  <span className="font-mono text-sm">{formatCurrency(salaryConfig.netSalary)}</span>
                </div>
              </div>
            </div>

            {/* PAGE 5: UPLOADS */}
            <div className={`mt-4 p-4 rounded-2xl border ${themeSubCard}`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className={`font-bold uppercase text-[11px] block ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                    📄 Page 5 Upload: Signed Salary Structure / CTC Annexure
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Attached: {page5Files.salaryAnnexure || 'No file attached'}
                  </span>
                </div>
                <label className="cursor-pointer px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" /> Upload Annexure
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files?.[0]) {
                        setPage5Files({ ...page5Files, salaryAnnexure: e.target.files[0].name });
                        showToast('CTC Annexure attached successfully', 'success');
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PAGE 6: BANK ACCOUNT & PAYOUT DETAILS */}
        {/* ========================================================= */}
        {currentStep === 6 && (
          <div className="space-y-5 animate-in fade-in duration-200 text-xs">
            <div className={`border-b pb-3 flex justify-between items-center ${themeBorder}`}>
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${themeTextPrimary}`}>
                  <CreditCard className="w-4 h-4 text-amber-500" /> Page 6 — Bank Account, UPI & Payout Verification
                </h3>
                <p className={`text-[11px] ${themeTextMuted}`}>Direct NEFT/RTGS salary credit details, cancelled cheque upload, and verification status override.</p>
              </div>
              
              {/* Verification Status Override */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-semibold">Verification:</span>
                <select
                  value={bankDetails.verificationStatus}
                  onChange={e => setBankDetails({ ...bankDetails, verificationStatus: e.target.value as any })}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold border bg-emerald-50 text-emerald-800 border-emerald-300"
                >
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="PENDING">PENDING</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block mb-1 ${themeLabel}`}>Account Holder Full Name *</label>
                <input
                  type="text"
                  required
                  value={bankDetails.accountHolderName}
                  onChange={e => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
                  placeholder="e.g. Ramesh Kumar Choudhary"
                  className={`w-full rounded-xl px-3 py-2 font-bold ${themeInput}`}
                />
              </div>

              <div>
                <label className={`block mb-1 ${themeLabel}`}>Bank Name *</label>
                <input
                  type="text"
                  value={bankDetails.bankName}
                  onChange={e => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 ${themeInput}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block mb-1 ${themeLabel}`}>Bank Account Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 50200012345678"
                  value={bankDetails.accountNumber}
                  onChange={e => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 font-mono ${themeInput}`}
                />
              </div>

              <div>
                <label className={`block mb-1 ${themeLabel}`}>Confirm Bank Account Number *</label>
                <input
                  type="text"
                  required
                  placeholder="Re-enter to confirm"
                  value={bankDetails.confirmAccountNumber}
                  onChange={e => setBankDetails({ ...bankDetails, confirmAccountNumber: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 font-mono focus:outline-none ${
                    bankDetails.confirmAccountNumber && bankDetails.accountNumber !== bankDetails.confirmAccountNumber
                      ? 'border-rose-500 ring-1 ring-rose-500'
                      : themeInput
                  }`}
                />
                {bankDetails.confirmAccountNumber && bankDetails.accountNumber !== bankDetails.confirmAccountNumber && (
                  <span className="text-rose-600 text-[10px] block mt-1">Account numbers do not match</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={`block mb-1 ${themeLabel}`}>IFSC Code *</label>
                <input
                  type="text"
                  value={bankDetails.bankIfsc}
                  onChange={e => setBankDetails({ ...bankDetails, bankIfsc: e.target.value.toUpperCase() })}
                  className={`w-full rounded-xl px-3 py-2 font-mono uppercase font-bold ${themeInput}`}
                />
              </div>

              <div>
                <label className={`block mb-1 ${themeLabel}`}>Branch Name</label>
                <input
                  type="text"
                  value={bankDetails.bankBranch}
                  onChange={e => setBankDetails({ ...bankDetails, bankBranch: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 ${themeInput}`}
                />
              </div>

              <div>
                <label className={`block mb-1 ${themeLabel}`}>Account Type</label>
                <select
                  value={bankDetails.accountType}
                  onChange={e => setBankDetails({ ...bankDetails, accountType: e.target.value as any })}
                  className={`w-full rounded-xl px-3 py-2 ${themeInput}`}
                >
                  <option value="Savings">Savings Account</option>
                  <option value="Current">Current Account</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className={`block mb-1 ${themeLabel}`}>UPI ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. mobile@okhdfcbank"
                  value={bankDetails.upiId}
                  onChange={e => setBankDetails({ ...bankDetails, upiId: e.target.value })}
                  className={`w-full rounded-xl px-3 py-2 font-mono ${themeInput}`}
                />
              </div>

              <div>
                <label className={`block mb-1 ${themeLabel}`}>Status</label>
                <div className={`p-2 rounded-xl border flex items-center gap-2 ${
                  isLight ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  <ShieldCheck className="w-4 h-4" />
                  <span className="font-semibold text-xs">Direct NEFT/RTGS Transfer Ready</span>
                </div>
              </div>
            </div>

            {/* PAGE 6: UPLOADS */}
            <div className={`mt-4 p-4 rounded-2xl border ${themeSubCard}`}>
              <span className={`font-bold uppercase text-[11px] block mb-3 flex items-center gap-1.5 ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                <Upload className="w-3.5 h-3.5" /> Page 6 Required Uploads (Cancelled Cheque / Passbook & UPI Proof)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                  <span className="font-semibold text-slate-800 text-[11px] block">1. Cancelled Cheque / Bank Passbook *</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-slate-600 truncate">
                      {page6Files.cancelledCheque || 'No file chosen'}
                    </span>
                    <label className="cursor-pointer px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] rounded-lg shadow-sm flex items-center gap-1">
                      <Upload className="w-3 h-3" /> Browse
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={e => {
                          if (e.target.files?.[0]) {
                            setPage6Files({ ...page6Files, cancelledCheque: e.target.files[0].name });
                            showToast('Cancelled Cheque attached', 'success');
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                  <span className="font-semibold text-slate-800 text-[11px] block">2. UPI QR / Payout Verification Screenshot</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-slate-600 truncate">
                      {page6Files.upiQrProof || 'No proof attached'}
                    </span>
                    <label className="cursor-pointer px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] rounded-lg shadow-sm flex items-center gap-1">
                      <Upload className="w-3 h-3" /> Browse
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={e => {
                          if (e.target.files?.[0]) {
                            setPage6Files({ ...page6Files, upiQrProof: e.target.files[0].name });
                            showToast('UPI QR Proof attached', 'success');
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Controls Footer */}
        <div className={`pt-6 border-t flex items-center justify-between ${themeBorder}`}>
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep(currentStep - 1)}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border disabled:opacity-40 transition-colors ${
              isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <ArrowLeft className="w-4 h-4" /> Previous Step
          </button>

          <div className="flex items-center gap-3">
            {currentStep < 6 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all"
              >
                Continue to Step {currentStep + 1} <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Finalizing Onboarding...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Finalize & Onboard Employee
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
