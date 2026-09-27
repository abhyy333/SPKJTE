import React, { useState, useMemo } from 'react';
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
  RotateCcw,
  Sparkles,
  FileCheck,
  Filter,
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
  onRestoreVersion?: (sourceVersion: ScheduleVersion) => Promise<void>;
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
  onRestoreVersion,
  termId,
}) => {
  const [copyModalOpen, setCopyModalOpen] = useState<boolean>(false);
  const [sourceVersionToCopy, setSourceVersionToCopy] = useState<ScheduleVersion | null>(null);
  const [copyTitleInput, setCopyTitleInput] = useState<string>('');
  const [isCopying, setIsCopying] = useState<boolean>(false);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);
  const [showEmptyDrafts, setShowEmptyDrafts] = useState<boolean>(false);

  const isVersionEmptyDraft = (v: ScheduleVersion) => {
    if (v.status !== 'DRAFT') return false;
    const scopeLen = v.scope_offering_ids?.length || 0;
    const entryCount = (v as any).entry_count || (v as any).schedule_entries?.length || 0;
    const hasState =
      v.workflow_state &&
      typeof v.workflow_state === 'object' &&
      Object.keys(v.workflow_state).length > 0 &&
      Array.isArray((v.workflow_state as any).plannedCourses) &&
      (v.workflow_state as any).plannedCourses.length > 0;
    return scopeLen === 0 && entryCount === 0 && !hasState;
  };

  const visibleVersions = useMemo(() => {
    if (showEmptyDrafts) return versions;
    return versions.filter((v) => !isVersionEmptyDraft(v));
  }, [versions, showEmptyDrafts]);

  const emptyDraftsCount = useMemo(() => {
    return versions.filter((v) => isVersionEmptyDraft(v)).length;
  }, [versions]);

  const handleOpenCopy = (v: ScheduleVersion) => {
    setSourceVersionToCopy(v);
    setCopyTitleInput(`${v.title || `Versi ${v.version_number}`} (Salinan)`);
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

  const handleRestore = async (v: ScheduleVersion) => {
    if (onRestoreVersion) {
      setRestoringVersionId(v.id);
      try {
        await onRestoreVersion(v);
        onClose();
      } catch (err: any) {
        console.error('Restore error:', err);
      } finally {
        setRestoringVersionId(null);
      }
    } else {
      // Default fallback: copy version as new draft
      setRestoringVersionId(v.id);
      try {
        const title = `Pemulihan Versi ${v.version_number || v.title}`;
        const newDraft = await scheduleVersionsService.createDraft(termId, title, v.id);
        toast.success(`Versi ${v.version_number} berhasil dipulihkan sebagai draft baru.`);
        onVersionCreated(newDraft);
        onClose();
      } catch (err: any) {
        console.error('Restore version error:', err);
        toast.error(err.message || 'Gagal memulihkan versi jadwal.');
      } finally {
        setRestoringVersionId(null);
      }
    }
  };

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title="Riwayat Versi & Penyusunan Jadwal"
        subtitle="Lacak seluruh versi jadwal terbit, pulihkan sebagai draft baru, atau bandingkan perubahan"
        width="w-full sm:max-w-md lg:max-w-xl"
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
          {/* Top Bar: Filters & Compare */}
          <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">
                Daftar Versi ({visibleVersions.length} dari {versions.length})
              </span>

              {emptyDraftsCount > 0 && (
                <label className="flex items-center gap-1.5 text-3xs font-medium text-slate-500 hover:text-slate-700 cursor-pointer select-none bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/80">
                  <input
                    type="checkbox"
                    checked={showEmptyDrafts}
                    onChange={(e) => setShowEmptyDrafts(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Tampilkan Draft Kosong ({emptyDraftsCount})</span>
                </label>
              )}
            </div>

            {visibleVersions.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenComparison(visibleVersions[0].id, visibleVersions[1]?.id || visibleVersions[0].id);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors cursor-pointer"
              >
                <Scale className="w-3 h-3" />
                Bandingkan Versi
              </button>
            )}
          </div>

          {/* Version List */}
          <div className="space-y-3">
            {visibleVersions.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80 text-slate-500 text-xs">
                Belum ada riwayat versi jadwal perkuliahan.
              </div>
            ) : (
              visibleVersions.map((ver) => {
                const isSelected = ver.id === selectedVersionId;
                const isPublished = ver.status === 'PUBLISHED';
                const isReplaced = ver.status === 'REPLACED' || ver.status === 'ARCHIVED';
                const isEmpty = isVersionEmptyDraft(ver);
                const scopeCount = ver.scope_offering_ids?.length || 0;
                const isRestoring = restoringVersionId === ver.id;

                return (
                  <div
                    key={ver.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isPublished
                        ? 'bg-emerald-50/40 border-emerald-300/80 shadow-xs ring-1 ring-emerald-500/20'
                        : isSelected
                        ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-900">
                            {ver.title || `Jadwal Perkuliahan Versi ${ver.version_number}`}
                          </h4>

                          <span
                            className={`px-2 py-0.5 rounded-full text-3xs font-bold uppercase tracking-wider ${
                              isPublished
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : isReplaced
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : isEmpty
                                ? 'bg-slate-100 text-slate-500 border border-slate-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {ver.status || 'DRAFT'}
                          </span>

                          <span className="px-1.5 py-0.2 rounded font-mono text-3xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Rev. {ver.revision}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-3xs text-slate-500 flex-wrap">
                          <span>Dibuat: {formatDateTimeIndo(ver.created_at)}</span>
                          {scopeCount > 0 && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-slate-700">{scopeCount} Kelas</span>
                            </>
                          )}
                          {isEmpty && (
                            <span className="text-amber-600 font-semibold">(Draft Kosong)</span>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-blue-600 text-white shrink-0 shadow-2xs">
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
                      {/* Restore as new draft button for Published/Replaced versions */}
                      {(isPublished || isReplaced) && (
                        <button
                          type="button"
                          disabled={isRestoring}
                          onClick={() => handleRestore(ver)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 text-2xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{isRestoring ? 'Memulihkan...' : `Pulihkan Versi ${ver.version_number}`}</span>
                        </button>
                      )}

                      {/* Open draft button for non-empty active drafts */}
                      {ver.status === 'DRAFT' && !isSelected && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectVersion(ver.id);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 text-2xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-2xs cursor-pointer"
                        >
                          <span>Buka Draft Ini</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenCopy(ver)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <Copy className="w-3 h-3 text-slate-500" />
                        <span>Salin / Cabang</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
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
