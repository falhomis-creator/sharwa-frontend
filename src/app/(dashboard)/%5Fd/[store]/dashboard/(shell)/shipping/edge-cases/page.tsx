import type { Metadata } from "next";
import { EdgeCasesScreen } from "@/features/shipping/components/edge-cases-screen";

export const metadata: Metadata = { title: "الحالات الحدّية", robots: { index: false, follow: false } };

/** `/dashboard/shipping/edge-cases?kind=` — M15 (T109). */
export default function Page() {
  return <EdgeCasesScreen />;
}
