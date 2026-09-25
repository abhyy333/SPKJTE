import React from 'react';
import { FileText, Download, Printer, BarChart3, Calendar, Users } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';

export const ReportsPage: React.FC = () => {
  const reports = [
    {
      title: 'Laporan Jadwal Perkuliahan Lengkap',
      desc: 'Rekapitulasi jadwal seluruh mata kuliah, kelas, dosen pengampu, dan ruangan semester aktif.',
      type: 'PDF / Excel',
    },
    {
      title: 'Laporan Beban Mengajar Dosen (SKS)',
      desc: 'Distribusi beban SKS mengajar seluruh dosen Jurusan Teknik Elektro.',
      type: 'PDF / Excel',
    },
    {
      title: 'Laporan Utilitas Ruangan Perkuliahan',
      desc: 'Tingkat keterisian dan utilisasi ruang kelas dan laboratorium per hari.',
      type: 'PDF / Excel',
    },
    {
      title: 'Laporan Audit Konflik & Bentrok',
      desc: 'Daftar rekam jejak bentrok jadwal dan solusi penanganan yang diterapkan.',
      type: 'PDF / Excel',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan & Ekspor"
        subtitle="Unduh rekapitulasi data akademik dan jadwal perkuliahan Teknik Elektro"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((r, i) => (
          <div
            key={i}
            className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4"
          >
            <div className="space-y-1.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">{r.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{r.desc}</p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-2xs font-semibold text-slate-400">{r.type}</span>
              <button
                onClick={() => alert('Fitur unduh laporan PDF/Excel siap pada fase pelaporan terintegrasi.')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
