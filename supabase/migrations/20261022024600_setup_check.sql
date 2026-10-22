create table public.setup_check (
  id bigint generated always as identity primary key,
  message text not null,
  created_at timestamptz not null default now()
);
-- New tables in public are not exposed to the API until granted (Supabase change, October 2026).
grant select on public.setup_check to anon, authenticated;
grant select, insert, update, delete on public.setup_check to service_role;
alter table public.setup_check enable row level security;
create policy "anyone can read the setup check" on public.setup_check
  for select to anon, authenticated using (true);
insert into public.setup_check (message) values ('Hello from Supabase');
