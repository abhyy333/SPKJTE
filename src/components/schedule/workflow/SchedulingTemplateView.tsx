import React, { useState, useMemo } from 'react';
import {
  Search,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  Layers,
  BookOpen,
  Users,
  Sparkles,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  Tag,
  GraduationCap,
} from 'lucide-react';
import { CurriculumPackage, CurriculumPackageCourse, PlannedCourse } from '../../../types';
import { cn } from '../../../lib/utils';
import { normalizeParticipantInput, isPracticum } from '../../../lib/distributionUtils';
import { toast } from '../../ui/Toast';

interface SchedulingTemplateViewProps {
  packages: CurriculumPackage[];
  categoryMap: Map<string, string>;
  selectedSemesterType: 'GANJIL' | 'GENAP';
  onChangeSemesterType: (type: 'GANJIL' | 'GENAP') => void;
  selectedSemesterFilter: number | 'ALL';
  onChangeSemesterFilter: (filter: number | 'ALL') => void;
  activeCurricula: number[]; // e.g. [2026, 2022]
  onToggleCurriculum: (year: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  plannedCourses: PlannedCourse[];
  participantInputMap: Record<string, number>;
  onToggleCourse: (pkg: CurriculumPackage, course: CurriculumPackageCourse, category?: string) => void;
  onUpdateParticipants: (selectionKey: string, count: number) => void;
  onSelectAllFromTemplate: (packagesToSelect: CurriculumPackage[]) => void;
  onClearAll: () => void;
  onSelectSemesterCourses: (semester: number, packagesInSemester: CurriculumPackage[]) => void;
  onClearSemesterCourses: (semester: number, packagesInSemester: CurriculumPackage[]) => void;
  onTogglePackage: (pkg: CurriculumPackage, categoryMap: Map<string, string>) => void;
}

export const SchedulingTemplateView: React.FC<SchedulingTemplateViewProps> = ({
  packages,
  categoryMap,
  selectedSemesterType,
  onChangeSemesterType,
  selectedSemesterFilter,
  onChangeSemesterFilter,
  activeCurricula,
  onToggleCurriculum,
  searchQuery,
  onSearchChange,
  plannedCourses,
  participantInputMap,
  onToggleCourse,
  onUpdateParticipants,
  onSelectAllFromTemplate,
  onClearAll,
  onSelectSemesterCourses,
  onClearSemesterCourses,
  onTogglePackage,
}) => {
  // Elective collapse state
  const [electivesOpen, setElectivesOpen] = useState<boolean>(false);

  // Semesters belonging to term
  const termSemesters = useMemo(() => {
    return selectedSemesterType === 'GANJIL' ? [1, 3, 5, 7] : [2, 4, 6, 8];
  }, [selectedSemesterType]);

  // Create a fast lookup map for selected courses
  const selectedMap = useMemo(() => {
    const map = new Map<string, PlannedCourse>();
    plannedCourses.forEach((pc) => {
      map.set(pc.selectionKey, pc);
    });
    return map;
  }, [plannedCourses]);

  // Filter packages by active curricula
  const curriculumFilteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const cy = pkg.payload?.curriculum_year || 2026;
      return activeCurricula.includes(cy);
    });
  }, [packages, activeCurricula]);

  // Separate regular semester packages and elective catalogs
  const { regularPackages, electivePackages } = useMemo(() => {
    const regular: CurriculumPackage[] = [];
    const elective: CurriculumPackage[] = [];

    curriculumFilteredPackages.forEach((pkg) => {
      const isElective =
        pkg.payload?.package_type === 'ELECTIVE_CATALOG' ||
        pkg.name.toUpperCase().includes('ELECTIVE') ||
        pkg.name.toUpperCase().includes('PILIHAN') ||
        (pkg.payload?.semester === null || pkg.payload?.semester === undefined);

      if (isElective) {
        elective.push(pkg);
      } else {
        regular.push(pkg);
      }
    });

    return { regularPackages: regular, electivePackages: elective };
  }, [curriculumFilteredPackages]);

  // Filter regular packages by active academic term and semester filter
  const displayedRegularPackages = useMemo(() => {
    return regularPackages.filter((pkg) => {
      const sem = Number(pkg.payload?.semester || 0);
      // Check if semester belongs to selected term (GANJIL / GENAP)
      if (!termSemesters.includes(sem)) {
        return false;
      }
      // Check semester filter
      if (selectedSemesterFilter !== 'ALL' && sem !== selectedSemesterFilter) {
        return false;
      }
      return true;
    });
  }, [regularPackages, termSemesters, selectedSemesterFilter]);

  // Filter course list inside a package by search query
  const getFilteredCourses = (pkg: CurriculumPackage): CurriculumPackageCourse[] => {
    const courses = pkg.payload?.courses || [];
    // Sort by order ASC
    const sorted = [...courses].sort((a, b) => (a.order || 0) - (b.order || 0));

    if (!searchQuery.trim()) return sorted;

    const q = searchQuery.toLowerCase().trim();
    return sorted.filter(
      (c) =>
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.name && c.name.toLowerCase().includes(q))
    );
  };

  // Group displayed packages by curriculum year -> semester
  const groupedPackages = useMemo(() => {
    // Top-level groups by Curriculum (2026, 2022)
    const currGroups: {
      curriculumYear: number;
      curriculumName: string;
      semesters: {
        semester: number;
        packages: CurriculumPackage[];
      }[];
    }[] = [];

    const sortedYears = [...activeCurricula].sort((a, b) => b - a); // 2026 first, then 2022

    sortedYears.forEach((year) => {
      const yearPkgs = displayedRegularPackages.filter(
        (p) => (p.payload?.curriculum_year || 2026) === year
      );
      if (yearPkgs.length === 0) return;

      // Group by semester
      const semMap = new Map<number, CurriculumPackage[]>();
      termSemesters.forEach((sem) => {
        if (selectedSemesterFilter === 'ALL' || selectedSemesterFilter === sem) {
          semMap.set(sem, []);
        }
      });

      yearPkgs.forEach((pkg) => {
        const sem = Number(pkg.payload?.semester || 0);
        if (semMap.has(sem)) {
          semMap.get(sem)!.push(pkg);
        }
      });

      const semList = Array.from(semMap.entries())
        .filter(([_, pkgs]) => pkgs.length > 0)
        .map(([sem, pkgs]) => ({
          semester: sem,
          packages: pkgs.sort((a, b) => {
            // Put Umum/Bersama first, then KBK packages
            const scopeA = a.payload?.scope || '';
            const scopeB = b.payload?.scope || '';
            if (scopeA.includes('PROG_STUDI') || scopeA.includes('UMUM')) return -1;
            if (scopeB.includes('PROG_STUDI') || scopeB.includes('UMUM')) return 1;
            return a.name.localeCompare(b.name);
          }),
        }))
        .sort((a, b) => a.semester - b.semester);

      if (semList.length > 0) {
        currGroups.push({
          curriculumYear: year,
          curriculumName:
            year === 2026
              ? 'Kurikulum 2026 (OBE)'
              : year === 2022
              ? 'Kurikulum 2022'
              : `Kurikulum ${year}`,
          semesters: semList,
        });
      }
    });

    return currGroups;
  }, [displayedRegularPackages, activeCurricula, termSemesters, selectedSemesterFilter]);

  // Overall visible course stats for current filter
  const totalVisibleCourses = useMemo(() => {
    let count = 0;
    displayedRegularPackages.forEach((pkg) => {
      count += getFilteredCourses(pkg).length;
    });
    return count;
  }, [displayedRegularPackages, searchQuery]);

  const selectedInFilterCount = useMemo(() => {
    let count = 0;
    displayedRegularPackages.forEach((pkg) => {
      const courses = getFilteredCourses(pkg);
      courses.forEach((c) => {
        const key = `${pkg.id}:${c.code}`;
        if (selectedMap.has(key)) count++;
      });
    });
    return count;
  }, [displayedRegularPackages, selectedMap, searchQuery]);

  const totalParticipantsSum = useMemo(() => {
    let sum = 0;
    plannedCourses.forEach((pc) => {
      sum += Number(pc.totalParticipants || 0);
    });
    return sum;
  }, [plannedCourses]);

  const showElectivesSection = selectedSemesterFilter === 'ALL' || Number(selectedSemesterFilter) >= 5;

  return (
    <div className="space-y-6 pb-24">
      {/* 1. Filter & Controls Toolbar Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Row A: Academic Term & Curriculum Toggles */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          {/* Term selector tabs (Ganjil / Genap) */}
          <div className="flex items-center gap-2">
            <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 shrink-0">
              Periode:
            </span>
            <div className="inline-flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => onChangeSemesterType('GANJIL')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                  selectedSemesterType === 'GANJIL'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Semester Ganjil (1, 3, 5, 7)
              </button>
              <button
                type="button"
                onClick={() => onChangeSemesterType('GENAP')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                  selectedSemesterType === 'GENAP'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Semester Genap (2, 4, 6, 8)
              </button>
            </div>
          </div>

          {/* Curriculum Toggles (2026 & 2022) */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 shrink-0">
              Kurikulum:
            </span>
            <div className="flex items-center gap-2">
              <label
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all select-none',
                  activeCurricula.includes(2026)
                    ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                )}
              >
                <input
                  type="checkbox"
                  checked={activeCurricula.includes(2026)}
                  onChange={() => onToggleCurriculum(2026)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                />
                <span>Kurikulum 2026 (OBE)</span>
                <span className="text-3xs px-1.5 py-0.2 rounded bg-blue-200/80 text-blue-800 font-bold">
                  OBE
                </span>
              </label>

              <label
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all select-none',
                  activeCurricula.includes(2022)
                    ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                )}
              >
                <input
                  type="checkbox"
                  checked={activeCurricula.includes(2022)}
                  onChange={() => onToggleCurriculum(2022)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                />
                <span>Kurikulum 2022</span>
              </label>
            </div>
          </div>
        </div>

        {/* Row B: Semester Filter Pills & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Semester pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
              Semester:
            </span>
            <button
              type="button"
              onClick={() => onChangeSemesterFilter('ALL')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer',
                selectedSemesterFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              )}
            >
              Semua Semester
            </button>
            {termSemesters.map((sem) => (
              <button
                key={sem}
                type="button"
                onClick={() => onChangeSemesterFilter(sem)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer',
                  selectedSemesterFilter === sem
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                )}
              >
                Semester {sem}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari kode/nama MK..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Row C: Global Actions & Summary Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
            <span className="font-semibold text-slate-900">Status Pemilihan:</span>
            <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
              {plannedCourses.length} / {totalVisibleCourses} MK Dipilih
            </span>
            <span className="text-slate-400">•</span>
            <span className="font-semibold text-slate-700">
              {totalParticipantsSum} Total Peserta
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 italic">Rombel akan direview pada Step 2</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onSelectAllFromTemplate(displayedRegularPackages)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Pilih Semua dari Template</span>
            </button>

            <button
              type="button"
              onClick={onClearAll}
              disabled={plannedCourses.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Kosongkan Semua</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Grouped Packages View */}
      {groupedPackages.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-2xs">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-800">
            Tidak ada paket kurikulum untuk filter ini.
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {activeCurricula.length === 0
              ? 'Aktifkan minimal satu kurikulum (2026 atau 2022) di toolbar atas.'
              : 'Cobalah mengganti semester filter atau kata kunci pencarian.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedPackages.map((currGroup) => (
            <div key={currGroup.curriculumYear} className="space-y-6">
              {/* Curriculum Section Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    {currGroup.curriculumYear}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                      {currGroup.curriculumName}
                    </h2>
                    <p className="text-2xs text-slate-500 font-medium">
                      Paket pembelajaran resmi Program Studi S1 Teknik Elektro
                    </p>
                  </div>
                </div>
              </div>

              {/* Semesters under this Curriculum */}
              {currGroup.semesters.map((semGroup) => (
                <div key={`${currGroup.curriculumYear}-sem-${semGroup.semester}`} className="space-y-4">
                  {/* Semester Bar with Quick Semester Select */}
                  <div className="flex items-center justify-between bg-slate-100/80 px-4 py-2.5 rounded-xl border border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Semester {semGroup.semester}
                      </h3>
                      <span className="text-3xs px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 font-semibold">
                        {semGroup.packages.length} Paket
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectSemesterCourses(semGroup.semester, semGroup.packages)}
                        className="text-2xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded bg-white hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer"
                      >
                        + Pilih Semua Sem {semGroup.semester}
                      </button>
                      <button
                        type="button"
                        onClick={() => onClearSemesterCourses(semGroup.semester, semGroup.packages)}
                        className="text-2xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1 rounded bg-white hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
                      >
                        Kosongkan Sem {semGroup.semester}
                      </button>
                    </div>
                  </div>

                  {/* Package Cards in this semester */}
                  <div className="space-y-4">
                    {semGroup.packages.map((pkg) => {
                      const courses = getFilteredCourses(pkg);
                      const isCommonPackage =
                        pkg.payload?.scope === 'PROG_STUDI' ||
                        pkg.payload?.scope === 'ALL_KBK' ||
                        pkg.name.toUpperCase().includes('UMUM') ||
                        pkg.name.toUpperCase().includes('DASAR');

                      const kbkCode = pkg.payload?.kbk_code;
                      const kbkName = pkg.payload?.kbk_name;
                      const legacyTrack = pkg.payload?.legacy_track;

                      // Count selected courses in this package
                      const selectedInThisPkgCount = courses.filter((c) =>
                        selectedMap.has(`${pkg.id}:${c.code}`)
                      ).length;

                      const isAllPkgSelected =
                        courses.length > 0 && selectedInThisPkgCount === courses.length;
                      const isPartialPkgSelected =
                        selectedInThisPkgCount > 0 && selectedInThisPkgCount < courses.length;

                      const totalSks =
                        pkg.payload?.total_sks ??
                        courses.reduce((acc, c) => acc + (c.sks || 0), 0);

                      return (
                        <div
                          key={pkg.id}
                          className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs transition-all hover:border-slate-300"
                        >
                          {/* Package Header Card */}
                          <div className="p-4 bg-slate-50/70 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {/* Package Checkbox */}
                              <button
                                type="button"
                                onClick={() => onTogglePackage(pkg, categoryMap)}
                                className="w-5 h-5 rounded border border-slate-300 flex items-center justify-center transition-colors cursor-pointer hover:border-blue-500 bg-white"
                                title="Pilih / Batalkan semua mata kuliah di paket ini"
                              >
                                {isAllPkgSelected ? (
                                  <CheckSquare className="w-4 h-4 text-blue-600 fill-blue-600 text-white" />
                                ) : isPartialPkgSelected ? (
                                  <div className="w-2.5 h-2.5 rounded-2xs bg-blue-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-transparent" />
                                )}
                              </button>

                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                                    {pkg.name}
                                  </h4>

                                  {/* Badge: Umum / KBK */}
                                  {isCommonPackage ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-3xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200/80">
                                      Paket Bersama / Umum
                                    </span>
                                  ) : kbkCode || kbkName ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-3xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                                      KBK {kbkCode ? kbkCode : kbkName}
                                    </span>
                                  ) : null}

                                  {/* Legacy Track Badge for 2022 */}
                                  {legacyTrack && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-3xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                                      Legacy: {legacyTrack}
                                    </span>
                                  )}
                                </div>

                                {kbkName && !isCommonPackage && (
                                  <p className="text-2xs text-slate-500 mt-0.5">
                                    {kbkName}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Summary Badge inside Package Header */}
                            <div className="flex items-center gap-3 self-end sm:self-center">
                              <div className="text-right">
                                <div className="text-xs font-semibold text-slate-700">
                                  {courses.length} MK ({totalSks} SKS)
                                </div>
                                <div className="text-2xs text-slate-400">
                                  Terpilih:{' '}
                                  <span className="font-bold text-blue-600">
                                    {selectedInThisPkgCount} / {courses.length}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Table of Courses */}
                          {courses.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-400 italic">
                              Tidak ada mata kuliah yang cocok dengan kata kunci pencarian.
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-50/40 text-slate-500 text-3xs uppercase tracking-wider border-b border-slate-200/60 select-none">
                                    <th className="py-2.5 pl-4 pr-2 w-12 text-center">Pilih</th>
                                    <th className="py-2.5 px-3 min-w-[240px]">Kode & Mata Kuliah</th>
                                    <th className="py-2.5 px-3 w-20 text-center">SKS</th>
                                    <th className="py-2.5 px-3 w-28 text-center">Kategori</th>
                                    <th className="py-2.5 px-3 w-40 text-center">Jumlah Peserta</th>
                                    <th className="py-2.5 px-3 w-44 text-center">Estimasi Rombel & Section</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                  {courses.map((course) => {
                                    const selectionKey = `${pkg.id}:${course.code}`;
                                    const isSelected = selectedMap.has(selectionKey);
                                    const planned = selectedMap.get(selectionKey);

                                    // Category lookup
                                    const category =
                                      categoryMap.get(course.code.trim().toUpperCase()) ||
                                      (course.name.toLowerCase().includes('pilihan') ? 'Pilihan' : 'Wajib');

                                    // Participant count
                                    const rawParticipant = participantInputMap[selectionKey];
                                    const currentParticipant =
                                      rawParticipant !== undefined
                                        ? rawParticipant
                                        : planned?.totalParticipants !== undefined
                                        ? planned.totalParticipants
                                        : '';

                                    const isPracticumCourse = isPracticum(course);
                                    const isParticipantInvalid =
                                      isSelected && !isPracticumCourse && (currentParticipant === '' || Number(currentParticipant) <= 0);

                                    return (
                                      <tr
                                        key={selectionKey}
                                        className={cn(
                                          'transition-colors',
                                          isSelected ? 'bg-blue-50/30 hover:bg-blue-50/50' : 'hover:bg-slate-50/60'
                                        )}
                                      >
                                        {/* 1. Checkbox */}
                                        <td className="py-3 pl-4 pr-2 text-center">
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => onToggleCourse(pkg, course, category)}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                                            aria-label={`Pilih ${course.name}`}
                                          />
                                        </td>

                                        {/* 2. Kode & Nama Mata Kuliah */}
                                        <td className="py-3 px-3">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono text-2xs font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                              {course.code}
                                            </span>
                                            <span
                                              className={cn(
                                                'font-medium text-slate-800',
                                                isSelected && 'font-bold text-slate-900'
                                              )}
                                            >
                                              {course.name}
                                            </span>
                                            {isPracticumCourse && (
                                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-3xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                Praktikum
                                              </span>
                                            )}
                                          </div>
                                        </td>

                                        {/* 3. SKS */}
                                        <td className="py-3 px-3 text-center">
                                          <span className="font-semibold text-slate-700 bg-slate-100/70 px-2 py-0.5 rounded">
                                            {course.sks} SKS
                                          </span>
                                        </td>

                                        {/* 4. Kategori */}
                                        <td className="py-3 px-3 text-center">
                                          <span
                                            className={cn(
                                              'inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold',
                                              category === 'Wajib'
                                                ? 'bg-slate-100 text-slate-700'
                                                : category === 'Pilihan'
                                                ? 'bg-purple-50 text-purple-700 border border-purple-200/70'
                                                : 'text-slate-400'
                                            )}
                                          >
                                            {category}
                                          </span>
                                        </td>

                                        {/* 5. Jumlah Peserta */}
                                        <td className="py-3 px-3 text-center">
                                          {isPracticumCourse ? (
                                            <div className="flex items-center justify-center">
                                              <span
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-3xs font-semibold"
                                                title="Praktikum dikelola mandiri oleh asisten dan tidak memerlukan pembagian rombel perkuliahan"
                                              >
                                                Praktikum — Dikelola Asisten
                                              </span>
                                            </div>
                                          ) : (
                                            <div className="flex items-center justify-center">
                                              <div className="relative w-28">
                                                <input
                                                  type="text"
                                                  inputMode="numeric"
                                                  pattern="[0-9]*"
                                                  disabled={!isSelected}
                                                  data-invalid-participant={isParticipantInvalid ? 'true' : 'false'}
                                                  value={currentParticipant === 0 && !isSelected ? '' : currentParticipant}
                                                  onChange={(e) => {
                                                    const normalized = normalizeParticipantInput(e.target.value);
                                                    onUpdateParticipants(selectionKey, normalized);
                                                  }}
                                                  placeholder={isSelected ? '0' : '-'}
                                                  className={cn(
                                                    'w-full text-center px-2.5 py-1.5 rounded-lg border text-xs transition-all',
                                                    !isSelected && 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed',
                                                    isSelected && !isParticipantInvalid && 'bg-white border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold',
                                                    isSelected && isParticipantInvalid && 'bg-rose-50 border-rose-300 text-rose-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-semibold'
                                                  )}
                                                />
                                              </div>
                                            </div>
                                          )}
                                        </td>

                                        {/* 6. Estimasi Rombel & Section */}
                                        <td className="py-3 px-3 text-center">
                                          {isPracticumCourse ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-3xs font-medium text-slate-400 italic">
                                              Non-penjadwalan kuliah
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-2xs font-medium border border-slate-200/60">
                                              Akan ditentukan pada Step 2
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* 3. Collapsible Elective Catalog Section (if semester filter permits) */}
          {showElectivesSection && electivePackages.length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setElectivesOpen((prev) => !prev)}
                className="w-full flex items-center justify-between p-4 bg-slate-50/80 hover:bg-slate-100/70 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Katalog Mata Kuliah Pilihan
                    </h3>
                    <p className="text-2xs text-slate-500">
                      Mata kuliah elektif lintas KBK untuk semester atas (Semester 5 ke atas)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-2xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    {electivePackages.length} Katalog
                  </span>
                  {electivesOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  )}
                </div>
              </button>

              {electivesOpen && (
                <div className="p-4 space-y-4 border-t border-slate-200/60 bg-white">
                  {electivePackages.map((pkg) => {
                    const courses = getFilteredCourses(pkg);
                    const selectedInThisPkgCount = courses.filter((c) =>
                      selectedMap.has(`${pkg.id}:${c.code}`)
                    ).length;

                    return (
                      <div key={pkg.id} className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="p-3 bg-purple-50/40 border-b border-purple-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-purple-950">{pkg.name}</span>
                            <span className="text-3xs px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-semibold">
                              Elektif
                            </span>
                          </div>
                          <span className="text-2xs text-purple-700 font-medium">
                            Terpilih: {selectedInThisPkgCount} / {courses.length}
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <tbody className="divide-y divide-slate-100">
                              {courses.map((course) => {
                                const selectionKey = `${pkg.id}:${course.code}`;
                                const isSelected = selectedMap.has(selectionKey);
                                const planned = selectedMap.get(selectionKey);
                                const currentParticipant =
                                  participantInputMap[selectionKey] !== undefined
                                    ? participantInputMap[selectionKey]
                                    : planned?.totalParticipants ?? '';

                                return (
                                  <tr key={selectionKey} className={isSelected ? 'bg-purple-50/20' : ''}>
                                    <td className="py-2.5 pl-4 pr-2 w-12 text-center">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => onToggleCourse(pkg, course, 'Pilihan')}
                                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
                                      />
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-2xs font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                          {course.code}
                                        </span>
                                        <span className="font-medium text-slate-800">{course.name}</span>
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3 w-20 text-center">
                                      <span className="font-semibold text-slate-600">{course.sks} SKS</span>
                                    </td>
                                    <td className="py-2.5 px-3 w-40 text-center">
                                      {isPracticum(course) ? (
                                        <span
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-3xs font-semibold"
                                          title="Praktikum dikelola mandiri oleh asisten"
                                        >
                                          Praktikum — Dikelola Asisten
                                        </span>
                                      ) : (
                                        <input
                                          type="text"
                                          inputMode="numeric"
                                          pattern="[0-9]*"
                                          disabled={!isSelected}
                                          value={currentParticipant === 0 && !isSelected ? '' : currentParticipant}
                                          onChange={(e) => {
                                            const normalized = normalizeParticipantInput(e.target.value);
                                            onUpdateParticipants(selectionKey, normalized);
                                          }}
                                          placeholder={isSelected ? '0' : '-'}
                                          className={cn(
                                            'w-28 text-center px-2 py-1 rounded border text-xs',
                                            !isSelected && 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed',
                                            isSelected && 'bg-white border-slate-300 text-slate-800'
                                          )}
                                        />
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 w-44 text-center">
                                      {isPracticum(course) ? (
                                        <span className="text-3xs text-slate-400 italic">Non-penjadwalan kuliah</span>
                                      ) : (
                                        <span className="text-3xs text-slate-400">Akan ditentukan pada Step 2</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
