import type { Metadata } from "next";
import { LiveFocus } from "@/features/focus/LiveFocus";

export const metadata: Metadata = { title: "Live focus" };

export default function FocusPage() {
  return <LiveFocus />;
}
