-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: 009's `REVOKE EXECUTE ... FROM PUBLIC` did not remove the `anon` role's
-- own EXECUTE privilege. Supabase projects auto-grant EXECUTE on newly
-- created public-schema functions to anon/authenticated/service_role directly
-- (a default-privileges rule, separate from the PUBLIC pseudo-role), so
-- revoking from PUBLIC alone left anon still able to call both pool RPCs.
-- Verified live: a query against information_schema.routine_privileges showed
-- `anon` still listed with EXECUTE after 009 was applied.
--
-- authenticated keeps EXECUTE (already granted by 009) — RLS's own
-- is_superadmin() checks are still the real gate for a non-superadmin
-- authenticated user; this migration only closes the anon gap.
-- ─────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION generate_pickleball_pools(UUID, INTEGER, JSONB, JSONB, BOOLEAN) FROM anon;
REVOKE EXECUTE ON FUNCTION reset_pickleball_pools(UUID) FROM anon;
