import type { Metadata } from "next";
import { TrackingScreen } from "@/features/integrations/components/tracking-screen";

export const metadata: Metadata = { title: "أدوات التتبع", robots: { index: false, follow: false } };

/** `/dashboard/marketing/tracking` — M19 US-19.2 (T115). */
export default function Page() {
  return <TrackingScreen />;
}
