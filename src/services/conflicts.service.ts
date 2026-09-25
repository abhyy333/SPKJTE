import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ScheduleConflict, ScheduleSuggestion } from '../types';

export const conflictsService = {
  async getConflicts(filters?: {
    severity?: string;
    type?: string;
    isResolved?: boolean;
  }): Promise<ScheduleConflict[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      let query = supabase
        .from('schedule_conflicts')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.severity && filters.severity !== 'all') {
        query = query.ilike('severity', `%${filters.severity}%`);
      }
      if (filters?.type && filters.type !== 'all') {
        query = query.eq('conflict_type', filters.type);
      }
      if (typeof filters?.isResolved === 'boolean') {
        query = query.eq('is_resolved', filters.isResolved);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('Conflicts query warning:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error fetching conflicts:', err);
      return [];
    }
  },

  async getSuggestions(): Promise<ScheduleSuggestion[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('schedule_suggestions')
        .select('*')
        .order('id', { ascending: true })
        .limit(10);

      if (error) {
        console.warn('Suggestions warning:', error);
        return [];
      }
      return data || [];
    } catch {
      return [];
    }
  },

  async getStats() {
    if (!isSupabaseConfigured()) {
      return { total: 0, lecturerConflicts: 0, roomConflicts: 0, studentConflicts: 0 };
    }

    try {
      const conflicts = await this.getConflicts({ isResolved: false });
      const total = conflicts.length;
      const lecturerConflicts = conflicts.filter(c => c.conflict_type === 'LECTURER').length;
      const roomConflicts = conflicts.filter(c => c.conflict_type === 'ROOM').length;
      const studentConflicts = conflicts.filter(c => c.conflict_type === 'STUDENT' || c.conflict_type === 'CLASS').length;

      return { total, lecturerConflicts, roomConflicts, studentConflicts };
    } catch {
      return { total: 0, lecturerConflicts: 0, roomConflicts: 0, studentConflicts: 0 };
    }
  },
};
