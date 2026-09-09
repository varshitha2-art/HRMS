import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  CalendarCheck2,
  Receipt,
  ArrowRight,
  Sparkles,
  Shield,
  CheckCircle2,
  Sun,
  Moon,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [isLightMode, setIsLightMode] = useState<boolean>(true);

  const handleAccessPortal = () => {
    if (token && user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const featureCards = [
    {
      title: '360° Employee Master',
      description: 'Complete employee records, statutory PF/ESI/UAN/PT mappings, Excel batch import & KYC document vaults.',
      icon: <Users className="w-6 h-6 text-amber-500" />,
      iconBg: isLightMode ? 'bg-amber-100 border-amber-200' : 'bg-amber-500/10 border-amber-500/20',
      path: '/employees',
      badge: 'Workforce Hub',
    },
    {
      title: 'Multi-Site Operations',
      description: 'Client deployment tracking across Microsoft India, Third Wave, Forward Life, Harleys, and head offices.',
      icon: <Building2 className="w-6 h-6 text-cyan-500" />,
      iconBg: isLightMode ? 'bg-cyan-100 border-cyan-200' : 'bg-cyan-500/10 border-cyan-500/20',
      path: '/sites',
      badge: 'Site Logistics',
    },
    {
      title: 'Attendance & Shifts',
      description: 'Automated punch logs, grace period enforcement, monthly rosters, late calculations, and overtime tracking.',
      icon: <CalendarCheck2 className="w-6 h-6 text-emerald-500" />,
      iconBg: isLightMode ? 'bg-emerald-100 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/20',
      path: '/attendance',
      badge: 'Biometric Roster',
    },
    {
      title: 'Payroll & Payslips',
      description: 'Configurable salary structures, statutory deductions, monthly verification workflow, and PDF payslip engine.',
      icon: <Receipt className="w-6 h-6 text-amber-500" />,
      iconBg: isLightMode ? 'bg-amber-100 border-amber-200' : 'bg-amber-500/10 border-amber-500/20',
      path: '/payroll',
      badge: 'PF/ESI Compliant',
    },
  ];

  return (
    <div
      className={`min-h-screen transition-colors duration-300 flex flex-col justify-between relative overflow-hidden font-sans ${
        isLightMode
          ? 'bg-slate-50 text-slate-900'
          : 'bg-[#070d1e] text-slate-100'
      }`}
    >
      {/* Background Ambient Lighting Glows */}
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] rounded-full blur-3xl pointer-events-none ${
          isLightMode ? 'bg-amber-400/15' : 'bg-amber-500/10'
        }`}
      />
      <div
        className={`absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none ${
          isLightMode ? 'bg-cyan-400/10' : 'bg-cyan-500/5'
        }`}
      />

      {/* Top Navbar */}
      <header
        className={`w-full max-w-7xl mx-auto px-6 sm:px-8 py-5 flex items-center justify-between relative z-20 ${
          isLightMode ? 'border-b border-slate-200/80' : 'border-b border-slate-800/80'
        }`}
      >
        {/* Brand Logo */}
        <div className="flex items-center gap-3.5 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-amber-500/25 border border-amber-400/30 flex-shrink-0">
            V
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className={`text-base font-extrabold tracking-wider ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                VPHS
              </span>
              <span className="text-xs font-bold text-amber-500 tracking-wider">
                SERVICES PVT LTD
              </span>
            </div>
            <span className="text-[10px] tracking-wide text-amber-600 font-medium font-mono">
              Secure, Scalable, Seamless
            </span>
          </div>
        </div>

        {/* Right Navigation Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Light / Dark Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsLightMode(!isLightMode)}
            className={`p-2 sm:px-3 sm:py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
              isLightMode
                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
                : 'bg-slate-900 border-slate-700 text-amber-400 hover:bg-slate-800'
            }`}
            title="Toggle Light / Dark Theme"
          >
            {isLightMode ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
            <span className="hidden sm:inline">{isLightMode ? 'Dark Theme' : 'Light Theme'}</span>
          </button>

          {/* Portal Login / Dashboard Button */}
          <button
            onClick={handleAccessPortal}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all"
          >
            {token && user ? 'Go to Dashboard' : 'Portal Login'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Hero Content */}
      <main className="w-full max-w-6xl mx-auto px-6 py-12 sm:py-16 md:py-20 flex flex-col items-center text-center relative z-10">
        
        {/* Enterprise Pill Badge */}
        <div
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider mb-6 transition-all ${
            isLightMode
              ? 'bg-amber-100/80 text-amber-900 border-amber-300 shadow-sm'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-inner'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Enterprise HR & Facility Management ERP</span>
        </div>

        {/* Main Hero Headline */}
        <h1
          className={`text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight max-w-4xl ${
            isLightMode ? 'text-slate-900' : 'text-white'
          }`}
        >
          VPHS SERVICES <span className="text-amber-500">PVT. LTD.</span>
        </h1>

        {/* Subtitle */}
        <p
          className={`mt-5 text-sm sm:text-base md:text-lg max-w-3xl leading-relaxed ${
            isLightMode ? 'text-slate-600' : 'text-slate-300'
          }`}
        >
          Complete facility operations, employee management, multi-site attendance rosters, statutory compliance, automated payroll & digital identity portal.
        </p>

        {/* Hero CTA Button */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={handleAccessPortal}
            className="px-8 py-4 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-extrabold text-sm sm:text-base rounded-2xl shadow-xl shadow-amber-500/30 flex items-center gap-2.5 transition-all group"
          >
            <span>ACCESS ERP PORTAL</span>
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* 4 Feature Cards Grid */}
        <div className="mt-16 sm:mt-20 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 text-left">
          {featureCards.map((card, idx) => (
            <div
              key={idx}
              onClick={handleAccessPortal}
              className={`p-6 rounded-3xl border transition-all duration-300 cursor-pointer group hover:-translate-y-1.5 flex flex-col justify-between ${
                isLightMode
                  ? 'bg-white border-slate-200/90 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/5 shadow-md'
                  : 'bg-[#0e172e]/80 border-slate-800/80 hover:border-amber-500/50 hover:shadow-2xl hover:shadow-amber-500/10'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${card.iconBg}`}>
                    {card.icon}
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      isLightMode
                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {card.badge}
                  </span>
                </div>

                <h3
                  className={`text-base font-bold tracking-tight mb-2 group-hover:text-amber-500 transition-colors ${
                    isLightMode ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  {card.title}
                </h3>

                <p
                  className={`text-xs leading-relaxed ${
                    isLightMode ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  {card.description}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-xs font-semibold text-amber-500 opacity-80 group-hover:opacity-100">
                <span>Explore module</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer Bar */}
      <footer
        className={`w-full max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between text-xs gap-3 ${
          isLightMode ? 'text-slate-500 border-t border-slate-200/60' : 'text-slate-500 border-t border-slate-800/60'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-amber-600">VPHS Services Pvt. Ltd.</span>
          <span>• Facility & HR ERP System</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="text-emerald-500 font-medium">● 100% Standalone Production</span>
          <span>© 2026 All Rights Reserved</span>
        </div>
      </footer>
    </div>
  );
};
