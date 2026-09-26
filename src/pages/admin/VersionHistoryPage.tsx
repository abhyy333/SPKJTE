import React, { useState, useEffect } from 'react';
import {
  History,
  Send,
  Layers,
  RotateCcw,
  Plus,
  Download,
  Eye,
  Scale,
  ArrowRight,
  X,
  Copy,
} from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { versionsService } from '../../services/versions.service';
import { scheduleVersionsService } from '../../services/scheduleVersions.service';
import { ScheduleVersion } from '../../types';
import { formatDateTimeIndo } from '../../lib/utils';
import { VersionComparisonModal } from '../../components/schedule/versioning/VersionComparisonModal';
import { toast } from '../../components/ui/Toast';

export const VersionHistoryPage: React.FC = () => {
  const [versions, setVersions] = useState<ScheduleVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    recentChanges: 0,
    rollbackAvailable: 0,
  });

  // Comparison State
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compVersionAId, setCompVersionAId] = useState<string>('');
  const [compVersionBId, setCompVersionBId] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchVersionsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, s] = await Promise.all([
        versionsService.getVersions(),
        versionsService.getStats(),
      ]);
      setVersions(list);
      setStats(s);
      if (list.length > 1) {
        setCompVersionAId(list[0].id);
        setCompVersionBId(list[1].id);
      } else if (list.length > 0) {
        setCompVersionAId(list[0].id);
        setCompVersionBId(list[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat riwayat versi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersionsData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Riwayat Versi Jadwal"
        subtitle="Lacak dan kelola perubahan jadwal perkuliahan dari waktu ke waktu"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setToastMessage('Pembuatan versi baru dilakukan secara otomatis saat optimasi jadwal disimpan.')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Simpan Versi Baru
            </button>
            <button
              onClick={() => setToastMessage('Laporan riwayat versi akan diekspor dalam format audit trail.')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl transition-colors shadow-2xs"
            >
              <Download className="w-4 h-4 text-slate-400" />
              Unduh Riwayat
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
          title="Total Versi"
          value={stats.total}
          icon={<History className="w-6 h-6" />}
          iconBgColor="bg-blue-50 text-blue-600"
          subtitle="seluruh versi jadwal tercatat"
        />

        <StatCard
          title="Versi Terbit"
          value={stats.published}
          icon={<Send className="w-6 h-6" />}
          iconBgColor="bg-emerald-50 text-emerald-600"
          subtitle="versi yang dipublikasikan"
        />

        <StatCard
          title="Perubahan Minggu Ini"
          value={stats.recentChanges}
          icon={<Layers className="w-6 h-6" />}
          iconBgColor="bg-purple-50 text-purple-600"
          subtitle="revisi pada 7 hari terakhir"
        />

        <StatCard
          title="Rollback Tersedia"
          value={stats.rollbackAvailable}
          icon={<RotateCcw className="w-6 h-6" />}
          iconBgColor="bg-rose-50 text-rose-600"
          subtitle="dapat kembali ke versi sebelumnya"
        />
      </div>

      {/* Version Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <h4 className="text-sm font-bold text-slate-800">Daftar Riwayat Versi</h4>
          </div>
          <span className="text-2xs text-slate-400">Read-Only pada Phase 1</span>
        </div>

        {error && (
          <div className="p-4">
            <ErrorState message={error} onRetry={fetchVersionsData} />
          </div>
        )}

        {loading && <LoadingState type="table-skeleton" rows={5} />}

        {!loading && !error && versions.length === 0 && (
          <div className="p-8">
            <EmptyState
              title="Belum ada riwayat versi jadwal"
              description="Versi jadwal akan tercatat saat administrator menyimpan atau mempublikasikan jadwal perkuliahan."
            />
          </div>
        )}

        {!loading && !error && versions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-2xs">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">No</th>
                  <th className="py-3 px-4">Versi</th>
                  <th className="py-3 px-4">Tanggal Pembuatan</th>
                  <th className="py-3 px-4">Pembuat</th>
                  <th className="py-3 px-5">Ringkasan Perubahan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {versions.map((ver, idx) => (
                  <tr key={ver.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-3 text-center text-slate-400 font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-blue-600 font-mono">
                      {ver.version_number || `v1.${idx}.0`}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {formatDateTimeIndo(ver.created_at)}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {ver.created_by || 'Admin Jurusan'}
                    </td>
                    <td className="py-3 px-5 text-slate-600">
                      {ver.changelog || ver.title || 'Penyesuaian slot waktu dan ruangan kelas.'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        label={ver.status === 'PUBLISHED' ? 'Terbit' : ver.status}
                        variant={ver.status === 'PUBLISHED' ? 'aktif' : 'draft'}
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            if (versions.length > 1) {
                              setCompVersionAId(versions[0].id);
                              setCompVersionBId(ver.id);
                              setCompareModalOpen(true);
                            } else {
                              toast.info('Diperlukan minimal dua versi jadwal untuk melakukan komparasi.');
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Scale className="w-3 h-3 text-purple-600" />
                          Bandingkan
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Version Comparison Modal */}
      <VersionComparisonModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        versions={versions}
        initialVersionAId={compVersionAId}
        initialVersionBId={compVersionBId}
      />
    </div>
  );
};
