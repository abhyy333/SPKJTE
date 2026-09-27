import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CurriculumPackage, AcademicTerm } from '../types';
import { verifyOwnerAdmin } from '../lib/authGuard';
import { academicTermsService } from './academicTerms.service';

export const curriculumPackagesService = {
  /**
   * Fetch all curriculum packages from public.curriculum_packages
   * Note: The table schema is (id, curriculum_id, legacy_id, name, payload).
   * All structural info (curriculum_year, semester, scope, kbk_code, kbk_name, courses)
   * resides strictly inside the JSON payload.
   */
  async getPackages(): Promise<CurriculumPackage[]> {
    if (!isSupabaseConfigured()) {
      throw new Error('Koneksi database belum dikonfigurasi.');
    }

    try {
      const isOwner = await verifyOwnerAdmin();
      const tableName = isOwner ? 'curriculum_packages' : 'guest_curriculum_packages';

      let { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('name', { ascending: true });

      if (error && !isOwner) {
        // Fallback to curriculum_packages directly if guest view doesn't exist
        const fallbackRes = await supabase
          .from('curriculum_packages')
          .select('*')
          .order('name', { ascending: true });
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (error) {
        console.error('Error fetching curriculum_packages from Supabase:', error);
        throw error;
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        curriculum_id: row.curriculum_id,
        legacy_id: row.legacy_id,
        name: row.name,
        payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || { courses: [] }),
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    } catch (err: any) {
      console.error('Failed to load curriculum packages:', err);
      throw err;
    }
  },

  /**
   * Safe lookup for course category from master courses table by course code
   */
  async getMasterCourseCategoryMap(): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (!isSupabaseConfigured()) return map;

    try {
      const isOwner = await verifyOwnerAdmin();
      const tableName = isOwner ? 'courses' : 'guest_courses';

      let { data, error } = await supabase
        .from(tableName)
        .select('code, course_type, category');

      if (error && !isOwner) {
        const fallback = await supabase
          .from('courses')
          .select('code, course_type, category');
        data = fallback.data;
      }

      if (data) {
        data.forEach((c: any) => {
          if (c.code) {
            const cat = c.category || (c.course_type === 'WAJIB' ? 'Wajib' : c.course_type === 'PILIHAN' ? 'Pilihan' : '-');
            map.set(c.code.trim().toUpperCase(), cat);
          }
        });
      }
    } catch (e) {
      console.warn('Failed to load master course categories map:', e);
    }

    return map;
  },

  /**
   * Get active academic term via RPC or academicTermsService
   */
  async getActiveAcademicTerm(): Promise<AcademicTerm | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_active_academic_term');
      if (!rpcErr && rpcData) {
        const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        if (row) {
          return {
            id: row.id,
            academic_year: row.academic_year || row.year || '2026/2027',
            semester_type: row.semester_type || row.term || 'GANJIL',
            is_active: true,
            year: row.academic_year || row.year,
            term: row.semester_type || row.term,
          };
        }
      }
    } catch {
      // fallback to academicTermsService
    }

    return academicTermsService.getActiveTerm();
  },
};
