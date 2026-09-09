import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarCheck,
  CalendarDays,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  UserX,
  UserCheck,
  FileSpreadsheet,
  Building2,
  ChevronLeft,
  ChevronRight,
  Plus,
  TrendingUp,
  AlertTriangle,
  MapPin,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  LogOut,
  LogIn,
  AlertCircle,
  Timer,
  Compass,
  Sliders,
  LocateFixed,
  Lock,
  Radio,
  Settings,
  Edit3,
  Calendar as CalendarIcon,
  Coffee,
  CheckCheck,
  PowerOff,
  UserPlus,
  XCircle,
  Check,
  CalendarX,
} from 'lucide-react';
import { Attendance, AttendanceStatus, Employee, Site, Department, Shift } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { SkeletonTable } from '../components/common/SkeletonLoader';
import api from '../services/api';
import { formatDate, formatTimeOnly, formatTime24, exportToExcel, exportToCsv } from '../utils/formatters';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';

const SITE_PRESETS = [
  { name: 'Microsoft India (R & D) Pvt. Ltd', code: 'VPHS0004', lat: 17.4435, lng: 78.3772, location: 'Gachibowli, Hyderabad' },
  { name: 'VPHS HEAD OFFICE', code: 'VPHS0001', lat: 17.4483, lng: 78.3915, location: 'Madhapur, Hitech City' },
  { name: 'Third Wave Coffee Shop', code: 'VPHS0003', lat: 17.4219, lng: 78.3756, location: 'Khajaguda, Hyderabad' },
  { name: 'Forward Life Private Limited', code: 'VPHS0002', lat: 17.4156, lng: 78.4350, location: 'Banjara Hills, Hyderabad' },
  { name: 'Harleys Fine Dining', code: 'HARLEYS', lat: 17.4325, lng: 78.4071, location: 'Jubilee Hills, Hyderabad' },
  { name: 'Third wave Coffe shop (Kondapur)', code: 'TWC_KONDAPUR', lat: 17.4699, lng: 78.3578, location: 'Kondapur, Hyderabad' },
  { name: 'Third Wave Coffe Shop (Sainikpuri)', code: 'TWC_SAINIKPURI', lat: 17.4875, lng: 78.5482, location: 'Sainikpuri, Secunderabad' },
  { name: 'Third Wave Coffe Shop (Banjara Hills)', code: 'TWC_BANJARA', lat: 17.4124, lng: 78.4412, location: 'Banjara Hills, Hyderabad' },
];

