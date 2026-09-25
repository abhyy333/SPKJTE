export type UserRole = 'ADMIN' | 'DOSEN' | 'MAHASISWA';

export interface AuthorizedAccount {
  email: string;
  role: 'ADMIN' | 'DOSEN';
  lecturer_id: string | null;
  user_id: string | null;
  is_active: boolean;
  is_system_owner: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  claimed_at: string | null;
  // joined relations
  lecturer?: Lecturer | null;
  profile?: Profile | null;
}

export interface Profile {
  id: string;
  role: UserRole;
  name: string;
  email?: string;
  avatar_url?: string | null;
  preview_roles?: UserRole[] | null;
  created_at?: string;
  updated_at?: string;
}

export interface AcademicTerm {
  id: string;
  academic_year: string; // e.g. "2024/2025"
  semester_type: 'GANJIL' | 'GENAP';
  is_active: boolean;
  starts_on?: string | null;
  ends_on?: string | null;
  created_at?: string;
  // Aliases for compatibility
  name?: string;
  year?: string;
  term?: 'GANJIL' | 'GENAP';
  start_date?: string;
  end_date?: string;
}

export interface Curriculum {
  id: string;
  name: string; // e.g. "Kurikulum 2022", "Kurikulum 2026"
  year: number;
  is_active: boolean;
  description?: string;
  created_at?: string;
}

export interface KBK {
  id: string;
  name: string; // "Komputer", "Sistem Tenaga Listrik", "Elektronika Komunikasi"
  code?: string;
  description?: string;
  head_lecturer_id?: string;
}

export interface Lecturer {
  id: string;
  profile_id?: string | null;
  name: string;
  lecturer_code?: string | null;
  code?: string | null; // alias
  nip?: string | null;
  nidn?: string | null;
  kbk_id?: string | null;
  email?: string | null;
  phone?: string | null;
  room_office?: string | null;
  consultation_hours?: string | null;
  status?: 'Aktif' | 'Nonaktif' | 'Cuti' | string;
  kbk?: KBK | null;
  // joined relations
  offerings_count?: number;
  total_sks?: number;
  profile?: Profile | null;
}

export interface Student {
  id: string;
  profile_id?: string | null;
  nim: string;
  full_name?: string | null;
  name?: string; // alias
  cohort?: number | null;
  batch_year?: number; // alias
  semester?: number;
  kbk_id?: string | null;
  status?: 'Aktif' | 'Cuti' | 'Lulus' | string;
  metadata?: Record<string, any> | null;
  advisor_lecturer_id?: string | null;
  kbk?: KBK | null;
  advisor?: Lecturer | null;
  profile?: Profile | null;
  // joined
  class_assignments_count?: number;
  total_sks?: number;
}

export type CourseType = 'WAJIB' | 'PILIHAN' | 'LAINNYA';

export interface Course {
  id: string;
  code?: string | null; // e.g. "TE207" or null
  name: string;
  effective_sks: number;
  sks?: number; // alias
  semester: number;
  course_type?: CourseType | string;
  category?: 'Wajib' | 'Pilihan' | string; // alias
  activity_type?: 'KULIAH' | 'PRAKTIKUM' | 'KKN' | string;
  kbk_id?: string | null;
  curriculum_id?: string | null;
  is_schedulable: boolean;
  managed_by?: string | null;
  scope?: string | null;
  legacy_id?: string | null;
  metadata?: Record<string, any> | null;
  description?: string | null;
  prerequisites?: string | null;
  kbk?: KBK | null;
  curriculum?: Curriculum | null;
  offerings_count?: number;
}

export interface CourseOffering {
  id: string;
  academic_term_id?: string;
  term_id?: string; // alias
  course_id: string;
  class_code: string; // e.g. "A", "B", "INTER", "REG"
  class_name?: string; // alias
  class_keys?: string[] | null;
  effective_sks?: number;
  expected_students: number;
  include_uts: boolean;
  include_uas: boolean;
  assignment_confirmed: boolean;
  required_room_type?: string | null;
  planning_metadata?: Record<string, any> | null;
  course?: Course | null;
  academic_term?: AcademicTerm | null;
  lecturers?: CourseOfferingLecturer[];
  course_offering_lecturers?: CourseOfferingLecturer[];
  class_assignments?: ClassAssignment[];
}

export interface CourseOfferingLecturer {
  course_offering_id: string;
  lecturer_id: string;
  assignment_role: 'PENGAMPU' | 'KOORDINATOR' | string;
  lecturer?: Lecturer | null;
  course_offering?: CourseOffering | null;
}

export interface Room {
  id: string;
  code: string; // e.g. "E101", "Lab Kom 1"
  name: string;
  capacity: number;
  room_type: string; // e.g. "KELAS", "LAB", "Ruang Kuliah Teori"
  facilities?: string | string[] | null;
  is_active: boolean;
  building?: string;
  floor?: number | string;
  metadata?: Record<string, any> | null;
  status?: string;
}

