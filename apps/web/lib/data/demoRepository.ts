import { DEMO_FLEET, DEMO_MEMBERS, DEMO_VEHICLES, buildDemoAssignments, buildDemoDrives, demoLivePositions } from "./demoData";
import type { Assignment, DriveSummary, Fleet, LiveDriver, Member, Vehicle } from "../types";
import type { DriveQuery, FleetRepository } from "./repository";

const wait = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 60));

/** In-memory backend for demo mode. State resets on reload. */
function createDemoRepository(): FleetRepository {
  let fleets: Fleet[] = [DEMO_FLEET];
  let members: Member[] = [...DEMO_MEMBERS];
  let vehicles: Vehicle[] = [...DEMO_VEHICLES];
  let assignments: Assignment[] = buildDemoAssignments();
  const drives = buildDemoDrives();
  let seq = 100;

  // Drop the heavy fields the list views never need.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const summary = ({ path, jolts, ...s }: (typeof drives)[number]): DriveSummary => s;

  return {
    listFleets: () => wait([...fleets]),
    async createFleet(name) {
      const f: Fleet = { id: `demo-fleet-${++seq}`, name: name.trim(), joinCode: "DEMO" + String(seq).padStart(2, "0"), createdAt: Date.now() };
      fleets = [f, ...fleets];
      return wait(f);
    },
    async deleteFleet(id) {
      fleets = fleets.filter((f) => f.id !== id);
      await wait(0);
    },

    listMembers: (fleetId) => wait(fleetId === DEMO_FLEET.id ? [...members] : []),
    async removeMember(_fleetId, userId) {
      members = members.filter((m) => m.userId !== userId);
      await wait(0);
    },

    async listLive(fleetId) {
      if (fleetId !== DEMO_FLEET.id) return [];
      const names = new Map(members.map((m) => [m.userId, m.displayName]));
      return demoLivePositions(Date.now())
        .filter((p) => names.has(p.userId))
        .map((p): LiveDriver => ({ ...p, displayName: names.get(p.userId)!, fleetId }));
    },

    async listDrives(q: DriveQuery) {
      if (q.fleetId !== DEMO_FLEET.id) return [];
      return wait(
        drives
          .filter((d) => (q.userId ? d.userId === q.userId : true))
          .filter((d) => (q.to != null ? d.startedAt <= q.to : true))
          .filter((d) => (q.from != null ? (d.endedAt ?? d.startedAt) >= q.from : true))
          .slice(0, q.limit ?? 500)
          .map(summary),
      );
    },
    getDrive: (id) => wait(drives.find((d) => d.id === id) ?? null),

    listVehicles: (fleetId) => wait(vehicles.filter((v) => v.fleetId === fleetId)),
    async createVehicle(fleetId, input) {
      const v: Vehicle = { id: `veh-${++seq}`, fleetId, label: input.label.trim(), licensePlate: input.licensePlate?.trim() || null, baselineOdometerKm: input.baselineOdometerKm, baselineEffectiveAt: Date.now() };
      vehicles = [...vehicles, v];
      return wait(v);
    },
    async updateVehicle(id, input) {
      let updated!: Vehicle;
      vehicles = vehicles.map((v) => (v.id === id ? (updated = { ...v, label: input.label.trim(), licensePlate: input.licensePlate?.trim() || null, baselineOdometerKm: input.baselineOdometerKm }) : v));
      return wait(updated);
    },
    async deleteVehicle(id) {
      vehicles = vehicles.filter((v) => v.id !== id);
      assignments = assignments.filter((a) => a.vehicleId !== id);
      await wait(0);
    },

    listAssignments: (fleetId) => wait(assignments.filter((a) => a.fleetId === fleetId)),
    async assignVehicle(fleetId, vehicleId, userId) {
      const t = Date.now();
      assignments = assignments.map((a) => (a.unassignedAt == null && (a.vehicleId === vehicleId || (a.fleetId === fleetId && a.userId === userId)) ? { ...a, unassignedAt: t } : a));
      assignments = [...assignments, { id: `as-${++seq}`, fleetId, vehicleId, userId, assignedAt: t, unassignedAt: null }];
      await wait(0);
    },
    async unassignVehicle(vehicleId) {
      const t = Date.now();
      assignments = assignments.map((a) => (a.vehicleId === vehicleId && a.unassignedAt == null ? { ...a, unassignedAt: t } : a));
      await wait(0);
    },
  };
}

export const demoRepository = createDemoRepository();
