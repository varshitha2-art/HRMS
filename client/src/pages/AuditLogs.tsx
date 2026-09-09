import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Clock,
  User,
  Shield,
  FileText,
  Eye,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { AuditLog } from '../types';
import { Modal } from '../components/common/Modal';
import { SkeletonTable } from '../components/common/SkeletonLoader';
import api from '../services/api';
import { formatDateTime } from '../utils/formatters';
import { useNotifications } from '../contexts/NotificationContext';

export const AuditLogs: React.FC = () => {
  const { showToast } = useNotifications();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [search, filterModule, filterAction]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        ...(search ? { search } : {}),
        ...(filterModule ? { module: filterModule } : {}),
        ...(filterAction ? { action: filterAction } : {}),
      });

      const res: any = await api.get(`/audit-logs?${query.toString()}`);
      if (res.success) {
        setLogs(res.data || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load audit trail', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getModuleBadge = (module: string) => {
    switch (module) {
      case 'AUTH':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'EMPLOYEE':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'ATTENDANCE':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'PAYROLL':
        return 'bg-cyan-100 text-cyan-900 border-cyan-300';
      case 'LEAVE':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'DOCUMENT':
        return 'bg-pink-100 text-pink-900 border-pink-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-wide flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-600" /> Compliance Audit Trail & Activity Logs
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Immutable tracking of all workforce updates, payroll authorizations, logins & document events.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 100% Immutable Audit Trail
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search audit details, username, ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
          />
        </div>

        <div>
          <select
            value={filterModule}
            onChange={e => setFilterModule(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
          >
            <option value="">All System Modules</option>
            <option value="AUTH">AUTH</option>
            <option value="EMPLOYEE">EMPLOYEE</option>
            <option value="SITE">SITE</option>
            <option value="ATTENDANCE">ATTENDANCE</option>
            <option value="LEAVE">LEAVE</option>
            <option value="PAYROLL">PAYROLL</option>
            <option value="DOCUMENT">DOCUMENT</option>
            <option value="SETTINGS">SETTINGS</option>
          </select>
        </div>

        <div>
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
          >
            <option value="">All Action Types</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="APPROVE">APPROVE</option>
            <option value="REJECT">REJECT</option>
            <option value="GENERATE">GENERATE</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : logs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
          <ShieldAlert className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-800">No audit logs match criteria</h3>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5">User / Actor</th>
                  <th className="px-4 py-3.5">Module</th>
                  <th className="px-4 py-3.5">Action</th>
                  <th className="px-4 py-3.5">Details</th>
                  <th className="px-4 py-3.5">IP Address</th>
                  <th className="px-5 py-3.5 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-slate-500 whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">
                        {log.user?.username || 'System Engine'}
                      </div>
                      <div className="text-[10px] font-mono font-bold text-amber-700">
                        {log.user?.role || 'SYSTEM'}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getModuleBadge(log.module)}`}>
                        {log.module}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-bold text-slate-800">
                      {log.action}
                    </td>

                    <td className="px-4 py-3.5 max-w-xs truncate text-slate-600 font-mono text-[11px]">
                      {log.details || '-'}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-slate-500">
                      {log.ipAddress || '127.0.0.1'}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-800 border border-slate-200 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LOG INSPECTION MODAL */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Log Entry Inspection"
        subtitle={`ID: ${selectedLog?.id}`}
        maxWidth="md"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between"><span className="text-slate-500">Timestamp:</span><span className="font-mono text-slate-900 font-bold">{formatDateTime(selectedLog.createdAt)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">User / Actor:</span><span className="font-bold text-amber-800">{selectedLog.user?.username} ({selectedLog.user?.role})</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Module & Action:</span><span className="font-bold text-slate-900">{selectedLog.module} - {selectedLog.action}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">IP Address:</span><span className="font-mono text-slate-700">{selectedLog.ipAddress}</span></div>
              {selectedLog.recordId && (
                <div className="flex justify-between"><span className="text-slate-500">Record Reference:</span><span className="font-mono text-slate-700">{selectedLog.recordId}</span></div>
              )}
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Payload JSON:</label>
              <pre className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-800 overflow-x-auto">
                {selectedLog.details}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
