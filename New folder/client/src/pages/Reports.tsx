import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  Download,
  Filter,
  Search,
  Calendar,
  Building2,
  Users,
  Clock,
  Receipt,
  FileWarning,
} from 'lucide-react';
import { Site, Department } from '../types';
import { Badge } from '../components/common/Badge';
import { SkeletonTable } from '../components/common/SkeletonLoader';
import api from '../services/api';
import {
  formatDate,
  formatCurrency,
  formatTimeOnly,
  exportToExcel,
  exportToCsv,
  generateBankCmpData,
  exportBankCmpCsv,
  exportBankCmpExcel,
  downloadSampleCmpTemplate
} from '../utils/formatters';
import { useNotifications } from '../contexts/NotificationContext';

export const ReportsPage: React.FC = () => {
  const { showToast } = useNotifications();

  const [reportType, setReportType] = useState<string>('EMPLOYEE_MASTER');
  const [startDate, setStartDate] = useState<string>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [siteId, setSiteId] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  const [sites, setSites] = useState<Site[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const reportList = [
    { type: 'EMPLOYEE_MASTER', name: 'Employee Master Register', icon: <Users className="w-4 h-4 text-amber-500" /> },
    { type: 'BANK_CMP_DISBURSEMENT', name: 'Bank Salary Disbursement (CMP File)', icon: <Building2 className="w-4 h-4 text-cyan-600" /> },
    { type: 'ATTENDANCE_SUMMARY', name: 'Daily Attendance Report', icon: <Calendar className="w-4 h-4 text-emerald-600" /> },
    { type: 'LATE_REPORT', name: 'Late Check-in Violations', icon: <Clock className="w-4 h-4 text-rose-500" /> },
    { type: 'OVERTIME_REPORT', name: 'Overtime Hours Log', icon: <Clock className="w-4 h-4 text-cyan-600" /> },
    { type: 'LEAVE_REPORT', name: 'Leave & Absence Report', icon: <Calendar className="w-4 h-4 text-purple-600" /> },
    { type: 'PAYROLL_REGISTER', name: 'Salary & Payroll Register', icon: <Receipt className="w-4 h-4 text-amber-600" /> },
    { type: 'DOCUMENT_EXPIRY', name: 'Expiring Documents Audit', icon: <FileWarning className="w-4 h-4 text-rose-500" /> },
    { type: 'NEW_JOINERS', name: 'New Joiners Report (30d)', icon: <Users className="w-4 h-4 text-emerald-600" /> },
    { type: 'EXIT_EMPLOYEES', name: 'Exit & Terminated Workforce', icon: <Users className="w-4 h-4 text-slate-500" /> },
  ];

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [reportType, startDate, endDate, siteId, departmentId, status]);

  const fetchFilterOptions = async () => {
    try {
      const [siteRes, setRes]: any = await Promise.all([
        api.get('/sites'),
        api.get('/settings'),
      ]);
      if (siteRes.success) setSites(siteRes.data || []);
      if (setRes.success) setDepartments(setRes.data.departments || []);
    } catch (e) {}
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        type: reportType,
        startDate,
        endDate,
        ...(siteId ? { siteId } : {}),
        ...(departmentId ? { departmentId } : {}),
        ...(status ? { status } : {}),
      });

      const res: any = await api.get(`/reports?${query.toString()}`);
      if (res.success) {
        if (reportType === 'PAYROLL_REGISTER' || reportType === 'BANK_CMP_DISBURSEMENT') {
          setReportData(res.data?.payrollItems || (Array.isArray(res.data) ? res.data : []));
        } else {
          setReportData(Array.isArray(res.data) ? res.data : []);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: 'excel' | 'csv') => {
    if (reportData.length === 0) {
      showToast('No data available to export', 'warning');
      return;
    }

    if (reportType === 'BANK_CMP_DISBURSEMENT') {
      const cmpRows = generateBankCmpData(reportData);
      const title = `VPHS_Bank_CMP_Salary_Upload_${new Date().toISOString().split('T')[0]}`;
      if (format === 'excel') {
        exportBankCmpExcel(cmpRows, title);
      } else {
        exportBankCmpCsv(cmpRows, title);
      }
      showToast(`Exported ${cmpRows.length} records in Corporate CMP format`, 'success');
      return;
    }

    let formattedRows: any[] = [];

    switch (reportType) {
      case 'EMPLOYEE_MASTER':
        formattedRows = reportData.map(e => ({
          'Employee ID': e.employeeId,
          'Name': `${e.firstName} ${e.lastName}`,
          'Gender': e.gender,
          'Mobile': e.mobile,
          'Department': e.department?.name,
          'Designation': e.designation?.title,
          'Site': e.site?.siteName,
          'Status': e.status,
          'CTC (₹)': e.salaryCtc,
          'Joining Date': formatDate(e.joiningDate),
        }));
        break;

      case 'ATTENDANCE_SUMMARY':
        formattedRows = reportData.map(a => ({
          'Employee ID': a.employee?.employeeId,
          'Name': `${a.employee?.firstName} ${a.employee?.lastName}`,
          'Date': a.date,
          'Status': a.status,
          'In Time': formatTimeOnly(a.inTime),
          'Out Time': formatTimeOnly(a.outTime),
          'Working Hours': a.workingHours,
          'Late (Mins)': a.lateMinutes,
          'Overtime (Hrs)': a.overtimeHours,
        }));
        break;

      case 'LATE_REPORT':
        formattedRows = reportData.map(a => ({
          'Employee ID': a.employee?.employeeId,
          'Name': `${a.employee?.firstName} ${a.employee?.lastName}`,
          'Date': a.date,
          'In Time': formatTimeOnly(a.inTime),
          'Late Minutes': a.lateMinutes,
          'Site': a.site?.siteName,
        }));
        break;

      case 'OVERTIME_REPORT':
        formattedRows = reportData.map(a => ({
          'Employee ID': a.employee?.employeeId,
          'Name': `${a.employee?.firstName} ${a.employee?.lastName}`,
          'Date': a.date,
          'Working Hours': a.workingHours,
          'Overtime Hours': a.overtimeHours,
          'Site': a.site?.siteName,
        }));
        break;

      case 'LEAVE_REPORT':
        formattedRows = reportData.map(l => ({
          'Employee ID': l.employee?.employeeId,
          'Name': `${l.employee?.firstName} ${l.employee?.lastName}`,
          'Leave Type': l.leaveType?.name,
          'From': formatDate(l.startDate),
          'To': formatDate(l.endDate),
          'Total Days': l.totalDays,
          'Status': l.status,
          'Reason': l.reason,
        }));
        break;

      case 'PAYROLL_REGISTER':
        formattedRows = reportData.map(p => ({
          'Payslip No': p.payslipNumber,
          'Employee ID': p.employee?.employeeId,
          'Name': `${p.employee?.firstName} ${p.employee?.lastName}`,
          'Basic (₹)': p.basic,
          'HRA (₹)': p.hra,
          'Gross (₹)': p.grossSalary,
          'PF (₹)': p.pfDeduction,
          'ESI (₹)': p.esiDeduction,
          'PT (₹)': p.ptDeduction,
          'Total Deductions (₹)': p.totalDeductions,
          'Net Salary (₹)': p.netSalary,
          'Status': p.status,
        }));
        break;

      case 'DOCUMENT_EXPIRY':
        formattedRows = reportData.map(d => ({
          'Employee ID': d.employee?.employeeId,
          'Name': `${d.employee?.firstName} ${d.employee?.lastName}`,
          'Document Title': d.title,
          'Category': d.documentType,
          'Expiry Date': formatDate(d.expiryDate),
          'Status': d.status,
        }));
        break;

      default:
        formattedRows = reportData;
    }

    const title = `VPHS_${reportType}_${new Date().toISOString().split('T')[0]}`;
    if (format === 'excel') exportToExcel(formattedRows, title);
    else exportToCsv(formattedRows, title);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-wide flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-500" /> Enterprise Reports & Analytics
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Generate and export consolidated workforce registers, statutory filings, and attendance audits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {reportType === 'BANK_CMP_DISBURSEMENT' && (
            <button
              onClick={downloadSampleCmpTemplate}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl border border-amber-300 shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Download official corporate banking bulk salary template"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-600" /> Sample Template (.CSV)
            </button>
          )}
          <button
            onClick={() => handleExport('excel')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" /> Download Excel
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Reports Grid & Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Report Categories Navigation */}
        <div className="lg:col-span-4 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            Select Report Type
          </h3>
          <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-sm space-y-1">
            {reportList.map(r => (
              <button
                key={r.type}
                onClick={() => setReportType(r.type)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
                  reportType === r.type
                    ? 'bg-amber-50 text-amber-900 border border-amber-300 font-bold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {r.icon}
                <span className="truncate">{r.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Filters & Report Table */}
        <div className="lg:col-span-8 space-y-4">
          {/* Dynamic Filter Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Site</label>
              <select
                value={siteId}
                onChange={e => setSiteId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">All Sites</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.siteName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={departmentId}
                onChange={e => setDepartmentId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Table */}
          {loading ? (
            <SkeletonTable rows={8} cols={5} />
          ) : reportData.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
              <BarChart3 className="w-12 h-12 mx-auto text-slate-400 mb-3" />
              <h3 className="text-base font-bold text-slate-900">No records found for this report filter</h3>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-900">
                  {reportList.find(r => r.type === reportType)?.name} ({reportData.length} Records)
                </span>
                <span className="text-slate-500 text-[11px]">Ready for export</span>
              </div>

              <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                {reportType === 'BANK_CMP_DISBURSEMENT' ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-extrabold border-b border-slate-200 text-[11px] sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-3 w-10 text-center border-r border-slate-200">#</th>
                        <th className="px-3 py-3 border-r border-slate-200 font-mono">Account No</th>
                        <th className="px-4 py-3 border-r border-slate-200">Beneficiary Name</th>
                        <th className="px-3 py-3 border-r border-slate-200 font-mono">IFSC Code</th>
                        <th className="px-3 py-3 border-r border-slate-200 text-right font-mono">Net Salary</th>
                        <th className="px-3 py-3 border-r border-slate-200 text-center">Type</th>
                        <th className="px-3 py-3 border-r border-slate-200">Remarks</th>
                        <th className="px-3 py-3 border-r border-slate-200 font-mono">Mobile</th>
                        <th className="px-3 py-3">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {generateBankCmpData(reportData).map((cmp, idx) => (
                        <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                          <td className="px-3 py-2.5 text-center text-slate-500 font-mono border-r border-slate-100">{cmp['Serial Number']}</td>
                          <td className="px-3 py-2.5 font-mono font-bold text-slate-900 border-r border-slate-100">{cmp['Beneficiary Account Number']}</td>
                          <td className="px-4 py-2.5 font-semibold text-slate-900 border-r border-slate-100">{cmp['Beneficiary Name']}</td>
                          <td className="px-3 py-2.5 font-mono font-bold text-amber-700 border-r border-slate-100">{cmp['IFSC Code']}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-extrabold text-slate-900 border-r border-slate-100">
                            ₹{typeof cmp['Transaction Amount'] === 'number' ? cmp['Transaction Amount'].toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : cmp['Transaction Amount']}
                          </td>
                          <td className="px-3 py-2.5 text-center border-r border-slate-100">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                              {cmp['Account Type (Savings/Current)']}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 text-[11px] border-r border-slate-100">{cmp['Transaction Remarks / Purpose']}</td>
                          <td className="px-3 py-2.5 font-mono text-slate-700 border-r border-slate-100">{cmp['Beneficiary Mobile Number']}</td>
                          <td className="px-3 py-2.5 text-slate-600 text-[11px] truncate max-w-[140px]">{cmp['Beneficiary Email ID']}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px] sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3">Employee / Record</th>
                        <th className="px-4 py-3">Site / Dept</th>
                        <th className="px-4 py-3">Key Metric / Date</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      {reportData.map((row, idx) => (
                        <tr key={row.id || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">
                              {row.employee ? `${row.employee.firstName} ${row.employee.lastName}` : (row.firstName ? `${row.firstName} ${row.lastName}` : row.title || row.payslipNumber)}
                            </div>
                            <div className="text-[10px] font-mono text-amber-700 font-semibold">
                              {row.employee?.employeeId || row.employeeId || row.documentType || '-'}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="text-slate-800">{row.site?.siteName || row.employee?.site?.siteName || 'Corporate HQ'}</div>
                            <div className="text-[10px] text-slate-500">{row.department?.name || row.employee?.department?.name || '-'}</div>
                          </td>

                          <td className="px-4 py-3 font-mono text-slate-800">
                            {row.date ? formatDate(row.date) : (row.netSalary ? formatCurrency(row.netSalary) : (row.salaryCtc ? formatCurrency(row.salaryCtc) : formatDate(row.joiningDate || row.uploadedAt)))}
                          </td>

                          <td className="px-4 py-3">
                            <Badge status={row.status || 'ACTIVE'} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
