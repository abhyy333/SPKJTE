import React from 'react';
import { AcademicTerm, ScheduleVersion } from '../../../types';
import { Plus, Trash2, History, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

interface ScheduleWorkflowHeaderProps {
  activeTerm: AcademicTerm | null;
  currentVersion: ScheduleVersion | null;
  onNewScheduleClick: () => void;
  onDeleteScheduleClick?: () => void;
  onHistoryClick: () => void;
}

export const ScheduleWorkflowHeader: React.FC<ScheduleWorkflowHeaderProps> = ({
  activeTerm,
  currentVersion,
  onNewScheduleClick,
  onDeleteScheduleClick,
  onHistoryClick,
}) => {
  const termBadge = activeTerm
    ? `${activeTerm.semester_type || 'GANJIL'} ${activeTerm.academic_year || '2026/2027'}`
    : 'GANJIL 2026/2027';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Title, Badge & Subtitle */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Penyusunan Jadwal Perkuliahan
          </h1>
          <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            {termBadge}
          </span>
          {currentVersion && (
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                currentVersion.status === 'PUBLISHED'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}
            >
              {currentVersion.status || 'DRAFT'} • Versi {currentVersion.version_number || '1'} (Rev. {currentVersion.revision})
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
          Alur lengkap pemilihan mata kuliah, review kelas, penugasan dosen, generate jadwal awal, optimasi Simulated Annealing, hingga publikasi.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onNewScheduleClick}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          + Jadwal Baru
        </button>

        {currentVersion && currentVersion.status !== 'PUBLISHED' && onDeleteScheduleClick && (
          <button
            type="button"
            onClick={onDeleteScheduleClick}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Hapus Jadwal
          </button>
        )}

        <button
          type="button"
          onClick={onHistoryClick}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
        >
          <History className="w-3.5 h-3.5 text-slate-500" />
          Riwayat
        </button>
      </div>
    </div>
  );
};
