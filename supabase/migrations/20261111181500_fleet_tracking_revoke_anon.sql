-- Fleet managers sign in with email + password and drivers sign in anonymously
-- (the `authenticated` role), so the API's signed-out `anon` role needs no
-- table access at all.
--
-- RLS already hides every row from `anon` (no policy targets it), but this
-- project has Supabase's default grants to `anon` on new public tables. Remove
-- them so access is denied outright rather than only filtered to nothing.

revoke all on public.fleets from anon;
revoke all on public.fleet_members from anon;
revoke all on public.vehicles from anon;
revoke all on public.vehicle_assignments from anon;
revoke all on public.drive_sessions from anon;
revoke all on public.live_positions from anon;
