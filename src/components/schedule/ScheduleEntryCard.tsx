import React from 'react';
import { ScheduleEntry, Room } from '../../types';
import { ClientConflict } from '../../lib/scheduleValidator';
import { AlertTriangle, Clock, MapPin, User } from 'lucide-react';

interface ScheduleEntryCardProps {
  entry: ScheduleEntry;
  room?: Room | null;
  conflicts: ClientConflict[];
  isSelected?: boolean;
  onClick: (entry: ScheduleEntry) => void;
}

export const ScheduleEntryCard: React.FC<ScheduleEntryCardProps> = ({
  entry,
  room,
  conflicts,
  isSelected = false,
  onClick,
}) => {
  const course = entry.course_offering?.course;
  const courseName = entry.course_name || course?.name || 'Mata Kuliah';
  const courseCode = entry.course_code || course?.code || '';
  const classCode = entry.class_code || entry.course_offering?.class_code || 'A';
  const sks = course?.effective_sks || 2;
  const timeRange = `${entry.start_time || '07:50'} – ${entry.end_time || '09:30'}`;
  const roomName = room ? `${room.code} (${room.name})` : entry.room_id;

  const lecturerNames = Array.isArray(entry.lecturer_names)
    ? entry.lecturer_names.join(', ')
    : entry.lecturer_names ||
      entry.course_offering?.course_offering_lecturers?.map((l) => l.lecturer?.name).filter(Boolean).join(', ') ||
      'Dosen Pengampu';

  // Check if this entry is in any conflict
  const entryConflicts = conflicts.filter(
    (c) =>
      c.entryIds.includes(entry.id) ||
      c.courseOfferingIds.includes(entry.course_offering_id)
  );
  const hasConflict = entryConflicts.length > 0;

  return (
    <div
      onClick={() => onClick(entry)}
      className={`group relative p-2.5 rounded-xl border transition-all cursor-pointer select-none text-left shadow-2xs hover:shadow-xs ${
        hasConflict
          ? 'bg-rose-50/80 border-rose-300 hover:border-rose-400'
          : isSelected
          ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20'
          : 'bg-white border-slate-200/90 hover:border-blue-300 hover:bg-slate-50/70'
      }`}
    >
      {/* Top Bar: Code, Class badge, and Conflict Indicator */}
      <div className="flex items-start justify-between gap-1.5 mb-1">
        <span className="font-mono text-3xs font-semibold text-slate-400 tracking-tight truncate">
          {courseCode}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <span className="px-1.5 py-0.5 rounded text-3xs font-bold bg-blue-100 text-blue-700">
            {classCode}
          </span>
          <span className="px-1 py-0.5 rounded text-3xs font-medium text-slate-500 bg-slate-100">
            {sks} SKS
          </span>
          {hasConflict && (
            <span
              title={`Konflik: ${entryConflicts.map((c) => c.title).join('; ')}`}
              className="p-0.5 rounded-full bg-rose-500 text-white animate-pulse"
            >
              <AlertTriangle className="w-2.5 h-2.5" />
            </span>
          )}
        </div>
      </div>

      {/* Course Name */}
      <h5 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-blue-700 transition-colors">
        {courseName}
      </h5>

      {/* Time & Room */}
      <div className="mt-1.5 space-y-0.5 text-3xs text-slate-600">
        <div className="flex items-center gap-1 font-mono font-medium text-slate-700">
          <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
          <span className="truncate">{timeRange}</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
          <span className="font-medium text-slate-800 truncate">{roomName}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-500">
          <User className="w-2.5 h-2.5 text-slate-400 shrink-0" />
          <span className="truncate">{lecturerNames}</span>
        </div>
      </div>
    </div>
  );
};
