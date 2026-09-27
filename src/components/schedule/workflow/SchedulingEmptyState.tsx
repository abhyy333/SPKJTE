import React from 'react';
import { CalendarPlus, Sparkles, Layers, SlidersHorizontal, ArrowRight } from 'lucide-react';

interface SchedulingEmptyStateProps {
  onStartTemplate: () => void;
  onStartManual: () => void;
}

export const SchedulingEmptyState: React.FC<SchedulingEmptyStateProps> = ({
  onStartTemplate,
  onStartManual,
}) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-8 lg:p-12 text-center shadow-2xs">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <CalendarPlus className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            Belum ada penyusunan jadwal aktif.
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Mulai penyusunan jadwal perkuliahan berdasarkan paket semester dan kurikulum yang berlaku.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-left">
          {/* Option 1: Template Semester (Main Option) */}
          <div
            onClick={onStartTemplate}
            className="group relative p-5 rounded-xl border-2 border-blue-600 bg-blue-50/40 hover:bg-blue-50 transition-all cursor-pointer shadow-2xs hover:shadow-md"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                <Layers className="w-5 h-5" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-3xs font-bold uppercase tracking-wider bg-blue-200/70 text-blue-800">
                Rekomendasi
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
              Gunakan Template Semester
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Pilih mata kuliah secara instan dari paket Kurikulum 2026 (OBE) dan 2022 berdasarkan semester.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-blue-600 group-hover:gap-2 transition-all">
              <span>Mulai Susun Jadwal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Option 2: Kustom Manual */}
          <div
            onClick={onStartManual}
            className="group relative p-5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-white transition-all cursor-pointer shadow-2xs hover:shadow-md"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-3xs font-semibold uppercase tracking-wider bg-slate-200 text-slate-700">
                Fleksibel
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              Kustom Manual
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Pilih dan tentukan mata kuliah secara mandiri tanpa terikat struktur paket semester penuh.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-slate-600 group-hover:text-blue-600 transition-colors">
              <span>Pilih Kustom</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onStartTemplate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-blue-600/20 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>+ Susun Jadwal Baru</span>
          </button>
        </div>
      </div>
    </div>
  );
};
