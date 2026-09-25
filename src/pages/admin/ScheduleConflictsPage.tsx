import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Users,
  DoorClosed,
  GraduationCap,
  RotateCcw,
  Sparkles,
  Download,
  Search,
  Filter,
  MoreVertical,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { conflictsService } from '../../services/conflicts.service';
import { ScheduleConflict, ScheduleSuggestion } from '../../types';

export const ScheduleConflictsPage: React.FC = () => {
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    lecturerConflicts: 0,
    roomConflicts: 0,
    studentConflicts: 0,
  });

  // Filters
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchConflictsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, sList, s] = await Promise.all([
        conflictsService.getConflicts({
          severity: severityFilter,
          type: typeFilter,
        }),
        conflictsService.getSuggestions(),
        conflictsService.getStats(),
      ]);
      setConflicts(list);
      setSuggestions(sList);
      setStats(s);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat konflik jadwal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConflictsData();
  }, [severityFilter, typeFilter]);

  const filteredConflicts = conflicts.filter((c) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (c.title && c.title.toLowerCase().includes(s)) ||
      (c.description && c.description.toLowerCase().includes(s)) ||
      (c.conflict_source && c.conflict_source.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Konflik Jadwal"
        subtitle="Deteksi dan selesaikan bentrok jadwal perkuliahan, dosen, ruangan, dan mahasiswa"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                fetchConflictsData();
                setToastMessage('Pemeriksaan ulang bentrok jadwal telah selesai dijalankan.');
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Deteksi Ulang
            </button>
            <button
              onClick={() =>
                setToastMessage('Penerapan otomatis seluruh saran akan aktif pada Phase optimasi.')
              }
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Terapkan Saran
            </button>
            <button
              onClick={() => setToastMessage('Laporan konflik dapat diunduh pada fase pelaporan.')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl transition-colors shadow-2xs"
            >
              <Download className="w-4 h-4 text-slate-400" />
              Unduh Laporan
            </button>
          </div>
        }
      />

      {toastMessage && (
        <div className="p-3 bg-sky-50 border border-sky-200 text-sky-800 text-xs rounded-xl flex items-center justify-between">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="font-semibold underline ml-3">
            Tutup
          </button>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Konflik"
          value={stats.total}
          icon={<AlertTriangle className="w-6 h-6" />}
          iconBgColor="bg-rose-50 text-rose-600"
          subtitle="perlu segera diselesaikan"
        />

        <StatCard
          title="Bentrok Dosen"
          value={stats.lecturerConflicts}
          icon={<Users className="w-6 h-6" />}
          iconBgColor="bg-blue-50 text-blue-600"
          subtitle="dosen mengajar bersamaan"
        />

        <StatCard
          title="Bentrok Ruangan"
          value={stats.roomConflicts}
          icon={<DoorClosed className="w-6 h-6" />}
          iconBgColor="bg-purple-50 text-purple-600"
          subtitle="ruangan dipakai ganda"
        />

        <StatCard
          title="Konflik Mahasiswa"
          value={stats.studentConflicts}
          icon={<GraduationCap className="w-6 h-6" />}
          iconBgColor="bg-emerald-50 text-emerald-600"
          subtitle="irisan kelas angkatan sama"
        />
      </div>

      {/* Table & Suggestions side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Conflicts Table */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none"
              >
                <option value="all">Semua Tingkat</option>
                <option value="kritis">Kritis</option>
                <option value="tinggi">Tinggi</option>
                <option value="sedang">Sedang</option>
                <option value="rendah">Rendah</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none"
              >
                <option value="all">Semua Jenis Konflik</option>
                <option value="LECTURER">Dosen</option>
                <option value="ROOM">Ruangan</option>
                <option value="STUDENT">Mahasiswa / Kelas</option>
                <option value="CAPACITY">Kapasitas</option>
              </select>

              <button
                onClick={() => {
                  setSeverityFilter('all');
                  setTypeFilter('all');
                  setSearch('');
                }}
                className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800"
              >
                Reset
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari konflik..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none w-48"
              />
            </div>
          </div>

          {error && (
            <div className="p-4">
              <ErrorState message={error} onRetry={fetchConflictsData} />
            </div>
          )}

          {loading && <LoadingState type="table-skeleton" rows={5} />}

          {!loading && !error && filteredConflicts.length === 0 && (
            <div className="p-8">
              <EmptyState
                icon={<CheckCircle2 className="w-8 h-8 text-emerald-500" />}
                title="Tidak ada konflik jadwal yang terdeteksi"
                description="Semua alokasi dosen, ruangan, dan kelas tidak memiliki bentrok waktu."
              />
            </div>
          )}

          {!loading && !error && filteredConflicts.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-2xs">
                  <tr>
                    <th className="py-3 px-3 w-8">#</th>
                    <th className="py-3 px-3">Tingkat</th>
                    <th className="py-3 px-3">Jenis</th>
                    <th className="py-3 px-4">Informasi Mata Kuliah</th>
                    <th className="py-3 px-3">Waktu</th>
                    <th className="py-3 px-3">Ruangan</th>
                    <th className="py-3 px-4">Sumber Konflik</th>
                    <th className="py-3 px-4">Saran Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredConflicts.map((c, i) => (
                    <tr key={c.id} className="hover:bg-rose-50/20 transition-colors">
                      <td className="py-3 px-3 text-slate-400 text-center font-medium">
                        {i + 1}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge label={c.severity} />
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-slate-100 text-slate-700">
                          {c.conflict_type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800">{c.title}</p>
                        <p className="text-2xs text-slate-500 mt-0.5">{c.description}</p>
                      </td>
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                        {c.time || c.day || 'Senin, 08:00'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          {c.room_code || 'R. Bentrok'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-2xs">
                        {c.conflict_source || 'Tabrakan jadwal dengan kelas lain di jam sama.'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-2xs">
                        {c.suggested_action || 'Pindahkan salah satu jadwal ke slot kosong.'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Saran Otomatis */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs h-fit space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Saran Relokasi Otomatis</h4>
            </div>
            <span className="text-2xs text-slate-400 font-medium">Algoritma SPK</span>
          </div>

          {suggestions.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              Belum ada saran tindakan otomatis untuk saat ini.
            </p>
          ) : (
            <div className="space-y-3">
              {suggestions.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
                >
                  <p className="text-xs font-semibold text-slate-800 leading-snug">
                    {s.description}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-3xs text-slate-400 uppercase font-semibold">
                      {s.suggestion_type}
                    </span>
                    <button
                      onClick={() =>
                        setToastMessage('Aksi otomatis akan dieksekusi pada Phase penjadwalan SA.')
                      }
                      className="px-2.5 py-1 text-2xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      Terapkan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
