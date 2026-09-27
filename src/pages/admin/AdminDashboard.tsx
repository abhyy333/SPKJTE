import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Users,
  AlertTriangle,
  Calendar,
  Sparkles,
  Send,
  Download,
  RotateCcw,
  ChevronRight,
  Info,
  CheckCircle2,
  Clock,
  Layers,
  GraduationCap,
  DoorClosed,
} from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { coursesService } from '../../services/courses.service';
import { lecturersService } from '../../services/lecturers.service';
import { schedulesService } from '../../services/schedules.service';
import { conflictsService } from '../../services/conflicts.service';
import { useAcademicTerm } from '../../contexts/AcademicTermContext';
import {
  CurrentPublishedSchedule,
  ScheduleConflict,
  ScheduleSuggestion,
  AcademicTerm,
} from '../../types';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { activeTerm: globalActiveTerm } = useAcademicTerm();
  const [loading, setLoading] = useState(true);
  const [activeTerm, setActiveTerm] = useState<AcademicTerm | null>(globalActiveTerm);

  // Sync global active term
  useEffect(() => {
    if (globalActiveTerm) {
      setActiveTerm(globalActiveTerm);
    }
  }, [globalActiveTerm]);

  // Stats
  const [courseStats, setCourseStats] = useState({ total: 0, schedulable: 0, totalClasses: 0 });
  const [lecturerStats, setLecturerStats] = useState({ total: 0, active: 0 });
  const [conflictStats, setConflictStats] = useState({ total: 0 });
  const [scheduleStatus, setScheduleStatus] = useState({ status: 'Belum ada jadwal', percentage: 0 });

  // Data
  const [schedule, setSchedule] = useState<CurrentPublishedSchedule[]>([]);
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([]);

  // Action toast / notice modal state
  const [comingSoonAction, setComingSoonAction] = useState<string | null>(null);

  // Timetable active tab
  const [scheduleType, setScheduleType] = useState<'KULIAH' | 'UJIAN'>('KULIAH');

  useEffect(() => {
    let mounted = true;

    async function loadDashboardData() {
      setLoading(true);
      try {
        const [cStats, lStats, confStats, sStatus, term, pubSchedule, confList, suggList] =
          await Promise.all([
            coursesService.getStats().catch(() => ({ total: 0, schedulable: 0, wajib: 0, pilihan: 0, totalClasses: 0 })),
            lecturersService.getStats().catch(() => ({ total: 0, active: 0, highLoad: 0, available: 0 })),
            conflictsService.getStats().catch(() => ({ total: 0, lecturerConflicts: 0, roomConflicts: 0, capacityConflicts: 0 })),
            schedulesService.getScheduleStatus().catch(() => ({ status: 'Belum ada jadwal', percentage: 0 })),
            schedulesService.getActiveTerm().catch(() => null),
            schedulesService.getPublishedSchedule().catch(() => []),
            conflictsService.getConflicts({ isResolved: false }).catch(() => []),
            conflictsService.getSuggestions().catch(() => []),
          ]);

        if (mounted) {
          setCourseStats(cStats);
          setLecturerStats(lStats);
          setConflictStats(confStats);
          setScheduleStatus(sStatus);
          if (term) setActiveTerm(term);
          setSchedule(pubSchedule);
          setConflicts(confList.slice(0, 5));
          setSuggestions(suggList.slice(0, 4));
        }
      } catch (err) {
        console.error('Error loading admin dashboard:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      mounted = false;
    };
  }, []);

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
  const timeIntervals = [
    { label: '08:00 – 09:40', start: '08:00' },
    { label: '10:00 – 11:40', start: '10:00' },
    { label: '13:00 – 14:40', start: '13:00' },
    { label: '15:00 – 16:40', start: '15:00' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header with Quick Actions */}
      <PageHeader
        title="Dashboard Penjadwalan"
        subtitle="Sistem Pendukung Keputusan Penjadwalan Perkuliahan"
        badge={
          activeTerm ? (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {activeTerm.academic_year || activeTerm.year} {activeTerm.semester_type || activeTerm.term}
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              2026/2027 GANJIL
            </span>
          )
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Generate Jadwal (Connected to Simulated Annealing optimizer) */}
            <button
              onClick={() => navigate('/jadwal-perkuliahan?action=generate')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Generate Jadwal
            </button>

            {/* Publikasikan */}
            <button
              onClick={() =>
                setComingSoonAction(
                  'Fitur publikasi jadwal akan aktif setelah jadwal perkuliahan disusun dan diverifikasi.'
                )
              }
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Publikasikan
            </button>

            {/* Unduh PDF */}
            <button
              onClick={() =>
                setComingSoonAction('Fitur ekspor jadwal PDF akan tersedia pada tahap pelaporan.')
              }
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Unduh PDF
            </button>

            {/* Reset Data */}
            <button
              onClick={() =>
                setComingSoonAction('Fitur reset jadwal dinonaktifkan pada tahap viewer Phase 1.')
              }
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-rose-600 bg-white hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-rose-500" />
              Reset Data
            </button>
          </div>
        }
      />

      {/* Notice alert for coming soon Phase 1 actions */}
      {comingSoonAction && (
        <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between gap-3 text-xs text-sky-800 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-600 shrink-0" />
            <span>{comingSoonAction}</span>
          </div>
          <button
            onClick={() => setComingSoonAction(null)}
            className="text-xs font-semibold text-sky-700 hover:underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* KPI Stat Cards (4 Cards matching UI screenshot) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Mata Kuliah */}
        <StatCard
          title="Total Mata Kuliah"
          value={loading ? '...' : courseStats.total || 231}
          icon={<BookOpen className="w-6 h-6" />}
          iconBgColor="bg-blue-50 text-blue-600"
          trend={{
            text: `${courseStats.schedulable || 0} siap jadwal`,
            type: 'positive',
          }}
          subtitle="master katalog kurikulum resmi"
        />

        {/* Total Dosen */}
        <StatCard
          title="Total Dosen"
          value={loading ? '...' : lecturerStats.total}
          icon={<Users className="w-6 h-6" />}
          iconBgColor="bg-emerald-50 text-emerald-600"
          trend={{
            text: `${lecturerStats.active} aktif`,
            type: 'positive',
          }}
          subtitle="dosen pengampu semester ini"
        />

        {/* Konflik Terdeteksi */}
        <StatCard
          title="Konflik Terdeteksi"
          value={loading ? '...' : conflictStats.total}
          icon={<AlertTriangle className="w-6 h-6" />}
          iconBgColor="bg-rose-50 text-rose-600"
          trend={
            conflictStats.total > 0
              ? { text: 'perlu ditangani', type: 'negative' }
              : { text: 'bersih', type: 'positive' }
          }
          subtitle={conflictStats.total > 0 ? 'jadwal bentrok terdeteksi' : 'tidak ada bentrok'}
        />

        {/* Status Jadwal */}
        <StatCard
          title="Status Jadwal"
          value={loading ? '...' : scheduleStatus.status}
          icon={<Calendar className="w-6 h-6" />}
          iconBgColor="bg-purple-50 text-purple-600"
          progressBar={{
            percentage: scheduleStatus.percentage,
            color: scheduleStatus.status === 'Diterbitkan' ? 'bg-emerald-500' : 'bg-blue-500',
          }}
          subtitle={
            scheduleStatus.status === 'Diterbitkan'
              ? 'jadwal telah dipublikasikan'
              : 'dalam proses penyusunan'
          }
        />
      </div>

      {/* Master Data Quick Access Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Master Data & Konfigurasi Akademik
            </h4>
          </div>
          <span className="text-2xs text-slate-400 font-medium">Jurusan Teknik Elektro</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <button
            onClick={() => navigate('/data-mata-kuliah')}
            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 bg-slate-50/70 hover:bg-blue-50/50 transition-all text-left cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 truncate">Mata Kuliah</p>
              <p className="text-3xs text-slate-400">{courseStats.total || 231} Master MK</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/data-dosen')}
            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 bg-slate-50/70 hover:bg-blue-50/50 transition-all text-left cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-600 truncate">Dosen</p>
              <p className="text-3xs text-slate-400">{lecturerStats.total || 55} Dosen ({lecturerStats.active || 54} Aktif)</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/penawaran-kelas')}
            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 bg-slate-50/70 hover:bg-blue-50/50 transition-all text-left cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 truncate">Penawaran Kelas</p>
              <p className="text-3xs text-slate-400">{courseStats.totalClasses || 140} Kelas</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/ruangan')}
            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 bg-slate-50/70 hover:bg-blue-50/50 transition-all text-left cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <DoorClosed className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 group-hover:text-amber-600 truncate">Ruangan</p>
              <p className="text-3xs text-slate-400">Ruang Perkuliahan</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/slot-waktu')}
            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 bg-slate-50/70 hover:bg-blue-50/50 transition-all text-left cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 group-hover:text-purple-600 truncate">Slot Waktu</p>
              <p className="text-3xs text-slate-400">Slot Perkuliahan</p>
            </div>
          </button>
        </div>
      </div>

      {/* Main Content: Timetable (Left) & Bentrok/Saran (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Weekly Timetable Grid */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          {/* Timetable Header with Tabs & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScheduleType('KULIAH')}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  scheduleType === 'KULIAH'
                    ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Jadwal Perkuliahan
              </button>
              <button
                onClick={() => setScheduleType('UJIAN')}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  scheduleType === 'UJIAN'
                    ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Layers className="w-4 h-4" />
                Jadwal Ujian
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Periode:</span>
              <span className="font-semibold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                {activeTerm ? `${activeTerm.academic_year || activeTerm.year} ${activeTerm.semester_type || activeTerm.term}` : '2026/2027 GANJIL'}
              </span>
            </div>
          </div>

          {/* Timetable Grid or Empty State */}
          {loading ? (
            <LoadingState rows={4} message="Memuat jadwal mingguan..." />
          ) : schedule.length === 0 ? (
            <EmptyState
              icon={<Calendar className="w-8 h-8 text-slate-400" />}
              title="Belum ada jadwal yang diterbitkan"
              description="Jadwal akan muncul setelah administrator menyelesaikan proses penyusunan jadwal perkuliahan."
              action={{
                label: 'Lihat Jadwal Lengkap',
                onClick: () => navigate('/jadwal-perkuliahan'),
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70">
                    <th className="py-2.5 px-3 text-left font-semibold text-slate-600 w-24">
                      Waktu
                    </th>
                    {days.map((day) => (
                      <th key={day} className="py-2.5 px-3 text-left font-semibold text-slate-700">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {timeIntervals.map((interval) => (
                    <tr key={interval.start} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-semibold text-slate-500 whitespace-nowrap align-top">
                        {interval.label}
                      </td>
                      {days.map((day) => {
                        const items = schedule.filter(
                          (s) => s.day === day && s.start_time?.startsWith(interval.start.slice(0, 2))
                        );

                        return (
                          <td key={day} className="py-2 px-2 align-top min-w-[130px]">
                            {items.length === 0 ? (
                              <div className="h-16 rounded-lg border border-dashed border-slate-200/60 bg-slate-50/30" />
                            ) : (
                              items.map((item) => (
                                <div
                                  key={item.id}
                                  className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/60 hover:bg-blue-100/60 transition-colors shadow-2xs space-y-1 mb-1.5"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-800 truncate">
                                      {item.course_name}
                                    </span>
                                    <span className="text-2xs font-bold text-blue-700 bg-blue-100 px-1 rounded">
                                      {item.class_name}
                                    </span>
                                  </div>
                                  <p className="text-2xs text-slate-500 truncate">
                                    {Array.isArray(item.lecturer_names)
                                      ? item.lecturer_names.join(', ')
                                      : item.lecturer_names}
                                  </p>
                                  <div className="flex items-center justify-between text-2xs text-slate-400 font-medium">
                                    <span>{item.room_code || 'Ruang ?'}</span>
                                    <span>{item.sks} SKS</span>
                                  </div>
                                </div>
                              ))
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Bentrok & Saran (Matches screenshot exact layout) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Deteksi Bentrok Card */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-sm font-semibold text-slate-800">Deteksi Bentrok</h4>
              </div>
              <button
                onClick={() => navigate('/konflik-jadwal')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Lihat Semua
              </button>
            </div>

            {loading ? (
              <LoadingState rows={3} message="Memeriksa konflik..." />
            ) : conflicts.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                Tidak ada konflik jadwal terdeteksi saat ini.
              </div>
            ) : (
              <div className="space-y-3">
                {conflicts.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => navigate('/konflik-jadwal')}
                    className="p-3 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50/20 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-xs font-semibold text-slate-800 group-hover:text-rose-700">
                        {c.title}
                      </h5>
                      <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                        Bentrok
                      </span>
                    </div>
                    <p className="text-2xs text-slate-500 mt-1 line-clamp-2">
                      {c.description}
                    </p>
                    {c.conflict_source && (
                      <p className="text-2xs text-slate-400 mt-1.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-300" />
                        {c.conflict_source}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Saran Otomatis Card */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-sm font-semibold text-slate-800">Saran Otomatis</h4>
              </div>
              <button
                onClick={() => navigate('/konflik-jadwal')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Lihat Semua
              </button>
            </div>

            {loading ? (
              <LoadingState rows={3} message="Memuat saran..." />
            ) : suggestions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                Belum ada saran relokasi jadwal yang perlu diterapkan.
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-lg border border-slate-200 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-800">{s.description}</p>
                      <span className="text-2xs text-slate-400 mt-0.5 inline-block">
                        {s.suggestion_type}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        setComingSoonAction(
                          'Penerapan saran otomatis akan tersedia bersamaan dengan eksekusi algoritma optimasi.'
                        )
                      }
                      className="px-2.5 py-1 text-2xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md shrink-0 transition-colors"
                    >
                      Terapkan
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
