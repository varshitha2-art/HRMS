import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Menu, User, LogOut, Shield, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { GlobalSearchModal } from './GlobalSearchModal';
import { useNavigate } from 'react-router-dom';
import { formatDateTime } from '../../utils/formatters';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'ADMIN':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'HR':
        return 'bg-pink-100 text-pink-900 border-pink-300';
      case 'SITE_MANAGER':
        return 'bg-cyan-100 text-cyan-900 border-cyan-300';
      case 'SUPERVISOR':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      default:
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/90 shadow-sm px-4 lg:px-8 flex items-center justify-between text-slate-800">
        {/* Left Side: Mobile Menu Button & Global Search Trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Global Search Button */}
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-3 bg-slate-50 border border-slate-200 hover:border-amber-500/80 px-3.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 transition-all text-xs w-44 sm:w-72 justify-between shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-amber-600" />
              <span className="truncate">Quick search (Ctrl+K)...</span>
            </div>
            <span className="hidden sm:inline-block bg-slate-200/80 text-slate-600 px-1.5 py-0.5 rounded border border-slate-300 font-mono text-[10px]">
              ⌘K
            </span>
          </button>
        </div>

        {/* Right Side: Notifications & User Profile */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Role Pill */}
          <span
            className={`hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border shadow-sm ${getRoleBadgeStyle(
              user?.role
            )}`}
          >
            <Shield className="w-3 h-3 mr-1.5 text-amber-600" />
            {user?.role?.replace('_', ' ')}
          </span>

          {/* Notifications Bell Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-amber-500 text-slate-950 font-bold text-[10px] rounded-full flex items-center justify-center shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAsRead('all')}
                      className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">No notifications yet</div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => {
                          markAsRead(n.id);
                          if (n.link) navigate(n.link);
                          setShowNotifications(false);
                        }}
                        className={`p-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                          !n.isRead ? 'bg-amber-50/60' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-xs font-semibold ${!n.isRead ? 'text-amber-950 font-bold' : 'text-slate-800'}`}>
                            {n.title}
                          </h4>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">{n.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1.5 block">
                          {formatDateTime(n.createdAt)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 shadow-sm flex items-center justify-center font-black text-xs overflow-hidden">
                {user?.employee?.photoUrl ? (
                  <img src={user.employee.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : user?.employee?.firstName ? (
                  user.employee.firstName[0]
                ) : (
                  user?.username?.[0]?.toUpperCase() || 'U'
                )}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-900 leading-none">
                  {user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user?.username}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 leading-none">
                  {user?.employeeId || user?.role}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                  <p className="text-xs font-bold text-slate-900">{user?.username}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  <p className="text-[10px] text-amber-700 font-mono font-bold mt-1">Role: {user?.role}</p>
                </div>

                <button
                  onClick={() => {
                    navigate('/profile');
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-amber-700 flex items-center gap-2.5"
                >
                  <User className="w-4 h-4 text-amber-600" /> My Profile & Documents
                </button>

                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 border-t border-slate-100 mt-1"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Dialog */}
      <GlobalSearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </>
  );
};
