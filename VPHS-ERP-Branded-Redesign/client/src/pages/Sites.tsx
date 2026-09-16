import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Users,
  Phone,
  Mail,
  Calendar,
  Edit,
  Trash2,
  UserPlus,
  ArrowRight,
  Shield,
  Building,
  Sliders,
  LocateFixed,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Lock,
  Compass,
  Clock,
  Calculator,
  FileSpreadsheet,
} from 'lucide-react';
import { Site, Employee } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { SkeletonCards } from '../components/common/SkeletonLoader';
import { FacilityRateCardModule } from '../components/payroll/FacilityRateCardModule';
import api from '../services/api';
import { formatDate, formatCurrency } from '../utils/formatters';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const DEFAULT_SITE_COORDINATES: Record<string, { lat: number; lng: number; radius: number }> = {
  VPHS0001: { lat: 17.4483, lng: 78.3915, radius: 100 }, // VPHS Head Office Madhapur
  VPHS0004: { lat: 17.4435, lng: 78.3772, radius: 250 }, // Microsoft India Gachibowli
  VPHS0003: { lat: 17.4219, lng: 78.3756, radius: 100 }, // Third Wave Coffee Khajaguda
  VPHS0002: { lat: 17.4156, lng: 78.4350, radius: 150 }, // Forward Life Banjara Hills
  HARLEYS: { lat: 17.4325, lng: 78.4071, radius: 100 }, // Harleys Jubilee Hills
  TWC_KONDAPUR: { lat: 17.4699, lng: 78.3578, radius: 100 }, // TWC Kondapur
  TWC_SAINIKPURI: { lat: 17.4875, lng: 78.5482, radius: 100 }, // TWC Sainikpuri
  TWC_BANJARA: { lat: 17.4124, lng: 78.4412, radius: 100 }, // TWC Banjara Hills
};

