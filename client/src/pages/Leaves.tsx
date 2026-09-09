import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Check,
  X,
  Calendar,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { LeaveRequest, LeaveType, LeaveBalance, Employee } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { SkeletonCards, SkeletonTable } from '../components/common/SkeletonLoader';
import api from '../services/api';
import { formatDate } from '../utils/formatters';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

export const Leaves: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [actionNotes, setActionNotes] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    employeeId: '',
    leaveTypeId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    totalDays: 1,
    reason: '',
  });

  useEffect(() => {
    fetchLeaves();
  }, [statusFilter]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const [leavesRes, empRes]: any = await Promise.all([
        api.get(`/leaves${statusFilter ? `?status=${statusFilter}` : ''}`),
        api.get('/employees?limit=100'),
      ]);

      if (leavesRes.success) {
        setRequests(leavesRes.data.requests || []);
        setLeaveTypes(leavesRes.data.leaveTypes || []);
      }
      if (empRes.success) setEmployees(empRes.data || []);

      // If user is employee or has employeeId, fetch balances
      if (user?.employeeId) {
        const balRes: any = await api.get(`/leaves/balance/${user.employeeId}`);
        if (balRes.success) setBalances(balRes.data || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load leaves', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const empId = user?.role === 'EMPLOYEE' ? user.employee?.id || user.employeeId : formData.employeeId;
      const res: any = await api.post('/leaves', {
        ...formData,
        employeeId: empId,
        totalDays: parseFloat(String(formData.totalDays)) || 1,
      });

      if (res.success) {
        showToast('Leave request submitted successfully', 'success');
        setIsApplyOpen(false);
        fetchLeaves();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to submit leave request', 'error');
    }
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    try {
      const endpoint = actionType === 'APPROVE' ? 'approve' : 'reject';
      const res: any = await api.put(`/leaves/${selectedRequest.id}/${endpoint}`, {
        notes: actionNotes,
      });

      if (res.success) {
        showToast(`Leave request ${actionType.toLowerCase()}d successfully`, 'success');
        setIsActionOpen(false);
        fetchLeaves();
      }
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-wide flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-amber-500" /> Leave Management & Approvals
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Apply leave, track quota balances, review approval queues & auto-sync attendance records.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              employeeId: user?.employee?.id || employees[0]?.id || '',
              leaveTypeId: leaveTypes[0]?.id || '',
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date().toISOString().split('T')[0],
              totalDays: 1,
              reason: '',
            });
            setIsApplyOpen(true);
          }}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-amber-500/10 transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Apply Leave Request
        </button>
      </div>

      {/* Leave Balances Grid (For Employees or Overview) */}
      {balances.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
            Your 2026 Annual Leave Balance Quotas
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {balances.map(bal => (
              <div
                key={bal.id}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-center"
              >
                <span className="text-[10px] font-bold uppercase text-slate-500 block">{bal.leaveType.name}</span>
                <div className="mt-2 flex items-baseline justify-center gap-1">
                  <span className="text-2xl font-extrabold text-amber-600">{bal.remainingDays}</span>
                  <span className="text-xs text-slate-500">/ {bal.totalAllocated}d left</span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">Used: {bal.usedDays} days</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">All Requests</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
        <span className="text-slate-600 font-medium">{requests.length} Total Requests</span>
      </div>

      {/* Leave Requests Table */}
      {loading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : requests.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
          <CalendarDays className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-900">No leave requests found</h3>
          <p className="text-xs mt-1">Submit a leave request using the button above.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-4 py-3.5">Leave Type</th>
                  <th className="px-4 py-3.5">Date Range</th>
                  <th className="px-4 py-3.5">Days</th>
                  <th className="px-4 py-3.5">Reason</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">
                        {req.employee?.firstName} {req.employee?.lastName}
                      </div>
                      <div className="text-[11px] font-mono text-amber-700 font-semibold">
                        {req.employee?.employeeId} • {req.employee?.site?.siteName || 'Corporate'}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {req.leaveType?.name || 'Leave'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-slate-800">
                      {formatDate(req.startDate)} → {formatDate(req.endDate)}
                    </td>

                    <td className="px-4 py-3.5 font-bold text-amber-700">
                      {req.totalDays} Day(s)
                    </td>

                    <td className="px-4 py-3.5 max-w-[200px] truncate text-slate-600">
                      {req.reason}
                    </td>

                    <td className="px-4 py-3.5">
                      <Badge status={req.status} />
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      {req.status === 'PENDING' && user?.role !== 'EMPLOYEE' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setActionType('APPROVE');
                              setActionNotes('Approved by HR / Supervisor');
                              setIsActionOpen(true);
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setActionType('REJECT');
                              setActionNotes('Rejected due to operational constraints');
                              setIsActionOpen(true);
                            }}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px] font-mono">
                          {req.actionedAt ? `Actioned ${formatDate(req.actionedAt)}` : 'Completed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* APPLY LEAVE MODAL */}
      <Modal
        isOpen={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        title="Submit Leave Application"
        subtitle="Select leave category and dates"
        maxWidth="md"
      >
        <form onSubmit={handleApplyLeave} className="space-y-4 text-xs">
          {user?.role !== 'EMPLOYEE' && (
            <div>
              <label className="block font-semibold text-slate-800 mb-1">Employee *</label>
              <select
                required
                value={formData.employeeId}
                onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
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
            <label className="block font-semibold text-slate-800 mb-1">Leave Type *</label>
            <select
              required
              value={formData.leaveTypeId}
              onChange={e => setFormData({ ...formData, leaveTypeId: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {leaveTypes.map(lt => (
                <option key={lt.id} value={lt.id}>
                  {lt.name} ({lt.code}) - {lt.isPaid ? 'Paid' : 'Loss of Pay'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-800 mb-1">End Date *</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">Total Days *</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              required
              value={formData.totalDays}
              onChange={e => setFormData({ ...formData, totalDays: parseFloat(e.target.value) || 1 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">Reason for Leave *</label>
            <textarea
              required
              rows={3}
              placeholder="Provide context for approval..."
              value={formData.reason}
              onChange={e => setFormData({ ...formData, reason: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsApplyOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-md shadow-amber-500/10 transition-all"
            >
              Submit Application
            </button>
          </div>
        </form>
      </Modal>

      {/* APPROVE / REJECT CONFIRMATION MODAL */}
      <Modal
        isOpen={isActionOpen}
        onClose={() => setIsActionOpen(false)}
        title={actionType === 'APPROVE' ? 'Approve Leave Request' : 'Reject Leave Request'}
        subtitle={`Employee: ${selectedRequest?.employee?.firstName} ${selectedRequest?.employee?.lastName} (${selectedRequest?.totalDays} Days)`}
        maxWidth="md"
      >
        <form onSubmit={handleAction} className="space-y-4 text-xs">
          <p className="text-slate-700">
            {actionType === 'APPROVE'
              ? 'Approving this leave will automatically update the employee attendance records to LEAVE status for the selected date range.'
              : 'Please provide remarks explaining why the leave request is rejected.'}
          </p>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">Approval Notes / Remarks</label>
            <textarea
              rows={3}
              value={actionNotes}
              onChange={e => setActionNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsActionOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2 font-bold rounded-xl shadow-md transition-all ${
                actionType === 'APPROVE'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              Confirm {actionType === 'APPROVE' ? 'Approval' : 'Rejection'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
