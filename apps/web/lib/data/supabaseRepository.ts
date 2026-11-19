import { LIVE_FRESH_MS, type Assignment, type DriveDetail, type DriveSummary, type Fleet, type JoltMark, type LiveDriver, type Member, type MotionPoint, type PathPoint, type Vehicle } from "../types";
import { getSupabase } from "../supabase";
import type { DriveQuery, FleetRepository, VehicleInput } from "./repository";

function client() {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  return sb;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- rows come straight from PostgREST */
const ms = (iso: string | null | undefined) => (iso ? Date.parse(iso) : null);
const fleetOf = (r: any): Fleet => ({ id: r.id, name: r.name, joinCode: r.join_code, createdAt: Date.parse(r.created_at) });
const vehicleOf = (r: any): Vehicle => ({
  id: r.id,
  fleetId: r.fleet_id,
  label: r.label,
  licensePlate: r.license_plate,
  baselineOdometerKm: Number(r.baseline_odometer_km),
  baselineEffectiveAt: Date.parse(r.baseline_effective_at),
});
const assignmentOf = (r: any): Assignment => ({
  id: r.id,
  fleetId: r.fleet_id,
  vehicleId: r.vehicle_id,
  userId: r.user_id,
  assignedAt: Date.parse(r.assigned_at),
  unassignedAt: ms(r.unassigned_at),
});
const SUMMARY_COLUMNS =
  "id,user_id,fleet_id,started_at,ended_at,distance_m,duration_ms,moving_ms,max_speed_mps,avg_speed_mps,jolt_count,gps_samples,gps_poor_samples,gps_gaps";
const summaryOf = (r: any): DriveSummary => ({
  id: r.id,
  userId: r.user_id,
  fleetId: r.fleet_id,
  startedAt: Date.parse(r.started_at),
  endedAt: ms(r.ended_at),
  distanceM: r.distance_m,
  durationMs: Number(r.duration_ms),
  movingMs: Number(r.moving_ms),
  maxSpeedMps: r.max_speed_mps,
  avgSpeedMps: r.avg_speed_mps,
  joltCount: r.jolt_count,
  gpsSamples: r.gps_samples,
  gpsPoorSamples: r.gps_poor_samples,
  gpsGaps: r.gps_gaps,
});

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const supabaseRepository: FleetRepository = {
  async listFleets() {
    const rows = check(await client().from("fleets").select("*").order("created_at", { ascending: false }));
    return rows.map(fleetOf);
  },

  async createFleet(name) {
    return fleetOf(check(await client().from("fleets").insert({ name: name.trim() }).select("*").single()));
  },

  async deleteFleet(fleetId) {
    check(await client().from("fleets").delete().eq("id", fleetId));
  },

  async listMembers(fleetId) {
    const rows = check(await client().from("fleet_members").select("*").eq("fleet_id", fleetId).order("joined_at"));
    return rows.map((r: any): Member => ({ userId: r.user_id, displayName: r.display_name, joinedAt: Date.parse(r.joined_at) }));
  },

  async removeMember(fleetId, userId) {
    check(await client().from("fleet_members").delete().eq("fleet_id", fleetId).eq("user_id", userId));
  },

  async listLive(fleetId) {
    const since = new Date(Date.now() - LIVE_FRESH_MS).toISOString();
    const [live, members] = await Promise.all([
      client().from("live_positions").select("*").eq("fleet_id", fleetId).gte("updated_at", since),
      this.listMembers(fleetId),
    ]);
    const names = new Map(members.map((m) => [m.userId, m.displayName]));
    return check(live).map(
      (r: any): LiveDriver => ({
        userId: r.user_id,
        displayName: names.get(r.user_id) ?? "Driver",
        fleetId: r.fleet_id,
        sessionId: r.session_id,
        lat: r.lat,
        lon: r.lon,
        heading: r.heading,
        speedMps: r.speed_mps,
        accuracyM: r.accuracy_m,
        updatedAt: Date.parse(r.updated_at),
      }),
    );
  },

  async listDrives(q: DriveQuery) {
    let query = client().from("drive_sessions").select(SUMMARY_COLUMNS).eq("fleet_id", q.fleetId);
    if (q.userId) query = query.eq("user_id", q.userId);
    if (q.to != null) query = query.lte("started_at", new Date(q.to).toISOString());
    if (q.from != null) query = query.gte("ended_at", new Date(q.from).toISOString());
    const rows = check(await query.order("started_at", { ascending: false }).limit(q.limit ?? 500));
    return rows.map(summaryOf);
  },

  async getDrive(driveId) {
    const res = await client().from("drive_sessions").select(`${SUMMARY_COLUMNS},path,jolts,motion`).eq("id", driveId).maybeSingle();
    const row: any = check(res);
    if (!row) return null;
    return { ...summaryOf(row), path: (row.path ?? []) as PathPoint[], jolts: (row.jolts ?? []) as JoltMark[], motion: (row.motion ?? []) as MotionPoint[] } satisfies DriveDetail;
  },

  async listVehicles(fleetId) {
    return check(await client().from("vehicles").select("*").eq("fleet_id", fleetId).order("created_at")).map(vehicleOf);
  },

  async createVehicle(fleetId, input: VehicleInput) {
    const row = check(
      await client()
        .from("vehicles")
        .insert({ fleet_id: fleetId, label: input.label.trim(), license_plate: input.licensePlate?.trim() || null, baseline_odometer_km: input.baselineOdometerKm })
        .select("*")
        .single(),
    );
    return vehicleOf(row);
  },

  async updateVehicle(vehicleId, input: VehicleInput) {
    const row = check(
      await client()
        .from("vehicles")
        .update({ label: input.label.trim(), license_plate: input.licensePlate?.trim() || null, baseline_odometer_km: input.baselineOdometerKm })
        .eq("id", vehicleId)
        .select("*")
        .single(),
    );
    return vehicleOf(row);
  },

  async deleteVehicle(vehicleId) {
    check(await client().from("vehicles").delete().eq("id", vehicleId));
  },

  async listAssignments(fleetId) {
    return check(await client().from("vehicle_assignments").select("*").eq("fleet_id", fleetId).order("assigned_at")).map(assignmentOf);
  },

  async assignVehicle(fleetId, vehicleId, userId) {
    const sb = client();
    const now = new Date().toISOString();
    // 1:1 while current: close this vehicle's and this driver's open windows first.
    check(await sb.from("vehicle_assignments").update({ unassigned_at: now }).eq("vehicle_id", vehicleId).is("unassigned_at", null));
    check(await sb.from("vehicle_assignments").update({ unassigned_at: now }).eq("fleet_id", fleetId).eq("user_id", userId).is("unassigned_at", null));
    check(await sb.from("vehicle_assignments").insert({ fleet_id: fleetId, vehicle_id: vehicleId, user_id: userId, assigned_at: now }));
  },

  async unassignVehicle(vehicleId) {
    check(await client().from("vehicle_assignments").update({ unassigned_at: new Date().toISOString() }).eq("vehicle_id", vehicleId).is("unassigned_at", null));
  },
};
