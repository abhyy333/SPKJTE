import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  CalendarCheck,
  BookOpen,
  Users,
  GraduationCap,
  DoorClosed,
  Clock,
  AlertTriangle,
  History,
  FileText,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronRight,
  UserCheck,
  Download,
  CalendarDays,
  Layers,
  Database,
} from 'lucide-react';
import { UnramLogo } from '../shared/UnramLogo';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Master Data group collapsible state (local state only, NO navigation)
  const isMasterDataRoute = [
    '/data-mata-kuliah',
    '/data-dosen',
    '/data-mahasiswa',
    '/ruangan',
    '/slot-waktu',
    '/penawaran-kelas',
  ].some((path) => location.pathname.startsWith(path));

  const [masterDataExpanded, setMasterDataExpanded] = useState<boolean>(true);

  // Toggle Master Data submenu open/closed without any navigation
  const toggleMasterData = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMasterDataExpanded((prev) => !prev);
  };

  const renderNavLinks = (items: NavItem[], indent = false) => {
    return items.map((item) => (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={onCloseMobile}
        title={collapsed ? item.label : undefined}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all group relative',
            indent && !collapsed && 'pl-4',
            isActive
              ? 'bg-blue-50 text-blue-600 font-semibold shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          )
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={cn(
                'transition-colors shrink-0',
                isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
              )}
            >
              {item.icon}
            </span>
            {!collapsed && <span className="truncate tracking-tight">{item.label}</span>}
            {collapsed && (
              <div className="fixed left-20 ml-2 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                {item.label}
              </div>
            )}
          </>
        )}
      </NavLink>
    ));
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 bg-white border-r border-slate-200/90 flex flex-col transition-all duration-200 ease-in-out select-none',
          collapsed ? 'w-20' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center gap-3 border-b border-slate-100 shrink-0">
          <div
            className="shrink-0 cursor-pointer"
            onClick={() =>
              navigate(
                role === 'DOSEN'
                  ? '/dosen/dashboard'
                  : role === 'MAHASISWA'
                  ? '/mahasiswa/dashboard'
                  : '/dashboard'
              )
            }
          >
            <UnramLogo size={36} />
          </div>
          {!collapsed && (
            <div
              className="min-w-0 flex-1 overflow-hidden cursor-pointer"
              onClick={() =>
                navigate(
                  role === 'DOSEN'
                    ? '/dosen/dashboard'
                    : role === 'MAHASISWA'
                    ? '/mahasiswa/dashboard'
                    : '/dashboard'
                )
              }
            >
              <h1 className="text-sm font-bold text-slate-800 tracking-tight leading-tight truncate">
                Teknik Elektro
              </h1>
              <p className="text-2xs text-slate-400 font-medium tracking-tight truncate">
                Universitas Mataram
              </p>
            </div>
          )}
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
          {/* DOSEN ROLE */}
          {role === 'DOSEN' && (
            <div className="space-y-1">
              {renderNavLinks([
                { label: 'Dashboard', path: '/dosen/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
                { label: 'Jadwal Perkuliahan', path: '/jadwal-perkuliahan', icon: <Calendar className="w-5 h-5" /> },
                { label: 'Jadwal Ujian', path: '/jadwal-ujian', icon: <CalendarCheck className="w-5 h-5" /> },
                { label: 'Jadwal Saya', path: '/dosen/jadwal-saya', icon: <CalendarDays className="w-5 h-5" /> },
                { label: 'Ketersediaan', path: '/dosen/ketersediaan', icon: <UserCheck className="w-5 h-5" /> },
              ])}
            </div>
          )}

          {/* MAHASISWA ROLE */}
          {role === 'MAHASISWA' && (
            <div className="space-y-1">
              {renderNavLinks([
                { label: 'Dashboard', path: '/mahasiswa/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
                { label: 'Jadwal Perkuliahan', path: '/jadwal-perkuliahan', icon: <Calendar className="w-5 h-5" /> },
                { label: 'Jadwal Ujian', path: '/jadwal-ujian', icon: <CalendarCheck className="w-5 h-5" /> },
                { label: 'Jadwal Saya', path: '/mahasiswa/jadwal-saya', icon: <CalendarDays className="w-5 h-5" /> },
                { label: 'Unduh Jadwal', path: '/mahasiswa/unduh-jadwal', icon: <Download className="w-5 h-5" /> },
              ])}
            </div>
          )}

          {/* ADMIN ROLE */}
          {role !== 'DOSEN' && role !== 'MAHASISWA' && (
            <>
              {/* 1. Dashboard */}
              <div className="space-y-1">
                {renderNavLinks([
                  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
                ])}
              </div>

              {/* 2. Jadwal Section */}
              <div className="pt-2 border-t border-slate-100">
                {!collapsed ? (
                  <div className="px-3 pb-1.5 text-3xs font-bold text-slate-400 uppercase tracking-wider">
                    Jadwal
                  </div>
                ) : (
                  <div className="h-1" />
                )}
                <div className="space-y-1">
                  {renderNavLinks([
                    { label: 'Jadwal Perkuliahan', path: '/jadwal-perkuliahan', icon: <Calendar className="w-5 h-5" /> },
                    { label: 'Jadwal Ujian', path: '/jadwal-ujian', icon: <CalendarCheck className="w-5 h-5" /> },
                  ])}
                </div>
              </div>

              {/* 3. MASTER DATA Group (Header/Toggle Only - NO ROUTE, NO NAVIGATION) */}
              <div className="pt-2 border-t border-slate-100">
                {!collapsed ? (
                  <button
                    type="button"
                    onClick={toggleMasterData}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer group"
                    title="Buka / Tutup Menu Master Data"
                  >
                    <span className="flex items-center gap-2 text-3xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-600">
                      <Database className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
                      MASTER DATA
                    </span>
                    {masterDataExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform" />
                    )}
                  </button>
                ) : (
                  <div className="h-1" />
                )}

                {/* Submenu items for Master Data */}
                {(masterDataExpanded || collapsed) && (
                  <div className="space-y-1 mt-1">
                    {renderNavLinks(
                      [
                        { label: 'Mata Kuliah', path: '/data-mata-kuliah', icon: <BookOpen className="w-5 h-5" /> },
                        { label: 'Dosen', path: '/data-dosen', icon: <Users className="w-5 h-5" /> },
                        { label: 'Mahasiswa', path: '/data-mahasiswa', icon: <GraduationCap className="w-5 h-5" /> },
                        { label: 'Ruangan', path: '/ruangan', icon: <DoorClosed className="w-5 h-5" /> },
                        { label: 'Slot Waktu', path: '/slot-waktu', icon: <Clock className="w-5 h-5" /> },
                        { label: 'Penawaran Kelas', path: '/penawaran-kelas', icon: <Layers className="w-5 h-5" /> },
                      ],
                      true
                    )}
                  </div>
                )}
              </div>

              {/* 4. Monitoring Section */}
              <div className="pt-2 border-t border-slate-100">
                {!collapsed ? (
                  <div className="px-3 pb-1.5 text-3xs font-bold text-slate-400 uppercase tracking-wider">
                    Monitoring
                  </div>
                ) : (
                  <div className="h-1" />
                )}
                <div className="space-y-1">
                  {renderNavLinks([
                    { label: 'Konflik Jadwal', path: '/konflik-jadwal', icon: <AlertTriangle className="w-5 h-5" /> },
                    { label: 'Riwayat Versi', path: '/riwayat-versi', icon: <History className="w-5 h-5" /> },
                    { label: 'Laporan', path: '/laporan', icon: <FileText className="w-5 h-5" /> },
                  ])}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bottom Menu: Pengaturan & Collapse Toggle */}
        <div className="p-3 border-t border-slate-100 space-y-1 bg-white shrink-0">
          <NavLink
            to="/pengaturan"
            title={collapsed ? 'Pengaturan' : undefined}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all group relative',
                isActive
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              )
            }
          >
            <Settings className="w-5 h-5 text-slate-400 group-hover:text-slate-600 shrink-0" />
            {!collapsed && <span>Pengaturan</span>}
            {collapsed && (
              <div className="fixed left-20 ml-2 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                Pengaturan
              </div>
            )}
          </NavLink>

          <button
            onClick={onToggleCollapse}
            className="w-full hidden lg:flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            aria-label={collapsed ? 'Perluas Menu' : 'Sembunyikan Menu'}
          >
            {collapsed ? (
              <ChevronsRight className="w-5 h-5 shrink-0 text-slate-400" />
            ) : (
              <>
                <ChevronsLeft className="w-5 h-5 shrink-0 text-slate-400" />
                <span className="truncate">Sembunyikan Menu</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
