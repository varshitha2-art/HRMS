import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Building2,
  Clock,
  Receipt,
  Bell,
  Save,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import api from '../services/api';
import { useNotifications } from '../contexts/NotificationContext';

export const SettingsPage: React.FC = () => {
  const { showToast } = useNotifications();

  const [activeTab, setActiveTab] = useState<'company' | 'attendance' | 'payroll' | 'notifications'>('company');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // States
  const [companySettings, setCompanySettings] = useState<any>({
    companyName: 'VPHS Services Pvt. Ltd.',
    tagline: 'Facility Management & Enterprise HR Automation Portal',
    address: 'Plot No. 42, Hitech City, Madhapur, Hyderabad, Telangana - 500081',
    phone: '+91 40 4567 8900',
    email: 'contact@vphs.in',
    website: 'https://vphs.in',
    gstNumber: '36AABCV1234F1Z8',
    panNumber: 'AABCV1234F',
    cinNumber: 'U74999TG2020PTC145678',
    bankDetails: 'HDFC Bank Ltd. | A/C: 50200087654321 | IFSC: HDFC0000123',
  });

  const [attendanceSettings, setAttendanceSettings] = useState<any>({
    defaultShiftStart: '09:30',
    defaultShiftEnd: '18:30',
    defaultGracePeriodMins: 15,
    minHoursHalfDay: 4.5,
    minHoursFullDay: 9.0,
    overtimeThresholdHours: 9.0,
    overtimeRateMultiplier: 1.5,
    autoMarkAbsentAfterDays: 3,
    allowLatePunchApproval: true,
  });

  const [payrollSettings, setPayrollSettings] = useState<any>({
    basicPercentOfCtc: 50.0,
    daPercentOfBasic: 10.0,
    hraPercentOfBasic: 40.0,
    pfPercentOfBasic: 12.0,
    esiPercentOfGross: 0.75,
    esiGrossLimit: 21000.0,
    ptSlabMonthly: 200.0,
    standardWorkingDaysPerMonth: 30,
    pfEligibleCap: 15000.0,
  });

  const [notificationsToggle, setNotificationsToggle] = useState({
    emailAlerts: false,
    smsAlerts: false,
    whatsappAlerts: false,
    documentExpiryAlerts: true,
    lateArrivalAlerts: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res: any = await api.get('/settings');
      if (res.success && res.data) {
        if (res.data.company) setCompanySettings(res.data.company);
        if (res.data.attendance) setAttendanceSettings(res.data.attendance);
        if (res.data.payroll) setPayrollSettings(res.data.payroll);
      }
    } catch (err: any) {
      showToast('Using standard system defaults', 'info');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/settings/company', companySettings);
      showToast('Company profile updated successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update company settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/settings/attendance', {
        ...attendanceSettings,
        defaultGracePeriodMins: parseInt(attendanceSettings.defaultGracePeriodMins, 10),
        minHoursHalfDay: parseFloat(attendanceSettings.minHoursHalfDay),
        minHoursFullDay: parseFloat(attendanceSettings.minHoursFullDay),
        overtimeThresholdHours: parseFloat(attendanceSettings.overtimeThresholdHours),
      });
      showToast('Attendance rules and grace period updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update attendance rules', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/settings/payroll', {
        ...payrollSettings,
        basicPercentOfCtc: parseFloat(payrollSettings.basicPercentOfCtc),
        daPercentOfBasic: parseFloat(payrollSettings.daPercentOfBasic),
        hraPercentOfBasic: parseFloat(payrollSettings.hraPercentOfBasic),
        pfPercentOfBasic: parseFloat(payrollSettings.pfPercentOfBasic),
        esiPercentOfGross: parseFloat(payrollSettings.esiPercentOfGross),
        esiGrossLimit: parseFloat(payrollSettings.esiGrossLimit),
        ptSlabMonthly: parseFloat(payrollSettings.ptSlabMonthly),
      });
      showToast('Payroll calculation percentage formulas updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update payroll rules', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-wide flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-amber-600" /> System Settings &amp; Calculation Engine
        </h1>
        <p className="text-xs text-slate-600 mt-1">
          Configure enterprise company identity, statutory percentages, grace periods &amp; notification channels.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-3 text-xs">
        <button
          onClick={() => setActiveTab('company')}
          className={`pb-3 font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'company'
              ? 'border-amber-500 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" /> Company Profile &amp; Branding
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'attendance'
              ? 'border-amber-500 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" /> Attendance Rules &amp; Grace
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={`pb-3 font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'payroll'
              ? 'border-amber-500 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" /> Payroll &amp; Statutory Slabs
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'notifications'
              ? 'border-amber-500 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" /> Channels &amp; Integrations
        </button>
      </div>

      {/* TAB 1: COMPANY PROFILE */}
      {activeTab === 'company' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSaveCompany} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Company Legal Name</label>
                <input
                  type="text"
                  value={companySettings.companyName}
                  onChange={e => setCompanySettings({ ...companySettings, companyName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tagline / Subtitle</label>
                <input
                  type="text"
                  value={companySettings.tagline}
                  onChange={e => setCompanySettings({ ...companySettings, tagline: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Registered Corporate Address</label>
              <textarea
                rows={2}
                value={companySettings.address}
                onChange={e => setCompanySettings({ ...companySettings, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">GST Number</label>
                <input
                  type="text"
                  value={companySettings.gstNumber}
                  onChange={e => setCompanySettings({ ...companySettings, gstNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono uppercase focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">PAN Number</label>
                <input
                  type="text"
                  value={companySettings.panNumber}
                  onChange={e => setCompanySettings({ ...companySettings, panNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono uppercase focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Corporate CIN Number</label>
                <input
                  type="text"
                  value={companySettings.cinNumber}
                  onChange={e => setCompanySettings({ ...companySettings, cinNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-colors"
              >
                <Save className="w-4 h-4" /> Save Company Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: ATTENDANCE RULES */}
      {activeTab === 'attendance' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSaveAttendance} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Default Shift Start</label>
                <input
                  type="time"
                  value={attendanceSettings.defaultShiftStart}
                  onChange={e => setAttendanceSettings({ ...attendanceSettings, defaultShiftStart: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Default Shift End</label>
                <input
                  type="time"
                  value={attendanceSettings.defaultShiftEnd}
                  onChange={e => setAttendanceSettings({ ...attendanceSettings, defaultShiftEnd: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Grace Period (Minutes)</label>
                <input
                  type="number"
                  value={attendanceSettings.defaultGracePeriodMins}
                  onChange={e => setAttendanceSettings({ ...attendanceSettings, defaultGracePeriodMins: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-amber-800 font-mono font-bold focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Entry after this triggers LATE status</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Min Hours for Half Day</label>
                <input
                  type="number"
                  step="0.5"
                  value={attendanceSettings.minHoursHalfDay}
                  onChange={e => setAttendanceSettings({ ...attendanceSettings, minHoursHalfDay: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Min Hours for Full Day</label>
                <input
                  type="number"
                  step="0.5"
                  value={attendanceSettings.minHoursFullDay}
                  onChange={e => setAttendanceSettings({ ...attendanceSettings, minHoursFullDay: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Overtime Threshold (Hours)</label>
                <input
                  type="number"
                  step="0.5"
                  value={attendanceSettings.overtimeThresholdHours}
                  onChange={e => setAttendanceSettings({ ...attendanceSettings, overtimeThresholdHours: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-cyan-800 font-mono font-bold focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-colors"
              >
                <Save className="w-4 h-4" /> Save Attendance Engine Rules
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: PAYROLL PERCENTAGES */}
      {activeTab === 'payroll' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSavePayroll} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">Basic Salary (% of CTC)</label>
                <input
                  type="number"
                  value={payrollSettings.basicPercentOfCtc}
                  onChange={e => setPayrollSettings({ ...payrollSettings, basicPercentOfCtc: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-800 mb-1">Dearness Allowance (% of Basic)</label>
                <input
                  type="number"
                  value={payrollSettings.daPercentOfBasic}
                  onChange={e => setPayrollSettings({ ...payrollSettings, daPercentOfBasic: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-800 mb-1">HRA (% of Basic)</label>
                <input
                  type="number"
                  value={payrollSettings.hraPercentOfBasic}
                  onChange={e => setPayrollSettings({ ...payrollSettings, hraPercentOfBasic: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">PF Deduction (% on Basic)</label>
                <input
                  type="number"
                  value={payrollSettings.pfPercentOfBasic}
                  onChange={e => setPayrollSettings({ ...payrollSettings, pfPercentOfBasic: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-800 mb-1">ESI (% on Gross)</label>
                <input
                  type="number"
                  step="0.01"
                  value={payrollSettings.esiPercentOfGross}
                  onChange={e => setPayrollSettings({ ...payrollSettings, esiPercentOfGross: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-800 mb-1">Professional Tax (₹ / Month)</label>
                <input
                  type="number"
                  value={payrollSettings.ptSlabMonthly}
                  onChange={e => setPayrollSettings({ ...payrollSettings, ptSlabMonthly: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Statutory Slabs & Facility Allowances */}
            <div className="pt-3 border-t border-slate-200">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-3">
                Telangana & Statutory Facility Slabs
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Statutory Bonus (% of Basic+DA)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={payrollSettings.bonusPercent || 8.33}
                    onChange={e => setPayrollSettings({ ...payrollSettings, bonusPercent: parseFloat(e.target.value) || 8.33 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-600 mt-0.5 block">Payment of Bonus Act (8.33%)</span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Telangana LWF - Employer (₹ / mo)</label>
                  <input
                    type="number"
                    value={payrollSettings.telanganaLwfEmployer || 5.0}
                    onChange={e => setPayrollSettings({ ...payrollSettings, telanganaLwfEmployer: parseFloat(e.target.value) || 5.0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-600 mt-0.5 block">Telangana Labour Welfare Fund</span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Telangana LWF - Employee (₹ / mo)</label>
                  <input
                    type="number"
                    value={payrollSettings.telanganaLwfEmployee || 2.0}
                    onChange={e => setPayrollSettings({ ...payrollSettings, telanganaLwfEmployee: parseFloat(e.target.value) || 2.0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-600 mt-0.5 block">Employee Monthly LWF</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Uniform, Shoes & Washing Allowance (₹ / mo)</label>
                  <input
                    type="number"
                    value={payrollSettings.uniformAllowanceDefault || 1000.0}
                    onChange={e => setPayrollSettings({ ...payrollSettings, uniformAllowanceDefault: parseFloat(e.target.value) || 1000.0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-teal-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-600 mt-0.5 block">Facility Staff Uniform & Maintenance</span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Leave Wages - CL, PL, SL (₹ / mo)</label>
                  <input
                    type="number"
                    value={payrollSettings.leaveWagesMonthlyDefault || 500.0}
                    onChange={e => setPayrollSettings({ ...payrollSettings, leaveWagesMonthlyDefault: parseFloat(e.target.value) || 500.0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-teal-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-600 mt-0.5 block">Statutory Paid Leave Encashment / Wages</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-md shadow-amber-500/10 flex items-center gap-1.5 transition-all"
              >
                <Save className="w-4 h-4" /> Save Statutory Slabs & Formulas
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: NOTIFICATIONS & STANDALONE SWITCHES */}
      {activeTab === 'notifications' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Notification Triggers & Channels</h3>
            <p className="text-slate-600">
              Core internal notification feeds operate 100% offline without external services.
            </p>
          </div>

          <div className="divide-y divide-slate-200">
            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 block">Document Expiry Alerts (30-day warning)</span>
                <span className="text-[11px] text-slate-600">Notifies HR when Aadhaar/Passbook is nearing expiration</span>
              </div>
              <input
                type="checkbox"
                checked={notificationsToggle.documentExpiryAlerts}
                onChange={e => setNotificationsToggle({ ...notificationsToggle, documentExpiryAlerts: e.target.checked })}
                className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 block">Late Check-in Notifications</span>
                <span className="text-[11px] text-slate-600">Flags shifts punched past the 15-min grace period</span>
              </div>
              <input
                type="checkbox"
                checked={notificationsToggle.lateArrivalAlerts}
                onChange={e => setNotificationsToggle({ ...notificationsToggle, lateArrivalAlerts: e.target.checked })}
                className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 block">External Email Delivery (SMTP)</span>
                <span className="text-[11px] text-slate-500">Optional SMTP gateway (Currently Disabled)</span>
              </div>
              <input
                type="checkbox"
                checked={notificationsToggle.emailAlerts}
                onChange={e => setNotificationsToggle({ ...notificationsToggle, emailAlerts: e.target.checked })}
                className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 block">WhatsApp Business Notifications</span>
                <span className="text-[11px] text-slate-500">Optional WhatsApp Cloud API (Currently Disabled)</span>
              </div>
              <input
                type="checkbox"
                checked={notificationsToggle.whatsappAlerts}
                onChange={e => setNotificationsToggle({ ...notificationsToggle, whatsappAlerts: e.target.checked })}
                className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
