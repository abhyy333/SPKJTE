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
          academic_term:academic_term_id ( id, academic_year, semester_type, year, term )
        `)
        .order('created_at', { ascending: false });

      if (termId && termId !== 'all') {
        query = query.eq('academic_term_id', termId);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data.map((row: any) => ({
          ...row,
          academic_term_id: row.academic_term_id || row.term_id,
          term_id: row.academic_term_id || row.term_id,
        }));
      }

      // Plain fallback query without foreign key joins if FK join fails
      let plainQuery = supabase
        .from('schedule_versions')
        .select('*')
        .order('created_at', { ascending: false });

      if (termId && termId !== 'all') {
        plainQuery = plainQuery.eq('academic_term_id', termId);
      }

      const { data: plainData } = await plainQuery;
      return (plainData || []).map((row: any) => ({
        ...row,
        academic_term_id: row.academic_term_id || row.term_id,
        term_id: row.academic_term_id || row.term_id,
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
          academic_term:academic_term_id ( id, academic_year, semester_type, year, term )
        `)
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return {
          ...data,
          academic_term_id: data.academic_term_id || data.term_id,
          term_id: data.academic_term_id || data.term_id,
        };
      }

      // Plain fallback query without foreign key join
      const { data: plainData } = await supabase
        .from('schedule_versions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (plainData) {
        return {
          ...plainData,
          academic_term_id: plainData.academic_term_id || plainData.term_id,
          term_id: plainData.academic_term_id || plainData.term_id,
        };
      }

      return null;
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
      return {
        id: data.id || data.version_id || createdId || 'draft-version',
        term_id: termId,
        academic_term_id: termId,
        version_number: String(data.version_number || 1),
        revision: Number(data.revision || 1),
        title: draftTitle,
        type: 'LECTURE',
        status: 'DRAFT',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...data,
      } as ScheduleVersion;
    }

    // fallback query
    const latest = await this.getVersions(termId);
    if (latest.length > 0) return latest[0];

    // Fallback constructed version if database row was created but query had RLS delay
    if (createdId) {
      return {
        id: String(createdId),
        term_id: termId,
        academic_term_id: termId,
        version_number: '1',
        revision: 1,
        title: draftTitle,
        type: 'LECTURE',
        status: 'DRAFT',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    throw new Error('Gagal membuat atau memuat detail draft jadwal.');
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

  /**
   * Fetches entries for a specific schedule version
   */
  async getVersionEntries(versionId: string): Promise<any[]> {
    if (!isSupabaseConfigured() || !versionId) return [];

    try {
      const { data, error } = await supabase
        .from('schedule_entries')
        .select(`
          *,
          room:room_id ( id, code, name, capacity, room_type ),
          course_offering:course_offering_id (
            id,
            class_code,
            expected_students,
            course:course_id ( id, name, code, effective_sks, semester, category, kbk_id )
          )
        `)
        .eq('schedule_version_id', versionId)
        .order('day_of_week', { ascending: true })
        .order('start_minute', { ascending: true });

      if (error) {
        console.warn('Error fetching version entries:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('getVersionEntries error:', err);
      return [];
    }
  },

  /**
   * Publishes a schedule version using the backend RPC publish_schedule_version
   * Strictly enforces backend validation and handles STALE_REVISION gracefully.
   */
  async publishScheduleVersion(
    versionId: string,
    expectedRevision: number
  ): Promise<{ success: boolean; version?: ScheduleVersion }> {
    await assertOwnerAdmin('menerbitkan jadwal perkuliahan');
    if (!isSupabaseConfigured()) {
      throw new Error('Koneksi database belum dikonfigurasi.');
    }

    try {
      // 1. Refresh conflicts first to ensure validation accuracy
      await this.refreshConflicts(versionId);

      // 2. Call RPC publish_schedule_version
      let rpcError: any = null;

      const res1 = await supabase.rpc('publish_schedule_version', {
        p_version_id: versionId,
        p_expected_revision: expectedRevision,
      });

      if (res1.error) {
        // Fallback parameter signatures if backend uses different param names
        if (
          res1.error.message?.includes('function') &&
          res1.error.message?.includes('does not exist')
        ) {
          const res2 = await supabase.rpc('publish_schedule_version', {
            p_version_id: versionId,
            p_revision: expectedRevision,
          });
          if (res2.error) {
            const res3 = await supabase.rpc('publish_schedule_version', {
              version_id: versionId,
              expected_revision: expectedRevision,
            });
            if (res3.error) {
              rpcError = res3.error;
            }
          }
        } else {
          rpcError = res1.error;
        }
      }

      if (rpcError) {
        const errStr = rpcError.message || '';
        console.error('publish_schedule_version RPC error:', rpcError);

        if (
          errStr.includes('STALE_REVISION') ||
          errStr.includes('stale revision') ||
          errStr.includes('revision mismatch')
        ) {
          throw new Error('Versi jadwal telah berubah. Muat ulang sebelum menerbitkan.');
        } else if (errStr.includes('ROOM_CONFLICT')) {
          throw new Error('Gagal menerbitkan: Terdapat bentrok ruangan pada jadwal perkuliahan.');
        } else if (errStr.includes('LECTURER_CONFLICT')) {
          throw new Error('Gagal menerbitkan: Terdapat bentrok jadwal mengajar dosen pengampu.');
        } else if (errStr.includes('CLASS_GROUP_CONFLICT')) {
          throw new Error('Gagal menerbitkan: Terdapat bentrok waktu pada rombongan kelas mahasiswa yang sama.');
        } else if (errStr.includes('ROOM_CAPACITY_EXCEEDED')) {
          throw new Error('Gagal menerbitkan: Kapasitas ruangan tidak mencukupi untuk jumlah peserta kelas.');
        } else if (errStr.includes('LECTURER_UNAVAILABLE')) {
          throw new Error('Gagal menerbitkan: Dosen pengampu berhalangan hadir pada slot waktu perkuliahan.');
        } else if (errStr.includes('NON_CONSECUTIVE_OR_INACTIVE_SESSIONS')) {
          throw new Error('Gagal menerbitkan: Sesi perkuliahan tidak berurutan atau menggunakan slot tidak aktif.');
        } else if (errStr.includes('INCOMPLETE_SCHEDULE')) {
          throw new Error('Gagal menerbitkan: Masih ada kelas aktif yang belum dijadwalkan.');
        }
        throw new Error(parseSupabaseError(rpcError));
      }

      // Fetch the updated published version
      const updatedVersion = await this.getVersionById(versionId);

      return {
        success: true,
        version: updatedVersion || undefined,
      };
    } catch (err: any) {
      console.error('[scheduleVersionsService] publishScheduleVersion error:', err);
      throw err;
    }
  },

  /**
   * Sets the schedule scope (offering IDs that belong to the active workflow)
   * Calls backend RPC set_schedule_scope
   */
  async setScheduleScope(
    versionId: string,
    expectedRevision: number,
    offeringIds: string[]
  ): Promise<{ newRevision: number; version?: ScheduleVersion }> {
    await assertOwnerAdmin('menetapkan scope jadwal');
    if (!isSupabaseConfigured()) {
      throw new Error('Koneksi database belum dikonfigurasi.');
    }

    try {
      const { data, error } = await supabase.rpc('set_schedule_scope', {
        p_version_id: versionId,
        p_expected_revision: expectedRevision,
        p_offering_ids: offeringIds,
      });

      if (error) {
        console.error('Error set_schedule_scope RPC:', error);
        throw new Error(parseSupabaseError(error));
      }

      let newRevision = expectedRevision + 1;
      if (typeof data === 'number') {
        newRevision = data;
      } else if (data && typeof data === 'object' && typeof (data as any).revision === 'number') {
        newRevision = (data as any).revision;
      }

      const updatedVersion = await this.getVersionById(versionId);
      return {
        newRevision: updatedVersion?.revision ?? newRevision,
        version: updatedVersion || undefined,
      };
    } catch (err: any) {
      console.error('[scheduleVersionsService] setScheduleScope error:', err);
      throw err;
    }
  },

  /**
   * Retrieves smart move recommendations for a schedule entry
   * Calls backend RPC get_schedule_move_recommendations
   */
  async getMoveRecommendations(
    entryId: string,
    limit: number = 5
  ): Promise<any[]> {
    if (!isSupabaseConfigured() || !entryId) return [];

    try {
      const { data, error } = await supabase.rpc('get_schedule_move_recommendations', {
        p_entry_id: entryId,
        p_limit: limit,
      });

      if (error) {
        console.warn('Error get_schedule_move_recommendations RPC:', error);
        return [];
      }

      if (Array.isArray(data)) {
        return data;
      } else if (data && Array.isArray((data as any).recommendations)) {
        return (data as any).recommendations;
      }
      return [];
    } catch (err: any) {
      console.error('[scheduleVersionsService] getMoveRecommendations error:', err);
      return [];
    }
  },

  /**
   * Move / reschedule a single schedule entry to new slot & room
   * Updates schedule_entries row and refreshes schedule conflicts
   */
  async moveScheduleEntry(
    entryId: string,
    versionId: string,
    payload: {
      dayOfWeek: number;
      startMinute: number;
      endMinute: number;
      startTime: string;
      endTime: string;
      roomId: string;
      roomName?: string;
      roomCode?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    await assertOwnerAdmin('memindahkan jadwal perkuliahan');
    if (!isSupabaseConfigured()) {
      throw new Error('Database belum terhubung.');
    }

    try {
      const updateData: any = {
        day_of_week: payload.dayOfWeek,
        start_minute: payload.startMinute,
        room_id: payload.roomId,
        updated_at: new Date().toISOString(),
      };
      if (payload.roomName) updateData.room_name = payload.roomName;
      if (payload.roomCode) updateData.room_code = payload.roomCode;

      const { error } = await supabase
        .from('schedule_entries')
        .update(updateData)
        .eq('id', entryId);

      if (error) {
        throw new Error(parseSupabaseError(error));
      }

      // Also update version revision if possible
      try {
        const { data: v } = await supabase
          .from('schedule_versions')
          .select('revision')
          .eq('id', versionId)
          .single();
        if (v) {
          await supabase
            .from('schedule_versions')
            .update({
              revision: (v.revision || 1) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', versionId);
        }
      } catch (_) {}

      // Refresh conflicts
      await this.refreshConflicts(versionId);

      return { success: true };
    } catch (err: any) {
      console.error('[scheduleVersionsService] moveScheduleEntry error:', err);
      return { success: false, error: err.message || 'Gagal memindahkan jadwal perkuliahan' };
    }
  },

  /**
   * Helper alias for publishScheduleVersion
   */
  async publishVersion(versionId: string, _changelog?: string): Promise<{ success: boolean; version?: ScheduleVersion }> {
    const version = await this.getVersionById(versionId);
    const revision = version?.revision || 1;
    return this.publishScheduleVersion(versionId, revision);
  },

  /**
   * Deletes a draft schedule version
   */
  async deleteVersion(versionId: string): Promise<void> {
    await assertOwnerAdmin('menghapus draf jadwal');
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase
      .from('schedule_versions')
      .delete()
      .eq('id', versionId);
    if (error) {
      throw new Error(parseSupabaseError(error));
    }
  },
};
