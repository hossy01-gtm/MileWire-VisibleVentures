import type { Metadata } from "next";
import { LiveMapView } from "@/features/map/LiveMapView";

export const metadata: Metadata = { title: "Map" };

export default function MapPage() {
  return <LiveMapView />;
}
