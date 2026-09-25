import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Download,
  Search,
} from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { schedulesService } from '../../services/schedules.service';
import { CurrentPublishedSchedule, AcademicTerm } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { ScheduleWorkspace } from '../../components/schedule/ScheduleWorkspace';

export const ScheduleViewerPage: React.FC = () => {
  const { role } = useAuth();

  // If role is ADMIN, render the Phase 3 manual scheduling workspace
  if (role === 'ADMIN') {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Jadwal Perkuliahan"
          subtitle="Susun dan evaluasi jadwal perkuliahan berdasarkan kelas aktif."
        />
        <ScheduleWorkspace />
      </div>
    );
  }

  // Otherwise (DOSEN or MAHASISWA), render the read-only published schedule viewer
  return <ReadOnlyScheduleViewer />;
};

const ReadOnlyScheduleViewer: React.FC = () => {
  const [schedules, setSchedules] = useState<CurrentPublishedSchedule[]>([]);
  const [activeTerm, setActiveTerm] = useState<AcademicTerm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dayFilter, setDayFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchScheduleData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, term] = await Promise.all([
        schedulesService.getPublishedSchedule({
          day: dayFilter,
          className: classFilter,
        }),
        schedulesService.getActiveTerm(),
      ]);
      setSchedules(list);
      setActiveTerm(term);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat jadwal perkuliahan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduleData();
  }, [dayFilter, classFilter]);

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

  const filtered = schedules.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const lNames = Array.isArray(s.lecturer_names) ? s.lecturer_names.join(' ') : String(s.lecturer_names);
    return (
      s.course_name.toLowerCase().includes(q) ||
      s.course_code.toLowerCase().includes(q) ||
      lNames.toLowerCase().includes(q) ||
      (s.room_code && s.room_code.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jadwal Perkuliahan"
        subtitle="Jadwal perkuliahan resmi Jurusan Teknik Elektro Universitas Mataram"
        badge={
          activeTerm ? (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {activeTerm.term || activeTerm.semester_type} {activeTerm.year || activeTerm.academic_year}
            </span>
          ) : undefined
        }
        actions={
          schedules.length > 0 ? (
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-400" />
              Cetak / Unduh Jadwal
            </button>
          ) : undefined
        }
      />

      {/* Toolbar Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari mata kuliah, dosen, ruangan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none"
          >
            <option value="all">Semua Hari</option>
            {days.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none"
          >
            <option value="all">Semua Kelas</option>
            <option value="A">Kelas A</option>
            <option value="B">Kelas B</option>
            <option value="C">Kelas C</option>
          </select>

          <button
            onClick={() => {
              setDayFilter('all');
              setClassFilter('all');
              setSearch('');
            }}
            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={fetchScheduleData} />}

      {loading && <LoadingState type="table-skeleton" rows={8} message="Memuat jadwal perkuliahan..." />}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={<Calendar className="w-8 h-8 text-slate-400" />}
          title="Jadwal perkuliahan belum diterbitkan"
          description="Jadwal perkuliahan resmi akan muncul setelah proses penyusunan dan penerbitan diselesaikan oleh administrator jurusan."
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-2xs">
                <tr>
                  <th className="py-3 px-4">Hari</th>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Mata Kuliah</th>
                  <th className="py-3 px-3 text-center">SKS</th>
                  <th className="py-3 px-3 text-center">Kelas</th>
                  <th className="py-3 px-4">Ruangan</th>
                  <th className="py-3 px-4">Dosen Pengampu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">{item.day}</td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {item.start_time} – {item.end_time}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{item.course_name}</p>
                      <span className="text-2xs text-slate-400">{item.course_code}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700">{item.sks}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded font-bold bg-blue-50 text-blue-700 text-xs">
                        {item.class_name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {item.room_code || item.room_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {Array.isArray(item.lecturer_names)
                        ? item.lecturer_names.join(', ')
                        : item.lecturer_names}
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
