import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Users,
  RefreshCw,
  Sparkles,
  Calculator,
  Building2,
  CheckCircle2,
  Receipt,
  Layers,
  Save,
  Sliders,
  User,
  UserCheck,
  Search,
  Briefcase,
  Calendar,
  CreditCard,
  Phone,
  ShieldCheck,
  Edit3,
  ArrowRight,
  FileText,
  Clock,
  TrendingUp,
  CalendarCheck,
} from 'lucide-react';
import { formatCurrency, formatDate, exportToExcel } from '../../utils/formatters';
import { useNotifications } from '../../contexts/NotificationContext';
import api from '../../services/api';

interface FacilityRateCardModuleProps {
  siteId?: string;
  siteName?: string;
  onSaved?: () => void;
  showSiteSelector?: boolean;
}

export const FacilityRateCardModule: React.FC<FacilityRateCardModuleProps> = ({
  siteId: propSiteId,
  siteName: propSiteName,
  onSaved,
  showSiteSelector = true,
}) => {
  const { showToast } = useNotifications();

  // Mode: Person-to-Person vs Site Rate Card
  const [activeMode, setActiveMode] = useState<'PERSON_TO_PERSON' | 'SITE_RATE_CARD'>('PERSON_TO_PERSON');

  // Sites & Employees Data
  const [sites, setSites] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Site Rate Card State
  const [selectedSiteId, setSelectedSiteId] = useState<string>(propSiteId || '');
  const [currentSiteName, setCurrentSiteName] = useState<string>(propSiteName || '');
  const [isSavingSite, setIsSavingSite] = useState(false);

  // Person-to-Person State
  const [filterSiteId, setFilterSiteId] = useState<string>('VPHS_HO');
  const [employeeSearch, setEmployeeSearch] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isSavingEmployee, setIsSavingEmployee] = useState<boolean>(false);

  // Core Rate Card Inputs (Monthly values)
  const [basic, setBasic] = useState<number>(6000);
  const [da, setDa] = useState<number>(10000);
  const [hra, setHra] = useState<number>(6783);
  const [specialAllowance, setSpecialAllowance] = useState<number>(0);

  // Statutory & Employer Contributions
  const [esiPercent, setEsiPercent] = useState<number>(3.25);
  const [esiAmount, setEsiAmount] = useState<number>(613);
  const [isEsiAuto, setIsEsiAuto] = useState<boolean>(false);

  const [pfPercent, setPfPercent] = useState<number>(13); // 12% PF + 0.5% EDLI + 0.5% Admin
  const [pfAmount, setPfAmount] = useState<number>(1950);
  const [isPfAuto, setIsPfAuto] = useState<boolean>(false);

  const [bonusPercent, setBonusPercent] = useState<number>(8.33);
  const [bonusAmount, setBonusAmount] = useState<number>(1333);
  const [isBonusAuto, setIsBonusAuto] = useState<boolean>(false);

  const [leaveWages, setLeaveWages] = useState<number>(2848);
  const [telanganaLwf, setTelanganaLwf] = useState<number>(0.17);
  const [uniformAllowance, setUniformAllowance] = useState<number>(200);

  // Employee Statutory Deductions
  const [employeePfPercent, setEmployeePfPercent] = useState<number>(12);
  const [employeePfAmount, setEmployeePfAmount] = useState<number>(1800); // 12% on ₹15k cap
  const [isEmployeePfAuto, setIsEmployeePfAuto] = useState<boolean>(false);

  const [employeeEsiPercent, setEmployeeEsiPercent] = useState<number>(0.75);
  const [employeeEsiAmount, setEmployeeEsiAmount] = useState<number>(171); // 0.75% on Gross
  const [isEmployeeEsiAuto, setIsEmployeeEsiAuto] = useState<boolean>(false);

  const [professionalTax, setProfessionalTax] = useState<number>(200);
  const [employeeLwf, setEmployeeLwf] = useState<number>(2);

  // Headcount (1 for individual, N for site)
  const [headcount, setHeadcount] = useState<number>(activeMode === 'PERSON_TO_PERSON' ? 1 : 12);

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Update headcount when mode changes
  useEffect(() => {
    if (activeMode === 'PERSON_TO_PERSON') {
      setHeadcount(1);
    } else {
      if (headcount === 1) setHeadcount(12);
    }
  }, [activeMode]);

  // When selectedSiteId changes in Site Mode, load site rate card
  useEffect(() => {
    if (selectedSiteId && activeMode === 'SITE_RATE_CARD') {
      loadSiteRateCard(selectedSiteId);
    }
  }, [selectedSiteId, activeMode]);

  // When selectedEmployeeId changes in Person-to-Person mode, load employee
  useEffect(() => {
    if (selectedEmployeeId && allEmployees.length > 0) {
      const emp = allEmployees.find(e => e.id === selectedEmployeeId || e.employeeId === selectedEmployeeId);
      if (emp) {
        setSelectedEmployee(emp);
        loadEmployeeRateCard(emp);
      }
    }
  }, [selectedEmployeeId, allEmployees]);

  const fetchInitialData = async () => {
    try {
      setLoadingData(true);
      const [sitesRes, empRes]: any = await Promise.all([
        api.get('/sites'),
        api.get('/employees?limit=300'),
      ]);

      if (sitesRes.success && sitesRes.data) {
        setSites(sitesRes.data);
        if (propSiteId) {
          const found = sitesRes.data.find((s: any) => s.id === propSiteId);
          if (found) {
            setSelectedSiteId(found.id);
            setCurrentSiteName(found.siteName);
          }
        }
      }

      if (empRes.success && empRes.data) {
        setAllEmployees(empRes.data);
        // Find Head office staff or first staff
        const hoSite = sitesRes.data?.find((s: any) => s.siteCode === 'VPHS0001' || s.siteName?.includes('HEAD OFFICE'));
        const hoEmps = empRes.data.filter((e: any) =>
          (hoSite && e.siteId === hoSite.id) ||
          e.site?.siteCode === 'VPHS0001' ||
          e.site?.siteName?.includes('HEAD OFFICE') ||
          e.department?.name?.includes('Management') ||
          e.department?.name?.includes('HR')
        );

        const targetEmp = hoEmps.length > 0 ? hoEmps[0] : empRes.data[0];
        if (targetEmp) {
          setSelectedEmployeeId(targetEmp.id);
          setSelectedEmployee(targetEmp);
          loadEmployeeRateCard(targetEmp);
        }
      }
    } catch (e) {
      console.error('Error loading initial data:', e);
    } finally {
      setLoadingData(false);
    }
  };

  const loadSiteRateCard = async (id: string) => {
    try {
      const res: any = await api.get(`/sites/${id}/rate-card`);
      if (res.success && res.data) {
        const s = res.data;
        setCurrentSiteName(s.siteName);
        if (s.rateCard) {
          applyRateCardValues(s.rateCard);
          showToast(`Loaded customized rate card for ${s.siteName}`, 'info');
        }
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadEmployeeRateCard = (emp: any) => {
    if (!emp) return;
    const s = emp.salaryStructures?.[0];
    if (s) {
      setBasic(s.basic || 6000);
      setDa(s.da || 10000);
      setHra(s.hra || 6783);
      setSpecialAllowance(s.specialAllowance || 0);
      setUniformAllowance(s.uniformAllowance || 200);
      setLeaveWages(s.leaveWages || 2848);
      setPfAmount(s.employerPf || 1950);
      setEsiAmount(s.employerEsi || 613);
      setBonusAmount(s.bonus || 1333);
      setTelanganaLwf(s.telanganaLwf || 0.17);
      setEmployeePfAmount(s.employeePf || 1800);
      setEmployeeEsiAmount(s.employeeEsi || 171);
      setProfessionalTax(s.professionalTax || 200);
      setEmployeeLwf(2);
      setHeadcount(1);
      showToast(`Loaded individual rate card for ${emp.firstName} ${emp.lastName}`, 'info');
    } else {
      // Default to VPHS Standard
      handleLoadVphsStandard1StaffPreset();
    }
  };

  const applyRateCardValues = (rc: any) => {
    if (rc.basic !== undefined) setBasic(rc.basic);
    if (rc.da !== undefined) setDa(rc.da);
    if (rc.hra !== undefined) setHra(rc.hra);
    if (rc.specialAllowance !== undefined) setSpecialAllowance(rc.specialAllowance);
    if (rc.uniformAllowance !== undefined) setUniformAllowance(rc.uniformAllowance);
    if (rc.leaveWages !== undefined) setLeaveWages(rc.leaveWages);
    if (rc.esiAmount !== undefined) setEsiAmount(rc.esiAmount);
    if (rc.esiPercent !== undefined) setEsiPercent(rc.esiPercent);
    if (rc.pfAmount !== undefined) setPfAmount(rc.pfAmount);
    if (rc.pfPercent !== undefined) setPfPercent(rc.pfPercent);
    if (rc.bonusAmount !== undefined) setBonusAmount(rc.bonusAmount);
    if (rc.bonusPercent !== undefined) setBonusPercent(rc.bonusPercent);
    if (rc.telanganaLwf !== undefined) setTelanganaLwf(rc.telanganaLwf);
    if (rc.employeePfAmount !== undefined) setEmployeePfAmount(rc.employeePfAmount);
    if (rc.employeeEsiAmount !== undefined) setEmployeeEsiAmount(rc.employeeEsiAmount);
    if (rc.professionalTax !== undefined) setProfessionalTax(rc.professionalTax);
    if (rc.employeeLwf !== undefined) setEmployeeLwf(rc.employeeLwf);
    if (rc.headcount !== undefined && activeMode === 'SITE_RATE_CARD') setHeadcount(rc.headcount);
  };

  // Filtered employees for dropdown and summary table
  const headOfficeSite = useMemo(() => {
    return sites.find(s => s.siteCode === 'VPHS0001' || s.siteName?.includes('HEAD OFFICE'));
  }, [sites]);

  const filteredEmployees = useMemo(() => {
    return allEmployees.filter(emp => {
      // Filter by Site
      if (filterSiteId === 'VPHS_HO') {
        const isHO =
          (headOfficeSite && emp.siteId === headOfficeSite.id) ||
          emp.site?.siteCode === 'VPHS0001' ||
          emp.site?.siteName?.includes('HEAD OFFICE') ||
          emp.department?.name?.includes('Management') ||
          emp.department?.name?.includes('HR');
        if (!isHO && emp.siteId) return false;
      } else if (filterSiteId !== 'ALL') {
        if (emp.siteId !== filterSiteId) return false;
      }

      // Filter by Search Query
      if (employeeSearch.trim()) {
        const q = employeeSearch.toLowerCase();
        const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
        const code = (emp.employeeId || '').toLowerCase();
        const desg = (emp.designation?.title || '').toLowerCase();
        return fullName.includes(q) || code.includes(q) || desg.includes(q);
      }

      return true;
    });
  }, [allEmployees, filterSiteId, employeeSearch, headOfficeSite]);

  // Computed Values
  const subTotal1 = basic + da; // 16000
  const gross = subTotal1 + hra + specialAllowance + uniformAllowance; // 22783
  // Auto-calculated Leave Wages @ 12.5% of Gross = ₹2,848 on standard ₹22,783
  const computedLeaveWages = Math.round(gross * 0.125) || 2848;

  // Employer Dynamic calculations
  const computedEsi = isEsiAuto ? Math.round((subTotal1 * esiPercent) / 100) : esiAmount;
  const computedPf = isPfAuto ? Math.round((Math.min(subTotal1, 15000) * pfPercent) / 100) : pfAmount;
  const computedBonus = isBonusAuto ? Math.round((subTotal1 * bonusPercent) / 100) : bonusAmount;

  // Employee Dynamic calculations
  const computedEmployeePf = isEmployeePfAuto ? Math.round((Math.min(subTotal1, 15000) * employeePfPercent) / 100) : employeePfAmount;
  const computedEmployeeEsi = isEmployeeEsiAuto ? Math.round((gross * employeeEsiPercent) / 100) : employeeEsiAmount;
  const totalEmployeeDeductions = Math.round(computedEmployeePf + computedEmployeeEsi + professionalTax + employeeLwf);
  const netTakeHomeSalary = Math.round(gross - totalEmployeeDeductions);

  const totalPerPerson = Math.round(
    gross + computedEsi + computedPf + computedBonus + computedLeaveWages + telanganaLwf
  ); // 29727

  const totalCtc = Math.round(totalPerPerson * headcount);
  const annualCtc = totalCtc * 12; // 356722 / yr for 1 person

  // Save to Employee Profile
  const handleSaveToEmployeeProfile = async () => {
    if (!selectedEmployee) {
      showToast('Please select a staff member first', 'warning');
      return;
    }

    try {
      setIsSavingEmployee(true);
      const res: any = await api.put(`/employees/${selectedEmployee.id}/salary-structure`, {
        ctc: totalPerPerson,
        basic,
        da,
        specialAllowance,
        uniformAllowance,
        leaveWages: computedLeaveWages,
        hra,
        employerPf: computedPf,
        employerEsi: computedEsi,
        bonus: computedBonus,
        telanganaLwf,
        employeePf: computedEmployeePf,
        employeeEsi: computedEmployeeEsi,
        professionalTax,
        employeeLwf,
      });

      if (res.success) {
        showToast(
          `Statutory Rate Card saved to ${selectedEmployee.firstName} ${selectedEmployee.lastName}'s permanent record!`,
          'success'
        );
        fetchInitialData();
        if (onSaved) onSaved();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save individual rate card', 'error');
    } finally {
      setIsSavingEmployee(false);
    }
  };

  // Save to Site
  const handleSaveSiteRateCard = async () => {
    if (!selectedSiteId) {
      showToast('Please select a site to save this customized rate card', 'warning');
      return;
    }

    try {
      setIsSavingSite(true);
      const rateCardPayload = {
        basic,
        da,
        subTotal1,
        hra,
        specialAllowance,
        gross,
        esiPercent,
        esiAmount: computedEsi,
        pfPercent,
        pfAmount: computedPf,
        bonusPercent,
        bonusAmount: computedBonus,
        leaveWages: computedLeaveWages,
        telanganaLwf,
        uniformAllowance,
        employeePfPercent,
        employeePfAmount: computedEmployeePf,
        employeeEsiPercent,
        employeeEsiAmount: computedEmployeeEsi,
        professionalTax,
        employeeLwf,
        totalEmployeeDeductions,
        netTakeHomeSalary,
        totalPerPerson,
        headcount,
        totalCtc,
        annualCtc,
        updatedAt: new Date().toISOString(),
      };

      const res: any = await api.put(`/sites/${selectedSiteId}/rate-card`, {
        rateCard: rateCardPayload,
      });

      if (res.success) {
        showToast(`Saved customized Statutory Rate Card for ${currentSiteName || 'Site'} successfully!`, 'success');
        if (onSaved) onSaved();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save site rate card', 'error');
    } finally {
      setIsSavingSite(false);
    }
  };

  // Presets
  const handleLoadVphsStandard1StaffPreset = () => {
    setBasic(6000);
    setDa(10000);
    setHra(6783);
    setSpecialAllowance(0);
    setEsiPercent(3.25);
    setEsiAmount(613);
    setIsEsiAuto(false);
    setPfPercent(13);
    setPfAmount(1950);
    setIsPfAuto(false);
    setBonusPercent(8.33);
    setBonusAmount(1333);
    setIsBonusAuto(false);
    setLeaveWages(2848);
    setTelanganaLwf(0.17);
    setUniformAllowance(200);
    setEmployeePfPercent(12);
    setEmployeePfAmount(1800);
    setIsEmployeePfAuto(false);
    setEmployeeEsiPercent(0.75);
    setEmployeeEsiAmount(171);
    setIsEmployeeEsiAuto(false);
    setProfessionalTax(200);
    setEmployeeLwf(2);
    setHeadcount(activeMode === 'PERSON_TO_PERSON' ? 1 : 1);
    showToast('Loaded VPHS Standard (1 Staff) Rate Card', 'success');
  };

  const handleLoadVphsStandardPreset = () => {
    setBasic(6000);
    setDa(10000);
    setHra(6783);
    setSpecialAllowance(0);
    setEsiPercent(3.25);
    setEsiAmount(613);
    setIsEsiAuto(false);
    setPfPercent(13);
    setPfAmount(1950);
    setIsPfAuto(false);
    setBonusPercent(8.33);
    setBonusAmount(1333);
    setIsBonusAuto(false);
    setLeaveWages(2848);
    setTelanganaLwf(0.17);
    setUniformAllowance(200);
    setEmployeePfPercent(12);
    setEmployeePfAmount(1800);
    setIsEmployeePfAuto(false);
    setEmployeeEsiPercent(0.75);
    setEmployeeEsiAmount(171);
    setIsEmployeeEsiAuto(false);
    setProfessionalTax(200);
    setEmployeeLwf(2);
    setHeadcount(12);
    showToast('Loaded VPHS Standard (12 Staff) Facility Rate Card', 'success');
  };

  const handleLoadHousekeepingPreset = () => {
    setBasic(5000);
    setDa(8000);
    setHra(4500);
    setSpecialAllowance(0);
    setEsiPercent(3.25);
    setEsiAmount(423);
    setIsEsiAuto(true);
    setPfPercent(13);
    setPfAmount(1690);
    setIsPfAuto(true);
    setBonusPercent(8.33);
    setBonusAmount(1083);
    setIsBonusAuto(true);
    setLeaveWages(2188);
    setTelanganaLwf(0.17);
    setUniformAllowance(200);
    setEmployeePfPercent(12);
    setEmployeePfAmount(1560);
    setIsEmployeePfAuto(true);
    setEmployeeEsiPercent(0.75);
    setEmployeeEsiAmount(131);
    setIsEmployeeEsiAuto(true);
    setProfessionalTax(200);
    setEmployeeLwf(2);
    setHeadcount(20);
    showToast('Loaded Housekeeping Staff Deployment Preset (20 Staff)', 'info');
  };

  // Export Individual Excel
  const handleExportIndividualExcel = () => {
    const personName = selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : 'Staff Member';
    const empId = selectedEmployee?.employeeId || 'VPHS0000';
    const desg = selectedEmployee?.designation?.title || 'Staff';

    const rows = [
      { 'Field': 'Staff Name', 'Details': personName },
      { 'Field': 'Employee ID', 'Details': empId },
      { 'Field': 'Designation', 'Details': desg },
      { 'Field': 'Site Location', 'Details': selectedEmployee?.site?.siteName || 'VPHS Head Office' },
      { 'Field': 'Date of Joining', 'Details': formatDate(selectedEmployee?.joiningDate) },
      { 'Field': 'Aadhaar / PAN', 'Details': `${selectedEmployee?.aadhaarNumber || '-'} / ${selectedEmployee?.panNumber || '-'}` },
      { 'Field': 'Bank Account / IFSC', 'Details': `${selectedEmployee?.bankAccountNo || '-'} (${selectedEmployee?.bankIfsc || '-'})` },
      { 'Field': '---', 'Details': '---------------------------------------' },
      { 'Field': '1. Basic Wage', 'Details': `₹${basic.toLocaleString('en-IN')}` },
      { 'Field': '2. DA (Dearness Allowance)', 'Details': `₹${da.toLocaleString('en-IN')}` },
      { 'Field': 'Sub Total 1 (Basic + DA)', 'Details': `₹${subTotal1.toLocaleString('en-IN')}` },
      { 'Field': '3. HRA', 'Details': `₹${hra.toLocaleString('en-IN')}` },
      { 'Field': '4. Special Allowance', 'Details': `₹${specialAllowance.toLocaleString('en-IN')}` },
      { 'Field': '5. Uniform & Shoes', 'Details': `₹${uniformAllowance.toLocaleString('en-IN')}` },
      { 'Field': '6. Leave Wages (CL/PL/SL)', 'Details': `₹${leaveWages.toLocaleString('en-IN')}` },
      { 'Field': 'GROSS SALARY (TOTAL EARNINGS)', 'Details': `₹${gross.toLocaleString('en-IN')}` },
      { 'Field': '---', 'Details': '---------------------------------------' },
      { 'Field': 'Employee PF (12%)', 'Details': `₹${computedEmployeePf.toLocaleString('en-IN')}` },
      { 'Field': 'Employee ESI (0.75%)', 'Details': `₹${computedEmployeeEsi.toLocaleString('en-IN')}` },
      { 'Field': 'Professional Tax (PT)', 'Details': `₹${professionalTax.toLocaleString('en-IN')}` },
      { 'Field': 'Telangana LWF (Employee)', 'Details': `₹${employeeLwf.toLocaleString('en-IN')}` },
      { 'Field': 'TOTAL EMPLOYEE DEDUCTIONS', 'Details': `₹${totalEmployeeDeductions.toLocaleString('en-IN')}` },
      { 'Field': 'NET IN-HAND (TAKE-HOME SALARY)', 'Details': `₹${netTakeHomeSalary.toLocaleString('en-IN')}` },
      { 'Field': '---', 'Details': '---------------------------------------' },
      { 'Field': 'Employer PF (13%)', 'Details': `₹${computedPf.toLocaleString('en-IN')}` },
      { 'Field': 'Employer ESI (3.25%)', 'Details': `₹${computedEsi.toLocaleString('en-IN')}` },
      { 'Field': 'Statutory Bonus (8.33%)', 'Details': `₹${computedBonus.toLocaleString('en-IN')}` },
      { 'Field': 'Telangana LWF (Employer)', 'Details': `₹${telanganaLwf.toLocaleString('en-IN')}` },
      { 'Field': 'TOTAL MONTHLY COST (CTC)', 'Details': `₹${totalPerPerson.toLocaleString('en-IN')}` },
      { 'Field': 'TOTAL ANNUAL CTC (1 STAFF)', 'Details': `₹${annualCtc.toLocaleString('en-IN')}` },
    ];

    exportToExcel(rows, `VPHS_Individual_Rate_Card_${empId}_${personName.replace(/\s+/g, '_')}`, 'Rate Card');
    showToast(`Individual Rate Card Excel for ${personName} downloaded!`, 'success');
  };

  // Export All Head Office Staff Register Excel
  const handleExportAllHeadOfficeExcel = () => {
    const rows = filteredEmployees.map((emp, index) => {
      const s = emp.salaryStructures?.[0] || {};
      const empBasic = s.basic || 6000;
      const empDa = s.da || 10000;
      const empSub1 = empBasic + empDa;
      const empHra = s.hra || 6783;
      const empSpl = s.specialAllowance || 0;
      const empUni = s.uniformAllowance || 200;
      const empGross = empSub1 + empHra + empSpl + empUni;
      const empLeave = s.leaveWages || Math.round(empGross * 0.125) || 2848;
      const empPf = s.employeePf || 1800;
      const empEsi = s.employeeEsi || 171;
      const empPt = s.professionalTax || 200;
      const empLwf = 2;
      const empDeduct = empPf + empEsi + empPt + empLwf;
      const empTakeHome = empGross - empDeduct;
      const emprPf = s.employerPf || 1950;
      const emprEsi = s.employerEsi || 613;
      const emprBonus = s.bonus || 1333;
      const emprLwf = s.telanganaLwf || 0.17;
      const empCtc = empGross + emprPf + emprEsi + emprBonus + empLeave + emprLwf;

      return {
        'S.No': index + 1,
        'Employee ID': emp.employeeId,
        'Staff Name': `${emp.firstName} ${emp.lastName}`,
        'Designation': emp.designation?.title || 'Staff',
        'Department': emp.department?.name || 'Operations',
        'Site / Location': emp.site?.siteName || 'VPHS Head Office',
        'Date of Joining': formatDate(emp.joiningDate),
        'Mobile': emp.mobile,
        'Basic (₹)': empBasic,
        'DA (₹)': empDa,
        'Sub Total 1 (₹)': empSub1,
        'HRA (₹)': empHra,
        'Spl Allowance (₹)': empSpl,
        'Uniform & Shoes (₹)': empUni,
        'Leave Wages (₹)': empLeave,
        'Gross Salary (₹)': empGross,
        'Employee PF 12% (₹)': empPf,
        'Employee ESI 0.75% (₹)': empEsi,
        'Professional Tax (₹)': empPt,
        'Total Deductions (₹)': empDeduct,
        'Net Take-Home (₹)': empTakeHome,
        'Employer PF 13% (₹)': emprPf,
        'Employer ESI 3.25% (₹)': emprEsi,
        'Bonus 8.33% (₹)': emprBonus,
        'Monthly CTC (₹)': empCtc,
        'Annual CTC (₹)': empCtc * 12,
        'Status': emp.status,
      };
    });

    exportToExcel(rows, `VPHS_HeadOffice_Staff_Statutory_Rate_Register_${new Date().toISOString().split('T')[0]}`, 'HO Staff Register');
    showToast(`Exported all ${filteredEmployees.length} staff statutory rate records!`, 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Mode Switcher & Controls */}
      <div className="bg-gradient-to-r from-white via-amber-50/40 to-slate-50 border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black tracking-widest text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full uppercase">
                VPHS STATUTORY ENGINE
              </span>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                Person-to-Person & Site Rate Master
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-600" /> Statutory Compensation & Rate Card Engine
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Individual staff compensation sheets with <strong>Basic, DA, HRA, Gross, PF (12%), ESI (0.75%), Net Take-Home, Employer Cost & Annual CTC</strong>.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs shadow-xs">
            <button
              type="button"
              onClick={() => setActiveMode('PERSON_TO_PERSON')}
              className={`px-4 py-2 rounded-xl font-black transition-all flex items-center gap-2 ${
                activeMode === 'PERSON_TO_PERSON'
                  ? 'bg-amber-500 text-white shadow-sm scale-102'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4" /> Person-to-Person (Head Office)
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('SITE_RATE_CARD')}
              className={`px-4 py-2 rounded-xl font-black transition-all flex items-center gap-2 ${
                activeMode === 'SITE_RATE_CARD'
                  ? 'bg-cyan-600 text-white shadow-sm scale-102'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" /> Bulk Site Deployment
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: PERSON-TO-PERSON STAFF SELECTOR & BIO CARD */}
        {/* ======================================================== */}
        {activeMode === 'PERSON_TO_PERSON' && (
          <div className="mt-4 pt-3 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-amber-50/60 p-4 rounded-2xl border border-amber-200">
              {/* Site Filter */}
              <div className="md:col-span-4">
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-600" /> Filter Facility Site:
                </label>
                <select
                  value={filterSiteId}
                  onChange={e => setFilterSiteId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:border-amber-500 shadow-xs"
                >
                  <option value="VPHS_HO">🏢 VPHS HEAD OFFICE ONLY ({headOfficeSite ? headOfficeSite.siteCode : 'VPHS0001'})</option>
                  <option value="ALL">🌐 All Sites & Locations</option>
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.siteCode} - {s.siteName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Staff Member Search & Select */}
              <div className="md:col-span-8">
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Select Staff Member (Person-to-Person Rate Card):
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedEmployeeId}
                    onChange={e => setSelectedEmployeeId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:border-amber-500 shadow-xs"
                  >
                    {filteredEmployees.length === 0 ? (
                      <option value="">No staff found matching filter</option>
                    ) : (
                      filteredEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.employeeId} — {emp.firstName} {emp.lastName} ({emp.designation?.title || 'Staff'})
                        </option>
                      ))
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={handleExportIndividualExcel}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" /> Person Excel
                  </button>

                  <button
                    type="button"
                    onClick={handleExportAllHeadOfficeExcel}
                    title="Export complete statutory register for all Head Office staff"
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 whitespace-nowrap border border-slate-300"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" /> All HO Register
                  </button>
                </div>
              </div>
            </div>

            {/* Selected Person Bio Card */}
            {selectedEmployee && (
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white font-black text-lg flex items-center justify-center shadow-sm">
                    {selectedEmployee.firstName?.[0]}{selectedEmployee.lastName?.[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-slate-900">
                        {selectedEmployee.firstName} {selectedEmployee.lastName}
                      </h3>
                      <span className="font-mono text-xs font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-300">
                        {selectedEmployee.employeeId}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                        {selectedEmployee.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      <span className="font-semibold text-slate-700">{selectedEmployee.designation?.title || 'Executive'}</span> • {selectedEmployee.department?.name || 'Head Office'} • Location: <span className="font-bold text-slate-800">{selectedEmployee.site?.siteName || 'VPHS Head Office'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold block">Joined:</span>
                    <span className="font-mono font-bold text-slate-900">{formatDate(selectedEmployee.joiningDate)}</span>
                  </div>
                  <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold block">Bank A/C & IFSC:</span>
                    <span className="font-mono font-bold text-slate-900">{selectedEmployee.bankAccountNo || 'Pending'} ({selectedEmployee.bankIfsc || 'N/A'})</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveToEmployeeProfile}
                    disabled={isSavingEmployee}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" /> {isSavingEmployee ? 'Saving...' : `Save to ${selectedEmployee.firstName}'s Profile`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: SITE SELECTOR (BULK SITE DEPLOYMENT MODE) */}
        {/* ======================================================== */}
        {activeMode === 'SITE_RATE_CARD' && (
          <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-amber-50/40 p-3.5 rounded-2xl border border-amber-200/70">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800 font-bold">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-900 block">Select Client Facility / Site Rate Card:</span>
                <span className="text-[11px] text-slate-500">Manually customize and enter unique rate cards for each client site</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={selectedSiteId}
                onChange={e => setSelectedSiteId(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold focus:border-amber-500 shadow-xs flex-1 md:flex-initial"
              >
                <option value="">-- Company Standard Template --</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.siteCode} - {s.siteName} ({s.clientName})
                  </option>
                ))}
              </select>

              {selectedSiteId && (
                <button
                  type="button"
                  onClick={handleSaveSiteRateCard}
                  disabled={isSavingSite}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> {isSavingSite ? 'Saving...' : `Save Rate Card to ${currentSiteName || 'Site'}`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Quick Presets & Print Controls */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleLoadVphsStandard1StaffPreset}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> 1 Staff Standard (₹22,783 Gross)
            </button>
            <button
              onClick={handleLoadVphsStandardPreset}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 border border-slate-300"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-600" /> 12 Staff Site (₹3.56L CTC)
            </button>
            <button
              onClick={handleLoadHousekeepingPreset}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1.5"
            >
              Housekeeping (20 Staff)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 border border-slate-300"
            >
              <Printer className="w-3.5 h-3.5 text-amber-600" /> Print Official Rate Sheet
            </button>
          </div>
        </div>
      </div>

      {/* 6 Responsive Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Sub Total 1 (Basic+DA)</span>
          <span className="text-base font-black text-slate-900 font-mono mt-1 block">
            {formatCurrency(subTotal1)}
          </span>
          <span className="text-[10px] text-slate-400">Core Wage Component</span>
        </div>

        <div className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200 shadow-xs">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Gross Salary</span>
          <span className="text-base font-black text-amber-900 font-mono mt-1 block">
            {formatCurrency(gross)}
          </span>
          <span className="text-[10px] text-amber-700">Total Monthly Earnings</span>
        </div>

        <div className="bg-rose-50/50 p-3.5 rounded-2xl border border-rose-200 shadow-xs">
          <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">Total Deductions</span>
          <span className="text-base font-black text-rose-700 font-mono mt-1 block">
            {formatCurrency(totalEmployeeDeductions)}
          </span>
          <span className="text-[10px] text-rose-600">PF + ESI + PT + LWF</span>
        </div>

        <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-200 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Net Take-Home</span>
          <span className="text-base font-black text-emerald-700 font-mono mt-1 block">
            {formatCurrency(netTakeHomeSalary)}
          </span>
          <span className="text-[10px] text-emerald-600">In-Hand Salary / mo</span>
        </div>

        <div className="bg-cyan-50/50 p-3.5 rounded-2xl border border-cyan-200 shadow-xs">
          <span className="text-[10px] font-bold text-cyan-800 uppercase tracking-wider block">Monthly CTC (1 Person)</span>
          <span className="text-base font-black text-cyan-800 font-mono mt-1 block">
            {formatCurrency(totalPerPerson)}
          </span>
          <span className="text-[10px] text-cyan-600">Gross + Employer Cost</span>
        </div>

        <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-300 shadow-xs">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
            {headcount > 1 ? `Site CTC (${headcount}p)` : 'Annual CTC (1 Staff)'}
          </span>
          <span className="text-base font-black text-amber-900 font-mono mt-1 block">
            {formatCurrency(headcount > 1 ? totalCtc : annualCtc)}
          </span>
          <span className="text-[10px] text-slate-500">
            {headcount > 1 ? 'Monthly Site Total' : '₹3,56,722 / yr'}
          </span>
        </div>
      </div>

      {/* Main 4-Column Rate Card Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 text-slate-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
              {activeMode === 'PERSON_TO_PERSON'
                ? `Individual Compensation Sheet: ${selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName} (${selectedEmployee.employeeId})` : 'Staff Member'}`
                : `Official Facility Deployment Breakdown: ${currentSiteName || 'Standard Rate Card'}`}
            </span>
            <span className="text-xs text-slate-600 font-medium">
              Verified with payment of wages act, EPFO (12%/13%), ESIC (0.75%/3.25%), Bonus Act (8.33%) & Telangana LWF.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-700 font-medium">Headcount:</span>
            <input
              type="number"
              min="1"
              max="1000"
              value={headcount}
              onChange={e => setHeadcount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1 text-center font-mono font-bold text-amber-800 text-xs focus:border-amber-500"
            />
            <span className="text-xs text-slate-600 font-semibold">Staff</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-1/3">Break ups</th>
                <th className="py-3 px-4 w-1/8 text-center">As %</th>
                <th className="py-3 px-4 w-1/8 text-center">As on</th>
                <th className="py-3 px-4 w-1/5 text-right">Value (₹ / Person)</th>
                <th className="py-3 px-4 w-1/5 text-right font-black text-amber-900 bg-amber-50/50">
                  {headcount > 1 ? `Headcount (${headcount}p) (₹)` : 'Annualized (₹)'}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {/* SECTION 1: EARNINGS */}
              <tr className="bg-slate-50 font-black text-slate-800 text-[11px] uppercase tracking-wider">
                <td colSpan={5} className="py-2 px-4 bg-slate-200/70 text-slate-800">
                  1. Earnings & Gross Salary Structure
                </td>
              </tr>

              {/* Basic */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-2 px-4 font-semibold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Basic
                </td>
                <td className="py-2 px-4 text-center text-slate-400">-</td>
                <td className="py-2 px-4 text-center text-slate-400">-</td>
                <td className="py-2 px-4 text-right">
                  <input
                    type="number"
                    value={basic}
                    onChange={e => setBasic(parseFloat(e.target.value) || 0)}
                    className="w-28 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-right font-mono font-bold text-xs text-slate-900 focus:border-amber-500 focus:bg-white"
                  />
                </td>
                <td className="py-2 px-4 text-right font-mono font-bold text-slate-800 bg-amber-50/30">
                  {formatCurrency(headcount > 1 ? basic * headcount : basic * 12)}
                </td>
              </tr>

              {/* DA */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-2 px-4 font-semibold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> DA (Dearness Allowance)
                </td>
                <td className="py-2 px-4 text-center text-slate-400">-</td>
                <td className="py-2 px-4 text-center text-slate-400">-</td>
                <td className="py-2 px-4 text-right">
                  <input
                    type="number"
                    value={da}
                    onChange={e => setDa(parseFloat(e.target.value) || 0)}
                    className="w-28 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-right font-mono font-bold text-xs text-slate-900 focus:border-amber-500 focus:bg-white"
                  />
                </td>
                <td className="py-2 px-4 text-right font-mono font-bold text-slate-800 bg-amber-50/30">
                  {formatCurrency(headcount > 1 ? da * headcount : da * 12)}
                </td>
              </tr>

              {/* Sub Total 1 */}
              <tr className="bg-amber-100/50 font-extrabold text-amber-950 border-y border-amber-200">
                <td className="py-2.5 px-4 font-black">Sub Total 1</td>
                <td className="py-2.5 px-4 text-center text-amber-900">-</td>
                <td className="py-2.5 px-4 text-center font-bold text-amber-900">Basic+DA</td>
                <td className="py-2.5 px-4 text-right font-mono font-black text-sm text-amber-950">
                  {formatCurrency(subTotal1)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono font-black text-amber-950 bg-amber-100/70">
                  {formatCurrency(headcount > 1 ? subTotal1 * headcount : subTotal1 * 12)}
                </td>
              </tr>

              {/* HRA */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-2 px-4 font-semibold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> HRA (House Rent Allowance)
                </td>
                <td className="py-2 px-4 text-center text-slate-400">-</td>
                <td className="py-2 px-4 text-center text-slate-400">-</td>
                <td className="py-2 px-4 text-right">
                  <input
                    type="number"
                    value={hra}
                    onChange={e => setHra(parseFloat(e.target.value) || 0)}
                    className="w-28 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-right font-mono font-bold text-xs text-slate-900 focus:border-amber-500 focus:bg-white"
                  />
                </td>
                <td className="py-2 px-4 text-right font-mono font-bold text-slate-800 bg-amber-50/30">
                  {formatCurrency(headcount > 1 ? hra * headcount : hra * 12)}
                </td>
              </tr>

              {/* Spl Allowance */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-2 px-4 font-semibold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Spl Allowance
                </td>
                <td className="py-2 px-4 text-center text-slate-400">-</td>
                <td className="py-2 px-4 text-center text-slate-400">-</td>
                <td className="py-2 px-4 text-right">
                  <input
                    type="number"
                    value={specialAllowance}
                    onChange={e => setSpecialAllowance(parseFloat(e.target.value) || 0)}
                    className="w-28 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-right font-mono font-bold text-xs text-slate-900 focus:border-amber-500 focus:bg-white"
                  />
                </td>
                <td className="py-2 px-4 text-right font-mono font-bold text-slate-800 bg-amber-50/30">
                  {formatCurrency(headcount > 1 ? specialAllowance * headcount : specialAllowance * 12)}
                </td>
              </tr>

              {/* Gross Total */}
              <tr className="bg-emerald-100/60 font-black text-emerald-950 border-y-2 border-emerald-300 text-sm">
                <td className="py-3 px-4 font-black">Gross Salary</td>
                <td className="py-3 px-4 text-center text-emerald-900">-</td>
                <td className="py-3 px-4 text-center text-emerald-900">-</td>
                <td className="py-3 px-4 text-right font-mono font-black text-base text-emerald-950">
                  {formatCurrency(gross)}
                </td>
                <td className="py-3 px-4 text-right font-mono font-black text-emerald-950 bg-emerald-100/80">
                  {formatCurrency(headcount > 1 ? gross * headcount : gross * 12)}
                </td>
              </tr>

              {/* SECTION 2: EMPLOYEE DEDUCTIONS */}
              <tr className="bg-rose-50 font-black text-rose-900 text-[11px] uppercase tracking-wider">
                <td colSpan={5} className="py-2 px-4 bg-rose-100 text-rose-950">
                  2. Employee Statutory Deductions (Take-Home Pay Deductions)
                </td>
              </tr>

              {/* Employee PF */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-2 px-4 font-semibold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> P.F @ Employee (12%)
                </td>
                <td className="py-2 px-4 text-center font-bold text-rose-800">{employeePfPercent}%</td>
                <td className="py-2 px-4 text-center font-semibold text-slate-600">Basic+DA</td>
                <td className="py-2 px-4 text-right">
                  <input
                    type="number"
                    value={computedEmployeePf}
                    onChange={e => {
                      setIsEmployeePfAuto(false);
                      setEmployeePfAmount(parseFloat(e.target.value) || 0);
                    }}
                    className="w-28 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-right font-mono font-bold text-xs text-rose-700 focus:border-rose-500 focus:bg-white"
                  />
                </td>
                <td className="py-2 px-4 text-right font-mono font-bold text-rose-700 bg-amber-50/30">
                  {formatCurrency(headcount > 1 ? computedEmployeePf * headcount : computedEmployeePf * 12)}
                </td>
              </tr>

              {/* Employee ESI */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-2 px-4 font-semibold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> ESI @ Employee (0.75%)
                </td>
                <td className="py-2 px-4 text-center font-bold text-rose-800">{employeeEsiPercent}%</td>
                <td className="py-2 px-4 text-center font-semibold text-slate-600">Gross</td>
                <td className="py-2 px-4 text-right">
                  <input
                    type="number"
                    value={computedEmployeeEsi}
                    onChange={e => {
                      setIsEmployeeEsiAuto(false);
                      setEmployeeEsiAmount(parseFloat(e.target.value) || 0);
                    }}
                    className="w-28 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-right font-mono font-bold text-xs text-rose-700 focus:border-rose-500 focus:bg-white"
                  />
                </td>
                <td className="py-2 px-4 text-right font-mono font-bold text-rose-700 bg-amber-50/30">
                  {formatCurrency(headcount > 1 ? computedEmployeeEsi * headcount : computedEmployeeEsi * 12)}
                </td>
              </tr>

              {/* Professional Tax */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-2 px-4 font-semibold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Professional Tax (PT)
                </td>
                <td className="py-2 px-4 text-center text-slate-400">-</td>
                <td className="py-2 px-4 text-center font-semibold text-slate-600">Slab</td>
                <td className="py-2 px-4 text-right">
                  <input
                    type="number"
                    value={professionalTax}
                    onChange={e => setProfessionalTax(parseFloat(e.target.value) || 0)}
                    className="w-28 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-right font-mono font-bold text-xs text-rose-700 focus:border-rose-500 focus:bg-white"
                  />
                </td>
                <td className="py-2 px-4 text-right font-mono font-bold text-rose-700 bg-amber-50/30">
                  {formatCurrency(headcount > 1 ? professionalTax * headcount : professionalTax * 12)}
                </td>
              </tr>

              {/* Total Employee Deductions */}
              <tr className="bg-rose-100/50 font-black text-rose-950 border-t border-rose-200">
                <td className="py-2.5 px-4 font-black">Total Employee Deductions</td>
                <td className="py-2.5 px-4 text-center text-rose-900">-</td>
                <td className="py-2.5 px-4 text-center text-rose-900">PF+ESI+PT</td>
                <td className="py-2.5 px-4 text-right font-mono font-black text-sm text-rose-900">
                  {formatCurrency(totalEmployeeDeductions)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono font-black text-rose-900 bg-rose-100/70">
                  {formatCurrency(headcount > 1 ? totalEmployeeDeductions * headcount : totalEmployeeDeductions * 12)}
                </td>
              </tr>

              {/* NET TAKE-HOME SALARY */}
              <tr className="bg-emerald-500 text-slate-950 font-black text-sm shadow-sm">
                <td className="py-3 px-4 font-black flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-slate-950" /> Net In-Hand Salary (Take-Home)
                </td>
                <td className="py-3 px-4 text-center">-</td>
                <td className="py-3 px-4 text-center font-bold">Gross – Deduct</td>
                <td className="py-3 px-4 text-right font-mono font-black text-base">
                  {formatCurrency(netTakeHomeSalary)}
                </td>
                <td className="py-3 px-4 text-right font-mono font-black bg-emerald-600 text-white">
                  {formatCurrency(headcount > 1 ? netTakeHomeSalary * headcount : netTakeHomeSalary * 12)}
                </td>
              </tr>

              {/* SECTION 3: EMPLOYER STATUTORY & COSTING */}
              <tr className="bg-slate-50 font-black text-slate-800 text-[11px] uppercase tracking-wider">
                <td colSpan={5} className="py-2 px-4 bg-slate-200/70 text-slate-800">
                  3. Employer Statutory Contributions & Facility Allowances
                </td>
              </tr>

              {/* ESI Employer */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-2 px-4 font-semibold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> ESI @ Employer / Insurances
                </td>
                <td className="py-2 px-4 text-center font-bold text-slate-700">{esiPercent}%</td>
                <td className="py-2 px-4 text-center font-semibold text-slate-600">Basic+DA</td>
                <td className="py-2 px-4 text-right">
                  <input
                    type="number"
                    value={computedEsi}
                    onChange={e => {
                      setIsEsiAuto(false);
                      setEsiAmount(parseFloat(e.target.value) || 0);
                    }}
                    className="w-28 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-right font-mono font-bold text-xs text-slate-900 focus:border-amber-500 focus:bg-white"
                  />
                </td>
                <td className="py-2 px-4 text-right font-mono font-bold text-slate-800 bg-amber-50/30">
                  {formatCurrency(headcount > 1 ? computedEsi * headcount : computedEsi * 12)}
                </td>
              </tr>

              {/* PF Employer */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-2 px-4 font-semibold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> P.F @ Employer
                </td>
                <td className="py-2 px-4 text-center font-bold text-slate-700">{pfPercent}%</td>
                <td className="py-2 px-4 text-center font-semibold text-slate-600">Basic+DA</td>
                <td className="py-2 px-4 text-right">
                  <input
                    type="number"
                    value={computedPf}
                    onChange={e => {
                      setIsPfAuto(false);
                      setPfAmount(parseFloat(e.target.value) || 0);
                    }}
                    className="w-28 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-right font-mono font-bold text-xs text-slate-900 focus:border-amber-500 focus:bg-white"
                  />
                </td>
                <td className="py-2 px-4 text-right font-mono font-bold text-slate-800 bg-amber-50/30">
                  {formatCurrency(headcount > 1 ? computedPf * headcount : computedPf * 12)}
                </td>
              </tr>

              {/* Bonus */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-2 px-4 font-semibold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> Bonus @8.33%
                </td>
                <td className="py-2 px-4 text-center font-bold text-slate-700">{bonusPercent}%</td>
                <td className="py-2 px-4 text-center font-semibold text-slate-600">Basic+DA</td>
                <td className="py-2 px-4 text-right">
                  <input
                    type="number"
                    value={computedBonus}
                    onChange={e => {
                      setIsBonusAuto(false);
                      setBonusAmount(parseFloat(e.target.value) || 0);
                    }}
                    className="w-28 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-right font-mono font-bold text-xs text-slate-900 focus:border-amber-500 focus:bg-white"
                  />
                </td>
                <td className="py-2 px-4 text-right font-mono font-bold text-slate-800 bg-amber-50/30">
                  {formatCurrency(headcount > 1 ? computedBonus * headcount : computedBonus * 12)}
                </td>
              </tr>

              {/* Leave Wages (CL, PL, SL) in Section 3 */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-2 px-4 font-semibold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Leave Wages (CL, PL, SL)
                </td>
                <td className="py-2 px-4 text-center font-bold text-emerald-700 bg-emerald-50 rounded text-xs">12.5%</td>
                <td className="py-2 px-4 text-center font-semibold text-slate-600">Gross</td>
                <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                  {formatCurrency(computedLeaveWages)}
                </td>
                <td className="py-2 px-4 text-right font-mono font-bold text-slate-800 bg-amber-50/30">
                  {formatCurrency(headcount > 1 ? computedLeaveWages * headcount : computedLeaveWages * 12)}
                </td>
              </tr>

              {/* Uniform, Shoes & washing allowance in Section 3 */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-2 px-4 font-semibold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Uniform, Shoes & washing allowance
                </td>
                <td className="py-2 px-4 text-center text-slate-400">-</td>
                <td className="py-2 px-4 text-center text-slate-400">-</td>
                <td className="py-2 px-4 text-right">
                  <input
                    type="number"
                    value={uniformAllowance}
                    onChange={e => setUniformAllowance(parseFloat(e.target.value) || 0)}
                    className="w-28 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-right font-mono font-bold text-xs text-slate-900 focus:border-amber-500 focus:bg-white"
                  />
                </td>
                <td className="py-2 px-4 text-right font-mono font-bold text-slate-800 bg-amber-50/30">
                  {formatCurrency(headcount > 1 ? uniformAllowance * headcount : uniformAllowance * 12)}
                </td>
              </tr>

              {/* Telangana LWF */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-2 px-4 font-semibold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Telangana LWF (Employer)
                </td>
                <td className="py-2 px-4 text-center text-slate-400">-</td>
                <td className="py-2 px-4 text-center text-slate-400">-</td>
                <td className="py-2 px-4 text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={telanganaLwf}
                    onChange={e => setTelanganaLwf(parseFloat(e.target.value) || 0)}
                    className="w-28 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-right font-mono font-bold text-xs text-slate-900 focus:border-amber-500 focus:bg-white"
                  />
                </td>
                <td className="py-2 px-4 text-right font-mono font-bold text-slate-800 bg-amber-50/30">
                  {formatCurrency(headcount > 1 ? telanganaLwf * headcount : telanganaLwf * 12)}
                </td>
              </tr>

              {/* Total Monthly Cost per person */}
              <tr className="bg-slate-100 border-t-2 border-slate-300 text-slate-900 font-black text-sm">
                <td className="py-3 px-4 font-black">Total Monthly Cost / Person</td>
                <td className="py-3 px-4 text-center text-slate-400">-</td>
                <td className="py-3 px-4 text-center text-slate-400">-</td>
                <td className="py-3 px-4 text-right font-mono font-black text-amber-800 text-base">
                  {formatCurrency(totalPerPerson)}
                </td>
                <td className="py-3 px-4 text-right font-mono font-black text-amber-800 bg-slate-200">
                  {formatCurrency(headcount > 1 ? totalPerPerson * headcount : annualCtc)}
                </td>
              </tr>

              {/* SECTION 4: GRAND CTC BILLING */}
              <tr className="bg-amber-500 text-white font-black text-sm uppercase">
                <td className="py-3 px-4 font-black">
                  {headcount > 1 ? `Grand Site Total CTC (${headcount} Staff)` : 'Annual CTC (1 Staff Member)'}
                </td>
                <td className="py-3 px-4 text-center font-bold">{headcount} Staff</td>
                <td className="py-3 px-4 text-center font-bold">12 Months</td>
                <td className="py-3 px-4 text-right font-mono font-black text-base">
                  {formatCurrency(totalCtc)} / mo
                </td>
                <td className="py-3 px-4 text-right font-mono font-black text-base bg-amber-600 text-white">
                  {formatCurrency(annualCtc)} / yr
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* STATUTORY RULES & COMPLIANCE POLICIES MASTER REFERENCE */}
        <div className="mt-8 pt-6 border-t border-slate-200 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-800">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  Statutory Rules &amp; Compliance Policies Reference
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Active Telangana Norms
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Rate card slabs, shift thresholds, weekend continuity rules and monthly payroll batch proration standards
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-xs">
            {/* Pillar 1: Shift & Attendance Classification */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-cyan-800 font-bold border-b border-slate-200 pb-2">
                <Clock className="w-4 h-4 text-cyan-600 shrink-0" />
                <span>1. Attendance &amp; Shift Codes</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-600">
                <li><strong className="text-emerald-700">P (Present - 1.0d):</strong> Full 9.0-hour shift completed.</li>
                <li><strong className="text-sky-700">WO (Week Off - 1.0d):</strong> Sat &amp; Sun for Microsoft &amp; HO; Sun for client sites.</li>
                <li><strong className="text-amber-700">L (Late - 1.0d):</strong> Arrival &gt; 15 min grace (late mins tracked).</li>
                <li><strong className="text-purple-700">HD (Half Day - 0.5d):</strong> Login &ge; 4.0h &amp; &lt; 9.0h.</li>
                <li><strong className="text-blue-700">LV (Paid Leave - 1.0d):</strong> Statutory approved CL / PL / SL.</li>
                <li><strong className="text-rose-700">A (Absent - 0.0d):</strong> Login &lt; 4.0h or unauthorized absence.</li>
                <li><strong className="text-rose-700">LOP:</strong> Loss of Pay deducted from total month days.</li>
              </ul>
            </div>

            {/* Pillar 2: Weekend Sandwich Policy */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold border-b border-slate-200 pb-2">
                <CalendarCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>2. Weekend Sandwich Rule</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Statutory continuity rule preventing unauthorized absenteeism adjoining weekly off days:
              </p>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1 text-[11px]">
                <p className="text-rose-700">• <strong>Friday Absent:</strong> Saturday marked Absent / LOP.</p>
                <p className="text-rose-700">• <strong>Monday Absent:</strong> Sunday marked Absent / LOP.</p>
                <p className="text-emerald-700 pt-1 border-t border-slate-100">
                  • <strong>Auto-Restore:</strong> Changing Friday/Monday back to Present automatically returns weekend to statutory Week Off (WO).
                </p>
              </div>
            </div>

            {/* Pillar 3: Overtime Rules */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-purple-900 font-bold border-b border-slate-200 pb-2">
                <TrendingUp className="w-4 h-4 text-purple-600 shrink-0" />
                <span>3. Overtime (OT) Rules</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Overtime compensation under Factory &amp; Labour regulations:
              </p>
              <div className="space-y-1.5 text-[11px] text-slate-600">
                <p>
                  • <strong>Eligibility:</strong> Calculated strictly <strong>after completing standard 9.0h shift</strong> (min 4h login required).
                </p>
                <div className="p-2 bg-purple-50 rounded-xl border border-purple-200 font-mono text-[10px] text-purple-900">
                  OT = ((Gross / (Month Days &times; 8)) &times; 1.5) &times; OT Hours
                </div>
              </div>
            </div>

            {/* Pillar 4: Slabs & Batch Proration */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold border-b border-slate-200 pb-2">
                <RefreshCw className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>4. Slabs &amp; Batch Proration</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Standard facility slabs and monthly proration:
              </p>
              <div className="space-y-1 text-[11px] text-slate-600">
                <p>• <strong>Wage Base:</strong> Basic (₹6k) + DA (₹10k) = ₹16,000</p>
                <p>• <strong>Gross:</strong> ₹22,783 | <strong>Net Pay:</strong> ₹20,610</p>
                <p>• <strong>Cost to Company:</strong> ₹29,727/mo (₹3,56,722/yr)</p>
                <p className="text-emerald-700 bg-emerald-50 p-1.5 rounded-lg border border-emerald-200 text-[10px]">
                  • <strong>Proration:</strong> (P + WO + LV + 0.5&times;HD) / Month Days
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
