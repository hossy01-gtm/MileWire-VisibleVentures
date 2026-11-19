import type { Metadata } from "next";
import { DriveReplay } from "@/features/fleets/DriveReplay";

export const metadata: Metadata = { title: "Drive replay" };

export default function DrivePage() {
  return <DriveReplay />;
}
