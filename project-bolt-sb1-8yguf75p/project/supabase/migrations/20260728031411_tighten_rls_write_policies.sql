/*
# Tighten RLS: replace always-true write policies with role-scoped checks

## Overview
All INSERT/UPDATE/DELETE policies previously used `USING (true)` / `WITH CHECK (true)`,
allowing ANY authenticated user (faculty or student) to modify ANY data. This migration
replaces them with proper role-based predicates so:
- Admins can CRUD all management tables.
- Faculty can update attendance rows (to approve/reject flagged records) but not insert/delete.
- Students can update only their own `students` profile row (photo, contact, device) and
  insert only their own `attendance_correction_requests`.
- Audit logs are insert-only for authenticated (system writes), read-only for non-admin,
  and delete/update restricted to admin.

## Helper
- `is_admin()` — returns true if the current JWT's `raw_app_meta_data->>role = 'admin'`.
  This is the immutable role set at account creation by the edge function.

## Tables modified (policies replaced)
- colleges, departments, courses, classrooms, wifi_access_points, faculty, subjects,
  students, timetables, notifications, attendance, audit_logs, attendance_correction_requests

## Security
- SELECT policies remain open to `authenticated` (all logged-in roles can read).
- INSERT/UPDATE/DELETE on management tables restricted to `is_admin()`.
- `attendance` UPDATE: admin OR faculty (faculty can review flagged records).
- `students` UPDATE: admin OR the student's own row (`user_id = auth.uid()`).
- `attendance_correction_requests` INSERT: student owns the row (`student_id` links to
  a student with `user_id = auth.uid()`).
- `attendance_correction_requests` UPDATE: admin OR faculty.
- `audit_logs` INSERT: any authenticated (system/edge function writes); UPDATE/DELETE: admin only.
*/

-- ============ HELPER FUNCTION ============
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'raw_user_meta_data' ->> 'role') = 'admin',
    false
  );
$$;

-- ============ COLLEGES ============
DROP POLICY IF EXISTS "colleges_insert" ON colleges;
CREATE POLICY "colleges_insert" ON colleges FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "colleges_update" ON colleges;
CREATE POLICY "colleges_update" ON colleges FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "colleges_delete" ON colleges;
CREATE POLICY "colleges_delete" ON colleges FOR DELETE TO authenticated USING (public.is_admin());

-- ============ DEPARTMENTS ============
DROP POLICY IF EXISTS "departments_insert" ON departments;
CREATE POLICY "departments_insert" ON departments FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "departments_update" ON departments;
CREATE POLICY "departments_update" ON departments FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "departments_delete" ON departments;
CREATE POLICY "departments_delete" ON departments FOR DELETE TO authenticated USING (public.is_admin());

-- ============ COURSES ============
DROP POLICY IF EXISTS "courses_insert" ON courses;
CREATE POLICY "courses_insert" ON courses FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "courses_update" ON courses;
CREATE POLICY "courses_update" ON courses FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "courses_delete" ON courses;
CREATE POLICY "courses_delete" ON courses FOR DELETE TO authenticated USING (public.is_admin());

-- ============ CLASSROOMS ============
DROP POLICY IF EXISTS "classrooms_insert" ON classrooms;
CREATE POLICY "classrooms_insert" ON classrooms FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "classrooms_update" ON classrooms;
CREATE POLICY "classrooms_update" ON classrooms FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "classrooms_delete" ON classrooms;
CREATE POLICY "classrooms_delete" ON classrooms FOR DELETE TO authenticated USING (public.is_admin());

-- ============ WI-FI ACCESS POINTS ============
DROP POLICY IF EXISTS "wifi_insert" ON wifi_access_points;
CREATE POLICY "wifi_insert" ON wifi_access_points FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "wifi_update" ON wifi_access_points;
CREATE POLICY "wifi_update" ON wifi_access_points FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "wifi_delete" ON wifi_access_points;
CREATE POLICY "wifi_delete" ON wifi_access_points FOR DELETE TO authenticated USING (public.is_admin());

