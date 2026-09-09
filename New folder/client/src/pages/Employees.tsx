import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  User,
  Camera,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  FileSpreadsheet,
  Building2,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  CreditCard,
  Briefcase,
  FileText,
  Sparkles,
  Upload,
  FileCheck,
  AlertCircle,
  RefreshCw,
  FileUp,
  ShieldCheck,
} from 'lucide-react';
import { Employee, Department, Designation, Site, Shift } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { SkeletonTable } from '../components/common/SkeletonLoader';
import { DigitalIdCard } from '../components/idcard/DigitalIdCard';
import { SalaryStructureCalculator } from '../components/payroll/SalaryStructureCalculator';
import { EmployeeOnboardingWizard } from '../components/employee/EmployeeOnboardingWizard';
import api from '../services/api';
import { formatCurrency, formatDate, exportToExcel, exportToCsv } from '../utils/formatters';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

export const Employees: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ACTIVE');

  // Sorted employees guaranteeing ACTIVE staff are shown first
  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      const isAActive = a.status === 'ACTIVE' ? 0 : 1;
      const isBActive = b.status === 'ACTIVE' ? 0 : 1;
      if (isAActive !== isBActive) return isAActive - isBActive;
      return (a.employeeId || '').localeCompare(b.employeeId || '');
    });
  }, [employees]);

  // Modals
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isIdCardOpen, setIsIdCardOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'salary' | 'docs' | 'idcard'>('info');

  // Photo Upload & Edit State
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Permanent Batch Upload State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    successCount: number;
    failedCount: number;
    failedRecords: Array<{ rowNumber: number; data: any; reason: string }>;
  } | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState<any>({
    employeeId: '',
    firstName: '',
    lastName: '',
    photoUrl: '',
    gender: 'Male',
    dob: '',
    mobile: '',
    email: '',
    emergencyContact: '',
    emergencyContactName: '',
    address: '',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500081',
    aadhaarNumber: '',
    panNumber: '',
    joiningDate: new Date().toISOString().split('T')[0],
    departmentId: '',
    designationId: '',
    siteId: '',
    shiftId: '',
    employmentType: 'FULL_TIME',
    salaryCtc: 25000,
    bankAccountNo: '',
    bankIfsc: 'HDFC0000123',
    bankName: 'HDFC Bank',
    bankBranch: 'Madhapur',
    pfNumber: '',
    esiNumber: '',
    uanNumber: '',
    status: 'ACTIVE',
    role: 'EMPLOYEE',
  });

  useEffect(() => {
    fetchInitialData();
  }, [search, selectedDept, selectedSite, selectedStatus]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.append('limit', '300');
      if (search) queryParams.append('search', search);
      if (selectedDept) queryParams.append('departmentId', selectedDept);
      if (selectedSite) queryParams.append('siteId', selectedSite);
      if (selectedStatus) queryParams.append('status', selectedStatus);

      const [empRes, deptRes, desigRes, siteRes, shiftRes]: any = await Promise.all([
        api.get(`/employees?${queryParams.toString()}`),
        api.get('/settings'),
        api.get('/settings'),
        api.get('/sites'),
        api.get('/settings'),
      ]);

      if (empRes.success) setEmployees(empRes.data || []);
      if (deptRes.success) {
        setDepartments(deptRes.data.departments || []);
        setDesignations(desigRes.data.designations || []);
        setShifts(shiftRes.data.shifts || []);
      }
      if (siteRes.success) setSites(siteRes.data || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setSelectedEmployee(null);
    setFormData({
      employeeId: `VPHS-${String(employees.length + 1).padStart(3, '0')}`,
      firstName: '',
      lastName: '',
      photoUrl: '',
      gender: 'Male',
      dob: '1995-01-01',
      mobile: '',
      email: '',
      emergencyContact: '',
      emergencyContactName: '',
      address: '',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500081',
      aadhaarNumber: '',
      panNumber: '',
      joiningDate: new Date().toISOString().split('T')[0],
      departmentId: departments[0]?.id || '',
      designationId: designations[0]?.id || '',
      siteId: sites[0]?.id || '',
      shiftId: shifts[0]?.id || '',
      employmentType: 'FULL_TIME',
      salaryCtc: 22000,
      bankAccountNo: '',
      bankIfsc: 'HDFC0000123',
      bankName: 'HDFC Bank',
      bankBranch: 'Madhapur',
      pfNumber: '',
      esiNumber: '',
      uanNumber: '',
      status: 'ACTIVE',
      role: 'EMPLOYEE',
    });
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormData({
      employeeId: emp.employeeId,
      firstName: emp.firstName,
      lastName: emp.lastName,
      photoUrl: emp.photoUrl || '',
      gender: emp.gender,
      dob: emp.dob ? emp.dob.split('T')[0] : '',
      mobile: emp.mobile,
      email: emp.email || '',
      emergencyContact: emp.emergencyContact || '',
      emergencyContactName: emp.emergencyContactName || '',
      address: emp.address || '',
      city: emp.city || '',
      state: emp.state || '',
      pincode: emp.pincode || '',
      aadhaarNumber: emp.aadhaarNumber || '',
      panNumber: emp.panNumber || '',
      joiningDate: emp.joiningDate ? emp.joiningDate.split('T')[0] : '',
      departmentId: emp.departmentId || '',
      designationId: emp.designationId || '',
      siteId: emp.siteId || '',
      shiftId: emp.shiftId || '',
      employmentType: emp.employmentType,
      salaryCtc: emp.salaryCtc || 0,
      bankAccountNo: emp.bankAccountNo || '',
      bankIfsc: emp.bankIfsc || '',
      bankName: emp.bankName || '',
      bankBranch: emp.bankBranch || '',
      pfNumber: emp.pfNumber || '',
      esiNumber: emp.esiNumber || '',
      uanNumber: emp.uanNumber || '',
      status: emp.status,
      role: emp.user?.role || 'EMPLOYEE',
    });
    setIsAddEditOpen(true);
  };

  const handleModalPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('Photo must be less than 10MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setFormData((prev: any) => ({ ...prev, photoUrl: dataUrl }));

      if (selectedEmployee?.id) {
        setIsUploadingPhoto(true);
        try {
          const uploadData = new FormData();
          uploadData.append('photo', file);
          const res: any = await api.post(`/employees/${selectedEmployee.id}/photo`, uploadData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          if (res.success && res.data) {
            setFormData((prev: any) => ({ ...prev, photoUrl: res.data.photoUrl }));
            setSelectedEmployee(res.data);
            showToast('Employee photo updated and saved to database!', 'success');
            fetchInitialData();
          }
        } catch (err: any) {
          showToast(err.message || 'Failed to upload photo to server', 'error');
        } finally {
          setIsUploadingPhoto(false);
        }
      } else {
        showToast('Photo attached to employee profile', 'success');
      }
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const handleModalRemovePhoto = async () => {
    if (selectedEmployee?.id && formData.photoUrl) {
      setIsUploadingPhoto(true);
      try {
        const res: any = await api.delete(`/employees/${selectedEmployee.id}/photo`);
        if (res.success && res.data) {
          setFormData((prev: any) => ({ ...prev, photoUrl: '' }));
          setSelectedEmployee(res.data);
          showToast('Employee photo removed', 'info');
          fetchInitialData();
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to remove photo', 'error');
      } finally {
        setIsUploadingPhoto(false);
      }
    } else {
      setFormData((prev: any) => ({ ...prev, photoUrl: '' }));
      showToast('Photo removed', 'info');
    }
  };

  const handleViewEmployee = async (emp: Employee) => {
    try {
      const res: any = await api.get(`/employees/${emp.id}`);
      if (res.success && res.data) {
        setSelectedEmployee(res.data);
        setActiveTab('info');
        setIsViewOpen(true);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch employee details', 'error');
    }
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedEmployee) {
        // Update
        const res: any = await api.put(`/employees/${selectedEmployee.id}`, formData);
        if (res.success) {
          showToast('Employee updated and permanently saved', 'success');
          setIsAddEditOpen(false);
          fetchInitialData();
        }
      } else {
        // Create
        const res: any = await api.post('/employees', formData);
        if (res.success) {
          showToast('Employee created and permanently saved to database', 'success');
          setIsAddEditOpen(false);
          fetchInitialData();
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save employee', 'error');
    }
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to deactivate/terminate employee ${name}?`)) {
      return;
    }
    try {
      await api.delete(`/employees/${id}`);
      showToast('Employee deactivated and saved to database', 'success');
      fetchInitialData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete employee', 'error');
    }
  };

  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        'Employee ID': 'VPHS-101',
        'First Name': 'Rajesh',
        'Last Name': 'Verma',
        'Gender': 'Male',
        'Mobile': '9876543210',
        'Email': 'rajesh.verma@vphs.in',
        'Department': 'Facility Management',
        'Designation': 'Facility Executive',
        'Site': 'Microsoft Campus Gachibowli',
        'CTC': 25000,
        'Aadhaar': '5432 1098 7654',
        'PAN': 'ABCDE1234F',
        'Account No': '50200012345678',
        'IFSC': 'HDFC0000123',
      },
      {
        'Employee ID': 'VPHS-102',
        'First Name': 'Sunita',
        'Last Name': 'Rao',
        'Gender': 'Female',
        'Mobile': '9876543211',
        'Email': 'sunita.rao@vphs.in',
        'Department': 'Housekeeping Services',
        'Designation': 'Housekeeping Supervisor',
        'Site': 'Amazon Development Center',
        'CTC': 22000,
        'Aadhaar': '5432 1098 7655',
        'PAN': 'ABCDE1234G',
        'Account No': '50200012345679',
        'IFSC': 'HDFC0000123',
      },
    ];
    exportToExcel(templateRows, 'VPHS_Employee_Upload_Template');
    showToast('VPHS Employee Upload Template downloaded', 'info');
  };

  const handlePermanentUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      showToast('Please select an Excel (.xlsx / .xls) or CSV file', 'warning');
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    try {
      const data = new FormData();
      data.append('file', importFile);

      const res: any = await api.post('/import/employees', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.success && res.data) {
        setImportResult(res.data);
        showToast(`Successfully uploaded & permanently saved ${res.data.successCount} employees to database!`, 'success');
        fetchInitialData();
      }
    } catch (err: any) {
      showToast(err.message || 'Employee batch upload failed', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = (format: 'excel' | 'csv') => {
    const exportRows = sortedEmployees.map(e => ({
      'Employee ID': e.employeeId,
      'Name': `${e.firstName} ${e.lastName}`,
      'Gender': e.gender,
      'Mobile': e.mobile,
      'Email': e.email,
      'Department': e.department?.name || '',
      'Designation': e.designation?.title || '',
      'Site': e.site?.siteName || '',
      'Status': e.status,
      'Salary CTC': e.salaryCtc,
      'Aadhaar': e.aadhaarNumber,
      'PAN': e.panNumber,
      'Bank Account': e.bankAccountNo,
      'IFSC': e.bankIfsc,
      'PF Number': e.pfNumber,
      'ESI Number': e.esiNumber,
      'UAN': e.uanNumber,
      'Joining Date': formatDate(e.joiningDate),
    }));

    if (format === 'excel') exportToExcel(exportRows, 'VPHS_Employees_Directory');
    else exportToCsv(exportRows, 'VPHS_Employees_Directory');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-wide flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500" /> Employee Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Permanent employee database, batch data uploads, site allocations & statutory KYC management.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {user?.role !== 'EMPLOYEE' && (
            <>
              {/* Permanent Upload Button */}
              <button
                onClick={() => {
                  setImportFile(null);
                  setImportResult(null);
                  setIsImportModalOpen(true);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" /> Upload Employee Data (Excel)
              </button>

              <button
                onClick={() => setIsOnboardingOpen(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" /> 6-Step Onboard Employee
              </button>

              <button
                onClick={handleOpenAdd}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-amber-700" /> Quick Add
              </button>
            </>
          )}

          <button
            onClick={() => handleExport('excel')}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export Excel
          </button>
        </div>
      </div>

      {/* 6-Step Onboarding Wizard Screen */}
      {isOnboardingOpen ? (
        <EmployeeOnboardingWizard
          departments={departments}
          designations={designations}
          sites={sites}
          shifts={shifts}
          employees={employees}
          onComplete={(newEmp) => {
            setIsOnboardingOpen(false);
            fetchInitialData();
            handleViewEmployee(newEmp);
          }}
          onCancel={() => setIsOnboardingOpen(false)}
        />
      ) : (
        <>
          {/* Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by ID, name, mobile, email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
              />
            </div>

            {/* Department Filter */}
            <div>
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
              >
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Site Filter */}
            <div>
              <select
                value={selectedSite}
                onChange={e => setSelectedSite(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
              >
                <option value="">All Sites</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.siteName}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white font-semibold"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="">All Statuses (Active First)</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="ON_LEAVE">ON LEAVE</option>
                <option value="TERMINATED">TERMINATED</option>
              </select>
            </div>
          </div>

          {/* Employees Table */}
          {loading ? (
            <SkeletonTable rows={8} cols={7} />
          ) : sortedEmployees.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
              <Users className="w-12 h-12 mx-auto text-slate-400 mb-3" />
              <h3 className="text-base font-bold text-slate-800">No employees found</h3>
              <p className="text-xs mt-1">Upload employee data from Excel or click Quick Add to create a new employee.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="px-5 py-3.5">Employee</th>
                      <th className="px-4 py-3.5">Designation & Dept</th>
                      <th className="px-4 py-3.5">Assigned Site</th>
                      <th className="px-4 py-3.5">Contact</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Salary (CTC)</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {sortedEmployees.map(emp => (
                      <tr key={emp.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center font-bold text-amber-800 text-xs flex-shrink-0">
                              {emp.photoUrl ? (
                                <img src={emp.photoUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                              ) : (
                                `${emp.firstName[0]}${emp.lastName[0]}`
                              )}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block leading-tight">
                                {emp.firstName} {emp.lastName}
                              </span>
                              <span className="text-[11px] font-mono text-amber-700 font-bold">
                                {emp.employeeId}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-800">{emp.designation?.title || '-'}</div>
                          <div className="text-[11px] text-slate-500">{emp.department?.name || '-'}</div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="font-medium text-slate-800">{emp.site?.siteName || '-'}</span>
                          {emp.shift && (
                            <span className="text-[10px] text-slate-500 block">
                              {emp.shift.name} ({emp.shift.startTime} - {emp.shift.endTime})
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 font-mono text-xs">
                          <div className="flex items-center gap-1 text-slate-700">
                            <Phone className="w-3 h-3 text-slate-400" /> {emp.mobile}
                          </div>
                          {emp.email && (
                            <div className="flex items-center gap-1 text-slate-500 text-[11px] truncate max-w-[140px]">
                              <Mail className="w-3 h-3 text-slate-400" /> {emp.email}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <Badge status={emp.status} />
                        </td>

                        <td className="px-4 py-3.5 font-mono font-semibold text-slate-800">
                          {formatCurrency(emp.salaryCtc || 0)}
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleViewEmployee(emp)}
                              title="View Full Profile & KYC"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-200 transition-colors shadow-sm"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {user?.role !== 'EMPLOYEE' && (
                              <>
                                <button
                                  onClick={() => handleOpenEdit(emp)}
                                  title="Edit / Modify Employee Details"
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-200 transition-colors shadow-sm"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => handleDeleteEmployee(emp.id, `${emp.firstName} ${emp.lastName}`)}
                                  title="Deactivate / Terminate Employee"
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 border border-slate-200 transition-colors shadow-sm"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* PERMANENT EMPLOYEE DATA UPLOAD MODAL */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Upload & Permanently Save Employee Data"
        subtitle="Batch upload employees via Excel (.xlsx / .xls) or CSV. Data is permanently stored in the database."
        maxWidth="2xl"
      >
        <div className="space-y-5">
          {/* Info Banner */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
            <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">Permanent Database Storage</span>
              <p className="text-amber-800 leading-relaxed text-[11px]">
                Uploaded records are saved permanently to your SQLite database. They will persist across server restarts and page refreshes until you explicitly modify or delete them.
              </p>
            </div>
          </div>

          {/* Step 1: Download Official Template */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-slate-900 block">Need the standard spreadsheet format?</span>
              <span className="text-[11px] text-slate-500">Includes all mandatory columns: ID, Name, Mobile, Email, Dept, Site, CTC, Bank & PF.</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" /> Download Template
            </button>
          </div>

          {/* Step 2: Upload File Box */}
          <form onSubmit={handlePermanentUpload} className="space-y-4">
            <div className="p-6 border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl bg-white text-center space-y-3 transition-colors">
              <FileUp className="w-10 h-10 mx-auto text-amber-600" />
              <div>
                <span className="font-bold text-xs text-slate-900 block">
                  {importFile ? importFile.name : 'Select or Drag & Drop Employee Spreadsheet'}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">Supports .xlsx, .xls, .csv files</span>
              </div>

              <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all">
                <Upload className="w-4 h-4" /> Browse File
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files?.[0]) {
                      setImportFile(e.target.files[0]);
                      setImportResult(null);
                    }
                  }}
                />
              </label>
            </div>

            {/* Results Summary if any */}
            {importResult && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Successfully Saved: {importResult.successCount} Employees
                  </span>
                  {importResult.failedCount > 0 && (
                    <span className="text-rose-700 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> Skipped / Errors: {importResult.failedCount}
                    </span>
                  )}
                </div>

                {importResult.failedRecords?.length > 0 && (
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-200 text-[11px]">
                    {importResult.failedRecords.map((err, idx) => (
                      <div key={idx} className="py-1.5 text-rose-700 flex justify-between">
                        <span>Row {err.rowNumber}: {err.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
              >
                Close
              </button>

              <button
                type="submit"
                disabled={!importFile || isImporting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving to Database...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Commit & Permanently Save
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* QUICK ADD / EDIT EMPLOYEE MODAL */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={selectedEmployee ? `Edit Employee: ${selectedEmployee.employeeId}` : 'Onboard New Employee'}
        subtitle="Fill all required workforce, site allocation, and compliance details. Data is permanently saved."
        maxWidth="6xl"
      >
        <form onSubmit={handleSaveEmployee} className="space-y-6">
          {/* Section 1: Basic Info */}
          <div>
            <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-700" /> 1. Personal & Identity Details (Permanently Saved)
            </h4>

            {/* Profile Photo Upload & Edit Section */}
            <div className="mb-4 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <input
                type="file"
                ref={modalFileInputRef}
                accept="image/png,image/jpeg,image/webp,image/jpg"
                className="hidden"
                onChange={handleModalPhotoChange}
              />
              <div className="flex items-center gap-3.5 w-full sm:w-auto">
                <div className="relative group">
                  <div className="w-16 h-16 rounded-2xl bg-amber-100 border-2 border-amber-300 overflow-hidden flex items-center justify-center text-xl font-black text-amber-900 shadow-sm flex-shrink-0">
                    {formData.photoUrl ? (
                      <img src={formData.photoUrl} alt="Employee Preview" className="w-full h-full object-cover" />
                    ) : formData.firstName ? (
                      `${formData.firstName[0]}${formData.lastName?.[0] || ''}`
                    ) : (
                      <User className="w-8 h-8 text-amber-700" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => modalFileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    title={formData.photoUrl ? 'Change / Edit Photo' : 'Add Photo'}
                    className="absolute -bottom-1 -right-1 p-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow transition-transform hover:scale-110"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <span className="font-extrabold text-slate-900 text-xs block">
                    Employee Profile Photo
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {formData.photoUrl ? 'Photo attached (Displayed on Digital ID, Header & Directory)' : 'Upload passport / profile photo (JPG, PNG, WEBP up to 10MB)'}
                  </span>
                  {selectedEmployee && (
                    <span className="text-[10px] text-emerald-700 font-bold font-mono">
                      Auto-saved to employee database and ID card
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => modalFileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  {isUploadingPhoto ? 'Uploading...' : formData.photoUrl ? 'Change / Edit Photo' : 'Add Photo'}
                </button>
                {formData.photoUrl && (
                  <button
                    type="button"
                    onClick={handleModalRemovePhoto}
                    disabled={isUploadingPhoto}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">Employee ID *</label>
                <input
                  type="text"
                  required
                  value={formData.employeeId}
                  onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                  disabled={!!selectedEmployee}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-60 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">Gender *</label>
                <select
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={e => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">Mobile (10 Digits) *</label>
                <input
                  type="tel"
                  required
                  value={formData.mobile}
                  onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">Official Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">Aadhaar Number</label>
                <input
                  type="text"
                  placeholder="xxxx xxxx xxxx"
                  value={formData.aadhaarNumber}
                  onChange={e => setFormData({ ...formData, aadhaarNumber: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">PAN Card</label>
                <input
                  type="text"
                  placeholder="ABCDE1234F"
                  value={formData.panNumber}
                  onChange={e => setFormData({ ...formData, panNumber: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 uppercase font-mono font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Deployment & Role */}
          <div>
            <h4 className="text-xs font-black text-cyan-950 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-cyan-700" /> 2. Designation, Site & Shift Allocation
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">Department *</label>
                <select
                  value={formData.departmentId}
                  onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">Designation *</label>
                <select
                  value={formData.designationId}
                  onChange={e => setFormData({ ...formData, designationId: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                >
                  {designations.map(d => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">Assigned Client Site *</label>
                <select
                  value={formData.siteId}
                  onChange={e => setFormData({ ...formData, siteId: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                >
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>{s.siteName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">Shift Schedule *</label>
                <select
                  value={formData.shiftId}
                  onChange={e => setFormData({ ...formData, shiftId: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                >
                  {shifts.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">Employment Type</label>
                <select
                  value={formData.employmentType}
                  onChange={e => setFormData({ ...formData, employmentType: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                >
                  <option value="FULL_TIME">FULL TIME</option>
                  <option value="CONTRACT">CONTRACT</option>
                  <option value="TEMPORARY">TEMPORARY</option>
                  <option value="PART_TIME">PART TIME</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="ON_LEAVE">ON LEAVE</option>
                  <option value="TERMINATED">TERMINATED</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Salary & Bank Compliance */}
          <div>
            <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-700" /> 3. Salary & Bank Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">Monthly Salary / CTC (₹) *</label>
                <input
                  type="number"
                  required
                  value={formData.salaryCtc}
                  onChange={e => setFormData({ ...formData, salaryCtc: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">Bank Account Number</label>
                <input
                  type="text"
                  value={formData.bankAccountNo}
                  onChange={e => setFormData({ ...formData, bankAccountNo: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={formData.bankIfsc}
                  onChange={e => setFormData({ ...formData, bankIfsc: e.target.value.toUpperCase() })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono uppercase font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">PF Number</label>
                <input
                  type="text"
                  value={formData.pfNumber}
                  onChange={e => setFormData({ ...formData, pfNumber: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">ESI Number</label>
                <input
                  type="text"
                  value={formData.esiNumber}
                  onChange={e => setFormData({ ...formData, esiNumber: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddEditOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Permanently to Database
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW EMPLOYEE DRAWER */}
      {selectedEmployee && (
        <Modal
          isOpen={isViewOpen}
          onClose={() => setIsViewOpen(false)}
          title={`${selectedEmployee.firstName} ${selectedEmployee.lastName}`}
          subtitle={`Employee ID: ${selectedEmployee.employeeId} • ${selectedEmployee.designation?.title || 'Staff'}`}
          maxWidth="6xl"
        >
          <div className="space-y-6">
            {/* Nav Tabs */}
            <div className="flex border-b border-slate-200 gap-6 text-sm font-bold">
              <button
                onClick={() => setActiveTab('info')}
                className={`pb-3 transition-colors ${
                  activeTab === 'info'
                    ? 'text-amber-700 border-b-2 border-amber-500 font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Profile & Deployment
              </button>
              <button
                onClick={() => setActiveTab('salary')}
                className={`pb-3 transition-colors ${
                  activeTab === 'salary'
                    ? 'text-amber-700 border-b-2 border-amber-500 font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Salary Structure (CTC)
              </button>
              <button
                onClick={() => setActiveTab('docs')}
                className={`pb-3 transition-colors ${
                  activeTab === 'docs'
                    ? 'text-amber-700 border-b-2 border-amber-500 font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                KYC & Documents ({selectedEmployee.documents?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('idcard')}
                className={`pb-3 transition-colors ${
                  activeTab === 'idcard'
                    ? 'text-amber-700 border-b-2 border-amber-500 font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Digital ID Card
              </button>
            </div>

            {/* TAB: INFO */}
            {activeTab === 'info' && (
              <div className="space-y-5 text-xs sm:text-sm">
                {/* Employee Profile Header with Photo & Quick Actions */}
                <div className="p-5 bg-gradient-to-r from-slate-50 via-amber-50/30 to-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-5">
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-2xl bg-amber-100 border-2 border-amber-400 overflow-hidden flex items-center justify-center text-2xl font-black text-amber-900 shadow-md flex-shrink-0">
                      {selectedEmployee.photoUrl ? (
                        <img src={selectedEmployee.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        `${selectedEmployee.firstName[0]}${selectedEmployee.lastName[0]}`
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-black text-slate-900">
                          {selectedEmployee.firstName} {selectedEmployee.lastName}
                        </h3>
                        <Badge status={selectedEmployee.status} />
                      </div>
                      <span className="text-sm text-amber-800 font-bold block mt-0.5">
                        {selectedEmployee.designation?.title || 'Staff'} • {selectedEmployee.department?.name || 'Department'}
                      </span>
                      <span className="text-xs font-mono text-slate-600 mt-1 block">
                        Employee ID: <strong className="text-slate-950 font-bold">{selectedEmployee.employeeId}</strong> • Site: <strong className="text-slate-950 font-bold">{selectedEmployee.site?.siteName || 'Corporate'}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenEdit(selectedEmployee);
                        setIsViewOpen(false);
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" /> Edit Profile & Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('idcard')}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs sm:text-sm rounded-xl border border-slate-300 transition-colors flex items-center gap-2"
                    >
                      <CreditCard className="w-4 h-4 text-amber-600" /> View ID Card
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div>
                    <span className="text-[11px] text-slate-500 font-extrabold block uppercase tracking-wider">Department</span>
                    <span className="text-sm text-slate-950 font-bold mt-1 block">{selectedEmployee.department?.name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-extrabold block uppercase tracking-wider">Designation</span>
                    <span className="text-sm text-slate-950 font-bold mt-1 block">{selectedEmployee.designation?.title || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-extrabold block uppercase tracking-wider">Client Site</span>
                    <span className="text-sm text-slate-950 font-bold mt-1 block">{selectedEmployee.site?.siteName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-extrabold block uppercase tracking-wider">Shift Hours</span>
                    <span className="text-sm text-slate-950 font-bold mt-1 block">
                      {selectedEmployee.shift ? `${selectedEmployee.shift.startTime} - ${selectedEmployee.shift.endTime}` : 'Standard (09:30 - 18:30)'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <span className="font-black text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-200">
                      <Phone className="w-4 h-4 text-amber-600" /> Contact Information
                    </span>
                    <div className="flex justify-between py-1 border-b border-slate-100"><span className="text-slate-500 font-semibold">Mobile:</span><span className="font-mono font-bold text-slate-950">{selectedEmployee.mobile}</span></div>
                    <div className="flex justify-between py-1 border-b border-slate-100"><span className="text-slate-500 font-semibold">Email:</span><span className="text-slate-900 font-medium">{selectedEmployee.email || '-'}</span></div>
                    <div className="flex justify-between py-1 border-b border-slate-100"><span className="text-slate-500 font-semibold">Emergency Phone:</span><span className="font-mono font-bold text-slate-950">{selectedEmployee.emergencyContact || '-'}</span></div>
                    {selectedEmployee.emergencyContactName && (
                      <div className="flex justify-between py-1 border-b border-slate-100"><span className="text-slate-500 font-semibold">Emergency Contact:</span><span className="text-slate-900 font-semibold">{selectedEmployee.emergencyContactName}</span></div>
                    )}
                    <div className="flex justify-between py-1 border-b border-slate-100"><span className="text-slate-500 font-semibold">City / State:</span><span className="text-slate-900 font-semibold">{selectedEmployee.city}, {selectedEmployee.state}</span></div>
                    {selectedEmployee.address && (
                      <div className="flex justify-between py-1"><span className="text-slate-500 font-semibold">Residential Address:</span><span className="text-slate-900 font-medium text-right max-w-[240px]">{selectedEmployee.address}</span></div>
                    )}
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <span className="font-black text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-200">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> Compliance & Banking Details
                    </span>
                    <div className="flex justify-between py-1 border-b border-slate-100"><span className="text-slate-500 font-semibold">Aadhaar:</span><span className="font-mono font-bold text-slate-950">{selectedEmployee.aadhaarNumber || '-'}</span></div>
                    <div className="flex justify-between py-1 border-b border-slate-100"><span className="text-slate-500 font-semibold">PAN:</span><span className="font-mono font-bold text-slate-950">{selectedEmployee.panNumber || '-'}</span></div>
                    <div className="flex justify-between py-1 border-b border-slate-100"><span className="text-slate-500 font-semibold">Bank Name:</span><span className="text-slate-900 font-semibold">{selectedEmployee.bankName || '-'}</span></div>
                    <div className="flex justify-between py-1 border-b border-slate-100"><span className="text-slate-500 font-semibold">Account No:</span><span className="font-mono font-bold text-slate-950">{selectedEmployee.bankAccountNo || '-'}</span></div>
                    <div className="flex justify-between py-1 border-b border-slate-100"><span className="text-slate-500 font-semibold">IFSC:</span><span className="font-mono font-bold text-slate-950">{selectedEmployee.bankIfsc || '-'}</span></div>
                    <div className="flex justify-between py-1 border-b border-slate-100"><span className="text-slate-500 font-semibold">PF Number:</span><span className="font-mono font-bold text-slate-950">{selectedEmployee.pfNumber || '-'}</span></div>
                    <div className="flex justify-between py-1"><span className="text-slate-500 font-semibold">ESI Number:</span><span className="font-mono font-bold text-slate-950">{selectedEmployee.esiNumber || '-'}</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SALARY */}
            {activeTab === 'salary' && (
              <div className="space-y-4">
                <SalaryStructureCalculator
                  initialCtc={selectedEmployee.salaryCtc || 25000}
                  isMonthly={true}
                  employeeId={selectedEmployee.id}
                  showApplyButton={true}
                  onSaved={() => {
                    showToast('Salary structure updated permanently in database', 'success');
                    fetchInitialData();
                  }}
                />
              </div>
            )}

            {/* TAB: DOCUMENTS */}
            {activeTab === 'docs' && (
              <div className="space-y-3 text-xs">
                {selectedEmployee.documents?.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">No documents attached for this employee</div>
                ) : (
                  <div className="divide-y divide-slate-200 bg-slate-50 border border-slate-200 rounded-2xl">
                    {selectedEmployee.documents?.map(doc => (
                      <div key={doc.id} className="p-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-purple-600" />
                          <div>
                            <span className="font-bold text-slate-800 block">{doc.title}</span>
                            <span className="text-[10px] text-slate-500 font-mono">Type: {doc.documentType}</span>
                          </div>
                        </div>
                        <Badge status={doc.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: ID CARD */}
            {activeTab === 'idcard' && (
              <div className="flex justify-center p-4">
                <DigitalIdCard employee={selectedEmployee} />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
