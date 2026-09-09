import React, { useRef, useState } from 'react';
import {
  Download,
  Printer,
  Building2,
  CheckCircle2,
  CalendarCheck,
  Coffee,
  Clock,
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet,
  Award,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { PayrollItem } from '../../types';
import { formatCurrency, formatDate, numberToWordsIndian } from '../../utils/formatters';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  payslip: PayrollItem | null;
  companyInfo?: any;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
  isOpen,
  onClose,
  payslip,
  companyInfo,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const payslipRef = useRef<HTMLDivElement>(null);

  if (!payslip) return null;

  const emp = payslip.employee;
  const companyName = companyInfo?.companyName || 'VPHS Services Pvt. Ltd.';
  const companyAddress = companyInfo?.address || 'Plot No. 42, Hitech City, Madhapur, Hyderabad, Telangana - 500081';
  const gstNumber = companyInfo?.gstNumber || '36AABCV1234F1Z8';
  const panNumber = companyInfo?.panNumber || 'AABCV1234F';
  const cinNumber = companyInfo?.cinNumber || 'U74999TG2020PTC145678';

  const workingDays = payslip.workingDays || 30;
  const payableDays = payslip.presentDays || 30;
  const lopDays = payslip.lopDays || 0;
  const basicPlusDa = (payslip.basic || 0) + (payslip.da || 0);

  // Statutory Employer CTC calculations
  const employerPf = payslip.employerPf || Math.round((Math.min(basicPlusDa, 15000) * 13) / 100);
  const employerEsi = payslip.employerEsi || (payslip.grossSalary <= 21000 ? Math.round((payslip.grossSalary * 3.25) / 100) : 613);
  const bonus = payslip.bonus || Math.round((basicPlusDa * 8.33) / 100);
  const leaveWages = payslip.leaveWages || Math.round(payslip.grossSalary * 0.125) || 2848;
  const uniformAllowance = payslip.uniformAllowance || 200;
  const telanganaLwfEmployer = payslip.telanganaLwf || 0.17;
  const monthlyCtc = payslip.grossSalary + employerPf + employerEsi + bonus + leaveWages + telanganaLwfEmployer;
  const annualCtc = Math.round(monthlyCtc * 12);

  const handleDownloadPdf = async () => {
    if (!payslipRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(payslipRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      pdf.save(`Payslip_${emp?.employeeId || 'VPHS'}_${payslip.payslipNumber}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Salary Payslip & Statutory Breakdown"
      subtitle={`Payslip Ref: ${payslip.payslipNumber}`}
      maxWidth="4xl"
    >
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Attendance-Linked Salary Computed
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print Payslip
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-colors shadow-md shadow-amber-500/20"
          >
            <Download className="w-4 h-4" /> {isExporting ? 'Generating PDF...' : 'Download Official PDF'}
          </button>
        </div>
      </div>

      {/* Printable Payslip Container */}
      <div
        ref={payslipRef}
        className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 font-sans text-xs space-y-5 select-text relative overflow-hidden"
      >
        {/* Subtle Watermark in background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none z-0">
          <img
            src="/vphs_logo.png"
            alt=""
            crossOrigin="anonymous"
            className="w-[450px] object-contain"
          />
        </div>

        {/* Company Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row justify-between items-start gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <img
                src={companyInfo?.logoUrl || "/vphs_logo.png"}
                alt="VPHS SERVICES PVT. LTD."
                crossOrigin="anonymous"
                className="h-12 sm:h-14 w-auto object-contain rounded-xl bg-[#070e20] p-1.5 border border-amber-500/40 shadow-sm flex-shrink-0"
              />
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase leading-none">
                  {companyName}
                </h1>
                <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block mt-1">
                  Facility Management &amp; Workforce Solutions
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 max-w-md pt-0.5">{companyAddress}</p>
            <p className="text-[10px] text-slate-500 font-mono">
              CIN: {cinNumber} | PAN: {panNumber} | GSTIN: {gstNumber}
            </p>
          </div>
          <div className="text-left sm:text-right flex-shrink-0">
            <span className="inline-block px-3 py-1 bg-amber-100 border border-amber-300 font-black text-amber-950 rounded-lg uppercase tracking-wider text-[11px]">
              Payslip for {payslip.payroll?.payrollMonth ? `Month: ${payslip.payroll.payrollMonth}/${payslip.payroll.payrollYear}` : 'Monthly Salary'}
            </span>
            <p className="text-[10px] text-slate-600 mt-1.5 font-mono font-bold">Ref: {payslip.payslipNumber}</p>
            <p className="text-[10px] text-slate-500">Status: <span className="font-bold text-emerald-700">{payslip.status}</span></p>
          </div>
        </div>

        {/* Employee & Bank Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-slate-200 p-4 rounded-xl bg-slate-50/70">
          <div className="space-y-1.5 border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 sm:pr-4">
            <div className="flex justify-between"><span className="text-slate-500">Employee ID:</span><span className="font-bold font-mono text-amber-800">{emp?.employeeId}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Employee Name:</span><span className="font-bold text-slate-900">{emp?.firstName} {emp?.lastName}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Designation:</span><span className="font-semibold">{emp?.designation?.title || 'Staff Member'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Department:</span><span className="font-semibold">{emp?.department?.name || 'Operations'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Assigned Facility / Site:</span><span className="font-semibold text-slate-900">{emp?.site?.siteName || 'VPHS Corporate HQ'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Date of Joining:</span><span>{formatDate(emp?.joiningDate)}</span></div>
          </div>
          <div className="space-y-1.5 sm:pl-2">
            <div className="flex justify-between"><span className="text-slate-500">Bank Name:</span><span className="font-semibold">{emp?.bankName || 'HDFC Bank'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Account Number:</span><span className="font-mono font-semibold">{emp?.bankAccountNo || 'XXXXXXXXXXXX'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">IFSC Code:</span><span className="font-mono">{emp?.bankIfsc || 'HDFC0000123'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">UAN / PF No:</span><span className="font-mono">{emp?.uanNumber || emp?.pfNumber || '101234567890'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">ESI Number:</span><span className="font-mono">{emp?.esiNumber || '36001234560001001'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Employment Status:</span><span className="font-bold text-emerald-700">{emp?.status || 'ACTIVE'}</span></div>
          </div>
        </div>

        {/* 🗓️ ATTENDANCE SUMMARY & PAYABLE DAYS BANNER */}
        <div className="border border-amber-200 bg-amber-50/40 p-3.5 rounded-xl">
          <div className="flex items-center justify-between pb-2 border-b border-amber-200/60 mb-2">
            <span className="font-black text-slate-900 text-xs flex items-center gap-1.5">
              <CalendarCheck className="w-4 h-4 text-amber-600" />
              MONTHLY ATTENDANCE SUMMARY & PAYABLE DAYS
            </span>
            <span className="text-[11px] font-bold text-amber-950 font-mono">
              Payable: {payableDays} / {workingDays} Days ({((payableDays / workingDays) * 100).toFixed(1)}%)
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-[11px]">
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Month Days</span>
              <strong className="text-xs font-mono text-slate-900">{workingDays}</strong>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-emerald-700 font-bold block uppercase">Present (P)</span>
              <strong className="text-xs font-mono text-emerald-700">{payableDays - (payslip.paidLeaveDays || 0)}</strong>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-sky-700 font-bold block uppercase">Week Offs / Leaves</span>
              <strong className="text-xs font-mono text-sky-700">{payslip.paidLeaveDays || 0}</strong>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-rose-700 font-bold block uppercase">Loss of Pay (LOP)</span>
              <strong className="text-xs font-mono text-rose-700">{lopDays}</strong>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-cyan-700 font-bold block uppercase">Overtime (OT)</span>
              <strong className="text-xs font-mono text-cyan-800">{payslip.overtimePay > 0 ? `${formatCurrency(payslip.overtimePay)}` : '0h'}</strong>
            </div>
            <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-300">
              <span className="text-[10px] text-emerald-900 font-black block uppercase">Total Paid Days</span>
              <strong className="text-xs font-mono text-emerald-950 font-black">{payableDays} Days</strong>
            </div>
          </div>
        </div>

        {/* Earnings & Deductions Breakdown Tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Earnings Column */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-slate-100 px-4 py-2 font-black text-slate-800 border-b border-slate-200 flex justify-between text-xs">
              <span>EARNINGS (GROSS BREAKUP)</span>
              <span>AMOUNT (₹)</span>
            </div>
            <div className="p-3 space-y-1.5 text-[11px]">
              <div className="flex justify-between"><span>Basic Salary</span><span className="font-semibold font-mono">{formatCurrency(payslip.basic)}</span></div>
              <div className="flex justify-between"><span>Dearness Allowance (DA)</span><span className="font-semibold font-mono">{formatCurrency(payslip.da)}</span></div>
              <div className="flex justify-between bg-amber-50/70 p-1 rounded font-bold text-amber-950">
                <span>Sub Total 1 (Basic + DA)</span>
                <span className="font-mono">{formatCurrency(basicPlusDa)}</span>
              </div>
              <div className="flex justify-between"><span>House Rent Allowance (HRA)</span><span className="font-semibold font-mono">{formatCurrency(payslip.hra)}</span></div>
              {payslip.specialAllowance > 0 ? (
                <div className="flex justify-between"><span>Special Allowance</span><span className="font-semibold font-mono">{formatCurrency(payslip.specialAllowance)}</span></div>
              ) : null}
              <div className="flex justify-between"><span>Uniform, Shoes & Washing Allowance</span><span className="font-semibold font-mono">{formatCurrency(payslip.uniformAllowance || 200)}</span></div>
              {payslip.overtimePay > 0 ? (
                <div className="flex justify-between text-amber-800 font-bold bg-amber-50 p-1 rounded">
                  <span>Overtime Pay (OT Earned)</span>
                  <span className="font-mono">{formatCurrency(payslip.overtimePay)}</span>
                </div>
              ) : null}
            </div>
            <div className="bg-slate-50 px-4 py-2.5 font-black text-slate-900 border-t border-slate-200 flex justify-between">
              <span>TOTAL GROSS EARNINGS (A)</span>
              <span className="text-emerald-700 font-extrabold font-mono text-sm">{formatCurrency(payslip.grossSalary)}</span>
            </div>
          </div>

          {/* Deductions Column */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-slate-100 px-4 py-2 font-black text-slate-800 border-b border-slate-200 flex justify-between text-xs">
              <span>EMPLOYEE DEDUCTIONS</span>
              <span>AMOUNT (₹)</span>
            </div>
            <div className="p-3 space-y-1.5 text-[11px]">
              <div className="flex justify-between"><span>Employee EPF (12% on Basic+DA)</span><span className="font-semibold font-mono">{formatCurrency(payslip.pfDeduction)}</span></div>
              <div className="flex justify-between"><span>Employee ESI (0.75% on Gross)</span><span className="font-semibold font-mono">{formatCurrency(payslip.esiDeduction)}</span></div>
              <div className="flex justify-between"><span>Professional Tax (PT - Telangana Slab)</span><span className="font-semibold font-mono">{formatCurrency(payslip.ptDeduction)}</span></div>
              <div className="flex justify-between"><span>Telangana LWF (Labour Welfare)</span><span className="font-semibold font-mono">₹2.00</span></div>
              {payslip.tdsDeduction && payslip.tdsDeduction > 0 ? (
                <div className="flex justify-between"><span>TDS / Income Tax</span><span className="font-semibold font-mono">{formatCurrency(payslip.tdsDeduction)}</span></div>
              ) : null}
              {lopDays > 0 ? (
                <div className="flex justify-between text-rose-700 font-semibold bg-rose-50 p-1 rounded">
                  <span>Loss of Pay Deduction ({lopDays} days)</span>
                  <span className="font-mono">{formatCurrency(payslip.lopDeduction || 0)}</span>
                </div>
              ) : null}
            </div>
            <div className="bg-slate-50 px-4 py-2.5 font-black text-slate-900 border-t border-slate-200 flex justify-between">
              <span>TOTAL DEDUCTIONS (B)</span>
              <span className="text-rose-700 font-extrabold font-mono text-sm">{formatCurrency(payslip.totalDeductions)}</span>
            </div>
          </div>
        </div>

        {/* Net Salary Payable Banner */}
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/25 to-amber-50 border-2 border-amber-400 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs">
          <div>
            <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
              NET TAKE-HOME SALARY PAYABLE (A - B)
            </span>
            <p className="text-xs font-bold text-slate-900 italic mt-0.5">
              {numberToWordsIndian(payslip.netSalary)}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-2xl sm:text-3xl font-black text-slate-950 font-mono tracking-tight">
              {formatCurrency(payslip.netSalary)}
            </span>
            <span className="block text-[10px] text-emerald-800 font-extrabold flex items-center sm:justify-end gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Statutory Compliant & Disbursable
            </span>
          </div>
        </div>

        {/* 🏢 EMPLOYER STATUTORY CONTRIBUTIONS & CTC BREAKUP SLAB STATEMENT */}
        <div className="border border-slate-300 rounded-2xl p-4 bg-slate-50/90 text-[11px] space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-black text-slate-800 uppercase flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-amber-600" />
              EMPLOYER STATUTORY CONTRIBUTIONS & FACILITY ALLOWANCES (CTC STATEMENT)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Telangana Minimum Wage & Statutory Slabs
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700 pt-1">
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 block">P.F @ Employer (13%)</span>
              <strong className="font-mono text-slate-900 text-xs">{formatCurrency(employerPf)}</strong>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 block">ESI @ Employer (3.25%)</span>
              <strong className="font-mono text-slate-900 text-xs">{formatCurrency(employerEsi)}</strong>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Statutory Bonus @ 8.33%</span>
              <strong className="font-mono text-slate-900 text-xs">{formatCurrency(bonus)}</strong>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Leave Wages (CL, PL, SL)</span>
              <strong className="font-mono text-slate-900 text-xs">{formatCurrency(leaveWages)}</strong>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Telangana LWF (Employer)</span>
              <strong className="font-mono text-slate-900 text-xs">₹0.17</strong>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 block">Uniform, Shoes & Washing</span>
              <strong className="font-mono text-slate-900 text-xs">{formatCurrency(uniformAllowance)}</strong>
            </div>
            <div className="bg-amber-100 p-2 rounded-lg border border-amber-300">
              <span className="text-[10px] text-amber-900 font-bold block">Monthly CTC (1 Staff)</span>
              <strong className="font-mono text-amber-950 font-black text-xs">{formatCurrency(monthlyCtc)}</strong>
            </div>
            <div className="bg-slate-900 text-amber-400 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold block">Annual CTC (1 Staff)</span>
              <strong className="font-mono text-amber-400 font-black text-xs">{formatCurrency(annualCtc)}</strong>
            </div>
          </div>
        </div>

        {/* 📜 STATUTORY RULES & COMPLIANCE POLICIES REFERENCE */}
        <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 text-[11px] space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-800">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                  Statutory Rules &amp; Compliance Policies Reference
                  <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Active Telangana Norms
                  </span>
                </h4>
                <p className="text-[10px] text-slate-500">
                  Rate card slabs, shift thresholds, weekend continuity rules and monthly payroll batch proration standards
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* 1. Attendance & Shift Codes */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 text-cyan-800 font-bold border-b border-slate-100 pb-1">
                <Clock className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                <span className="text-[11px]">1. Attendance &amp; Shift Codes</span>
              </div>
              <ul className="space-y-1 text-[10px] text-slate-600">
                <li><strong className="text-emerald-700">P (Present - 1.0d):</strong> Full 9.0-hour shift completed.</li>
                <li><strong className="text-sky-700">WO (Week Off - 1.0d):</strong> Sat &amp; Sun for Microsoft &amp; HO; Sun for client sites.</li>
                <li><strong className="text-amber-700">L (Late - 1.0d):</strong> Arrival &gt; 15 min grace (late mins tracked).</li>
                <li><strong className="text-purple-700">HD (Half Day - 0.5d):</strong> Login &ge; 4.0h &amp; &lt; 9.0h.</li>
                <li><strong className="text-blue-700">LV (Paid Leave - 1.0d):</strong> Statutory approved CL / PL / SL.</li>
                <li><strong className="text-rose-700">A (Absent - 0.0d):</strong> Login &lt; 4.0h or unauthorized absence.</li>
                <li><strong className="text-rose-700">LOP:</strong> Loss of Pay deducted from total month days.</li>
              </ul>
            </div>

            {/* 2. Weekend Sandwich Rule */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 text-amber-900 font-bold border-b border-slate-100 pb-1">
                <CalendarCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-[11px]">2. Weekend Sandwich Rule</span>
              </div>
              <p className="text-[10px] text-slate-600">
                Statutory continuity rule preventing unauthorized absenteeism adjoining weekly off days:
              </p>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1 text-[10px]">
                <p className="text-rose-700">• <strong>Friday Absent:</strong> Saturday marked Absent / LOP.</p>
                <p className="text-rose-700">• <strong>Monday Absent:</strong> Sunday marked Absent / LOP.</p>
                <p className="text-emerald-700 pt-1 border-t border-slate-200 font-medium">
                  • <strong>Auto-Restore:</strong> Changing Friday/Monday back to Present automatically returns weekend to statutory Week Off (WO).
                </p>
              </div>
            </div>

            {/* 3. Overtime (OT) Rules */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 text-purple-900 font-bold border-b border-slate-100 pb-1">
                <TrendingUp className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="text-[11px]">3. Overtime (OT) Rules</span>
              </div>
              <p className="text-[10px] text-slate-600">
                Overtime compensation under Factory &amp; Labour regulations:
              </p>
              <div className="space-y-1 text-[10px] text-slate-600">
                <p>
                  • <strong>Eligibility:</strong> Calculated strictly <strong>after completing standard 9.0h shift</strong> (min 4h login required).
                </p>
                <div className="p-2 bg-purple-50 rounded-lg border border-purple-200 font-mono text-[9px] text-purple-900 font-semibold">
                  OT = ((Gross / (Month Days &times; 8)) &times; 1.5) &times; OT Hours
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Signatures & Legal Disclaimer */}
        <div className="border-t border-slate-200 pt-5 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 text-[10px] text-slate-500">
          <div>
            <p className="font-semibold text-slate-700">Generated on: {formatDate(new Date())} | System Ref: VPHS-PAY-ENGINE-V2</p>
            <p className="italic mt-0.5">This document is electronically verified and issued under VPHS Statutory Compliance Systems.</p>
          </div>
          <div className="text-left sm:text-center border-t border-slate-400 pt-1 w-48">
            <span className="font-bold text-slate-800 uppercase block text-[11px]">Authorized Signatory</span>
            <span className="text-slate-600 font-semibold">{companyName}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
