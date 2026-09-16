import React, { useState, useMemo } from 'react';
import {
  Download,
  FileSpreadsheet,
  Building2,
  AlertCircle,
  Search,
  Copy,
  Check,
  X,
  ShieldCheck,
  Info,
  ArrowRightLeft
} from 'lucide-react';
import {
  BankCmpRow,
  generateBankCmpData,
  exportBankCmpCsv,
  exportBankCmpExcel,
  downloadSampleCmpTemplate,
  formatCurrency
} from '../../utils/formatters';

interface BankCmpDisbursementModalProps {
  isOpen: boolean;
  onClose: () => void;
  payrollBatch: any;
  payrollItems: any[];
}

export const BankCmpDisbursementModal: React.FC<BankCmpDisbursementModalProps> = ({
  isOpen,
  onClose,
  payrollBatch,
  payrollItems
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [bankFilter, setBankFilter] = useState('ALL');
  const [txTypeFilter, setTxTypeFilter] = useState<'ALL' | 'NEFT' | 'RTGS'>('ALL');
  const [globalTxMode, setGlobalTxMode] = useState<'AUTO' | 'NEFT' | 'RTGS'>('AUTO');
  const [customRowTxTypes, setCustomRowTxTypes] = useState<{ [serialNumber: number]: 'NEFT' | 'RTGS' }>({});
  const [copied, setCopied] = useState(false);

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const monthName = payrollBatch?.payrollMonth
    ? monthNames[payrollBatch.payrollMonth - 1]
    : monthNames[new Date().getMonth()];
  const year = payrollBatch?.payrollYear || new Date().getFullYear();
  const defaultRemarks = `Salary ${monthName} ${year}`;

  const [remarks, setRemarks] = useState(defaultRemarks);

  // Generate base rows
  const allRows: BankCmpRow[] = useMemo(() => {
    const rawRows = generateBankCmpData(
      payrollItems,
      payrollBatch?.payrollMonth,
      payrollBatch?.payrollYear,
      globalTxMode
    );

    return rawRows.map(row => {
      // Allow custom row override if user toggled NEFT/RTGS for this specific employee
      const assignedTxType = customRowTxTypes[row['Serial Number']] || row['Transaction Type (NEFT/RTGS)'] || 'NEFT';

      return {
        ...row,
        'Transaction Type (NEFT/RTGS)': assignedTxType,
        'Transaction Remarks / Purpose': remarks || defaultRemarks
      };
    });
  }, [payrollItems, payrollBatch, remarks, defaultRemarks, globalTxMode, customRowTxTypes]);

  // Bank detection helper
  const getBankNameFromIfsc = (ifsc: string): string => {
    if (!ifsc) return 'Unknown';
    const code = ifsc.substring(0, 4).toUpperCase();
    switch (code) {
      case 'SBIN': return 'State Bank of India (SBI)';
      case 'HDFC': return 'HDFC Bank';
      case 'ICIC': return 'ICICI Bank';
      case 'UTIB': return 'Axis Bank';
      case 'PUNB': return 'Punjab National Bank';
      case 'KKBK': return 'Kotak Mahindra Bank';
      case 'BARB': return 'Bank of Baroda';
      case 'CNRB': return 'Canara Bank';
      default: return `Bank (${code})`;
    }
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    return allRows.filter(row => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        row['Beneficiary Name'].toLowerCase().includes(q) ||
        row['Beneficiary Account Number'].toLowerCase().includes(q) ||
        row['IFSC Code'].toLowerCase().includes(q) ||
        row['Beneficiary Mobile Number'].includes(q);

      const matchBank =
        bankFilter === 'ALL' ||
        row['IFSC Code'].toUpperCase().startsWith(bankFilter);

      const matchTxType =
        txTypeFilter === 'ALL' ||
        row['Transaction Type (NEFT/RTGS)'] === txTypeFilter;

      return matchSearch && matchBank && matchTxType;
    });
  }, [allRows, searchQuery, bankFilter, txTypeFilter]);

  // Summary Metrics
  const totalAmount = useMemo(() => {
    return filteredRows.reduce((sum, r) => sum + (Number(r['Transaction Amount']) || 0), 0);
  }, [filteredRows]);

  const uniqueBanks = useMemo(() => {
    const set = new Set<string>();
    allRows.forEach(r => {
      if (r['IFSC Code'] && r['IFSC Code'].length >= 4) {
        set.add(r['IFSC Code'].substring(0, 4).toUpperCase());
      }
    });
    return Array.from(set);
  }, [allRows]);

  const neftCount = useMemo(() => {
    return allRows.filter(r => r['Transaction Type (NEFT/RTGS)'] === 'NEFT').length;
  }, [allRows]);

  const rtgsCount = useMemo(() => {
    return allRows.filter(r => r['Transaction Type (NEFT/RTGS)'] === 'RTGS').length;
  }, [allRows]);

  const toggleRowTxType = (serialNumber: number, currentType: 'NEFT' | 'RTGS') => {
    const nextType = currentType === 'NEFT' ? 'RTGS' : 'NEFT';
    setCustomRowTxTypes(prev => ({
      ...prev,
      [serialNumber]: nextType
    }));
  };

  const handleDownloadCsv = () => {
    const fileName = `VPHS_CMP_Salary_Upload_${monthName}_${year}`;
    exportBankCmpCsv(filteredRows, fileName);
  };

  const handleDownloadExcel = () => {
    const fileName = `VPHS_CMP_Salary_Upload_${monthName}_${year}`;
    exportBankCmpExcel(filteredRows, fileName);
  };

  const handleCopyToClipboard = () => {
    const headers = [
      'Serial Number',
      'Beneficiary Account Number',
      'Beneficiary Name',
      'IFSC Code',
      'Transaction Amount',
      'Transaction Type (NEFT/RTGS)',
      'Account Type (Savings/Current)',
      'Transaction Remarks / Purpose',
      'Beneficiary Mobile Number',
      'Beneficiary Email ID',
    ];

    const lines = [
      headers.join('\t'),
      ...filteredRows.map(r => [
        r['Serial Number'],
        r['Beneficiary Account Number'],
        r['Beneficiary Name'],
        r['IFSC Code'],
        typeof r['Transaction Amount'] === 'number' ? r['Transaction Amount'].toFixed(1) : r['Transaction Amount'],
        r['Transaction Type (NEFT/RTGS)'],
        r['Account Type (Savings/Current)'],
        r['Transaction Remarks / Purpose'],
        r['Beneficiary Mobile Number'],
        r['Beneficiary Email ID'],
      ].join('\t'))
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Corporate Bank Payout (CMP Bulk Upload)
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Standard Banking Layout
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Compatible with SBI Corporate Banking (CMP), HDFC ENET, ICICI Corporate Net Banking &amp; Axis CMS with NEFT/RTGS routing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informative Banner */}
        <div className="px-6 py-3 bg-amber-50/50 border-b border-amber-200/60 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-700">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Corporate Banking CMP Format:</strong> Standard 10-column flattened layout including <strong>Transaction Type (NEFT / RTGS)</strong> as required by corporate bank portals.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadSampleCmpTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-amber-800 border border-amber-300 rounded-lg font-bold text-[11px] transition-colors shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
              Download Official Sample Template (.CSV)
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/50 border-b border-slate-200 shrink-0 text-xs">
          <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">
              Total Net Disbursement
            </span>
            <span className="text-lg font-extrabold text-slate-900 mt-0.5 block font-mono">
              {formatCurrency(totalAmount)}
            </span>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">
              Total Beneficiaries
            </span>
            <span className="text-lg font-extrabold text-slate-900 mt-0.5 block font-mono">
              {filteredRows.length} Staff Members
            </span>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">
              Payment Mode Routing
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-200 font-bold text-xs">
                NEFT: {neftCount}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 font-bold text-xs">
                RTGS: {rtgsCount}
              </span>
            </div>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">
              Transaction Remarks / Purpose
            </span>
            <input
              type="text"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="e.g. Salary Sep 2026"
              className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 mt-0.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Toolbar: Search, Bank Filter, Transaction Type Selector & Action Buttons */}
        <div className="px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-white">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[320px]">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff, account, IFSC..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Global Transaction Mode Preset */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">Rule:</span>
              <select
                value={globalTxMode}
                onChange={e => {
                  setGlobalTxMode(e.target.value as any);
                  setCustomRowTxTypes({});
                }}
                className="bg-transparent font-bold text-xs text-slate-800 focus:outline-none cursor-pointer"
                title="Routing rule for NEFT / RTGS"
              >
                <option value="AUTO">Auto (NEFT &lt; ₹2L, RTGS ≥ ₹2L)</option>
                <option value="NEFT">Force NEFT (All Staff)</option>
                <option value="RTGS">Force RTGS (All Staff)</option>
              </select>
            </div>

            {/* Filter by NEFT / RTGS */}
            <select
              value={txTypeFilter}
              onChange={e => setTxTypeFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Modes ({allRows.length})</option>
              <option value="NEFT">NEFT Only ({neftCount})</option>
              <option value="RTGS">RTGS Only ({rtgsCount})</option>
            </select>

            {/* Bank Filter */}
            <select
              value={bankFilter}
              onChange={e => setBankFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Banks ({allRows.length})</option>
              {uniqueBanks.map(b => (
                <option key={b} value={b}>
                  {getBankNameFromIfsc(b)} ({allRows.filter(r => r['IFSC Code'].startsWith(b)).length})
                </option>
              ))}
            </select>

            {(searchQuery || bankFilter !== 'ALL' || txTypeFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setBankFilter('ALL');
                  setTxTypeFilter('ALL');
                }}
                className="text-[11px] text-slate-500 hover:text-slate-900 underline transition-colors px-1 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyToClipboard}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Copy table to clipboard for Excel paste"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Table'}</span>
            </button>

            <button
              onClick={handleDownloadExcel}
              className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Download Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleDownloadCsv}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CMP File (.csv)</span>
            </button>
          </div>
        </div>

        {/* 10-Column Table View with Interactive NEFT/RTGS Toggle */}
        <div className="flex-1 overflow-auto bg-white">
          {filteredRows.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <AlertCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-800">No disbursement records found</p>
              <p className="text-xs mt-1">Try adjusting your search query, bank filter, or transaction type.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-600 font-extrabold">
                <tr>
                  <th className="py-3 px-3 w-12 text-center border-r border-slate-200">#</th>
                  <th className="py-3 px-4 border-r border-slate-200 font-mono">Beneficiary Account Number</th>
                  <th className="py-3 px-4 border-r border-slate-200">Beneficiary Name</th>
                  <th className="py-3 px-3 border-r border-slate-200 font-mono">IFSC Code</th>
                  <th className="py-3 px-4 border-r border-slate-200 text-right font-mono">Transaction Amount (₹)</th>
                  <th className="py-3 px-3 border-r border-slate-200 text-center">Transaction Type</th>
                  <th className="py-3 px-3 border-r border-slate-200 text-center">Account Type</th>
                  <th className="py-3 px-4 border-r border-slate-200">Transaction Remarks</th>
                  <th className="py-3 px-3 border-r border-slate-200 font-mono">Mobile Number</th>
                  <th className="py-3 px-4">Email ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {filteredRows.map((r, idx) => {
                  const txType = r['Transaction Type (NEFT/RTGS)'];
                  const isHighValue = Number(r['Transaction Amount']) >= 200000;

                  return (
                    <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-mono border-r border-slate-100">
                        {r['Serial Number']}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900 border-r border-slate-100 tracking-wide">
                        {r['Beneficiary Account Number']}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900 border-r border-slate-100">
                        {r['Beneficiary Name']}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-700 border-r border-slate-100">
                        {r['IFSC Code']}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-extrabold text-slate-900 border-r border-slate-100">
                        ₹{typeof r['Transaction Amount'] === 'number' ? r['Transaction Amount'].toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : r['Transaction Amount']}
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-slate-100">
                        <button
                          type="button"
                          onClick={() => toggleRowTxType(r['Serial Number'], (txType as 'NEFT' | 'RTGS') || 'NEFT')}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-extrabold text-[10px] tracking-wide transition-all cursor-pointer border ${
                            txType === 'RTGS'
                              ? 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-300 shadow-2xs'
                              : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border-cyan-300 shadow-2xs'
                          }`}
                          title={`Click to switch between NEFT and RTGS (Current: ${txType})${isHighValue ? ' - High Value ≥ ₹2L' : ''}`}
                        >
                          <span>{txType}</span>
                          <ArrowRightLeft className="w-2.5 h-2.5 opacity-60" />
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-slate-100">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
                          {r['Account Type (Savings/Current)']}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 text-[11px] border-r border-slate-100">
                        {r['Transaction Remarks / Purpose']}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 border-r border-slate-100">
                        {r['Beneficiary Mobile Number']}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 text-[11px] truncate max-w-[180px]">
                        {r['Beneficiary Email ID']}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-600 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              All transactions support RBI NEFT clearing &amp; RTGS real-time gross settlement clearing. Click any <strong>NEFT/RTGS</strong> pill to toggle modes individually.
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-slate-500 font-sans">Showing {filteredRows.length} of {allRows.length} beneficiaries</span>
            <span className="font-bold text-slate-900">• Total: {formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
