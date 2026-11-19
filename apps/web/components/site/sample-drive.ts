import { buildDemoDrives } from "@/lib/data/demoData";

/**
 * The sample drive shown on the landing page. It is the same drive as in the
 * 3D replay screenshots (Dana Reyes, 1 November), so the numbers on the page
 * agree with the picture. Falls back to the first sample drive if it ever moves.
 */
export function sampleDrive() {
  const drives = buildDemoDrives();
  return drives.find((d) => d.id === "demo-drive-1") ?? drives[0];
}
