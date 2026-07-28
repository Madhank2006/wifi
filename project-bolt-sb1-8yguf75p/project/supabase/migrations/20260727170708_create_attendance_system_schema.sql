/*
# AI Smart Wi-Fi Based College Attendance Management System — Schema

## Overview
Creates the full schema for an admin-only college attendance management portal.
The system automatically marks attendance when registered student devices connect
to authorized college Wi-Fi during scheduled class hours. Only the Admin can log in.

## Tables created
1. admins — admin login accounts metadata
2. colleges — college entities with logo, address, contact, academic year
3. departments — departments per college with assigned HOD
4. courses — courses with duration and semester config
5. wifi_access_points — Wi-Fi APs with SSID, MAC, building, floor, classroom mapping, enabled flag
6. classrooms — rooms with building, floor, capacity, mapped Wi-Fi AP
7. faculty — faculty members with employee id, dept, contact, qualification
8. subjects — subjects with code, credits, faculty assignment
9. students — students with photo, register no, dept/course/sem/section, device, fingerprint, parent details, QR
10. timetables — scheduled classes: faculty, classroom, subject, attendance time window
11. attendance — attendance records (auto-marked + manual corrections), AI flags
12. notifications — system notifications (low attendance, corrections, holidays, maintenance)
13. audit_logs — activity monitoring for security

## Security
- RLS enabled on every table.
- Admin-only portal: admin authenticates via Supabase Auth (email/password).
- All tables use `TO authenticated` policies so only the logged-in admin can CRUD.
*/

-- ============ ADMINS ============
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_select_authenticated" ON admins;
CREATE POLICY "admins_select_authenticated" ON admins FOR SELECT TO authenticated USING (true);

-- ============ COLLEGES ============
CREATE TABLE IF NOT EXISTS colleges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  address text,
  contact_email text,
  contact_phone text,
  academic_year text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "colleges_select" ON colleges; CREATE POLICY "colleges_select" ON colleges FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "colleges_insert" ON colleges; CREATE POLICY "colleges_insert" ON colleges FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "colleges_update" ON colleges; CREATE POLICY "colleges_update" ON colleges FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "colleges_delete" ON colleges; CREATE POLICY "colleges_delete" ON colleges FOR DELETE TO authenticated USING (true);

-- ============ DEPARTMENTS ============
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid REFERENCES colleges(id) ON DELETE CASCADE,
  name text NOT NULL,
  hod_name text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "departments_select" ON departments; CREATE POLICY "departments_select" ON departments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "departments_insert" ON departments; CREATE POLICY "departments_insert" ON departments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "departments_update" ON departments; CREATE POLICY "departments_update" ON departments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "departments_delete" ON departments; CREATE POLICY "departments_delete" ON departments FOR DELETE TO authenticated USING (true);

-- ============ COURSES ============
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration_years integer NOT NULL DEFAULT 3,
  total_semesters integer NOT NULL DEFAULT 6,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "courses_select" ON courses; CREATE POLICY "courses_select" ON courses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "courses_insert" ON courses; CREATE POLICY "courses_insert" ON courses FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "courses_update" ON courses; CREATE POLICY "courses_update" ON courses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "courses_delete" ON courses; CREATE POLICY "courses_delete" ON courses FOR DELETE TO authenticated USING (true);

-- ============ WI-FI ACCESS POINTS (no classroom FK yet) ============
CREATE TABLE IF NOT EXISTS wifi_access_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ssid text NOT NULL,
  mac_address text NOT NULL,
  building text,
  floor text,
  classroom_id uuid,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE wifi_access_points ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wifi_select" ON wifi_access_points; CREATE POLICY "wifi_select" ON wifi_access_points FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "wifi_insert" ON wifi_access_points; CREATE POLICY "wifi_insert" ON wifi_access_points FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "wifi_update" ON wifi_access_points; CREATE POLICY "wifi_update" ON wifi_access_points FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "wifi_delete" ON wifi_access_points; CREATE POLICY "wifi_delete" ON wifi_access_points FOR DELETE TO authenticated USING (true);

