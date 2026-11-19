# GPS simulation (dev only)

Plays a recorded GPX drive through the app as if it were the phone's GPS, so
Track mode, the auto-latch and the recorder can be exercised without driving.

## Turn it on (no panel needed)

1. Copy `src/services/testing/templates/testing.developer.json` to
   `apps/mobile/config/testing.developer.json` (gitignored) and set `"enabled": true`
   and an `objective` (a `name` in `test-assets/developer/manifest.json`).
2. Start the dev client (`npm run dev:mobile`). Open the map: the idle GPS watcher
   subscribes, the simulated drive starts moving, the auto-latch fires at ~10 km/h
   and Track mode records it. Stopping Track ends the recording; the sim keeps going.

`enabled` must be exactly `true`; otherwise every other field is ignored. Nothing
runs outside `__DEV__`, so release builds are unaffected. Location permission is
still required (the tracking session asks for it as usual).

## Config (`config/testing.developer.json`)

| Key | Meaning |
| --- | --- |
| `enabled` | Master switch. |
| `objective` | Manifest objective to play; empty = first of `objectives`, else first manifest entry. |
| `objectives` | Allow-list for a dev panel's picker. |
| `autoPlay` | Default `true`: start as soon as something listens for GPS. `false` = load paused; call `useDevSimulationStore.getState().play()`. |
| `showDevSettings` | For a future dev panel to read. Simulation never depends on it. |
| `devTestValues` | `simulationIntervalMs` (1000), `simulationSpeedMps` (20), `simulationAccelMps2` (3). |

## How it plugs in

`locationService.ts` is the only integration point: `watchIdleFixes`, `watchFixes`
and `getCurrentFix` ask `runtime.ts` for simulated GPS first and fall back to
`expo-location` when it is off or fails to load.

- `testConfigLoader.ts` parses the config (static `require`; `metro.config.js` swaps in the tracked template when the local file is missing).
- `testingManager.ts` loads the objective's GPX into the fake GPS; `selectObjective` switches.
- `simulatedGps.ts` is the fake chip: one clock, shared by every subscriber, only ticks while someone listens, holds at the end with speed 0.
- `routePlayback.ts` walks the polyline: accelerates from rest, cruises, brakes to a stop at the end (so waypoint spacing never makes teleport-speed fixes).
- `devSimulationStore.ts` (zustand, exported as `useDevSimulationStore`) is what a panel would bind to: `status`, `progress`, `play/pause/toggle/rewind/selectObjective`.
- `fileMap.ts` registers every GPX with a static `require()` (Metro cannot do dynamic paths).

## Adding a GPX

Drop it in `test-assets/developer/gpx-files/`, add a line to `fileMap.ts`, add an
entry to `manifest.json`. `testAssets.test.ts` fails if the three drift apart.

## Known limits

- The blue location puck on the Mapbox map is drawn from the real device location, not the simulation. The live track line follows the simulation (it is drawn from the recorded path).
