import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ScheduleVersion, ScheduleDraftEntryInput } from '../types';
import { parseSupabaseError } from '../lib/utils';
import { assertOwnerAdmin } from '../lib/authGuard';

export const scheduleVersionsService = {
  /**
   * Get all schedule versions, optionally filtered by academic term
   */
  async getVersions(termId?: string): Promise<ScheduleVersion[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      let query = supabase
        .from('schedule_versions')
        .select(`
          *,
          academic_term:term_id ( id, academic_year, semester_type, year, term )
        `)
        .order('created_at', { ascending: false });

      if (termId && termId !== 'all') {
        // Support either term_id or academic_term_id
        query = query.or(`term_id.eq.${termId},academic_term_id.eq.${termId}`);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('Error fetching schedule versions:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        ...row,
        term_id: row.term_id || row.academic_term_id,
        academic_term_id: row.academic_term_id || row.term_id,
      }));
    } catch (err) {
      console.error('Error fetching schedule versions:', err);
      return [];
    }
  },

  /**
   * Get single schedule version by ID
   */
  async getVersionById(id: string): Promise<ScheduleVersion | null> {
    if (!isSupabaseConfigured() || !id) return null;

    try {
      const { data, error } = await supabase
        .from('schedule_versions')
        .select(`
          *,
          academic_term:term_id ( id, academic_year, semester_type, year, term )
        `)
        .eq('id', id)
        .single();

      if (error || !data) return null;

      return {
        ...data,
        term_id: data.term_id || data.academic_term_id,
        academic_term_id: data.academic_term_id || data.term_id,
      };
    } catch {
      return null;
    }
  },

  /**
   * Create a new draft schedule using existing backend RPC
   */
  async createDraft(
    termId: string,
    title?: string,
    copyFromId?: string | null
  ): Promise<ScheduleVersion> {
    await assertOwnerAdmin('membuat draft jadwal');
    if (!isSupabaseConfigured()) {
      throw new Error('Koneksi database belum dikonfigurasi.');
    }

    const draftTitle = title?.trim() || 'Jadwal Perkuliahan Draft';

    const { data, error } = await supabase.rpc('create_schedule_draft', {
      p_term_id: termId,
      p_type: 'LECTURE',
      p_title: draftTitle,
      p_copy_from: copyFromId || null,
    });

    if (error) {
      console.error('Error creating schedule draft RPC:', error);
      throw new Error(parseSupabaseError(error));
    }

    // data can be version id or version object
    const createdId = typeof data === 'string' ? data : (data?.id || (data as any)?.version_id);
    if (createdId) {
      const version = await this.getVersionById(createdId);
      if (version) return version;
    }

    if (data && typeof data === 'object') {
      return data as ScheduleVersion;
    }

    // fallback query
    const latest = await this.getVersions(termId);
    if (latest.length > 0) return latest[0];

    throw new Error('Draft jadwal berhasil dibuat namun gagal memuat detail versi.');
  },

  /**
   * Save draft entries snapshot using existing backend RPC with optimistic concurrency
   */
  async saveDraft(
    versionId: string,
    expectedRevision: number,
    entries: ScheduleDraftEntryInput[],
    reason: string = 'Penyesuaian jadwal manual'
  ): Promise<{ revision: number; version?: ScheduleVersion }> {
    await assertOwnerAdmin('menyimpan perubahan jadwal');
    if (!isSupabaseConfigured()) {
      throw new Error('Koneksi database belum dikonfigurasi.');
    }

    const cleanEntries = entries.map((e) => ({
      course_offering_id: e.course_offering_id,
      room_id: e.room_id,
      day_of_week: Number(e.day_of_week),
      exam_date: e.exam_date || null,
      start_minute: Number(e.start_minute),
    }));

    const { data, error } = await supabase.rpc('save_draft_entries', {
      p_version_id: versionId,
      p_expected_revision: expectedRevision,
      p_entries: cleanEntries,
      p_reason: reason.trim() || 'Penyesuaian jadwal manual',
    });

    if (error) {
      console.error('Error save_draft_entries RPC:', error);
      throw new Error(parseSupabaseError(error));
    }

    let updatedRevision = expectedRevision + 1;
    if (typeof data === 'number') {
      updatedRevision = data;
    } else if (data && typeof data === 'object') {
      if (typeof (data as any).revision === 'number') {
        updatedRevision = (data as any).revision;
      }
    }

    // Refresh version
    const updatedVersion = await this.getVersionById(versionId);

    return {
      revision: updatedVersion?.revision ?? updatedRevision,
      version: updatedVersion || undefined,
    };
  },

  /**
   * Refresh schedule conflicts using existing backend RPC
   */
  async refreshConflicts(versionId: string): Promise<void> {
    if (!isSupabaseConfigured() || !versionId) return;

    try {
      const { error } = await supabase.rpc('refresh_schedule_conflicts', {
        p_version_id: versionId,
      });

      if (error) {
        console.warn('refresh_schedule_conflicts RPC warning:', error);
      }
    } catch (err) {
      console.warn('Failed to call refresh_schedule_conflicts RPC:', err);
    }
  },

  /**
   * Copy an existing schedule version into a new draft version
   */
  async copyVersion(
    sourceVersionId: string,
    newTitle: string,
    termId: string
  ): Promise<ScheduleVersion> {
    await assertOwnerAdmin('menyalin versi jadwal');
    return this.createDraft(termId, newTitle, sourceVersionId);
  },

  /**
   * Compare two versions (e.g. Version A vs Version B) and return detailed difference analysis
   */
  async compareVersions(
    versionAId: string,
    versionBId: string
  ): Promise<{
    versionA: ScheduleVersion | null;
    versionB: ScheduleVersion | null;
    addedInB: any[];
    removedFromA: any[];
    modified: Array<{
      offeringId: string;
      courseName: string;
      courseCode?: string;
      classCode: string;
      entryA: any;
      entryB: any;
      timeChanged: boolean;
      roomChanged: boolean;
    }>;
    identical: any[];
    summary: {
      totalInA: number;
      totalInB: number;
      modifiedCount: number;
      addedCount: number;
      removedCount: number;
      identicalCount: number;
    };
  }> {
    if (!isSupabaseConfigured()) {
      return {
        versionA: null,
        versionB: null,
        addedInB: [],
        removedFromA: [],
        modified: [],
        identical: [],
        summary: {
          totalInA: 0,
          totalInB: 0,
          modifiedCount: 0,
          addedCount: 0,
          removedCount: 0,
          identicalCount: 0,
        },
      };
    }

    try {
      const [vA, vB, { data: entriesA }, { data: entriesB }] = await Promise.all([
        this.getVersionById(versionAId),
        this.getVersionById(versionBId),
        supabase
          .from('schedule_entries')
          .select('*, room:room_id(id, code, name), course_offering:course_offering_id(id, class_code, course:course_id(id, name, code, effective_sks))')
          .eq('schedule_version_id', versionAId),
        supabase
          .from('schedule_entries')
          .select('*, room:room_id(id, code, name), course_offering:course_offering_id(id, class_code, course:course_id(id, name, code, effective_sks))')
          .eq('schedule_version_id', versionBId),
      ]);

      const mapA = new Map<string, any>();
      (entriesA || []).forEach((e: any) => mapA.set(e.course_offering_id, e));

      const mapB = new Map<string, any>();
      (entriesB || []).forEach((e: any) => mapB.set(e.course_offering_id, e));

      const addedInB: any[] = [];
      const removedFromA: any[] = [];
      const modified: any[] = [];
      const identical: any[] = [];

      // Check items in B
      mapB.forEach((eB, offeringId) => {
        const eA = mapA.get(offeringId);
        if (!eA) {
          addedInB.push(eB);
        } else {
          const timeChanged =
            Number(eA.day_of_week) !== Number(eB.day_of_week) ||
            Number(eA.start_minute) !== Number(eB.start_minute);
          const roomChanged = eA.room_id !== eB.room_id;

          if (timeChanged || roomChanged) {
            modified.push({
              offeringId,
              courseName: eB.course_offering?.course?.name || eB.course_name || 'Mata Kuliah',
              courseCode: eB.course_offering?.course?.code || eB.course_code,
              classCode: eB.course_offering?.class_code || eB.class_code || 'A',
              entryA: eA,
              entryB: eB,
              timeChanged,
              roomChanged,
            });
          } else {
            identical.push(eB);
          }
        }
      });

      // Check items in A removed in B
      mapA.forEach((eA, offeringId) => {
        if (!mapB.has(offeringId)) {
          removedFromA.push(eA);
        }
      });

      return {
        versionA: vA,
        versionB: vB,
        addedInB,
        removedFromA,
        modified,
        identical,
        summary: {
          totalInA: (entriesA || []).length,
          totalInB: (entriesB || []).length,
          modifiedCount: modified.length,
          addedCount: addedInB.length,
          removedCount: removedFromA.length,
          identicalCount: identical.length,
        },
      };
    } catch (err) {
      console.error('compareVersions error:', err);
      throw err;
    }
  },
};
