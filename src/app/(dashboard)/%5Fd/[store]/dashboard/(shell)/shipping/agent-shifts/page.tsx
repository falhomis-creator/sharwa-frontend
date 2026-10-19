import type { Metadata } from "next";
import { AgentShiftsScreen } from "@/features/shipping/sharwa-ship/components/ops-screens";

export const metadata: Metadata = { title: "مناوبات المندوبين", robots: { index: false, follow: false } };

/** `/dashboard/shipping/agent-shifts` — M39 §6 (T179). */
export default function Page() {
  return <AgentShiftsScreen />;
}
