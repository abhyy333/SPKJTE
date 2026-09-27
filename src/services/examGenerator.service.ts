import {
  ExamSession,
  ExamEntry,
  ExamDraftEntryInput,
  Room,
  Lecturer,
  CourseOffering,
  Course,
  LecturerAvailability,
  ExamSourceOffering,
} from '../types';

export interface ExamGenerationInput {
  examType: 'UTS' | 'UAS';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  allowedDays: number[]; // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  defaultDurationMinutes: number;
  sessions: ExamSession[];
  offerings: (CourseOffering | ExamSourceOffering)[];
  rooms: Room[];
  lecturers: Lecturer[];
  supervisorAssignments: Record<string, { primaryId: string; secondaryId?: string }>;
  roomPreferences: Record<string, string[]>; // offeringId -> room_ids[]
  availabilities?: LecturerAvailability[];
}

export interface GeneratedExamSlot {
  courseOfferingId: string;
  courseName: string;
  courseCode: string;
  classCode: string;
  semester: number;
  expectedStudents: number;
  examDate: string; // YYYY-MM-DD
  dayOfWeek: number;
  sessionId: string;
  sessionName: string;
  startMinute: number;
  endMinute: number;
  durationMinutes: number;
  roomIds: string[];
  roomNames: string[];
  roomCapacity: number;
  supervisorIds: string[];
  supervisorNames: string[];
  isConflict: boolean;
  conflictReasons: string[];
}

export interface ExamGenerationResult {
  slots: GeneratedExamSlot[];
  draftEntriesPayload: ExamDraftEntryInput[];
  summary: {
    totalExams: number;
    scheduledExams: number;
    conflictCount: number;
    roomsUsedCount: number;
    supervisorsUsedCount: number;
  };
}

/**
 * Generate dates array between startDate and endDate filtered by allowed days
 */
