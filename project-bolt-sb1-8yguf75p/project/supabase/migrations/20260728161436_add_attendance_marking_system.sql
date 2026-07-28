/*
# Attendance marking system: settings table + full recording fields

## Overview
Adds the infrastructure for the student Mark Attendance flow with all validation
checks (WiFi, device, schedule, location, time window, duplicate prevention).

## Changes

### New Table: attendance_settings
Per-class attendance control. Admin can enable/disable attendance for each class
and configure the attendance time window (minutes before/after class start).
- id (uuid, PK)
- timetable_id (uuid, FK to timetables, unique)
- enabled (boolean, default true)
- window_open_minutes (integer, default 10)
- window_close_minutes (integer, default 20)
- updated_at (timestamptz)

### Modified Table: attendance
Added columns for full attendance recording:
- wifi_ssid (text) - the WiFi network name
- device_id (text) - the MAC address / device ID
- location_verified (boolean, default false)
- faculty_verified (boolean, default false)
- faculty_id (uuid, nullable)

### RLS on attendance_settings
- SELECT: authenticated (all roles can read)
- INSERT/UPDATE/DELETE: admin only (via is_admin())

## Security
- RLS enabled on attendance_settings.
- Write policies use is_admin() for admin-only access.
- Attendance INSERT policy updated: students can insert their own attendance.
- Unique constraint: one attendance per student per timetable slot per date.
*/

-- ============ ATTENDANCE SETTINGS TABLE ============
CREATE TABLE IF NOT EXISTS attendance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timetable_id uuid UNIQUE REFERENCES timetables(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  window_open_minutes integer NOT NULL DEFAULT 10,
  window_close_minutes integer NOT NULL DEFAULT 20,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE attendance_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "att_settings_select" ON attendance_settings;
CREATE POLICY "att_settings_select" ON attendance_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "att_settings_insert" ON attendance_settings;
CREATE POLICY "att_settings_insert" ON attendance_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "att_settings_update" ON attendance_settings;
CREATE POLICY "att_settings_update" ON attendance_settings FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "att_settings_delete" ON attendance_settings;
CREATE POLICY "att_settings_delete" ON attendance_settings FOR DELETE TO authenticated USING (public.is_admin());

-- ============ ADD COLUMNS TO ATTENDANCE ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='wifi_ssid') THEN
    ALTER TABLE attendance ADD COLUMN wifi_ssid text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='device_id') THEN
    ALTER TABLE attendance ADD COLUMN device_id text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='location_verified') THEN
    ALTER TABLE attendance ADD COLUMN location_verified boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='faculty_verified') THEN
    ALTER TABLE attendance ADD COLUMN faculty_verified boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance' AND column_name='faculty_id') THEN
    ALTER TABLE attendance ADD COLUMN faculty_id uuid;
  END IF;
END $$;

-- ============ UPDATE ATTENDANCE INSERT POLICY ============
-- Students can insert their own attendance (student_id must match their own students row)
-- Admin can insert any
DROP POLICY IF EXISTS "attendance_insert" ON attendance;
CREATE POLICY "attendance_insert" ON attendance FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = attendance.student_id
      AND s.user_id = auth.uid()
    )
  );

-- Add unique constraint: one attendance per student per timetable slot per date
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_unique_per_slot'
  ) THEN
    ALTER TABLE attendance ADD CONSTRAINT attendance_unique_per_slot UNIQUE (student_id, timetable_id, date);
  END IF;
END $$;
