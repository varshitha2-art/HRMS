import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Shield, Sparkles, Building2, CheckCircle2, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await login(username, password);
      showToast('Welcome back to VPHS ERP Portal!', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPersona = async (uname: string, roleName: string) => {
    setError('');
    setLoading(true);
    try {
      await login(uname, 'password123');
      showToast(`Logged in as ${roleName}`, 'success');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const testPersonas = [
    {
      username: 'rahul',
      name: 'K. Rahul Kumar',
      role: 'Super Admin',
      empId: 'VPHS0054',
      access: 'Regional Manager • All 73 Employees & 8 Sites',
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    },
    {
      username: 'supriya',
      name: 'Supriya Gundreddy',
      role: 'HR Admin',
      empId: 'VPHS0052',
      access: 'HR & Finance Lead • Payroll, Onboarding & KYC',
      badgeClass: 'bg-pink-100 text-pink-800 border-pink-300',
    },
    {
      username: 'gous',
      name: 'Abdul Gous Pasha',
      role: 'Site Manager',
      empId: 'VPHS0033',
      access: 'Operations Executive • Microsoft India & HQ Sites',
      badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    },
    {
      username: 'prithviraj',
      name: 'Prithviraj Heerekar',
      role: 'Supervisor',
      empId: 'VPHS0020',
      access: 'Valet Shift Lead • Third Wave Coffee Team Roster',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    {
      username: 'vphs0040',
      name: 'Dommeti Naga Sairam',
      role: 'Employee',
      empId: 'VPHS0040',
      access: 'Valet Staff • Personal Shifts, Attendance & Payslips',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden">
      {/* Background Ambient Orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10">
        
        {/* Left Side: Brand & Company Presentation */}
        <div className="lg:col-span-5 bg-gradient-to-br from-white via-slate-50/80 to-amber-50/20 p-8 sm:p-10 flex flex-col justify-between text-slate-900 border-b lg:border-b-0 lg:border-r border-slate-200">
          <div>
            <div className="flex items-center">
              <img
                src="/vphs_logo.png"
                alt="VPHS Services Pvt. Ltd."
                className="h-14 sm:h-16 w-auto max-w-full object-contain drop-shadow-xs"
              />
            </div>

            <div className="mt-8 space-y-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                Role-Based Access Control (RBAC) Portal
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Enterprise security system with database-level isolation. Each user dynamically accesses strictly authorized site and employee records.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>Backend Database-Level Data Scoping</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>Site Manager Isolation (Microsoft & Amazon)</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>Field Supervisor Reporting Team Roster</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>Employee Self-Service (Strict Self Records Only)</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between font-medium">
            <span>© 2026 VPHS Services Pvt. Ltd.</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              RBAC Security Active
            </span>
          </div>
        </div>

        {/* Right Side: Login Form & Quick Role Switcher */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between bg-white">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Portal Authentication</h3>
                <p className="text-xs text-slate-500 mt-1">Enter your Employee ID or Username to access authorized ERP modules</p>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 animate-in fade-in">
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleManualLogin} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Employee ID / Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="e.g. vikram, ramesh, suresh, aamir, VPHS-001"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password (default: password123)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>Remember session</span>
                </label>
                <span className="text-amber-700 font-mono text-[11px] font-semibold">
                  Default PW: password123
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 rounded-xl font-bold text-xs tracking-wide transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                {loading ? 'Authenticating...' : 'Sign In to Portal'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Demo Switcher - 5 Target Personas */}
            <div className="mt-6 pt-5 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    1-Click Persona Login
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Click to test isolation</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {testPersonas.map(p => (
                  <button
                    key={p.username}
                    type="button"
                    onClick={() => handleQuickPersona(p.username, p.role)}
                    disabled={loading}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-amber-400 bg-slate-50 hover:bg-amber-50/50 text-left transition-all hover:scale-[1.01] shadow-sm flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{p.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${p.badgeClass}`}>
                        {p.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 truncate">
                      <span className="font-mono text-amber-700 font-semibold">{p.empId}</span> • {p.access}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
