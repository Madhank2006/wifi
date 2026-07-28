/*
# Harden is_admin(), audit_logs insert, and photos bucket

## Overview
Fixes four security findings:
1. `is_admin()` had a mutable `search_path` — locked to `public, pg_temp` via ALTER.
2. `is_admin()` was `SECURITY DEFINER` and executable by `anon` — switched to
   `SECURITY INVOKER` and `EXECUTE` revoked from `anon` and `public`; granted only
   to `authenticated`.
3. `audit_logs` INSERT policy was `WITH CHECK (true)` — restricted to `is_admin()`.
4. `photos` bucket had a broad SELECT policy allowing clients to list all files.
   Public buckets serve individual object URLs without any SELECT policy, so the
   listing policy was dropped.

## Security
- `is_admin()`: SECURITY INVOKER, locked search_path, authenticated-only execution.
- `audit_logs`: INSERT restricted to admin; UPDATE/DELETE already admin-only.
- `storage.objects` for `photos`: SELECT policy removed (no listing); writes
  remain authenticated-only.
*/

-- ============ 1 & 2. Harden is_admin() in place ============
-- Replace function body (CREATE OR REPLACE keeps dependents intact)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'raw_user_meta_data' ->> 'role') = 'admin',
    false
  );
$$;

-- Revoke execution from anon and public; grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============ 3. Restrict audit_logs INSERT to admin ============
DROP POLICY IF EXISTS "audit_insert" ON audit_logs;
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- ============ 4. Remove photos bucket SELECT (listing) policy ============
-- Public buckets serve object URLs directly without a SELECT policy.
-- Dropping it prevents clients from enumerating all files in the bucket.
DROP POLICY IF EXISTS "photos_public_read" ON storage.objects;