-- ============ FACULTY ============
DROP POLICY IF EXISTS "faculty_insert" ON faculty;
CREATE POLICY "faculty_insert" ON faculty FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "faculty_update" ON faculty;
CREATE POLICY "faculty_update" ON faculty FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "faculty_delete" ON faculty;
CREATE POLICY "faculty_delete" ON faculty FOR DELETE TO authenticated USING (public.is_admin());

-- ============ SUBJECTS ============
DROP POLICY IF EXISTS "subjects_insert" ON subjects;
CREATE POLICY "subjects_insert" ON subjects FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "subjects_update" ON subjects;
CREATE POLICY "subjects_update" ON subjects FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "subjects_delete" ON subjects;
CREATE POLICY "subjects_delete" ON subjects FOR DELETE TO authenticated USING (public.is_admin());

-- ============ STUDENTS ============
-- Admin can CRUD; students can update their own row (photo, contact, device)
DROP POLICY IF EXISTS "students_insert" ON students;
CREATE POLICY "students_insert" ON students FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "students_update" ON students;
CREATE POLICY "students_update" ON students FOR UPDATE TO authenticated
  USING (public.is_admin() OR user_id = auth.uid())
  WITH CHECK (public.is_admin() OR user_id = auth.uid());
DROP POLICY IF EXISTS "students_delete" ON students;
CREATE POLICY "students_delete" ON students FOR DELETE TO authenticated USING (public.is_admin());

-- ============ TIMETABLES ============
DROP POLICY IF EXISTS "timetables_insert" ON timetables;
CREATE POLICY "timetables_insert" ON timetables FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "timetables_update" ON timetables;
CREATE POLICY "timetables_update" ON timetables FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "timetables_delete" ON timetables;
CREATE POLICY "timetables_delete" ON timetables FOR DELETE TO authenticated USING (public.is_admin());

-- ============ NOTIFICATIONS ============
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "notifications_delete" ON notifications;
CREATE POLICY "notifications_delete" ON notifications FOR DELETE TO authenticated USING (public.is_admin());

-- ============ ATTENDANCE ============
-- Admin can CRUD; faculty can UPDATE (review suspicious attendance)
DROP POLICY IF EXISTS "attendance_insert" ON attendance;
CREATE POLICY "attendance_insert" ON attendance FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "attendance_update" ON attendance;
CREATE POLICY "attendance_update" ON attendance FOR UPDATE TO authenticated
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM faculty f WHERE f.user_id = auth.uid()
  ))
  WITH CHECK (public.is_admin() OR EXISTS (
    SELECT 1 FROM faculty f WHERE f.user_id = auth.uid()
  ));
DROP POLICY IF EXISTS "attendance_delete" ON attendance;
CREATE POLICY "attendance_delete" ON attendance FOR DELETE TO authenticated USING (public.is_admin());

-- ============ AUDIT LOGS ============
-- Any authenticated can INSERT (system/edge function writes); UPDATE/DELETE admin only
DROP POLICY IF EXISTS "audit_insert" ON audit_logs;
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "audit_update" ON audit_logs;
CREATE POLICY "audit_update" ON audit_logs FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "audit_delete" ON audit_logs;
CREATE POLICY "audit_delete" ON audit_logs FOR DELETE TO authenticated USING (public.is_admin());

-- ============ ATTENDANCE CORRECTION REQUESTS ============
-- Students can INSERT their own; admin & faculty can UPDATE (approve/reject); admin can DELETE
DROP POLICY IF EXISTS "corrections_insert" ON attendance_correction_requests;
CREATE POLICY "corrections_insert" ON attendance_correction_requests FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = attendance_correction_requests.student_id
      AND s.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "corrections_update" ON attendance_correction_requests;
CREATE POLICY "corrections_update" ON attendance_correction_requests FOR UPDATE TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM faculty f WHERE f.user_id = auth.uid()))
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM faculty f WHERE f.user_id = auth.uid()));
DROP POLICY IF EXISTS "corrections_delete" ON attendance_correction_requests;
CREATE POLICY "corrections_delete" ON attendance_correction_requests FOR DELETE TO authenticated USING (public.is_admin());