export function generateDateRange(
  startDateStr: string,
  endDateStr: string,
  allowedDays: number[]
): { dateStr: string; dayOfWeek: number; formatted: string }[] {
  const dates: { dateStr: string; dayOfWeek: number; formatted: string }[] = [];
  if (!startDateStr || !endDateStr) return dates;

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return dates;
  }

  const current = new Date(start);
  while (current <= end) {
    // JS getDay(): 0=Sun, 1=Mon, ..., 6=Sat
    const jsDay = current.getDay();
    const appDay = jsDay === 0 ? 7 : jsDay; // 1=Mon, ..., 7=Sun

    if (allowedDays.includes(appDay)) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const dayNames = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const formatted = `${dayNames[appDay]}, ${current.getDate()} ${monthNames[current.getMonth()]} ${year}`;

      dates.push({
        dateStr,
        dayOfWeek: appDay,
        formatted,
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Find best matching rooms for expected students capacity
 */
export function allocateRoomsForExam(
  expectedStudents: number,
  availableRooms: Room[],
  preferredRoomIds?: string[],
  requiredRoomType?: string
): { roomIds: string[]; roomNames: string[]; totalCapacity: number; waste: number } {
  const isLabRequired =
    requiredRoomType &&
    (requiredRoomType.toUpperCase().includes('LAB') ||
      requiredRoomType.toUpperCase().includes('PRAKTIK'));

  // If user provided specific valid preferred rooms, check and use them if compatible
  if (preferredRoomIds && preferredRoomIds.length > 0) {
    const selected = availableRooms.filter(
      (r) => r.is_active !== false && preferredRoomIds.includes(r.id)
    );
    const cap = selected.reduce((sum, r) => sum + r.capacity, 0);
    if (selected.length > 0 && cap >= expectedStudents) {
      return {
        roomIds: selected.map((r) => r.id),
        roomNames: selected.map((r) => r.code || r.name),
        totalCapacity: cap,
        waste: cap - expectedStudents,
      };
    }
  }

  // Filter compatible active rooms
  const compatibleRooms = availableRooms.filter((r) => {
    if (r.is_active === false) return false;
    const rType = (r.room_type || (r as any).type || '').toUpperCase();
    const isLabRoom = rType.includes('LAB') || rType.includes('KOMPUTER');

    if (isLabRequired) {
      return isLabRoom;
    } else {
      // For theory/general exams, strictly exclude Labs
      return !isLabRoom;
    }
  });

  // 1. Try single room with smallest capacity that fits (minimum waste)
  const singleRooms = compatibleRooms
    .filter((r) => r.capacity >= expectedStudents)
    .sort((a, b) => a.capacity - b.capacity);

  if (singleRooms.length > 0) {
    const best = singleRooms[0];
    return {
      roomIds: [best.id],
      roomNames: [best.code || best.name],
      totalCapacity: best.capacity,
      waste: best.capacity - expectedStudents,
    };
  }

  // 2. Try 2-room combinations with smallest total capacity that fits
  const sortedRooms = [...compatibleRooms].sort((a, b) => a.capacity - b.capacity);
  let bestPair: [Room, Room] | null = null;
  let minPairWaste = Infinity;

  for (let i = 0; i < sortedRooms.length; i++) {
    for (let j = i + 1; j < sortedRooms.length; j++) {
      const cap = sortedRooms[i].capacity + sortedRooms[j].capacity;
      if (cap >= expectedStudents) {
        const waste = cap - expectedStudents;
        if (waste < minPairWaste) {
          minPairWaste = waste;
          bestPair = [sortedRooms[i], sortedRooms[j]];
        }
      }
    }
  }

  if (bestPair) {
    return {
      roomIds: [bestPair[0].id, bestPair[1].id],
      roomNames: [bestPair[0].code || bestPair[0].name, bestPair[1].code || bestPair[1].name],
      totalCapacity: bestPair[0].capacity + bestPair[1].capacity,
      waste: minPairWaste,
    };
  }

  // Fallback: take the largest available rooms
  const largestRooms = [...compatibleRooms].sort((a, b) => b.capacity - a.capacity).slice(0, 2);
  const totalCap = largestRooms.reduce((sum, r) => sum + r.capacity, 0);
  return {
    roomIds: largestRooms.map((r) => r.id),
    roomNames: largestRooms.map((r) => r.code || r.name),
    totalCapacity: totalCap,
    waste: totalCap - expectedStudents,
  };
}

/**
 * Deterministic Greedy Exam Schedule Generator
 */
export function generateExamSchedule(input: ExamGenerationInput): ExamGenerationResult {
  const {
    startDate,
    endDate,
    allowedDays,
    defaultDurationMinutes,
    sessions,
    offerings,
    rooms,
    lecturers,
    supervisorAssignments,
    roomPreferences,
    availabilities = [],
  } = input;

  const datePool = generateDateRange(startDate, endDate, allowedDays);
  const activeSessions = sessions.filter((s) => s.is_active);

  if (datePool.length === 0 || activeSessions.length === 0 || offerings.length === 0) {
    return {
      slots: [],
      draftEntriesPayload: [],
      summary: {
        totalExams: offerings.length,
        scheduledExams: 0,
        conflictCount: 0,
        roomsUsedCount: 0,
        supervisorsUsedCount: 0,
      },
    };
  }

  // Map lecturers for lookup
  const lecturerMap = new Map<string, Lecturer>();
  lecturers.forEach((l) => lecturerMap.set(l.id, l));

  // Map rooms for lookup
  const roomMap = new Map<string, Room>();
  rooms.forEach((r) => roomMap.set(r.id, r));

  // Occupancy trackers per slot key `${dateStr}_${sessionId}`
  const roomOccupancy = new Map<string, Set<string>>(); // slotKey -> Set<roomId>
  const supervisorOccupancy = new Map<string, Set<string>>(); // slotKey -> Set<supervisorId>
  const classGroupOccupancy = new Map<string, Set<string>>(); // slotKey -> Set<classGroupKey>
  const supervisorDailyCount = new Map<string, number>(); // `${dateStr}_${supervisorId}` -> count
  const classGroupDailyCount = new Map<string, number>(); // `${dateStr}_${classGroupKey}` -> count

  // Sort offerings by difficulty: higher student count first, then semester, then code
  const sortedOfferings = [...offerings].sort((a: any, b: any) => {
    const studentsA = a.student_count || a.expected_students || 40;
    const studentsB = b.student_count || b.expected_students || 40;
    if (studentsB !== studentsA) return studentsB - studentsA;
    return (a.semester || a.course?.semester || 1) - (b.semester || b.course?.semester || 1);
  });

  const slots: GeneratedExamSlot[] = [];
  const usedRooms = new Set<string>();
  const usedSupervisors = new Set<string>();
  let totalConflicts = 0;

  for (const rawOffering of sortedOfferings) {
    const offering = rawOffering as any;
    const offeringId = offering.course_offering_id || offering.id;
    const expectedStudents = offering.student_count || offering.expected_students || 40;
    const courseName = offering.course_name || offering.course?.name || 'Mata Kuliah';
    const courseCode = offering.course_code || offering.course?.code || '';
    const classCode = offering.class_code || 'A';
    const semester = offering.semester || offering.course?.semester || 1;
    const requiredRoomType = offering.required_room_type;
    const classGroupKey = `SEM${semester}_CLS${classCode}`;

    // Supervisors for this offering: Supabase RPC strictly enforces EXACTLY_TWO_SUPERVISORS_REQUIRED
    const supAssignment = supervisorAssignments[offeringId];
    let supIds: string[] = [];
    if (supAssignment?.primaryId) {
      supIds.push(supAssignment.primaryId);
      if (supAssignment.secondaryId && supAssignment.secondaryId !== supAssignment.primaryId) {
        supIds.push(supAssignment.secondaryId);
      }
    } else {
      // Default to primary lecturer from source or metadata
      const metaPrimary =
        offering.primary_lecturer_id ||
        offering.planning_metadata?.primary_lecturer_id;
      if (metaPrimary && lecturerMap.has(metaPrimary)) {
        supIds.push(metaPrimary);
      } else if (lecturers.length > 0) {
        supIds.push(lecturers[0].id);
      }
    }

    // Guarantee exactly 2 distinct supervisor IDs for database compliance
    if (supIds.length === 1) {
      const secondaryFallback = lecturers.find((l) => l.id !== supIds[0]);
      if (secondaryFallback) {
        supIds.push(secondaryFallback.id);
      } else if (lecturers.length > 0) {
        supIds.push(lecturers[0].id);
      }
    } else if (supIds.length === 0) {
      if (lecturers.length >= 2) {
        supIds = [lecturers[0].id, lecturers[1].id];
      } else if (lecturers.length === 1) {
        supIds = [lecturers[0].id, lecturers[0].id];
      }
    }

    const supNames = supIds
      .map((id) => lecturerMap.get(id)?.name || 'Dosen Pengawas')
      .filter(Boolean);

    // Find all possible (date, session) candidate slots
    let bestSlot: {
      dateStr: string;
      dayOfWeek: number;
      session: ExamSession;
      roomIds: string[];
      roomNames: string[];
      roomCapacity: number;
      score: number;
      hardConflict: boolean;
      conflictReasons: string[];
    } | null = null;

    let minScore = Infinity;

    for (let dIdx = 0; dIdx < datePool.length; dIdx++) {
      const dateInfo = datePool[dIdx];
      const { dateStr, dayOfWeek } = dateInfo;

      for (const session of activeSessions) {
        const slotKey = `${dateStr}_${session.id}`;
        const conflicts: string[] = [];
        let hardConflict = false;

        // Check if duration crosses break slots
        const examEndMinute = session.start_minute + defaultDurationMinutes;
        const crossesBreak = sessions.some(
          (s) =>
            !s.is_active &&
            s.start_minute < examEndMinute &&
            s.end_minute > session.start_minute
        );
        if (crossesBreak) {
          hardConflict = true;
          conflicts.push('Durasi ujian melewati waktu istirahat.');
        }

        // 1. Check supervisor conflict
        const slotSupervisors = supervisorOccupancy.get(slotKey) || new Set<string>();
        for (const sId of supIds) {
          if (slotSupervisors.has(sId)) {
            hardConflict = true;
            const lName = lecturerMap.get(sId)?.name || 'Pengawas';
            conflicts.push(`Pengawas ${lName} sudah mengawas ujian lain pada sesi ini.`);
          }

          // Check lecturer availability if defined
          const isUnavailable = availabilities.some(
            (av) =>
              av.lecturer_id === sId &&
              av.day_of_week === dayOfWeek &&
              session.start_minute < av.end_minute &&
              av.start_minute < session.end_minute &&
              !av.is_available
          );
          if (isUnavailable) {
            conflicts.push(`Pengawas ${lecturerMap.get(sId)?.name || ''} berhalangan pada waktu ini.`);
          }
        }

        // 2. Check student group conflict (same semester & class)
        const slotGroups = classGroupOccupancy.get(slotKey) || new Set<string>();
        if (slotGroups.has(classGroupKey)) {
          hardConflict = true;
          conflicts.push(`Kelas ${classCode} Semester ${semester} sudah memiliki ujian lain di sesi ini.`);
        }

        // 3. Find available rooms for this slot
        const occupiedRooms = roomOccupancy.get(slotKey) || new Set<string>();
        const availableRoomsForSlot = rooms.filter((r) => !occupiedRooms.has(r.id));

        const preferredIds =
          roomPreferences[offeringId] ||
          ((offering as any).preferred_room_id ? [(offering as any).preferred_room_id] : undefined);

        const roomAlloc = allocateRoomsForExam(
          expectedStudents,
          availableRoomsForSlot,
          preferredIds,
          requiredRoomType
        );

        if (roomAlloc.totalCapacity < expectedStudents) {
          hardConflict = true;
          conflicts.push(`Kapasitas ruangan yang tersedia (${roomAlloc.totalCapacity}) kurang dari peserta (${expectedStudents}).`);
        }

        // Scoring: Hard conflicts get massive penalty
        let score = 0;
        if (hardConflict) score += 10000;

        // Soft penalty: group already tested today
        const groupDayKey = `${dateStr}_${classGroupKey}`;
        const dailyExamsForGroup = classGroupDailyCount.get(groupDayKey) || 0;
        score += dailyExamsForGroup * 150;

        // Soft penalty: supervisor busy today
        for (const sId of supIds) {
          const supDayKey = `${dateStr}_${sId}`;
          const dailyExamsForSup = supervisorDailyCount.get(supDayKey) || 0;
          score += dailyExamsForSup * 30;
        }

        // Soft penalty: room waste
        score += Math.max(0, roomAlloc.waste) * 0.1;

        // Soft penalty: prefer earlier dates evenly
        score += dIdx * 2;

        if (score < minScore) {
          minScore = score;
          bestSlot = {
            dateStr,
            dayOfWeek,
            session,
            roomIds: roomAlloc.roomIds,
            roomNames: roomAlloc.roomNames,
            roomCapacity: roomAlloc.totalCapacity,
            score,
            hardConflict,
            conflictReasons: conflicts,
          };
        }
      }
    }

    if (bestSlot) {
      const slotKey = `${bestSlot.dateStr}_${bestSlot.session.id}`;

      // Reserve slot resources
      if (!roomOccupancy.has(slotKey)) roomOccupancy.set(slotKey, new Set());
      bestSlot.roomIds.forEach((rId) => {
        roomOccupancy.get(slotKey)!.add(rId);
        usedRooms.add(rId);
      });

      if (!supervisorOccupancy.has(slotKey)) supervisorOccupancy.set(slotKey, new Set());
      supIds.forEach((sId) => {
        supervisorOccupancy.get(slotKey)!.add(sId);
        usedSupervisors.add(sId);

        const supDayKey = `${bestSlot.dateStr}_${sId}`;
        supervisorDailyCount.set(supDayKey, (supervisorDailyCount.get(supDayKey) || 0) + 1);
      });

      if (!classGroupOccupancy.has(slotKey)) classGroupOccupancy.set(slotKey, new Set());
      classGroupOccupancy.get(slotKey)!.add(classGroupKey);

      const groupDayKey = `${bestSlot.dateStr}_${classGroupKey}`;
      classGroupDailyCount.set(groupDayKey, (classGroupDailyCount.get(groupDayKey) || 0) + 1);

      if (bestSlot.hardConflict) totalConflicts++;

      const duration = defaultDurationMinutes || 90;

      slots.push({
        courseOfferingId: offeringId,
        courseName,
        courseCode,
        classCode,
        semester,
        expectedStudents,
        examDate: bestSlot.dateStr,
        dayOfWeek: bestSlot.dayOfWeek,
        sessionId: bestSlot.session.id,
        sessionName: bestSlot.session.name,
        startMinute: bestSlot.session.start_minute,
        endMinute: bestSlot.session.start_minute + duration,
        durationMinutes: duration,
        roomIds: bestSlot.roomIds,
        roomNames: bestSlot.roomNames,
        roomCapacity: bestSlot.roomCapacity,
        supervisorIds: supIds,
        supervisorNames: supNames,
        isConflict: bestSlot.hardConflict,
        conflictReasons: bestSlot.conflictReasons,
      });
    }
  }

  // Convert to database payload for save_exam_draft_entries (strictly enforces 2 supervisors)
  const draftEntriesPayload: ExamDraftEntryInput[] = slots.map((s) => {
    let finalSupIds = [...s.supervisorIds];
    if (finalSupIds.length === 1) {
      const fallback = lecturers.find((l) => l.id !== finalSupIds[0]);
      if (fallback) finalSupIds.push(fallback.id);
      else if (lecturers.length > 0) finalSupIds.push(lecturers[0].id);
    }
    return {
      course_offering_id: s.courseOfferingId,
      exam_session_id: s.sessionId,
      exam_date: s.examDate,
      duration_minutes: s.durationMinutes,
      room_ids: s.roomIds,
      supervisor_ids: finalSupIds.slice(0, 2),
      notes: null,
    };
  });

  return {
    slots,
    draftEntriesPayload,
    summary: {
      totalExams: offerings.length,
      scheduledExams: slots.length,
      conflictCount: totalConflicts,
      roomsUsedCount: usedRooms.size,
      supervisorsUsedCount: usedSupervisors.size,
    },
  };
}
