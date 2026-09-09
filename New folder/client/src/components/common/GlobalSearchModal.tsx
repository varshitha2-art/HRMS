import React, { useState, useEffect } from 'react';
import { Search, User, MapPin, Building, Phone, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ employees: any[]; sites: any[] }>({ employees: [], sites: [] });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ employees: [], sites: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [empRes, siteRes]: any = await Promise.all([
          api.get(`/employees?search=${encodeURIComponent(query)}&limit=6`),
          api.get(`/sites?search=${encodeURIComponent(query)}`),
        ]);
        setResults({
          employees: empRes.data || [],
          sites: siteRes.data || [],
        });
      } catch (err) {
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div
        className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-200 bg-slate-50">
          <Search className="w-5 h-5 text-amber-500 mr-3" />
          <input
            type="text"
            placeholder="Search employees, ID, phone, sites, clients (e.g. MSFT, Dawood, Housekeeping)..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-sm focus:outline-none font-medium"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-700 mr-2">
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-mono">
            ESC
          </span>
        </div>

        {/* Results Container */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {loading && (
            <div className="py-6 text-center text-sm text-slate-500">Searching directory...</div>
          )}

          {!loading && query.length >= 2 && results.employees.length === 0 && results.sites.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-500">
              No matching records found for <span className="text-amber-700 font-bold">"{query}"</span>
            </div>
          )}

          {/* Employees List */}
          {results.employees.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase text-amber-800 tracking-wider mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Employees ({results.employees.length})
              </div>
              <div className="divide-y divide-slate-200">
                {results.employees.map(emp => (
                  <div
                    key={emp.id}
                    onClick={() => {
                      navigate(`/employees?id=${emp.employeeId}`);
                      onClose();
                    }}
                    className="p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center font-bold text-amber-800 text-xs">
                        {emp.firstName[0]}{emp.lastName[0]}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900 group-hover:text-amber-800 transition-colors">
                          {emp.firstName} {emp.lastName}
                          <span className="ml-2 text-xs font-semibold text-amber-700 font-mono">({emp.employeeId})</span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                          <span>{emp.designation?.title || 'Staff'}</span>
                          <span>•</span>
                          <span>{emp.department?.name}</span>
                          {emp.site && (
                            <>
                              <span>•</span>
                              <span className="text-slate-700 font-medium">{emp.site.siteName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sites List */}
          {results.sites.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase text-teal-800 tracking-wider mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Facility Sites ({results.sites.length})
              </div>
              <div className="divide-y divide-slate-200">
                {results.sites.map(site => (
                  <div
                    key={site.id}
                    onClick={() => {
                      navigate(`/sites?id=${site.siteCode}`);
                      onClose();
                    }}
                    className="p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-teal-100 border border-teal-300 flex items-center justify-center font-bold text-teal-800 text-xs">
                        <Building className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900 group-hover:text-teal-800 transition-colors">
                          {site.siteName}
                          <span className="ml-2 text-xs font-semibold text-teal-700 font-mono">({site.siteCode})</span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>Client: {site.clientName}</span>
                          <span>•</span>
                          <span>{site.location}</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {!query && (
            <div className="py-6 text-center text-xs text-slate-500 space-y-1">
              <p>Type to search across employees, client locations, departments and mobile numbers.</p>
              <p className="text-slate-400">Shortcut: Press <kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-semibold">Ctrl + K</kbd> anywhere</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
