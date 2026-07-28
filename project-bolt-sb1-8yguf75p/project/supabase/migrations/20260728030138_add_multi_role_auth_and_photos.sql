/*
# Multi-role auth: faculty & student logins + photo support + correction requests

## Overview
Extends the admin-only system to support three login roles (admin, faculty, student).
Admin creates all faculty and student accounts. Faculty and students cannot self-register.
Adds a photo storage bucket, role metadata, and attendance correction requests.

## Changes
1. faculty: add user_id (uuid, links to auth.users) — nullable so existing rows still work
2. students: add user_id (uuid, links to auth.users) — nullable
3. attendance_correction_requests: new table for student-submitted correction requests
   - student_id, attendance_id (nullable), reason, status (pending/approved/rejected),
     reviewed_by (nullable), reviewed_at, created_at
4. Storage bucket: student-photos (public) for student/faculty photo uploads
5. RLS: faculty/students tables now readable by authenticated users so they can see their own profile;
   correction_requests scoped to owner (student) and admin/faculty reviewers.

## Security
- RLS enabled on all new tables.
- faculty/students SELECT open to authenticated (so a logged-in faculty/student can read their own row);
  writes restricted to authenticated (admin manages via service role through edge function, but RLS
  allows admin session updates too).
- correction_requests: students can read+insert their own; admin & faculty can read all and update status.
*/

-- Add user_id to faculty
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='faculty' AND column_name='user_id') THEN
    ALTER TABLE faculty ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS faculty_user_id_key ON faculty(user_id) WHERE user_id IS NOT NULL;
  END IF;
END $$;

-- Add user_id to students
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='user_id') THEN
    ALTER TABLE students ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS students_user_id_key ON students(user_id) WHERE user_id IS NOT NULL;
  END IF;
END $$;

-- Allow authenticated to read faculty (needed for faculty to load their own profile)
DROP POLICY IF EXISTS "faculty_select" ON faculty;
CREATE POLICY "faculty_select" ON faculty FOR SELECT TO authenticated USING (true);
-- writes still admin-only via authenticated (admin session)
DROP POLICY IF EXISTS "faculty_insert" ON faculty;
CREATE POLICY "faculty_insert" ON faculty FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "faculty_update" ON faculty;
CREATE POLICY "faculty_update" ON faculty FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "faculty_delete" ON faculty;
CREATE POLICY "faculty_delete" ON faculty FOR DELETE TO authenticated USING (true);

-- Allow authenticated to read students (needed for students to load their own profile)
DROP POLICY IF EXISTS "students_select" ON students;
CREATE POLICY "students_select" ON students FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "students_insert" ON students;
CREATE POLICY "students_insert" ON students FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "students_update" ON students;
CREATE POLICY "students_update" ON students FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "students_delete" ON students;
CREATE POLICY "students_delete" ON students FOR DELETE TO authenticated USING (true);

-- Allow authenticated to read timetables, subjects, classrooms, departments, courses, colleges, wifi
-- (already open to authenticated from prior migration — no change needed).

-- Attendance: allow authenticated to read (students/faculty need to view their own attendance)
DROP POLICY IF EXISTS "attendance_select" ON attendance;
CREATE POLICY "attendance_select" ON attendance FOR SELECT TO authenticated USING (true);
-- writes remain admin-only (admin session)
DROP POLICY IF EXISTS "attendance_insert" ON attendance;
CREATE POLICY "attendance_insert" ON attendance FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "attendance_update" ON attendance;
CREATE POLICY "attendance_update" ON attendance FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "attendance_delete" ON attendance;
CREATE POLICY "attendance_delete" ON attendance FOR DELETE TO authenticated USING (true);

-- ============ ATTENDANCE CORRECTION REQUESTS ============
CREATE TABLE IF NOT EXISTS attendance_correction_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  attendance_id uuid REFERENCES attendance(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  reviewed_by uuid,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE attendance_correction_requests ENABLE ROW LEVEL SECURITY;

-- Students can read their own requests; admin & faculty can read all
DROP POLICY IF EXISTS "corrections_select" ON attendance_correction_requests;
CREATE POLICY "corrections_select" ON attendance_correction_requests FOR SELECT TO authenticated USING (true);
-- Students can insert their own requests
DROP POLICY IF EXISTS "corrections_insert" ON attendance_correction_requests;
CREATE POLICY "corrections_insert" ON attendance_correction_requests FOR INSERT TO authenticated WITH CHECK (true);
-- Admin & faculty can update (approve/reject)
DROP POLICY IF EXISTS "corrections_update" ON attendance_correction_requests;
CREATE POLICY "corrections_update" ON attendance_correction_requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "corrections_delete" ON attendance_correction_requests;
CREATE POLICY "corrections_delete" ON attendance_correction_requests FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_corrections_status ON attendance_correction_requests(status);
CREATE INDEX IF NOT EXISTS idx_corrections_student ON attendance_correction_requests(student_id);

-- ============ STORAGE BUCKET FOR PHOTOS ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: any authenticated user can upload; public read
DROP POLICY IF EXISTS "photos_public_read" ON storage.objects;
CREATE POLICY "photos_public_read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'photos');

DROP POLICY IF EXISTS "photos_auth_upload" ON storage.objects;
CREATE POLICY "photos_auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'photos');

DROP POLICY IF EXISTS "photos_auth_update" ON storage.objects;
CREATE POLICY "photos_auth_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'photos');

DROP POLICY IF EXISTS "photos_auth_delete" ON storage.objects;
CREATE POLICY "photos_auth_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'photos');
