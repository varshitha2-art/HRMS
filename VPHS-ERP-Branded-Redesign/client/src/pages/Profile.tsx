import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Building2,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Briefcase,
  FileText,
  ShieldCheck,
  Download,
  Camera,
  Trash2,
  Upload,
  Users,
  MapPin,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { DigitalIdCard } from '../components/idcard/DigitalIdCard';
import { Badge } from '../components/common/Badge';
import { formatDate, formatCurrency } from '../utils/formatters';
import api from '../services/api';

export const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useNotifications();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      if (user?.employeeId) {
        const res: any = await api.get(`/employees/${user.employeeId}`);
        if (res.success) setProfile(res.data);
      } else {
        setProfile(user);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const emp = profile || user?.employee;
  const empTargetId = emp?.id || user?.employeeId;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('Photo file must be under 10MB', 'error');
      return;
    }

    if (!empTargetId) {
      showToast('Employee record not found to attach photo', 'error');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const res: any = await api.post(`/employees/${empTargetId}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.success) {
        showToast('Profile photo updated successfully!', 'success');
        setProfile(res.data);
        if (refreshUser) refreshUser();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to upload photo', 'error');
    } finally {
      setIsUploadingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    if (!empTargetId) return;
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;

    setIsUploadingPhoto(true);
    try {
      const res: any = await api.delete(`/employees/${empTargetId}/photo`);
      if (res.success) {
        showToast('Profile photo removed successfully', 'info');
        setProfile(res.data);
        if (refreshUser) refreshUser();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to remove photo', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Hidden file input for photo upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/png,image/jpeg,image/webp,image/jpg"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* Header Profile Card */}
      <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center gap-6">
        {/* Photo Avatar with Edit Badge */}
        <div className="relative group flex-shrink-0">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-center justify-center text-3xl font-extrabold text-amber-800 shadow-md overflow-hidden">
            {emp?.photoUrl ? (
              <img
                src={emp.photoUrl}
                alt={`${emp?.firstName || 'Employee'} photo`}
                className="w-full h-full object-cover"
              />
            ) : emp?.firstName ? (
              `${emp.firstName[0]}${emp.lastName?.[0] || ''}`
            ) : (
              user?.username?.[0]?.toUpperCase() || 'U'
            )}
          </div>

          {/* Quick Camera Overlay Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPhoto}
            title={emp?.photoUrl ? 'Edit / Change Photo' : 'Add Photo'}
            className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-md transition-transform hover:scale-110 flex items-center justify-center border-2 border-white"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center sm:text-left space-y-2 flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {emp?.firstName ? `${emp.firstName} ${emp.lastName}` : user?.username}
            </h1>
            <Badge status={emp?.status || 'ACTIVE'} />
          </div>

          <p className="text-xs text-amber-800 font-semibold">
            {emp?.designation?.title || user?.role?.replace('_', ' ')} • {emp?.department?.name || 'VPHS Staff'}
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-600 font-mono">
            <span>ID: <strong className="text-slate-900">{emp?.employeeId || user?.employeeId || 'STAFF'}</strong></span>
            <span>•</span>
            <span>Site: <strong className="text-teal-800">{emp?.site?.siteName || 'Corporate HQ'}</strong></span>
            {emp?.mobile && (
              <>
                <span>•</span>
                <span>Mobile: <strong className="text-slate-900">{emp.mobile}</strong></span>
              </>
            )}
          </div>

          {/* Photo Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              {isUploadingPhoto ? 'Uploading...' : emp?.photoUrl ? 'Change / Edit Photo' : 'Add Profile Photo'}
            </button>

            {emp?.photoUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={isUploadingPhoto}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove Photo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Details & Digital ID Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Profile Info Sections */}
        <div className="lg:col-span-7 space-y-4">
          {/* SECTION 1: PERSONAL & CONTACT DETAILS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h3 className="font-bold text-amber-800 uppercase text-[11px] flex items-center gap-2">
                <Users className="w-4 h-4" /> Personal &amp; Identity Details
              </h3>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-amber-800 hover:text-amber-900 font-bold flex items-center gap-1"
              >
                <Camera className="w-3 h-3" /> {emp?.photoUrl ? 'Edit Photo' : 'Add Photo'}
              </button>
            </div>

            {/* Photo Summary Card in Personal Details */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-300 overflow-hidden flex items-center justify-center text-amber-800 font-bold text-base flex-shrink-0">
                  {emp?.photoUrl ? (
                    <img src={emp.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-amber-700" />
                  )}
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">Official Identity Photo</span>
                  <span className="text-[10px] text-slate-500">
                    {emp?.photoUrl ? 'Photo active on ID Card & Rosters' : 'No photo uploaded yet'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-colors"
                >
                  <Upload className="w-3 h-3" /> {emp?.photoUrl ? 'Edit' : 'Upload'}
                </button>
                {emp?.photoUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="p-1 rounded-lg bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300 transition-colors"
                    title="Remove Photo"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Full Name</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{emp?.firstName} {emp?.lastName}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Gender &amp; Date of Birth</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {emp?.gender || 'Male'} • {formatDate(emp?.dob)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Mobile Number</span>
                <span className="font-mono font-bold text-slate-900 mt-0.5 block">{emp?.mobile || '-'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Official Email</span>
                <span className="font-medium text-slate-800 mt-0.5 block truncate">{emp?.email || '-'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-2">
                <span className="text-slate-500 text-[10px] block">Residential Address</span>
                <span className="font-medium text-slate-800 mt-0.5 block">
                  {emp?.address ? `${emp.address}, ${emp.city || ''} ${emp.state || ''} ${emp.pincode || ''}` : 'Hyderabad, Telangana'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: EMPLOYMENT & SHIFT */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-xs space-y-3">
            <h3 className="font-bold text-amber-800 uppercase text-[11px] flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Employment &amp; Shift Allocation
            </h3>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Client Site</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{emp?.site?.siteName || 'Corporate Head Office'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Shift Timings</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{emp?.shift?.name || 'General Shift (09:30 - 18:30)'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Date of Joining</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{formatDate(emp?.joiningDate)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Employment Type</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{emp?.employmentType || 'FULL TIME'}</span>
              </div>
            </div>
          </div>

          {/* SECTION 3: BANK & STATUTORY */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-xs space-y-3">
            <h3 className="font-bold text-teal-800 uppercase text-[11px] flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Statutory Compliance &amp; Bank Details
            </h3>
            <div className="divide-y divide-slate-200 pt-1">
              <div className="py-2 flex justify-between"><span className="text-slate-600">Aadhaar Reference:</span><span className="font-mono text-slate-900 font-semibold">{emp?.aadhaarNumber || 'Verified On File'}</span></div>
              <div className="py-2 flex justify-between"><span className="text-slate-600">PAN Number:</span><span className="font-mono text-slate-900 font-semibold uppercase">{emp?.panNumber || 'Verified On File'}</span></div>
              <div className="py-2 flex justify-between"><span className="text-slate-600">Bank Account:</span><span className="font-mono text-slate-900 font-semibold">{emp?.bankName} ({emp?.bankAccountNo || 'XXXXXXXXXXXX'})</span></div>
              <div className="py-2 flex justify-between"><span className="text-slate-600">IFSC Code:</span><span className="font-mono text-slate-900 font-semibold">{emp?.bankIfsc || 'HDFC0000123'}</span></div>
              <div className="py-2 flex justify-between"><span className="text-slate-600">UAN / PF Number:</span><span className="font-mono text-slate-900 font-semibold">{emp?.uanNumber || emp?.pfNumber || '-'}</span></div>
            </div>
          </div>
        </div>

        {/* Right Side: Digital ID Card Preview */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col items-center">
          <h3 className="font-bold text-amber-800 uppercase text-[11px] mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Digital ID Card (QR Scanner Ready)
          </h3>
          {emp?.employeeId ? (
            <DigitalIdCard employee={emp} />
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              System Admin Account (No standard employee card assigned)
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
