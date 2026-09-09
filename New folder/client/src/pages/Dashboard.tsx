import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  CalendarCheck,
  UserX,
  Clock,
  CalendarOff,
  FileClock,
  Receipt,
  FileWarning,
  UserPlus,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  Building,
  CheckCircle,
  FolderLock,
  UserCheck,
  CalendarDays,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  LogIn,
  LogOut,
  Timer,
  Compass,
  Sparkles,
  LocateFixed,
  AlertTriangle,
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { SkeletonCards } from '../components/common/SkeletonLoader';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPunching, setIsPunching] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchDashboardSummary();
  }, [user]);

  const fetchDashboardSummary = async () => {
    try {
      setLoading(true);
      const res: any = await api.get('/dashboard/summary');
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const [deviceCoords, setDeviceCoords] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [geoState, setGeoState] = useState<'IDLE' | 'ACQUIRING' | 'READY' | 'DENIED'>('IDLE');

  const getDeviceCoordinates = (): Promise<{ latitude: number; longitude: number; accuracy?: number }> => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        setGeoState('DENIED');
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }
      setGeoState('ACQUIRING');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setDeviceCoords(coords);
          setGeoState('READY');
          resolve(coords);
        },
        (err) => {
          setGeoState('DENIED');
          let msg = 'Unable to retrieve your location.';
          if (err.code === 1) msg = 'Location access denied. Please enable location permissions on your browser to punch.';
          else if (err.code === 2) msg = 'Location unavailable. Please verify GPS/location service is active.';
          else if (err.code === 3) msg = 'Location request timed out. Please retry.';
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDeviceCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          setGeoState('READY');
        },
        () => {
          setGeoState('DENIED');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  const handleEmployeePunchIn = async () => {
    setIsPunching(true);
    try {
      let coords;
      try {
        coords = await getDeviceCoordinates();
      } catch (geoErr: any) {
        showToast(geoErr.message || 'GPS location is required to punch in', 'error');
        return;
      }

      const res: any = await api.post('/attendance/punch-in', {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      });

      if (res.success) {
        const lateMins = res.data?.lateMinutes || 0;
        const dist = res.data?.geoVerification ? ` (${Math.round(res.data.geoVerification.distanceMeters)}m from site)` : '';
        if (lateMins > 0) {
          showToast(`⚠️ Punched IN: Marked LATE (${lateMins} mins late)${dist}`, 'warning');
        } else {
          showToast(`✅ Punched IN: Marked PRESENT${dist}`, 'success');
        }
        fetchDashboardSummary();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to punch in', 'error');
    } finally {
      setIsPunching(false);
    }
  };

  const handleEmployeePunchOut = async () => {
    setIsPunching(true);
    try {
      let coords;
      try {
        coords = await getDeviceCoordinates();
      } catch (geoErr: any) {
        showToast(geoErr.message || 'GPS location is required to punch out', 'error');
        return;
      }

      const res: any = await api.post('/attendance/punch-out', {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      });

      if (res.success) {
        const hrs = res.data?.workingHours || 0;
        const ot = res.data?.overtimeHours || 0;
        const dist = res.data?.geoVerification ? ` (${Math.round(res.data.geoVerification.distanceMeters)}m from site)` : '';
        showToast(`🏁 Punched OUT successfully${dist}: ${hrs} hrs logged${ot > 0 ? ` (+${ot} hrs OT)` : ''}`, 'success');
        fetchDashboardSummary();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to punch out', 'error');
    } finally {
      setIsPunching(false);
    }
  };

  const COLORS = ['#f59e0b', '#06b6d4', '#10b981', '#8b5cf6', '#ec4899', '#3b82f6'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 rounded w-1/4 animate-pulse" />
        <SkeletonCards count={8} />
      </div>
    );
  }

  const role = data?.role || user?.role || 'EMPLOYEE';
  const metrics = data?.metrics || {};
  const charts = data?.charts || {};
  const recentActivity = data?.recentActivity || [];

  // =========================================================================
  // 1. EMPLOYEE DASHBOARD VIEW
  // =========================================================================
  if (role === 'EMPLOYEE') {
    const empUser = data?.user || user?.employee || {};
    const leaveBalances = data?.leaveBalances || [];
    const recentAttendances = data?.recentAttendances || [];
    const documents = data?.documents || [];

    return (
      <div className="space-y-6">
        {/* Welcome Profile Banner */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center font-bold text-amber-800 text-2xl shadow-sm flex-shrink-0">
              {empUser.name ? empUser.name[0] : user?.username?.[0]?.toUpperCase() || 'E'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                  STAFF EMPLOYEE PORTAL
                </span>
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                  {empUser.employeeId || user?.employeeId}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {empUser.name || `${user?.employee?.firstName} ${user?.employee?.lastName}`}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {empUser.designation} • {empUser.department} • {empUser.site} ({empUser.shift})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => navigate('/attendance')}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <CalendarCheck className="w-4 h-4" /> My Attendance
            </button>
            <button
              onClick={() => navigate('/leaves')}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1.5"
            >
              <CalendarDays className="w-4 h-4 text-amber-700" /> Apply Leave
            </button>
          </div>
        </div>

        {/* ⚡ DIRECT SELF-SERVICE LIVE PUNCH IN / PUNCH OUT CONSOLE */}
        <div className="bg-gradient-to-br from-white via-amber-50/20 to-slate-50 border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-amber-600" />
                <span className="font-extrabold text-sm text-slate-900 tracking-wide uppercase">
                  Direct Live Shift Punch
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  geoState === 'READY'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : geoState === 'ACQUIRING'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${geoState === 'READY' ? 'bg-emerald-500 animate-pulse' : geoState === 'ACQUIRING' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                  {geoState === 'READY' ? `📍 GPS Active (${deviceCoords?.latitude.toFixed(4)}, ${deviceCoords?.longitude.toFixed(4)})` : geoState === 'ACQUIRING' ? 'Acquiring GPS...' : 'GPS Required'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Assigned Site: <strong>{empUser.site || 'Client Site'}</strong> • Mandatory Geofence: Punches accepted only when physically at this site.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-2xl flex items-center gap-2 shadow-xs">
                <Timer className="w-4 h-4 text-amber-600" />
                <span className="font-mono font-black text-slate-900 text-sm">{currentTime}</span>
                <span className="text-[10px] text-slate-400 font-bold">IST</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-2xl">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Today's In-Time</span>
                <span className="font-mono font-black text-slate-900 text-sm">{metrics.todayPunchIn || '--:--'}</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-2xl">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Today's Out-Time</span>
                <span className="font-mono font-black text-slate-900 text-sm">{metrics.todayPunchOut || '--:--'}</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-2xl">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Status</span>
                <span className={`font-black text-xs ${metrics.todayStatus === 'PRESENT' ? 'text-emerald-700' : metrics.todayStatus === 'LATE' ? 'text-amber-700' : 'text-slate-500'}`}>
                  {metrics.todayStatus || 'NOT PUNCHED'}
                </span>
              </div>
            </div>

            {/* Direct 1-Click Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleEmployeePunchIn}
                disabled={isPunching}
                className="flex-1 sm:flex-initial px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs rounded-2xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Punch In (Present)</span>
              </button>

              <button
                onClick={handleEmployeePunchOut}
                disabled={isPunching}
                className="flex-1 sm:flex-initial px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-black text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4 text-white" />
                <span>Direct Punch Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Employee KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="My Monthly Attendance"
            value={metrics.myAttendance || '0/0 Days'}
            subtitle={`Attendance Rate: ${metrics.myAttendanceRate || '100%'}`}
            icon={<CalendarCheck className="w-5 h-5" />}
            color="emerald"
            onClick={() => navigate('/attendance')}
          />

          <StatCard
            title="My Leave Balance"
            value={metrics.myLeaveBalance || '0 Days'}
            subtitle="Casual, Sick & Earned leaves"
            icon={<CalendarDays className="w-5 h-5" />}
            color="gold"
            onClick={() => navigate('/leaves')}
          />

          <StatCard
            title="Today's Punch Status"
            value={metrics.todayStatus || 'NOT_MARKED'}
            subtitle={`In: ${metrics.todayPunchIn || '--:--'} • Out: ${metrics.todayPunchOut || '--:--'}`}
            icon={<Clock className="w-5 h-5" />}
            color={metrics.todayStatus === 'PRESENT' ? 'emerald' : 'rose'}
            onClick={() => navigate('/attendance')}
          />

          <StatCard
            title="My Verified Documents"
            value={metrics.myDocumentsCount || documents.length || 0}
            subtitle="Aadhaar, PAN, Bank Proof & ID"
            icon={<FolderLock className="w-5 h-5" />}
            color="cyan"
            onClick={() => navigate('/documents')}
          />
        </div>

        {/* Details Row: Latest Payslip & Leave Balances */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Latest Payslip Card */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 tracking-wide flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" /> Latest Processed Payslip
              </h3>
              <button
                onClick={() => navigate('/payroll')}
                className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1"
              >
                View All Payslips <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {metrics.latestPayslip ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Payroll Period:</span>
                  <span className="text-xs font-bold text-slate-900 font-mono">{metrics.latestPayslip.month}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">Gross Earnings:</span>
                  <span className="text-xs font-bold text-slate-700 font-mono">{formatCurrency(metrics.latestPayslip.grossSalary)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-sm font-bold text-slate-900">Net Take-Home Salary:</span>
                  <span className="text-base font-extrabold text-emerald-700 font-mono">{formatCurrency(metrics.latestPayslip.netSalary)}</span>
                </div>
                <div className="pt-2">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    STATUS: {metrics.latestPayslip.status}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No past payslips processed yet for this account.
              </div>
            )}
          </div>

          {/* Leave Balances Breakdown */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 tracking-wide flex items-center gap-2">
                <CalendarOff className="w-4 h-4 text-amber-600" /> Leave Balance Breakdown (2026)
              </h3>
              <button
                onClick={() => navigate('/leaves')}
                className="text-xs text-amber-700 hover:text-amber-800 font-semibold"
              >
                Apply Leave
              </button>
            </div>

            <div className="space-y-2.5">
              {leaveBalances.map((lb: any) => (
                <div key={lb.code} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{lb.type} ({lb.code})</span>
                    <span className="text-[11px] text-slate-500 block">Allocated: {lb.allocated} days • Used: {lb.used} days</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold font-mono text-amber-700">{lb.remaining} Days</span>
                    <span className="text-[10px] text-slate-400 block">Available</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. SUPERVISOR DASHBOARD VIEW
  // =========================================================================
  if (role === 'SUPERVISOR') {
    const teamMembers = data?.teamMembers || [];

    return (
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-200">
                FIELD SUPERVISOR PORTAL
              </span>
              <span className="text-xs text-slate-500">• {formatDate(new Date())}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Welcome, {user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : 'Supervisor'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Managing team attendance, shift allocations, daily punch logs, and leave recommendations.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => navigate('/attendance')}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <CalendarCheck className="w-4 h-4" /> Team Attendance
            </button>
            <button
              onClick={() => navigate('/leaves')}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1.5"
            >
              <FileClock className="w-4 h-4 text-amber-700" /> Pending Leaves ({metrics.pendingLeaves || 0})
            </button>
          </div>
        </div>

        {/* Supervisor KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="My Team Members"
            value={metrics.myTeam || 0}
            subtitle="Reporting directly to you"
            icon={<Users className="w-5 h-5" />}
            color="gold"
            onClick={() => navigate('/employees')}
          />

          <StatCard
            title="Present Today"
            value={metrics.presentToday || 0}
            subtitle="Staff on duty"
            icon={<CalendarCheck className="w-5 h-5" />}
            color="emerald"
            onClick={() => navigate('/attendance')}
          />

          <StatCard
            title="Absent Today"
            value={metrics.absentToday || 0}
            subtitle="Unscheduled absences"
            icon={<UserX className="w-5 h-5" />}
            color="rose"
            onClick={() => navigate('/attendance')}
          />

          <StatCard
            title="Late Today"
            value={metrics.lateToday || 0}
            subtitle="Punch-in past grace period"
            icon={<Clock className="w-5 h-5" />}
            color="gold"
            onClick={() => navigate('/attendance')}
          />

          <StatCard
            title="On Leave Today"
            value={metrics.onLeaveToday || 0}
            subtitle="Approved team leaves"
            icon={<CalendarOff className="w-5 h-5" />}
            color="cyan"
            onClick={() => navigate('/leaves')}
          />
        </div>

        {/* Team Members List */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 tracking-wide flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" /> Assigned Team Workforce
            </h3>
            <button
              onClick={() => navigate('/employees')}
              className="text-xs text-amber-700 hover:text-amber-800 font-semibold"
            >
              View Full Team
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {teamMembers.map((tm: any) => (
              <div key={tm.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-300 flex items-center justify-center font-bold text-blue-800 text-xs flex-shrink-0">
                  {tm.firstName[0]}{tm.lastName[0]}
                </div>
                <div className="truncate">
                  <span className="font-bold text-xs text-slate-900 block truncate">
                    {tm.firstName} {tm.lastName}
                  </span>
                  <span className="text-[11px] font-mono text-amber-700 font-semibold block">
                    {tm.employeeId}
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    {tm.designation?.title} • {tm.site?.siteName}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. SITE MANAGER DASHBOARD VIEW
  // =========================================================================
  if (role === 'SITE_MANAGER') {
    const assignedSites = data?.assignedSites || [];

    return (
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-cyan-800 uppercase tracking-wider bg-cyan-100 px-2.5 py-0.5 rounded-full border border-cyan-200">
                SITE MANAGER PORTAL
              </span>
              <span className="text-xs text-slate-500">• {formatDate(new Date())}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Welcome, {user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : 'Site Manager'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Assigned Sites Facility Operations: Microsoft Campus & Amazon Development Center
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => navigate('/sites')}
              className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <Building2 className="w-4 h-4" /> My Sites ({metrics.mySites || 0})
            </button>
            <button
              onClick={() => navigate('/attendance')}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <CalendarCheck className="w-4 h-4" /> Site Attendance
            </button>
          </div>
        </div>

        {/* Site Manager KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="My Assigned Sites"
            value={metrics.mySites || 0}
            subtitle="Microsoft & Amazon Campus"
            icon={<Building2 className="w-5 h-5" />}
            color="cyan"
            onClick={() => navigate('/sites')}
          />

          <StatCard
            title="Site Employees"
            value={metrics.myEmployees || 0}
            subtitle="Deployed at assigned sites"
            icon={<Users className="w-5 h-5" />}
            color="gold"
            onClick={() => navigate('/employees')}
          />

          <StatCard
            title="Present Today"
            value={metrics.todayPresent || 0}
            subtitle={`${metrics.todayLate || 0} Late Arrivals`}
            icon={<CalendarCheck className="w-5 h-5" />}
            color="emerald"
            onClick={() => navigate('/attendance')}
          />

          <StatCard
            title="Absent Today"
            value={metrics.todayAbsent || 0}
            subtitle="Unscheduled Absences"
            icon={<UserX className="w-5 h-5" />}
            color="rose"
            onClick={() => navigate('/attendance')}
          />

          <StatCard
            title="On Leave Today"
            value={metrics.todayLeave || 0}
            subtitle="Approved site leaves"
            icon={<CalendarOff className="w-5 h-5" />}
            color="gold"
            onClick={() => navigate('/leaves')}
          />
        </div>

        {/* Assigned Sites Details */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 tracking-wide mb-4 flex items-center gap-2">
            <Building className="w-4 h-4 text-cyan-600" /> Managed Facility Locations
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignedSites.map((site: any) => (
              <div key={site.name} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider bg-cyan-100 px-2 py-0.5 rounded border border-cyan-200">
                    CLIENT: {site.client}
                  </span>
                  <h4 className="text-base font-bold text-slate-900 mt-2">{site.name}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {site.location}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Stationed Personnel:</span>
                  <span className="font-bold font-mono text-slate-900 text-sm">{site.employees} Staff</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. SUPER ADMIN & HR ADMIN DASHBOARD VIEW
  // =========================================================================
  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
              {role.replace('_', ' ')} PORTAL
            </span>
            <span className="text-xs text-slate-500">• {formatDate(new Date())}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Welcome back, {user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user?.username}!
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Company-wide facility management overview, live biometric attendance, payroll batches & compliance health.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => navigate('/attendance')}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <CalendarCheck className="w-4 h-4" /> Today's Attendance
          </button>
          <button
            onClick={() => navigate('/employees')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4 text-amber-700" /> Manage Employees
          </button>
        </div>
      </div>

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Workforce"
          value={metrics.totalEmployees || 0}
          subtitle={`${metrics.activeEmployees || 0} Active • ${metrics.inactiveEmployees || 0} Inactive`}
          icon={<Users className="w-5 h-5" />}
          color="gold"
          onClick={() => navigate('/employees')}
        />

        <StatCard
          title="Active Sites"
          value={metrics.totalSites || 0}
          subtitle="Microsoft, TWC, Amazon & Corporate"
          icon={<Building2 className="w-5 h-5" />}
          color="cyan"
          onClick={() => navigate('/sites')}
        />

        <StatCard
          title="Today Present"
          value={metrics.todayPresent || 0}
          subtitle={`${metrics.todayLate || 0} Late check-ins recorded`}
          icon={<CalendarCheck className="w-5 h-5" />}
          color="emerald"
          trendType={metrics.todayLate > 0 ? 'negative' : 'positive'}
          trend={metrics.todayLate > 0 ? `${metrics.todayLate} Late` : 'On Time'}
          onClick={() => navigate('/attendance')}
        />

        <StatCard
          title="Today Absent / Leave"
          value={(metrics.todayAbsent || 0) + (metrics.todayLeave || 0)}
          subtitle={`${metrics.todayLeave || 0} Approved Leaves`}
          icon={<UserX className="w-5 h-5" />}
          color="rose"
          onClick={() => navigate('/attendance')}
        />
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Leaves"
          value={metrics.pendingLeaves || 0}
          subtitle="Requires HR / Supervisor approval"
          icon={<FileClock className="w-5 h-5" />}
          color="gold"
          onClick={() => navigate('/leaves')}
        />

        <StatCard
          title="Documents Expiring"
          value={metrics.expiringDocs || 0}
          subtitle="Aadhaar, PAN & Passbooks within 30d"
          icon={<FileWarning className="w-5 h-5" />}
          color="rose"
          trendType="negative"
          trend="Action Needed"
          onClick={() => navigate('/documents')}
        />

        <StatCard
          title="New Joiners (30d)"
          value={metrics.newJoiners || 0}
          subtitle="Recently onboarded personnel"
          icon={<UserPlus className="w-5 h-5" />}
          color="cyan"
          onClick={() => navigate('/employees')}
        />

        <StatCard
          title="Payroll Status"
          value={metrics.payrollStatus || 'DRAFT'}
          subtitle={metrics.latestPayroll ? `Net: ${formatCurrency(metrics.latestPayroll.totalNet)}` : 'No run yet'}
          icon={<Receipt className="w-5 h-5" />}
          color="emerald"
          onClick={() => navigate('/payroll')}
        />
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Attendance Trend Chart */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-wide flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-600" /> 7-Day Attendance Trend
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily present vs absent vs late check-in analytics across all sites
              </p>
            </div>
            <button
              onClick={() => navigate('/attendance')}
              className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1"
            >
              Roster View <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.attendanceTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="lateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="present" name="Present Staff" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#presentGrad)" />
                <Area type="monotone" dataKey="late" name="Late Arrivals" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#lateGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Site-wise Employee Breakdown */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-wide flex items-center gap-2">
              <Building className="w-4 h-4 text-cyan-600" /> Site Workforce Allocation
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Employees deployed per client site</p>
          </div>

          <div className="h-56 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.siteDistribution || []} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} width={90} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="employees" name="Employees" fill="#06b6d4" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <button
            onClick={() => navigate('/sites')}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-cyan-800 rounded-xl border border-slate-200 transition-colors text-center"
          >
            Manage Sites & Rosters
          </button>
        </div>
      </div>

      {/* Bottom Row: Department Distribution & Recent Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Department Distribution Pie */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 tracking-wide mb-1">
            Department-wise Workforce
          </h3>
          <p className="text-xs text-slate-500 mb-4">Facility, Housekeeping, Security, Valet & Admin</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.departmentDistribution || []}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={3}
                >
                  {(charts.departmentDistribution || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#64748b' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Audit Activities */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-wide">
                  Recent System Activity Logs
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Real-time audit trail of actions</p>
              </div>
              <button
                onClick={() => navigate('/audit-logs')}
                className="text-xs text-amber-700 hover:text-amber-800 font-semibold"
              >
                View All
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentActivity.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No activity logged yet</div>
              ) : (
                recentActivity.map((log: any) => (
                  <div key={log.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">
                          {log.module}
                        </span>
                        <span className="text-amber-700 font-semibold">{log.action}</span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-1 line-clamp-1">
                        {log.details ? log.details.replace(/{|"|}/g, ' ') : `Action performed by ${log.user?.username || 'User'}`}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1 text-emerald-600 font-medium text-[11px]">
              <ShieldCheck className="w-4 h-4" /> Audit Trail Enforced
            </span>
            <span className="text-[10px] font-mono">Database Enforced RBAC</span>
          </div>
        </div>
      </div>
    </div>
  );
};
