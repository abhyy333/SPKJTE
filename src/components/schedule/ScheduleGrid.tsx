import React, { useState, useMemo } from 'react';
import { ScheduleEntry, Room, TimeSlot, Lecturer } from '../../types';
import { ScheduleEntryCard } from './ScheduleEntryCard';
import { ClientConflict } from '../../lib/scheduleValidator';
import { minuteToTime } from '../../lib/utils';
import { Filter, Calendar, RotateCcw } from 'lucide-react';

interface ScheduleGridProps {
  entries: ScheduleEntry[];
  rooms: Room[];
  activeTimeSlots: TimeSlot[];
  lecturers: Lecturer[];
  conflicts: ClientConflict[];
  selectedEntryId?: string | null;
  onSelectEntry: (entry: ScheduleEntry) => void;
}

const DAYS = [
  { value: 1, name: 'Senin' },
  { value: 2, name: 'Selasa' },
  { value: 3, name: 'Rabu' },
  { value: 4, name: 'Kamis' },
  { value: 5, name: 'Jumat' },
];

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  entries,
  rooms,
  activeTimeSlots,
  lecturers,
  conflicts,
  selectedEntryId,
  onSelectEntry,
}) => {
  // Grid filters (view only - does NOT remove entries)
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [lecturerFilter, setLecturerFilter] = useState('all');
  const [roomFilter, setRoomFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');

  // Sorted unique start minutes across all active slots
  const uniqueStartMinutes = useMemo(() => {
    const set = new Set<number>();
    activeTimeSlots.forEach((s) => {
      if (s.is_active && s.start_minute != null) {
        set.add(s.start_minute);
      }
    });

    const arr = Array.from(set).sort((a, b) => a - b);
    if (arr.length === 0) {
      // Standard schedule default slots if time_slots table not loaded
      return [470, 520, 570, 620, 670, 780, 830, 880, 930, 980];
    }
    return arr;
  }, [activeTimeSlots]);

  // Filtered entries for view
  const visibleEntries = useMemo(() => {
    return entries.filter((e) => {
      const course = e.course_offering?.course;

      if (semesterFilter !== 'all' && String(course?.semester) !== semesterFilter) {
        return false;
      }
      if (classFilter !== 'all' && (e.class_code || e.course_offering?.class_code) !== classFilter) {
        return false;
      }
      if (roomFilter !== 'all' && e.room_id !== roomFilter) {
        return false;
      }
      if (lecturerFilter !== 'all') {
        const hasLec =
          e.lecturer_ids?.includes(lecturerFilter) ||
          e.course_offering?.course_offering_lecturers?.some((l) => l.lecturer_id === lecturerFilter);
        if (!hasLec) return false;
      }

      return true;
    });
  }, [entries, semesterFilter, classFilter, roomFilter, lecturerFilter]);

  const uniqueClasses = useMemo(() => {
    return Array.from(
      new Set(entries.map((e) => e.class_code || e.course_offering?.class_code).filter(Boolean))
    ).sort();
  }, [entries]);

  return (
    <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col h-[calc(100vh-210px)] max-h-[850px] overflow-hidden">
      {/* Grid Filter Bar */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-800">
            Jadwal Mingguan (Senin – Jumat)
          </span>
          <span className="text-2xs text-slate-500 font-normal">
            ({visibleEntries.length} kelas ditampilkan)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-3xs">
          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none"
          >
            <option value="all">Semua Smt</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={String(s)}>
                Semester {s}
              </option>
            ))}
          </select>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none"
          >
            <option value="all">Semua Kelas</option>
            {uniqueClasses.map((c) => (
              <option key={c} value={c}>
                Kelas {c}
              </option>
            ))}
          </select>

          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none max-w-[130px] truncate"
          >
            <option value="all">Semua Ruangan</option>
            {rooms.filter((r) => r.is_active).map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} ({r.name})
              </option>
            ))}
          </select>

          <select
            value={lecturerFilter}
            onChange={(e) => setLecturerFilter(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none max-w-[130px] truncate"
          >
            <option value="all">Semua Dosen</option>
            {lecturers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          {(semesterFilter !== 'all' ||
            classFilter !== 'all' ||
            roomFilter !== 'all' ||
            lecturerFilter !== 'all') && (
            <button
              onClick={() => {
                setSemesterFilter('all');
                setClassFilter('all');
                setRoomFilter('all');
                setLecturerFilter('all');
              }}
              title="Reset Filter Tampilan"
              className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <div className="min-w-[760px] h-full flex flex-col">
          {/* Day Headers */}
          <div className="grid grid-cols-11 border-b border-slate-200 bg-slate-100/70 text-slate-700 font-bold text-2xs uppercase tracking-wider sticky top-0 z-10">
            <div className="col-span-1 p-2.5 text-center border-r border-slate-200 text-slate-400">
              Waktu
            </div>
            {DAYS.map((day) => (
              <div
                key={day.value}
                className="col-span-2 p-2.5 text-center border-r border-slate-200 last:border-r-0"
              >
                {day.name}
              </div>
            ))}
          </div>

          {/* Time Slot Rows */}
          <div className="flex-1 divide-y divide-slate-100">
            {uniqueStartMinutes.map((startMin) => {
              const timeLabel = minuteToTime(startMin);
              const nextSlotLabel = minuteToTime(startMin + 50);

              return (
                <div key={startMin} className="grid grid-cols-11 min-h-[90px]">
                  {/* Time column */}
                  <div className="col-span-1 p-2 border-r border-slate-200 bg-slate-50/50 flex flex-col items-center justify-start font-mono text-3xs text-slate-500 font-medium">
                    <span className="font-bold text-slate-700">{timeLabel}</span>
                    <span className="text-slate-400 text-4xs">s.d {nextSlotLabel}</span>
                  </div>

                  {/* Day Columns */}
                  {DAYS.map((day) => {
                    // Find entries that start at this slot or overlap this slot
                    const slotEntries = visibleEntries.filter((e) => {
                      const eDay = Number(e.day_of_week) || 1;
                      const eStart = e.start_minute ?? 470;
                      // Display card on slot where it starts
                      return eDay === day.value && eStart === startMin;
                    });

                    return (
                      <div
                        key={`${day.value}-${startMin}`}
                        className="col-span-2 p-1.5 border-r border-slate-200 last:border-r-0 bg-white/40 hover:bg-slate-50/30 transition-colors flex flex-col gap-1.5"
                      >
                        {slotEntries.map((entry) => {
                          const room = rooms.find((r) => r.id === entry.room_id);
                          return (
                            <ScheduleEntryCard
                              key={entry.id}
                              entry={entry}
                              room={room}
                              conflicts={conflicts}
                              isSelected={selectedEntryId === entry.id}
                              onClick={onSelectEntry}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
