import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AcademicTerm } from '../types';
import { parseSupabaseError } from '../lib/utils';
import { verifyOwnerAdmin, assertOwnerAdmin } from '../lib/authGuard';

export async function getActiveAcademicTerm(): Promise<AcademicTerm | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase.rpc('get_active_academic_term');

    if (error) {
      console.error('get_active_academic_term failed', error);
      throw error;
    }

    console.log('active academic term RPC', data);

    if (!data || data.length === 0) {
      return null;
    }

    const row = data[0];
    return {
      id: row.id,
      academic_year: row.academic_year || row.year || '2026/2027',
      semester_type: row.semester_type || row.term || 'GANJIL',
      is_active: row.is_active ?? true,
      starts_on: row.starts_on || null,
      ends_on: row.ends_on || null,
      year: row.academic_year || row.year || '2026/2027',
      term: row.semester_type || row.term || 'GANJIL',
    };
  } catch (err) {
    console.error('get_active_academic_term failed', err);
    throw err;
  }
}

export const academicTermsService = {
  async getAcademicTerms(): Promise<AcademicTerm[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const isOwner = await verifyOwnerAdmin();
      const table = isOwner ? 'academic_terms' : 'guest_academic_terms';

      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('academic_year', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Academic terms error:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        ...row,
        academic_year: row.academic_year || row.year || '2026/2027',
        semester_type: row.semester_type || row.term || 'GANJIL',
        starts_on: row.starts_on || row.start_date,
        ends_on: row.ends_on || row.end_date,
        year: row.academic_year || row.year,
        term: row.semester_type || row.term,
      }));
    } catch {
      return [];
    }
  },

  async getActiveTerm(): Promise<AcademicTerm | null> {
    try {
      return await getActiveAcademicTerm();
    } catch {
      return null;
    }
  },

  async createTerm(data: {
    academic_year: string;
    semester_type: 'GANJIL' | 'GENAP';
    starts_on?: string | null;
    ends_on?: string | null;
    is_active?: boolean;
  }): Promise<AcademicTerm> {
    await assertOwnerAdmin('menambah periode akademik');
    if (!isSupabaseConfigured()) {
      throw new Error('Koneksi database belum dikonfigurasi.');
    }

    if (!data.academic_year || !data.academic_year.trim()) {
      throw new Error('Tahun akademik wajib diisi (contoh: 2024/2025).');
    }

    // If marked active, deactivate others first
    if (data.is_active) {
      await supabase.from('academic_terms').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
    }

    const payload: Record<string, any> = {
      academic_year: data.academic_year.trim(),
      semester_type: data.semester_type,
      starts_on: data.starts_on || null,
      ends_on: data.ends_on || null,
      is_active: data.is_active ?? false,
    };

    const { data: created, error } = await supabase
      .from('academic_terms')
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(parseSupabaseError(error));
    }

    return created;
  },

  async updateTerm(
    id: string,
    data: {
      academic_year: string;
      semester_type: 'GANJIL' | 'GENAP';
      starts_on?: string | null;
      ends_on?: string | null;
      is_active?: boolean;
    }
  ): Promise<AcademicTerm> {
    await assertOwnerAdmin('memperbarui periode akademik');
    if (!isSupabaseConfigured()) {
      throw new Error('Koneksi database belum dikonfigurasi.');
    }

    if (data.is_active) {
      await supabase.from('academic_terms').update({ is_active: false }).neq('id', id);
    }

    const payload: Record<string, any> = {
      academic_year: data.academic_year.trim(),
      semester_type: data.semester_type,
      starts_on: data.starts_on || null,
      ends_on: data.ends_on || null,
      is_active: data.is_active ?? false,
    };

    const { data: updated, error } = await supabase
      .from('academic_terms')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(parseSupabaseError(error));
    }

    return updated;
  },

  async setActiveTerm(id: string): Promise<void> {
    await assertOwnerAdmin('mengubah periode aktif');
    if (!isSupabaseConfigured()) return;
    // Set all to false, then set selected to true
    await supabase.from('academic_terms').update({ is_active: false }).neq('id', id);
    const { error } = await supabase.from('academic_terms').update({ is_active: true }).eq('id', id);
    if (error) throw new Error(parseSupabaseError(error));
  },
};
