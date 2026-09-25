import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AcademicTerm,
  ScheduleVersion,
  CourseOffering,
  ScheduleEntry,
  Room,
  TimeSlot,
  Lecturer,
  LecturerAvailability,
  ScheduleConflict,
} from '../../types';
import { academicTermsService } from '../../services/academicTerms.service';
import { scheduleVersionsService } from '../../services/scheduleVersions.service';
import { scheduleEntriesService } from '../../services/scheduleEntries.service';
import { scheduleConflictsService } from '../../services/scheduleConflicts.service';
import { courseOfferingsService } from '../../services/courseOfferings.service';
import { roomsService } from '../../services/rooms.service';
import { timeSlotsService } from '../../services/timeSlots.service';
import { lecturersService } from '../../services/lecturers.service';
import { lecturerAvailabilityService } from '../../services/lecturerAvailability.service';
import { detectAllScheduleConflicts, ClientConflict } from '../../lib/scheduleValidator';
import { ScheduleToolbar } from './ScheduleToolbar';
import { UnscheduledOfferingPanel } from './UnscheduledOfferingPanel';
import { ScheduleGrid } from './ScheduleGrid';
import { ScheduleEditorDrawer } from './ScheduleEditorDrawer';
import { ScheduleDetailDrawer } from './ScheduleDetailDrawer';
import { ScheduleConflictPanel } from './ScheduleConflictPanel';
import { EmptyState } from '../ui/EmptyState';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { toast } from '../ui/Toast';
import { Calendar, PlusCircle, AlertCircle } from 'lucide-react';
import { minuteToTime, dayOfWeekToName, parseSupabaseError } from '../../lib/utils';

