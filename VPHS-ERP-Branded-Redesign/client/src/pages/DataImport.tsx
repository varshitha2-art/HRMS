import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Users,
  ArrowRight,
  Building2,
  Info,
} from 'lucide-react';
import api from '../services/api';
import { exportToExcel, downloadSampleCmpTemplate } from '../utils/formatters';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';

export const DataImport: React.FC = () => {
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const handleDownloadSample = () => {
    const sampleData = [
      {
        'Employee ID': 'VPHS-101',
        'First Name': 'Ramesh',
        'Last Name': 'Choudhary',
        'Gender': 'Male',
        'Mobile': '9848011223',
        'Email': 'ramesh.c@vphs.in',
        'Department': 'Housekeeping Services',
        'Designation': 'Housekeeping Associate',
        'Site': 'Microsoft Campus - Building 3',
        'CTC': '18500',
        'Aadhaar': '5432 1098 7654',
        'PAN': 'ABCDE1234F',
        'Account No': '50200012345678',
        'IFSC': 'HDFC0000123',
      },
      {
        'Employee ID': 'VPHS-102',
        'First Name': 'Kavitha',
        'Last Name': 'Rani',
        'Gender': 'Female',
        'Mobile': '9701144556',
        'Email': 'kavitha.r@vphs.in',
        'Department': 'Security Services',
        'Designation': 'Security Guard',
        'Site': 'Third Wave Coffee - Multi Outlets',
        'CTC': '19000',
        'Aadhaar': '8765 4321 0987',
        'PAN': 'FGHIJ5678K',
        'Account No': '91201009876543',
        'IFSC': 'UTIB0000543',
      },
    ];

    exportToExcel(sampleData, 'VPHS_Employee_Import_Template', 'Employees');
    showToast('Sample Excel template downloaded', 'success');
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('Please choose an Excel or CSV file', 'warning');
      return;
    }

    setIsUploading(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res: any = await api.post('/import/employees', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.success && res.data) {
        setImportResult(res.data);
        showToast(`Imported ${res.data.successCount} employees successfully`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Import failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-wide flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-amber-600" /> Bulk Employee Data Import
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Import new staff members via Excel/CSV spreadsheets with comprehensive row-level validation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={downloadSampleCmpTemplate}
            className="px-3.5 py-2 bg-white hover:bg-cyan-50 text-cyan-800 text-xs font-bold rounded-xl border border-cyan-300 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Download Corporate Bank Bulk Salary Upload Template (.csv)"
          >
            <Building2 className="w-4 h-4 text-cyan-600" /> Bank CMP Template (.CSV)
          </button>

          <button
            onClick={handleDownloadSample}
            className="px-4 py-2 bg-white hover:bg-amber-50 text-amber-800 text-xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-600" /> Employee Master Template
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleUpload} className="space-y-6">
          <div className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-8 text-center transition-colors bg-slate-50/70">
            <Upload className="w-12 h-12 mx-auto text-amber-600 mb-3" />
            <h3 className="text-sm font-bold text-slate-900">Upload Spreadsheet (.xlsx, .xls, .csv)</h3>
            <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
              Select or drag-and-drop the prepared employee data file. Each row will be validated against database constraints.
            </p>

            <div className="mt-4 flex justify-center">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-600 cursor-pointer"
              />
            </div>

            {selectedFile && (
              <div className="mt-4 text-xs text-amber-800 font-mono font-bold flex items-center justify-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" /> Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-2">
            <div className="text-[11px] text-slate-500 space-y-0.5">
              <p>• Duplicate Employee IDs will be flagged and reported.</p>
              <p>• Mobile numbers must contain at least 10 digits.</p>
            </div>

            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-2"
            >
              {isUploading ? 'Validating & Importing...' : 'Execute Data Import'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Import Results Summary & Error Reporting Table */}
      {importResult && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
              <span className="text-slate-500 font-bold uppercase text-[10px]">Total Rows Parsed</span>
              <span className="text-2xl font-extrabold text-slate-900 block mt-1">{importResult.totalRows}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl text-emerald-800 shadow-sm">
              <span className="font-bold uppercase text-[10px] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Successful Imports
              </span>
              <span className="text-2xl font-extrabold text-emerald-700 block mt-1">{importResult.successCount}</span>
            </div>
            <div className="bg-rose-50 border border-rose-300 p-4 rounded-xl text-rose-800 shadow-sm">
              <span className="font-bold uppercase text-[10px] flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Failed / Rejected Rows
              </span>
              <span className="text-2xl font-extrabold text-rose-700 block mt-1">{importResult.failureCount}</span>
            </div>
          </div>

          {/* Failed Records Details */}
          {importResult.failedRecords?.length > 0 && (
            <div className="bg-white border border-rose-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" /> Validation Errors & Rejections ({importResult.failedRecords.length})
              </h3>
              <div className="divide-y divide-slate-200 text-xs">
                {importResult.failedRecords.map((err: any, idx: number) => (
                  <div key={idx} className="py-2.5 flex justify-between items-center gap-4">
                    <div>
                      <span className="font-bold text-slate-800 font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] mr-2 border border-slate-200">
                        Row #{err.rowNumber}
                      </span>
                      <span className="text-slate-700 font-mono">
                        {err.data?.['Employee ID'] || err.data?.employeeId || 'Unknown ID'}
                      </span>
                    </div>
                    <span className="text-rose-600 font-medium">{err.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success Button */}
          {importResult.successCount > 0 && (
            <div className="text-right">
              <button
                onClick={() => navigate('/employees')}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow transition-colors inline-flex items-center gap-1.5"
              >
                <Users className="w-4 h-4" /> View in Employee Directory
              </button>
            </div>
          )}
        </div>
      )}
      {/* Banking & Payroll Export Information Guide */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Corporate Banking Bulk Salary Upload (CMP / NEFT / RTGS)
            </h3>
            <p className="text-xs text-slate-500">
              When processing bulk salaries for multiple employees, corporate portals require a flattened transaction layout rather than a personal breakdown.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-600" /> Essential 9-Column Banking Structure
            </h4>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
              <span className="font-mono text-slate-800">1. Serial Number</span>
              <span className="font-mono text-slate-800">2. Beneficiary Account Number</span>
              <span className="font-mono text-slate-800">3. Beneficiary Name</span>
              <span className="font-mono text-slate-800">4. IFSC Code</span>
              <span className="font-mono text-slate-800">5. Transaction Amount (Net)</span>
              <span className="font-mono text-slate-800">6. Account Type (Savings)</span>
              <span className="font-mono text-slate-800">7. Transaction Remarks</span>
              <span className="font-mono text-slate-800">8. Beneficiary Mobile</span>
              <span className="font-mono text-slate-800 col-span-2">9. Beneficiary Email ID</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Supported Bank Portals
              </h4>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Pre-formatted for direct upload to <strong>State Bank of India (SBI CMP)</strong>, <strong>HDFC Bank ENET</strong>, <strong>ICICI Bank Corporate Net Banking</strong>, and <strong>Axis CMS</strong> portals.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={downloadSampleCmpTemplate}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Download CMP Template (.csv)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
