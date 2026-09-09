import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Play,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  Calendar,
  Building2,
  DollarSign,
  TrendingUp,
  CreditCard,
  Calculator,
  Users,
  Shirt,
  CalendarCheck,
  Award,
  Landmark,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  RotateCcw,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';
import { Payroll, PayrollItem } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { SkeletonTable } from '../components/common/SkeletonLoader';
import { PayslipModal } from '../components/payslip/PayslipModal';
import { SalaryStructureCalculator } from '../components/payroll/SalaryStructureCalculator';
import { FacilityRateCardModule } from '../components/payroll/FacilityRateCardModule';
import { BankCmpDisbursementModal } from '../components/payroll/BankCmpDisbursementModal';
import api from '../services/api';
import { formatCurrency, formatDate, exportToExcel, exportToCsv } from '../utils/formatters';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

export const PayrollPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [payrollDetails, setPayrollDetails] = useState<PayrollItem[]>([]);
  const [myPayslips, setMyPayslips] = useState<PayrollItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'batches' | 'calculator' | 'statutory'>('batches');
  const [showComplianceGuide, setShowComplianceGuide] = useState(false);

  // Sites & Search Filters
  const [sites, setSites] = useState<any[]>([]);
  const [siteFilter, setSiteFilter] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Modals
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [isBankCmpOpen, setIsBankCmpOpen] = useState(false);
  const [activePayslip, setActivePayslip] = useState<PayrollItem | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  // Generate Form
  const [generateMonth, setGenerateMonth] = useState<number>(new Date().getMonth() + 1);
  const [generateYear, setGenerateYear] = useState<number>(new Date().getFullYear());
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchPayrolls();
  }, []);

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      if (user?.role === 'EMPLOYEE') {
        const res: any = await api.get('/payroll/my-payslips');
        if (res.success) setMyPayslips(res.data || []);
      } else {
        const [pRes, sRes, sitesRes]: any = await Promise.all([
          api.get('/payroll'),
          api.get('/settings'),
          api.get('/sites'),
        ]);

        if (sitesRes?.success) {
          setSites(sitesRes.data || []);
        }

        if (pRes.success) {
          const list = pRes.data || [];
          setPayrolls(list);
          if (list.length > 0) {
            fetchPayrollDetails(list[0].id);
          }
        }
        if (sRes.success) setCompanyInfo(sRes.data.company);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load payroll records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrollDetails = async (id: string) => {
    try {
      const res: any = await api.get(`/payroll/${id}`);
      if (res.success && res.data) {
        setSelectedPayroll(res.data);
        setPayrollDetails(res.data.payrollItems || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load payroll details', 'error');
    }
  };

  const filteredPayrollDetails = useMemo(() => {
    return payrollDetails.filter(item => {
      const emp = item.employee;
      const matchSite =
        siteFilter === 'ALL' ||
        emp?.siteId === siteFilter ||
        emp?.site?.id === siteFilter ||
        (siteFilter === 'MICROSOFT' && (
          emp?.site?.siteName?.toLowerCase().includes('microsoft') ||
          emp?.site?.clientName?.toLowerCase().includes('microsoft')
        ));

      const q = searchFilter.toLowerCase().trim();
      const matchSearch =
        !q ||
        `${emp?.firstName || ''} ${emp?.lastName || ''}`.toLowerCase().includes(q) ||
        (emp?.employeeId || '').toLowerCase().includes(q) ||
        (emp?.designation?.title || '').toLowerCase().includes(q) ||
        (emp?.site?.siteName || '').toLowerCase().includes(q) ||
        (emp?.department?.name || '').toLowerCase().includes(q);

      return matchSite && matchSearch;
    });
  }, [payrollDetails, siteFilter, searchFilter]);

  const filteredStats = useMemo(() => {
    const totalStaff = filteredPayrollDetails.length;
    const totalGross = filteredPayrollDetails.reduce((sum, item) => sum + (item.grossSalary || 0), 0);
    const totalDeductions = filteredPayrollDetails.reduce((sum, item) => sum + (item.totalDeductions || 0), 0);
    const totalNet = filteredPayrollDetails.reduce((sum, item) => sum + (item.netSalary || 0), 0);

    return { totalStaff, totalGross, totalDeductions, totalNet };
  }, [filteredPayrollDetails]);

  const handleGeneratePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res: any = await api.post('/payroll/generate', {
        month: generateMonth,
        year: generateYear,
        allowOverwrite: true,
      });

      if (res.success) {
        showToast(`Payroll for ${generateMonth}/${generateYear} generated successfully (${res.data?.totalEmployees || 0} employees processed)! Ready for approval.`, 'success');
        setIsGenerateOpen(false);
        fetchPayrolls();
      }
    } catch (err: any) {
      showToast(err.message || 'Generation failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecalculateCurrentBatch = async () => {
    if (!selectedPayroll) return;
    if (
      !window.confirm(
        `Are you sure you want to re-run and recalculate payroll for ${new Date(selectedPayroll.payrollYear, selectedPayroll.payrollMonth - 1, 1).toLocaleString('default', { month: 'long' })} ${selectedPayroll.payrollYear}? This will refresh all attendance records, loss of pay, and rate cards.`
      )
    ) {
      return;
    }

    setIsProcessing(true);
    try {
      const res: any = await api.post('/payroll/generate', {
        month: selectedPayroll.payrollMonth,
        year: selectedPayroll.payrollYear,
        allowOverwrite: true,
      });

      if (res.success) {
        showToast(
          `Payroll for ${selectedPayroll.payrollMonth}/${selectedPayroll.payrollYear} recalculated successfully for ${res.data?.totalEmployees || 0} employees! Ready for approval.`,
          'success'
        );
        fetchPayrollDetails(selectedPayroll.id);
        fetchPayrolls();
      }
    } catch (err: any) {
      showToast(err.message || 'Recalculation failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprovePayroll = async (status: 'APPROVED' | 'PAID' | 'CALCULATED') => {
    if (!selectedPayroll) return;
    try {
      const res: any = await api.put(`/payroll/${selectedPayroll.id}/approve`, {
        status,
        remarks: status === 'PAID' ? 'Disbursed via bank NEFT' : status === 'APPROVED' ? 'Approved by Management' : 'Reopened for attendance/rate card revisions',
      });

      if (res.success) {
        showToast(`Payroll batch status updated to ${status}`, 'success');
        fetchPayrollDetails(selectedPayroll.id);
        fetchPayrolls();
      }
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  const handleOpenPayslip = async (item: PayrollItem) => {
    try {
      const res: any = await api.get(`/payroll/payslip/${item.id}`);
      if (res.success && res.data) {
        setActivePayslip(res.data.payslip);
        setCompanyInfo(res.data.company);
        setIsPayslipOpen(true);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to open payslip', 'error');
    }
  };

  const handleExportRegister = (format: 'excel' | 'csv') => {
    const exportRows = payrollDetails.map(item => ({
      'Payslip No': item.payslipNumber,
      'Employee ID': item.employee?.employeeId,
      'Employee Name': `${item.employee?.firstName} ${item.employee?.lastName}`,
      'Designation': item.employee?.designation?.title,
      'Department': item.employee?.department?.name,
      'Site': item.employee?.site?.siteName,
      'Working Days': item.workingDays,
      'Present Days': item.presentDays,
      '1. Basic (₹)': item.basic,
      '2. DA (₹)': item.da,
      '3. Spl Allowance (₹)': item.specialAllowance,
      '4. Uniform & Shoes (₹)': item.uniformAllowance || 0,
      '5. Leave Wages (₹)': item.leaveWages || 0,
      'HRA (₹)': item.hra,
      'Conveyance (₹)': item.conveyance,
      'Overtime (₹)': item.overtimePay,
      '6. Gross Salary (₹)': item.grossSalary,
      '7. P.F @ Employer (₹)': item.employerPf || 0,
      '8. ESI @ Employer (₹)': item.employerEsi || 0,
      '9. Bonus (₹)': item.bonus || 0,
      '10. Telangana LWF (₹)': item.telanganaLwf || 5,
      'PF Deduction (₹)': item.pfDeduction,
      'ESI Deduction (₹)': item.esiDeduction,
      'PT Deduction (₹)': item.ptDeduction,
      'LOP Deduction (₹)': item.lopDeduction,
      'Total Deductions (₹)': item.totalDeductions,
      'Net Salary (₹)': item.netSalary,
      '12. Total CTC (₹)': (item.grossSalary || 0) + (item.employerPf || 0) + (item.employerEsi || 0) + (item.bonus || 0) + (item.telanganaLwf || 5) + (item.gratuity || 0),
      'Status': item.status,
    }));

    const name = `VPHS_Salary_Register_${selectedPayroll?.payrollMonth}_${selectedPayroll?.payrollYear}`;
    if (format === 'excel') exportToExcel(exportRows, name);
    else exportToCsv(exportRows, name);
  };

  // If Employee self-service role
  if (user?.role === 'EMPLOYEE') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-wide flex items-center gap-2">
            <Receipt className="w-6 h-6 text-amber-500" /> My Salary & Payslips
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            View monthly compensation, tax deductions, provident fund logs & download official payslip PDFs.
          </p>
        </div>

        {myPayslips.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
            <Receipt className="w-12 h-12 mx-auto text-slate-400 mb-3" />
            <h3 className="text-base font-bold text-slate-900">No payslips issued yet</h3>
            <p className="text-xs mt-1">Monthly payslips will appear here once processed by HR.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Payslip Number</th>
                  <th className="px-4 py-3.5">Month & Year</th>
                  <th className="px-4 py-3.5">Gross Salary</th>
                  <th className="px-4 py-3.5">Total Deductions</th>
                  <th className="px-4 py-3.5">Net Salary Payable</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {myPayslips.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900">{item.payslipNumber}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-800">
                      {item.payroll ? `${item.payroll.payrollMonth}/${item.payroll.payrollYear}` : 'Monthly'}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-800">{formatCurrency(item.grossSalary)}</td>
                    <td className="px-4 py-3.5 font-mono text-rose-700">{formatCurrency(item.totalDeductions)}</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-amber-700 text-sm">
                      {formatCurrency(item.netSalary)}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge status={item.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleOpenPayslip(item)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 ml-auto transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Payslip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Payslip Modal */}
        <PayslipModal
          isOpen={isPayslipOpen}
          onClose={() => setIsPayslipOpen(false)}
          payslip={activePayslip}
          companyInfo={companyInfo}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-wide flex items-center gap-2">
            <Receipt className="w-6 h-6 text-amber-500" /> Payroll & Salary Register
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Automated monthly salary computation, statutory compliance (PF, ESI, PT), LOP deductions & PDF payslips.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {activeTab === 'batches' && (
            <>
              <button
                onClick={() => handleExportRegister('excel')}
                disabled={!selectedPayroll}
                className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export Register (Excel)
              </button>

              <button
                onClick={() => setIsBankCmpOpen(true)}
                disabled={!selectedPayroll}
                className="px-3 py-2 bg-white hover:bg-cyan-50 text-cyan-800 text-xs font-bold rounded-xl border border-cyan-300 shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Generate standard corporate banking bulk upload file (SBI CMP, HDFC ENET, ICICI Corporate)"
              >
                <Building2 className="w-4 h-4 text-cyan-600" /> Bank Payout (CMP)
              </button>

              <button
                onClick={() => setIsGenerateOpen(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-amber-500/10 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-4 h-4" /> Run Monthly Payroll
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 gap-4 text-xs font-bold">
        <button
          onClick={() => {
            setActiveTab('batches');
            if (selectedPayroll) {
              fetchPayrollDetails(selectedPayroll.id);
            } else {
              fetchPayrolls();
            }
          }}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'batches'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" /> Monthly Payroll Register & Batches
        </button>
        <button
          onClick={() => setActiveTab('calculator')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'calculator'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calculator className="w-4 h-4" /> Payroll & Statutory Slabs Calculator
        </button>
        <button
          onClick={() => setActiveTab('statutory')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'statutory'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Facility Rate Card & Statutory Slabs (Breakups Master)
        </button>
      </div>

      {activeTab === 'statutory' && <FacilityRateCardModule />}
      {activeTab === 'calculator' && (
        <SalaryStructureCalculator
          onSaved={() => {
            fetchPayrolls();
            if (selectedPayroll) {
              fetchPayrollDetails(selectedPayroll.id);
            }
          }}
        />
      )}
      {activeTab === 'batches' && (
        <>
          {/* Payroll Batch Selector & Summary Cards */}
      {selectedPayroll && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">Select Payroll Month:</span>
              <select
                value={selectedPayroll.id}
                onChange={e => fetchPayrollDetails(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {payrolls.map(p => (
                  <option key={p.id} value={p.id}>
                    {new Date(p.payrollYear, p.payrollMonth - 1, 1).toLocaleString('default', { month: 'long' })} {p.payrollYear} ({p.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Status & Recalculate Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge status={selectedPayroll.status} />

              {/* 1-Click Re-run / Recalculate button */}
              <button
                onClick={handleRecalculateCurrentBatch}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                title="Recalculate all employees from latest attendance logs & rate cards"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                {isProcessing ? 'Recalculating...' : 'Re-Run & Recalculate'}
              </button>

              {selectedPayroll.status === 'CALCULATED' && (
                <button
                  onClick={() => handleApprovePayroll('APPROVED')}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve Payroll Batch
                </button>
              )}

              {selectedPayroll.status === 'APPROVED' && (
                <>
                  <button
                    onClick={() => handleApprovePayroll('CALCULATED')}
                    className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                    title="Send back for attendance or rate card adjustments"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reopen for Edits
                  </button>
                  <button
                    onClick={() => handleApprovePayroll('PAID')}
                    className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Mark as Paid & Disbursed
                  </button>
                </>
              )}

              {selectedPayroll.status === 'PAID' && (
                <button
                  onClick={() => handleApprovePayroll('CALCULATED')}
                  className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                  title="Reopen paid batch for attendance or rate card adjustments"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reopen for Adjustments
                </button>
              )}
            </div>
          </div>

          {/* Batch Numbers Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Employees</span>
              <span className="text-lg font-bold text-slate-900 mt-1 block">{selectedPayroll.totalEmployees} Staff</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Gross Salary</span>
              <span className="text-lg font-bold text-emerald-700 mt-1 block font-mono">
                {formatCurrency(selectedPayroll.totalGross)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Deductions</span>
              <span className="text-lg font-bold text-rose-700 mt-1 block font-mono">
                {formatCurrency(selectedPayroll.totalDeductions)}
              </span>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-amber-800 text-[10px] uppercase font-bold block">Net Salary Payout</span>
              <span className="text-lg font-extrabold text-amber-800 mt-1 block font-mono">
                {formatCurrency(selectedPayroll.totalNet)}
              </span>
            </div>
          </div>

          {/* Live Attendance Auto-Sync Notice & Statutory Compliance Drawer Toggle */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span>
                <strong>Real-Time Attendance Sync:</strong> Attendance punches, weekend sandwich policies, approved leaves, and facility rate cards automatically reflect in employee payslips in real time without requiring manual batch approval.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowComplianceGuide(!showComplianceGuide)}
              className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0 shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{showComplianceGuide ? 'Hide Statutory Rules' : 'View Statutory Rules'}</span>
              {showComplianceGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Collapsible Statutory Rules & Compliance Drawer */}
          {showComplianceGuide && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Statutory Compliance & Payroll Batch Policies Applied:</span>
                </div>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                  Telangana S&amp;E Norms
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-[11px]">
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5 shadow-xs">
                  <span className="font-bold text-cyan-800 block flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> 1. Attendance Slabs
                  </span>
                  <p className="text-slate-700">• <strong>P (Present):</strong> 9.0h shift completed (1.0d)</p>
                  <p className="text-slate-700">• <strong>WO (Week Off):</strong> Sat &amp; Sun for Microsoft &amp; HO; Sun for client sites (1.0d)</p>
                  <p className="text-slate-700">• <strong>L (Late):</strong> Arrival &gt; 15m grace period (1.0d, tracked)</p>
                  <p className="text-slate-700">• <strong>HD (Half Day):</strong> &ge; 4.0h &amp; &lt; 9.0h login (0.5d)</p>
                  <p className="text-slate-700">• <strong>LV:</strong> Approved CL/PL/SL (1.0d)</p>
                  <p className="text-slate-700">• <strong>A (Absent):</strong> &lt; 4.0h or no punch (0.0d)</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5 shadow-xs">
                  <span className="font-bold text-amber-800 block flex items-center gap-1">
                    <CalendarCheck className="w-3.5 h-3.5" /> 2. Weekend Sandwich
                  </span>
                  <p className="text-slate-700">• <strong>Friday Absent:</strong> Saturday marked Absent / LOP</p>
                  <p className="text-slate-700">• <strong>Monday Absent:</strong> Sunday marked Absent / LOP</p>
                  <p className="text-emerald-800 font-medium pt-1 border-t border-slate-200">
                    • <strong>Auto-Restore:</strong> Restoring Friday or Monday to Present automatically returns weekend to statutory Week Off (WO).
                  </p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5 shadow-xs">
                  <span className="font-bold text-purple-800 block flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> 3. Overtime (OT)
                  </span>
                  <p className="text-slate-700">• <strong>Trigger:</strong> Calculated strictly after completing standard 9.0h shift (min 4h shift login).</p>
                  <p className="font-mono text-purple-900 text-[10px] bg-slate-50 p-1.5 rounded border border-slate-200">
                    ((Gross / (Month Days &times; 8)) &times; 1.5) &times; OT Hours
                  </p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5 shadow-xs">
                  <span className="font-bold text-emerald-800 block flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5" /> 4. Slabs &amp; Proration
                  </span>
                  <p className="text-slate-700">• <strong>Wage Base:</strong> Basic (₹6k) + DA (₹10k) = ₹16k</p>
                  <p className="text-slate-700">• <strong>Gross:</strong> ₹22,783 | <strong>Net In-Hand:</strong> ₹20,610</p>
                  <p className="text-slate-700">• <strong>CTC:</strong> ₹29,727/mo (₹3,56,722/yr)</p>
                  <p className="text-amber-800 font-medium">• <strong>Proration:</strong> (P + WO + LV + 0.5&times;HD) / Month Days</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Salary Register Table Section with Site Filter Toolbar */}
      {loading ? (
        <SkeletonTable rows={8} cols={8} />
      ) : payrollDetails.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
          <Receipt className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-900">No payroll records computed</h3>
          <p className="text-xs mt-1">Click "Run Monthly Payroll" to compute monthly compensation batch.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Facility Site Filter & Quick Toolbar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Site Dropdown */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900">
                <Building2 className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-slate-600 font-medium text-[11px] hidden sm:inline">Facility / Site:</span>
                <select
                  value={siteFilter}
                  onChange={e => setSiteFilter(e.target.value)}
                  className="bg-transparent text-slate-900 font-bold text-xs focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-white text-slate-900">All Client Sites ({payrollDetails.length} Staff)</option>
                  <option value="MICROSOFT" className="bg-white text-amber-700 font-bold">
                    🏢 Microsoft Campus - Building 3
                  </option>
                  {sites.map(s => (
                    <option key={s.id} value={s.id} className="bg-white text-slate-900">
                      {s.siteName} ({s.siteCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Filter Pill: Microsoft */}
              <button
                onClick={() => setSiteFilter(siteFilter === 'MICROSOFT' ? 'ALL' : 'MICROSOFT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  siteFilter === 'MICROSOFT'
                    ? 'bg-amber-500 text-white border-amber-400 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Microsoft Employees</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  siteFilter === 'MICROSOFT' ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {payrollDetails.filter(i => i.employee?.site?.siteName?.toLowerCase().includes('microsoft') || i.employee?.site?.clientName?.toLowerCase().includes('microsoft')).length}
                </span>
              </button>

              {siteFilter !== 'ALL' && (
                <button
                  onClick={() => {
                    setSiteFilter('ALL');
                    setSearchFilter('');
                  }}
                  className="text-[11px] text-slate-500 hover:text-slate-900 underline transition-colors px-1"
                >
                  Reset Filter
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff, ID, designation..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Export Filtered Excel */}
              <button
                onClick={() => {
                  const data = filteredPayrollDetails.map(item => ({
                    'Employee ID': item.employee?.employeeId,
                    'Employee Name': `${item.employee?.firstName} ${item.employee?.lastName}`,
                    'Designation': item.employee?.designation?.title,
                    'Site / Facility': item.employee?.site?.siteName || 'Corporate',
                    'Client': item.employee?.site?.clientName || 'VPHS Internal',
                    'Month/Year': `${selectedPayroll?.payrollMonth || new Date().getMonth() + 1}/${selectedPayroll?.payrollYear || new Date().getFullYear()}`,
                    'Working Days': item.workingDays,
                    'Present Days': item.presentDays,
                    'Paid Days': Math.max(0, item.workingDays - (item.lopDays || 0)),
                    'LOP Days': item.lopDays,
                    'Basic': item.basic,
                    'DA': item.da,
                    'HRA': item.hra,
                    'Special Allowance': item.specialAllowance,
                    'Gross Salary': item.grossSalary,
                    'Employee PF': item.pfDeduction,
                    'Employee ESI': item.esiDeduction,
                    'Professional Tax': item.ptDeduction,
                    'LOP Deduction': item.lopDeduction,
                    'Total Deductions': item.totalDeductions,
                    'Net Salary': item.netSalary,
                    'Status': item.status,
                  }));
                  const label = siteFilter === 'MICROSOFT' ? 'Microsoft_Campus' : siteFilter !== 'ALL' ? 'Filtered_Site' : 'All_Sites';
                  exportToExcel(data, `VPHS_${label}_Salary_Register_${selectedPayroll?.payrollMonth}_${selectedPayroll?.payrollYear}`);
                  showToast(`Exported ${filteredPayrollDetails.length} payslip records to Excel`, 'success');
                }}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export Excel</span>
              </button>

              {/* Corporate Bank CMP File */}
              <button
                onClick={() => setIsBankCmpOpen(true)}
                className="px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Corporate Bank CMP Bulk Upload Template (.csv / .xlsx)"
              >
                <Building2 className="w-3.5 h-3.5 text-cyan-600" />
                <span className="hidden sm:inline">Bank CMP (.CSV)</span>
              </button>
            </div>
          </div>

          {/* Microsoft Campus Site Indicator Banner */}
          {siteFilter === 'MICROSOFT' && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 font-bold">
                  MS
                </div>
                <div>
                  <h4 className="font-extrabold text-amber-900 text-sm flex items-center gap-2">
                    Microsoft Campus - Building 3
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Facility Rate Card Applied
                    </span>
                  </h4>
                  <p className="text-slate-600 text-[11px]">
                    Client: <strong className="text-slate-900">Microsoft India R&D Pvt. Ltd.</strong> • Slabs: Basic ₹6,000 + DA ₹10,000 + HRA ₹6,783 (Gross ₹22,783) | CTC ₹29,727
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs">
                <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
                  <span className="text-[10px] text-slate-500 block font-sans">Filtered Staff</span>
                  <strong className="text-slate-900 font-bold">{filteredStats.totalStaff} Employees</strong>
                </div>
                <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
                  <span className="text-[10px] text-slate-500 block font-sans">Total Gross</span>
                  <strong className="text-emerald-700 font-bold">{formatCurrency(filteredStats.totalGross)}</strong>
                </div>
                <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
                  <span className="text-[10px] text-slate-500 block font-sans">Total Net Payout</span>
                  <strong className="text-amber-800 font-bold">{formatCurrency(filteredStats.totalNet)}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Salary Register Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">Employee</th>
                    <th className="px-4 py-3.5">Site & Dept</th>
                    <th className="px-4 py-3.5">Working Days</th>
                    <th className="px-4 py-3.5">Gross (₹)</th>
                    <th className="px-4 py-3.5">PF & ESI</th>
                    <th className="px-4 py-3.5">PT & LOP</th>
                    <th className="px-4 py-3.5">Net Salary (₹)</th>
                    <th className="px-5 py-3.5 text-right">Payslip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {filteredPayrollDetails.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {item.employee?.firstName} {item.employee?.lastName}
                          {item.employee?.site?.siteName?.toLowerCase().includes('microsoft') && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                              MSFT
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-amber-700 font-semibold">
                          {item.employee?.employeeId} • {item.employee?.designation?.title}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="text-teal-800 font-medium">{item.employee?.site?.siteName || 'Corporate'}</div>
                        <div className="text-[10px] text-slate-500">{item.employee?.department?.name}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-bold text-slate-900">{item.presentDays}</span>
                        <span className="text-slate-500"> / {item.workingDays}d</span>
                        {item.lopDays > 0 && (
                          <span className="text-rose-700 text-[10px] block font-semibold">{item.lopDays}d LOP</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                        {formatCurrency(item.grossSalary)}
                      </td>

                      <td className="px-4 py-3.5 text-[11px] text-slate-700">
                        <div>PF: {formatCurrency(item.pfDeduction)}</div>
                        <div>ESI: {formatCurrency(item.esiDeduction)}</div>
                      </td>

                      <td className="px-4 py-3.5 text-[11px] text-slate-700">
                        <div>PT: {formatCurrency(item.ptDeduction)}</div>
                        {item.lopDeduction > 0 && (
                          <div className="text-rose-700 font-semibold">LOP: {formatCurrency(item.lopDeduction)}</div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 font-mono font-extrabold text-amber-700 text-sm">
                        {formatCurrency(item.netSalary)}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleOpenPayslip(item)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1 ml-auto transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  )}

      {/* GENERATE MONTHLY PAYROLL MODAL */}
      <Modal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        title="Execute Monthly Payroll Processing"
        subtitle="Calculates Gross, PF, ESI, Professional Tax, LOP deductions & net payables from attendance logs"
        maxWidth="md"
      >
        <form onSubmit={handleGeneratePayroll} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">Payroll Month *</label>
              <select
                value={generateMonth}
                onChange={e => setGenerateMonth(parseInt(e.target.value, 10))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>
                    {new Date(2026, m - 1, 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-800 mb-1">Payroll Year *</label>
              <select
                value={generateYear}
                onChange={e => setGenerateYear(parseInt(e.target.value, 10))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-slate-700">
            <p className="text-amber-800 font-bold text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Facility Rate Card & Statutory Slabs Applied:
            </p>
            <div className="text-[11px] space-y-1.5 text-slate-700">
              <p>• <strong>Earnings & Wage Base:</strong> Basic (₹6,000) + DA (₹10,000) = Sub Total 1 (₹16,000 Wage Base) | HRA (₹6,783) | Uniform (₹200) | Standard Gross = <strong>₹22,783</strong></p>
              <p>• <strong>Employee Deductions:</strong> EPF 12% (₹1,920, capped at ₹15k wage) | ESI 0.75% (₹171) | PT Telangana Slab (₹200) | LWF (₹2) | Net In-Hand = <strong>₹20,610</strong></p>
              <p>• <strong>Employer CTC:</strong> PF 13% (₹1,950 with EDLI/admin) | ESI 3.25% (₹613) | Statutory Bonus 8.33% (₹1,333) | Leave Wages 12.5% (₹2,848) | CTC = <strong>₹29,727/mo</strong> (₹3,56,722/yr)</p>
              <p className="text-amber-800 font-medium pt-1 border-t border-slate-200">
                ⚡ <strong>Attendance & Weekend Sandwich Proration:</strong> Salary is prorated by <code>(Present + Week Offs + Leaves + 0.5×HalfDay) / Month Days</code>. Friday absence marks Saturday as LOP; Monday absence marks Sunday as LOP. Overtime counted strictly after 9.0h shift.
              </p>
              <p className="text-emerald-800 font-semibold pt-1 border-t border-slate-200 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> <strong>Multi-Run Enabled:</strong> You can re-run and recalculate this batch multiple times as attendance logs or rate cards are updated before final approval.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsGenerateOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-md shadow-amber-500/10 flex items-center gap-1.5 transition-all"
            >
              {isProcessing ? 'Processing Calculations...' : 'Compute & Generate Batch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Official Payslip Modal */}
      <PayslipModal
        isOpen={isPayslipOpen}
        onClose={() => setIsPayslipOpen(false)}
        payslip={activePayslip}
        companyInfo={companyInfo}
      />

      {/* Corporate Bank CMP Bulk Salary Disbursement Modal */}
      <BankCmpDisbursementModal
        isOpen={isBankCmpOpen}
        onClose={() => setIsBankCmpOpen(false)}
        payrollBatch={selectedPayroll}
        payrollItems={filteredPayrollDetails}
      />
    </div>
  );
};
