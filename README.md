# MileWire

Fleet tracking proof of concept: a phone app that records drives (GPS + motion) and a web console that shows them live, replays them, and reports mileage.

npm-workspaces monorepo. The apps are independent and share no packages.

- `apps/mobile` — Expo / React Native driver app (`@milewire/mobile`)
- `apps/web` — Next.js fleet console (`@milewire/web`)
- `supabase/` — database migrations and config (shared backend)

## What it does

**Mobile (light, bronze)** — Opens on the **map** with floating controls · **Track mode** pill: press and hold to start, or it starts by itself once you reach 10 km/h (live speed, distance, time and bump detection on the same map) · Recents (drive list + per-drive route and stats) · basic Settings (permissions, units, join a fleet, clear data).
Track mode records exactly two things: GPS position and motion-sensor readings (bumps). Drives stay on the phone unless the driver joins a fleet with a code.

**Web (dark, bronze)** — Live **Map** of drivers · **Fleets** (join code, drivers, activity metrics, recent drives) · **Drive replay** on a map or in **3D**, with speed and **motion-sensor** charts (Cesium: orbit / chase / in-car cameras) · **Live 3D focus** on one driver · **Vehicles & mileage** (assign a driver to a vehicle, odometer reports, CSV and print-to-PDF).

## Run it

```bash
npm install
npm run dev:web          # http://localhost:3000
npm run dev:mobile       # needs a development build — see apps/mobile/README.md
npm run typecheck && npm run lint && npm test
```

The web console works out of the box in **demo mode** (built-in sample data, no sign-in) whenever the Supabase variables are empty, or when `NEXT_PUBLIC_MILEWIRE_DEMO=1`.

## Configuration

Copy each app's `.env.example` and fill in what you need. Nothing is required to start; features degrade gracefully.

| Variable | App | Used for |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `…_PUBLISHABLE_KEY` | web | Real data (otherwise demo mode) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | web | Map view, replay map, 3D imagery |
| `NEXT_PUBLIC_CESIUM_ION_TOKEN` | web | Optional: 3D terrain + buildings |
| `EXPO_PUBLIC_SUPABASE_URL` / `…_PUBLISHABLE_KEY` | mobile | Fleet sharing (otherwise offline) |
| `EXPO_PUBLIC_MAPBOX_TOKEN` | mobile | Map |
| `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` | mobile build | Secret token the native build uses to fetch the Mapbox SDK |

## Database

`supabase/migrations/` adds fleets, drivers, vehicles, assignments, drives (GPS path, bumps and a downsampled motion-sensor series) and live positions, with grants + RLS + policies. Helper functions live in a `private` schema so `join_fleet()` is the only client-callable function.

Setup needed once on the Supabase project:

1. Apply the migration (`supabase db push`).
2. Enable **Anonymous sign-ins** (Auth → Providers). Drivers use anonymous identities; fleet managers use email + password.
3. Run the security advisors afterwards, as usual.

### Sample fleet

The live project holds one sample fleet, **North Region Drivers** (1 driver, 2 vehicles, 8 recorded drives, each with its GPS route and motion-sensor series). It was loaded straight into the database rather than through a migration, because the drives are real GPS traces and this repo is public, so don't add them to `supabase/`.

It is owned by a placeholder user nobody can sign in as. After you sign up on the web app, take ownership by running this in the Supabase SQL editor (use your own sign-up email):

```sql
update public.fleets
set owner_id = (select id from auth.users where email = 'you@example.com')
where name = 'North Region Drivers';
```

The fleet's join code is in the `fleets` table (or on the Fleets page once you own it). Don't publish it: anyone with the code can join the fleet from the app.

## Deploying the web app

Vercel: set the project's Root Directory to `apps/web`. Cesium's static assets are copied into `public/cesium` automatically before `next dev` / `next build`.