export const Sites: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [sites, setSites] = useState<Site[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [isGeotagModalOpen, setIsGeotagModalOpen] = useState(false);
  const [isRateCardModalOpen, setIsRateCardModalOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  // Form State
  const [formData, setFormData] = useState<any>({
    siteCode: '',
    siteName: '',
    clientName: '',
    location: '',
    address: '',
    city: 'Hyderabad',
    state: 'Telangana',
    billingRate: 250000,
    status: 'ACTIVE',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    contractStartDate: new Date().toISOString().split('T')[0],
    contractEndDate: '2027-12-31',
  });

  const [assignData, setAssignData] = useState({
    employeeId: '',
    roleAtSite: 'Site Associate',
  });

  // Site-specific Geotag Form State
  const [siteGeotagForm, setSiteGeotagForm] = useState({
    siteId: '',
    siteCode: '',
    siteName: '',
    latitude: 17.4435,
    longitude: 78.3772,
    locationName: '',
    geofenceRadius: 100,
    isStrictGeofence: true,
  });
  const [isSavingGeotag, setIsSavingGeotag] = useState(false);

  useEffect(() => {
    fetchSites();
  }, [search]);

  const fetchSites = async () => {
    try {
      setLoading(true);
      const [sitesRes, empRes]: any = await Promise.all([
        api.get(`/sites${search ? `?search=${encodeURIComponent(search)}` : ''}`),
        api.get('/employees?limit=200'),
      ]);

      if (sitesRes.success) setSites(sitesRes.data || []);
      if (empRes.success) setAllEmployees(empRes.data || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load sites', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setSelectedSite(null);
    setFormData({
      siteCode: `SITE-HYD-${String(sites.length + 1).padStart(2, '0')}`,
      siteName: '',
      clientName: '',
      location: '',
      address: '',
      city: 'Hyderabad',
      state: 'Telangana',
      billingRate: 200000,
      status: 'ACTIVE',
      contactPerson: '',
      contactPhone: '',
      contactEmail: '',
      contractStartDate: new Date().toISOString().split('T')[0],
      contractEndDate: '2027-12-31',
    });
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (site: Site) => {
    setSelectedSite(site);
    setFormData({
      siteCode: site.siteCode,
      siteName: site.siteName,
      clientName: site.clientName,
      location: site.location,
      address: site.address || '',
      city: site.city || '',
      state: site.state || '',
      billingRate: site.billingRate || 0,
      status: site.status,
      contactPerson: site.contactPerson || '',
      contactPhone: site.contactPhone || '',
      contactEmail: site.contactEmail || '',
      contractStartDate: site.contractStartDate ? site.contractStartDate.split('T')[0] : '',
      contractEndDate: site.contractEndDate ? site.contractEndDate.split('T')[0] : '',
    });
    setIsAddEditOpen(true);
  };

  const handleOpenGeotagModal = (site: Site) => {
    const defaultCoords = DEFAULT_SITE_COORDINATES[site.siteCode] || { lat: 17.4435, lng: 78.3772, radius: 100 };
    setSelectedSite(site);
    setSiteGeotagForm({
      siteId: site.id,
      siteCode: site.siteCode,
      siteName: site.siteName,
      latitude: (site as any).latitude ?? defaultCoords.lat,
      longitude: (site as any).longitude ?? defaultCoords.lng,
      locationName: `${site.siteName} (${site.location || 'Hyderabad'})`,
      geofenceRadius: (site as any).geofenceRadius ?? defaultCoords.radius,
      isStrictGeofence: true,
    });
    setIsGeotagModalOpen(true);
  };

  const handleSaveSiteGeotag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== 'SUPER_ADMIN') {
      showToast('Permission denied: Only Super Admin (K. Rahul Kumar) can change Site Geotags', 'error');
      return;
    }

    setIsSavingGeotag(true);
    try {
      const res: any = await api.put('/settings/geotag', siteGeotagForm);
      if (res.success) {
        showToast(`✅ Geotag updated for ${siteGeotagForm.siteName}`, 'success');
        setIsGeotagModalOpen(false);
        fetchSites();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update site geotag', 'error');
    } finally {
      setIsSavingGeotag(false);
    }
  };

  const handleDetectDeviceGps = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setSiteGeotagForm(prev => ({
            ...prev,
            latitude: parseFloat(pos.coords.latitude.toFixed(4)),
            longitude: parseFloat(pos.coords.longitude.toFixed(4)),
            locationName: `${prev.siteName} (Device GPS Captured)`,
          }));
          showToast('Device GPS coordinates applied', 'info');
        },
        (err) => {
          showToast('Could not fetch device GPS. Check location permissions.', 'warning');
        }
      );
    } else {
      showToast('Geolocation not supported by your browser', 'warning');
    }
  };

  const handleSaveSite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedSite) {
        await api.put(`/sites/${selectedSite.id}`, formData);
        showToast('Site details updated successfully', 'success');
      } else {
        await api.post('/sites', formData);
        showToast('New facility site created successfully', 'success');
      }
      setIsAddEditOpen(false);
      fetchSites();
    } catch (err: any) {
      showToast(err.message || 'Failed to save site', 'error');
    }
  };

  const handleAssignEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSite || !assignData.employeeId) return;
    try {
      await api.post(`/sites/${selectedSite.id}/assign`, assignData);
      showToast('Employee assigned to site successfully', 'success');
      setIsAssignOpen(false);
      fetchSites();
    } catch (err: any) {
      showToast(err.message || 'Assignment failed', 'error');
    }
  };

  const handleViewRoster = async (site: Site) => {
    try {
      const res: any = await api.get(`/sites/${site.id}`);
      if (res.success && res.data) {
        setSelectedSite(res.data);
        setIsRosterOpen(true);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load site roster', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-wide flex items-center gap-2">
              <Building2 className="w-6 h-6 text-amber-500" /> Client Sites & Facility Locations
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              All Sites Geotag Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage multi-site deployment contracts, GPS Geofencing per facility, deployed staff rosters & live attendance.
          </p>
        </div>

        {user?.role !== 'EMPLOYEE' && user?.role !== 'SUPERVISOR' && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Facility Site
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search sites by code, site name, client, city (e.g. Microsoft, TWC, Forward Life, Harleys)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Site Cards Grid */}
      {loading ? (
        <SkeletonCards count={4} />
      ) : sites.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
          <Building2 className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-800">No facility sites found</h3>
          <p className="text-xs mt-1">Click "Add Facility Site" to create a new client deployment location.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
          {sites.map(site => {
            const coords = DEFAULT_SITE_COORDINATES[site.siteCode] || { lat: 17.4435, lng: 78.3772, radius: 100 };
            return (
              <div
                key={site.id}
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-amber-400 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono text-amber-800 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        {site.siteCode}
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 mt-2">{site.siteName}</h3>
                      <p className="text-xs text-slate-500 font-medium">Client: {site.clientName}</p>
                    </div>
                    <Badge status={site.status} />
                  </div>

                  {/* Geotag & Coordinates Card */}
                  <div className="mt-3.5 p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 font-medium">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <div>
                        <span className="font-bold block text-[11px]">Geotag Coordinates:</span>
                        <span className="font-mono text-[10px] text-emerald-800">
                          {coords.lat}° N, {coords.lng}° E ({coords.radius}m Radius)
                        </span>
                      </div>
                    </div>

                    {user?.role === 'SUPER_ADMIN' ? (
                      <button
                        onClick={() => handleOpenGeotagModal(site)}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-900 text-[10px] font-bold rounded-lg border border-emerald-300 shadow-xs flex items-center gap-1 transition-all"
                      >
                        <Sliders className="w-3 h-3 text-emerald-700" /> Geotag
                      </button>
                    ) : (
                      <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>

                  {/* Site Details */}
                  <div className="mt-3 space-y-2 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{site.address || site.location}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-200">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-amber-600" /> Deployed Workforce:
                      </span>
                      <span className="font-black text-slate-900 text-sm">
                        {site._count?.employees || site.employees?.length || 0} Staff
                      </span>
                    </div>
                    {site.contactPerson && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                        <span>Point of Contact:</span>
                        <span className="text-slate-800 font-semibold">{site.contactPerson} ({site.contactPhone || 'N/A'})</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleViewRoster(site)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 transition-colors flex items-center gap-1.5"
                    >
                      <Users className="w-3.5 h-3.5 text-slate-600" /> Roster
                    </button>

                    <button
                      onClick={() => {
                        setSelectedSite(site);
                        setIsRateCardModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold border border-emerald-300 transition-colors flex items-center gap-1.5"
                    >
                      <Calculator className="w-3.5 h-3.5 text-emerald-700" /> Rate Card
                    </button>

                    <button
                      onClick={() => navigate(`/attendance?siteId=${site.id}`)}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold border border-amber-300 transition-colors flex items-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-700" /> Live Punch
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedSite(site);
                        setIsAssignOpen(true);
                      }}
                      title="Deploy Staff"
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-amber-600" />
                    </button>

                    <button
                      onClick={() => handleOpenEdit(site)}
                      title="Edit Site Details"
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUPER ADMIN SITE GEOTAG MODAL */}
      <Modal
        isOpen={isGeotagModalOpen}
        onClose={() => setIsGeotagModalOpen(false)}
        title={`⚙️ Site Geotag: ${siteGeotagForm.siteName}`}
        subtitle="Super Admin coordinate & perimeter geofence configuration for this facility"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveSiteGeotag} className="space-y-4 text-xs">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-900">
            <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <span className="font-bold block">Super Admin Authorized Configuration</span>
              <span className="text-[11px] text-amber-800">
                Setting precise GPS coordinates for <strong>{siteGeotagForm.siteName} ({siteGeotagForm.siteCode})</strong>. Punching at this site will require location verification.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Latitude (° N) *</label>
              <input
                type="number"
                step="0.0001"
                required
                value={siteGeotagForm.latitude}
                onChange={e => setSiteGeotagForm({ ...siteGeotagForm, latitude: parseFloat(e.target.value) || 0 })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">Longitude (° E) *</label>
              <input
                type="number"
                step="0.0001"
                required
                value={siteGeotagForm.longitude}
                onChange={e => setSiteGeotagForm({ ...siteGeotagForm, longitude: parseFloat(e.target.value) || 0 })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-800 mb-1">Geofence Perimeter Radius</label>
              <select
                value={siteGeotagForm.geofenceRadius}
                onChange={e => setSiteGeotagForm({ ...siteGeotagForm, geofenceRadius: parseInt(e.target.value, 10) })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:border-amber-500"
              >
                <option value="50">50 Meters (Small Facility / Storefront)</option>
                <option value="100">100 Meters (Standard Commercial Complex)</option>
                <option value="250">250 Meters (Corporate Campus / Tech Park)</option>
                <option value="500">500 Meters (Large Industrial Area)</option>
                <option value="1000">1000 Meters (Township Zone)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <span className="text-slate-600 font-medium">Use physical device GPS at this location:</span>
            <button
              type="button"
              onClick={handleDetectDeviceGps}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl border border-slate-300 shadow-xs flex items-center gap-1.5 transition-all text-xs"
            >
              <LocateFixed className="w-3.5 h-3.5 text-emerald-600" /> Detect GPS
            </button>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsGeotagModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingGeotag}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              {isSavingGeotag ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Save Site Geotag
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ADD / EDIT SITE MODAL */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={selectedSite ? `Edit Site: ${selectedSite.siteCode}` : 'Create New Facility Site'}
        subtitle="Configure client deployment location, address, and billing contracts"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveSite} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Site Code *</label>
              <input
                type="text"
                required
                value={formData.siteCode}
                onChange={e => setFormData({ ...formData, siteCode: e.target.value })}
                disabled={!!selectedSite}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none uppercase font-mono disabled:opacity-60 focus:bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Site Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Microsoft Campus - Building 3"
                value={formData.siteName}
                onChange={e => setFormData({ ...formData, siteName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none focus:bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Client Entity Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Microsoft India R&D Pvt. Ltd."
                value={formData.clientName}
                onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none focus:bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Location / Zone *</label>
              <input
                type="text"
                required
                placeholder="e.g. Gachibowli, Financial District"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Detailed Site Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Person (Client)</label>
              <input
                type="text"
                placeholder="e.g. Head of Facilities"
                value={formData.contactPerson}
                onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none focus:bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={formData.contactPhone}
                onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddEditOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-sm transition-all"
            >
              {selectedSite ? 'Save Changes' : 'Create Site'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ASSIGN EMPLOYEE MODAL */}
      <Modal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title={`Deploy Employee to ${selectedSite?.siteName}`}
        subtitle="Allocate staff member to client roster"
        maxWidth="md"
      >
        <form onSubmit={handleAssignEmployee} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Employee *</label>
            <select
              required
              value={assignData.employeeId}
              onChange={e => setAssignData({ ...assignData, employeeId: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:border-amber-500 focus:outline-none focus:bg-white"
            >
              <option value="">-- Choose Employee --</option>
              {allEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.employeeId} - {emp.firstName} {emp.lastName} ({emp.designation?.title || 'Staff'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Role at Site</label>
            <input
              type="text"
              value={assignData.roleAtSite}
              onChange={e => setAssignData({ ...assignData, roleAtSite: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none focus:bg-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAssignOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-sm"
            >
              Confirm Deployment
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW SITE ROSTER MODAL */}
      <Modal
        isOpen={isRosterOpen}
        onClose={() => setIsRosterOpen(false)}
        title={`Site Roster: ${selectedSite?.siteName}`}
        subtitle={`${selectedSite?.clientName} • ${selectedSite?.employees?.length || 0} Deployed Staff`}
        maxWidth="4xl"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
            <span className="text-slate-600">Site Code: <span className="text-amber-800 font-mono font-bold">{selectedSite?.siteCode}</span></span>
            <span className="text-slate-600">Location: <span className="text-slate-900 font-semibold">{selectedSite?.location}</span></span>
            <button
              onClick={() => {
                setIsRosterOpen(false);
                navigate(`/attendance?siteId=${selectedSite?.id}`);
              }}
              className="text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1"
            >
              Site Live Attendance <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {selectedSite?.employees?.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">No personnel currently allocated to this site.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {selectedSite?.employees?.map(emp => (
                <div key={emp.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center font-bold text-amber-800 text-xs">
                      {emp.firstName[0]}{emp.lastName[0]}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">{emp.firstName} {emp.lastName}</span>
                      <span className="text-amber-800 font-mono font-bold text-[11px] ml-2">({emp.employeeId})</span>
                      <span className="text-slate-500 text-[11px] block">{emp.designation?.title} • {emp.department?.name}</span>
                    </div>
                  </div>
                  <Badge status={emp.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* SITE RATE CARD & STATUTORY SLABS MODAL */}
      {selectedSite && (
        <Modal
          isOpen={isRateCardModalOpen}
          onClose={() => setIsRateCardModalOpen(false)}
          title={`📋 Statutory Rate Card: ${selectedSite.siteName}`}
          subtitle={`Site Code: ${selectedSite.siteCode} • Client: ${selectedSite.clientName}`}
          maxWidth="6xl"
        >
          <div className="p-1">
            <FacilityRateCardModule
              siteId={selectedSite.id}
              siteName={selectedSite.siteName}
              showSiteSelector={false}
              onSaved={() => {
                fetchSites();
                setIsRateCardModalOpen(false);
              }}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};
