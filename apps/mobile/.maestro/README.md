# Maestro flows for the MileWire mobile app

Black-box journey tests that drive the real app in the iOS simulator.

## Before you run
1. A development build installed on the simulator (`npx expo run:ios`).
2. One Metro server running: `npm start` from `apps/mobile` (restart with `-- --clear` after any `.env` change,
   because `EXPO_PUBLIC_*` values are baked in when Metro bundles).
3. `config/testing.developer.json` with `"enabled": true` (local, gitignored). It feeds the app a simulated drive,
   so Track mode moves without real GPS. The simulator has no motion sensor, so bump counts are always 0 and are
   never asserted.

## Run
```bash
maestro --device <simulator-udid> test .maestro            # default suite: offline, writes nothing to Supabase
maestro --device <simulator-udid> test .maestro/flows/04-record-a-drive.yaml
maestro --device <simulator-udid> test .maestro --include-tags network      # also hits Supabase (anonymous user)
maestro --device <simulator-udid> test .maestro/flows/13-fleet-join-and-leave.yaml \
  -e JOIN_CODE=XXXXXX -e FLEET_NAME="Your Test Fleet"                        # joins a REAL fleet: use a throwaway one
```
`--device` is needed when more than one simulator or emulator is connected (`xcrun simctl list devices booted`).
Another Metro: `-e METRO_URL=http%3A%2F%2Flocalhost%3A8082`.

## Journeys
| Flow | Journey |
| --- | --- |
| 01 first launch | map, rail, Track pill with location allowed |
| 02 location denied | "Turn on location" card, no pill, Settings shows Off |
| 03 track pill tap | a quick tap never starts a drive |
| 04 record a drive | hold to start, live dock, Keep going, Stop, review |
| 05 recents | empty state, list, open, Back, delete (long press) |
| 06 delete from drive sheet | delete a just-finished drive |
| 07 settings | units, clear all (Cancel/Clear), About |
| 08 sheet navigation | rail toggle, switching, Fleet back/close, drag to full, flick closed |
| 09 survives relaunch | drives and unit choice survive a cold start |
| 10 interrupted drive | app killed mid-drive: drive is sealed and listed |
| 11 fleet form | join form validation and code normalisation |
| 12 invalid code (`network`) | wrong code gives "No fleet matches that code." |
| 13 join and leave (`fleet-write`) | join, drive, drive shared, leave |

## Things learned the hard way
- Maestro 2.7.0 on iOS takes `inuse`/`never` for location permission, not `allow`/`deny`.
- Pressables expose one merged label (`Location, Off — open Settings`, `Distance: 0.5 km`), so match with `.*`.
- The Track pill's subtitle is not in the accessibility tree; assert behaviour instead of its text.
- After the long-press that starts a drive, the first touch is swallowed; `subflows/start-drive.yaml` taps empty map once.
- Sheets sit at a peek height: scroll with `subflows/scroll-sheet-down.yaml`, and never tap right after a scroll.
- The dev client opens with `__expo_disable_*` flags so its Tools button and menu do not cover the map controls.