export interface WeekDayInfo {
  date: Date;
  dateStr: string;
  dayNameShort: string;
  dayNameFull: string;
  monthShort: string;
  dayNumber: number;
  dayIndex: number; // 0=Sun, 1=Mon, ..., 6=Sat
  isToday: boolean;
  isWeekend: boolean;
}

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [searchParams] = useSearchParams();

  const initialView = searchParams.get('view') as any;
  const [viewMode, setViewMode] = useState<'weekly' | 'daily' | 'monthly'>(
    initialView === 'weekly' || initialView === 'daily' ? initialView : 'monthly'
  );
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [currentWeekAnchor, setCurrentWeekAnchor] = useState<Date>(new Date());

  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [weeklyAttendances, setWeeklyAttendances] = useState<Attendance[]>([]);
  const [monthlyMatrix, setMonthlyMatrix] = useState<any>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  // Active / Inactive filter state
  const [filterStaffStatus, setFilterStaffStatus] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');
  const [filterSite, setFilterSite] = useState(searchParams.get('siteId') || '');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchEmployee, setSearchEmployee] = useState('');

  // 1-Page Monthly Attendance Condition Filters
  const [monthlyAttendanceFilter, setMonthlyAttendanceFilter] = useState<'ALL' | 'HAS_LOP' | 'HAS_LATE' | 'HAS_LEAVE' | 'HAS_OT' | 'PERFECT'>('ALL');

  // Weekly Off setting per employee or site (default 0 = Sunday)
  const [defaultWeeklyOffDay, setDefaultWeeklyOffDay] = useState<number>(0);
  const [employeeWeeklyOffMap, setEmployeeWeeklyOffMap] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('vphs_employee_weekly_offs');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Check whether a specific day of week (0=Sun, 6=Sat) is a weekly off for an employee
  // Microsoft India and VPHS Head Office operate on a 5-day work week (Both Saturday & Sunday are Week Off)
  const isEmployeeWeeklyOffDay = (emp?: Employee | null, dayIndex?: number): boolean => {
    if (!emp || dayIndex === undefined) return false;
    const siteName = (emp.site?.siteName || '').toLowerCase();
    const siteCode = emp.site?.siteCode || '';
    const is5DayWeek = siteName.includes('microsoft') || siteName.includes('head office') || siteCode === 'VPHS0004' || siteCode === 'VPHS0001';
    if (is5DayWeek) {
      return dayIndex === 0 || dayIndex === 6; // Sunday and Saturday
    }
    const customOff = employeeWeeklyOffMap[emp.id];
    return customOff !== undefined ? customOff === dayIndex : dayIndex === defaultWeeklyOffDay;
  };

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());
  const [isPunching, setIsPunching] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; name: string }>({
    lat: 17.4435,
    lng: 78.3772,
    name: 'Microsoft India Campus (Gachibowli)',
  });

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
          if (err.code === 1) msg = 'Location access denied. Please enable location permissions on your browser/device to punch.';
          else if (err.code === 2) msg = 'Location unavailable. Please verify GPS/location service is active.';
          else if (err.code === 3) msg = 'Location request timed out. Please retry.';
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if (lat1 === lat2 && lon1 === lon2) return 0;
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
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

  // Modals
  const [isGeotagModalOpen, setIsGeotagModalOpen] = useState(false);
  const [isUpdatingGeotag, setIsUpdatingGeotag] = useState(false);
  const [geotagForm, setGeotagForm] = useState({
    latitude: 17.4435,
    longitude: 78.3772,
    locationName: 'Microsoft India Campus (Gachibowli)',
    geofenceRadius: 100,
    isStrictGeofence: true,
    siteId: '',
  });

  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [isSavingSlot, setIsSavingSlot] = useState(false);
  const [slotModalData, setSlotModalData] = useState<{
    employee: Employee | null;
    day: WeekDayInfo | null;
    status: AttendanceStatus;
    inTime: string;
    outTime: string;
    shiftId: string;
    siteId: string;
    remarks: string;
  }>({
    employee: null,
    day: null,
    status: 'PRESENT',
    inTime: '09:30',
    outTime: '18:30',
    shiftId: '',
    siteId: '',
    remarks: '',
  });

  const [isMarkOpen, setIsMarkOpen] = useState(false);
  const [markData, setMarkData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    inTime: '09:30',
    outTime: '18:30',
    status: 'PRESENT' as AttendanceStatus,
    siteId: '',
    shiftId: '',
    remarks: '',
  });

  // Employee Active/Inactive Status Modal
  const [statusModalEmp, setStatusModalEmp] = useState<Employee | null>(null);
  const [isUpdatingEmpStatus, setIsUpdatingEmpStatus] = useState(false);

  // Weekly Off batch modal
  const [isWeeklyOffModalOpen, setIsWeeklyOffModalOpen] = useState(false);
  const [isApplyingWeeklyOff, setIsApplyingWeeklyOff] = useState(false);
  const [isApplyingSandwich, setIsApplyingSandwich] = useState(false);

  // Generate 7 days for current week (Monday through Sunday)
  const weekDays = useMemo<WeekDayInfo[]>(() => {
    const d = new Date(currentWeekAnchor);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.getFullYear(), d.getMonth(), diff);
    const todayStr = new Date().toISOString().split('T')[0];

    return Array.from({ length: 7 }, (_, i) => {
      const current = new Date(monday);
      current.setDate(monday.getDate() + i);
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const dayNum = String(current.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayNum}`;
      const dayNameShort = current.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNameFull = current.toLocaleDateString('en-US', { weekday: 'long' });
      const monthShort = current.toLocaleDateString('en-US', { month: 'short' });
      const dayNumber = current.getDate();
      const dayIndex = current.getDay();

      return {
        date: current,
        dateStr,
        dayNameShort,
        dayNameFull,
        monthShort,
        dayNumber,
        dayIndex,
        isToday: dateStr === todayStr,
        isWeekend: dayIndex === 0 || dayIndex === 6,
      };
    });
  }, [currentWeekAnchor]);

  useEffect(() => {
    const sId = searchParams.get('siteId');
    if (sId) setFilterSite(sId);
  }, [searchParams]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchInitialOptions();
  }, []);

  useEffect(() => {
    if (viewMode === 'weekly') {
      fetchWeeklyAttendance();
    } else if (viewMode === 'daily') {
      fetchDailyAttendance();
    } else {
      fetchMonthlyMatrix();
    }
  }, [viewMode, selectedDate, currentWeekAnchor, selectedMonth, selectedYear, filterSite, filterDept, filterStatus, filterStaffStatus, searchEmployee]);

  const fetchInitialOptions = async () => {
    try {
      const [sitesRes, settingsRes, empRes]: any = await Promise.all([
        api.get('/sites'),
        api.get('/settings'),
        api.get('/employees?limit=300'),
      ]);
      if (sitesRes.success) setSites(sitesRes.data || []);
      if (settingsRes.success && settingsRes.data) {
        setDepartments(settingsRes.data.departments || []);
        setShifts(settingsRes.data.shifts || []);
      }
      if (empRes.success && empRes.data) {
        const empList = empRes.data || [];
        setEmployees(empList);
        const matchingCurrent = empList.find((e: Employee) => e.employeeId === user?.employeeId);
        setSelectedEmployeeId(matchingCurrent?.id || empList[0]?.id || '');
      }
    } catch (e) {}
  };

  const fetchDailyAttendance = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        date: selectedDate,
        ...(filterSite ? { siteId: filterSite } : {}),
        ...(filterDept ? { departmentId: filterDept } : {}),
        ...(filterStatus ? { status: filterStatus } : {}),
      });
      const res: any = await api.get(`/attendance?${query.toString()}`);
      if (res.success) setAttendances(res.data || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch daily attendance', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyAttendance = async () => {
    try {
      setLoading(true);
      const startDate = weekDays[0].dateStr;
      const endDate = weekDays[6].dateStr;
      const query = new URLSearchParams({
        startDate,
        endDate,
        ...(filterSite ? { siteId: filterSite } : {}),
        ...(filterDept ? { departmentId: filterDept } : {}),
      });
      const res: any = await api.get(`/attendance?${query.toString()}`);
      if (res.success) setWeeklyAttendances(res.data || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch weekly roster attendance', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyMatrix = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        month: String(selectedMonth),
        year: String(selectedYear),
        ...(filterSite ? { siteId: filterSite } : {}),
        ...(filterDept ? { departmentId: filterDept } : {}),
        ...(filterStaffStatus ? { staffStatus: filterStaffStatus } : {}),
        ...(searchEmployee ? { search: searchEmployee } : {}),
      });
      const res: any = await api.get(`/attendance/monthly?${query.toString()}`);
      if (res.success) setMonthlyMatrix(res.data);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch monthly matrix', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedEmpObj = employees.find(e => e.id === selectedEmployeeId || e.employeeId === selectedEmployeeId);
  const todayRecord = attendances.find(a => a.employeeId === selectedEmpObj?.id || a.employee?.employeeId === selectedEmpObj?.employeeId);

  useEffect(() => {
    let targetSite = selectedEmpObj?.site;
    if (filterSite) {
      const matchedSite = sites.find(s => s.id === filterSite);
      if (matchedSite) targetSite = matchedSite;
    }
    if (targetSite) {
      const lat = targetSite.latitude || 17.4435;
      const lng = targetSite.longitude || 78.3772;
      setGpsLocation({
        lat,
        lng,
        name: `${targetSite.siteName} (${targetSite.location || 'Site'})`,
      });
    }
  }, [selectedEmployeeId, selectedEmpObj, filterSite, sites]);

  const handleOpenGeotagModal = (siteToEdit?: Site | null) => {
    const currentSite = siteToEdit || selectedEmpObj?.site || (filterSite ? sites.find(s => s.id === filterSite) : null) || sites[0];
    const lat = currentSite?.latitude ?? (deviceCoords ? parseFloat(deviceCoords.latitude.toFixed(4)) : 17.4435);
    const lng = currentSite?.longitude ?? (deviceCoords ? parseFloat(deviceCoords.longitude.toFixed(4)) : 78.3772);
    const radius = currentSite?.geofenceRadius ?? 100;

    setGeotagForm({
      siteId: currentSite?.id || '',
      locationName: currentSite?.siteName || 'VPHS Site',
      latitude: lat,
      longitude: lng,
      geofenceRadius: radius,
      isStrictGeofence: true,
    });
    setIsGeotagModalOpen(true);
  };

  const handleSaveGeotag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== 'SUPER_ADMIN') {
      showToast('Permission denied: Only Super Admin can modify Geotags', 'error');
      return;
    }
    setIsUpdatingGeotag(true);
    try {
      const res: any = await api.put('/settings/geotag', geotagForm);
      if (res.success && res.data) {
        setGpsLocation({ lat: res.data.latitude, lng: res.data.longitude, name: res.data.locationName });
        showToast(`✅ Geotag updated for ${res.data.site?.siteName || geotagForm.locationName}`, 'success');
        setIsGeotagModalOpen(false);
        // Refresh sites and employees so distance immediately updates!
        await fetchInitialOptions();
        await fetchDailyAttendance();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update geotag', 'error');
    } finally {
      setIsUpdatingGeotag(false);
    }
  };

  const handleQuickSetSiteToCurrentLocation = async () => {
    if (user?.role !== 'SUPER_ADMIN') {
      showToast('Permission denied: Only Super Admin can modify Site Geotags', 'error');
      return;
    }
    const empSite = selectedEmpObj?.site || (filterSite ? sites.find(s => s.id === filterSite) : null);
    if (!empSite) {
      showToast('No assigned site found for this employee', 'warning');
      return;
    }

    try {
      setIsUpdatingGeotag(true);
      let coords = deviceCoords;
      if (!coords) {
        coords = await getDeviceCoordinates();
      }

      const res: any = await api.put('/settings/geotag', {
        siteId: empSite.id,
        locationName: empSite.siteName,
        latitude: parseFloat(coords.latitude.toFixed(4)),
        longitude: parseFloat(coords.longitude.toFixed(4)),
        geofenceRadius: empSite.geofenceRadius || 100,
        isStrictGeofence: true,
      });

      if (res.success) {
        showToast(`✅ ${empSite.siteName} coordinates set to your current GPS location!`, 'success');
        await fetchInitialOptions();
        await fetchDailyAttendance();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update geotag', 'error');
    } finally {
      setIsUpdatingGeotag(false);
    }
  };

  const handleDetectDeviceGps = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(4));
          const lng = parseFloat(pos.coords.longitude.toFixed(4));
          setDeviceCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy });
          setGeoState('READY');
          setGeotagForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
          showToast(`📍 Device GPS captured: ${lat}° N, ${lng}° E`, 'info');
        },
        () => showToast('Could not fetch GPS. Check location permissions.', 'warning'),
        { enableHighAccuracy: true }
      );
    }
  };

  const handleSelectPreset = (presetName: string) => {
    const matched = SITE_PRESETS.find(p => p.name === presetName);
    if (matched) {
      const siteMatch = sites.find(s => s.siteCode === matched.code || s.siteName.toLowerCase().includes(matched.name.toLowerCase()));
      setGeotagForm(prev => ({
        ...prev,
        siteId: siteMatch?.id || prev.siteId,
        latitude: matched.lat,
        longitude: matched.lng,
        locationName: `${matched.name} (${matched.location})`,
      }));
    }
  };

  const handleLivePunchIn = async () => {
    if (!selectedEmpObj) { showToast('Select an Employee', 'warning'); return; }
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
        employeeId: selectedEmpObj.id,
        date: selectedDate,
        inTime: new Date().toISOString(),
        siteId: selectedEmpObj.siteId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        remarks: `Live Punch In - ${gpsLocation.name}`,
      });
      if (res.success) {
        const dist = res.data?.geoVerification ? ` (${Math.round(res.data.geoVerification.distanceMeters)}m from site)` : '';
        showToast(`✅ Punch In recorded for ${selectedEmpObj.firstName}${dist}`, 'success');
        fetchDailyAttendance();
        fetchWeeklyAttendance();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to punch in', 'error');
    } finally {
      setIsPunching(false);
    }
  };

  const handleLivePunchOut = async () => {
    if (!selectedEmpObj) { showToast('Select an Employee', 'warning'); return; }
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
        employeeId: selectedEmpObj.id,
        date: selectedDate,
        outTime: new Date().toISOString(),
        siteId: selectedEmpObj.siteId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        remarks: `Live Punch Out - ${gpsLocation.name}`,
      });
      if (res.success) {
        const dist = res.data?.geoVerification ? ` (${Math.round(res.data.geoVerification.distanceMeters)}m from site)` : '';
        showToast(`🏁 Punch Out recorded for ${selectedEmpObj.firstName}${dist}`, 'success');
        fetchDailyAttendance();
        fetchWeeklyAttendance();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to punch out', 'error');
    } finally {
      setIsPunching(false);
    }
  };

  const handleLiveMarkLate = async () => {
    if (!selectedEmpObj) { showToast('Select an Employee', 'warning'); return; }
    setIsPunching(true);
    try {
      const res: any = await api.post('/attendance', {
        employeeId: selectedEmpObj.id,
        date: selectedDate,
        status: 'LATE',
        inTime: new Date().toISOString(),
        siteId: selectedEmpObj.siteId,
        remarks: `Late arrival recorded (Grace window exceeded) - ${gpsLocation.name}`,
      });
      if (res.success) {
        showToast(`Marked Late for ${selectedEmpObj.firstName}`, 'warning');
        fetchDailyAttendance();
        fetchWeeklyAttendance();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to mark late', 'error');
    } finally {
      setIsPunching(false);
    }
  };

  const handleLiveQuickStatus = async (status: AttendanceStatus) => {
    if (!selectedEmpObj) { showToast('Select an Employee', 'warning'); return; }
    try {
      const res: any = await api.post('/attendance', {
        employeeId: selectedEmpObj.id,
        date: selectedDate,
        status,
        siteId: selectedEmpObj.siteId,
        remarks: `Status updated to ${status}`,
      });
      if (res.success) {
        showToast(`Updated to ${status}`, 'info');
        fetchDailyAttendance();
        fetchWeeklyAttendance();
      }
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleQuickMarkRow = async (empId: string, status: AttendanceStatus) => {
    try {
      await api.post('/attendance', { employeeId: empId, date: selectedDate, status });
      showToast(`Roster updated`, 'success');
      fetchDailyAttendance();
      fetchWeeklyAttendance();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  // Toggle active / inactive status for employee
  const handleToggleEmployeeStatus = async (emp: Employee, newStatus: 'ACTIVE' | 'INACTIVE') => {
    setIsUpdatingEmpStatus(true);
    try {
      const res: any = await api.put(`/employees/${emp.id}`, { status: newStatus });
      if (res.success) {
        showToast(`${emp.firstName} ${emp.lastName} status updated to ${newStatus}`, 'success');
        setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, status: newStatus } : e));
        setStatusModalEmp(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update employee status', 'error');
    } finally {
      setIsUpdatingEmpStatus(false);
    }
  };

  // Set default weekly off day for a staff member (0=Sun, 1=Mon, ..., 6=Sat)
  const handleSetEmployeeWeeklyOff = (empId: string, dayIdx: number) => {
    const updated = { ...employeeWeeklyOffMap, [empId]: dayIdx };
    setEmployeeWeeklyOffMap(updated);
    try {
      localStorage.setItem('vphs_employee_weekly_offs', JSON.stringify(updated));
    } catch {}
    showToast(`Weekly off updated for staff`, 'info');
  };

  // 1-Click Auto Apply Weekly Offs to current week
  const handleBatchApplyWeeklyOff = async (targetDayIndex: number) => {
    setIsApplyingWeeklyOff(true);
    try {
      const targetDay = weekDays.find(d => d.dayIndex === targetDayIndex);
      if (!targetDay) {
        showToast('Selected off day is not in current week window', 'warning');
        return;
      }

      let count = 0;
      for (const emp of filteredEmployees) {
        if (isEmployeeWeeklyOffDay(emp, targetDayIndex)) {
          await api.post('/attendance', {
            employeeId: emp.id,
            date: targetDay.dateStr,
            status: 'WEEK_OFF',
            siteId: emp.siteId,
            remarks: targetDayIndex === 6
              ? 'Designated Weekly Off (Saturday)'
              : targetDayIndex === 0
              ? 'Designated Weekly Off (Sunday)'
              : `Designated Weekly Off (${targetDay.dayNameFull})`,
          });
          count++;
        }
      }

      showToast(`Applied WEEK OFF on ${targetDay.dayNameFull} (${targetDay.dateStr}) for ${count} staff members!`, 'success');
      setIsWeeklyOffModalOpen(false);
      fetchWeeklyAttendance();
      fetchDailyAttendance();
    } catch (err: any) {
      showToast(err.message || 'Failed to batch apply weekly offs', 'error');
    } finally {
      setIsApplyingWeeklyOff(false);
    }
  };

  // 🥪 1-Click Auto Apply Weekend Sandwich Rule (Friday / Monday absent -> Sunday LOP)
  const handleApplySandwichRule = async () => {
    setIsApplyingSandwich(true);
    try {
      const res = await api.post('/attendance/sandwich-rule', {
        month: selectedMonth,
        year: selectedYear,
        siteId: filterSite || undefined,
      });
      const data = res.data?.data || res.data;
      showToast(
        data.message || 'Weekend Sandwich Rule (LOP) evaluated successfully!',
        'success'
      );
      fetchMonthlyMatrix();
      fetchWeeklyAttendance();
      fetchDailyAttendance();
    } catch (err: any) {
      showToast(err.message || 'Failed to apply Weekend Sandwich Rule', 'error');
    } finally {
      setIsApplyingSandwich(false);
    }
  };

  const handleOpenSlotModal = (emp: Employee, day: WeekDayInfo, existingAtt?: Attendance) => {
    const isEmpWeeklyOff = isEmployeeWeeklyOffDay(emp, day.dayIndex);

    setSlotModalData({
      employee: emp,
      day,
      status: (existingAtt?.status as AttendanceStatus) || (isEmpWeeklyOff ? 'WEEK_OFF' : 'PRESENT'),
      inTime: existingAtt?.inTime ? formatTime24(existingAtt.inTime, '09:30') : '09:30',
      outTime: existingAtt?.outTime ? formatTime24(existingAtt.outTime, '18:30') : '18:30',
      shiftId: existingAtt?.shiftId || emp.shiftId || shifts[0]?.id || '',
      siteId: existingAtt?.siteId || emp.siteId || sites[0]?.id || '',
      remarks: existingAtt?.remarks || (isEmpWeeklyOff ? (day.dayIndex === 6 ? 'Designated Weekly Off (Saturday)' : 'Designated Weekly Off (Sunday)') : ''),
    });
    setIsSlotModalOpen(true);
  };

  const handleSaveSlotModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotModalData.employee || !slotModalData.day) return;
    setIsSavingSlot(true);
    try {
      const payload: any = {
        employeeId: slotModalData.employee.id,
        date: slotModalData.day.dateStr,
        status: slotModalData.status,
        shiftId: slotModalData.shiftId || undefined,
        siteId: slotModalData.siteId || undefined,
        remarks: slotModalData.remarks || undefined,
      };

      if (slotModalData.status === 'PRESENT' || slotModalData.status === 'LATE' || slotModalData.status === 'HALF_DAY') {
        const inT = formatTime24(slotModalData.inTime, '09:30');
        const outT = formatTime24(slotModalData.outTime, '18:30');
        payload.inTime = `${slotModalData.day.dateStr}T${inT}:00`;
        payload.outTime = `${slotModalData.day.dateStr}T${outT}:00`;
      } else {
        payload.inTime = null;
        payload.outTime = null;
      }

      await api.post('/attendance', payload);
      showToast(`Slot updated as ${slotModalData.status}`, 'success');
      setIsSlotModalOpen(false);
      fetchWeeklyAttendance();
      fetchDailyAttendance();
      fetchMonthlyMatrix();
    } catch (err: any) {
      showToast(err.message || 'Failed to update shift slot', 'error');
    } finally {
      setIsSavingSlot(false);
    }
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        ...markData,
      };
      if (markData.status === 'PRESENT' || markData.status === 'LATE' || markData.status === 'HALF_DAY') {
        const inT = formatTime24(markData.inTime, '09:30');
        const outT = formatTime24(markData.outTime, '18:30');
        payload.inTime = `${markData.date}T${inT}:00`;
        payload.outTime = `${markData.date}T${outT}:00`;
      } else {
        payload.inTime = null;
        payload.outTime = null;
      }
      await api.post('/attendance', payload);
      showToast(`Attendance recorded as ${markData.status}`, 'success');
      setIsMarkOpen(false);
      fetchDailyAttendance();
      fetchWeeklyAttendance();
      fetchMonthlyMatrix();
    } catch (err: any) {
      showToast(err.message || 'Failed to record attendance', 'error');
    }
  };

  // Microsoft Site memo for 1-click filter
  const microsoftSite = useMemo(() => {
    return sites.find(s =>
      s.siteName?.toLowerCase().includes('microsoft') ||
      s.siteCode === 'VPHS0004' ||
      s.id === 'VPHS0004'
    );
  }, [sites]);

  // Staff list filtered by Active/Inactive, Site, Department, and Search
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      // Active / Inactive filter
      if (filterStaffStatus === 'ACTIVE') {
        if (e.status && e.status !== 'ACTIVE') return false;
      } else if (filterStaffStatus === 'INACTIVE') {
        if (!e.status || e.status === 'ACTIVE') return false;
      }

      if (filterSite && e.siteId !== filterSite) return false;
      if (filterDept && e.departmentId !== filterDept) return false;
      if (searchEmployee) {
        const q = searchEmployee.toLowerCase();
        return e.employeeId?.toLowerCase().includes(q) || `${e.firstName} ${e.lastName}`.toLowerCase().includes(q);
      }
      return true;
    });
  }, [employees, filterStaffStatus, filterSite, filterDept, searchEmployee]);

  const activeCount = useMemo(() => employees.filter(e => !e.status || e.status === 'ACTIVE').length, [employees]);
  const inactiveCount = useMemo(() => employees.filter(e => e.status && e.status !== 'ACTIVE').length, [employees]);

  const weeklyLookup = useMemo(() => {
    const map: Record<string, Record<string, Attendance>> = {};
    for (const att of weeklyAttendances) {
      if (!map[att.employeeId]) map[att.employeeId] = {};
      map[att.employeeId][att.date] = att;
    }
    return map;
  }, [weeklyAttendances]);

  const filteredAttendances = attendances.filter(a => {
    if (filterStaffStatus === 'ACTIVE') {
      if (a.employee?.status && a.employee.status !== 'ACTIVE') return false;
    } else if (filterStaffStatus === 'INACTIVE') {
      if (!a.employee?.status || a.employee.status === 'ACTIVE') return false;
    }
    if (!searchEmployee) return true;
    const q = searchEmployee.toLowerCase();
    return a.employee?.employeeId?.toLowerCase().includes(q) || `${a.employee?.firstName} ${a.employee?.lastName}`.toLowerCase().includes(q);
  });

  // 🌟 1-Page Filtered Monthly Records
  const filteredMonthlyRecords = useMemo(() => {
    if (!monthlyMatrix?.records) return [];

    return monthlyMatrix.records.filter((rec: any) => {
      // 1. Staff Status filter
      if (filterStaffStatus === 'ACTIVE') {
        if (rec.employee.status && rec.employee.status !== 'ACTIVE') return false;
      } else if (filterStaffStatus === 'INACTIVE') {
        if (!rec.employee.status || rec.employee.status === 'ACTIVE') return false;
      }

      // 2. Site filter
      if (filterSite && rec.employee.siteId && rec.employee.siteId !== filterSite) {
        return false;
      }

      // 3. Dept filter
      if (filterDept && rec.employee.departmentId && rec.employee.departmentId !== filterDept) {
        return false;
      }

      // 4. Search query
      if (searchEmployee) {
        const q = searchEmployee.toLowerCase().trim();
        const matchId = rec.employee.employeeId?.toLowerCase().includes(q);
        const matchName = rec.employee.name?.toLowerCase().includes(q);
        if (!matchId && !matchName) return false;
      }

      // 5. Attendance Condition Filter
      if (monthlyAttendanceFilter === 'HAS_LOP') {
        const abs = rec.summary.totalAbsent || 0;
        const fullLop = (rec.summary.lopDays || 0) >= 1;
        // Staff with true absents or full-day unpaid LOP (half-days are categorized under Leaves / Half Day)
        if (abs === 0 && !fullLop) return false;
      } else if (monthlyAttendanceFilter === 'HAS_LATE') {
        if ((rec.summary.totalLate || 0) === 0) return false;
      } else if (monthlyAttendanceFilter === 'HAS_LEAVE') {
        if ((rec.summary.totalLeave || 0) === 0 && (rec.summary.totalHalfDay || 0) === 0) return false;
      } else if (monthlyAttendanceFilter === 'HAS_OT') {
        if ((rec.summary.totalOvertime || 0) <= 0) return false;
      } else if (monthlyAttendanceFilter === 'PERFECT') {
        const lop = rec.summary.lopDays || 0;
        const abs = rec.summary.totalAbsent || 0;
        const late = rec.summary.totalLate || 0;
        if (lop > 0 || abs > 0 || late > 0) return false;
      }

      return true;
    });
  }, [monthlyMatrix, filterStaffStatus, filterSite, filterDept, searchEmployee, monthlyAttendanceFilter]);

  // 🌟 Monthly KPI Summary Stats
  const monthlyStats = useMemo(() => {
    const records = filteredMonthlyRecords;
    const count = records.length;
    if (count === 0) {
      return {
        totalStaff: 0,
        totalPresent: 0,
        totalWeekOff: 0,
        totalLate: 0,
        totalLop: 0,
        totalAbsent: 0,
        totalHalfDays: 0,
        totalLeave: 0,
        totalHalfDayEquivalent: 0,
        totalOtHours: '0.0',
        avgAttendancePct: '0.0',
      };
    }

    let totalPresent = 0;
    let totalWeekOff = 0;
    let totalLate = 0;
    let totalLop = 0;
    let totalAbsent = 0;
    let totalHalfDays = 0;
    let totalLeave = 0;
    let totalOtHours = 0;
    let totalPayable = 0;
    let totalWorkingHours = 0;

    records.forEach((r: any) => {
      totalPresent += r.summary.totalPresent || 0;
      totalWeekOff += r.summary.totalWeekOff || 0;
      totalLate += r.summary.totalLate || 0;
      totalLop += (r.summary.lopDays || 0);
      totalAbsent += (r.summary.totalAbsent || 0);
      totalHalfDays += (r.summary.totalHalfDay || 0);
      totalLeave += (r.summary.totalLeave || 0);
      totalOtHours += (r.summary.totalOvertime || 0);
      totalPayable += (r.summary.payableDays || 0);
      totalWorkingHours += (r.summary.totalWorkingHours || 0);
    });

    const totalPossibleDays = (monthlyMatrix?.totalDays || 30) * count;
    const avgAttendancePct = totalPossibleDays > 0 ? ((totalPayable / totalPossibleDays) * 100).toFixed(1) : '100.0';

    return {
      totalStaff: count,
      totalPresent,
      totalWeekOff,
      totalLate,
      totalLop,
      totalAbsent,
      totalHalfDays,
      totalLeave,
      totalHalfDayEquivalent: totalHalfDays * 0.5,
      totalOtHours: totalOtHours.toFixed(1),
      totalPayable,
      totalWorkingHours: totalWorkingHours.toFixed(1),
      avgAttendancePct,
    };
  }, [filteredMonthlyRecords, monthlyMatrix]);

  // 🌟 Weekly Summary Totals Across All Filtered Staff
  const weeklyTotals = useMemo(() => {
    let p = 0, wo = 0, l = 0, hd = 0, lv = 0, a = 0, lop = 0, hrs = 0, ot = 0;
    filteredEmployees.forEach(emp => {
      const empWeeklyMap = weeklyLookup[emp.id] || {};
      let empP = 0, empWO = 0, empL = 0, empHD = 0, empLV = 0, empA = 0, empHrs = 0, empOT = 0;
      weekDays.forEach(d => {
        const att = empWeeklyMap[d.dateStr];
        if (att) {
          if (att.status === 'PRESENT') empP++;
          else if (att.status === 'WEEK_OFF') empWO++;
          else if (att.status === 'LATE') { empP++; empL++; }
          else if (att.status === 'HALF_DAY') { empHD += 0.5; empP += 0.5; }
          else if (att.status === 'LEAVE') empLV++;
          else if (att.status === 'ABSENT') empA++;

          empHrs += att.workingHours || 0;
          empOT += att.overtimeHours || 0;
        }
      });
      const payable = empP + empWO + empLV;
      const empLop = Math.max(0, 7 - payable);

      p += empP;
      wo += empWO;
      l += empL;
      hd += empHD;
      lv += empLV;
      a += empA;
      lop += empLop;
      hrs += empHrs;
      ot += empOT;
    });
    return { p, wo, l, hd, lv, a, lop, hrs: hrs.toFixed(1), ot: ot.toFixed(1) };
  }, [filteredEmployees, weeklyLookup, weekDays]);

  // 🌟 Daily Summary Totals Across Filtered Daily Attendances
  const dailyStats = useMemo(() => {
    let p = 0, wo = 0, l = 0, hd = 0, lv = 0, a = 0, hrs = 0, ot = 0;
    filteredAttendances.forEach(att => {
      if (att.status === 'PRESENT') p++;
      else if (att.status === 'WEEK_OFF') wo++;
      else if (att.status === 'LATE') { p++; l++; }
      else if (att.status === 'HALF_DAY') hd++;
      else if (att.status === 'LEAVE') lv++;
      else if (att.status === 'ABSENT') a++;

      hrs += att.workingHours || 0;
      ot += att.overtimeHours || 0;
    });
    return {
      p, wo, l, hd, lv, a,
      hdEquivalent: hd * 0.5,
      hrs: Math.round(hrs * 10) / 10,
      ot: Math.round(ot * 10) / 10,
    };
  }, [filteredAttendances]);

  // Open Edit Slot Modal for any day in the 1-Page Monthly Matrix
  const handleOpenMonthlyDayModal = (rec: any, dayNum: number) => {
    const d = new Date(selectedYear, selectedMonth - 1, dayNum);
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dayData = rec.days[dateStr];

    const emp = employees.find(e => e.id === rec.employee.id) || {
      id: rec.employee.id,
      employeeId: rec.employee.employeeId,
      firstName: rec.employee.firstName || rec.employee.name.split(' ')[0] || '',
      lastName: rec.employee.lastName || rec.employee.name.split(' ').slice(1).join(' ') || '',
      siteId: rec.employee.siteId || filterSite,
      departmentId: rec.employee.departmentId,
      status: rec.employee.status || 'ACTIVE',
    } as Employee;

    const dayInfo: WeekDayInfo = {
      date: d,
      dateStr,
      dayNumber: dayNum,
      dayNameShort: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNameFull: d.toLocaleDateString('en-US', { weekday: 'long' }),
      monthShort: d.toLocaleDateString('en-US', { month: 'short' }),
      dayIndex: d.getDay(),
      isToday: new Date().toISOString().split('T')[0] === dateStr,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    };

    const existingAtt = dayData ? {
      status: dayData.status,
      inTime: dayData.inTime,
      outTime: dayData.outTime,
      workingHours: dayData.hours,
      overtimeHours: dayData.ot,
      shiftId: dayData.shiftId,
      siteId: rec.employee.siteId,
      remarks: dayData.remarks,
    } as any : undefined;

    handleOpenSlotModal(emp, dayInfo, existingAtt);
  };

  const handleExport = (format: 'excel' | 'csv') => {
    if (viewMode === 'monthly') {
      if (!monthlyMatrix || filteredMonthlyRecords.length === 0) {
        showToast('No monthly attendance data to export', 'warning');
        return;
      }
      const totalDays = monthlyMatrix.totalDays || 30;
      const exportRows = filteredMonthlyRecords.map((rec: any) => {
        const row: any = {
          'Employee ID': rec.employee.employeeId,
          'Staff Name': rec.employee.name,
          'Status': rec.employee.status || 'ACTIVE',
          'Site': sites.find(s => s.id === rec.employee.siteId)?.siteName || 'Microsoft India (R & D)',
        };

        for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
          const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const dayData = rec.days[dateStr];
          const st = dayData?.status || '-';
          const code = st === 'PRESENT' ? 'P' :
            st === 'WEEK_OFF' ? 'WO' :
            st === 'LATE' ? 'L' :
            st === 'HALF_DAY' ? 'HD' :
            st === 'LEAVE' ? 'LV' :
            st === 'ABSENT' ? 'A' :
            st === 'LOP' ? 'LOP' : '-';
          row[`Day ${dayNum}`] = code;
        }

        row['Present (P)'] = rec.summary.totalPresent || 0;
        row['Week Off (WO)'] = rec.summary.totalWeekOff || 0;
        row['Late (L)'] = rec.summary.totalLate || 0;
        row['Half Day (HD)'] = (rec.summary.totalHalfDay || 0) * 0.5;
        row['Leave (LV)'] = rec.summary.totalLeave || 0;
        row['Absent (A)'] = rec.summary.totalAbsent || 0;
        row['Payable Days'] = rec.summary.payableDays || 0;
        row['LOP Days'] = rec.summary.lopDays || 0;
        row['Total Hours'] = rec.summary.totalWorkingHours || 0;
        row['Overtime (Hrs)'] = rec.summary.totalOvertime || 0;

        return row;
      });

      const monthName = new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('default', { month: 'short' });
      const filename = `Monthly_Attendance_${monthName}_${selectedYear}`;
      if (format === 'excel') exportToExcel(exportRows, filename);
      else exportToCsv(exportRows, filename);
      showToast(`Exported ${filteredMonthlyRecords.length} staff records to Excel with auto-filters applied!`, 'success');
      return;
    }

    if (viewMode === 'weekly') {
      const exportRows = filteredEmployees.map(emp => {
        const row: any = {
          'Employee ID': emp.employeeId,
          'Staff Name': `${emp.firstName} ${emp.lastName}`,
          'Status': emp.status || 'ACTIVE',
          'Site': emp.site?.siteName || 'Microsoft India (R & D)',
        };
        let totalP = 0, totalWO = 0, totalL = 0, totalHD = 0, totalLV = 0, totalA = 0, totalHours = 0, totalOT = 0;
        weekDays.forEach(d => {
          const att = weeklyLookup[emp.id]?.[d.dateStr];
          let code = '-';
          if (att) {
            if (att.status === 'PRESENT') { code = 'P'; totalP++; }
            else if (att.status === 'WEEK_OFF') { code = 'WO'; totalWO++; }
            else if (att.status === 'LATE') { code = 'L'; totalP++; totalL++; }
            else if (att.status === 'HALF_DAY') { code = 'HD'; totalHD += 0.5; totalP += 0.5; }
            else if (att.status === 'LEAVE') { code = 'LV'; totalLV++; }
            else if (att.status === 'ABSENT') { code = 'A'; totalA++; }
            else if (att.status === 'LOP') { code = 'LOP'; totalA++; }
            totalHours += att.workingHours || 0;
            totalOT += att.overtimeHours || 0;
          }
          row[`${d.dayNameShort} ${d.dayNumber}`] = code;
        });

        const payableDays = totalP + totalWO + totalLV;
        const lopDays = Math.max(0, 7 - payableDays);

        row['Present (P)'] = totalP;
        row['Week Off (WO)'] = totalWO;
        row['Late (L)'] = totalL;
        row['Half Day (HD)'] = totalHD;
        row['Leave (LV)'] = totalLV;
        row['Absent (A)'] = totalA;
        row['Payable Days'] = payableDays;
        row['LOP Days'] = lopDays;
        row['Total Hours'] = Math.round(totalHours * 10) / 10;
        row['Overtime (Hrs)'] = Math.round(totalOT * 10) / 10;

        return row;
      });
      if (format === 'excel') exportToExcel(exportRows, 'Weekly_Shift_Roster');
      else exportToCsv(exportRows, 'Weekly_Shift_Roster');
    } else {
      const exportRows = attendances.map(a => ({
        'Employee ID': a.employee?.employeeId,
        'Name': `${a.employee?.firstName} ${a.employee?.lastName}`,
        'Site': a.site?.siteName || 'HQ',
        'Date': a.date,
        'Status': a.status,
        'In Time': formatTimeOnly(a.inTime),
        'Out Time': formatTimeOnly(a.outTime),
        'Hours': a.workingHours,
        'OT': a.overtimeHours,
      }));
      if (format === 'excel') exportToExcel(exportRows, 'Daily_Attendance_Register');
      else exportToCsv(exportRows, 'Daily_Attendance_Register');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-wide flex items-center gap-2">
              <CalendarCheck className="w-6 h-6 text-amber-500" /> Live Attendance & Shift Rosters
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Geotag Active
            </span>

            {/* Super Admin Geotag Control Trigger */}
            {user?.role === 'SUPER_ADMIN' ? (
              <button
                onClick={() => handleOpenGeotagModal()}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 border border-amber-300 rounded-full text-[11px] font-bold transition-all shadow-xs"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-700" /> Change Geotag (Super Admin)
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] text-slate-400 font-medium">
                <Lock className="w-3 h-3 text-slate-400" /> Geotag Locked by Super Admin
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Weekly 7-day schedule with days & dates, active/inactive staff filters, weekly off (WO) rest day assignment, and automated punch logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs shadow-inner">
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'weekly' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Weekly Roster (Days & Dates)
            </button>
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'daily' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Daily Log
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'monthly' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" /> Monthly Matrix
            </button>
          </div>

          {/* Batch Weekly Off Button */}
          <button
            onClick={() => setIsWeeklyOffModalOpen(true)}
            className="px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-900 text-xs font-bold rounded-xl border border-sky-300 transition-colors flex items-center gap-1.5 shadow-2xs"
            title="Auto-assign Weekly Off (WO) to all staff"
          >
            <Coffee className="w-3.5 h-3.5 text-sky-600" /> Weekly Off (WO) Tool
          </button>

          {/* Weekend Sandwich Rule (LOP) Button */}
          <button
            onClick={handleApplySandwichRule}
            disabled={isApplyingSandwich}
            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-900 text-xs font-bold rounded-xl border border-rose-300 transition-colors flex items-center gap-1.5 shadow-2xs"
            title="If Friday absent mark Saturday absent. If Monday absent mark Sunday absent (Weekend LOP)"
          >
            {isApplyingSandwich ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600" />
            ) : (
              <CalendarX className="w-3.5 h-3.5 text-rose-600" />
            )}
            Sandwich Rule (Weekend LOP)
          </button>

          <button
            onClick={() => handleExport('excel')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export Excel
          </button>

          {user?.role !== 'EMPLOYEE' && (
            <button
              onClick={() => {
                setMarkData({
                  employeeId: employees[0]?.id || '',
                  date: selectedDate,
                  inTime: '09:30',
                  outTime: '18:30',
                  status: 'PRESENT',
                  siteId: sites[0]?.id || '',
                  shiftId: '',
                  remarks: '',
                });
                setIsMarkOpen(true);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-amber-600" /> Manual Record
            </button>
          )}
        </div>
      </div>

      {/* 🌟 LIVE ATTENDANCE & PUNCH ACTION CONSOLE */}
      <div className="bg-gradient-to-br from-white via-amber-50/25 to-slate-50 border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-amber-600" />
              <span className="font-extrabold text-sm text-slate-900 tracking-wide uppercase">
                Real-Time Workforce Punch Console
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Select your Employee ID below to record instant In/Out punches, GPS Geotags & Grace period status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 text-amber-900 font-mono text-xs font-bold rounded-xl border border-amber-300 shadow-xs">
              <Timer className="w-4 h-4 text-amber-600 animate-spin" style={{ animationDuration: '6s' }} />
              <span>LIVE: {currentTime}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-700 shadow-2xs">
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="truncate max-w-[200px] sm:max-w-[260px] font-semibold" title={gpsLocation.name}>
                {gpsLocation.name}
              </span>
            </div>
          </div>
        </div>

        {/* 📍 REAL-TIME GEOFENCE PROXIMITY STATUS BAR */}
        {(() => {
          const empSite = selectedEmpObj?.site;
          const siteLat = empSite?.latitude ?? 17.4435;
          const siteLng = empSite?.longitude ?? 78.3772;
          const siteRadius = empSite?.geofenceRadius ?? 100;
          const currentDist = deviceCoords ? calculateDistance(deviceCoords.latitude, deviceCoords.longitude, siteLat, siteLng) : null;
          const isWithinPerimeter = currentDist !== null ? currentDist <= siteRadius : null;

          return (
            <div className={`mt-4 p-3.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs transition-all ${
              isWithinPerimeter === true
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : isWithinPerimeter === false
                ? 'bg-rose-50 border-rose-300 text-rose-950'
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}>
              <div className="flex items-start sm:items-center gap-2.5">
                {isWithinPerimeter === true ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                ) : isWithinPerimeter === false ? (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
                ) : (
                  <Radio className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0 animate-pulse" />
                )}
                <div>
                  <div className="font-extrabold flex flex-wrap items-center gap-2 text-xs">
                    <span>
                      {isWithinPerimeter === true
                        ? `🟢 Geofence Verified: Physically within ${empSite?.siteName || gpsLocation.name}`
                        : isWithinPerimeter === false
                        ? `🔴 Outside Geofence Perimeter: ${currentDist?.toLocaleString()}m away (Perimeter: ${siteRadius}m)`
                        : '🟡 Detecting Physical Device Location...'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-white/90 border border-current shadow-2xs">
                      Max Perimeter: {siteRadius}m
                    </span>
                  </div>
                  <p className="text-[11px] opacity-85 mt-0.5">
                    {isWithinPerimeter === true
                      ? `Device GPS (${deviceCoords?.latitude.toFixed(4)}, ${deviceCoords?.longitude.toFixed(4)}) is verified inside perimeter. Punches are accepted.`
                      : isWithinPerimeter === false
                      ? `Punches are strictly rejected outside ${siteRadius}m of this site. You must be physically on-site to record attendance.`
                      : 'Please enable GPS/location services on your device to enable Punch In and Punch Out.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={getDeviceCoordinates}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all text-slate-800"
                  title="Detect and refresh your device physical GPS coordinates"
                >
                  <LocateFixed className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Refresh GPS</span>
                </button>

                {user?.role === 'SUPER_ADMIN' && (
                  <>
                    <button
                      type="button"
                      onClick={handleQuickSetSiteToCurrentLocation}
                      disabled={isUpdatingGeotag}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition-all animate-pulse"
                      title="Instantly set this site's coordinates in database to your current physical GPS"
                    >
                      <MapPin className="w-3.5 h-3.5 text-white" />
                      <span>{isUpdatingGeotag ? 'Saving GPS...' : '📍 Set Site to My GPS'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenGeotagModal(empSite || undefined)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition-all"
                      title="Configure site geofence radius, presets, and coordinates"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Change Geotag</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* Console Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-5">
          {/* Employee ID Selector */}
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center justify-between">
              <span>Select Employee to Punch</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {selectedEmpObj?.status === 'INACTIVE' ? '⚪ Inactive Staff' : '🟢 Active Staff'}
              </span>
            </label>
            <select
              value={selectedEmployeeId}
              onChange={e => setSelectedEmployeeId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:border-amber-500 focus:outline-none shadow-xs"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.employeeId} - {emp.firstName} {emp.lastName} ({emp.status === 'INACTIVE' ? 'INACTIVE' : emp.designation?.title || 'Staff'})
                </option>
              ))}
            </select>
          </div>

          {/* Employee Mini Status Badge */}
          <div className="md:col-span-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
              <span>Status Today ({selectedDate})</span>
              {selectedEmpObj && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                  selectedEmpObj.status === 'INACTIVE' ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {selectedEmpObj.status || 'ACTIVE'}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between mt-1">
              <div className="font-extrabold text-xs text-slate-900">
                {todayRecord ? (
                  <Badge status={todayRecord.status} />
                ) : (
                  <span className="text-slate-400 font-bold">NOT PUNCHED YET</span>
                )}
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                {todayRecord?.inTime ? `IN: ${formatTimeOnly(todayRecord.inTime)}` : '--:--'}
              </div>
            </div>
          </div>

          {/* Quick Punch Action Buttons */}
          <div className="md:col-span-5 flex flex-wrap items-center gap-2 justify-start md:justify-end">
            <button
              onClick={handleLivePunchIn}
              disabled={isPunching}
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 hover:scale-[1.02]"
            >
              <LogIn className="w-4 h-4" />
              <span>Punch In</span>
            </button>

            <button
              onClick={handleLivePunchOut}
              disabled={isPunching}
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-black text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 hover:scale-[1.02]"
            >
              <LogOut className="w-4 h-4 text-white" />
              <span>Punch Out</span>
            </button>

            <button
              onClick={handleLiveMarkLate}
              disabled={isPunching}
              title="Record arrival after 15m grace window (auto-deducts penalty)"
              className="px-2.5 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 font-bold text-xs rounded-xl border border-amber-300 transition-all flex items-center gap-1"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
              <span>Late</span>
            </button>

            <button
              onClick={() => handleLiveQuickStatus('WEEK_OFF')}
              disabled={isPunching}
              title="Mark today as statutory Weekly Off (WO)"
              className="px-2.5 py-2.5 bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold text-xs rounded-xl border border-sky-300 transition-all flex items-center gap-1"
            >
              <Coffee className="w-3.5 h-3.5 text-sky-700" />
              <span>Week Off (WO)</span>
            </button>

            <button
              onClick={() => handleLiveQuickStatus('HALF_DAY')}
              disabled={isPunching}
              className="px-2.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-all"
            >
              Half Day
            </button>
          </div>
        </div>
      </div>

      {/* SUPER ADMIN GEOTAG MODAL */}
      <Modal
        isOpen={isGeotagModalOpen}
        onClose={() => setIsGeotagModalOpen(false)}
        title="Super Admin Geotag & Geofence Manager"
        subtitle="Exclusive authority: K. Rahul Kumar (Super Admin)"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveGeotag} className="space-y-4 text-xs">
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-extrabold text-amber-950 text-xs">Super Admin Geotag Override</div>
              <p className="text-[11px] text-amber-900 mt-0.5">
                Updating site geotags enforces strict GPS perimeter validation for all mobile & biometric punches.
              </p>
            </div>
          </div>

          {/* Select Site to Update */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Select Facility / Site to Geotag *</span>
              <span className="text-[10px] text-amber-700 font-bold">
                {geotagForm.siteId ? `Selected Site ID: ${geotagForm.siteId.substring(0, 8)}...` : 'Select a site'}
              </span>
            </label>
            <select
              value={geotagForm.siteId}
              onChange={e => {
                const sId = e.target.value;
                const foundSite = sites.find(s => s.id === sId);
                if (foundSite) {
                  setGeotagForm(prev => ({
                    ...prev,
                    siteId: foundSite.id,
                    locationName: foundSite.siteName,
                    latitude: foundSite.latitude ?? prev.latitude,
                    longitude: foundSite.longitude ?? prev.longitude,
                    geofenceRadius: foundSite.geofenceRadius ?? prev.geofenceRadius,
                  }));
                } else {
                  setGeotagForm(prev => ({ ...prev, siteId: sId }));
                }
              }}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-amber-500 shadow-2xs text-xs"
            >
              <option value="">-- Choose Client Site from Database --</option>
              {sites.map(s => (
                <option key={s.id} value={s.id}>
                  {s.siteCode ? `[${s.siteCode}] ` : ''}{s.siteName} ({s.location || s.city || 'Hyderabad'}) - Coords: {s.latitude?.toFixed(4)}, {s.longitude?.toFixed(4)} (Radius: {s.geofenceRadius || 100}m)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Or Quick Select Verified VPHS Client Site Preset</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SITE_PRESETS.map(p => (
                <button
                  type="button"
                  key={p.code}
                  onClick={() => handleSelectPreset(p.name)}
                  className="p-2 text-left bg-slate-50 hover:bg-amber-50/70 border border-slate-200 hover:border-amber-400 rounded-xl transition-all flex items-start gap-2"
                >
                  <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate text-[11px]">{p.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{p.location}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Target Site Name / Geofence Label *</label>
            <input
              type="text"
              required
              value={geotagForm.locationName}
              onChange={e => setGeotagForm({ ...geotagForm, locationName: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:border-amber-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Latitude (° N) *</label>
              <input
                type="number"
                step="0.0001"
                required
                value={geotagForm.latitude}
                onChange={e => setGeotagForm({ ...geotagForm, latitude: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:border-amber-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Longitude (° E) *</label>
              <input
                type="number"
                step="0.0001"
                required
                value={geotagForm.longitude}
                onChange={e => setGeotagForm({ ...geotagForm, longitude: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:border-amber-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Geofence Radius & Device GPS Capture */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="w-full sm:w-auto">
              <label className="block font-bold text-slate-800 mb-1">Geofence Radius Perimeter</label>
              <select
                value={geotagForm.geofenceRadius}
                onChange={e => setGeotagForm({ ...geotagForm, geofenceRadius: parseInt(e.target.value, 10) })}
                className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-semibold focus:border-amber-500"
              >
                <option value="50">50 Meters (Ultra Strict)</option>
                <option value="100">100 Meters (Standard Building)</option>
                <option value="250">250 Meters (Campus Facility)</option>
                <option value="500">500 Meters (Industrial Area)</option>
                <option value="1000">1,000 Meters (1 km City Zone)</option>
                <option value="2000">2,000 Meters (2 km Area)</option>
                <option value="5000">5,000 Meters (5 km Suburb)</option>
                <option value="10000">10,000 Meters (10 km Metro Zone)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleDetectDeviceGps}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <LocateFixed className="w-4 h-4 text-white" />
              <span>Use Current Device GPS</span>
            </button>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsGeotagModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdatingGeotag}
              className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            >
              {isUpdatingGeotag ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Save Geotag Coordinates
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* 🌟 1. PRIMARY VIEW MODE TABS BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setViewMode('monthly')}
            className={`px-3.5 py-2 rounded-lg font-black text-xs transition-all flex items-center gap-2 ${
              viewMode === 'monthly'
                ? 'bg-amber-500 text-slate-950 shadow-sm ring-2 ring-amber-400/50'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
            }`}
          >
            <CalendarCheck className="w-4 h-4 text-slate-950" />
            <span>Monthly Attendance Sheet (All 30/31 Days)</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-900 font-mono font-bold">1-Page</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('weekly')}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 ${
              viewMode === 'weekly'
                ? 'bg-amber-500 text-slate-950 shadow-sm ring-2 ring-amber-400/50'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Weekly Shift Roster (7 Days)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('daily')}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 ${
              viewMode === 'daily'
                ? 'bg-amber-500 text-slate-950 shadow-sm ring-2 ring-amber-400/50'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Daily Punch Log</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Microsoft Campus 1-Click Filter */}
          {microsoftSite && (
            <button
              type="button"
              onClick={() => setFilterSite(filterSite === microsoftSite.id ? '' : microsoftSite.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 border shadow-2xs ${
                filterSite === microsoftSite.id
                  ? 'bg-amber-100 text-amber-950 border-amber-400 ring-1 ring-amber-400'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
              title="Filter by Microsoft India (R & D)"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Microsoft Campus</span>
              {filterSite === microsoftSite.id && <Check className="w-3.5 h-3.5 text-emerald-600" />}
            </button>
          )}

          {/* Export to Excel Button with Auto-Filter notice */}
          <button
            type="button"
            onClick={() => handleExport('excel')}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            title="Download full register in Excel with column auto-filters enabled"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>Export Excel</span>
            <span className="hidden sm:inline-block px-1.5 py-0.2 bg-emerald-800 text-[10px] rounded text-emerald-100">Autofilter</span>
          </button>
        </div>
      </div>

      {/* 🌟 FILTER & NAVIGATION TOOLBAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
        {/* Left Side: Date, Week, or Month/Year Navigator */}
        <div className="flex flex-wrap items-center gap-2">
          {viewMode === 'weekly' ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700">Week:</span>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-300 shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    const prev = new Date(currentWeekAnchor);
                    prev.setDate(prev.getDate() - 7);
                    setCurrentWeekAnchor(prev);
                  }}
                  className="p-1.5 hover:bg-white rounded-lg text-slate-700 hover:text-slate-950 transition-all font-bold"
                  title="Previous Week"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-3 py-1 text-xs font-bold text-slate-900 flex items-center gap-1.5 font-mono">
                  <CalendarDays className="w-3.5 h-3.5 text-amber-600" />
                  {weekDays[0].dayNameShort}, {weekDays[0].dayNumber} {weekDays[0].monthShort} – {weekDays[6].dayNameShort}, {weekDays[6].dayNumber} {weekDays[6].monthShort} {weekDays[6].date.getFullYear()}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    const next = new Date(currentWeekAnchor);
                    next.setDate(next.getDate() + 7);
                    setCurrentWeekAnchor(next);
                  }}
                  className="p-1.5 hover:bg-white rounded-lg text-slate-700 hover:text-slate-950 transition-all font-bold"
                  title="Next Week"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setCurrentWeekAnchor(new Date())}
                className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold rounded-xl text-xs transition-colors border border-amber-300"
              >
                Current Week
              </button>
            </div>
          ) : viewMode === 'daily' ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700">Select Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 font-semibold focus:border-amber-500 focus:bg-white focus:outline-none"
              />
              <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[11px] font-bold text-amber-900 font-mono">
                {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700">Month:</span>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-300 shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedMonth === 1) {
                      setSelectedMonth(12);
                      setSelectedYear(prev => prev - 1);
                    } else {
                      setSelectedMonth(prev => prev - 1);
                    }
                  }}
                  className="p-1.5 hover:bg-white rounded-lg text-slate-700 hover:text-slate-950 transition-all font-bold"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-3 py-1 text-xs font-bold text-slate-900 flex items-center gap-1.5 font-mono">
                  <CalendarIcon className="w-3.5 h-3.5 text-amber-600" />
                  {new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('default', { month: 'long' })} {selectedYear}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedMonth === 12) {
                      setSelectedMonth(1);
                      setSelectedYear(prev => prev + 1);
                    } else {
                      setSelectedMonth(prev => prev + 1);
                    }
                  }}
                  className="p-1.5 hover:bg-white rounded-lg text-slate-700 hover:text-slate-950 transition-all font-bold"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
                className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-900 font-semibold focus:border-amber-500 focus:bg-white"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>
                    {new Date(2026, m - 1, 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
                className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-900 font-semibold focus:border-amber-500 focus:bg-white"
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setSelectedMonth(now.getMonth() + 1);
                  setSelectedYear(now.getFullYear());
                }}
                className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold rounded-xl text-xs transition-colors border border-amber-300"
              >
                Current Month
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedMonth(8);
                  setSelectedYear(2026);
                }}
                className={`px-2.5 py-1.5 font-bold rounded-xl text-xs transition-colors border ${
                  selectedMonth === 8 && selectedYear === 2026
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
                title="Jump to August 2026"
              >
                Aug 2026 (Last Month)
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Active/Inactive Tabs, Filters & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Active / Inactive Segmented Switcher */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-300 text-xs shadow-inner">
            <button
              onClick={() => setFilterStaffStatus('ACTIVE')}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                filterStaffStatus === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${filterStaffStatus === 'ACTIVE' ? 'bg-white' : 'bg-emerald-500'}`} />
              Active Staff ({activeCount})
            </button>

            <button
              onClick={() => setFilterStaffStatus('INACTIVE')}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                filterStaffStatus === 'INACTIVE'
                  ? 'bg-slate-800 text-amber-400 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <UserX className="w-3 h-3" />
              Inactive Staff ({inactiveCount})
            </button>

            <button
              onClick={() => setFilterStaffStatus('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                filterStaffStatus === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              All ({employees.length})
            </button>
          </div>

          {/* Search by Employee */}
          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID or name..."
              value={searchEmployee}
              onChange={e => setSearchEmployee(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Site Filter */}
          <select
            value={filterSite}
            onChange={e => setFilterSite(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-slate-800 focus:border-amber-500 text-xs"
          >
            <option value="">All Sites</option>
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.siteName}</option>
            ))}
          </select>

          {/* Dept Filter */}
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-slate-800 focus:border-amber-500 text-xs"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 🌟 MONTHLY ATTENDANCE CONDITION FILTER PILLS */}
      {viewMode === 'monthly' && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 font-bold flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5 text-amber-600" /> Filter In One Page:
            </span>

            <button
              type="button"
              onClick={() => setMonthlyAttendanceFilter('ALL')}
              className={`px-3 py-1 rounded-xl font-bold transition-all ${
                monthlyAttendanceFilter === 'ALL'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              All Records ({monthlyMatrix?.records?.length || 0})
            </button>

            <button
              type="button"
              onClick={() => setMonthlyAttendanceFilter('HAS_LOP')}
              className={`px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                monthlyAttendanceFilter === 'HAS_LOP'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>⚠️ Has LOP / Absents</span>
            </button>

            <button
              type="button"
              onClick={() => setMonthlyAttendanceFilter('HAS_LATE')}
              className={`px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                monthlyAttendanceFilter === 'HAS_LATE'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>⏰ Has Late Marks</span>
            </button>

            <button
              type="button"
              onClick={() => setMonthlyAttendanceFilter('HAS_LEAVE')}
              className={`px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                monthlyAttendanceFilter === 'HAS_LEAVE'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-purple-800 hover:bg-purple-50 border border-purple-200'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>🏖️ Leaves / Half Day</span>
              {(monthlyStats.totalLeave > 0 || monthlyStats.totalHalfDays > 0) && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  monthlyAttendanceFilter === 'HAS_LEAVE' ? 'bg-purple-800 text-purple-100' : 'bg-purple-100 text-purple-800'
                }`}>
                  {monthlyStats.totalLeave > 0 ? `Leaves: ${monthlyStats.totalLeave}d, ` : ''}HD: {monthlyStats.totalHalfDayEquivalent}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMonthlyAttendanceFilter('HAS_OT')}
              className={`px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                monthlyAttendanceFilter === 'HAS_OT'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>⭐ Has Overtime (OT &gt; 0)</span>
            </button>

            <button
              type="button"
              onClick={() => setMonthlyAttendanceFilter('PERFECT')}
              className={`px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                monthlyAttendanceFilter === 'PERFECT'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-sky-800 hover:bg-sky-50 border border-sky-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>✅ 100% Perfect Attendance</span>
            </button>
          </div>

          {(monthlyAttendanceFilter !== 'ALL' || searchEmployee || filterSite || filterDept) && (
            <button
              type="button"
              onClick={() => {
                setMonthlyAttendanceFilter('ALL');
                setSearchEmployee('');
                setFilterSite('');
                setFilterDept('');
                setFilterStaffStatus('ACTIVE');
              }}
              className="text-xs text-amber-700 hover:text-amber-900 font-bold underline px-2 py-1"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* 🌟 MONTHLY KPI SUMMARY METRICS */}
      {viewMode === 'monthly' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Filtered Staff</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{monthlyStats.totalStaff}</p>
            </div>
            <div className="p-2.5 bg-slate-100 rounded-xl text-slate-700">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-emerald-200/80 rounded-2xl p-3 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-emerald-700">Total Present</p>
              <p className="text-xl font-black text-emerald-800 mt-0.5">{monthlyStats.totalPresent} <span className="text-xs font-medium text-emerald-600">days</span></p>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-sky-200/80 rounded-2xl p-3 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-sky-700">Total Week Offs</p>
              <p className="text-xl font-black text-sky-800 mt-0.5">{monthlyStats.totalWeekOff} <span className="text-xs font-medium text-sky-600">days</span></p>
            </div>
            <div className="p-2.5 bg-sky-50 rounded-xl text-sky-600">
              <Coffee className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-amber-200/80 rounded-2xl p-3 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-amber-800">Late Marks</p>
              <p className="text-xl font-black text-amber-900 mt-0.5">{monthlyStats.totalLate}</p>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {monthlyAttendanceFilter === 'HAS_LEAVE' ? (
            <div className="bg-white border border-purple-200/80 rounded-2xl p-3 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-purple-700">🏖️ Leaves & Half Days</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <p className="text-xl font-black text-purple-900">{monthlyStats.totalLeave} <span className="text-xs font-semibold text-purple-600">Leaves</span></p>
                  <span className="text-slate-300 font-bold">•</span>
                  <p className="text-xl font-black text-orange-900">{monthlyStats.totalHalfDayEquivalent} <span className="text-xs font-semibold text-orange-600">HD</span></p>
                </div>
                <p className="text-[10px] text-slate-600 mt-0.5 font-bold">
                  🏖️ Leaves: <span className="text-purple-800">{monthlyStats.totalLeave} day</span>, Half Day: <span className="text-orange-800">{monthlyStats.totalHalfDayEquivalent}</span>
                </p>
              </div>
              <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600">
                <Coffee className="w-5 h-5" />
              </div>
            </div>
          ) : (
            <div className="bg-white border border-rose-200/80 rounded-2xl p-3 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-rose-700">LOP / Absents</p>
                <p className="text-xl font-black text-rose-800 mt-0.5">{monthlyStats.totalLop} <span className="text-xs font-medium text-rose-600">days</span></p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                  Absent: <span className="font-bold text-rose-700">{monthlyStats.totalAbsent}d</span>
                  {monthlyStats.totalHalfDays > 0 && (
                    <span className="text-amber-800 font-bold"> • Half Day: {monthlyStats.totalHalfDayEquivalent}</span>
                  )}
                  {monthlyStats.totalLeave > 0 && (
                    <span className="text-purple-800 font-bold"> • Leaves: {monthlyStats.totalLeave}d</span>
                  )}
                </p>
              </div>
              <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          )}

          <div className="bg-white border border-purple-200/80 rounded-2xl p-3 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-purple-700">Attendance Rate</p>
              <p className="text-xl font-black text-purple-900 mt-0.5">{monthlyStats.avgAttendancePct}%</p>
            </div>
            <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* 🌟 1. WEEKLY SHIFT ROSTER GRID (DAYS WITH DATE) */}
      {viewMode === 'weekly' && (
        loading ? (
          <SkeletonTable rows={10} cols={10} />
        ) : filteredEmployees.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
            <CalendarDays className="w-12 h-12 mx-auto text-slate-400 mb-3" />
            <h3 className="text-base font-bold text-slate-800">
              No {filterStaffStatus === 'ACTIVE' ? 'active' : filterStaffStatus === 'INACTIVE' ? 'inactive' : ''} employees found
            </h3>
            <p className="text-xs mt-1">Adjust your active/inactive filter, site, or department criteria.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Top Banner with Legend */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs">
              <div>
                <span className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-amber-600" />
                  Weekly Shift & Attendance Roster ({filteredEmployees.length} Staff)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Click any day slot to mark or edit shift timings, in/out punch, overtime, or weekly off (WO).
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                  <span className="w-2 h-2 bg-emerald-600 rounded-full" /> P (Present)
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 font-bold border border-sky-300">
                  <Coffee className="w-3 h-3 text-sky-700" /> WO (Week Off)
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold border border-amber-300">
                  <span className="w-2 h-2 bg-amber-600 rounded-full" /> L (Late / Grace)
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 font-bold border border-orange-300">
                  <span className="w-2 h-2 bg-orange-600 rounded-full" /> HD (Half Day)
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold border border-rose-300">
                  <span className="w-2 h-2 bg-rose-600 rounded-full" /> A (Absent)
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold border border-purple-300">
                  <span className="w-2 h-2 bg-purple-600 rounded-full" /> LV (Leave)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                {/* Header */}
                <thead className="bg-slate-100 text-slate-700 text-[11px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 sticky left-0 bg-slate-100 z-20 min-w-[240px] border-r border-slate-200 shadow-xs">
                      Employee & Status
                    </th>
                    {weekDays.map(day => (
                      <th
                        key={day.dateStr}
                        className={`px-3 py-2.5 text-center min-w-[135px] border-r border-slate-200 transition-colors ${
                          day.isToday
                            ? 'bg-amber-200/80 text-amber-950 font-black border-amber-400'
                            : day.isWeekend
                            ? 'bg-slate-200/50 text-slate-700'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center">
                          <span className="uppercase tracking-wider text-[10px] font-extrabold flex items-center gap-1">
                            {day.dayNameFull}
                            {day.isToday && (
                              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black uppercase">
                                Today
                              </span>
                            )}
                          </span>
                          <span className={`text-xs font-mono font-bold mt-0.5 ${day.isToday ? 'text-amber-950 font-black' : 'text-slate-900'}`}>
                            {day.dayNumber} {day.monthShort}
                          </span>
                        </div>
                      </th>
                    ))}
                    <th className="px-1.5 py-2 text-center min-w-[34px] text-emerald-800 font-black border-r border-slate-200" title="Present (P)">P</th>
                    <th className="px-1.5 py-2 text-center min-w-[34px] text-sky-800 font-black border-r border-slate-200" title="Weekly Off (WO)">WO</th>
                    <th className="px-1 py-2 text-center min-w-[30px] text-amber-800 font-black border-r border-slate-200" title="Late (L)">L</th>
                    <th className="px-1.5 py-2 text-center min-w-[34px] text-orange-800 font-black border-r border-slate-200" title="Half Day (HD - 0.5 day worked)">HD</th>
                    <th className="px-1 py-2 text-center min-w-[30px] text-purple-800 font-black border-r border-slate-200" title="Leave (LV - 1 day)">LV</th>
                    <th className="px-1 py-2 text-center min-w-[30px] text-rose-800 font-black border-r border-slate-200" title="Absent (A)">A</th>
                    <th className="px-1.5 py-2 text-center min-w-[34px] text-rose-950 font-black border-r border-slate-200 bg-rose-50" title="Loss of Pay (LOP)">LOP</th>
                    <th className="px-2 py-2 text-center min-w-[50px] text-slate-900 font-bold bg-slate-200/60" title="Total Working Hours">Hrs</th>
                    <th className="px-2 py-2 text-center min-w-[42px] text-cyan-800 font-bold bg-slate-200/60" title="Overtime Hours">OT</th>
                  </tr>
                </thead>

                {/* Body */}
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {filteredEmployees.map(emp => {
                    const empWeeklyMap = weeklyLookup[emp.id] || {};

                    let totalP = 0;
                    let totalWO = 0;
                    let totalL = 0;
                    let totalHD = 0;
                    let totalLV = 0;
                    let totalA = 0;
                    let totalHours = 0;
                    let totalOT = 0;

                    weekDays.forEach(d => {
                      const att = empWeeklyMap[d.dateStr];
                      if (att) {
                        if (att.status === 'PRESENT') totalP++;
                        else if (att.status === 'WEEK_OFF') totalWO++;
                        else if (att.status === 'LATE') { totalP++; totalL++; }
                        else if (att.status === 'HALF_DAY') { totalHD += 0.5; totalP += 0.5; }
                        else if (att.status === 'LEAVE') totalLV++;
                        else if (att.status === 'ABSENT') totalA++;

                        totalHours += att.workingHours || 0;
                        totalOT += att.overtimeHours || 0;
                      }
                    });

                    const payableDays = totalP + totalWO + totalLV;
                    const lopDays = Math.max(0, 7 - payableDays);

                    return (
                      <tr key={emp.id} className="hover:bg-amber-50/20 transition-colors">
                        {/* Sticky Employee Info & Status */}
                        <td className="px-4 py-3 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center font-black text-amber-900 text-xs shrink-0">
                              {emp.firstName?.[0]}{emp.lastName?.[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 truncate leading-tight">
                                  {emp.firstName} {emp.lastName}
                                </span>
                                {/* Active / Inactive Status Badge */}
                                <button
                                  type="button"
                                  onClick={() => setStatusModalEmp(emp)}
                                  title="Click to toggle Active/Inactive status"
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-black tracking-tight border flex items-center gap-1 cursor-pointer transition-all ${
                                    emp.status === 'INACTIVE'
                                      ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'INACTIVE' ? 'bg-slate-500' : 'bg-emerald-500 animate-pulse'}`} />
                                  {emp.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'}
                                </button>
                              </div>

                              <div className="text-[11px] font-mono text-amber-700 font-bold mt-0.5">
                                {emp.employeeId} • {emp.designation?.title || 'Staff'}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{emp.site?.siteName || 'Corporate HQ'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 7 Days Cells */}
                        {weekDays.map(day => {
                          const att = empWeeklyMap[day.dateStr];
                          const isEmpDayOff = isEmployeeWeeklyOffDay(emp, day.dayIndex);

                          return (
                            <td
                              key={day.dateStr}
                              onClick={() => handleOpenSlotModal(emp, day, att)}
                              className={`px-2 py-2 text-center border-r border-slate-200 cursor-pointer hover:bg-amber-100/50 transition-all ${
                                day.isToday ? 'bg-amber-50/50' : ''
                              }`}
                            >
                              {att ? (
                                <div className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border shadow-2xs hover:border-amber-400 hover:shadow-xs transition-all ${
                                  att.status === 'WEEK_OFF'
                                    ? 'bg-sky-50/60 border-sky-200'
                                    : 'bg-white border-slate-200'
                                }`}>
                                  <div className="flex items-center gap-1">
                                    {att.status === 'PRESENT' && (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        PRESENT
                                      </span>
                                    )}
                                    {att.status === 'WEEK_OFF' && (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300 flex items-center gap-1">
                                        <Coffee className="w-2.5 h-2.5 text-sky-600" /> WEEK OFF
                                      </span>
                                    )}
                                    {att.status === 'LATE' && (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                        LATE {att.lateMinutes ? `(${att.lateMinutes}m)` : ''}
                                      </span>
                                    )}
                                    {att.status === 'HALF_DAY' && (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-300">
                                        HALF DAY
                                      </span>
                                    )}
                                    {att.status === 'ABSENT' && (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                        ABSENT
                                      </span>
                                    )}
                                    {att.status === 'LEAVE' && (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                                        LEAVE
                                      </span>
                                    )}
                                    {att.status === 'LOP' && (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-200 text-rose-950 border border-rose-400">
                                        LOP
                                      </span>
                                    )}
                                  </div>

                                  {/* Punch In - Out Times */}
                                  {(att.inTime || att.outTime) && (
                                    <div className="font-mono text-[10px] text-slate-700 font-semibold flex items-center gap-1">
                                      <span>{att.inTime ? formatTimeOnly(att.inTime) : '--'}</span>
                                      <span className="text-slate-400">→</span>
                                      <span>{att.outTime ? formatTimeOnly(att.outTime) : '--'}</span>
                                    </div>
                                  )}

                                  {/* Worked Hours / OT Badge */}
                                  {(att.workingHours > 0 || att.overtimeHours > 0) && (
                                    <div className="flex items-center gap-1 text-[9px] font-mono">
                                      <span className="text-slate-600 font-bold">{att.workingHours}h</span>
                                      {att.overtimeHours > 0 && (
                                        <span className="text-amber-800 font-bold bg-amber-100 px-1 rounded">
                                          +{att.overtimeHours}h OT
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className={`py-2.5 px-1 rounded-xl border border-dashed hover:border-amber-400 hover:bg-white flex flex-col items-center justify-center transition-colors group ${
                                  isEmpDayOff ? 'border-sky-300 bg-sky-50/40 text-sky-700' : 'border-slate-200 text-slate-400'
                                }`}>
                                  {isEmpDayOff ? (
                                    <span className="text-[10px] font-bold text-sky-700 flex items-center gap-1">
                                      <Coffee className="w-3 h-3 text-sky-600" /> WEEK OFF
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 group-hover:text-amber-700 font-semibold flex items-center gap-1">
                                      <Edit3 className="w-3 h-3 text-slate-300 group-hover:text-amber-500" /> + Shift
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Summary Totals */}
                        <td className="px-1.5 py-2 text-center font-bold text-emerald-700 border-r border-slate-200">{totalP}</td>
                        <td className="px-1.5 py-2 text-center font-bold text-sky-700 border-r border-slate-200">{totalWO}</td>
                        <td className="px-1 py-2 text-center font-bold text-amber-700 border-r border-slate-200">{totalL}</td>
                        <td className="px-1.5 py-2 text-center font-bold text-orange-700 border-r border-slate-200">
                          {totalHD > 0 ? (
                            <span className="px-1.5 py-0.5 bg-orange-100 text-orange-900 font-extrabold rounded text-[10px]">
                              {totalHD}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-1 py-2 text-center font-bold text-purple-700 border-r border-slate-200">
                          {totalLV > 0 ? (
                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-900 font-extrabold rounded text-[10px]">
                              {totalLV}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-1 py-2 text-center font-bold text-rose-700 border-r border-slate-200">
                          {totalA > 0 ? (
                            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-900 font-extrabold rounded text-[10px]">
                              {totalA}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-1.5 py-2 text-center font-bold text-rose-900 bg-rose-50/50 border-r border-slate-200">
                          {lopDays > 0 ? (
                            <span className="px-1.5 py-0.5 bg-rose-200/90 text-rose-950 font-extrabold rounded text-[10px]">
                              {lopDays}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center font-mono font-bold text-slate-900 bg-slate-100 border-r border-slate-200 text-[11px]">
                          {totalHours.toFixed(1)}h
                        </td>
                        <td className="px-2 py-2 text-center font-mono font-bold text-cyan-800 bg-cyan-50/60 text-[11px]">
                          {totalOT > 0 ? `+${totalOT.toFixed(1)}h` : '0h'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 font-extrabold text-[11px] border-t-2 border-slate-300 text-slate-900">
                  <tr>
                    <td className="px-4 py-2.5 sticky left-0 bg-slate-100 z-10 border-r border-slate-300 shadow-xs text-left">
                      <div className="font-extrabold text-slate-900">Grand Total ({filteredEmployees.length} Staff)</div>
                    </td>
                    {weekDays.map(day => (
                      <td key={day.dateStr} className="px-2 py-2 text-center border-r border-slate-200 text-slate-400 font-mono text-[9px] select-none">
                        -
                      </td>
                    ))}
                    <td className="px-1.5 py-2 text-center text-emerald-800 border-r border-slate-200 bg-emerald-100/60 font-black">{weeklyTotals.p}</td>
                    <td className="px-1.5 py-2 text-center text-sky-800 border-r border-slate-200 bg-sky-100/60 font-black">{weeklyTotals.wo}</td>
                    <td className="px-1 py-2 text-center text-amber-800 border-r border-slate-200 bg-amber-100/60 font-black">{weeklyTotals.l}</td>
                    <td className="px-1.5 py-2 text-center text-orange-800 border-r border-slate-200 bg-orange-100/60 font-black">{weeklyTotals.hd}</td>
                    <td className="px-1 py-2 text-center text-purple-800 border-r border-slate-200 bg-purple-100/60 font-black">{weeklyTotals.lv}</td>
                    <td className="px-1 py-2 text-center text-rose-800 border-r border-slate-200 bg-rose-100/60 font-black">{weeklyTotals.a}</td>
                    <td className="px-1.5 py-2 text-center text-rose-950 bg-rose-200/70 border-r border-slate-200 font-black">{weeklyTotals.lop}</td>
                    <td className="px-2 py-2 text-center font-mono text-slate-950 bg-slate-200/80 border-r border-slate-200 font-black">{weeklyTotals.hrs}h</td>
                    <td className="px-2 py-2 text-center font-mono text-cyan-900 bg-cyan-100/70 font-black">+{weeklyTotals.ot}h</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )
      )}

      {/* 📋 2. DAILY VIEW TABLE */}
      {viewMode === 'daily' && (
        <div className="space-y-3">
          {/* Daily KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            <div className="bg-white border border-emerald-200 rounded-2xl p-2.5 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-emerald-700">Present (P)</p>
                <p className="text-lg font-black text-emerald-900 mt-0.5">{dailyStats.p} <span className="text-[10px] font-normal text-emerald-600">staff</span></p>
              </div>
              <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">P</span>
            </div>

            <div className="bg-white border border-sky-200 rounded-2xl p-2.5 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-sky-700">Week Off (WO)</p>
                <p className="text-lg font-black text-sky-900 mt-0.5">{dailyStats.wo} <span className="text-[10px] font-normal text-sky-600">staff</span></p>
              </div>
              <span className="w-7 h-7 rounded-lg bg-sky-100 text-sky-800 font-black text-xs flex items-center justify-center">WO</span>
            </div>

            <div className="bg-white border border-amber-200 rounded-2xl p-2.5 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-amber-700">Late (L)</p>
                <p className="text-lg font-black text-amber-900 mt-0.5">{dailyStats.l} <span className="text-[10px] font-normal text-amber-600">staff</span></p>
              </div>
              <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 font-black text-xs flex items-center justify-center">L</span>
            </div>

            <div className="bg-white border border-orange-200 rounded-2xl p-2.5 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-orange-700">Half Day (HD)</p>
                <p className="text-lg font-black text-orange-900 mt-0.5">{dailyStats.hd} <span className="text-[10px] font-normal text-orange-600">({dailyStats.hdEquivalent}d)</span></p>
              </div>
              <span className="w-7 h-7 rounded-lg bg-orange-100 text-orange-900 font-black text-xs flex items-center justify-center">HD</span>
            </div>

            <div className="bg-white border border-purple-200 rounded-2xl p-2.5 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-purple-700">Leaves (LV)</p>
                <p className="text-lg font-black text-purple-900 mt-0.5">{dailyStats.lv} <span className="text-[10px] font-normal text-purple-600">staff</span></p>
              </div>
              <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-900 font-black text-xs flex items-center justify-center">LV</span>
            </div>

            <div className="bg-white border border-rose-200 rounded-2xl p-2.5 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-rose-700">Absent (A)</p>
                <p className="text-lg font-black text-rose-900 mt-0.5">{dailyStats.a} <span className="text-[10px] font-normal text-rose-600">staff</span></p>
              </div>
              <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-900 font-black text-xs flex items-center justify-center">A</span>
            </div>

            <div className="bg-white border border-cyan-200 rounded-2xl p-2.5 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-cyan-800">Hours & OT</p>
                <p className="text-lg font-black text-cyan-950 mt-0.5">{dailyStats.hrs}h <span className="text-[10px] font-bold text-emerald-700">+{dailyStats.ot}h</span></p>
              </div>
              <span className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-900 font-black text-xs flex items-center justify-center">OT</span>
            </div>
          </div>

          {loading ? (
            <SkeletonTable rows={8} cols={7} />
          ) : filteredAttendances.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
              <CalendarDays className="w-12 h-12 mx-auto text-slate-400 mb-3" />
              <h3 className="text-base font-bold text-slate-800">No attendance records found for {selectedDate}</h3>
              <p className="text-xs mt-1">Select an Employee ID above and click "Punch In", "Week Off (WO)", or "Manual Record".</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="px-5 py-3.5">Employee</th>
                      <th className="px-4 py-3.5">Site & Shift</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">In Time</th>
                      <th className="px-4 py-3.5">Out Time</th>
                      <th className="px-4 py-3.5">Late / Overtime</th>
                      <th className="px-4 py-3.5">Total Hours</th>
                      <th className="px-5 py-3.5 text-right">Quick Mark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredAttendances.map(att => (
                      <tr key={att.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-slate-900 leading-tight">
                              {att.employee?.firstName} {att.employee?.lastName}
                            </div>
                            {att.employee?.status === 'INACTIVE' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 text-slate-700">
                                INACTIVE
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-amber-700 font-bold mt-0.5">
                            {att.employee?.employeeId} • {att.employee?.designation?.title}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="text-slate-800 font-semibold">{att.site?.siteName || 'Corporate HQ'}</div>
                          <div className="text-[10px] text-slate-500">{att.shift?.name || 'General Day Shift'}</div>
                        </td>

                        <td className="px-4 py-3.5">
                          <Badge status={att.status} />
                        </td>

                        <td className="px-4 py-3.5 font-mono font-semibold text-slate-800">
                          {formatTimeOnly(att.inTime)}
                        </td>

                        <td className="px-4 py-3.5 font-mono font-semibold text-slate-800">
                          {formatTimeOnly(att.outTime)}
                        </td>

                        <td className="px-4 py-3.5 font-mono">
                          {att.lateMinutes > 0 ? (
                            <span className="text-amber-800 font-bold">Late: {att.lateMinutes}m</span>
                          ) : att.overtimeHours > 0 ? (
                            <span className="text-emerald-700 font-bold">OT: +{att.overtimeHours}h</span>
                          ) : att.status === 'WEEK_OFF' ? (
                            <span className="text-sky-700 font-bold">Statutory Rest</span>
                          ) : (
                            <span className="text-slate-400">On Time</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                          {att.workingHours > 0 ? `${att.workingHours} hrs` : '--'}
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleQuickMarkRow(att.employeeId, 'PRESENT')}
                              title="Mark Present (P)"
                              className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition-colors"
                            >
                              P
                            </button>
                            <button
                              onClick={() => handleQuickMarkRow(att.employeeId, 'WEEK_OFF')}
                              title="Mark Week Off (WO)"
                              className="px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[11px] font-bold transition-colors"
                            >
                              WO
                            </button>
                            <button
                              onClick={() => handleQuickMarkRow(att.employeeId, 'LATE')}
                              title="Mark Late (L)"
                              className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[11px] font-bold transition-colors"
                            >
                              L
                            </button>
                            <button
                              onClick={() => handleQuickMarkRow(att.employeeId, 'HALF_DAY')}
                              title="Mark Half Day (HD - 0.5 day)"
                              className="px-2 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-[11px] font-bold transition-colors"
                            >
                              HD
                            </button>
                            <button
                              onClick={() => handleQuickMarkRow(att.employeeId, 'LEAVE')}
                              title="Mark Leave (LV - 1 day)"
                              className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[11px] font-bold transition-colors"
                            >
                              LV
                            </button>
                            <button
                              onClick={() => handleQuickMarkRow(att.employeeId, 'ABSENT')}
                              title="Mark Absent (A)"
                              className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-colors"
                            >
                              A
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 📊 3. MONTHLY MATRIX GRID (DAYS WITH DATES) */}
      {viewMode === 'monthly' && (
        loading ? (
          <SkeletonTable rows={10} cols={12} />
        ) : !monthlyMatrix || monthlyMatrix.records.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
            <CalendarCheck className="w-12 h-12 mx-auto text-slate-400 mb-3" />
            <h3 className="text-base font-bold text-slate-800">No monthly matrix data available</h3>
            <p className="text-xs text-slate-500 mt-1">Please select another month/year or ensure employee records exist.</p>
          </div>
        ) : filteredMonthlyRecords.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
            <Filter className="w-12 h-12 mx-auto text-amber-500 mb-3" />
            <h3 className="text-base font-bold text-slate-800">No records match your active monthly filters</h3>
            <p className="text-xs text-slate-500 mt-1">
              Currently filtering by {monthlyAttendanceFilter !== 'ALL' ? `Condition: ${monthlyAttendanceFilter}` : ''}{' '}
              {searchEmployee ? `Search: "${searchEmployee}"` : ''} {filterSite ? 'Specific Site' : ''}.
            </p>
            <button
              type="button"
              onClick={() => {
                setMonthlyAttendanceFilter('ALL');
                setSearchEmployee('');
                setFilterSite('');
                setFilterDept('');
                setFilterStaffStatus('ACTIVE');
              }}
              className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs">
              <div>
                <span className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-amber-600" />
                  Monthly Attendance Sheet – {new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('default', { month: 'long' })} {selectedYear} ({filteredMonthlyRecords.length} Staff)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Showing all {monthlyMatrix.totalDays} days in 1 page. Click any date cell to view punches, in/out timings, or modify shift.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                  <span className="w-2 h-2 bg-emerald-600 rounded-full" /> P (Present)
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 font-bold border border-sky-300">
                  <Coffee className="w-3 h-3 text-sky-700" /> WO (Week Off)
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold border border-amber-300">
                  <span className="w-2 h-2 bg-amber-600 rounded-full" /> L (Late)
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-100 text-orange-900 font-bold border border-orange-300">
                  <span className="w-2 h-2 bg-orange-600 rounded-full" /> HD (Half Day: 0.5)
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-bold border border-purple-300">
                  <span className="w-2 h-2 bg-purple-600 rounded-full" /> 🏖️ LV (Leaves: 1 day)
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold border border-rose-300">
                  <span className="w-2 h-2 bg-rose-600 rounded-full" /> A (Absent)
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-900 font-bold border border-rose-200">
                  <span className="w-2 h-2 bg-rose-500 rounded-full" /> LOP (Loss of Pay)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-2.5 py-3 text-left sticky left-0 bg-slate-100 z-20 min-w-[170px] border-r border-slate-300 shadow-xs">
                      Employee & Site
                    </th>
                    {Array.from({ length: monthlyMatrix.totalDays }, (_, i) => {
                      const dayNum = i + 1;
                      const d = new Date(selectedYear, selectedMonth - 1, dayNum);
                      const dayLetter = d.toLocaleDateString('en-US', { weekday: 'narrow' });
                      const isSun = d.getDay() === 0;
                      const isSat = d.getDay() === 6;

                      return (
                        <th
                          key={dayNum}
                          className={`px-0.5 py-2 border-l border-slate-200 min-w-[25px] sm:min-w-[27px] ${
                            isSun ? 'bg-amber-100/50 text-amber-950 font-black' : isSat ? 'bg-slate-200/40 text-slate-800' : ''
                          }`}
                        >
                          <div className={`text-[9px] font-semibold ${isSun ? 'text-amber-800 font-black' : 'text-slate-500'}`}>{dayLetter}</div>
                          <div className="font-bold text-slate-800">{dayNum}</div>
                        </th>
                      );
                    })}
                    <th className="px-1.5 py-3 border-l border-slate-300 min-w-[32px] text-emerald-800 font-black bg-emerald-50/70" title="Present Days">P</th>
                    <th className="px-1.5 py-3 border-l border-slate-200 min-w-[32px] text-sky-800 font-black bg-sky-50/70" title="Weekly Off Days">WO</th>
                    <th className="px-1 py-3 border-l border-slate-200 min-w-[28px] text-amber-800 font-black bg-amber-50/70" title="Late Marks">L</th>
                    <th className="px-1.5 py-3 border-l border-slate-200 min-w-[32px] text-orange-800 font-black bg-orange-50/70" title="Half Day: 0.5 day worked">HD</th>
                    <th className="px-1 py-3 border-l border-slate-200 min-w-[28px] text-purple-800 font-black bg-purple-50/70" title="🏖️ Leaves: 1 day each">LV</th>
                    <th className="px-1 py-3 border-l border-slate-200 min-w-[28px] text-rose-800 font-black bg-rose-50/70" title="Absents">A</th>
                    <th className="px-2 py-3 border-l border-slate-300 min-w-[48px] text-slate-950 font-black bg-amber-100/70" title="Net Payable Days">Payable</th>
                    <th className="px-1.5 py-3 border-l border-slate-200 min-w-[38px] text-rose-900 font-black bg-rose-100/70" title="Loss of Pay Days">LOP</th>
                    <th className="px-1 py-3 border-l border-slate-200 min-w-[40px] text-slate-800 font-bold" title="Total Working Hours">Hrs</th>
                    <th className="px-1 py-3 border-l border-slate-200 min-w-[36px] text-emerald-800 font-bold" title="Total Overtime Hours">OT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {filteredMonthlyRecords.map((rec: any) => {
                    const empSite = sites.find(s => s.id === rec.employee.siteId);
                    const isStaffActive = rec.employee.status === 'ACTIVE' || !rec.employee.status;

                    return (
                      <tr key={rec.employee.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="px-3 py-2 text-left sticky left-0 bg-white z-10 border-r border-slate-300 shadow-xs">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isStaffActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            <span className="font-bold text-slate-900 truncate max-w-[150px]">{rec.employee.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                            <span className="font-mono text-amber-700 font-bold">{rec.employee.employeeId}</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500 truncate max-w-[100px]">{empSite?.siteName?.replace(' Pvt. Ltd', '') || 'Site'}</span>
                          </div>
                        </td>

                        {Array.from({ length: monthlyMatrix.totalDays }, (_, i) => {
                          const dayNum = i + 1;
                          const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                          const dayData = rec.days[dateStr];
                          const status = dayData?.status;
                          const d = new Date(selectedYear, selectedMonth - 1, dayNum);
                          const isSun = d.getDay() === 0;

                          let bg = 'text-slate-300 hover:bg-slate-100';
                          let label = '-';

                          const isSandwichLop = status === 'ABSENT' && dayData?.remarks?.includes('Sandwich Rule');

                          if (status === 'PRESENT') {
                            bg = 'bg-emerald-100/90 text-emerald-900 font-black border border-emerald-300 hover:bg-emerald-200';
                            label = 'P';
                          } else if (status === 'WEEK_OFF') {
                            bg = 'bg-sky-100/90 text-sky-900 font-black border border-sky-300 hover:bg-sky-200';
                            label = 'WO';
                          } else if (status === 'LATE') {
                            bg = 'bg-amber-100/90 text-amber-950 font-black border border-amber-300 hover:bg-amber-200';
                            label = 'L';
                          } else if (status === 'ABSENT') {
                            bg = isSandwichLop
                              ? 'bg-rose-200 text-rose-950 font-black border border-rose-400 hover:bg-rose-300 ring-1 ring-rose-400/50'
                              : 'bg-rose-100/90 text-rose-900 font-black border border-rose-300 hover:bg-rose-200';
                            label = 'A';
                          } else if (status === 'LEAVE') {
                            bg = 'bg-purple-100/90 text-purple-950 font-black border border-purple-300 hover:bg-purple-200';
                            label = 'LV';
                          } else if (status === 'HALF_DAY') {
                            bg = 'bg-orange-100/90 text-orange-950 font-black border border-orange-300 hover:bg-orange-200';
                            label = 'HD';
                          } else if (status === 'LOP') {
                            bg = 'bg-red-200 text-red-950 font-black border border-red-400 hover:bg-red-300 ring-1 ring-red-400/50';
                            label = 'LOP';
                          } else if (isSun) {
                            bg = 'bg-amber-50/40 text-slate-400 hover:bg-amber-100/40';
                          }

                          const tooltip = `${rec.employee.name} | Day ${dayNum} (${dateStr})\nStatus: ${status || 'No record'}${dayData?.remarks ? `\nRemarks: ${dayData.remarks}` : ''}\nIn: ${dayData?.inTime ? formatTimeOnly(dayData.inTime) : '--'} | Out: ${dayData?.outTime ? formatTimeOnly(dayData.outTime) : '--'}\nWorking Hrs: ${dayData?.hours || 0}h | Overtime: ${dayData?.ot || 0}h\nClick to edit or adjust punch`;

                          return (
                            <td
                              key={dayNum}
                              onClick={() => handleOpenMonthlyDayModal(rec, dayNum)}
                              className={`px-0.5 py-1.5 border-l border-slate-200 cursor-pointer transition-all hover:scale-105 hover:z-10 ${bg}`}
                              title={tooltip}
                            >
                              <div className="w-full text-center text-[10px] font-bold select-none relative">
                                {label}
                                {isSandwichLop && (
                                  <span className="absolute -top-1 -right-0.5 w-1.5 h-1.5 bg-rose-600 rounded-full" title="Weekend LOP (Sandwich Rule)" />
                                )}
                              </div>
                            </td>
                          );
                        })}

                        <td className="px-1 py-2 font-bold text-emerald-800 border-l border-slate-300 bg-emerald-50/40">{rec.summary.totalPresent}</td>
                        <td className="px-1 py-2 font-bold text-sky-800 border-l border-slate-200 bg-sky-50/40">{rec.summary.totalWeekOff || 0}</td>
                        <td className="px-1 py-2 font-bold text-amber-800 border-l border-slate-200 bg-amber-50/40">{rec.summary.totalLate || 0}</td>
                        <td className="px-1 py-2 font-bold border-l border-slate-200 bg-orange-50/40" title={`${rec.summary.totalHalfDay || 0} Half Day = ${(rec.summary.totalHalfDay || 0) * 0.5} day`}>
                          {(rec.summary.totalHalfDay || 0) > 0 ? (
                            <span className="inline-block px-1.5 py-0.5 bg-orange-200/90 text-orange-950 font-extrabold rounded text-[10px]">
                              {(rec.summary.totalHalfDay * 0.5)}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-1 py-2 font-bold border-l border-slate-200 bg-purple-50/40" title={`${rec.summary.totalLeave || 0} Leave(s) = ${rec.summary.totalLeave || 0} day`}>
                          {(rec.summary.totalLeave || 0) > 0 ? (
                            <span className="inline-block px-1.5 py-0.5 bg-purple-200/90 text-purple-950 font-extrabold rounded text-[10px]">
                              {rec.summary.totalLeave}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-1 py-2 font-bold border-l border-slate-200 bg-rose-50/40">
                          {(rec.summary.totalAbsent || 0) > 0 ? (
                            <span className="inline-block px-1.5 py-0.5 bg-rose-200/90 text-rose-950 font-extrabold rounded text-[10px]">
                              {rec.summary.totalAbsent}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-2 py-2 font-black text-slate-950 bg-amber-100/70 border-l border-slate-300">{rec.summary.payableDays}</td>
                        <td className="px-1 py-2 font-bold border-l border-slate-200">
                          {(rec.summary.lopDays || 0) > 0 ? (
                            <span className="inline-block px-1.5 py-0.5 bg-rose-100 text-rose-800 font-extrabold rounded text-[10px]">
                              {rec.summary.lopDays}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-1 py-2 font-mono text-slate-700 border-l border-slate-200 text-[10px]">{rec.summary.totalWorkingHours || 0}h</td>
                        <td className="px-1 py-2 font-mono border-l border-slate-200 text-[10px]">
                          {(rec.summary.totalOvertime || 0) > 0 ? (
                            <span className="text-emerald-700 font-bold">+{rec.summary.totalOvertime}h</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 font-extrabold text-[11px] border-t-2 border-slate-300 text-slate-900">
                  <tr>
                    <td className="px-3 py-3 sticky left-0 bg-slate-100 z-10 border-r border-slate-300 shadow-xs text-left">
                      <div className="font-extrabold text-slate-900">Grand Total</div>
                      <div className="text-[10px] text-slate-500 font-normal">{filteredMonthlyRecords.length} Staff Members</div>
                    </td>
                    {Array.from({ length: monthlyMatrix.totalDays }, (_, i) => (
                      <td key={i} className="px-0.5 py-2 border-l border-slate-200 text-slate-400 text-[9px] font-mono select-none">
                        -
                      </td>
                    ))}
                    <td className="px-1 py-2 font-black text-emerald-800 border-l border-slate-300 bg-emerald-100/70" title="Total Present Days across all staff">
                      {monthlyStats.totalPresent}
                    </td>
                    <td className="px-1 py-2 font-black text-sky-800 border-l border-slate-200 bg-sky-100/70" title="Total Week Off Days across all staff">
                      {monthlyStats.totalWeekOff}
                    </td>
                    <td className="px-1 py-2 font-black text-amber-800 border-l border-slate-200 bg-amber-100/70" title="Total Late Marks across all staff">
                      {monthlyStats.totalLate}
                    </td>
                    <td className="px-1 py-2 font-black text-orange-900 border-l border-slate-200 bg-orange-100/70" title="Total Half Days across all staff">
                      {monthlyStats.totalHalfDayEquivalent}
                    </td>
                    <td className="px-1 py-2 font-black text-purple-900 border-l border-slate-200 bg-purple-100/70" title="Total Leaves across all staff">
                      {monthlyStats.totalLeave}
                    </td>
                    <td className="px-1 py-2 font-black text-rose-800 border-l border-slate-200 bg-rose-100/70" title="Total Absents across all staff">
                      {monthlyStats.totalAbsent}
                    </td>
                    <td className="px-2 py-2 font-black text-slate-950 border-l border-slate-300 bg-amber-200/80" title="Total Net Payable Days across all staff">
                      {monthlyStats.totalPayable}
                    </td>
                    <td className="px-1 py-2 font-black text-rose-950 border-l border-slate-200 bg-rose-200/70" title="Total LOP Days across all staff">
                      {monthlyStats.totalLop}
                    </td>
                    <td className="px-1 py-2 font-mono font-black text-slate-950 border-l border-slate-200 bg-slate-200/80 text-[10px]" title="Total Working Hours across all staff">
                      {monthlyStats.totalWorkingHours}h
                    </td>
                    <td className="px-1 py-2 font-mono font-black text-emerald-900 border-l border-slate-200 bg-emerald-100/70 text-[10px]" title="Total Overtime Hours across all staff">
                      +{monthlyStats.totalOtHours}h
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )
      )}

      {/* 🌟 EMPLOYEE ACTIVE / INACTIVE TOGGLE MODAL */}
      <Modal
        isOpen={!!statusModalEmp}
        onClose={() => setStatusModalEmp(null)}
        title="Employee Active / Inactive Status Manager"
        subtitle={statusModalEmp ? `${statusModalEmp.firstName} ${statusModalEmp.lastName} (${statusModalEmp.employeeId})` : ''}
        maxWidth="md"
      >
        {statusModalEmp && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div>
                <div className="font-extrabold text-sm text-slate-900">
                  {statusModalEmp.firstName} {statusModalEmp.lastName}
                </div>
                <div className="text-xs font-mono text-amber-700 font-bold mt-0.5">
                  ID: {statusModalEmp.employeeId} • {statusModalEmp.designation?.title || 'Staff'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{statusModalEmp.site?.siteName || 'Corporate HQ'}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Current State</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${
                  statusModalEmp.status === 'INACTIVE'
                    ? 'bg-slate-200 text-slate-800 border-slate-400'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {statusModalEmp.status || 'ACTIVE'}
                </span>
              </div>
            </div>

            {/* Change Status Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleToggleEmployeeStatus(statusModalEmp, 'ACTIVE')}
                disabled={isUpdatingEmpStatus || statusModalEmp.status === 'ACTIVE'}
                className={`p-3.5 rounded-2xl border font-bold flex flex-col items-center gap-2 transition-all ${
                  statusModalEmp.status !== 'INACTIVE'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-900 cursor-default'
                    : 'bg-white hover:bg-emerald-50 border-slate-300 hover:border-emerald-500 text-slate-800'
                }`}
              >
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-extrabold">Mark as ACTIVE</span>
                <span className="text-[10px] text-slate-500 text-center font-normal">
                  Staff member is currently deployed and will appear on active rosters & payroll.
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleEmployeeStatus(statusModalEmp, 'INACTIVE')}
                disabled={isUpdatingEmpStatus || statusModalEmp.status === 'INACTIVE'}
                className={`p-3.5 rounded-2xl border font-bold flex flex-col items-center gap-2 transition-all ${
                  statusModalEmp.status === 'INACTIVE'
                    ? 'bg-slate-200 border-slate-600 text-slate-900 cursor-default'
                    : 'bg-white hover:bg-slate-100 border-slate-300 hover:border-slate-600 text-slate-800'
                }`}
              >
                <UserX className="w-5 h-5 text-slate-600" />
                <span className="text-xs font-extrabold">Mark as INACTIVE</span>
                <span className="text-[10px] text-slate-500 text-center font-normal">
                  Archived / Ex-Staff. Hidden from daily punch consoles & active schedules.
                </span>
              </button>
            </div>

            {/* Set Specific Weekly Off for this employee */}
            <div className="p-3.5 bg-sky-50/50 border border-sky-200 rounded-2xl mt-3">
              <div className="font-bold text-sky-950 flex items-center gap-1.5 mb-1.5">
                <Coffee className="w-4 h-4 text-sky-600" />
                <span>Assigned Weekly Off Day</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {[
                  { name: 'Sun', idx: 0 },
                  { name: 'Mon', idx: 1 },
                  { name: 'Tue', idx: 2 },
                  { name: 'Wed', idx: 3 },
                  { name: 'Thu', idx: 4 },
                  { name: 'Fri', idx: 5 },
                  { name: 'Sat', idx: 6 },
                ].map(d => {
                  const isSelected = isEmployeeWeeklyOffDay(statusModalEmp, d.idx);

                  return (
                    <button
                      type="button"
                      key={d.idx}
                      onClick={() => handleSetEmployeeWeeklyOff(statusModalEmp.id, d.idx)}
                      className={`py-1.5 text-center rounded-xl font-bold border transition-all text-xs ${
                        isSelected
                          ? 'bg-sky-600 text-white border-sky-700 shadow-xs'
                          : 'bg-white hover:bg-sky-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {d.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setStatusModalEmp(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 🌟 WEEKLY OFF (WO) BATCH AUTO-APPLY TOOL */}
      <Modal
        isOpen={isWeeklyOffModalOpen}
        onClose={() => setIsWeeklyOffModalOpen(false)}
        title="Weekly Off (WO) Automation Tool"
        subtitle={`Current Week Window: ${weekDays[0].dayNameShort} ${weekDays[0].dayNumber} ${weekDays[0].monthShort} – ${weekDays[6].dayNameShort} ${weekDays[6].dayNumber} ${weekDays[6].monthShort} ${weekDays[6].date.getFullYear()}`}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-sky-50 border border-sky-300 rounded-2xl flex items-start gap-3">
            <Coffee className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-extrabold text-sky-950 text-xs">Weekly Rest Day Compliance</div>
              <p className="text-[11px] text-sky-900 mt-0.5">
                Under statutory labor rules, staff are entitled to designated paid Weekly Off (WO) days.
                Microsoft India and Head Office staff operate on a 5-day work week (Both Saturday & Sunday are Week Off).
                Select a day below to auto-assign Weekly Off records across the current 7-day roster for all matching staff.
              </p>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-2">Select Day of Week to Apply WEEK OFF (WO):</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {weekDays.map(d => (
                <button
                  type="button"
                  key={d.dateStr}
                  onClick={() => setDefaultWeeklyOffDay(d.dayIndex)}
                  className={`p-2.5 rounded-2xl border text-center transition-all ${
                    defaultWeeklyOffDay === d.dayIndex
                      ? 'bg-sky-600 text-white border-sky-700 shadow-md font-black'
                      : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800 font-bold'
                  }`}
                >
                  <div className="text-xs uppercase">{d.dayNameFull}</div>
                  <div className="text-[11px] font-mono mt-0.5 opacity-90">{d.dayNumber} {d.monthShort}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-slate-700">
            <span>Target Staff Scope:</span>
            <span className="font-bold text-slate-900">
              {filteredEmployees.length} {filterStaffStatus === 'ACTIVE' ? 'Active' : filterStaffStatus === 'INACTIVE' ? 'Inactive' : ''} Staff Members
            </span>
          </div>

          {/* 🥪 Weekend Sandwich Rule (Friday / Monday absent -> Sunday LOP) */}
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarX className="w-4 h-4 text-rose-600" />
                <span className="font-bold text-rose-950 text-xs">Weekend Sandwich Rule (Weekend LOP)</span>
              </div>
              <button
                type="button"
                disabled={isApplyingSandwich}
                onClick={handleApplySandwichRule}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-xl shadow-xs flex items-center gap-1 transition-all"
              >
                {isApplyingSandwich ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5" />
                )}
                Run Sandwich Rule
              </button>
            </div>
            <p className="text-[11px] text-rose-900 leading-relaxed">
              If an employee does not come to office on <strong>Friday</strong>, <strong>Saturday</strong> is marked <strong>Absent / LOP</strong>.
              If an employee does not come to office on <strong>Monday</strong>, <strong>Sunday</strong> is marked <strong>Absent / LOP</strong>.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsWeeklyOffModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isApplyingWeeklyOff}
              onClick={() => handleBatchApplyWeeklyOff(defaultWeeklyOffDay)}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-black rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            >
              {isApplyingWeeklyOff ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Applying...
                </>
              ) : (
                <>
                  <CheckCheck className="w-4 h-4" /> 1-Click Auto-Apply Week Off
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* QUICK ROSTER SLOT EDIT MODAL */}
      <Modal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        title={`Edit Shift & Attendance Slot`}
        subtitle={`${slotModalData.employee?.firstName} ${slotModalData.employee?.lastName} (${slotModalData.employee?.employeeId}) • ${slotModalData.day?.dayNameFull}, ${slotModalData.day?.dayNumber} ${slotModalData.day?.monthShort} ${slotModalData.day?.date.getFullYear()}`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveSlotModal} className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-200 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span>{slotModalData.employee?.firstName} {slotModalData.employee?.lastName}</span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                  slotModalData.employee?.status === 'INACTIVE' ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {slotModalData.employee?.status || 'ACTIVE'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-amber-800 font-bold mt-0.5">
                {slotModalData.employee?.employeeId} • {slotModalData.employee?.designation?.title}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-black text-slate-800 uppercase">
                {slotModalData.day?.dayNameFull}
              </div>
              <div className="text-xs font-bold text-amber-900 font-mono">
                {slotModalData.day?.dateStr}
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Attendance Status *</label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {[
                { status: 'PRESENT', code: 'P', label: 'Present', color: 'emerald' },
                { status: 'WEEK_OFF', code: 'WO', label: 'Week Off', color: 'sky' },
                { status: 'LATE', code: 'L', label: 'Late', color: 'amber' },
                { status: 'HALF_DAY', code: 'HD', label: 'Half Day', color: 'orange' },
                { status: 'LEAVE', code: 'LV', label: 'Leave', color: 'purple' },
                { status: 'ABSENT', code: 'A', label: 'Absent', color: 'rose' },
                { status: 'LOP', code: 'LOP', label: 'Loss of Pay', color: 'red' },
              ].map(st => {
                const isSelected = slotModalData.status === st.status;
                return (
                  <button
                    type="button"
                    key={st.status}
                    onClick={() => setSlotModalData({ ...slotModalData, status: st.status as AttendanceStatus })}
                    className={`py-2 px-1 rounded-xl font-bold border transition-all text-center flex flex-col items-center justify-center ${
                      isSelected
                        ? st.status === 'WEEK_OFF'
                          ? 'bg-sky-600 text-white border-sky-700 shadow-md ring-2 ring-sky-400'
                          : st.status === 'PRESENT'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400'
                          : st.status === 'LATE'
                          ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md ring-2 ring-amber-400'
                          : st.status === 'HALF_DAY'
                          ? 'bg-orange-500 text-white border-orange-600 shadow-md ring-2 ring-orange-400'
                          : st.status === 'LEAVE'
                          ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-400'
                          : st.status === 'ABSENT'
                          ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-400'
                          : 'bg-red-700 text-white border-red-800 shadow-md ring-2 ring-red-500'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="text-sm font-black">{st.code}</span>
                    <span className="text-[10px] font-medium leading-tight opacity-90">{st.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assigned Shift</label>
              <select
                value={slotModalData.shiftId}
                onChange={e => {
                  const sId = e.target.value;
                  const matchedShift = shifts.find(s => s.id === sId);
                  setSlotModalData({
                    ...slotModalData,
                    shiftId: sId,
                    inTime: matchedShift?.startTime ? formatTime24(matchedShift.startTime, '09:30') : slotModalData.inTime,
                    outTime: matchedShift?.endTime ? formatTime24(matchedShift.endTime, '18:30') : slotModalData.outTime,
                  });
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:border-amber-500"
              >
                <option value="">Default Site Shift</option>
                {shifts.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.startTime} - {s.endTime})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Client Site</label>
              <select
                value={slotModalData.siteId}
                onChange={e => setSlotModalData({ ...slotModalData, siteId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:border-amber-500"
              >
                {sites.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.siteName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(slotModalData.status === 'PRESENT' || slotModalData.status === 'LATE' || slotModalData.status === 'HALF_DAY') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Punch In Time</label>
                <input
                  type="time"
                  value={slotModalData.inTime}
                  onChange={e => setSlotModalData({ ...slotModalData, inTime: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Punch Out Time</label>
                <input
                  type="time"
                  value={slotModalData.outTime}
                  onChange={e => setSlotModalData({ ...slotModalData, outTime: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:border-amber-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
            <input
              type="text"
              placeholder="e.g. Approved Overtime / Special Shift / Rest Day"
              value={slotModalData.remarks}
              onChange={e => setSlotModalData({ ...slotModalData, remarks: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsSlotModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingSlot}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl shadow-sm transition-all"
            >
              {isSavingSlot ? 'Saving...' : 'Save Slot'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MANUAL MARK ATTENDANCE MODAL */}
      <Modal
        isOpen={isMarkOpen}
        onClose={() => setIsMarkOpen(false)}
        title="Record Daily Attendance & Punch"
        subtitle="Automatic calculation of grace period (15m), late minutes & overtime hours"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveAttendance} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Employee *</label>
            <select
              required
              value={markData.employeeId}
              onChange={e => setMarkData({ ...markData, employeeId: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:border-amber-500 focus:bg-white"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.employeeId} - {emp.firstName} {emp.lastName} ({emp.status === 'INACTIVE' ? 'INACTIVE' : emp.site?.siteName || 'Corporate'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={markData.date}
                onChange={e => setMarkData({ ...markData, date: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:border-amber-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Attendance Status *</label>
              <select
                value={markData.status}
                onChange={e => setMarkData({ ...markData, status: e.target.value as AttendanceStatus })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-amber-500 focus:bg-white"
              >
                <option value="PRESENT">PRESENT</option>
                <option value="WEEK_OFF">WEEK OFF (WO)</option>
                <option value="LATE">LATE</option>
                <option value="ABSENT">ABSENT</option>
                <option value="HALF_DAY">HALF DAY</option>
                <option value="HOLIDAY">HOLIDAY</option>
                <option value="LEAVE">LEAVE</option>
                <option value="ON_DUTY">ON DUTY</option>
                <option value="LOP">LOSS OF PAY (LOP)</option>
              </select>
            </div>
          </div>

          {(markData.status === 'PRESENT' || markData.status === 'LATE' || markData.status === 'HALF_DAY') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">IN Punch Time</label>
                <input
                  type="time"
                  value={markData.inTime}
                  onChange={e => setMarkData({ ...markData, inTime: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:border-amber-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">OUT Punch Time</label>
                <input
                  type="time"
                  value={markData.outTime}
                  onChange={e => setMarkData({ ...markData, outTime: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
            <input
              type="text"
              placeholder="e.g. Biometric manual punch / Site duty / Weekly Rest Day"
              value={markData.remarks}
              onChange={e => setMarkData({ ...markData, remarks: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:bg-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsMarkOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-md transition-all"
            >
              Calculate & Record
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
