import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Menu,
  Database,
  ExternalLink,
  Eye,
  Check,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { getInitials } from '../../lib/utils';
import { SupabaseConfigModal } from '../ui/SupabaseConfigModal';

interface AppTopbarProps {
  onOpenMobileSidebar: () => void;
  onOpenSearch: () => void;
}

export const AppTopbar: React.FC<AppTopbarProps> = ({
  onOpenMobileSidebar,
  onOpenSearch,
}) => {
  const {
    user,
    profile,
    role,
    actualRole,
    previewRole,
    effectiveRole,
    availablePreviewRoles,
    setPreviewRole,
    exitPreview,
    signOut,
  } = useAuth();

  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleSwitchPreview = (targetRole: typeof effectiveRole) => {
    setDropdownOpen(false);
    if (!targetRole || targetRole === actualRole) {
      exitPreview();
      navigate('/dashboard');
    } else {
      setPreviewRole(targetRole);
      if (targetRole === 'DOSEN') {
        navigate('/dosen/dashboard');
      } else if (targetRole === 'MAHASISWA') {
        navigate('/mahasiswa/dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  };

  const displayName =
    profile?.name ||
    user?.email?.split('@')[0] ||
    (effectiveRole === 'DOSEN'
      ? 'Dosen Elektro'
      : effectiveRole === 'MAHASISWA'
      ? 'Mahasiswa Elektro'
      : 'Admin Jurusan');

  const roleDisplay = effectiveRole || 'ADMIN';
  const isPreviewing = Boolean(previewRole && previewRole !== actualRole);
  const departmentDisplay = 'Teknik Elektro';

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
        {/* Mobile menu trigger */}
        <button
          onClick={onOpenMobileSidebar}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden cursor-pointer"
          aria-label="Buka menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-xl">
          <div
            onClick={onOpenSearch}
            className="w-full flex items-center gap-3 px-3.5 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-xl cursor-pointer text-slate-400 text-sm transition-all focus-within:ring-2 focus-within:ring-blue-500/20"
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate text-slate-500 text-xs sm:text-sm">
              Cari mata kuliah, dosen, ruangan, atau kata kunci...
            </span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-2xs font-medium text-slate-500 bg-white border border-slate-200 rounded shadow-2xs shrink-0 ml-auto">
              Ctrl + K
            </kbd>
          </div>
        </div>

        {/* Right side items */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Visual Indicator when preview mode is active */}
          {isPreviewing && (
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 shadow-2xs animate-in fade-in duration-200">
              <Eye className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-2xs sm:text-xs">
                Mode Preview:{' '}
                <strong className="font-semibold text-amber-950">
                  {previewRole === 'DOSEN'
                    ? 'Dosen'
                    : previewRole === 'MAHASISWA'
                    ? 'Mahasiswa'
                    : 'Admin'}
                </strong>
              </span>
              <button
                onClick={() => {
                  exitPreview();
                  navigate('/dashboard');
                }}
                className="ml-1 text-3xs sm:text-2xs font-bold text-amber-800 hover:text-amber-950 underline hover:no-underline cursor-pointer transition-colors"
                title="Kembali ke tampilan Admin"
              >
                Kembali ke Admin
              </button>
            </div>
          )}

          {/* Supabase status badge button */}
          <button
            onClick={() => setShowConfigModal(true)}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
              isSupabaseConfigured()
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 animate-pulse'
            }`}
            title="Status Database Supabase"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSupabaseConfigured() ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <Database className="w-3.5 h-3.5" />
            <span>{isSupabaseConfigured() ? 'Supabase Connected' : 'Setup Supabase'}</span>
          </button>

          {/* Notifications */}
          <button
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
            aria-label="Notifikasi"
            onClick={() => {
              // Notification viewer
            }}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* Profile Pill Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              aria-expanded={dropdownOpen}
            >
              <div className="w-9 h-9 rounded-full bg-slate-700 text-white font-semibold text-xs flex items-center justify-center shrink-0 ring-2 ring-slate-100 shadow-2xs">
                {getInitials(displayName)}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[130px]">
                  {displayName}
                </p>
                <p className="text-2xs text-slate-400 font-medium tracking-tight">
                  {departmentDisplay}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                {/* User info header */}
                <div className="px-3.5 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                  <p className="text-2xs font-medium text-slate-500 truncate">{user?.email || 'user@unram.ac.id'}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-3xs font-bold rounded">
                      Role: {actualRole || 'ADMIN'}
                    </span>
                    {isPreviewing && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-3xs font-bold rounded">
                        Preview: {previewRole}
                      </span>
                    )}
                  </div>
                </div>

                {/* ROLE PREVIEW SWITCHER (Only visible if preview_roles > 1) */}
                {availablePreviewRoles.length > 1 && (
                  <div className="py-2 border-b border-slate-100 bg-slate-50/70">
                    <div className="px-3.5 pb-1 text-2xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                      <span>Preview Tampilan</span>
                      <span className="text-amber-700 font-semibold text-3xs bg-amber-100 px-1.5 py-0.5 rounded">
                        Mode Uji
                      </span>
                    </div>

                    <div className="space-y-0.5 mt-1">
                      {availablePreviewRoles.map((pRole) => {
                        const isCurrent = effectiveRole === pRole;
                        const roleLabel =
                          pRole === 'ADMIN'
                            ? 'Admin'
                            : pRole === 'DOSEN'
                            ? 'Dosen'
                            : 'Mahasiswa';

                        return (
                          <button
                            key={pRole}
                            onClick={() => handleSwitchPreview(pRole)}
                            className={`w-full flex items-center justify-between px-3.5 py-1.5 text-xs transition-colors cursor-pointer ${
                              isCurrent
                                ? 'font-bold text-blue-700 bg-blue-50/90'
                                : 'text-slate-700 hover:bg-slate-100/80 font-medium'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              {isCurrent ? (
                                <span className="w-4 text-blue-600 font-bold text-sm leading-none">✓</span>
                              ) : (
                                <span className="w-4" />
                              )}
                              <span>{roleLabel}</span>
                            </span>
                            {pRole === actualRole && (
                              <span className="text-3xs text-slate-400 font-normal italic">
                                (asli)
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Standard Links */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/pengaturan');
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    Profil
                  </button>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/pengaturan');
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    Pengaturan
                  </button>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      setShowConfigModal(true);
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Database className="w-4 h-4 text-slate-400" />
                    Koneksi Supabase
                  </button>
                </div>

                {/* Sign Out */}
                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    Keluar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Supabase Config Modal */}
      <SupabaseConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </>
  );
};