-- ============ CLASSROOMS ============
CREATE TABLE IF NOT EXISTS classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  building text,
  floor text,
  capacity integer NOT NULL DEFAULT 60,
  wifi_ap_id uuid REFERENCES wifi_access_points(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "classrooms_select" ON classrooms; CREATE POLICY "classrooms_select" ON classrooms FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "classrooms_insert" ON classrooms; CREATE POLICY "classrooms_insert" ON classrooms FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "classrooms_update" ON classrooms; CREATE POLICY "classrooms_update" ON classrooms FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "classrooms_delete" ON classrooms; CREATE POLICY "classrooms_delete" ON classrooms FOR DELETE TO authenticated USING (true);

-- Now add classroom FK back to wifi_access_points
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wifi_access_points_classroom_id_fkey') THEN
    ALTER TABLE wifi_access_points
      ADD CONSTRAINT wifi_access_points_classroom_id_fkey
      FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============ FACULTY ============
CREATE TABLE IF NOT EXISTS faculty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text UNIQUE NOT NULL,
  name text NOT NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  mobile_number text,
  email text,
  qualification text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE faculty ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "faculty_select" ON faculty; CREATE POLICY "faculty_select" ON faculty FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "faculty_insert" ON faculty; CREATE POLICY "faculty_insert" ON faculty FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "faculty_update" ON faculty; CREATE POLICY "faculty_update" ON faculty FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "faculty_delete" ON faculty; CREATE POLICY "faculty_delete" ON faculty FOR DELETE TO authenticated USING (true);

-- ============ SUBJECTS ============
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  credits integer NOT NULL DEFAULT 4,
  faculty_id uuid REFERENCES faculty(id) ON DELETE SET NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subjects_select" ON subjects; CREATE POLICY "subjects_select" ON subjects FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "subjects_insert" ON subjects; CREATE POLICY "subjects_insert" ON subjects FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "subjects_update" ON subjects; CREATE POLICY "subjects_update" ON subjects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "subjects_delete" ON subjects; CREATE POLICY "subjects_delete" ON subjects FOR DELETE TO authenticated USING (true);

-- ============ STUDENTS ============
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  register_number text UNIQUE NOT NULL,
  name text NOT NULL,
  photo_url text,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  course_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  semester integer NOT NULL DEFAULT 1,
  section text,
  mobile_number text,
  email text,
  parent_name text,
  parent_mobile text,
  registered_device text,
  device_fingerprint text,
  qr_code text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "students_select" ON students; CREATE POLICY "students_select" ON students FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "students_insert" ON students; CREATE POLICY "students_insert" ON students FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "students_update" ON students; CREATE POLICY "students_update" ON students FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "students_delete" ON students; CREATE POLICY "students_delete" ON students FOR DELETE TO authenticated USING (true);

-- ============ TIMETABLES ============
CREATE TABLE IF NOT EXISTS timetables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  faculty_id uuid REFERENCES faculty(id) ON DELETE CASCADE,
  classroom_id uuid REFERENCES classrooms(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  semester integer NOT NULL DEFAULT 1,
  section text,
  attendance_window_minutes integer NOT NULL DEFAULT 15,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "timetables_select" ON timetables; CREATE POLICY "timetables_select" ON timetables FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "timetables_insert" ON timetables; CREATE POLICY "timetables_insert" ON timetables FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "timetables_update" ON timetables; CREATE POLICY "timetables_update" ON timetables FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "timetables_delete" ON timetables; CREATE POLICY "timetables_delete" ON timetables FOR DELETE TO authenticated USING (true);

-- ============ ATTENDANCE ============
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  timetable_id uuid REFERENCES timetables(id) ON DELETE SET NULL,
  classroom_id uuid REFERENCES classrooms(id) ON DELETE SET NULL,
  wifi_ap_id uuid REFERENCES wifi_access_points(id) ON DELETE SET NULL,
  date date NOT NULL,
  marked_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'present',
  method text NOT NULL DEFAULT 'wifi',
  device_verified boolean NOT NULL DEFAULT true,
  ai_validated boolean NOT NULL DEFAULT true,
  proxy_flag boolean NOT NULL DEFAULT false,
  multiple_device_flag boolean NOT NULL DEFAULT false,
  risk_score integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attendance_select" ON attendance; CREATE POLICY "attendance_select" ON attendance FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "attendance_insert" ON attendance; CREATE POLICY "attendance_insert" ON attendance FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "attendance_update" ON attendance; CREATE POLICY "attendance_update" ON attendance FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "attendance_delete" ON attendance; CREATE POLICY "attendance_delete" ON attendance FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_subject ON attendance(subject_id);

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  recipient text,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select" ON notifications; CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "notifications_insert" ON notifications; CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "notifications_update" ON notifications; CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "notifications_delete" ON notifications; CREATE POLICY "notifications_delete" ON notifications FOR DELETE TO authenticated USING (true);

-- ============ AUDIT LOGS ============
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor text NOT NULL,
  action text NOT NULL,
  entity text,
  entity_id uuid,
  details text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_select" ON audit_logs; CREATE POLICY "audit_select" ON audit_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "audit_insert" ON audit_logs; CREATE POLICY "audit_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "audit_update" ON audit_logs; CREATE POLICY "audit_update" ON audit_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "audit_delete" ON audit_logs; CREATE POLICY "audit_delete" ON audit_logs FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
