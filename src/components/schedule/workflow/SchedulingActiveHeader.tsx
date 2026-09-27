import React from 'react';
import { Calendar, RotateCcw, Sparkles } from 'lucide-react';
import { AcademicTerm } from '../../../types';

interface SchedulingActiveHeaderProps {
  activeTerm: AcademicTerm | null;
  mode: 'TEMPLATE' | 'MANUAL' | null;
  onResetWorkflow?: () => void;
}

export const SchedulingActiveHeader: React.FC<SchedulingActiveHeaderProps> = ({
  activeTerm,
  mode,
  onResetWorkflow,
}) => {
  const termLabel = activeTerm
    ? `${activeTerm.semester_type || activeTerm.term || 'GANJIL'} ${activeTerm.academic_year || activeTerm.year || '2026/2027'}`
    : 'GANJIL 2026/2027';

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
            Penyusunan Jadwal Perkuliahan
          </h1>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>{termLabel}</span>
          </div>
          {mode && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>{mode === 'TEMPLATE' ? 'Mode Template Semester' : 'Mode Kustom Manual'}</span>
            </div>
          )}
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
          Alur penyusunan jadwal perkuliahan berdasarkan paket kurikulum, kelas, dosen pengampu, ruangan, sesi waktu, dan optimasi Simulated Annealing.
        </p>
      </div>

      {mode && onResetWorkflow && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onResetWorkflow}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-xl transition-colors cursor-pointer"
            title="Mulai Ulang Alur Penyusunan"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Mulai Ulang</span>
          </button>
        </div>
      )}
    </div>
  );
};
