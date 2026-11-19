# MileWire mobile

Expo (SDK 58) driver app. Light mode only, bronze primary.

## Structure

There is one screen: the map. It is mounted once in the root layout (`src/app/_layout.tsx`) and never remounts; everything else floats above it. Code lives in `src/journey/`.

| Layer | What |
| --- | --- |
| **Map underlay** (`MapUnderlay.tsx`) | The only `MapView`. Its camera follows the driver when browsing, chases the heading in a drive, and fits the route when a finished drive is on show. Camera padding follows the chrome (pill, in-drive dock, sheet) so the puck and the route stay in the visible part |
| **Browse kit** (`kits/BrowseKit.tsx`) | Idle map: Recents / Settings rail and recenter at the top right, live speed at the top left, the Track mode pill at the bottom |
| **In-drive kit** (`kits/LiveKit.tsx`) | A separate layer for a running drive: status card with the clock across the top, side rail (recenter, Stop), speed gauge and a distance / average / bumps dock along the bottom. The idle controls do not exist while a drive runs |
| **Sheets** (`sheets/`) | Recents, Settings, Fleet and Drive open as glass sheets over the map with a peek and a full detent (drag the handle, flick down to close). The map stays visible and interactive above them |

Scenes are `browse`, `live` and `review` (`sheetNav.ts` decides which; a session always wins). Stopping a drive lands on `review`: the finished route is drawn on the map with start and end markers, and the numbers are in the Drive sheet. Opening a drive from Recents does the same, and Back returns to Recents.

Every Recents row carries a snapshot of the route taken (`components/RouteSnapshot.tsx`): the stored GPS path, drawn north-up on the phone. It needs no network and the route is never sent anywhere to be rendered.

## Starting Track mode

The pill sits where a start button would. Two ways in, and nothing else starts a drive:

- **Press and hold** the pill for 2 seconds (it fills as you hold). A quick tap only shows a hint; with a screen reader on, a tap starts it.
- **Just drive.** While the map is open and idle, the app watches GPS speed. Three fixes in a row at or above **10 km/h** (or five seconds above it) start Track mode by itself, the *auto-latch*.

After any drive starts, the latch stays disarmed until the phone has actually stopped again (three slow fixes or five seconds), so stopping a drive at speed, or coming back to the map mid-drive, never restarts it. Stale fixes (older than 6 s), replayed timestamps, fixes worse than 50 m and long gaps between fixes are ignored. Constants live in `src/services/tracking/autoLatch.ts`; the hold length is `HOLD_TO_TRACK_MS` in `src/journey/controls/ModePill.tsx`.

The idle GPS watch runs only while the map is focused, the app is in the foreground and location is allowed, and it records nothing.

## What is recorded

Only GPS position and motion sensors, only while Track mode is on.

- **GPS** — `expo-location`, best-for-navigation accuracy. Fixes worse than 50 m, impossible jumps and stationary jitter are discarded; gaps and weak fixes are counted.
- **Motion** — `expo-sensors` accelerometer + gyroscope at 10 Hz feed a multi-feature jolt detector (peak, jerk, duration, cooldown) that counts bumps and their severity.

Code: `src/services/{location,motion,tracking}`. The pure parts (`driveRecorder`, `joltDetector`, `autoLatch`) are unit-tested. The map chrome lives in `src/journey/`.

## Run

This app uses native Mapbox, so it **cannot run in Expo Go** — use a development build.

```bash
cp .env.example .env                  # fill in the public tokens (EXPO_PUBLIC_MAPBOX_TOKEN = pk.…)
export RNMAPBOX_MAPS_DOWNLOAD_TOKEN=sk.…   # secret, build-time only
npx expo run:ios                      # or: npx expo run:android
npm start                             # then open the dev build
```

```bash
npm run typecheck
npm test
npx expo-doctor
```

`EXPO_PUBLIC_MAPBOX_TOKEN` is inlined when Metro bundles, so restart it (`npm start -- --clear`) after changing it; no native rebuild is needed. Without it the map shows a notice and tracking still works. Without Supabase variables everything stays on the phone.
