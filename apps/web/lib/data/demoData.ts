import { haversineM, poseAt } from "../geo";
import type { Assignment, DriveDetail, Fleet, JoltMark, Member, MotionPoint, PathPoint, Vehicle } from "../types";

/** Deterministic PRNG so demo data is stable across reloads. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Wp = [lat: number, lon: number];
const ROUTES: Record<string, Wp[]> = {
  waterfront: [[43.6453, -79.3806], [43.6425, -79.383], [43.6395, -79.392], [43.6365, -79.401], [43.634, -79.412], [43.6332, -79.4186]],
  yonge: [[43.6453, -79.3806], [43.654, -79.38], [43.662, -79.383], [43.67, -79.387], [43.679, -79.39], [43.688, -79.393]],
  east: [[43.6532, -79.3832], [43.66, -79.36], [43.665, -79.34], [43.67, -79.32], [43.676, -79.3]],
  midtown: [[43.7, -79.4], [43.7, -79.38], [43.705, -79.36], [43.71, -79.34], [43.714, -79.32]],
};

/** Build a timed path along waypoints: ~25 m vertices, smooth speed profile, one stop. */
export function buildPath(route: Wp[], startMs: number, cruiseMps: number, rand: () => number): PathPoint[] {
  const dense: Wp[] = [];
  for (let i = 0; i < route.length - 1; i++) {
    const [aLat, aLon] = route[i];
    const [bLat, bLon] = route[i + 1];
    const steps = Math.max(2, Math.round(haversineM(aLat, aLon, bLat, bLon) / 25));
    for (let s = 0; s < steps; s++) dense.push([aLat + ((bLat - aLat) * s) / steps, aLon + ((bLon - aLon) * s) / steps]);
  }
  dense.push(route[route.length - 1]);
  const stopAt = Math.floor(dense.length * (0.35 + rand() * 0.3));
  const out: PathPoint[] = [];
  let t = startMs;
  for (let i = 0; i < dense.length; i++) {
    const ramp = Math.min(1, i / 6, (dense.length - 1 - i) / 6 + 0.15);
    const nearStop = Math.abs(i - stopAt) < 3;
    const speed = nearStop ? 0.4 : Math.max(1.5, cruiseMps * (0.7 + 0.3 * Math.sin(i / 5)) * ramp);
    out.push([dense[i][0], dense[i][1], t, speed]);
    if (i < dense.length - 1) {
      const d = haversineM(dense[i][0], dense[i][1], dense[i + 1][0], dense[i + 1][1]);
      t += Math.round((d / Math.max(speed, 0.8)) * 1000) + (i === stopAt ? 18_000 : 0);
    }
  }
  return out;
}

/** Motion buckets ~every 2 s: a quiet noise floor, bumps at the jolt times, gyro up in turns. */
export function buildMotion(path: PathPoint[], jolts: JoltMark[], rand: () => number): MotionPoint[] {
  const out: MotionPoint[] = [];
  const t0 = path[0][2];
  const t1 = path[path.length - 1][2];
  for (let t = t0; t <= t1; t += 2000) {
    const hit = jolts.find((j) => j.t >= t && j.t < t + 2000);
    const turning = rand() < 0.15 ? 0.5 + rand() : 0;
    out.push([t, Math.round((hit ? hit.peakDev : 0.04 + rand() * 0.14) * 1000) / 1000, Math.round((0.05 + rand() * 0.25 + turning) * 1000) / 1000]);
  }
  return out;
}

export const DEMO_USER = { id: "demo-manager", email: "demo@milewire.app" };

export const DEMO_FLEET: Fleet = { id: "demo-fleet", name: "Acme Couriers", joinCode: "K7QM2X", createdAt: Date.UTC(2026, 9, 1) };

export const DEMO_MEMBERS: Member[] = [
  { userId: "drv-dana", displayName: "Dana Reyes", joinedAt: Date.UTC(2026, 9, 2) },
  { userId: "drv-omar", displayName: "Omar Haddad", joinedAt: Date.UTC(2026, 9, 2) },
  { userId: "drv-priya", displayName: "Priya Nair", joinedAt: Date.UTC(2026, 9, 5) },
  { userId: "drv-lee", displayName: "Lee Chen", joinedAt: Date.UTC(2026, 9, 9) },
];

export const DEMO_VEHICLES: Vehicle[] = [
  { id: "veh-12", fleetId: DEMO_FLEET.id, label: "Van 12", licensePlate: "CMJK 482", baselineOdometerKm: 48210.5, baselineEffectiveAt: Date.UTC(2026, 9, 1) },
  { id: "veh-7", fleetId: DEMO_FLEET.id, label: "Hatchback 7", licensePlate: "BXZA 119", baselineOdometerKm: 12874.0, baselineEffectiveAt: Date.UTC(2026, 9, 1) },
  { id: "veh-3", fleetId: DEMO_FLEET.id, label: "Truck 3", licensePlate: null, baselineOdometerKm: 90312.3, baselineEffectiveAt: Date.UTC(2026, 9, 1) },
];

