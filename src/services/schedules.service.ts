import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  CurrentPublishedSchedule,
  CurrentPublishedExam,
  AcademicTerm,
  TimeSlot,
  ScheduleEntry,
} from '../types';

export const schedulesService = {
  async getAcademicTerms(): Promise<AcademicTerm[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('academic_terms')
        .select('*')
        .order('year', { ascending: false });

      if (error) {
        console.warn('Academic terms error:', error);
        return [];
      }
      return data || [];
    } catch {
      return [];
    }
  },

  async getActiveTerm(): Promise<AcademicTerm | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data, error } = await supabase
        .from('academic_terms')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.warn('Active term lookup error:', error);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  },

  async getTimeSlots(): Promise<TimeSlot[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('time_slots')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) {
        console.warn('Time slots lookup error:', error);
        return [];
      }
      return data || [];
    } catch {
      return [];
    }
  },

  async getPublishedSchedule(filters?: {
    day?: string;
    termId?: string;
    className?: string;
  }): Promise<CurrentPublishedSchedule[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      let query = supabase.from('current_published_schedule').select('*');

      if (filters?.day && filters.day !== 'all') {
        query = query.eq('day', filters.day);
      }
      if (filters?.className && filters.className !== 'all') {
        query = query.eq('class_name', filters.className);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('View current_published_schedule query error (may be empty view):', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error fetching published schedule:', err);
      return [];
    }
  },

  async getPublishedExams(examType?: 'UTS' | 'UAS'): Promise<CurrentPublishedExam[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      let query = supabase.from('current_published_exams').select('*');

      if (examType) {
        query = query.eq('exam_type', examType);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('View current_published_exams error:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error fetching published exams:', err);
      return [];
    }
  },

  async getLecturerSchedule(lecturerId: string): Promise<CurrentPublishedSchedule[]> {
    if (!isSupabaseConfigured() || !lecturerId) return [];

    try {
      // 1. Get offering IDs for this lecturer
      const { data: offerings, error: offErr } = await supabase
        .from('course_offering_lecturers')
        .select('course_offering_id')
        .eq('lecturer_id', lecturerId);

      if (offErr || !offerings || offerings.length === 0) return [];

      const offeringIds = offerings.map((o: any) => o.course_offering_id);

      // 2. Fetch published schedule matching these course offerings
      // Or check current_published_schedule
      const allPublished = await this.getPublishedSchedule();
      if (allPublished.length > 0) {
        // filter by lecturer name or course offering
        const { data: lecturer } = await supabase
          .from('lecturers')
          .select('name')
          .eq('id', lecturerId)
          .single();

        if (lecturer?.name) {
          const lName = lecturer.name.toLowerCase();
          return allPublished.filter((s: any) => {
            const names = Array.isArray(s.lecturer_names)
              ? s.lecturer_names.join(', ')
              : String(s.lecturer_names || '');
            return names.toLowerCase().includes(lName);
          });
        }
      }

      return [];
    } catch (err) {
      console.error('Error getting lecturer schedule:', err);
      return [];
    }
  },

  async getStudentSchedule(studentId: string): Promise<CurrentPublishedSchedule[]> {
    if (!isSupabaseConfigured() || !studentId) return [];

    try {
      // RULE 30 & 50: Use class_assignments ONLY (NO KRS!)
      const { data: assignments, error } = await supabase
        .from('class_assignments')
        .select(`
          course_offering_id,
          course_offering:course_offering_id (
            id,
            class_name,
            course_id
          )
        `)
        .eq('student_id', studentId);

      if (error || !assignments || assignments.length === 0) return [];

      const courseIds = assignments
        .map((a: any) => a.course_offering?.course_id)
        .filter(Boolean);
      const classNames = assignments
        .map((a: any) => a.course_offering?.class_name)
        .filter(Boolean);

      const allPublished = await this.getPublishedSchedule();
      return allPublished.filter(
        (s: any) =>
          courseIds.includes(s.course_id) && classNames.includes(s.class_name)
      );
    } catch (err) {
      console.error('Error getting student schedule:', err);
      return [];
    }
  },

  async getScheduleStatus(): Promise<{ status: string; percentage: number }> {
    if (!isSupabaseConfigured()) {
      return { status: 'Belum ada jadwal', percentage: 0 };
    }

    try {
      // Check schedule_publications
      const { data: pubs, error: pubErr } = await supabase
        .from('schedule_publications')
        .select('id, published_at')
        .order('published_at', { ascending: false })
        .limit(1);

      if (pubs && pubs.length > 0) {
        return { status: 'Diterbitkan', percentage: 100 };
      }

      // Check schedule_versions
      const { data: versions, error: verErr } = await supabase
        .from('schedule_versions')
        .select('status')
        .order('created_at', { ascending: false })
        .limit(1);

      if (versions && versions.length > 0) {
        const s = versions[0].status;
        if (s === 'PUBLISHED') return { status: 'Diterbitkan', percentage: 100 };
        if (s === 'DRAFT') return { status: 'Draft', percentage: 85 };
        return { status: 'Belum diterbitkan', percentage: 40 };
      }

      return { status: 'Belum ada jadwal', percentage: 0 };
    } catch {
      return { status: 'Belum ada jadwal', percentage: 0 };
    }
  },
};