export const ScheduleWorkspace: React.FC = () => {
  // Master references
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [availabilities, setAvailabilities] = useState<LecturerAvailability[]>([]);

  // Versions and Draft state
  const [versions, setVersions] = useState<ScheduleVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [selectedVersion, setSelectedVersion] = useState<ScheduleVersion | null>(null);

  // Offerings and Entries
  const [termOfferings, setTermOfferings] = useState<CourseOffering[]>([]);
  const [draftEntries, setDraftEntries] = useState<ScheduleEntry[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Conflicts
  const [backendConflicts, setBackendConflicts] = useState<ScheduleConflict[]>([]);

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Drawers & Modals
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [draftTitleInput, setDraftTitleInput] = useState<string>('');
  const [creatingDraft, setCreatingDraft] = useState<boolean>(false);

  const [editorDrawerOpen, setEditorDrawerOpen] = useState<boolean>(false);
  const [offeringForEditor, setOfferingForEditor] = useState<CourseOffering | null>(null);
  const [entryForEditor, setEntryForEditor] = useState<ScheduleEntry | null>(null);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState<boolean>(false);
  const [selectedEntryForDetail, setSelectedEntryForDetail] = useState<ScheduleEntry | null>(null);

  const [conflictPanelOpen, setConflictPanelOpen] = useState<boolean>(false);

  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // 1. Initial Load of Master Data (Terms, Rooms, Slots, Lecturers)
  useEffect(() => {
    async function loadMasterData() {
      setLoading(true);
      setError(null);
      try {
        const [termList, roomList, slotList, lecList] = await Promise.all([
          academicTermsService.getAcademicTerms(),
          roomsService.getRooms(),
          timeSlotsService.getTimeSlots({ activeOnly: true }),
          lecturersService.getLecturers(),
        ]);

        setTerms(termList);
        setRooms(roomList);
        setTimeSlots(slotList);
        setLecturers(lecList);

        // Pick active term or first term
        const active = termList.find((t) => t.is_active) || termList[0];
        if (active) {
          setSelectedTermId(active.id);
        }
      } catch (err: any) {
        console.error('Failed to load master data:', err);
        setError(err.message || 'Gagal memuat data referensi jadwal.');
      } finally {
        setLoading(false);
      }
    }

    loadMasterData();
  }, []);

  // 2. Load Term-specific data when selectedTermId changes (Versions, Offerings, Lecturer Availabilities)
  const loadTermData = useCallback(async (termId: string) => {
    if (!termId) return;
    try {
      const [verList, offList] = await Promise.all([
        scheduleVersionsService.getVersions(termId),
        courseOfferingsService.getOfferings({ termId }),
      ]);

      // Filter offerings: schedulable and not KKN
      const validOfferings = offList.filter(
        (o) => o.course?.is_schedulable !== false && o.course?.activity_type !== 'KKN'
      );
      setTermOfferings(validOfferings);
      setVersions(verList);

      // Select latest draft version or first version
      const draftVer = verList.find((v) => v.status === 'DRAFT') || verList[0];
      if (draftVer) {
        setSelectedVersionId(draftVer.id);
        setSelectedVersion(draftVer);
      } else {
        setSelectedVersionId('');
        setSelectedVersion(null);
        setDraftEntries([]);
      }
    } catch (err: any) {
      console.error('Failed to load term data:', err);
      toast.error('Gagal memuat versi jadwal dan penawaran kelas.');
    }
  }, []);

  useEffect(() => {
    if (selectedTermId) {
      loadTermData(selectedTermId);
    }
  }, [selectedTermId, loadTermData]);

  // 3. Load Draft Entries & Conflicts when selectedVersionId changes
  const loadVersionEntries = useCallback(async (versionId: string) => {
    if (!versionId) {
      setDraftEntries([]);
      setBackendConflicts([]);
      return;
    }

    try {
      const [entries, conflicts, ver] = await Promise.all([
        scheduleEntriesService.getEntriesByVersionId(versionId),
        scheduleConflictsService.getConflicts(versionId),
        scheduleVersionsService.getVersionById(versionId),
      ]);

      setDraftEntries(entries);
      setBackendConflicts(conflicts);
      if (ver) setSelectedVersion(ver);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      console.error('Failed to load version entries:', err);
      toast.error('Gagal memuat rincian jadwal untuk versi ini.');
    }
  }, []);

  useEffect(() => {
    if (selectedVersionId) {
      loadVersionEntries(selectedVersionId);
    } else {
      setDraftEntries([]);
      setBackendConflicts([]);
    }
  }, [selectedVersionId, loadVersionEntries]);

  // 4. Load Lecturer Availabilities across all assigned lecturers in current term
  useEffect(() => {
    async function loadAvails() {
      if (termOfferings.length === 0) return;
      const assignedLecturerIds = Array.from(
        new Set(
          termOfferings.flatMap((o) =>
            (o.course_offering_lecturers || []).map((l) => l.lecturer_id)
          )
        )
      );

      try {
        const promises = assignedLecturerIds.slice(0, 50).map((lid) =>
          lecturerAvailabilityService.getAvailability(lid, selectedTermId)
        );
        const results = await Promise.all(promises);
        setAvailabilities(results.flat());
      } catch (err) {
        console.warn('Error loading lecturer availabilities:', err);
      }
    }

    loadAvails();
  }, [termOfferings, selectedTermId]);

  // 5. Unsaved Changes warning before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // 6. Real-time Client Conflicts computed from draftEntries
  const clientConflicts: ClientConflict[] = useMemo(() => {
    return detectAllScheduleConflicts(draftEntries, rooms, availabilities);
  }, [draftEntries, rooms, availabilities]);

  // 7. Unscheduled Offerings (offerings not in draftEntries)
  const unscheduledOfferings = useMemo(() => {
    const scheduledOfferingIds = new Set(draftEntries.map((e) => e.course_offering_id));
    return termOfferings.filter((o) => !scheduledOfferingIds.has(o.id));
  }, [termOfferings, draftEntries]);

  // Term switch with unsaved check
  const handleTermChange = (termId: string) => {
    if (hasUnsavedChanges) {
      setPendingAction(() => () => {
        setSelectedTermId(termId);
        setHasUnsavedChanges(false);
      });
      setConfirmLeaveOpen(true);
    } else {
      setSelectedTermId(termId);
    }
  };

  // Version switch with unsaved check
  const handleVersionChange = (versionId: string) => {
    if (hasUnsavedChanges) {
      setPendingAction(() => () => {
        setSelectedVersionId(versionId);
        const found = versions.find((v) => v.id === versionId) || null;
        setSelectedVersion(found);
        setHasUnsavedChanges(false);
      });
      setConfirmLeaveOpen(true);
    } else {
      setSelectedVersionId(versionId);
      const found = versions.find((v) => v.id === versionId) || null;
      setSelectedVersion(found);
    }
  };

  // Handle open create draft modal
  const handleOpenCreateModal = () => {
    const term = terms.find((t) => t.id === selectedTermId);
    const termLabel = term ? `${term.semester_type || term.term} ${term.academic_year || term.year}` : '';
    setDraftTitleInput(`Jadwal Perkuliahan ${termLabel}`.trim());
    setCreateModalOpen(true);
  };

  // Create Draft Action
  const handleConfirmCreateDraft = async () => {
    if (!selectedTermId) return;
    setCreatingDraft(true);
    try {
      const created = await scheduleVersionsService.createDraft(
        selectedTermId,
        draftTitleInput
      );

      toast.success('Draft jadwal baru berhasil dibuat.');
      setCreateModalOpen(false);

      // Refresh version list and select the new one
      const verList = await scheduleVersionsService.getVersions(selectedTermId);
      setVersions(verList);
      setSelectedVersionId(created.id);
      setSelectedVersion(created);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      console.error('Create draft error:', err);
      toast.error(err.message || 'Gagal membuat draft jadwal baru.');
    } finally {
      setCreatingDraft(false);
    }
  };

  // Handle placing an unscheduled offering
  const handleSelectOffering = (offering: CourseOffering) => {
    // Check readiness
    const expected = offering.expected_students || 0;
    const hasLecturers = (offering.course_offering_lecturers?.length || 0) > 0;

    if (expected === 0 && !hasLecturers) {
      toast.error('Jumlah peserta dan dosen pengampu belum ditentukan untuk kelas ini.');
      return;
    }

    setOfferingForEditor(offering);
    setEntryForEditor(null);
    setEditorDrawerOpen(true);
  };

  // Handle editing an existing entry
  const handleEditEntry = (entry: ScheduleEntry) => {
    const offering = termOfferings.find((o) => o.id === entry.course_offering_id) || entry.course_offering;
    if (offering) {
      setOfferingForEditor(offering as CourseOffering);
      setEntryForEditor(entry);
      setDetailDrawerOpen(false);
      setEditorDrawerOpen(true);
    }
  };

  // Apply placement from editor drawer (new or edit)
  const handleApplyPlacement = (data: {
    course_offering_id: string;
    room_id: string;
    day_of_week: number;
    start_minute: number;
  }) => {
    const offering = termOfferings.find((o) => o.id === data.course_offering_id);
    const room = rooms.find((r) => r.id === data.room_id);
    const sks = offering?.course?.effective_sks || 2;
    const endMin = data.start_minute + sks * 50;
    const dayName = dayOfWeekToName(data.day_of_week);

    const lecturerNames: string[] = offering?.course_offering_lecturers
      ?.map((l) => l.lecturer?.name)
      .filter((n): n is string => Boolean(n)) || [];

    const lecturerIds = offering?.course_offering_lecturers?.map((l) => l.lecturer_id) || [];

    if (entryForEditor) {
      // Update existing entry
      setDraftEntries((prev) =>
        prev.map((e) =>
          e.id === entryForEditor.id
            ? {
                ...e,
                room_id: data.room_id,
                day_of_week: data.day_of_week,
                start_minute: data.start_minute,
                end_minute: endMin,
                day: dayName,
                start_time: minuteToTime(data.start_minute),
                end_time: minuteToTime(endMin),
                room: room || null,
              }
            : e
        )
      );
      toast.success(`Jadwal ${offering?.course?.name} berhasil diperbarui di rancangan.`);
    } else {
      // Add new entry to draft
      const newEntry: ScheduleEntry = {
        id: `draft-entry-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        schedule_version_id: selectedVersionId,
        course_offering_id: data.course_offering_id,
        room_id: data.room_id,
        day_of_week: data.day_of_week,
        start_minute: data.start_minute,
        end_minute: endMin,
        day: dayName,
        start_time: minuteToTime(data.start_minute),
        end_time: minuteToTime(endMin),
        course_name: offering?.course?.name || undefined,
        course_code: offering?.course?.code || undefined,
        class_code: offering?.class_code,
        student_count: offering?.expected_students || 0,
        room_capacity: room?.capacity || 0,
        lecturer_ids: lecturerIds,
        lecturer_names: lecturerNames,
        course_offering: offering || null,
        room: room || null,
      };

      setDraftEntries((prev) => [...prev, newEntry]);
      toast.success(`${offering?.course?.name} kelas ${offering?.class_code} ditempatkan ke jadwal.`);
    }

    setHasUnsavedChanges(true);
  };

  // Remove entry from draft
  const handleRemoveEntry = (entry: ScheduleEntry) => {
    setDraftEntries((prev) => prev.filter((e) => e.id !== entry.id));
    setDetailDrawerOpen(false);
    setHasUnsavedChanges(true);
    toast.success(`${entry.course_name || 'Kelas'} dikeluarkan dari rancangan jadwal.`);
  };

  // Save draft entries snapshot using RPC
  const handleSaveDraft = async () => {
    if (!selectedVersion) return;
    setIsSaving(true);

    try {
      const payload = draftEntries.map((e) => ({
        course_offering_id: e.course_offering_id,
        room_id: e.room_id,
        day_of_week: Number(e.day_of_week),
        exam_date: null,
        start_minute: Number(e.start_minute),
      }));

      const res = await scheduleVersionsService.saveDraft(
        selectedVersion.id,
        selectedVersion.revision,
        payload,
        'Penyesuaian jadwal manual'
      );

      // Refresh conflicts in backend
      await scheduleVersionsService.refreshConflicts(selectedVersion.id);
      const updatedConflicts = await scheduleConflictsService.getConflicts(selectedVersion.id);
      setBackendConflicts(updatedConflicts);

      // Update version state with new revision
      if (res.version) {
        setSelectedVersion(res.version);
      } else {
        setSelectedVersion({
          ...selectedVersion,
          revision: res.revision,
        });
      }

      setHasUnsavedChanges(false);
      toast.success('Draft jadwal berhasil disimpan.');
    } catch (err: any) {
      console.error('Save draft error:', err);
      toast.error(err.message || 'Gagal menyimpan perubahan draft jadwal.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <LoadingState type="table-skeleton" rows={8} message="Memuat workspace penjadwalan..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  const selectedTerm = terms.find((t) => t.id === selectedTermId);

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <ScheduleToolbar
        terms={terms}
        selectedTermId={selectedTermId}
        onTermChange={handleTermChange}
        versions={versions}
        selectedVersionId={selectedVersionId}
        onVersionChange={handleVersionChange}
        selectedVersion={selectedVersion}
        scheduledCount={draftEntries.length}
        totalOfferings={termOfferings.length}
        conflictCount={clientConflicts.length}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        onCreateDraftClick={handleOpenCreateModal}
        onSaveClick={handleSaveDraft}
        onCheckConflictsClick={() => setConflictPanelOpen(true)}
      />

      {/* When no version exists for selected term */}
      {!selectedVersion && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-xs">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            Belum ada draft jadwal untuk periode ini
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
            Periode {selectedTerm?.academic_year || selectedTerm?.year} ({selectedTerm?.semester_type || selectedTerm?.term}) belum memiliki rancangan jadwal perkuliahan. Buat draft baru untuk mulai menyusun jadwal.
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Buat Draft Jadwal
          </button>
        </div>
      )}

      {/* Main Workspace Layout (Left: Unscheduled, Right: Weekly Grid) */}
      {selectedVersion && (
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* Left Panel: Kelas Belum Terjadwal */}
          <UnscheduledOfferingPanel
            offerings={unscheduledOfferings}
            lecturers={lecturers}
            onSelectOffering={handleSelectOffering}
          />

          {/* Right Main Area: Weekly Grid */}
          <ScheduleGrid
            entries={draftEntries}
            rooms={rooms}
            activeTimeSlots={timeSlots}
            lecturers={lecturers}
            conflicts={clientConflicts}
            selectedEntryId={selectedEntryForDetail?.id}
            onSelectEntry={(entry) => {
              setSelectedEntryForDetail(entry);
              setDetailDrawerOpen(true);
            }}
          />
        </div>
      )}

      {/* Drawer: Manual Placement / Edit Placement */}
      <ScheduleEditorDrawer
        isOpen={editorDrawerOpen}
        onClose={() => {
          setEditorDrawerOpen(false);
          setOfferingForEditor(null);
          setEntryForEditor(null);
        }}
        offering={offeringForEditor}
        initialEntry={entryForEditor}
        rooms={rooms}
        activeTimeSlots={timeSlots}
        availabilities={availabilities}
        currentEntries={draftEntries}
        onApply={handleApplyPlacement}
      />

      {/* Drawer: Schedule Entry Detail */}
      <ScheduleDetailDrawer
        isOpen={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedEntryForDetail(null);
        }}
        entry={selectedEntryForDetail}
        room={rooms.find((r) => r.id === selectedEntryForDetail?.room_id)}
        conflicts={clientConflicts}
        onEdit={handleEditEntry}
        onRemove={handleRemoveEntry}
      />

      {/* Drawer: Conflict Detection Panel */}
      <ScheduleConflictPanel
        isOpen={conflictPanelOpen}
        onClose={() => setConflictPanelOpen(false)}
        conflicts={clientConflicts}
        onSelectConflict={(conflict) => {
          const entryId = conflict.entryIds[0];
          if (entryId) {
            const entry = draftEntries.find((e) => e.id === entryId);
            if (entry) {
              setSelectedEntryForDetail(entry);
              setDetailDrawerOpen(true);
            }
          }
        }}
      />

      {/* Modal: Create Draft */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Buat Draft Jadwal Perkuliahan
              </h3>
              <p className="text-2xs text-slate-500 mt-0.5">
                Rancangan jadwal baru akan dibuat untuk periode{' '}
                <strong className="text-slate-700">
                  {selectedTerm?.academic_year || selectedTerm?.year} ({selectedTerm?.semester_type || selectedTerm?.term})
                </strong>
                .
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Judul Draft Jadwal <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={draftTitleInput}
                onChange={(e) => setDraftTitleInput(e.target.value)}
                placeholder="Contoh: Jadwal Perkuliahan Ganjil 2026/2027"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={creatingDraft}
                onClick={() => setCreateModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={creatingDraft || !draftTitleInput.trim()}
                onClick={handleConfirmCreateDraft}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {creatingDraft ? 'Membuat Draft...' : 'Buat Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Unsaved Leave Dialog */}
      <ConfirmDialog
        isOpen={confirmLeaveOpen}
        onClose={() => {
          setConfirmLeaveOpen(false);
          setPendingAction(null);
        }}
        onConfirm={() => {
          if (pendingAction) pendingAction();
          setConfirmLeaveOpen(false);
          setPendingAction(null);
        }}
        title="Perubahan Belum Disimpan"
        message="Perubahan rancangan jadwal belum disimpan ke server. Tinggalkan halaman dan buang perubahan yang belum disimpan?"
        confirmLabel="Tinggalkan & Buang"
        cancelLabel="Tetap di Sini"
        variant="warning"
      />
    </div>
  );
};
