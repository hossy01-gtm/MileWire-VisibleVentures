import type { Metadata } from "next";
import { FleetsList } from "@/features/fleets/FleetsList";

export const metadata: Metadata = { title: "Fleets" };

export default function FleetsPage() {
  return <FleetsList />;
}
