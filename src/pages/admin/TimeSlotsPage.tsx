import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  Hourglass,
  Coffee,
  Plus,
  RotateCcw,
  Sparkles,
  Info,
  Calendar,
  AlertTriangle,
  Edit,
  Trash2,
  X,
  Power,
  Filter,
} from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { timeSlotsService } from '../../services/timeSlots.service';
import { TimeSlot } from '../../types';
import { minuteToTime, timeToMinute, dayOfWeekToName } from '../../lib/utils';

export const TimeSlotsPage: React.FC = () => {
  const toast = useToast();

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'weekly'>('list');

  // Filters
  const [dayFilter, setDayFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal Create / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form Fields
  const [formDayOfWeek, setFormDayOfWeek] = useState<number>(1);
  const [formStartTime, setFormStartTime] = useState<string>('08:00');
  const [formEndTime, setFormEndTime] = useState<string>('09:40');
  const [formLabel, setFormLabel] = useState<string>('Perkuliahan (2 SKS)');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  // Delete Confirm Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState<TimeSlot | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Template / Reset Confirm
  const [templateConfirmOpen, setTemplateConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadSlots = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: any = {};
      if (dayFilter !== 'all') {
        filters.day = parseInt(dayFilter, 10);
      }
      if (statusFilter === 'active') {
        filters.activeOnly = true;
      }
      const slots = await timeSlotsService.getTimeSlots(filters);
      let filtered = slots;
      if (statusFilter === 'inactive') {
        filtered = filtered.filter((s) => !s.is_active);
      }
      setTimeSlots(filtered);
    } catch (err: any) {
      console.error('Error fetching time slots:', err);
      setError(err.message || 'Gagal memuat slot waktu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, [dayFilter, statusFilter]);

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

  const defaultScheduleMatrix = [
    { start: '08:00', end: '08:50', sks: 1, type: '1 SKS (50m)' },
    { start: '08:50', end: '10:30', sks: 2, type: '2 SKS (100m)' },
    { start: '10:30', end: '11:20', sks: 1, type: '1 SKS (50m)' },
    { start: '11:20', end: '13:00', isBreak: true, type: 'Istirahat / Sholat' },
    { start: '13:00', end: '14:40', sks: 2, type: '2 SKS (100m)' },
    { start: '15:00', end: '17:30', sks: 3, type: '3 SKS (150m)' },
  ];

  // Helper to calculate duration on form change
  const calcDurationMinutes = () => {
    const s = timeToMinute(formStartTime);
    const e = timeToMinute(formEndTime);
    if (e > s) return e - s;
    return 0;
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingSlot(null);
    setFormDayOfWeek(1);
    setFormStartTime('08:00');
    setFormEndTime('09:40');
    setFormLabel('Perkuliahan (2 SKS)');
    setFormIsActive(true);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setFormDayOfWeek(slot.day_of_week || 1);
    setFormStartTime(slot.start_time || minuteToTime(slot.start_minute));
    setFormEndTime(slot.end_time || minuteToTime(slot.end_minute));
    setFormLabel(slot.label || slot.slot_type || '');
    setFormIsActive(slot.is_active);
    setModalOpen(true);
  };

  // Save Slot (Create / Update)
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    const duration = calcDurationMinutes();
    if (duration <= 0) {
      toast.error('Jam selesai harus lebih akhir dari jam mulai!');
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingSlot) {
        await timeSlotsService.updateTimeSlot(editingSlot.id, {
          day_of_week: formDayOfWeek,
          start_time: formStartTime,
          end_time: formEndTime,
          label: formLabel,
          is_active: formIsActive,
        });
        toast.success('Slot waktu berhasil diperbarui.');
      } else {
        await timeSlotsService.createTimeSlot({
          day_of_week: formDayOfWeek,
          start_time: formStartTime,
          end_time: formEndTime,
          label: formLabel,
          is_active: formIsActive,
        });
        toast.success('Slot waktu baru berhasil ditambahkan.');
      }
      setModalOpen(false);
      loadSlots();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan slot waktu.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle Active
  const handleToggleActive = async (slot: TimeSlot) => {
    try {
      await timeSlotsService.toggleTimeSlotActive(slot.id, !slot.is_active);
      toast.success(`Slot berhasil di${slot.is_active ? 'nonaktifkan' : 'aktifkan'}.`);
      loadSlots();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengubah status slot.');
    }
  };

  // Delete Action
  const handleDeleteClick = (slot: TimeSlot) => {
    setSlotToDelete(slot);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!slotToDelete) return;
    setDeleting(true);
    try {
      await timeSlotsService.deleteTimeSlot(slotToDelete.id);
      toast.success('Slot waktu berhasil dihapus.');
      setDeleteDialogOpen(false);
      setSlotToDelete(null);
      loadSlots();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus slot waktu.');
    } finally {
      setDeleting(false);
    }
  };

  // Apply Standard Template (Senin s/d Jumat, 08:00 - 17:30)
  const handleApplyTemplate = async () => {
    setActionLoading(true);
    try {
      const templates = [
        { start: '08:00', end: '08:50', label: '1 SKS (50m)' },
        { start: '08:50', end: '10:30', label: '2 SKS (100m)' },
        { start: '10:30', end: '11:20', label: '1 SKS (50m)' },
        { start: '13:00', end: '14:40', label: '2 SKS (100m)' },
        { start: '13:00', end: '15:30', label: '3 SKS (150m)' },
        { start: '15:00', end: '17:30', label: '3 SKS (150m)' },
      ];

      // Add template slots for Monday - Friday (1 to 5)
      for (let day = 1; day <= 5; day++) {
        for (const t of templates) {
          try {
            await timeSlotsService.createTimeSlot({
              day_of_week: day,
              start_time: t.start,
              end_time: t.end,
              label: t.label,
              is_active: true,
            });
          } catch {
            // continue if duplicate or exists
          }
        }
      }
      toast.success('Template slot perkuliahan berhasil diterapkan.');
      setTemplateConfirmOpen(false);
      loadSlots();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menerapkan template.');
    } finally {
      setActionLoading(false);
    }
  };

  // Reset/Clear Slots
  const handleResetSlots = async () => {
    setActionLoading(true);
    try {
      for (const slot of timeSlots) {
        try {
          await timeSlotsService.deleteTimeSlot(slot.id);
        } catch {
          // ignore individual delete failure
        }
      }
      toast.success('Daftar slot waktu berhasil direset.');
      setResetConfirmOpen(false);
      loadSlots();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mereset slot.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Slot Waktu"
        subtitle="Atur periode waktu perkuliahan yang digunakan dalam penjadwalan Jurusan Teknik Elektro"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Tambah Slot
            </button>
            <button
              onClick={() => setTemplateConfirmOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-blue-500" />
              Terapkan Template
            </button>
            <button
              onClick={() => setResetConfirmOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-rose-600 bg-white hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-rose-500" />
              Reset Slot
            </button>
          </div>
        }
      />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Slot Waktu"
          value={timeSlots.length}
          icon={<Clock className="w-6 h-6" />}
          iconBgColor="bg-blue-50 text-blue-600"
          subtitle="periode waktu terdaftar"
        />

        <StatCard
          title="Slot Aktif"
          value={timeSlots.filter((t) => t.is_active).length}
          icon={<CheckCircle2 className="w-6 h-6" />}
          iconBgColor="bg-emerald-50 text-emerald-600"
          subtitle="slot dapat dijadwalkan"
        />

        <StatCard
          title="Durasi Standar"
          value="50 menit"
          icon={<Hourglass className="w-6 h-6" />}
          iconBgColor="bg-purple-50 text-purple-600"
          subtitle="1 SKS (Satuan Kredit Semester)"
        />

        <StatCard
          title="Waktu Istirahat"
          value="11:20 – 13:00"
          icon={<Coffee className="w-6 h-6" />}
          iconBgColor="bg-rose-50 text-rose-600"
          subtitle="jeda Sholat & Istirahat"
        />
      </div>

      {/* Main Grid: Slots & Rules Side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Table & Visualization */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          {/* Header Row: Tabs & Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab('list')}
                className={`text-xs font-semibold pb-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'list'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Daftar Slot Waktu ({timeSlots.length})
              </button>
              <button
                onClick={() => setActiveTab('weekly')}
                className={`text-xs font-semibold pb-2 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'weekly'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Visualisasi Mingguan
              </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <select
                value={dayFilter}
                onChange={(e) => setDayFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Semua Hari</option>
                <option value="1">Senin</option>
                <option value="2">Selasa</option>
                <option value="3">Rabu</option>
                <option value="4">Kamis</option>
                <option value="5">Jumat</option>
                <option value="6">Sabtu</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
          </div>

          {loading ? (
            <LoadingState rows={6} message="Memuat slot waktu..." />
          ) : error ? (
            <ErrorState title="Gagal Memuat Slot" message={error} onRetry={loadSlots} />
          ) : activeTab === 'list' ? (
            timeSlots.length === 0 ? (
              <EmptyState
                title="Belum Ada Slot Waktu"
                description="Belum ada slot waktu terdaftar pada sistem atau filter yang dipilih."
                action={{
                  label: 'Terapkan Template Standar',
                  onClick: () => setTemplateConfirmOpen(true),
                }}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-2xs">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-3">Hari</th>
                      <th className="py-2.5 px-3">Jam Mulai</th>
                      <th className="py-2.5 px-3">Jam Selesai</th>
                      <th className="py-2.5 px-3">Durasi</th>
                      <th className="py-2.5 px-3">Label / Jenis</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {timeSlots.map((slot, i) => (
                      <tr key={slot.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">{i + 1}</td>
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {slot.day || dayOfWeekToName(slot.day_of_week)}
                        </td>
                        <td className="py-3 px-3 font-mono font-medium text-slate-700">
                          {slot.start_time || minuteToTime(slot.start_minute)}
                        </td>
                        <td className="py-3 px-3 font-mono font-medium text-slate-700">
                          {slot.end_time || minuteToTime(slot.end_minute)}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {slot.duration_minutes || (slot.end_minute - slot.start_minute)} menit
                        </td>
                        <td className="py-3 px-3">
                          <span className="flex items-center gap-1.5 font-medium text-slate-700">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                (slot.duration_minutes || 0) >= 150
                                  ? 'bg-emerald-500'
                                  : (slot.duration_minutes || 0) >= 100
                                  ? 'bg-purple-500'
                                  : 'bg-blue-500'
                              }`}
                            />
                            {slot.label || slot.slot_type || `Perkuliahan (${Math.round((slot.duration_minutes || 50) / 50)} SKS)`}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => handleToggleActive(slot)}
                            className="cursor-pointer"
                            title="Klik untuk beralih status aktif/nonaktif"
                          >
                            <StatusBadge label={slot.is_active ? 'Aktif' : 'Nonaktif'} showDot />
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditModal(slot)}
                              title="Edit Slot"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(slot)}
                              title="Hapus Slot"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* Visualisasi Mingguan */
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-2xs text-slate-500 pb-2 border-b border-slate-100">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-sky-200" /> 1 SKS (50m)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-purple-200" /> 2 SKS (100m)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-200" /> 3 SKS (150m)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-slate-200" /> Istirahat
                </span>
              </div>

              <div className="space-y-3">
                {days.map((day) => (
                  <div key={day} className="flex items-center gap-3">
                    <span className="w-16 font-bold text-xs text-slate-700 shrink-0">{day}</span>
                    <div className="flex-1 grid grid-cols-6 gap-2">
                      <div className="p-2 bg-sky-100 border border-sky-300 rounded text-center text-3xs font-semibold text-sky-800">
                        08:00–08:50
                      </div>
                      <div className="p-2 bg-purple-100 border border-purple-300 rounded text-center text-3xs font-semibold text-purple-800">
                        08:50–10:30
                      </div>
                      <div className="p-2 bg-sky-100 border border-sky-300 rounded text-center text-3xs font-semibold text-sky-800">
                        10:30–11:20
                      </div>
                      <div className="p-2 bg-slate-100 border border-slate-300 rounded text-center text-3xs font-semibold text-slate-500">
                        11:20–13:00
                      </div>
                      <div className="p-2 bg-purple-100 border border-purple-300 rounded text-center text-3xs font-semibold text-purple-800">
                        13:00–14:40
                      </div>
                      <div className="p-2 bg-emerald-100 border border-emerald-300 rounded text-center text-3xs font-semibold text-emerald-800">
                        15:00–17:30
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Rules Cards */}
        <div className="lg:col-span-4 space-y-4">
          {/* Aturan Durasi Card */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-blue-600">
              <Info className="w-5 h-5 shrink-0" />
              <h4 className="text-sm font-bold text-slate-800">Aturan Durasi SKS</h4>
            </div>
            <p className="text-xl font-extrabold text-slate-900 tracking-tight">
              1 SKS = 50 menit
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Durasi slot waktu mengikuti ketentuan sistem kredit semester (SKS) Jurusan Teknik Elektro Universitas Mataram dan digunakan sebagai acuan baku dalam penjadwalan perkuliahan.
            </p>
          </div>

          {/* Contoh Durasi Slot Card */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Contoh Durasi Standar
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-800">1 SKS (50 menit)</span>
                <span className="font-mono text-slate-600">08:00 – 08:50</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-800">2 SKS (100 menit)</span>
                <span className="font-mono text-slate-600">08:50 – 10:30</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-800">3 SKS (150 menit)</span>
                <span className="font-mono text-slate-600">13:00 – 15:30</span>
              </div>
            </div>
          </div>

          {/* Waktu Istirahat Warning */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Waktu Istirahat & Sholat</span>
            </div>
            <p className="text-2xs text-amber-700 leading-relaxed">
              Slot istirahat (contoh: 11:20 – 13:00 untuk Sholat Dzuhur dan makan siang) tidak dialokasikan untuk jadwal perkuliahan teori reguler.
            </p>
          </div>
        </div>
      </div>

      {/* Modal Create / Edit Slot */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingSlot ? 'Edit Slot Waktu' : 'Tambah Slot Waktu Baru'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hari Perkuliahan *</label>
                <select
                  value={formDayOfWeek}
                  onChange={(e) => setFormDayOfWeek(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value={1}>Senin</option>
                  <option value={2}>Selasa</option>
                  <option value={3}>Rabu</option>
                  <option value={4}>Kamis</option>
                  <option value={5}>Jumat</option>
                  <option value={6}>Sabtu</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jam Mulai *</label>
                  <input
                    type="time"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jam Selesai *</label>
                  <input
                    type="time"
                    required
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Calculated Info */}
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center justify-between text-xs text-blue-900">
                <span>Durasi: <strong>{calcDurationMinutes()} menit</strong></span>
                <span>Setara: <strong>{Math.round(calcDurationMinutes() / 50)} SKS</strong></span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Label / Keterangan</label>
                <input
                  type="text"
                  placeholder="Contoh: Perkuliahan (2 SKS) / Praktikum"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="slot_active"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="slot_active" className="font-medium text-slate-700 cursor-pointer">
                  Slot Aktif (dapat digunakan untuk alokasi jadwal)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={formSubmitting}
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {formSubmitting ? 'Menyimpan...' : 'Simpan Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Slot Waktu"
        message={`Apakah Anda yakin ingin menghapus slot waktu ${slotToDelete?.day || ''} (${slotToDelete?.start_time} - ${slotToDelete?.end_time})? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus Slot"
        variant="danger"
        isLoading={deleting}
      />

      {/* Apply Template Confirmation */}
      <ConfirmDialog
        isOpen={templateConfirmOpen}
        onClose={() => setTemplateConfirmOpen(false)}
        onConfirm={handleApplyTemplate}
        title="Terapkan Template Slot Waktu"
        message="Sistem akan menambahkan rangkaian slot perkuliahan standar Jurusan Teknik Elektro (Senin s/d Jumat, 08:00 – 17:30 dengan jeda istirahat). Lanjutkan?"
        confirmText="Terapkan Sekarang"
        variant="info"
        isLoading={actionLoading}
      />

      {/* Reset Confirmation */}
      <ConfirmDialog
        isOpen={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={handleResetSlots}
        title="Reset Slot Waktu"
        message="Apakah Anda yakin ingin mereset seluruh slot waktu yang ada? Tindakan ini akan menghapus slot waktu saat ini sehingga Anda dapat menerapkan template baru."
        confirmText="Reset Semua Slot"
        variant="danger"
        isLoading={actionLoading}
      />
    </div>
  );
};

export const SlotWaktuPage = TimeSlotsPage;
