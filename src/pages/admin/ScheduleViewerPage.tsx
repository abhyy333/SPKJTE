import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Printer,
  Search,
  Filter,
  PlusCircle,
  ExternalLink,
  UserCheck,
  MapPin,
  Clock,
  LayoutGrid,
  List,
  DoorOpen,
  Info,
  Sparkles,
} from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { schedulesService } from '../../services/schedules.service';
import { scheduleVersionsService } from '../../services/scheduleVersions.service';
import { CurrentPublishedSchedule, AcademicTerm } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { timeToMinute, minuteToTime, cn } from '../../lib/utils';
import { toast } from '../../components/ui/Toast';
import { PublishedScheduleDetailDrawer } from '../../components/schedule/PublishedScheduleDetailDrawer';
import { AppleWeeklyCalendar } from '../../components/schedule/AppleWeeklyCalendar';
import { AppleRightRail } from '../../components/schedule/AppleRightRail';
import { AppleScheduleCardData } from '../../components/schedule/AppleScheduleCard';

export const ScheduleViewerPage: React.FC = () => {
  const { role, user, isOwnerAdmin } = useAuth();
  const navigate = useNavigate();

  const [schedules, setSchedules] = useState<CurrentPublishedSchedule[]>([]);
  const [activeTerm, setActiveTerm] = useState<AcademicTerm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingRevision, setCreatingRevision] = useState(false);

  // Selected date for calendar navigation (default today)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Detail & Smart Rescheduling Drawer state
  const [selectedSchedule, setSelectedSchedule] = useState<CurrentPublishedSchedule | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Inspected Card for Right Rail Inspector
  const [inspectedCard, setInspectedCard] = useState<AppleScheduleCardData | null>(null);

  const handleOpenDetail = (item: CurrentPublishedSchedule) => {
    setSelectedSchedule(item);
    setIsDetailDrawerOpen(true);
  };

  // View Mode: 'MATRIKS' | 'TABEL'
  const [viewMode, setViewMode] = useState<'MATRIKS' | 'TABEL'>('MATRIKS');

  // Filters
  const [dayFilter, setDayFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [onlyMySchedule, setOnlyMySchedule] = useState(false);

  const fetchScheduleData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, term] = await Promise.all([
        schedulesService.getPublishedSchedule(),
        schedulesService.getActiveTerm(),
      ]);
      setSchedules(list);
      setActiveTerm(term);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat jadwal perkuliahan resmi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduleData();
  }, []);

  const daysList = useMemo(
    () => [
      { num: 1, name: 'Senin', englishName: 'Monday' },
      { num: 2, name: 'Selasa', englishName: 'Tuesday' },
      { num: 3, name: 'Rabu', englishName: 'Wednesday' },
      { num: 4, name: 'Kamis', englishName: 'Thursday' },
      { num: 5, name: 'Jumat', englishName: 'Friday' },
    ],
    []
  );

  // Admin action: Buat Revisi Baru
  const handleCreateNewRevision = async () => {
    if (!activeTerm?.id) return;
    setCreatingRevision(true);
    try {
      const termTitle = `Revisi Jadwal Perkuliahan ${activeTerm.semester_type || ''} ${activeTerm.academic_year || ''}`;
      const newDraft = await scheduleVersionsService.createDraft(activeTerm.id, termTitle);
      const key = `spk:active-schedule-version:${user?.id || 'anonymous'}:${activeTerm.id}`;
      localStorage.setItem(key, newDraft.id);
      toast.success('Draf revisi jadwal baru berhasil dibuat.');
      navigate('/penyusunan-jadwal');
    } catch (err: any) {
      console.error('Error creating revision:', err);
      toast.error(err?.message || 'Gagal membuat revisi baru.');
    } finally {
      setCreatingRevision(false);
    }
  };

  // Safe helper to extract day name
  const getDayName = (s: any): string => {
    if (!s) return 'Senin';
    if (typeof s.day === 'string' && s.day.trim()) return s.day.trim();
    const dayNum = s.day_of_week || (typeof s.day === 'number' ? s.day : 1);
    const found = daysList.find((d) => d.num === Number(dayNum));
    return found?.name || 'Senin';
  };

  // Source of truth for SKS: entry.course_offering.course.effective_sks -> entry.effective_sks -> entry.session_count -> duration/50 -> entry.sks
  const getDisplayedSks = (item: any): number => {
    if (item?.course_offering?.course?.effective_sks) {
      return Number(item.course_offering.course.effective_sks);
    }
    if (typeof item?.effective_sks === 'number' && item.effective_sks > 0) {
      return Number(item.effective_sks);
    }
    if (typeof item?.session_count === 'number' && item.session_count > 0) {
      return Number(item.session_count);
    }
    const startMin =
      typeof item?.start_minute === 'number'
        ? item.start_minute
        : item?.start_time
        ? timeToMinute(item.start_time)
        : null;
    const endMin =
      typeof item?.end_minute === 'number'
        ? item.end_minute
        : item?.end_time
        ? timeToMinute(item.end_time)
        : null;
    if (startMin !== null && endMin !== null && endMin > startMin) {
      const calc = Math.round((endMin - startMin) / 50);
      if (calc > 0) return calc;
    }
    if (typeof item?.sks === 'number' && item.sks > 0) {
      return Number(item.sks);
    }
    return 3;
  };

  // Filtered schedules
  const filtered = useMemo(() => {
    return schedules.filter((s) => {
      if (!s) return false;
      const sDay = getDayName(s);
      if (dayFilter !== 'all' && sDay.toLowerCase() !== (dayFilter || '').toLowerCase()) {
        return false;
      }
      const sClass = s.class_name || (s as any).class_code || '';
      if (classFilter !== 'all' && sClass !== classFilter) {
        return false;
      }
      if (onlyMySchedule && user?.email) {
        const lNames = Array.isArray(s.lecturer_names)
          ? s.lecturer_names.join(' ')
          : String(s.lecturer_names || '');
        const uName = (user as any).name || '';
        if (uName && !lNames.toLowerCase().includes(uName.toLowerCase())) {
          return false;
        }
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const lNames = Array.isArray(s.lecturer_names)
          ? s.lecturer_names.join(' ')
          : String(s.lecturer_names || '');
        const cName = String(s.course_name || '').toLowerCase();
        const cCode = String(s.course_code || '').toLowerCase();
        const matchCourse = cName.includes(q) || cCode.includes(q);
        const matchLect = lNames.toLowerCase().includes(q);
        const rCode = String(s.room_code || '').toLowerCase();
        const rName = String(s.room_name || '').toLowerCase();
        const matchRoom = rCode.includes(q) || rName.includes(q);
        if (!matchCourse && !matchLect && !matchRoom) return false;
      }
      return true;
    });
  }, [schedules, dayFilter, classFilter, onlyMySchedule, search, user]);

  // Convert to AppleScheduleCardData
  const calendarEntries: AppleScheduleCardData[] = useMemo(() => {
    return filtered.map((item) => {
      return {
        id: item.id,
        course_name: item.course_name,
        course_code: item.course_code,
        class_name: item.class_name,
        start_time: item.start_time,
        end_time: item.end_time,
        room_code: item.room_code,
        room_name: item.room_name,
        lecturer_names: item.lecturer_names,
        sks: getDisplayedSks(item),
        isConflict: false,
        raw: item,
      };
    });
  }, [filtered]);

  // All entries for right rail
  const allRailEntries: AppleScheduleCardData[] = useMemo(() => {
    return schedules.map((item) => {
      return {
        id: item.id,
        course_name: item.course_name,
        course_code: item.course_code,
        class_name: item.class_name,
        start_time: item.start_time,
        end_time: item.end_time,
        room_code: item.room_code,
        room_name: item.room_name,
        lecturer_names: item.lecturer_names,
        sks: getDisplayedSks(item),
        isConflict: false,
        raw: item,
      };
    });
  }, [schedules]);

  return (
    <div className="relative min-h-screen space-y-6 pb-12">
      {/* Official Print Header (Only visible on browser print) */}
      <div className="hidden print:block text-center border-b-2 border-black pb-4 mb-6">
        <h1 className="text-xl font-bold tracking-wider">UNIVERSITAS MATARAM</h1>
        <h2 className="text-base font-semibold">FAKULTAS TEKNIK • JURUSAN TEKNIK ELEKTRO</h2>
        <h3 className="text-sm font-bold uppercase mt-2">
          JADWAL PERKULIAHAN RESMI SEMESTER {activeTerm?.semester_type || 'GANJIL'} TAHUN AKADEMIK{' '}
          {activeTerm?.academic_year || '2026/2027'}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Dicetak pada: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
        </p>
      </div>

      {loading ? (
        <LoadingState rows={8} message="Memuat jadwal perkuliahan resmi..." />
      ) : error ? (
        <ErrorState
          title="Gagal Memuat Jadwal"
          message={error}
          onRetry={fetchScheduleData}
        />
      ) : schedules.length === 0 ? (
        <EmptyState
          title="Belum Ada Jadwal Diterbitkan"
          description="Jadwal perkuliahan untuk semester aktif belum diterbitkan secara resmi. Silakan hubungi bagian akademik atau buat draf jadwal baru."
          action={
            role === 'ADMIN'
              ? {
                  label: 'Penyusunan Jadwal Baru',
                  onClick: () => navigate('/penyusunan-jadwal'),
                }
              : undefined
          }
        />
      ) : (
        /* Main 2-Column Desktop Layout (Weekly Calendar on Left, Right Rail on Right) */
        <div className="flex flex-col xl:flex-row gap-6 items-start">
          {/* Main Weekly Calendar */}
          <div className="flex-1 min-w-0 w-full space-y-4">
            <AppleWeeklyCalendar
              title="Jadwal Kuliah"
              subtitle="Kelola dan lihat jadwal perkuliahan resmi Jurusan Teknik Elektro Universitas Mataram"
              entries={calendarEntries}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onSelectEntry={(entry) => {
                setInspectedCard(entry);
                if (entry.raw) {
                  setSelectedSchedule(entry.raw);
                }
              }}
              onResetThisWeek={() => setSelectedDate(new Date())}
              actions={
                <div className="flex items-center gap-2">
                  {role === 'ADMIN' && (
                    <button
                      type="button"
                      disabled={creatingRevision}
                      onClick={handleCreateNewRevision}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{creatingRevision ? 'Membuat...' : 'Buat Revisi'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white/80 hover:bg-white border border-slate-200/80 rounded-xl transition-colors shadow-2xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Cetak</span>
                  </button>
                </div>
              }
              filterControls={
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  {/* Search Bar */}
                  <div className="flex-1 max-w-sm relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Cari mata kuliah, dosen, ruangan..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white/80 text-slate-800 placeholder-slate-400"
                    />
                  </div>

                  {/* Filter Selectors */}
                  <div className="flex flex-wrap items-center gap-2">
                    {role === 'DOSEN' && (
                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/80 border border-blue-200/80 rounded-xl text-2xs font-semibold text-blue-900 cursor-pointer shadow-2xs">
                        <input
                          type="checkbox"
                          checked={onlyMySchedule}
                          onChange={(e) => setOnlyMySchedule(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-0"
                        />
                        <span>Jadwal Saya</span>
                      </label>
                    )}

                    <select
                      value={dayFilter}
                      onChange={(e) => setDayFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-2xs font-semibold border border-slate-200/80 rounded-xl bg-white/80 text-slate-700 focus:outline-none"
                    >
                      <option value="all">Semua Hari</option>
                      {daysList.map((d) => (
                        <option key={d.name} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-2xs font-semibold border border-slate-200/80 rounded-xl bg-white/80 text-slate-700 focus:outline-none"
                    >
                      <option value="all">Semua Kelas</option>
                      <option value="A">Kelas A</option>
                      <option value="B">Kelas B</option>
                      <option value="C">Kelas C</option>
                    </select>

                    {/* View mode toggle */}
                    <div className="flex items-center p-0.5 rounded-xl bg-slate-200/60 text-2xs">
                      <button
                        type="button"
                        onClick={() => setViewMode('MATRIKS')}
                        className={cn(
                          'px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer',
                          viewMode === 'MATRIKS'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        )}
                      >
                        Matriks
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('TABEL')}
                        className={cn(
                          'px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer',
                          viewMode === 'TABEL'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        )}
                      >
                        Tabel
                      </button>
                    </div>
                  </div>
                </div>
              }
            />

            {/* If user toggled to Tabel View */}
            {viewMode === 'TABEL' && (
              <div
                className="p-5 shadow-[0_8px_30px_rgba(15,23,42,0.035)] space-y-4"
                style={{
                  background: 'rgba(255, 255, 255, 0.75)',
                  backdropFilter: 'blur(20px) saturate(160%)',
                  border: '1px solid rgba(255, 255, 255, 0.85)',
                  borderRadius: '24px',
                }}
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Tabel Daftar Perkuliahan Resmi ({filtered.length} Mata Kuliah)
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase text-3xs border-b border-slate-100">
                      <tr>
                        <th className="py-2.5 px-3">Hari</th>
                        <th className="py-2.5 px-3">Waktu</th>
                        <th className="py-2.5 px-3">Mata Kuliah</th>
                        <th className="py-2.5 px-3">Kelas</th>
                        <th className="py-2.5 px-3">SKS</th>
                        <th className="py-2.5 px-3">Ruangan</th>
                        <th className="py-2.5 px-3">Dosen Pengampu</th>
                        <th className="py-2.5 px-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/80">
                      {filtered.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                          onClick={() => handleOpenDetail(item)}
                        >
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {getDayName(item)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            {item.start_time} – {item.end_time}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {item.course_name}
                            <span className="block font-mono text-3xs text-slate-400 font-normal">
                              {item.course_code}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200/60">
                              {item.class_name}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">
                            {getDisplayedSks(item)} SKS
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {item.room_code || item.room_name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 truncate max-w-xs">
                            {Array.isArray(item.lecturer_names)
                              ? item.lecturer_names.join(', ')
                              : item.lecturer_names}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetail(item);
                              }}
                              className="px-2.5 py-1 text-2xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              Detail
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right Rail: Jadwal Hari Ini + Mini Calendar / Inspector */}
          <div className="w-full xl:w-[320px] 2xl:w-[340px] shrink-0">
            <AppleRightRail
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              allEntries={allRailEntries}
              inspectedEntry={inspectedCard}
              onCloseInspector={() => setInspectedCard(null)}
              onApplyReschedule={async (entry, newDay, newStartMin, newRoomId) => {
                if (entry.raw) {
                  setSelectedSchedule(entry.raw);
                  setIsDetailDrawerOpen(true);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Published Schedule Detail & Rescheduling Drawer */}
      <PublishedScheduleDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => {
          setIsDetailDrawerOpen(false);
          setSelectedSchedule(null);
        }}
        selectedSchedule={selectedSchedule}
        allSchedules={schedules}
        activeTerm={activeTerm}
        isAdmin={role === 'ADMIN'}
      />
    </div>
  );
};
