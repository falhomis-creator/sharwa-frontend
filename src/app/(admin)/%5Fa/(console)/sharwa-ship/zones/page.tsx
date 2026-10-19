import type { Metadata } from "next";
import { ZonesScreen } from "@/features/platform-admin/components/zones/zones-screen";

export const metadata: Metadata = { title: "مناطق شروة شيب" };

/** `console.<base>/sharwa-ship/zones` — M20 US-20.6 a1. */
export default function ZonesPage() {
  return <ZonesScreen />;
}
