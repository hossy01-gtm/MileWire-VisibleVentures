-- Demo data: move the demo fleet's recent drives into 1-16 November 2026.
--
-- The 8 seeded drives of "North Region Drivers" were dated 16-26 October 2026.
-- Each is moved forward by a whole number of days, so its time of day (UTC) is
-- unchanged and chronological order is kept:
--
--   Oct 16 -> Nov  1   (+16 d)      Oct 21 -> Nov  9   (+19 d)
--   Oct 17 -> Nov  3   (+17 d)      Oct 23 -> Nov 12   (+20 d)
--   Oct 19 -> Nov  6   (+18 d)      Oct 24 -> Nov 13   (+20 d)
--   Oct 20 -> Nov  7   (+18 d)      Oct 26 -> Nov 16   (+21 d)
--
-- started_at / ended_at move by that shift. The recorded path, jolts and motion
-- series carry their own epoch-ms timestamps (they were captured at other times
-- than the started_at column says), so they are re-aligned to the new
-- started_at by one constant per drive: relative timing, and therefore the
-- replay, is untouched.
--
-- To undo, subtract the same per-drive day shift from started_at / ended_at
-- and re-align the embedded timestamps to the old started_at.
--
-- Rows are matched by id, so this is a no-op on any database that does not hold
-- these drives (a fresh local stack, for example). The started_at guard keeps it
-- from moving a drive twice.

with moves (id, days) as (
  values
    ('1cc71486-3b45-5165-b39f-b00377788440'::uuid, 16),
    ('75607a13-aa07-58ca-97ae-945db487304d'::uuid, 17),
    ('999c9eea-a891-582e-be2e-860372c2705e'::uuid, 18),
    ('b3d06298-3d2c-5c86-a17b-cc227ffa604e'::uuid, 18),
    ('3aad81ad-fe0c-56c0-910c-c938456f87c9'::uuid, 19),
    ('74381e39-dd26-5193-99b5-5cd091819cd8'::uuid, 20),
    ('cecb46f8-dc06-5ab7-aa2d-d0953235f1f0'::uuid, 20),
    ('208e99bf-0f18-5c7f-84b9-63f8c08df3f2'::uuid, 21)
),
plan as (
  select
    d.id,
    m.days * interval '24 hours' as shift,
    -- ms to add to every embedded timestamp so path[0] lands exactly on the new started_at
    (extract(epoch from d.started_at + m.days * interval '24 hours') * 1000)::bigint
      - (d.path -> 0 ->> 2)::bigint as embedded_ms
  from public.drive_sessions d
  join moves m on m.id = d.id
  where d.started_at < timestamptz '2026-11-01 00:00:00+00'
    and jsonb_array_length(d.path) > 0
)
update public.drive_sessions d
set
  started_at = d.started_at + p.shift,
  ended_at = d.ended_at + p.shift,
  path = (
    select coalesce(jsonb_agg(jsonb_set(e, '{2}', to_jsonb((e ->> 2)::bigint + p.embedded_ms)) order by ord), '[]'::jsonb)
    from jsonb_array_elements(d.path) with ordinality as t (e, ord)
  ),
  jolts = (
    select coalesce(
      jsonb_agg(
        case when e ? 't' then jsonb_set(e, '{t}', to_jsonb((e ->> 't')::bigint + p.embedded_ms)) else e end
        order by ord
      ),
      '[]'::jsonb
    )
    from jsonb_array_elements(d.jolts) with ordinality as t (e, ord)
  ),
  motion = (
    select coalesce(jsonb_agg(jsonb_set(e, '{0}', to_jsonb((e ->> 0)::bigint + p.embedded_ms)) order by ord), '[]'::jsonb)
    from jsonb_array_elements(d.motion) with ordinality as t (e, ord)
  )
from plan p
where p.id = d.id;
