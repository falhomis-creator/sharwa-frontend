import type { Metadata } from "next";
import { ZonesScreen } from "@/features/shipping/components/zones-screen";

export const metadata: Metadata = { title: "مناطق شروة شيب", robots: { index: false, follow: false } };

/** `/dashboard/shipping/zones` — M15 (T109). */
export default function Page() {
  return <ZonesScreen />;
}
