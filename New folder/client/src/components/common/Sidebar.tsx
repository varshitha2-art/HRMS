import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarCheck2,
  CalendarDays,
  Receipt,
  FolderLock,
  BarChart3,
  FileSpreadsheet,
  Settings,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  roles?: UserRole[];
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { user } = useAuth();
  const location = useLocation();

  // Dynamic role-tailored navigation items
  const getNavItems = (): NavItem[] => {
    const role = user?.role;

    if (role === 'EMPLOYEE') {
      return [
        {
          name: 'Dashboard',
          path: '/dashboard',
          icon: <LayoutDashboard className="w-5 h-5" />,
        },
        {
          name: 'My Profile',
          path: '/employees',
          icon: <UserCheck className="w-5 h-5" />,
        },
        {
          name: 'My Attendance',
          path: '/attendance',
          icon: <CalendarCheck2 className="w-5 h-5" />,
        },
        {
          name: 'My Leave Requests',
          path: '/leaves',
          icon: <CalendarDays className="w-5 h-5" />,
        },
        {
          name: 'My Payslips',
          path: '/payroll',
          icon: <Receipt className="w-5 h-5" />,
        },
        {
          name: 'My Documents',
          path: '/documents',
          icon: <FolderLock className="w-5 h-5" />,
        },
      ];
    }

    if (role === 'SUPERVISOR') {
      return [
        {
          name: 'Dashboard',
          path: '/dashboard',
          icon: <LayoutDashboard className="w-5 h-5" />,
        },
        {
          name: 'My Team',
          path: '/employees',
          icon: <Users className="w-5 h-5" />,
        },
        {
          name: 'Attendance & Roster',
          path: '/attendance',
          icon: <CalendarCheck2 className="w-5 h-5" />,
        },
        {
          name: 'Team Leaves',
          path: '/leaves',
          icon: <CalendarDays className="w-5 h-5" />,
        },
        {
          name: 'Team Documents',
          path: '/documents',
          icon: <FolderLock className="w-5 h-5" />,
        },
        {
          name: 'My Payslips',
          path: '/payroll',
          icon: <Receipt className="w-5 h-5" />,
        },
      ];
    }

    if (role === 'SITE_MANAGER') {
      return [
        {
          name: 'Dashboard',
          path: '/dashboard',
          icon: <LayoutDashboard className="w-5 h-5" />,
        },
        {
          name: 'My Sites',
          path: '/sites',
          icon: <Building2 className="w-5 h-5" />,
        },
        {
          name: 'Site Employees',
          path: '/employees',
          icon: <Users className="w-5 h-5" />,
        },
        {
          name: 'Site Attendance',
          path: '/attendance',
          icon: <CalendarCheck2 className="w-5 h-5" />,
        },
        {
          name: 'Site Leaves',
          path: '/leaves',
          icon: <CalendarDays className="w-5 h-5" />,
        },
        {
          name: 'Site Documents',
          path: '/documents',
          icon: <FolderLock className="w-5 h-5" />,
        },
        {
          name: 'Site Reports',
          path: '/reports',
          icon: <BarChart3 className="w-5 h-5" />,
        },
      ];
    }

    // HR, Admin, Super Admin
    const items: NavItem[] = [
      {
        name: 'Dashboard',
        path: '/dashboard',
        icon: <LayoutDashboard className="w-5 h-5" />,
      },
      {
        name: 'Employees',
        path: '/employees',
        icon: <Users className="w-5 h-5" />,
        roles: ['SUPER_ADMIN', 'ADMIN', 'HR'],
      },
      {
        name: 'Sites & Locations',
        path: '/sites',
        icon: <Building2 className="w-5 h-5" />,
        roles: ['SUPER_ADMIN', 'ADMIN', 'HR'],
      },
      {
        name: 'Attendance',
        path: '/attendance',
        icon: <CalendarCheck2 className="w-5 h-5" />,
      },
      {
        name: 'Leave Management',
        path: '/leaves',
        icon: <CalendarDays className="w-5 h-5" />,
      },
      {
        name: 'Payroll & Batches',
        path: '/payroll',
        icon: <Receipt className="w-5 h-5" />,
        roles: ['SUPER_ADMIN', 'ADMIN', 'HR'],
      },
      {
        name: 'Documents Vault',
        path: '/documents',
        icon: <FolderLock className="w-5 h-5" />,
      },
      {
        name: 'Reports & Analytics',
        path: '/reports',
        icon: <BarChart3 className="w-5 h-5" />,
        roles: ['SUPER_ADMIN', 'ADMIN', 'HR'],
      },
      {
        name: 'Data Import (Excel)',
        path: '/import',
        icon: <FileSpreadsheet className="w-5 h-5" />,
        roles: ['SUPER_ADMIN', 'ADMIN', 'HR'],
      },
      {
        name: 'System Settings',
        path: '/settings',
        icon: <Settings className="w-5 h-5" />,
        roles: ['SUPER_ADMIN', 'ADMIN'],
      },
      {
        name: 'Audit Trail',
        path: '/audit-logs',
        icon: <ShieldAlert className="w-5 h-5" />,
        roles: ['SUPER_ADMIN'],
      },
    ];

    return items.filter(item => {
      if (!item.roles) return true;
      if (role === 'SUPER_ADMIN') return true;
      return item.roles.includes(role as UserRole);
    });
  };

  const navItems = getNavItems();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 text-slate-700 shadow-sm">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
        <NavLink to="/" className="flex items-center gap-3 overflow-hidden group hover:opacity-90 transition-opacity" title="Visit Home / Landing Page">
          <img
            src="/vphs_logo.png"
            alt="VPHS"
            className="w-9 h-9 rounded-xl object-contain bg-[#070e20] p-0.5 border border-amber-500/40 shadow-md shadow-amber-500/20 flex-shrink-0 group-hover:scale-105 transition-transform"
          />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-extrabold tracking-wider text-slate-900 whitespace-nowrap">
                VPHS SERVICES
              </span>
              <span className="text-[10px] tracking-tight text-amber-700 font-semibold flex items-center gap-1">
                Facility & HR ERP Portal
              </span>
            </div>
          )}
        </NavLink>

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden text-slate-400 hover:text-slate-800 p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
        {navItems.map(item => {
          const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              title={isCollapsed ? item.name : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-amber-500/15 text-amber-900 border border-amber-400/40 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <div
                className={`transition-transform duration-200 ${
                  isActive ? 'text-amber-700 scale-110' : 'text-slate-400 group-hover:text-slate-700'
                }`}
              >
                {item.icon}
              </div>
              {!isCollapsed && <span className="truncate">{item.name}</span>}
              {!isCollapsed && item.badge && (
                <span className="ml-auto bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Footer Info / Desktop Collapse Button */}
      <div className="p-3 border-t border-slate-200">
        {!isCollapsed && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-2 text-xs">
            <div className="flex items-center gap-2 text-amber-700 font-bold text-[11px]">
              <Sparkles className="w-3.5 h-3.5" /> Secure RBAC
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Role: <span className="font-bold text-slate-800">{user?.role || 'EMPLOYEE'}</span>
            </p>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex w-full items-center justify-center gap-2 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block transition-all duration-300 ease-in-out fixed inset-y-0 left-0 z-40 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
