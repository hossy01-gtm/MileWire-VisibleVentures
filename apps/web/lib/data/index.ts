import { DEMO_MODE } from "../config";
import { demoRepository } from "./demoRepository";
import type { FleetRepository } from "./repository";
import { supabaseRepository } from "./supabaseRepository";

/** The one backend the console talks to. Demo mode swaps in sample data. */
export const repo: FleetRepository = DEMO_MODE ? demoRepository : supabaseRepository;

export type { DriveQuery, FleetRepository, VehicleInput } from "./repository";
