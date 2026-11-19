-- MileWire fleet tracking: fleets, drivers, vehicles, recorded drives, live positions.
--
-- Identity model
--   * Fleet managers sign in on the web app with email + password (regular users).
--   * Drivers never sign up: the mobile app signs in anonymously (needs
--     "Allow anonymous sign-ins" enabled for the project) and joins a fleet by
--     join code through public.join_fleet().
--
-- Every table below gets grants + RLS + policies in this one migration, because
-- new tables in public are not exposed to the API until granted.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Helper functions live in a schema the API does not expose, so they are never
-- callable as RPC. Only public.join_fleet() is meant to be called by clients.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- 6-character join code from an alphabet without look-alikes (no 0/O, 1/I).
create function private.generate_join_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.fleets where join_code = code);
  end loop;
  return code;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.fleets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  join_code text not null unique default private.generate_join_code(),
  created_at timestamptz not null default now()
);
create index fleets_owner_idx on public.fleets (owner_id);

-- Drivers in a fleet. The owner is not a member row; they manage the fleet.
create table public.fleet_members (
  fleet_id uuid not null references public.fleets (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  joined_at timestamptz not null default now(),
  primary key (fleet_id, user_id)
);
create index fleet_members_user_idx on public.fleet_members (user_id);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references public.fleets (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 60),
  license_plate text check (license_plate is null or char_length(license_plate) <= 16),
  baseline_odometer_km numeric(10, 1) not null default 0 check (baseline_odometer_km >= 0),
  baseline_effective_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index vehicles_fleet_idx on public.vehicles (fleet_id);

-- Which driver had which vehicle, and when. Windows are soft: unassigning
-- stamps unassigned_at; history is kept for mileage attribution.
create table public.vehicle_assignments (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references public.fleets (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  check (unassigned_at is null or unassigned_at >= assigned_at)
);
-- 1:1 while current: one driver per vehicle, one vehicle per driver (per fleet).
create unique index vehicle_assignments_current_vehicle
  on public.vehicle_assignments (vehicle_id) where unassigned_at is null;
create unique index vehicle_assignments_current_driver
  on public.vehicle_assignments (fleet_id, user_id) where unassigned_at is null;
create index vehicle_assignments_fleet_idx on public.vehicle_assignments (fleet_id);

-- A recorded drive. `path` is a thinned [lat, lon, epochMs, speedMps][] and
-- `jolts` the bump events from the motion sensor: GPS + motion only.
create table public.drive_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  fleet_id uuid references public.fleets (id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  distance_m integer not null default 0 check (distance_m >= 0),
  duration_ms bigint not null default 0 check (duration_ms >= 0),
  moving_ms bigint not null default 0 check (moving_ms >= 0),
  max_speed_mps real not null default 0,
  avg_speed_mps real not null default 0,
  jolt_count integer not null default 0 check (jolt_count >= 0),
  jolts jsonb not null default '[]'::jsonb,
  path jsonb not null default '[]'::jsonb,
  gps_samples integer not null default 0,
  gps_poor_samples integer not null default 0,
  gps_gaps integer not null default 0,
  created_at timestamptz not null default now()
);
create index drive_sessions_fleet_idx on public.drive_sessions (fleet_id, started_at desc);
create index drive_sessions_user_idx on public.drive_sessions (user_id, started_at desc);

-- Latest position per driver while Track mode is on. One row per driver.
create table public.live_positions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  fleet_id uuid not null references public.fleets (id) on delete cascade,
  session_id uuid,
  lat double precision not null check (lat between -90 and 90),
  lon double precision not null check (lon between -180 and 180),
  heading real,
  speed_mps real,
  accuracy_m real,
  updated_at timestamptz not null default now()
);
create index live_positions_fleet_idx on public.live_positions (fleet_id);

-- ---------------------------------------------------------------------------
-- Policy helpers (security definer so policies never recurse into RLS)
-- ---------------------------------------------------------------------------

create function private.is_fleet_owner(p_fleet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.fleets f where f.id = p_fleet_id and f.owner_id = auth.uid()
  );
$$;

create function private.is_fleet_member(p_fleet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.fleet_members m where m.fleet_id = p_fleet_id and m.user_id = auth.uid()
  );
$$;

-- Anonymous (driver) identities may join fleets but never create them.
create function private.is_registered_user()
returns boolean
language sql
stable
set search_path = ''
as $$
  select auth.uid() is not null and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;

-- Driver joins a fleet by code. Security definer: drivers cannot read `fleets`
-- directly, so the code lookup has to happen server-side.
create function public.join_fleet(p_code text, p_display_name text)
returns table (fleet_id uuid, fleet_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fleet public.fleets;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select * into v_fleet from public.fleets where join_code = upper(btrim(p_code));
  if not found then
    raise exception 'fleet not found';
  end if;
  insert into public.fleet_members (fleet_id, user_id, display_name)
  values (v_fleet.id, auth.uid(), btrim(p_display_name))
  -- Constraint name, not columns: `fleet_id` is also an OUT parameter of this function.
  on conflict on constraint fleet_members_pkey do update set display_name = excluded.display_name;
  return query select v_fleet.id, v_fleet.name;
end;
$$;

-- The column default below runs as the inserting role, so authenticated needs execute.
revoke execute on function private.generate_join_code() from public, anon;
grant execute on function private.generate_join_code() to authenticated;
revoke execute on function private.is_fleet_owner(uuid) from public, anon;
revoke execute on function private.is_fleet_member(uuid) from public, anon;
revoke execute on function private.is_registered_user() from public, anon;
revoke execute on function public.join_fleet(text, text) from public, anon;
grant execute on function private.is_fleet_owner(uuid) to authenticated;
grant execute on function private.is_fleet_member(uuid) to authenticated;
grant execute on function private.is_registered_user() to authenticated;
grant execute on function public.join_fleet(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on public.fleets to authenticated;
grant select, delete on public.fleet_members to authenticated;
grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert, update, delete on public.vehicle_assignments to authenticated;
grant select, insert, update, delete on public.drive_sessions to authenticated;
grant select, insert, update, delete on public.live_positions to authenticated;

grant select, insert, update, delete on public.fleets to service_role;
grant select, insert, update, delete on public.fleet_members to service_role;
grant select, insert, update, delete on public.vehicles to service_role;
grant select, insert, update, delete on public.vehicle_assignments to service_role;
grant select, insert, update, delete on public.drive_sessions to service_role;
grant select, insert, update, delete on public.live_positions to service_role;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.fleets enable row level security;
alter table public.fleet_members enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_assignments enable row level security;
alter table public.drive_sessions enable row level security;
alter table public.live_positions enable row level security;

-- fleets: managers own them; drivers can see the fleets they belong to.
create policy "owner or member can read fleet" on public.fleets
  for select to authenticated
  using (owner_id = (select auth.uid()) or private.is_fleet_member(id));
create policy "registered users create their own fleets" on public.fleets
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and private.is_registered_user());
create policy "owner updates fleet" on public.fleets
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "owner deletes fleet" on public.fleets
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- fleet_members: joined only through join_fleet(); a driver can leave, a manager can remove.
create policy "driver or owner can read members" on public.fleet_members
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_fleet_owner(fleet_id));
create policy "driver leaves or owner removes" on public.fleet_members
  for delete to authenticated
  using (user_id = (select auth.uid()) or private.is_fleet_owner(fleet_id));

-- vehicles + assignments: manager only.
create policy "owner manages vehicles" on public.vehicles
  for all to authenticated
  using (private.is_fleet_owner(fleet_id))
  with check (private.is_fleet_owner(fleet_id));
create policy "owner manages assignments" on public.vehicle_assignments
  for all to authenticated
  using (private.is_fleet_owner(fleet_id))
  with check (
    private.is_fleet_owner(fleet_id)
    and exists (select 1 from public.vehicles v where v.id = vehicle_assignments.vehicle_id and v.fleet_id = vehicle_assignments.fleet_id)
    and exists (
      select 1 from public.fleet_members m
      where m.fleet_id = vehicle_assignments.fleet_id and m.user_id = vehicle_assignments.user_id
    )
  );

-- drive_sessions: the driver owns their drives; a fleet manager reads the fleet's.
create policy "driver or fleet owner reads drives" on public.drive_sessions
  for select to authenticated
  using (user_id = (select auth.uid()) or (fleet_id is not null and private.is_fleet_owner(fleet_id)));
create policy "driver records own drives" on public.drive_sessions
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (fleet_id is null or private.is_fleet_member(fleet_id))
  );
create policy "driver updates own drives" on public.drive_sessions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (fleet_id is null or private.is_fleet_member(fleet_id))
  );
create policy "driver deletes own drives" on public.drive_sessions
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- live_positions: the driver publishes their own; the fleet manager reads the fleet's.
create policy "driver or fleet owner reads live positions" on public.live_positions
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_fleet_owner(fleet_id));
create policy "member publishes own live position" on public.live_positions
  for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_fleet_member(fleet_id));
create policy "member updates own live position" on public.live_positions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and private.is_fleet_member(fleet_id));
create policy "driver clears own live position" on public.live_positions
  for delete to authenticated
  using (user_id = (select auth.uid()));
