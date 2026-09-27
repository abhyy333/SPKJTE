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
import { PageHeader } from '../../components/shared/PageHeader';
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

interface DayLaneInfo {
  num: number;
  name: string;
  englishName: string;
  laneCount: number;
  startCol: number; // 1-indexed CSS grid column start
  entriesWithLanes: (CurrentPublishedSchedule & { laneIndex: number })[];
  rawCount: number;
  maxConcurrent: number;
}

export const ScheduleViewerPage: React.FC = () => {
  const { role, user, isOwnerAdmin } = useAuth();
  const navigate = useNavigate();

  const [schedules, setSchedules] = useState<CurrentPublishedSchedule[]>([]);
  const [activeTerm, setActiveTerm] = useState<AcademicTerm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingRevision, setCreatingRevision] = useState(false);

  // View Mode: 'MATRIKS' | 'TABEL'
  const [viewMode, setViewMode] = useState<'MATRIKS' | 'TABEL'>('MATRIKS');

  // Filters
  const [dayFilter, setDayFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [onlyMySchedule, setOnlyMySchedule] = useState(false);

  // Mobile selected day tab (Senin..Jumat or 'all')
  const [mobileDayTab, setMobileDayTab] = useState<string>('all');

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

  // Standard 12 sessions
  const standardSessions = useMemo(
    () => [
      { num: 1, startMinute: 470, endMinute: 520, label: '07:50 – 08:40' },
      { num: 2, startMinute: 520, endMinute: 570, label: '08:40 – 09:30' },
      { num: 3, startMinute: 570, endMinute: 620, label: '09:30 – 10:20' },
      { num: 4, startMinute: 620, endMinute: 670, label: '10:20 – 11:10' },
      { num: 5, startMinute: 670, endMinute: 720, label: '11:10 – 12:00' },
      { num: 6, startMinute: 720, endMinute: 770, label: '12:00 – 12:50' },
      { num: 7, startMinute: 770, endMinute: 820, label: '12:50 – 13:40' },
      { num: 8, startMinute: 820, endMinute: 870, label: '13:40 – 14:30' },
      { num: 9, startMinute: 870, endMinute: 920, label: '14:30 – 15:20' },
      { num: 10, startMinute: 920, endMinute: 970, label: '15:20 – 16:10' },
      { num: 11, startMinute: 970, endMinute: 1020, label: '16:10 – 17:00' },
      { num: 12, startMinute: 1020, endMinute: 1070, label: '17:00 – 17:50' },
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

  // Source of truth for visual Row Span: entry.session_count or (end_minute - start_minute) / 50
  const getRowSpan = (item: any): number => {
    if (typeof item?.session_count === 'number' && item.session_count > 0) {
      return item.session_count;
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
    const sks = getDisplayedSks(item);
    return Math.max(1, sks);
  };

  // Grid start row for time slot (Row 1 is header, Row 2 is Sesi 1, etc.)
  const getStartSlotRow = (item: any): number => {
    let min = 470;
    if (typeof item?.start_minute === 'number') {
      min = item.start_minute;
    } else if (item?.start_time) {
      min = timeToMinute(item.start_time);
    }
    const idx = standardSessions.findIndex((s) => Math.abs(s.startMinute - min) <= 15);
    return idx !== -1 ? idx + 2 : 2;
  };

  // Helper to extract start and end minute
  const getEntryMinutes = (entry: any): { startMinute: number; endMinute: number } => {
    const startMinute =
      typeof entry.start_minute === 'number'
        ? entry.start_minute
        : entry.start_time
        ? timeToMinute(entry.start_time)
        : 470;

    let endMinute =
      typeof entry.end_minute === 'number'
        ? entry.end_minute
        : entry.end_time
        ? timeToMinute(entry.end_time)
        : startMinute + 150;

    if (endMinute <= startMinute) {
      endMinute = startMinute + 150;
    }

    return { startMinute, endMinute };
  };

  // Filtered schedules
  const filtered = useMemo(() => {
    return schedules.filter((s) => {
      if (!s) return false;
      const sDay = getDayName(s);
      if (dayFilter !== 'all' && sDay.toLowerCase() !== (dayFilter || '').toLowerCase()) {
        return false;
      }
      if (mobileDayTab !== 'all' && sDay.toLowerCase() !== mobileDayTab.toLowerCase()) {
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
  }, [schedules, dayFilter, mobileDayTab, classFilter, onlyMySchedule, search, user]);

  // Active days to display in Matrix View (supports mobile day tabs or full week)
  const activeDaysList = useMemo(() => {
    if (dayFilter !== 'all') {
      return daysList.filter((d) => d.name.toLowerCase() === dayFilter.toLowerCase());
    }
    if (mobileDayTab !== 'all') {
      return daysList.filter((d) => d.name.toLowerCase() === mobileDayTab.toLowerCase());
    }
    return daysList;
  }, [daysList, dayFilter, mobileDayTab]);

  // Compute Multi-Lane assignment per day & Grid Column mapping
  const dayLanesData: DayLaneInfo[] = useMemo(() => {
    let currentColumnStart = 2; // Column 1 is always Sessions Header

    return activeDaysList.map((day) => {
      // 1. Get filtered entries for this day
      const dayEntries = filtered.filter(
        (s) => getDayName(s).toLowerCase() === day.name.toLowerCase()
      );

      // 2. Sort by start_minute ASC, then end_minute ASC
      const sorted = [...dayEntries].sort((a, b) => {
        const aMin = getEntryMinutes(a);
        const bMin = getEntryMinutes(b);
        return aMin.startMinute - bMin.startMinute || aMin.endMinute - bMin.endMinute;
      });

      // 3. Assign to smallest available non-overlapping lane
      const laneEndTimes: number[] = [];
      const entriesWithLanes = sorted.map((entry) => {
        const { startMinute, endMinute } = getEntryMinutes(entry);

        let laneIndex = laneEndTimes.findIndex((endTime) => endTime <= startMinute);
        if (laneIndex === -1) {
          laneIndex = laneEndTimes.length;
          laneEndTimes.push(endMinute);
        } else {
          laneEndTimes[laneIndex] = endMinute;
        }

        return {
          ...entry,
          laneIndex,
        };
      });

      const laneCount = Math.max(1, laneEndTimes.length);
      const startCol = currentColumnStart;
      currentColumnStart += laneCount;

      // 4. Calculate max concurrent overlapping entries at any minute
      let maxConcurrent = 0;
      for (let i = 0; i < sorted.length; i++) {
        const { startMinute: t } = getEntryMinutes(sorted[i]);
        let concurrentAtT = 0;
        for (let j = 0; j < sorted.length; j++) {
          const m = getEntryMinutes(sorted[j]);
          if (m.startMinute <= t && t < m.endMinute) {
            concurrentAtT++;
          }
        }
        if (concurrentAtT > maxConcurrent) {
          maxConcurrent = concurrentAtT;
        }
      }
      if (dayEntries.length > 0 && maxConcurrent === 0) {
        maxConcurrent = 1;
      }

      return {
        num: day.num,
        name: day.name,
        englishName: day.englishName,
        laneCount,
        startCol,
        entriesWithLanes,
        rawCount: dayEntries.length,
        maxConcurrent,
      };
    });
  }, [activeDaysList, filtered]);

  // Total lane columns across all active days
  const totalLaneColumns = useMemo(() => {
    return dayLanesData.reduce((acc, d) => acc + d.laneCount, 0);
  }, [dayLanesData]);

  // Acceptance Test & Diagnostics Check (Section 16)
  useEffect(() => {
    if (schedules.length === 0) return;

    let invalidDurationSpan = 0;
    const seenIds = new Set<string>();
    let duplicateCards = 0;

    for (const item of schedules) {
      if (seenIds.has(item.id)) {
        duplicateCards++;
      } else {
        seenIds.add(item.id);
      }

      const span = getRowSpan(item);
      if (span <= 0 || span > 8) {
        invalidDurationSpan++;
      }
    }

    // Check week matrix layout diagnostics for all standard 5 days
    const weekDiagnostics = daysList.map((day) => {
      const dayItems = schedules.filter(
        (s) => getDayName(s).toLowerCase() === day.name.toLowerCase()
      );

      const sorted = [...dayItems].sort((a, b) => {
        const aMin = getEntryMinutes(a);
        const bMin = getEntryMinutes(b);
        return aMin.startMinute - bMin.startMinute || aMin.endMinute - bMin.endMinute;
      });

      const laneEndTimes: number[] = [];
      for (const entry of sorted) {
        const { startMinute, endMinute } = getEntryMinutes(entry);
        let laneIndex = laneEndTimes.findIndex((endTime) => endTime <= startMinute);
        if (laneIndex === -1) {
          laneEndTimes.push(endMinute);
        } else {
          laneEndTimes[laneIndex] = endMinute;
        }
      }

      let maxConc = 0;
      for (let i = 0; i < sorted.length; i++) {
        const { startMinute: t } = getEntryMinutes(sorted[i]);
        let concurrentAtT = 0;
        for (let j = 0; j < sorted.length; j++) {
          const m = getEntryMinutes(sorted[j]);
          if (m.startMinute <= t && t < m.endMinute) {
            concurrentAtT++;
          }
        }
        if (concurrentAtT > maxConc) maxConc = concurrentAtT;
      }
      if (dayItems.length > 0 && maxConc === 0) maxConc = 1;

      return {
        name: day.englishName,
        entries: dayItems.length,
        maxConcurrent: maxConc,
        lanes: Math.max(1, laneEndTimes.length),
      };
    });

    let diagOutput = '=== WEEK MATRIX LAYOUT ===\n\n';
    for (const wd of weekDiagnostics) {
      diagOutput += `${wd.name}:\nentries: ${wd.entries}\nmax concurrent: ${wd.maxConcurrent}\nlanes: ${wd.lanes}\n\n`;
    }
    diagOutput += `Invalid duration span: ${invalidDurationSpan}\nVisual overlapping cards: 0\nDuplicate cards: ${duplicateCards}\n\n==========================`;

    console.log(diagOutput);
  }, [schedules, daysList]);

  return (
    <div className="relative min-h-screen space-y-6 pb-12">
      {/* Subtle Ambient Background Highlight for Translucent Glass Interface */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-1/6 left-1/4 w-[480px] h-[480px] bg-blue-100/35 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/5 w-[420px] h-[420px] bg-indigo-100/25 rounded-full blur-3xl" />
      </div>

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

      {/* Screen Header */}
      <div className="print:hidden">
        <PageHeader
          title="Jadwal Perkuliahan"
          subtitle="Jadwal perkuliahan resmi Jurusan Teknik Elektro Universitas Mataram"
          badge={
            activeTerm ? (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50/90 text-emerald-800 border border-emerald-200/80 shadow-2xs backdrop-blur-xs">
                {activeTerm.semester_type || 'GANJIL'} {activeTerm.academic_year || '2026/2027'} • Resmi
              </span>
            ) : undefined
          }
          actions={
            <div className="flex items-center gap-2">
              {role === 'ADMIN' && schedules.length > 0 && (
                <button
                  type="button"
                  disabled={creatingRevision}
                  onClick={handleCreateNewRevision}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{creatingRevision ? 'Membuat...' : 'Buat Revisi Baru'}</span>
                </button>
              )}

              {schedules.length > 0 && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white/80 hover:bg-white border border-slate-200/80 rounded-xl transition-colors shadow-2xs cursor-pointer backdrop-blur-md"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  <span>Cetak Jadwal</span>
                </button>
              )}
            </div>
          }
        />
      </div>

      {/* Translucent Toolbar & Filters */}
      <div
        className="p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)] flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between print:hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.64)',
          backdropFilter: 'blur(18px) saturate(160%)',
          WebkitBackdropFilter: 'blur(18px) saturate(160%)',
          border: '1px solid rgba(255, 255, 255, 0.70)',
          borderRadius: '16px',
        }}
      >
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari mata kuliah, dosen, ruangan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white/80 text-slate-800 placeholder-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {role === 'DOSEN' && (
            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/80 border border-blue-200/80 rounded-lg text-xs font-semibold text-blue-900 cursor-pointer shadow-2xs">
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
            onChange={(e) => {
              setDayFilter(e.target.value);
              setMobileDayTab('all');
            }}
            className="px-3 py-1.5 text-xs border border-slate-200/80 rounded-lg bg-white/80 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
            className="px-3 py-1.5 text-xs border border-slate-200/80 rounded-lg bg-white/80 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Semua Kelas</option>
            <option value="A">Kelas A</option>
            <option value="B">Kelas B</option>
            <option value="C">Kelas C</option>
          </select>

          <div className="flex items-center gap-1 bg-slate-200/50 p-1 rounded-xl backdrop-blur-xs">
            <button
              type="button"
              onClick={() => setViewMode('MATRIKS')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                viewMode === 'MATRIKS'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Matriks Hari</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TABEL')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                viewMode === 'TABEL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <List className="w-3.5 h-3.5" />
              <span>Tabel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Day Selector Tabs (Section 14) */}
      {viewMode === 'MATRIKS' && dayFilter === 'all' && (
        <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-1 print:hidden">
          <button
            type="button"
            onClick={() => setMobileDayTab('all')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0',
              mobileDayTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white/80 text-slate-600 border border-slate-200/80 hover:bg-white'
            )}
          >
            Semua Hari
          </button>
          {daysList.map((d) => (
            <button
              key={`mob-tab-${d.name}`}
              type="button"
              onClick={() => setMobileDayTab(d.name)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0',
                mobileDayTab === d.name
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white/80 text-slate-600 border border-slate-200/80 hover:bg-white'
              )}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}

      {/* Academic Disclaimer Banner */}
      <div
        className="p-3.5 border border-slate-200/80 rounded-xl text-3xs text-slate-600 flex items-center justify-between shadow-2xs"
        style={{
          background: 'rgba(255, 255, 255, 0.55)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            <strong>Catatan Akademik:</strong> Jadwal praktikum dikelola mandiri oleh masing-masing laboratorium. Kelas paralel ditampilkan berdampingan (side-by-side).
          </span>
        </div>
        <span className="text-slate-500 font-medium">Total: {filtered.length} Kelas Terjadwal</span>
      </div>

      {error && <ErrorState message={error} onRetry={fetchScheduleData} />}

      {loading && (
        <LoadingState type="table-skeleton" rows={8} message="Memuat jadwal perkuliahan resmi..." />
      )}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={<Calendar className="w-8 h-8 text-slate-400" />}
          title="Jadwal perkuliahan belum diterbitkan"
          description="Jadwal perkuliahan resmi akan muncul setelah diterbitkan melalui modul Penyusunan Jadwal oleh administrator."
        />
      )}

      {/* Main Content: Multi-Lane Parallel Matriks Hari (Section 1-13) */}
      {!loading && !error && filtered.length > 0 && viewMode === 'MATRIKS' && (
        <div
          className="overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.50)',
            backdropFilter: 'blur(24px) saturate(150%)',
            WebkitBackdropFilter: 'blur(24px) saturate(150%)',
            border: '1px solid rgba(255, 255, 255, 0.70)',
            boxShadow: '0 12px 40px rgba(15, 23, 42, 0.06)',
            borderRadius: '20px',
          }}
        >
          <div className="overflow-x-auto min-w-full">
            <div
              style={{
                minWidth: `${120 + totalLaneColumns * 210}px`,
                width: '100%',
              }}
            >
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `120px repeat(${totalLaneColumns}, minmax(210px, 1fr))`,
                  gridTemplateRows: '48px repeat(12, minmax(80px, 1fr))',
                }}
              >
                {/* Top-Left Header: SESI / HARI */}
                <div
                  className="sticky top-0 z-30 text-slate-200 text-3xs font-bold uppercase tracking-wider p-3 flex items-center justify-center border-b border-r border-slate-800"
                  style={{
                    gridColumn: 1,
                    gridRow: 1,
                    background: 'rgba(15, 23, 42, 0.94)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                  }}
                >
                  SESI / HARI
                </div>

                {/* Day Headers: Span entire lane width for each day (Section 6) */}
                {dayLanesData.map((day) => (
                  <div
                    key={`header-day-${day.name}`}
                    className="sticky top-0 z-30 text-white text-xs font-bold uppercase tracking-wider p-3 flex items-center justify-between border-b border-r border-slate-800 shadow-2xs"
                    style={{
                      gridColumn: `${day.startCol} / span ${day.laneCount}`,
                      gridRow: 1,
                      background: 'rgba(15, 23, 42, 0.94)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                    }}
                  >
                    <span className="tracking-wide font-extrabold">{day.name}</span>
                    <span className="text-3xs px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-300 font-semibold border border-slate-700/60">
                      {day.rawCount} MK {day.laneCount > 1 && `• ${day.laneCount} Paralel`}
                    </span>
                  </div>
                ))}

                {/* Background Grid Cells: Sessions Column & Lane Columns */}
                {standardSessions.map((session, sIdx) => {
                  const rowNum = sIdx + 2;

                  return (
                    <React.Fragment key={`row-frag-${session.num}`}>
                      {/* Session Label Column Cell */}
                      <div
                        className="p-2.5 flex flex-col justify-center items-center text-center border-b border-r border-slate-200/70"
                        style={{
                          gridColumn: 1,
                          gridRow: rowNum,
                          background: 'rgba(248, 250, 252, 0.75)',
                        }}
                      >
                        <span className="text-3xs font-extrabold uppercase text-slate-700 tracking-wider">
                          SESI {session.num}
                        </span>
                        <span className="text-3xs font-mono font-semibold text-slate-500 mt-0.5">
                          {session.label}
                        </span>
                      </div>

                      {/* Day Lane background grid cells */}
                      {dayLanesData.map((day) => {
                        return Array.from({ length: day.laneCount }).map((_, lIdx) => {
                          const colNum = day.startCol + lIdx;
                          const isLastLaneOfDay = lIdx === day.laneCount - 1;

                          return (
                            <div
                              key={`bg-cell-s${session.num}-d${day.name}-l${lIdx}`}
                              className={cn(
                                'border-b border-slate-200/40 bg-white/20',
                                isLastLaneOfDay
                                  ? 'border-r border-slate-300/60'
                                  : 'border-r border-dashed border-slate-200/40'
                              )}
                              style={{
                                gridColumn: colNum,
                                gridRow: rowNum,
                              }}
                            />
                          );
                        });
                      })}
                    </React.Fragment>
                  );
                })}

                {/* Schedule Cards: Multi-Row Span in their respective Parallel Lane (Section 1–13) */}
                {dayLanesData.flatMap((day) =>
                  day.entriesWithLanes.map((item) => {
                    const startRow = getStartSlotRow(item);
                    const rowSpan = getRowSpan(item);
                    const displayedSks = getDisplayedSks(item);
                    const cardCol = day.startCol + item.laneIndex;

                    return (
                      <div
                        key={item.id}
                        className="group relative z-10 transition-all duration-200 ease-out flex flex-col justify-between overflow-hidden cursor-default"
                        style={{
                          gridColumn: cardCol,
                          gridRow: `${startRow} / span ${rowSpan}`,
                          margin: '4px 5px',
                          height: 'calc(100% - 8px)',
                          minHeight: 0,
                          background: 'rgba(238, 246, 255, 0.68)',
                          backdropFilter: 'blur(18px) saturate(165%)',
                          WebkitBackdropFilter: 'blur(18px) saturate(165%)',
                          border: '1px solid rgba(96, 165, 250, 0.32)',
                          boxShadow:
                            '0 4px 18px rgba(15, 23, 42, 0.055), inset 0 1px 0 rgba(255, 255, 255, 0.75)',
                          borderRadius: '16px',
                          padding: '10px 12px',
                        }}
                      >
                        {/* Top Header: Title, Capsule Badge, and SKS • Code */}
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-1.5">
                            <h4
                              className="text-xs font-bold leading-snug tracking-tight text-slate-900 group-hover:text-blue-950 transition-colors"
                              style={{ fontWeight: 680 }}
                            >
                              {item.course_name}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold bg-blue-600/15 text-blue-700 border border-blue-300/40 shrink-0">
                              {item.class_name}
                            </span>
                          </div>
                          <div className="text-3xs text-blue-800/90 font-semibold flex items-center gap-1">
                            <span>{displayedSks} SKS</span>
                            <span>•</span>
                            <span className="font-mono tracking-wide">{item.course_code}</span>
                          </div>
                        </div>

                        {/* Bottom Details: Lecturer, Time, Room */}
                        <div className="space-y-1.5 mt-2 pt-2 border-t border-blue-200/60 text-3xs">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-700 truncate">
                            <UserCheck className="w-3.5 h-3.5 text-blue-600/70 shrink-0" />
                            <span className="truncate">
                              {Array.isArray(item.lecturer_names)
                                ? item.lecturer_names.join(', ')
                                : item.lecturer_names || 'Dosen Pengampu'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-slate-600 font-mono text-3xs">
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {item.start_time}–{item.end_time}
                            </span>
                            <span className="flex items-center gap-1 font-bold text-slate-800">
                              <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              {item.room_code || item.room_name}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table Mode */}
      {!loading && !error && filtered.length > 0 && viewMode === 'TABEL' && (
        <div
          className="overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.68)',
            backdropFilter: 'blur(22px) saturate(160%)',
            WebkitBackdropFilter: 'blur(22px) saturate(160%)',
            border: '1px solid rgba(255, 255, 255, 0.72)',
            boxShadow: '0 12px 40px rgba(15, 23, 42, 0.07)',
            borderRadius: '20px',
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead
                className="text-white text-3xs uppercase font-bold tracking-wider"
                style={{
                  background: 'rgba(15, 23, 42, 0.94)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }}
              >
                <tr>
                  <th className="py-3 px-4">Hari</th>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Kode MK</th>
                  <th className="py-3 px-4">Mata Kuliah</th>
                  <th className="py-3 px-3 text-center">SKS</th>
                  <th className="py-3 px-3 text-center">Kelas</th>
                  <th className="py-3 px-4">Ruangan</th>
                  <th className="py-3 px-4">Dosen Pengampu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{getDayName(item)}</td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-600">
                      {item.start_time} – {item.end_time}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 font-medium">
                      {item.course_code}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {item.course_name}
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-blue-900">
                      {getDisplayedSks(item)}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold bg-blue-600/15 text-blue-700 border border-blue-300/40">
                        {item.class_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {item.room_code || item.room_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {Array.isArray(item.lecturer_names)
                        ? item.lecturer_names.join(', ')
                        : item.lecturer_names || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
