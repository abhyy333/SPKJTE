import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleGuard } from './RoleGuard';
import { AppLayout } from '../components/layout/AppLayout';

// Auth Pages
import { LoginPage } from '../pages/auth/LoginPage';

// Admin Pages
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { CoursesPage } from '../pages/admin/CoursesPage';
import { LecturersPage } from '../pages/admin/LecturersPage';
import { StudentsPage } from '../pages/admin/StudentsPage';
import { RoomsPage } from '../pages/admin/RoomsPage';
import { TimeSlotsPage } from '../pages/admin/TimeSlotsPage';
import { CourseOfferingsPage } from '../pages/admin/CourseOfferingsPage';
import { ScheduleConflictsPage } from '../pages/admin/ScheduleConflictsPage';
import { VersionHistoryPage } from '../pages/admin/VersionHistoryPage';
import { ScheduleViewerPage } from '../pages/admin/ScheduleViewerPage';
import { ExamSchedulePage } from '../pages/admin/ExamSchedulePage';
import { ReportsPage } from '../pages/admin/ReportsPage';
import { SettingsPage } from '../pages/admin/SettingsPage';

// Lecturer Pages
import { LecturerDashboard } from '../pages/lecturer/LecturerDashboard';
import { LecturerMySchedule } from '../pages/lecturer/LecturerMySchedule';
import { LecturerAvailabilityPage } from '../pages/lecturer/LecturerAvailabilityPage';

// Student Pages
import { StudentDashboard } from '../pages/student/StudentDashboard';
import { StudentMySchedule } from '../pages/student/StudentMySchedule';
import { StudentDownloadSchedule } from '../pages/student/StudentDownloadSchedule';

// Error Pages
import { ForbiddenPage } from '../pages/error/ForbiddenPage';
import { NotFoundPage } from '../pages/error/NotFoundPage';

import { useAuth } from '../contexts/AuthContext';

export const AppRoutes: React.FC = () => {
  const { role, user } = useAuth();

  const getDefaultRoute = () => {
    if (role === 'DOSEN') return '/dosen/dashboard';
    if (role === 'MAHASISWA') return '/mahasiswa/dashboard';
    return '/dashboard';
  };

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<ForbiddenPage />} />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />

      {/* Protected Layout Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Shared Routes */}
        <Route path="/jadwal-perkuliahan" element={<ScheduleViewerPage />} />
        <Route path="/jadwal-ujian" element={<ExamSchedulePage />} />
        <Route path="/pengaturan" element={<SettingsPage />} />

        {/* Admin / Public Guest Read-Only Routes */}
        <Route
          path="/dashboard"
          element={
            <RoleGuard allowedRoles={['ADMIN']} allowGuest={true}>
              <AdminDashboard />
            </RoleGuard>
          }
        />
        <Route
          path="/data-mata-kuliah"
          element={
            <RoleGuard allowedRoles={['ADMIN']} allowGuest={true}>
              <CoursesPage />
            </RoleGuard>
          }
        />
        <Route
          path="/data-dosen"
          element={
            <RoleGuard allowedRoles={['ADMIN']} allowGuest={true}>
              <LecturersPage />
            </RoleGuard>
          }
        />
        <Route
          path="/ruangan"
          element={
            <RoleGuard allowedRoles={['ADMIN']} allowGuest={true}>
              <RoomsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/penawaran-kelas"
          element={
            <RoleGuard allowedRoles={['ADMIN']} allowGuest={true}>
              <CourseOfferingsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/data-mahasiswa"
          element={
            <RoleGuard allowedRoles={['ADMIN']}>
              <StudentsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/slot-waktu"
          element={
            <RoleGuard allowedRoles={['ADMIN']}>
              <TimeSlotsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/konflik-jadwal"
          element={
            <RoleGuard allowedRoles={['ADMIN']}>
              <ScheduleConflictsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/riwayat-versi"
          element={
            <RoleGuard allowedRoles={['ADMIN']}>
              <VersionHistoryPage />
            </RoleGuard>
          }
        />
        <Route
          path="/laporan"
          element={
            <RoleGuard allowedRoles={['ADMIN']}>
              <ReportsPage />
            </RoleGuard>
          }
        />

        {/* Lecturer Only Routes */}
        <Route
          path="/dosen/dashboard"
          element={
            <RoleGuard allowedRoles={['DOSEN']}>
              <LecturerDashboard />
            </RoleGuard>
          }
        />
        <Route
          path="/dosen/jadwal-saya"
          element={
            <RoleGuard allowedRoles={['DOSEN']}>
              <LecturerMySchedule />
            </RoleGuard>
          }
        />
        <Route
          path="/dosen/ketersediaan"
          element={
            <RoleGuard allowedRoles={['DOSEN']}>
              <LecturerAvailabilityPage />
            </RoleGuard>
          }
        />

        {/* Student Only Routes */}
        <Route
          path="/mahasiswa/dashboard"
          element={
            <RoleGuard allowedRoles={['MAHASISWA']}>
              <StudentDashboard />
            </RoleGuard>
          }
        />
        <Route
          path="/mahasiswa/jadwal-saya"
          element={
            <RoleGuard allowedRoles={['MAHASISWA']}>
              <StudentMySchedule />
            </RoleGuard>
          }
        />
        <Route
          path="/mahasiswa/unduh-jadwal"
          element={
            <RoleGuard allowedRoles={['MAHASISWA']}>
              <StudentDownloadSchedule />
            </RoleGuard>
          }
        />
      </Route>

      {/* 404 Catch All */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
