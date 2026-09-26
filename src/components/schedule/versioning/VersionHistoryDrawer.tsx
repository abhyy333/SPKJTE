import React, { useState } from 'react';
import { ScheduleVersion } from '../../../types';
import { Drawer } from '../../ui/Drawer';
import {
  History,
  Copy,
  Scale,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { formatDateTimeIndo } from '../../../lib/utils';
import { scheduleVersionsService } from '../../../services/scheduleVersions.service';
import { toast } from '../../ui/Toast';

interface VersionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  versions: ScheduleVersion[];
  selectedVersionId: string;
  onSelectVersion: (versionId: string) => void;
  onOpenComparison: (versionAId: string, versionBId: string) => void;
  onVersionCreated: (newVersion: ScheduleVersion) => void;
  termId: string;
}

export const VersionHistoryDrawer: React.FC<VersionHistoryDrawerProps> = ({
  isOpen,
  onClose,
  versions,
  selectedVersionId,
  onSelectVersion,
  onOpenComparison,
  onVersionCreated,
  termId,
}) => {
  const [copyModalOpen, setCopyModalOpen] = useState<boolean>(false);
  const [sourceVersionToCopy, setSourceVersionToCopy] = useState<ScheduleVersion | null>(null);
  const [copyTitleInput, setCopyTitleInput] = useState<string>('');
  const [isCopying, setIsCopying] = useState<boolean>(false);

  const handleOpenCopy = (v: ScheduleVersion) => {
    setSourceVersionToCopy(v);
    setCopyTitleInput(`${v.title} (Salinan)`);
    setCopyModalOpen(true);
  };

  const handleConfirmCopy = async () => {
    if (!sourceVersionToCopy || !copyTitleInput.trim()) return;
    setIsCopying(true);
    try {
      const created = await scheduleVersionsService.copyVersion(
        sourceVersionToCopy.id,
        copyTitleInput.trim(),
        termId
      );
      toast.success(`Versi baru berhasil disalin dari "${sourceVersionToCopy.title}".`);
      setCopyModalOpen(false);
      onVersionCreated(created);
    } catch (err: any) {
      console.error('Copy version error:', err);
      toast.error(err.message || 'Gagal menyalin versi jadwal.');
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title="Riwayat Versi & Revisi Jadwal"
        subtitle="Lacak revisi, buat cabang draft baru, atau bandingkan perbedaan antar versi"
        width="w-full sm:max-w-md lg:max-w-lg"
        footer={
          <div className="flex justify-end w-full">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">
              Daftar Versi ({versions.length} Versi)
            </span>

            {versions.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenComparison(versions[0].id, versions[1]?.id || versions[0].id);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors cursor-pointer"
              >
                <Scale className="w-3 h-3" />
                Bandingkan Versi
              </button>
            )}
          </div>

          <div className="space-y-3">
            {versions.map((ver, idx) => {
              const isSelected = ver.id === selectedVersionId;
              const isPublished = ver.status === 'PUBLISHED';

              return (
                <div
                  key={ver.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">{ver.title}</h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-3xs font-bold uppercase ${
                            isPublished
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {ver.status || 'DRAFT'}
                        </span>
                        <span className="px-1.5 py-0.2 rounded font-mono text-3xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Rev. {ver.revision}
                        </span>
                      </div>
                      <span className="text-3xs text-slate-400 block mt-0.5">
                        Dibuat: {formatDateTimeIndo(ver.created_at)}
                      </span>
                    </div>

                    {isSelected && (
                      <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-blue-600 text-white shrink-0">
                        Aktif
                      </span>
                    )}
                  </div>

                  {ver.changelog && (
                    <p className="text-2xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 mb-3 font-mono">
                      {ver.changelog}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleOpenCopy(ver)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <Copy className="w-3 h-3 text-slate-500" />
                      Salin / Cabang
                    </button>

                    {!isSelected && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectVersion(ver.id);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1 text-2xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-2xs cursor-pointer"
                      >
                        Buka Versi Ini
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Drawer>

      {/* Copy Modal */}
      {copyModalOpen && sourceVersionToCopy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Salin Versi Jadwal (Branch)</h3>
              <p className="text-2xs text-slate-500 mt-0.5">
                Semua entri jadwal dari <strong className="text-slate-700">{sourceVersionToCopy.title}</strong> akan disalin ke draft versi baru.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Judul Versi Baru <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={copyTitleInput}
                onChange={(e) => setCopyTitleInput(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isCopying}
                onClick={() => setCopyModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isCopying || !copyTitleInput.trim()}
                onClick={handleConfirmCopy}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isCopying ? 'Menyalin...' : 'Salin Versi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
