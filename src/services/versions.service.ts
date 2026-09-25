import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ScheduleVersion } from '../types';

export const versionsService = {
  async getVersions(): Promise<ScheduleVersion[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('schedule_versions')
        .select(`
          *,
          academic_term:term_id ( id, year, term )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Versions query error:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error fetching schedule versions:', err);
      return [];
    }
  },

  async getStats() {
    if (!isSupabaseConfigured()) {
      return { total: 0, published: 0, recentChanges: 0, rollbackAvailable: 0 };
    }

    try {
      const versions = await this.getVersions();
      const total = versions.length;
      const published = versions.filter(v => v.status === 'PUBLISHED').length;
      const recentChanges = versions.filter(v => {
        const created = new Date(v.created_at).getTime();
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return created > weekAgo;
      }).length;

      return {
        total,
        published,
        recentChanges,
        rollbackAvailable: total > 1 ? total - 1 : 0,
      };
    } catch {
      return { total: 0, published: 0, recentChanges: 0, rollbackAvailable: 0 };
    }
  },
};
