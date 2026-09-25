import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Users,
  DoorClosed,
  AlertTriangle,
  Download,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { schedulesService } from '../../services/schedules.service';
import { CurrentPublishedExam } from '../../types';
import { formatDateIndo } from '../../lib/utils';

export const ExamSchedulePage: React.FC = () => {
  const [examType, setExamType] = useState<'UTS' | 'UAS'>('UTS');
  const [exams, setExams] = useState<CurrentPublishedExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadExams() {
      setLoading(true);
      setError(null);
      try {
        const list = await schedulesService.getPublishedExams(examType);
        setExams(list);
      } catch (err: any) {
        setError(err.message || 'Gagal memuat jadwal ujian.');
      } finally {
        setLoading(false);
      }
    }
    loadExams();
  }, [examType]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jadwal Ujian"
        subtitle="Sistem Pendukung Keputusan Penjadwalan Ujian Perkuliahan"
        actions={
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs cursor-pointer">
              <Sparkles className="w-4 h-4" />
              Susun Ujian
            </button>
            <button className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl transition-colors shadow-2xs">
              <Download className="w-4 h-4 text-slate-400" />
              Unduh PDF
            </button>
          </div>
        }
      />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Sesi Ujian"
          value={exams.length}
          icon={<CalendarCheck className="w-6 h-6" />}
          iconBgColor="bg-blue-50 text-blue-600"
          subtitle={`sesi ujian ${examType}`}
        />

        <StatCard
          title="Ruangan Digunakan"
          value={new Set(exams.map((e) => e.room_code)).size || 0}
          icon={<DoorClosed className="w-6 h-6" />}
          iconBgColor="bg-purple-50 text-purple-600"
          subtitle="ruangan kelas & lab"
        />

        <StatCard
          title="Status Publikasi"
          value={exams.length > 0 ? 'Diterbitkan' : 'Belum Ada'}
          icon={<Calendar className="w-6 h-6" />}
          iconBgColor="bg-emerald-50 text-emerald-600"
          subtitle="periode semester aktif"
        />

        <StatCard
          title="Jadwal Bentrok"
          value="0"
          icon={<AlertTriangle className="w-6 h-6" />}
          iconBgColor="bg-rose-50 text-rose-600"
          subtitle="tidak ada bentrok ujian"
        />
      </div>

      {/* UTS / UAS Tabs */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExamType('UTS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                examType === 'UTS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Ujian Tengah Semester (UTS)
            </button>
            <button
              onClick={() => setExamType('UAS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                examType === 'UAS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Ujian Akhir Semester (UAS)
            </button>
          </div>
          <span className="text-2xs text-slate-400 font-medium">Ganjil 2024/2025</span>
        </div>

        {error && (
          <div className="p-4">
            <ErrorState message={error} />
          </div>
        )}

        {loading && <LoadingState type="table-skeleton" rows={5} />}

        {!loading && !error && exams.length === 0 && (
          <div className="p-8">
            <EmptyState
              icon={<CalendarCheck className="w-8 h-8 text-slate-400" />}
              title={`Belum ada jadwal ${examType} yang diterbitkan`}
              description={`Jadwal ${examType} resmi akan ditampilkan setelah disusun dan dipublikasikan oleh bagian akademik jurusan.`}
            />
          </div>
        )}

        {!loading && !error && exams.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-2xs">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Tanggal & Hari</th>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Mata Kuliah</th>
                  <th className="py-3 px-3 text-center">Kelas</th>
                  <th className="py-3 px-4">Ruangan</th>
                  <th className="py-3 px-4">Pengawas</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exams.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-center text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {formatDateIndo(item.date)}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {item.start_time} – {item.end_time}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{item.course_name}</p>
                      <span className="text-2xs text-slate-400">{item.course_code}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded font-bold bg-blue-50 text-blue-700 text-xs">
                        {item.class_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {item.room_code || 'R. Ujian'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {item.proctor_names || 'Tim Dosen Pengawas'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge label={item.status || 'Terjadwal'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
