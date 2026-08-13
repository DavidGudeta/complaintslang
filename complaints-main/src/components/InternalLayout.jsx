import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useAuth } from '../contexts/AuthContext';
import {
  LogOut,
  Search,
  User,
  Settings,
  Shield,
  Menu,
  X,
  Building2,
  Users,
  ShieldCheck,
  ClipboardList
} from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { UserRole } from '../types';

export function InternalLayout() {
  const { t } = useTranslation();
  const { user, logout, isLoading } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-sky-50">
        <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const effectiveRole = String(user?.display_role || user?.role || '').toUpperCase();
  const isHeadOffice = [
    UserRole.HEAD_OFFICE_DIRECTOR,
    UserRole.HEAD_OFFICE_TEAM_LEADER
  ].includes(effectiveRole) || (!user?.tax_center_name && (effectiveRole === UserRole.DIRECTOR || effectiveRole === UserRole.TEAM_LEADER));

  return (
    <div className="flex h-screen bg-sky-50 overflow-hidden relative">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isCollapsed}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-8">
          
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-4">
            {isHeadOffice && (
              <Link
                to="/cases/head-office-appeals"
                className="hidden md:inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100 transition"
              >
                <ClipboardList size={16} />
                {t('pages.internalLayout.headOfficeAppeals')}
              </Link>
            )}
            <LanguageSwitcher />
            <NotificationBell />

            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2"
              >
                {/* ✅ FIXED SAFE ACCESS */}
                <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white">
                  {user?.name?.charAt(0) || "U"}
                </div>

                <div>
                  <p>{user?.name || "User"}</p>
                  <p>
                    {user?.display_role
                      ? user.display_role.replace('_', ' ')
                      : user?.role
                      ? user.role.replace('_', ' ')
                      : ""}
                  </p>
                </div>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 bg-white shadow p-3 rounded">
                  <p>{user?.email}</p>

                  {user?.role === UserRole.ADMIN && (
                    <Link to="/admin/users">{t('navigation.administration')}</Link>
                  )}

                  <button onClick={logout} className="flex items-center gap-2">
                    <LogOut size={16} /> {t('common.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}