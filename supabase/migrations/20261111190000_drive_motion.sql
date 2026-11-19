-- Motion-sensor payload for each recorded drive.
--
-- `motion` is a downsampled series of [epochMs, accelDevG, gyroRadS] buckets:
--   accelDevG = peak |‖accel‖ − 1 g| in the bucket (device frame)
--   gyroRadS  = peak ‖gyro‖ in rad/s in the bucket
-- Peaks (not averages) are kept so short bumps survive downsampling. Drives
-- recorded without a motion sensor keep the empty default.
--
-- Existing grants and RLS policies on drive_sessions are table-level, so they
-- cover the new column as-is.

alter table public.drive_sessions
  add column motion jsonb not null default '[]'::jsonb;

alter table public.drive_sessions
  add constraint drive_sessions_motion_is_array check (jsonb_typeof(motion) = 'array');
