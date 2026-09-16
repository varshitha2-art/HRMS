import React, { useState, useEffect } from 'react';
import {
  FolderLock,
  Upload,
  Search,
  FileText,
  Download,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building2,
  Filter,
} from 'lucide-react';
import { Document, Employee } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { SkeletonTable } from '../components/common/SkeletonLoader';
import api from '../services/api';
import { formatDate } from '../utils/formatters';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

export const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEmp, setFilterEmp] = useState('');

  // Upload Modal
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState({
    employeeId: '',
    documentType: 'AADHAAR',
    title: '',
    expiryDate: '',
  });
  const [isUploading, setIsUploading] = useState(false);

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  const docTypeOptions = [
    { value: 'AADHAAR', label: 'Aadhaar Card' },
    { value: 'PAN', label: 'PAN Card' },
    { value: 'BANK_PROOF', label: 'Bank Passbook / Cheque' },
    { value: 'ID_CARD', label: 'Employee ID Card' },
    { value: 'JOINING_LETTER', label: 'Signed Joining Letter' },
    { value: 'APPOINTMENT_LETTER', label: 'Appointment Order' },
    { value: 'EDUCATION', label: 'Educational Certificate' },
    { value: 'EXPERIENCE', label: 'Experience Certificate' },
    { value: 'PF_DOC', label: 'PF Nomination Form' },
    { value: 'ESI_DOC', label: 'ESI Declaration' },
    { value: 'OTHER', label: 'Medical / Other Document' },
  ];

  useEffect(() => {
    fetchDocuments();
  }, [filterType, filterStatus, filterEmp]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        ...(filterType ? { documentType: filterType } : {}),
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(filterEmp ? { employeeId: filterEmp } : {}),
      });

      const [docsRes, empRes]: any = await Promise.all([
        api.get(`/documents?${query.toString()}`),
        api.get('/employees?limit=100'),
      ]);

      if (docsRes.success) setDocuments(docsRes.data || []);
      if (empRes.success) setEmployees(empRes.data || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      showToast('Please select a file to upload', 'warning');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('employeeId', user?.role === 'EMPLOYEE' ? user.employee?.id || user.employeeId! : uploadData.employeeId);
      formData.append('documentType', uploadData.documentType);
      formData.append('title', uploadData.title || uploadFile.name);
      if (uploadData.expiryDate) formData.append('expiryDate', uploadData.expiryDate);

      const res: any = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.success) {
        showToast('Document uploaded and verified successfully', 'success');
        setIsUploadOpen(false);
        setUploadFile(null);
        fetchDocuments();
      }
    } catch (err: any) {
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await api.delete(`/documents/${id}`);
      showToast('Document deleted', 'success');
      fetchDocuments();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete document', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-wide flex items-center gap-2">
            <FolderLock className="w-6 h-6 text-amber-500" /> Compliance Document Repository
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Secure storage for Aadhaar, PAN, bank passbooks, joining letters & automated expiry alert tracking.
          </p>
        </div>

        <button
          onClick={() => {
            setUploadData({
              employeeId: user?.employee?.id || employees[0]?.id || '',
              documentType: 'AADHAAR',
              title: '',
              expiryDate: '',
            });
            setIsUploadOpen(true);
          }}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-amber-500/10 transition-all flex items-center gap-1.5"
        >
          <Upload className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap gap-2.5">
          {user?.role !== 'EMPLOYEE' && (
            <select
              value={filterEmp}
              onChange={e => setFilterEmp(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.employeeId} - {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          )}

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">All Document Types</option>
            {docTypeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">All Statuses</option>
            <option value="VALID">VALID</option>
            <option value="EXPIRING">EXPIRING (30 Days)</option>
            <option value="EXPIRED">EXPIRED</option>
          </select>
        </div>

        <span className="text-slate-600 font-medium">{documents.length} Documents in Vault</span>
      </div>

      {/* Documents Table */}
      {loading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : documents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
          <FolderLock className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-900">No documents match the criteria</h3>
          <p className="text-xs mt-1">Upload verified files using the "Upload Document" button.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Document Title</th>
                  <th className="px-4 py-3.5">Employee</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Uploaded Date</th>
                  <th className="px-4 py-3.5">Expiry Date</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <div>
                          <span className="font-bold text-slate-900 block">{doc.title}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{doc.fileName}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">
                        {doc.employee?.firstName} {doc.employee?.lastName}
                      </div>
                      <div className="text-[10px] font-mono text-amber-700 font-semibold">
                        {doc.employee?.employeeId} • {doc.employee?.department?.name}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {doc.documentType.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-slate-600">
                      {formatDate(doc.uploadedAt)}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-slate-700">
                      {doc.expiryDate ? formatDate(doc.expiryDate) : 'Lifetime / No Expiry'}
                    </td>

                    <td className="px-4 py-3.5">
                      <Badge status={doc.status} />
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          title="Preview Details"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 border border-slate-200 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          download
                          title="Download Document"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-cyan-100 text-slate-700 hover:text-cyan-800 border border-slate-200 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </a>

                        {user?.role !== 'EMPLOYEE' && (
                          <button
                            onClick={() => handleDelete(doc.id, doc.title)}
                            title="Delete Document"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 border border-slate-200 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* UPLOAD DOCUMENT MODAL */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload Compliance Document"
        subtitle="Supported formats: PDF, JPEG, PNG, Excel (Max 10MB)"
        maxWidth="md"
      >
        <form onSubmit={handleFileUpload} className="space-y-4 text-xs">
          {user?.role !== 'EMPLOYEE' && (
            <div>
              <label className="block font-semibold text-slate-800 mb-1">Employee *</label>
              <select
                required
                value={uploadData.employeeId}
                onChange={e => setUploadData({ ...uploadData, employeeId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employeeId} - {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-800 mb-1">Document Category *</label>
            <select
              required
              value={uploadData.documentType}
              onChange={e => setUploadData({ ...uploadData, documentType: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {docTypeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">Document Title</label>
            <input
              type="text"
              placeholder="e.g. Employee Aadhaar Card Front & Back"
              value={uploadData.title}
              onChange={e => setUploadData({ ...uploadData, title: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">Document Expiry Date (if applicable)</label>
            <input
              type="date"
              value={uploadData.expiryDate}
              onChange={e => setUploadData({ ...uploadData, expiryDate: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">Select File *</label>
            <input
              type="file"
              required
              onChange={e => setUploadFile(e.target.files?.[0] || null)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-700 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-600 cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsUploadOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-md shadow-amber-500/10 transition-all"
            >
              {isUploading ? 'Uploading & Verifying...' : 'Upload to Vault'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DOCUMENT PREVIEW MODAL */}
      <Modal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.title || 'Document Preview'}
        subtitle={`Owner: ${previewDoc?.employee?.firstName} ${previewDoc?.employee?.lastName}`}
        maxWidth="lg"
      >
        {previewDoc && (
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span className="text-slate-600">Category:</span><span className="font-bold text-slate-900">{previewDoc.documentType}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">File Name:</span><span className="font-mono text-slate-900">{previewDoc.fileName}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Uploaded At:</span><span className="text-slate-900">{formatDate(previewDoc.uploadedAt)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Expiry Date:</span><span className="text-slate-900">{previewDoc.expiryDate ? formatDate(previewDoc.expiryDate) : 'No Expiry'}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Status:</span><Badge status={previewDoc.status} /></div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <a
                href={previewDoc.fileUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4" /> Download / Open File
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
