import type { Assignment, DriveDetail, DriveSummary, Fleet, LiveDriver, Member, Vehicle } from "../types";

export type DriveQuery = {
  fleetId: string;
  /** Inclusive epoch-ms bounds; a drive matches if it overlaps the range. */
  from?: number;
  to?: number;
  userId?: string;
  limit?: number;
};

export type VehicleInput = {
  label: string;
  licensePlate: string | null;
  baselineOdometerKm: number;
};

/** Everything the console reads or writes. One implementation per backend. */
export interface FleetRepository {
  listFleets(): Promise<Fleet[]>;
  createFleet(name: string): Promise<Fleet>;
  deleteFleet(fleetId: string): Promise<void>;

  listMembers(fleetId: string): Promise<Member[]>;
  removeMember(fleetId: string, userId: string): Promise<void>;

  /** Drivers whose position is fresh (see LIVE_FRESH_MS). */
  listLive(fleetId: string): Promise<LiveDriver[]>;

  listDrives(query: DriveQuery): Promise<DriveSummary[]>;
  getDrive(driveId: string): Promise<DriveDetail | null>;

  listVehicles(fleetId: string): Promise<Vehicle[]>;
  createVehicle(fleetId: string, input: VehicleInput): Promise<Vehicle>;
  updateVehicle(vehicleId: string, input: VehicleInput): Promise<Vehicle>;
  deleteVehicle(vehicleId: string): Promise<void>;

  /** Every assignment window, current and past. */
  listAssignments(fleetId: string): Promise<Assignment[]>;
  /** Ends any current window for the vehicle or the driver, then opens a new one. */
  assignVehicle(fleetId: string, vehicleId: string, userId: string): Promise<void>;
  unassignVehicle(vehicleId: string): Promise<void>;
}
