import type { Metadata } from "next";
import { FleetDetail } from "@/features/fleets/FleetDetail";

export const metadata: Metadata = { title: "Fleet" };

export default function FleetPage() {
  return <FleetDetail />;
}
