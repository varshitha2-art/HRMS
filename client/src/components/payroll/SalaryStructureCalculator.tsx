import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  Receipt,
  FileSpreadsheet,
  Download,
  Percent,
  CheckCircle2,
  TrendingUp,
  Building2,
  ShieldCheck,
  CreditCard,
  Layers,
  Sparkles,
  ArrowRight,
  Edit3,
  RefreshCw,
  Save,
  Sliders,
  Users,
  Shirt,
  CalendarCheck,
  Award,
  Landmark,
  Search,
  Filter,
  Eye,
  UserCheck,
  ChevronRight,
  ArrowUpDown,
  Clock,
} from 'lucide-react';
import { SalaryBreakdownResult, Employee, Site } from '../../types';
import { formatCurrency, exportToExcel, exportToCsv } from '../../utils/formatters';
import api from '../../services/api';
import { useNotifications } from '../../contexts/NotificationContext';
import { Badge } from '../common/Badge';

interface SalaryStructureCalculatorProps {
  initialCtc?: number;
  isMonthly?: boolean;
  employeeId?: string;
  onApplyStructure?: (structure: SalaryBreakdownResult) => void;
  showApplyButton?: boolean;
  onSaved?: () => void;
}

export const SalaryStructureCalculator: React.FC<SalaryStructureCalculatorProps> = ({
  initialCtc = 356722,
  isMonthly = false,
  employeeId: propEmployeeId,
  onApplyStructure,
  showApplyButton = false,
  onSaved,
}) => {
  const { showToast } = useNotifications();

  // Navigation Sub-Tabs
  const [calculatorView, setCalculatorView] = useState<'CALCULATOR' | 'EMPLOYEES_REGISTER'>('CALCULATOR');

  // Employee & Site Data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Filters
  const [selectedSiteId, setSelectedSiteId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<'ACTIVE' | 'ALL'>('ACTIVE');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Mode: Auto formula vs Manual override
  const [calculationMode, setCalculationMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [inputMode, setInputMode] = useState<'ANNUAL' | 'MONTHLY'>('MONTHLY');
  const [targetCtc, setTargetCtc] = useState<number>(29727);
  const [headcount, setHeadcount] = useState<number>(1);

  // Manual component state (Monthly values per person)
  const [manualBasic, setManualBasic] = useState<number>(6000);
  const [manualDa, setManualDa] = useState<number>(10000);
  const [manualSpecial, setManualSpecial] = useState<number>(0);
  const [manualUniform, setManualUniform] = useState<number>(200);
  const [manualLeaveWages, setManualLeaveWages] = useState<number>(2848);
  const [manualHra, setManualHra] = useState<number>(6783);
  const [manualConveyance, setManualConveyance] = useState<number>(0);
  const [manualMedical, setManualMedical] = useState<number>(0);
  const [manualLta, setManualLta] = useState<number>(0);
  const [manualFood, setManualFood] = useState<number>(0);
  const [manualComm, setManualComm] = useState<number>(0);
  const [manualVariable, setManualVariable] = useState<number>(0);

  // Employer Contributions
  const [manualEmployerPf, setManualEmployerPf] = useState<number>(1950);
  const [manualEmployerEsi, setManualEmployerEsi] = useState<number>(613);
  const [manualBonus, setManualBonus] = useState<number>(1333);
  const [manualTelanganaLwf, setManualTelanganaLwf] = useState<number>(0.17);
  const [manualGratuity, setManualGratuity] = useState<number>(0);
  const [manualInsurance, setManualInsurance] = useState<number>(0);

  // Employee Deductions
  const [manualEmployeePf, setManualEmployeePf] = useState<number>(1920);
  const [manualEmployeeEsi, setManualEmployeeEsi] = useState<number>(171);
  const [manualPt, setManualPt] = useState<number>(200);
  const [manualEmployeeLwf, setManualEmployeeLwf] = useState<number>(2);
  const [manualTds, setManualTds] = useState<number>(0);

  // Auto mode percentage rules
  const [basicPct, setBasicPct] = useState<number>(40);
  const [daPct, setDaPct] = useState<number>(10);
  const [hraPct, setHraPct] = useState<number>(40);
  const [bonusPct, setBonusPct] = useState<number>(8.33);
  const [includeInsurance, setIncludeInsurance] = useState<boolean>(true);

  const [breakdown, setBreakdown] = useState<SalaryBreakdownResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isBatchApplying, setIsBatchApplying] = useState(false);
  const [syncTarget, setSyncTarget] = useState<'EMPLOYEE' | 'SITE' | 'ALL'>('SITE');
  const [isSyncing, setIsSyncing] = useState(false);

  // Automatically update syncTarget when selectedEmployee or selectedSite changes
  useEffect(() => {
    if (selectedEmployee) {
      setSyncTarget('EMPLOYEE');
    } else if (selectedSiteId !== 'ALL') {
      setSyncTarget('SITE');
    } else {
      setSyncTarget('ALL');
    }
  }, [selectedEmployee, selectedSiteId]);

  // Fetch Employees and Sites
  useEffect(() => {
    fetchEmployeesAndSites();
  }, []);

  const fetchEmployeesAndSites = async () => {
    try {
      setLoadingData(true);
      const [empRes, siteRes]: any = await Promise.all([
        api.get('/employees?limit=250'),
        api.get('/sites'),
      ]);

      if (empRes.success && empRes.data) {
        setEmployees(empRes.data);
        if (propEmployeeId) {
          const matched = empRes.data.find((e: Employee) => e.id === propEmployeeId);
          if (matched) loadEmployeeStructure(matched);
        }
      }
      if (siteRes.success && siteRes.data) {
        setSites(siteRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load employee directory for calculator', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Filtered Employees list as per selected site, status, and search query
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchSite = selectedSiteId === 'ALL' || emp.siteId === selectedSiteId || emp.site?.id === selectedSiteId;
      const matchStatus = selectedStatus === 'ALL' || emp.status === selectedStatus;
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(query) ||
        (emp.employeeId && emp.employeeId.toLowerCase().includes(query)) ||
        (emp.designation?.title && emp.designation.title.toLowerCase().includes(query)) ||
        (emp.site?.siteName && emp.site.siteName.toLowerCase().includes(query));

      return matchSite && matchStatus && matchSearch;
    });
  }, [employees, selectedSiteId, selectedStatus, searchQuery]);

  // Headcount presets for Facility Management deployment
  const headcountPresets = [1, 5, 10, 12, 20, 50, 100, 250];

  useEffect(() => {
    if (calculationMode === 'AUTO') {
      runAutoCalculation();
    }
  }, [targetCtc, inputMode, basicPct, daPct, hraPct, bonusPct, includeInsurance, calculationMode, headcount]);

  useEffect(() => {
    if (calculationMode === 'MANUAL') {
      computeManualTotals();
    }
  }, [
    manualBasic, manualDa, manualSpecial, manualUniform, manualLeaveWages, manualHra,
    manualConveyance, manualMedical, manualLta, manualFood, manualComm, manualVariable,
    manualEmployerPf, manualEmployerEsi, manualBonus, manualTelanganaLwf, manualGratuity, manualInsurance,
    manualEmployeePf, manualEmployeeEsi, manualPt, manualEmployeeLwf, manualTds, headcount
  ]);

  const runAutoCalculation = async () => {
    try {
      const monthlyCtc = inputMode === 'ANNUAL' ? targetCtc / 12 : targetCtc;
      const customRules = {
        headcount,
        basicPercentOfCtc: basicPct,
        daPercentOfBasic: daPct,
        hraPercentOfBasic: hraPct,
        bonusPercent: bonusPct,
        uniformAllowanceDefault: manualUniform,
        leaveWagesMonthlyDefault: manualLeaveWages,
        conveyanceDefault: manualConveyance,
        medicalDefault: manualMedical,
        foodAllowance: manualFood,
        communicationAllowance: manualComm,
        lta: manualLta,
        variablePay: manualVariable,
        insuranceDefault: includeInsurance ? manualInsurance : 0,
      };

      const res: any = await api.post('/payroll/calculate-structure', {
        monthlyCtc,
        customRules,
      });

      if (res.success && res.data) {
        setBreakdown(res.data);
        syncAutoToManualFields(res.data.monthly);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const syncAutoToManualFields = (m: any) => {
    setManualBasic(m.basic);
    setManualDa(m.da);
    setManualHra(m.hra);
    setManualSpecial(m.specialAllowance);
    setManualUniform(m.uniformAllowance || 200);
    setManualLeaveWages(m.leaveWages || Math.round((m.grossSalary || 22783) * 0.125) || 2848);
    setManualConveyance(m.conveyance || 0);
    setManualMedical(m.medicalAllowance || 0);
    setManualLta(m.lta || 0);
    setManualFood(m.foodAllowance || 0);
    setManualComm(m.communicationAllowance || 0);
    setManualVariable(m.variablePay || 0);

    setManualEmployerPf(m.employerPf);
    setManualEmployerEsi(m.employerEsi);
    setManualBonus(m.bonus || Math.round(((m.basic + m.da) * 8.33) / 100));
    setManualTelanganaLwf(m.telanganaLwf || 0.17);
    setManualGratuity(m.gratuity || 0);
    setManualInsurance(m.insuranceBenefit || 0);

    setManualEmployeePf(m.employeePf);
    setManualEmployeeEsi(m.employeeEsi);
    setManualPt(m.professionalTax);
    setManualEmployeeLwf(m.employeeLwf || 2);
    setManualTds(m.tdsDeduction || 0);
  };

  const computeManualTotals = () => {
    const grossSalary =
      manualBasic + manualDa + manualSpecial +
      manualHra + manualConveyance + manualMedical + manualLta + manualFood +
      manualComm + manualVariable;

    // Auto-calculated Leave Wages @ 12.5% of Gross = ₹2,848 on standard ₹22,783
    const autoLeaveWages = Math.round(grossSalary * 0.125) || 2848;

    const totalEmployerContribution =
      manualEmployerPf + manualEmployerEsi + manualBonus + autoLeaveWages + manualUniform + manualTelanganaLwf +
      manualGratuity + manualInsurance;

    const totalCtc = grossSalary + totalEmployerContribution;

    const totalDeductions =
      manualEmployeePf + manualEmployeeEsi + manualPt + manualEmployeeLwf + manualTds;

    const netSalary = Math.max(0, grossSalary - totalDeductions);

    const m = {
      ctc: totalCtc,
      headcount,
      basic: manualBasic,
      da: manualDa,
      subTotal1: manualBasic + manualDa,
      specialAllowance: manualSpecial,
      uniformAllowance: manualUniform,
      leaveWages: autoLeaveWages,
      hra: manualHra,
      conveyance: manualConveyance,
      medicalAllowance: manualMedical,
      lta: manualLta,
      foodAllowance: manualFood,
      communicationAllowance: manualComm,
      variablePay: manualVariable,
      otherAllowance: 0,
      grossSalary,

      employerPf: manualEmployerPf,
      employerEsi: manualEmployerEsi,
      bonus: manualBonus,
      telanganaLwf: manualTelanganaLwf,
      gratuity: manualGratuity,
      insuranceBenefit: manualInsurance,
      totalEmployerContribution,

      employeePf: manualEmployeePf,
      employeeEsi: manualEmployeeEsi,
      professionalTax: manualPt,
      employeeLwf: manualEmployeeLwf,
      tdsDeduction: manualTds,
      otherDeductions: 0,
      totalDeductions,

      netSalary,
    };

    const a = {
      ...m,
      ctc: totalCtc * 12,
      headcount,
      basic: manualBasic * 12,
      da: manualDa * 12,
      subTotal1: (manualBasic + manualDa) * 12,
      specialAllowance: manualSpecial * 12,
      uniformAllowance: manualUniform * 12,
      leaveWages: manualLeaveWages * 12,
      hra: manualHra * 12,
      conveyance: manualConveyance * 12,
      medicalAllowance: manualMedical * 12,
      lta: manualLta * 12,
      foodAllowance: manualFood * 12,
      communicationAllowance: manualComm * 12,
      variablePay: manualVariable * 12,
      otherAllowance: 0,
      grossSalary: grossSalary * 12,

      employerPf: manualEmployerPf * 12,
      employerEsi: manualEmployerEsi * 12,
      bonus: manualBonus * 12,
      telanganaLwf: manualTelanganaLwf * 12,
      gratuity: manualGratuity * 12,
      insuranceBenefit: manualInsurance * 12,
      totalEmployerContribution: totalEmployerContribution * 12,

      employeePf: manualEmployeePf * 12,
      employeeEsi: manualEmployeeEsi * 12,
      professionalTax: manualPt * 12,
      employeeLwf: manualEmployeeLwf * 12,
      tdsDeduction: manualTds * 12,
      otherDeductions: 0,
      totalDeductions: totalDeductions * 12,

      netSalary: netSalary * 12,
    };

    setBreakdown({ monthly: m, annual: a });
  };

  const handleAutoBalanceSpecialAllowance = () => {
    const monthlyCtcTarget = inputMode === 'ANNUAL' ? targetCtc / 12 : targetCtc;
    const currentFixed =
      manualBasic + manualDa + manualUniform + manualLeaveWages + manualHra +
      manualConveyance + manualMedical + manualLta + manualFood + manualComm + manualVariable;

    const currentEmployer =
      manualEmployerPf + manualEmployerEsi + manualBonus + manualTelanganaLwf +
      manualGratuity + manualInsurance;

    const balancedSpecial = Math.max(0, Math.round(monthlyCtcTarget - currentEmployer - currentFixed));
    setManualSpecial(balancedSpecial);
    showToast(`Special Allowance auto-balanced to ₹${balancedSpecial.toLocaleString('en-IN')}`, 'info');
  };

  // Load an employee's existing structure or calculate from their salaryCtc
  const loadEmployeeStructure = (emp: Employee) => {
    setSelectedEmployee(emp);
    const s = emp.salaryStructures && emp.salaryStructures.length > 0 ? emp.salaryStructures[0] : null;

    if (s && s.basic > 0) {
      setCalculationMode('MANUAL');
      setInputMode('MONTHLY');
      setTargetCtc(s.ctc || 29727);
      setManualBasic(s.basic);
      setManualDa(s.da);
      setManualHra(s.hra);
      setManualSpecial(s.specialAllowance || 0);
      setManualUniform(s.uniformAllowance || 200);
      setManualLeaveWages(s.leaveWages || 2848);
      setManualEmployerPf(s.employerPf || 1950);
      setManualEmployerEsi(s.employerEsi || 613);
      setManualBonus(s.bonus || 1333);
      setManualTelanganaLwf(s.telanganaLwf || 0.17);
      setManualEmployeePf(s.employeePf || 1920);
      setManualEmployeeEsi(s.employeeEsi || 171);
      setManualPt(s.professionalTax || 200);
      setManualEmployeeLwf(2);
      setManualTds(s.tdsDeduction || 0);
    } else {
      // Use standard VPHS rate card with employee's CTC
      const monthlyVal = emp.salaryCtc ? Math.round(emp.salaryCtc > 50000 ? emp.salaryCtc / 12 : emp.salaryCtc) : 29727;
      setCalculationMode('MANUAL');
      setInputMode('MONTHLY');
      setTargetCtc(monthlyVal);
      setManualBasic(6000);
      setManualDa(10000);
      setManualHra(6783);
      setManualSpecial(0);
      setManualUniform(200);
      setManualLeaveWages(2848);
      setManualEmployerPf(1950);
      setManualEmployerEsi(613);
      setManualBonus(1333);
      setManualTelanganaLwf(0.17);
      setManualEmployeePf(1920);
      setManualEmployeeEsi(171);
      setManualPt(200);
      setManualEmployeeLwf(2);
      setManualTds(0);
    }

    setCalculatorView('CALCULATOR');
    showToast(`Loaded structure for ${emp.firstName} ${emp.lastName} (${emp.employeeId})`, 'info');
  };

  const handleLoadVphsStandardTemplate = () => {
    setCalculationMode('MANUAL');
    setInputMode('MONTHLY');
    setTargetCtc(29727);
    setHeadcount(12);
    setManualBasic(6000);
    setManualDa(10000);
    setManualHra(6783);
    setManualSpecial(0);
    setManualUniform(200);
    setManualLeaveWages(2848);
    setManualEmployerPf(1950);
    setManualEmployerEsi(613);
    setManualBonus(1333);
    setManualTelanganaLwf(0.17);
    setManualGratuity(0);
    setManualInsurance(0);
    setManualConveyance(0);
    setManualMedical(0);
    setManualLta(0);
    setManualFood(0);
    setManualComm(0);
    setManualVariable(0);
    setManualEmployeePf(1920);
    setManualEmployeeEsi(171);
    setManualPt(200);
    setManualEmployeeLwf(2);
    setManualTds(0);
    showToast('Loaded VPHS Standard Slabs (₹22,783 Gross / ₹29,727 CTC / 12 Staff)', 'success');
  };

  const handleSaveToEmployee = async () => {
    const targetEmpId = selectedEmployee?.id || propEmployeeId;
    if (!targetEmpId || !breakdown) return;
    setIsSaving(true);
    try {
      const m = breakdown.monthly;
      const res: any = await api.post('/payroll/apply-calculator-structure', {
        structure: m,
        target: 'EMPLOYEE',
        employeeId: targetEmpId,
      });

      if (res.success) {
        showToast(`Statutory salary structure saved & synced for ${selectedEmployee?.firstName || 'Employee'}!`, 'success');
        await fetchEmployeesAndSites();
        if (onSaved) onSaved();
      } else {
        showToast(res.message || 'Failed to save salary structure', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save salary structure', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Batch apply current calculator slabs to all employees in the selected site
  const handleBatchApplyToSite = async () => {
    if (filteredEmployees.length === 0 || !breakdown) return;
    const m = breakdown.monthly;
    const siteName = selectedSiteId === 'ALL' ? 'all sites' : sites.find(s => s.id === selectedSiteId)?.siteName || 'selected site';
    
    if (!window.confirm(`Are you sure you want to apply these calculated slabs (Gross: ${formatCurrency(m.grossSalary)} / CTC: ${formatCurrency(m.ctc)}) to all ${filteredEmployees.length} staff at ${siteName}?\n\nThis will automatically update their salary structure, recalculate the Monthly Payroll Register batch, and update individual employee payslips without manual approval.`)) {
      return;
    }

    setIsBatchApplying(true);
    try {
      const res: any = await api.post('/payroll/apply-calculator-structure', {
        structure: m,
        target: selectedSiteId === 'ALL' ? 'ALL' : 'SITE',
        siteId: selectedSiteId,
      });

      if (res.success) {
        showToast(`Calculator slabs applied to ${res.data?.updatedCount || filteredEmployees.length} employees across ${siteName} and synced with Payroll Register!`, 'success');
        await fetchEmployeesAndSites();
        if (onSaved) onSaved();
      } else {
        showToast(res.message || 'Batch update failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Batch update failed', 'error');
    } finally {
      setIsBatchApplying(false);
    }
  };

  // Unified 1-Click Sync Handler: Apply slabs to selected target and sync register + payslips
  const handleApplyAndSyncToPayroll = async () => {
    if (!breakdown) return;
    const m = breakdown.monthly;

    const targetDesc =
      syncTarget === 'EMPLOYEE' && selectedEmployee
        ? `${selectedEmployee.firstName} ${selectedEmployee.lastName} (${selectedEmployee.employeeId})`
        : syncTarget === 'SITE' && selectedSiteId !== 'ALL'
        ? `all ${filteredEmployees.length} staff at ${sites.find(s => s.id === selectedSiteId)?.siteName || 'selected site'}`
        : `all ${employees.length} employees across the company`;

    const confirmMsg = `Apply these statutory slabs (Gross: ${formatCurrency(m.grossSalary)}, Take-Home: ${formatCurrency(m.netSalary)}, CTC: ${formatCurrency(m.ctc)}) to ${targetDesc}?\n\nThis will automatically update their Salary Structure and immediately sync their Monthly Payroll Register batch and individual Employee Payslips as per attendance!`;

    if (!window.confirm(confirmMsg)) return;

    setIsSyncing(true);
    try {
      const res: any = await api.post('/payroll/apply-calculator-structure', {
        structure: m,
        target: syncTarget,
        employeeId: selectedEmployee?.id,
        siteId: selectedSiteId,
      });

      if (res.success) {
        showToast(res.message || `Statutory slabs applied and synced with Monthly Payroll Register & Payslips!`, 'success');
        await fetchEmployeesAndSites();
        if (onSaved) onSaved();
      } else {
        showToast(res.message || 'Failed to sync slabs with payroll register', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error applying calculator slabs', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportExcel = () => {
    if (!breakdown) return;
    const m = breakdown.monthly;
    const a = breakdown.annual;

    const exportRows = [
      { 'Statutory Category': '1. BASIC', 'Component': 'Basic Wage / Salary', 'Unit Monthly (₹)': m.basic, 'Unit Annual (₹)': a.basic, [`Headcount Monthly (${headcount}p) (₹)`]: m.basic * headcount, 'Total Annual (₹)': a.basic * headcount },
      { 'Statutory Category': '2. DA', 'Component': 'Dearness Allowance (DA)', 'Unit Monthly (₹)': m.da, 'Unit Annual (₹)': a.da, [`Headcount Monthly (${headcount}p) (₹)`]: m.da * headcount, 'Total Annual (₹)': a.da * headcount },
      { 'Statutory Category': '3. SUB TOTAL 1', 'Component': 'Basic + DA (Wage Base)', 'Unit Monthly (₹)': m.basic + m.da, 'Unit Annual (₹)': (m.basic + m.da) * 12, [`Headcount Monthly (${headcount}p) (₹)`]: (m.basic + m.da) * headcount, 'Total Annual (₹)': (m.basic + m.da) * 12 * headcount },
      { 'Statutory Category': '4. HRA', 'Component': 'House Rent Allowance (HRA)', 'Unit Monthly (₹)': m.hra, 'Unit Annual (₹)': a.hra, [`Headcount Monthly (${headcount}p) (₹)`]: m.hra * headcount, 'Total Annual (₹)': a.hra * headcount },
      { 'Statutory Category': '5. SPL ALLOWANCE', 'Component': 'Special Allowance (Balancing)', 'Unit Monthly (₹)': m.specialAllowance, 'Unit Annual (₹)': a.specialAllowance, [`Headcount Monthly (${headcount}p) (₹)`]: m.specialAllowance * headcount, 'Total Annual (₹)': a.specialAllowance * headcount },
      { 'Statutory Category': '6. UNIFORM & SHOES', 'Component': 'Uniform, Shoes & washing allowance', 'Unit Monthly (₹)': m.uniformAllowance || 0, 'Unit Annual (₹)': (m.uniformAllowance || 0) * 12, [`Headcount Monthly (${headcount}p) (₹)`]: (m.uniformAllowance || 0) * headcount, 'Total Annual (₹)': (m.uniformAllowance || 0) * 12 * headcount },
      { 'Statutory Category': '7. LEAVE WAGES', 'Component': 'Leave Wages (CL, PL, SL Encashment)', 'Unit Monthly (₹)': m.leaveWages || 0, 'Unit Annual (₹)': (m.leaveWages || 0) * 12, [`Headcount Monthly (${headcount}p) (₹)`]: (m.leaveWages || 0) * headcount, 'Total Annual (₹)': (m.leaveWages || 0) * 12 * headcount },
      { 'Statutory Category': '8. GROSS', 'Component': 'GROSS SALARY (TOTAL EARNINGS)', 'Unit Monthly (₹)': m.grossSalary, 'Unit Annual (₹)': a.grossSalary, [`Headcount Monthly (${headcount}p) (₹)`]: m.grossSalary * headcount, 'Total Annual (₹)': a.grossSalary * headcount },
      
      { 'Statutory Category': '9. EMPLOYEE PF (12%)', 'Component': 'Employee Provident Fund (12%)', 'Unit Monthly (₹)': m.employeePf, 'Unit Annual (₹)': m.employeePf * 12, [`Headcount Monthly (${headcount}p) (₹)`]: m.employeePf * headcount, 'Total Annual (₹)': m.employeePf * headcount * 12 },
      { 'Statutory Category': '10. EMPLOYEE ESI (0.75%)', 'Component': 'Employee ESI (0.75%)', 'Unit Monthly (₹)': m.employeeEsi, 'Unit Annual (₹)': m.employeeEsi * 12, [`Headcount Monthly (${headcount}p) (₹)`]: m.employeeEsi * headcount, 'Total Annual (₹)': m.employeeEsi * headcount * 12 },
      { 'Statutory Category': '11. PROFESSIONAL TAX', 'Component': 'Telangana Professional Tax (PT)', 'Unit Monthly (₹)': m.professionalTax, 'Unit Annual (₹)': m.professionalTax * 12, [`Headcount Monthly (${headcount}p) (₹)`]: m.professionalTax * headcount, 'Total Annual (₹)': m.professionalTax * headcount * 12 },
      { 'Statutory Category': '12. NET TAKE-HOME', 'Component': 'Net In-Hand Salary (Take-Home)', 'Unit Monthly (₹)': m.netSalary, 'Unit Annual (₹)': m.netSalary * 12, [`Headcount Monthly (${headcount}p) (₹)`]: m.netSalary * headcount, 'Total Annual (₹)': m.netSalary * headcount * 12 },

      { 'Statutory Category': '13. P.F @ EMPLOYER', 'Component': 'Employer Provident Fund (13%)', 'Unit Monthly (₹)': m.employerPf, 'Unit Annual (₹)': a.employerPf, [`Headcount Monthly (${headcount}p) (₹)`]: m.employerPf * headcount, 'Total Annual (₹)': a.employerPf * headcount },
      { 'Statutory Category': '14. ESI @ EMPLOYER', 'Component': 'Employer ESI (3.25%) / Group Insurances', 'Unit Monthly (₹)': m.employerEsi, 'Unit Annual (₹)': a.employerEsi, [`Headcount Monthly (${headcount}p) (₹)`]: m.employerEsi * headcount, 'Total Annual (₹)': a.employerEsi * headcount },
      { 'Statutory Category': '15. BONUS', 'Component': 'Statutory Bonus (8.33% of Basic+DA)', 'Unit Monthly (₹)': m.bonus || 0, 'Unit Annual (₹)': (m.bonus || 0) * 12, [`Headcount Monthly (${headcount}p) (₹)`]: (m.bonus || 0) * headcount, 'Total Annual (₹)': (m.bonus || 0) * 12 * headcount },
      { 'Statutory Category': '16. TELANGANA LWF', 'Component': 'Telangana Labour Welfare Fund (Employer)', 'Unit Monthly (₹)': m.telanganaLwf || 0.17, 'Unit Annual (₹)': (m.telanganaLwf || 0.17) * 12, [`Headcount Monthly (${headcount}p) (₹)`]: (m.telanganaLwf || 0.17) * headcount, 'Total Annual (₹)': (m.telanganaLwf || 0.17) * 12 * headcount },
      { 'Statutory Category': '17. HEADCOUNT', 'Component': 'Deployed Site Personnel Headcount', 'Unit Monthly (₹)': 1, 'Unit Annual (₹)': 1, [`Headcount Monthly (${headcount}p) (₹)`]: headcount, 'Total Annual (₹)': headcount },
      { 'Statutory Category': '18. CTC', 'Component': 'TOTAL COST TO COMPANY (CTC)', 'Unit Monthly (₹)': m.ctc, 'Unit Annual (₹)': a.ctc, [`Headcount Monthly (${headcount}p) (₹)`]: m.ctc * headcount, 'Total Annual (₹)': a.ctc * headcount },
    ];

    exportToExcel(exportRows, `VPHS_Payroll_Statutory_Slabs_HC${headcount}_₹${Math.round(m.ctc)}`, 'Statutory Slabs');
    showToast('Statutory Slabs & Headcount Costing Excel downloaded', 'success');
  };

  // Export Site Workforce Statutory Register
  const handleExportSiteRegister = () => {
    const exportRows = filteredEmployees.map(emp => {
      const s = emp.salaryStructures && emp.salaryStructures.length > 0 ? emp.salaryStructures[0] : null;
      const basic = s?.basic || 6000;
      const da = s?.da || 10000;
      const subTotal1 = basic + da;
      const hra = s?.hra || 6783;
      const uniform = s?.uniformAllowance || 200;
      const leaveWages = s?.leaveWages || 2848;
      const gross = s?.grossSalary || 22783;
      const empPf = s?.employeePf || 1920;
      const empEsi = s?.employeeEsi || 171;
      const pt = s?.professionalTax || 200;
      const netPay = s?.netSalary || 20610;
      const emprPf = s?.employerPf || 1950;
      const emprEsi = s?.employerEsi || 613;
      const bonusVal = s?.bonus || 1333;
      const monthlyCtc = s?.ctc || 29727;
      const annualCtc = Math.round(monthlyCtc * 12);

      return {
        'Employee ID': emp.employeeId,
        'Employee Name': `${emp.firstName} ${emp.lastName}`,
        'Site / Facility': emp.site?.siteName || 'Corporate HQ',
        'Department': emp.department?.name || '-',
        'Designation': emp.designation?.title || '-',
        'Status': emp.status,
        'Basic Salary (₹)': basic,
        'DA (₹)': da,
        'Sub Total 1 (Basic+DA) (₹)': subTotal1,
        'HRA (₹)': hra,
        'Uniform Allowance (₹)': uniform,
        'Leave Wages (CL,PL,SL) (₹)': leaveWages,
        'Gross Salary (₹)': gross,
        'Employee PF (12%) (₹)': empPf,
        'Employee ESI (0.75%) (₹)': empEsi,
        'Professional Tax (₹)': pt,
        'Net Take-Home Pay (₹)': netPay,
        'Employer PF (13%) (₹)': emprPf,
        'Employer ESI (3.25%) (₹)': emprEsi,
        'Statutory Bonus (8.33%) (₹)': bonusVal,
        'Monthly CTC (₹)': monthlyCtc,
        'Annual CTC (₹)': annualCtc,
      };
    });

    const activeSiteLabel = selectedSiteId === 'ALL' ? 'All_Sites' : (sites.find(s => s.id === selectedSiteId)?.siteName || 'Site').replace(/\s+/g, '_');
    exportToExcel(exportRows, `VPHS_Workforce_Statutory_Register_${activeSiteLabel}`, 'Statutory Register');
    showToast(`Exported statutory register for ${filteredEmployees.length} employees`, 'success');
  };

  const m = breakdown?.monthly;
  const a = breakdown?.annual;

  return (
    <div className="space-y-6">
      {/* 🌟 Top Header with Site Filter Bar & Views */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full uppercase">
                STATUTORY & FACILITY SLABS
              </span>
              <span className="text-[10px] font-bold text-cyan-800 bg-cyan-100 border border-cyan-300 px-2 py-0.5 rounded-full">
                Telangana & Central Minimum Wages
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-extrabold text-slate-900 flex items-center gap-2 mt-1">
              <Calculator className="w-5 h-5 text-amber-600" /> Payroll & Statutory Slabs Calculator
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Filter by facility site, inspect employee salary breakups, simulate statutory slabs, and manage site headcount costing.
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setCalculatorView('CALCULATOR')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  calculatorView === 'CALCULATOR' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" /> Slab Simulator & Editor
              </button>
              <button
                type="button"
                onClick={() => setCalculatorView('EMPLOYEES_REGISTER')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  calculatorView === 'EMPLOYEES_REGISTER' ? 'bg-cyan-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Site Workforce Register ({filteredEmployees.length})
              </button>
            </div>

            <button
              onClick={handleLoadVphsStandardTemplate}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="w-4 h-4" /> Load VPHS Standard (₹22,783 Gross)
            </button>
          </div>
        </div>

        {/* 🔍 SITE FILTER & SEARCH CONTROLS BAR */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Site Filter Dropdown */}
          <div className="sm:col-span-4">
            <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-amber-600" /> Filter as per Site / Facility:
            </label>
            <select
              value={selectedSiteId}
              onChange={e => setSelectedSiteId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-amber-800 font-bold focus:border-amber-500"
            >
              <option value="ALL">🏢 All Facilities & Sites ({employees.length} Staff)</option>
              {sites.map(site => {
                const count = employees.filter(e => e.siteId === site.id || e.site?.id === site.id).length;
                return (
                  <option key={site.id} value={site.id}>
                    📍 {site.siteName} ({count} Staff)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Search Employee Bar */}
          <div className="sm:col-span-5">
            <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Search className="w-3 h-3 text-cyan-600" /> Search Employee / ID / Role:
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, ID (e.g. VPHS001), designation..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-cyan-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Active / All Staff Filter */}
          <div className="sm:col-span-3 flex items-end justify-end gap-2">
            <div className="w-full">
              <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                Staff Status:
              </label>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:border-amber-500"
              >
                <option value="ACTIVE">🟢 Active Staff Only</option>
                <option value="ALL">👥 All Personnel (Inc. Inactive)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Selected Employee Context Banner (If any) */}
        {selectedEmployee && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black">
                {selectedEmployee.firstName[0]}
              </div>
              <div>
                <span className="font-bold text-slate-900">{selectedEmployee.firstName} {selectedEmployee.lastName}</span>
                <span className="text-amber-800 font-mono font-bold ml-1.5">({selectedEmployee.employeeId})</span>
                <span className="text-slate-600 text-[11px] ml-2">• {selectedEmployee.designation?.title || 'Staff'} • {selectedEmployee.site?.siteName || 'Corporate'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveToEmployee}
                disabled={isSaving || !breakdown}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-black flex items-center gap-1 shadow"
              >
                <Save className="w-3.5 h-3.5" /> {isSaving ? 'Saving...' : 'Save Structure to Staff'}
              </button>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="text-slate-500 hover:text-slate-800 text-xs underline ml-2"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* ⚡ REAL-TIME SYNC CONTROLLER: Apply Slabs to Monthly Register & Payslips */}
        <div className="bg-gradient-to-r from-amber-50 via-emerald-50 to-slate-50 border border-amber-300 rounded-xl p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 font-black text-sm shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900">
                  Real-Time Payroll Register & Payslip Auto-Sync
                </span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Instant Link
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Any changes made to statutory slabs reflect automatically in the <strong className="text-amber-800">Monthly Payroll Register</strong> & <strong className="text-emerald-800">Employee Payslips</strong> without manual approval.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500">Target:</span>
              <select
                value={syncTarget}
                onChange={e => setSyncTarget(e.target.value as any)}
                className="bg-transparent text-amber-800 font-bold text-xs focus:outline-none cursor-pointer"
              >
                {selectedEmployee && (
                  <option value="EMPLOYEE" className="bg-white text-slate-900">
                    👤 {selectedEmployee.firstName} ({selectedEmployee.employeeId})
                  </option>
                )}
                {selectedSiteId !== 'ALL' && (
                  <option value="SITE" className="bg-white text-slate-900">
                    🏢 {sites.find(s => s.id === selectedSiteId)?.siteName || 'Site'} ({filteredEmployees.length} Staff)
                  </option>
                )}
                <option value="ALL" className="bg-white text-slate-900">
                  🌐 All Staff ({employees.length} Employees)
                </option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleApplyAndSyncToPayroll}
              disabled={isSyncing || !breakdown}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              {isSyncing ? 'Syncing Register & Payslips...' : '⚡ Apply Slabs & Sync Monthly Register & Payslips'}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📋 VIEW 2: SITE WORKFORCE STATUTORY REGISTER (ALL EMPLOYEES TABLE) */}
      {/* ========================================================================= */}
      {calculatorView === 'EMPLOYEES_REGISTER' && (
        <div className="space-y-4">
          {/* Site Aggregates Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Site Workforce</span>
              <strong className="text-lg font-black text-slate-900 mt-0.5 block">{filteredEmployees.length} Staff</strong>
            </div>
            <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Monthly Gross</span>
              <strong className="text-lg font-black text-cyan-800 mt-0.5 block font-mono">
                {formatCurrency(filteredEmployees.reduce((acc, emp) => acc + (emp.salaryStructures?.[0]?.grossSalary || 22783), 0))}
              </strong>
            </div>
            <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Net Payout</span>
              <strong className="text-lg font-black text-emerald-800 mt-0.5 block font-mono">
                {formatCurrency(filteredEmployees.reduce((acc, emp) => acc + (emp.salaryStructures?.[0]?.netSalary || 20610), 0))}
              </strong>
            </div>
            <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Monthly CTC</span>
              <strong className="text-lg font-black text-amber-800 mt-0.5 block font-mono">
                {formatCurrency(filteredEmployees.reduce((acc, emp) => acc + (emp.salaryStructures?.[0]?.ctc || 29727), 0))}
              </strong>
            </div>
            <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-2xl shadow-sm">
              <span className="text-amber-800 text-[10px] uppercase font-bold block">Annual Facility Cost</span>
              <strong className="text-lg font-black text-amber-900 mt-0.5 block font-mono">
                {formatCurrency(filteredEmployees.reduce((acc, emp) => acc + (emp.salaryStructures?.[0]?.ctc || 29727) * 12, 0))}
              </strong>
            </div>
          </div>

          {/* Action Bar for Register */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-700 font-semibold">
              Showing <strong className="text-slate-900">{filteredEmployees.length}</strong> staff under site filter
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchApplyToSite}
                disabled={isBatchApplying || filteredEmployees.length === 0}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow flex items-center gap-1.5 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isBatchApplying ? 'Applying & Syncing...' : `Batch Apply Calculated Slabs (${formatCurrency(m?.grossSalary || 22783)} Gross)`}
              </button>
              <button
                onClick={handleExportSiteRegister}
                disabled={filteredEmployees.length === 0}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Export Site Register (Excel)
              </button>
            </div>
          </div>

          {/* Register Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-xs">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200 sticky top-0 z-10 text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Employee Details</th>
                    <th className="px-3 py-3">Site & Role</th>
                    <th className="px-3 py-3 font-mono text-right">Basic (₹)</th>
                    <th className="px-3 py-3 font-mono text-right">DA (₹)</th>
                    <th className="px-3 py-3 font-mono text-right text-amber-800">Sub Total 1</th>
                    <th className="px-3 py-3 font-mono text-right">HRA (₹)</th>
                    <th className="px-3 py-3 font-mono text-right">Uniform (₹)</th>
                    <th className="px-3 py-3 font-mono text-right">Leave Wages</th>
                    <th className="px-3 py-3 font-mono text-right text-cyan-800 font-bold">Gross (₹)</th>
                    <th className="px-3 py-3 font-mono text-right">EPF 12%</th>
                    <th className="px-3 py-3 font-mono text-right">ESI 0.75%</th>
                    <th className="px-3 py-3 font-mono text-right">PT (₹)</th>
                    <th className="px-3 py-3 font-mono text-right text-emerald-800 font-black">Net Pay (₹)</th>
                    <th className="px-3 py-3 font-mono text-right">Empr PF 13%</th>
                    <th className="px-3 py-3 font-mono text-right">Empr ESI</th>
                    <th className="px-3 py-3 font-mono text-right">Bonus 8.33%</th>
                    <th className="px-3 py-3 font-mono text-right text-amber-800 font-black">Monthly CTC</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={18} className="px-4 py-8 text-center text-slate-500">
                        No employees found matching the selected site and search filters.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map(emp => {
                      const s = emp.salaryStructures && emp.salaryStructures.length > 0 ? emp.salaryStructures[0] : null;
                      const basic = s?.basic || 6000;
                      const da = s?.da || 10000;
                      const subTotal1 = basic + da;
                      const hra = s?.hra || 6783;
                      const uniform = s?.uniformAllowance || 200;
                      const leaveWages = s?.leaveWages || 2848;
                      const gross = s?.grossSalary || 22783;
                      const empPf = s?.employeePf || 1920;
                      const empEsi = s?.employeeEsi || 171;
                      const pt = s?.professionalTax || 200;
                      const netPay = s?.netSalary || 20610;
                      const emprPf = s?.employerPf || 1950;
                      const emprEsi = s?.employerEsi || 613;
                      const bonusVal = s?.bonus || 1333;
                      const monthlyCtc = s?.ctc || 29727;

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              {emp.firstName} {emp.lastName}
                            </div>
                            <div className="text-[10px] font-mono text-amber-800 font-bold">
                              {emp.employeeId}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="text-slate-800 font-semibold">{emp.site?.siteName || 'Corporate'}</div>
                            <div className="text-[10px] text-slate-500">{emp.designation?.title || '-'}</div>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-right">{formatCurrency(basic)}</td>
                          <td className="px-3 py-2.5 font-mono text-right">{formatCurrency(da)}</td>
                          <td className="px-3 py-2.5 font-mono text-right text-amber-800 font-bold">{formatCurrency(subTotal1)}</td>
                          <td className="px-3 py-2.5 font-mono text-right">{formatCurrency(hra)}</td>
                          <td className="px-3 py-2.5 font-mono text-right">{formatCurrency(uniform)}</td>
                          <td className="px-3 py-2.5 font-mono text-right">{formatCurrency(leaveWages)}</td>
                          <td className="px-3 py-2.5 font-mono text-right text-cyan-800 font-bold">{formatCurrency(gross)}</td>
                          <td className="px-3 py-2.5 font-mono text-right text-slate-600">{formatCurrency(empPf)}</td>
                          <td className="px-3 py-2.5 font-mono text-right text-slate-600">{formatCurrency(empEsi)}</td>
                          <td className="px-3 py-2.5 font-mono text-right text-slate-600">{formatCurrency(pt)}</td>
                          <td className="px-3 py-2.5 font-mono text-right text-emerald-800 font-black">{formatCurrency(netPay)}</td>
                          <td className="px-3 py-2.5 font-mono text-right text-slate-600">{formatCurrency(emprPf)}</td>
                          <td className="px-3 py-2.5 font-mono text-right text-slate-600">{formatCurrency(emprEsi)}</td>
                          <td className="px-3 py-2.5 font-mono text-right text-slate-600">{formatCurrency(bonusVal)}</td>
                          <td className="px-3 py-2.5 font-mono text-right text-amber-800 font-black">{formatCurrency(monthlyCtc)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              onClick={() => loadEmployeeStructure(emp)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-500 text-amber-800 hover:text-white border border-amber-300 rounded-lg text-[10px] font-black transition-all"
                            >
                              Load in Calculator
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🎛️ VIEW 1: INTERACTIVE SLABS CALCULATOR & SIMULATOR */}
      {/* ========================================================================= */}
      {calculatorView === 'CALCULATOR' && (
        <div className="space-y-6">
          {/* Quick Select Employee Drawer in Calculator Mode */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-amber-600" />
                Select Employee from Site ({filteredEmployees.length} available):
              </span>
              <span className="text-[11px] text-slate-500">Clicking loads exact structure into editor</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {filteredEmployees.slice(0, 16).map(emp => (
                <button
                  key={emp.id}
                  onClick={() => loadEmployeeStructure(emp)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                    selectedEmployee?.id === emp.id
                      ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-sm'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-xs">
                    {emp.firstName[0]}
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-bold text-xs truncate text-slate-900">{emp.firstName} {emp.lastName}</div>
                    <div className="text-[10px] text-amber-800 font-mono font-semibold truncate">{emp.employeeId} • {emp.site?.siteName || 'Corporate'}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Calculator Controls: CTC & Headcount Multiplier */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Calculation Mode:</span>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setCalculationMode('AUTO')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      calculationMode === 'AUTO' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" /> Auto Formula
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalculationMode('MANUAL')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      calculationMode === 'MANUAL' ? 'bg-cyan-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Manual Edit Mode
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportExcel}
                  disabled={!breakdown}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Download Rate Sheet
                </button>
              </div>
            </div>

            {/* Target CTC Input & Headcount Multiplier */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4 items-center">
              {/* Target CTC */}
              <div className="lg:col-span-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  <button
                    onClick={() => setInputMode('ANNUAL')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      inputMode === 'ANNUAL' ? 'bg-white text-amber-800 shadow font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Annual CTC
                  </button>
                  <button
                    onClick={() => setInputMode('MONTHLY')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      inputMode === 'MONTHLY' ? 'bg-white text-amber-800 shadow font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Monthly CTC
                  </button>
                </div>

                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={targetCtc}
                    onChange={e => setTargetCtc(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-slate-900 font-mono font-bold text-sm focus:border-amber-500"
                  />
                </div>

                {calculationMode === 'MANUAL' && (
                  <button
                    onClick={handleAutoBalanceSpecialAllowance}
                    title="Balance Special Allowance so Gross + Employer Cost equals Target CTC"
                    className="px-3 py-2 bg-cyan-100 hover:bg-cyan-200 text-cyan-800 border border-cyan-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Auto-Balance
                  </button>
                )}
              </div>

              {/* Headcount Multiplier Control */}
              <div className="lg:col-span-6 flex flex-wrap items-center gap-2 justify-start lg:justify-end">
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-slate-800">Headcount:</span>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={headcount}
                    onChange={e => setHeadcount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-center font-mono font-black text-amber-800 text-xs focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500 font-semibold">Staff</span>
                </div>

                <div className="flex items-center gap-1">
                  {headcountPresets.map(hc => (
                    <button
                      key={hc}
                      onClick={() => setHeadcount(hc)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        headcount === hc
                          ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {hc}p
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* KPI Cards: Total Unit vs Grand Headcount Cost */}
          {m && a && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Unit CTC */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                <span className="text-slate-500 text-[10px] uppercase font-bold block flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-amber-600" /> Monthly CTC (1 Staff)
                </span>
                <span className="text-lg sm:text-xl font-extrabold text-amber-800 block mt-1 font-mono">
                  {formatCurrency(m.ctc)} <span className="text-xs text-slate-500 font-normal">/ mo</span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                  Annual: <strong>{formatCurrency(a.ctc)}</strong>
                </span>
              </div>

              {/* Gross Salary */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                <span className="text-slate-500 text-[10px] uppercase font-bold block flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5 text-cyan-600" /> Fixed Monthly Gross
                </span>
                <span className="text-lg sm:text-xl font-extrabold text-cyan-800 block mt-1 font-mono">
                  {formatCurrency(m.grossSalary)} <span className="text-xs text-slate-500 font-normal">/ mo</span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                  Annual: <strong>{formatCurrency(a.grossSalary)}</strong>
                </span>
              </div>

              {/* Net Take-Home */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                <span className="text-slate-500 text-[10px] uppercase font-bold block flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> Net Take-Home (In-Hand)
                </span>
                <span className="text-lg sm:text-xl font-extrabold text-emerald-800 block mt-1 font-mono">
                  {formatCurrency(m.netSalary)} <span className="text-xs text-slate-500 font-normal">/ mo</span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                  Annual: <strong>{formatCurrency(a.netSalary)}</strong>
                </span>
              </div>

              {/* Grand Headcount Billing */}
              <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl shadow-sm">
                <span className="text-emerald-800 text-[10px] uppercase font-bold block flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-emerald-600" /> Total Headcount ({headcount} Staff) Cost
                </span>
                <span className="text-lg sm:text-xl font-extrabold text-emerald-800 block mt-1 font-mono">
                  {formatCurrency(m.ctc * headcount)} <span className="text-xs text-emerald-700 font-normal">/ mo</span>
                </span>
                <span className="text-[11px] text-emerald-800 font-mono block mt-0.5">
                  Grand Annual: <strong>{formatCurrency(a.ctc * headcount)}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Main Statutory Slabs Master Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-xs">
            {m && a ? (
              <>
                <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="px-5 py-3">Statutory Component</th>
                      <th className="px-4 py-3 text-right font-mono">1 Person / Mo (₹)</th>
                      <th className="px-4 py-3 text-right font-mono">1 Person / Year (₹)</th>
                      <th className="px-4 py-3 text-right font-mono text-amber-800 font-bold">
                        Headcount ({headcount} Staff) / Mo (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {/* Basic */}
                    <tr>
                      <td className="px-5 py-2.5 font-bold text-slate-900">1. Basic Salary</td>
                      <td className="px-4 py-2.5 text-right">
                        {calculationMode === 'MANUAL' ? (
                          <input
                            type="number"
                            value={manualBasic}
                            onChange={e => setManualBasic(parseFloat(e.target.value) || 0)}
                            className="w-28 bg-white border border-slate-300 rounded-lg px-2 py-1 text-right font-mono font-bold text-slate-900 text-xs focus:border-cyan-500"
                          />
                        ) : (
                          <span className="font-mono">{formatCurrency(m.basic)}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-500">{formatCurrency(a.basic)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-800">{formatCurrency(m.basic * headcount)}</td>
                    </tr>

                    {/* DA */}
                    <tr>
                      <td className="px-5 py-2.5 font-bold text-slate-900">2. Dearness Allowance (DA)</td>
                      <td className="px-4 py-2.5 text-right">
                        {calculationMode === 'MANUAL' ? (
                          <input
                            type="number"
                            value={manualDa}
                            onChange={e => setManualDa(parseFloat(e.target.value) || 0)}
                            className="w-28 bg-white border border-slate-300 rounded-lg px-2 py-1 text-right font-mono font-bold text-slate-900 text-xs focus:border-cyan-500"
                          />
                        ) : (
                          <span className="font-mono">{formatCurrency(m.da)}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-500">{formatCurrency(a.da)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-800">{formatCurrency(m.da * headcount)}</td>
                    </tr>

                    {/* Sub Total 1 */}
                    <tr className="bg-amber-50 font-bold">
                      <td className="px-5 py-2 text-amber-900">Sub Total 1 (Basic + DA)</td>
                      <td className="px-4 py-2 text-right font-mono text-amber-900">{formatCurrency(m.basic + m.da)}</td>
                      <td className="px-4 py-2 text-right font-mono text-amber-800">{formatCurrency((m.basic + m.da) * 12)}</td>
                      <td className="px-4 py-2 text-right font-mono text-amber-900 font-extrabold">{formatCurrency((m.basic + m.da) * headcount)}</td>
                    </tr>

                    {/* HRA */}
                    <tr>
                      <td className="px-5 py-2.5 font-bold text-slate-900">3. House Rent Allowance (HRA)</td>
                      <td className="px-4 py-2.5 text-right">
                        {calculationMode === 'MANUAL' ? (
                          <input
                            type="number"
                            value={manualHra}
                            onChange={e => setManualHra(parseFloat(e.target.value) || 0)}
                            className="w-28 bg-white border border-slate-300 rounded-lg px-2 py-1 text-right font-mono font-bold text-slate-900 text-xs focus:border-cyan-500"
                          />
                        ) : (
                          <span className="font-mono">{formatCurrency(m.hra)}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-500">{formatCurrency(a.hra)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-800">{formatCurrency(m.hra * headcount)}</td>
                    </tr>

                    {/* Spl Allowance */}
                    <tr>
                      <td className="px-5 py-2.5 font-bold text-slate-900">4. Special Allowance</td>
                      <td className="px-4 py-2.5 text-right">
                        {calculationMode === 'MANUAL' ? (
                          <input
                            type="number"
                            value={manualSpecial}
                            onChange={e => setManualSpecial(parseFloat(e.target.value) || 0)}
                            className="w-28 bg-white border border-slate-300 rounded-lg px-2 py-1 text-right font-mono font-bold text-amber-800 text-xs focus:border-cyan-500"
                          />
                        ) : (
                          <span className="font-mono">{formatCurrency(m.specialAllowance)}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-500">{formatCurrency(a.specialAllowance)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-800">{formatCurrency(m.specialAllowance * headcount)}</td>
                    </tr>

                    {/* Gross Salary */}
                    <tr className="bg-cyan-50 border-t-2 border-cyan-400 font-extrabold text-cyan-900 text-sm">
                      <td className="px-5 py-3">GROSS SALARY (TOTAL FIXED EARNINGS)</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(m.grossSalary)}</td>
                      <td className="px-4 py-3 text-right font-mono text-cyan-800">{formatCurrency(a.grossSalary)}</td>
                      <td className="px-4 py-3 text-right font-mono text-amber-800">{formatCurrency(m.grossSalary * headcount)}</td>
                    </tr>

                    {/* SECTION 2: EMPLOYEE DEDUCTIONS */}
                    <tr className="bg-rose-50/70 border-t border-rose-200 font-bold text-rose-900 text-xs">
                      <td colSpan={4} className="px-5 py-2 bg-rose-100/70 uppercase tracking-wider text-[11px]">
                        2. Employee Statutory Deductions (Take-Home Deductions)
                      </td>
                    </tr>

                    {/* Employee PF */}
                    <tr>
                      <td className="px-5 py-2.5 text-rose-800">Employee EPF (12%)</td>
                      <td className="px-4 py-2.5 text-right font-mono text-rose-700">-{formatCurrency(m.employeePf)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-500">-{formatCurrency(a.employeePf)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-rose-700">-{formatCurrency(m.employeePf * headcount)}</td>
                    </tr>

                    {/* Employee ESI */}
                    <tr>
                      <td className="px-5 py-2.5 text-rose-800">Employee ESI (0.75%)</td>
                      <td className="px-4 py-2.5 text-right font-mono text-rose-700">-{formatCurrency(m.employeeEsi)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-500">-{formatCurrency(a.employeeEsi)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-rose-700">-{formatCurrency(m.employeeEsi * headcount)}</td>
                    </tr>

                    {/* PT */}
                    <tr>
                      <td className="px-5 py-2.5 text-rose-800">Professional Tax (PT)</td>
                      <td className="px-4 py-2.5 text-right font-mono text-rose-700">-{formatCurrency(m.professionalTax)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-500">-{formatCurrency(a.professionalTax)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-rose-700">-{formatCurrency(m.professionalTax * headcount)}</td>
                    </tr>

                    {/* Net Salary */}
                    <tr className="bg-emerald-50 border-t border-emerald-400 font-extrabold text-emerald-900 text-sm">
                      <td className="px-5 py-3">NET TAKE-HOME SALARY (IN-HAND)</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(m.netSalary)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(a.netSalary)}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-800">{formatCurrency(m.netSalary * headcount)}</td>
                    </tr>

                    {/* SECTION 3: EMPLOYER STATUTORY CONTRIBUTIONS & FACILITY ALLOWANCES */}
                    <tr className="bg-purple-50/70 border-t-2 border-purple-300 font-black text-purple-900 text-xs">
                      <td colSpan={4} className="px-5 py-2.5 bg-purple-100/70 uppercase tracking-wider text-[11px] text-purple-900">
                        3. Employer Statutory Contributions & Facility Allowances (Cost to Company - CTC)
                      </td>
                    </tr>

                    {/* Employer PF */}
                    <tr>
                      <td className="px-5 py-2.5 text-purple-900">P.F @ Employer (13%)</td>
                      <td className="px-4 py-2.5 text-right font-mono text-purple-900">+{formatCurrency(m.employerPf)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-500">+{formatCurrency(a.employerPf)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-amber-800">+{formatCurrency(m.employerPf * headcount)}</td>
                    </tr>

                    {/* Employer ESI */}
                    <tr>
                      <td className="px-5 py-2.5 text-purple-900">ESI @ Employer / Insurances (3.25%)</td>
                      <td className="px-4 py-2.5 text-right font-mono text-purple-900">+{formatCurrency(m.employerEsi)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-500">+{formatCurrency(a.employerEsi)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-amber-800">+{formatCurrency(m.employerEsi * headcount)}</td>
                    </tr>

                    {/* Bonus */}
                    <tr>
                      <td className="px-5 py-2.5 text-purple-900">Statutory Bonus (8.33%)</td>
                      <td className="px-4 py-2.5 text-right font-mono text-purple-900">+{formatCurrency(m.bonus || 1333)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-500">+{formatCurrency((m.bonus || 1333) * 12)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-amber-800">+{formatCurrency((m.bonus || 1333) * headcount)}</td>
                    </tr>

                    {/* Leave Wages (CL, PL, SL) in Employer Statutory Contributions */}
                    <tr>
                      <td className="px-5 py-2.5 text-purple-900 flex items-center gap-2">
                        <CalendarCheck className="w-3.5 h-3.5 text-purple-600" />
                        <span>Leave Wages (CL, PL, SL)</span>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Auto Calculated
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-purple-900">
                        +{formatCurrency(m.leaveWages || 2848)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-500">+{formatCurrency((m.leaveWages || 2848) * 12)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-800">+{formatCurrency((m.leaveWages || 2848) * headcount)}</td>
                    </tr>

                    {/* Uniform, Shoes & washing allowance in Facility Allowances */}
                    <tr>
                      <td className="px-5 py-2.5 text-purple-900 flex items-center gap-2">
                        <Shirt className="w-3.5 h-3.5 text-purple-600" />
                        <span>Uniform, Shoes & washing allowance</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {calculationMode === 'MANUAL' ? (
                          <input
                            type="number"
                            value={manualUniform}
                            onChange={e => setManualUniform(parseFloat(e.target.value) || 0)}
                            className="w-28 bg-white border border-slate-300 rounded-lg px-2 py-1 text-right font-mono font-bold text-purple-900 text-xs focus:border-cyan-500"
                          />
                        ) : (
                          <span className="font-mono text-purple-900">+{formatCurrency(m.uniformAllowance || 200)}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-500">+{formatCurrency((m.uniformAllowance || 200) * 12)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-800">+{formatCurrency((m.uniformAllowance || 200) * headcount)}</td>
                    </tr>

                    {/* Telangana LWF */}
                    <tr>
                      <td className="px-5 py-2.5 text-purple-900">Telangana LWF (Employer)</td>
                      <td className="px-4 py-2.5 text-right font-mono text-purple-900">+₹0.17</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-500">+₹2.04</td>
                      <td className="px-4 py-2.5 text-right font-mono text-amber-800">+{formatCurrency(0.17 * headcount)}</td>
                    </tr>

                    {/* TOTAL CTC */}
                    <tr className="bg-amber-50 border-t-2 border-amber-400 font-black text-amber-900 text-base">
                      <td className="px-5 py-4 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-amber-600" />
                        TOTAL COST TO COMPANY (CTC)
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-amber-900">{formatCurrency(m.ctc)}</td>
                      <td className="px-4 py-4 text-right font-mono text-amber-800">{formatCurrency(a.ctc)}</td>
                      <td className="px-4 py-4 text-right font-mono text-amber-900 text-lg font-black">{formatCurrency(m.ctc * headcount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 📜 STATUTORY RULES & COMPLIANCE POLICIES REFERENCE */}
              <div className="mt-6 pt-5 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-800">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        Statutory Rules &amp; Compliance Policies Reference
                        <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Active Telangana Norms
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Rate card slabs, shift thresholds, weekend continuity rules and monthly payroll batch proration standards
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                  {/* 1. Attendance & Shift Codes */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-cyan-800 font-bold border-b border-slate-200 pb-1.5">
                      <Clock className="w-4 h-4 text-cyan-600 shrink-0" />
                      <span className="text-xs">1. Attendance &amp; Shift Codes</span>
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

                  {/* 2. Weekend Sandwich Rule */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-bold border-b border-slate-200 pb-1.5">
                      <CalendarCheck className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-xs">2. Weekend Sandwich Rule</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Statutory continuity rule preventing unauthorized absenteeism adjoining weekly off days:
                    </p>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1 text-[11px]">
                      <p className="text-rose-700">• <strong>Friday Absent:</strong> Saturday marked Absent / LOP.</p>
                      <p className="text-rose-700">• <strong>Monday Absent:</strong> Sunday marked Absent / LOP.</p>
                      <p className="text-emerald-700 pt-1 border-t border-slate-100 font-medium">
                        • <strong>Auto-Restore:</strong> Changing Friday/Monday back to Present automatically returns weekend to statutory Week Off (WO).
                      </p>
                    </div>
                  </div>

                  {/* 3. Overtime (OT) Rules */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-purple-900 font-bold border-b border-slate-200 pb-1.5">
                      <TrendingUp className="w-4 h-4 text-purple-600 shrink-0" />
                      <span className="text-xs">3. Overtime (OT) Rules</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Overtime compensation under Factory &amp; Labour regulations:
                    </p>
                    <div className="space-y-1.5 text-[11px] text-slate-600">
                      <p>
                        • <strong>Eligibility:</strong> Calculated strictly <strong>after completing standard 9.0h shift</strong> (min 4h login required).
                      </p>
                      <div className="p-2 bg-purple-50 rounded-xl border border-purple-200 font-mono text-[10px] text-purple-900 font-semibold">
                        OT = ((Gross / (Month Days × 8)) × 1.5) × OT Hours
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