export interface TimeSlot {
  id: string;
  academic_term_id?: string | null;
  day_of_week: number; // 1 = Senin, 2 = Selasa, 3 = Rabu, 4 = Kamis, 5 = Jumat, 6 = Sabtu, 7 = Minggu
  start_minute: number; // e.g. 470 = 07:50
  end_minute: number; // e.g. 520 = 08:40
  is_active: boolean;
  label?: string | null;
  // helper fields
  day?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  slot_type?: string;
}

export type AvailabilityPreference = 'preferred' | 'neutral' | 'avoid';

export interface LecturerAvailability {
  id: string;
  lecturer_id: string;
  academic_term_id?: string | null;
  day_of_week: number;
  start_minute: number;
  end_minute: number;
  is_available: boolean; // false = HARD UNAVAILABLE
  preference: AvailabilityPreference;
  notes?: string | null;
  // joined
  lecturer?: Lecturer | null;
  time_slot?: TimeSlot | null;
  day?: string;
  start_time?: string;
  end_time?: string;
}

export interface ClassAssignment {
  id: string;
  academic_term_id?: string | null;
  student_id: string;
  course_offering_id: string;
  assignment_source: 'MANUAL' | 'IMPORT' | 'SYSTEM' | string;
  locked: boolean;
  assigned_at?: string;
  student?: Student | null;
  course_offering?: CourseOffering | null;
}

export interface ScheduleVersion {
  id: string;
  version_number?: string;
  title: string;
  term_id?: string;
  academic_term_id?: string;
  version_type?: string;
  type?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'REPLACED' | string;
  revision: number;
  created_at: string;
  updated_at?: string;
  published_at?: string | null;
  created_by?: string | null;
  changelog?: string | null;
  academic_term?: AcademicTerm | null;
}

export interface ScheduleDraftEntryInput {
  course_offering_id: string;
  room_id: string;
  day_of_week: number;
  exam_date?: string | null;
  start_minute: number;
}

export interface ScheduleEntry {
  id: string;
  schedule_version_id: string;
  course_offering_id: string;
  room_id: string;
  time_slot_id?: string | null;
  day_of_week?: number;
  start_minute?: number;
  end_minute?: number;
  exam_date?: string | null;
  day?: string;
  start_time?: string;
  end_time?: string;
  // Snapshots
  course_name?: string;
  course_code?: string;
  class_code?: string;
  student_count?: number;
  room_capacity?: number;
  lecturer_ids?: string[];
  lecturer_names?: string[] | string;
  session_count?: number;
  // Relations
  course_offering?: CourseOffering | null;
  room?: Room | null;
  time_slot?: TimeSlot | null;
}

export interface CurrentPublishedSchedule {
  id: string;
  term_id: string;
  course_id: string;
  course_code: string;
  course_name: string;
  sks: number;
  class_name: string;
  day: string;
  start_time: string;
  end_time: string;
  room_id: string;
  room_code: string;
  room_name: string;
  lecturer_names: string | string[];
  kbk_name?: string;
}

export interface ScheduleConflict {
  id: string;
  schedule_version_id?: string | null;
  conflict_type: 'ROOM' | 'LECTURER' | 'STUDENT' | 'CLASS' | 'CAPACITY';
  severity: 'KRITIS' | 'TINGGI' | 'SEDANG' | 'RENDAH' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  is_resolved: boolean;
  conflict_source?: string | null;
  suggested_action?: string | null;
  course_name?: string;
  course_code?: string;
  lecturer_name?: string;
  room_code?: string;
  day?: string;
  time?: string;
  created_at?: string;
}

export interface ScheduleSuggestion {
  id: string;
  conflict_id: string;
  suggestion_type: string;
  description: string;
  applied: boolean;
}

export interface ExamSession {
  id: string;
  term_id: string;
  exam_type: 'UTS' | 'UAS';
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface CurrentPublishedExam {
  id: string;
  exam_type: 'UTS' | 'UAS';
  date: string;
  day?: string;
  start_time: string;
  end_time: string;
  course_name: string;
  course_code: string;
  class_name: string;
  room_code: string;
  room_name?: string;
  proctor_names?: string;
  status: string;
}

export interface LecturerCourseAssignment {
  semester: number;
  course_code: string;
  course_name: string;
  class_code: string;
  effective_sks: number;
  lecturer_code?: string | null;
  lecturer_name: string;
  nip?: string | null;
  assignment_role?: 'PENGAMPU' | 'KOORDINATOR' | string | null;
  academic_year?: string | null;
  semester_type?: 'GANJIL' | 'GENAP' | string | null;
}

