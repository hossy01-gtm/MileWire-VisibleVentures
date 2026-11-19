import data from "./sample-drive.json";
import type { DriveDetail } from "@/lib/types";

/**
 * The drive behind the landing page's charts and screenshots: Driver 1's most
 * recent session in the North Region Drivers demo fleet (16 Nov 2026). It was
 * recorded on a phone, so it follows real roads. GPS coordinates are stripped
 * from the stored copy (the charts only need time, speed and bump markers), so
 * no location data ships to the public page.
 */
export const sampleDrive = (): DriveDetail => data.drive as unknown as DriveDetail;

export const sampleDriverName = data.driverName;
export const sampleFleetName = data.fleetName;

/** Whole-fleet distance per day, 1 to 16 November 2026. */
export const sampleDaily = (): Array<{ day: string; distanceM: number; drives: number }> => data.daily;