/** "Now" for the demo is real time; seed history relative to the current day. */
export function buildDemoDrives(now: number): DriveDetail[] {
  const rand = mulberry32(20261111);
  const routes = Object.values(ROUTES);
  const drives: DriveDetail[] = [];
  const day = 86_400_000;
  const startOfToday = new Date(new Date(now).setHours(0, 0, 0, 0)).getTime();
  let n = 0;
  for (let d = 0; d < 45; d++) {
    for (const m of DEMO_MEMBERS) {
      if (rand() < 0.45) continue;
      const route = routes[Math.floor(rand() * routes.length)];
      const forward = rand() > 0.5;
      const wp = forward ? route : [...route].reverse();
      const start = startOfToday - d * day + (7 + Math.floor(rand() * 11)) * 3_600_000 + Math.floor(rand() * 50) * 60_000;
      if (start > now - 20 * 60_000) continue;
      const path = buildPath(wp, start, 9 + rand() * 7, rand);
      let dist = 0, max = 0, moving = 0;
      for (let i = 1; i < path.length; i++) {
        dist += haversineM(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1]);
        max = Math.max(max, path[i][3]);
        if (path[i][3] >= 1) moving += path[i][2] - path[i - 1][2];
      }
      const end = path[path.length - 1][2];
      const joltN = Math.floor(rand() * 9);
      const jolts: JoltMark[] = Array.from({ length: joltN }, () => {
        const p = path[Math.floor(rand() * path.length)];
        const peak = 0.3 + rand() * 0.45;
        return { t: p[2], lat: p[0], lon: p[1], peakDev: peak, severity: peak >= 0.6 ? "high" : peak >= 0.4 ? "medium" : "low" };
      });
      drives.push({
        id: `demo-drive-${++n}`,
        userId: m.userId,
        fleetId: DEMO_FLEET.id,
        startedAt: start,
        endedAt: end,
        distanceM: Math.round(dist),
        durationMs: end - start,
        movingMs: moving,
        maxSpeedMps: max,
        avgSpeedMps: moving > 0 ? dist / (moving / 1000) : 0,
        joltCount: joltN,
        gpsSamples: path.length,
        gpsPoorSamples: Math.floor(rand() * 3),
        gpsGaps: Math.floor(rand() * 2),
        path,
        jolts,
        motion: buildMotion(path, jolts, rand),
      });
    }
  }
  return drives.sort((a, b) => b.startedAt - a.startedAt);
}

export function buildDemoAssignments(now: number): Assignment[] {
  const day = 86_400_000;
  return [
    { id: "as-1", fleetId: DEMO_FLEET.id, vehicleId: "veh-12", userId: "drv-dana", assignedAt: now - 30 * day, unassignedAt: now - 12 * day },
    { id: "as-2", fleetId: DEMO_FLEET.id, vehicleId: "veh-12", userId: "drv-omar", assignedAt: now - 12 * day, unassignedAt: null },
    { id: "as-3", fleetId: DEMO_FLEET.id, vehicleId: "veh-7", userId: "drv-priya", assignedAt: now - 30 * day, unassignedAt: null },
  ];
}

/** Two drivers "live": they loop forever along a route, positioned from the wall clock. */
const LIVE_LOOPS = [
  { userId: "drv-dana", route: ROUTES.waterfront, offsetS: 0 },
  { userId: "drv-priya", route: ROUTES.yonge, offsetS: 70 },
];
const LIVE_PATHS = LIVE_LOOPS.map((l) => ({ ...l, path: buildPath(l.route, 0, 11, mulberry32(7)) }));

export function demoLivePositions(now: number) {
  return LIVE_PATHS.flatMap((l) => {
    const span = l.path[l.path.length - 1][2];
    const t = ((now / 1000 + l.offsetS) * 1000) % (span * 2);
    // Ping-pong so the car turns around at the end of the route instead of teleporting.
    const tt = t <= span ? t : span * 2 - t;
    const pose = poseAt(l.path, tt);
    if (!pose) return [];
    const heading = pose.headingDeg == null ? null : t <= span ? pose.headingDeg : (pose.headingDeg + 180) % 360;
    return [{ userId: l.userId, lat: pose.lat, lon: pose.lon, heading, speedMps: pose.speedMps, accuracyM: 6, sessionId: `live-${l.userId}`, updatedAt: now - 2000 }];
  });
}
