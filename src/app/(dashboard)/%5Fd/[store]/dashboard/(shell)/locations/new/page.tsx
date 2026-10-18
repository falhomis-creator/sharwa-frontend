import type { Metadata } from "next";
import { NewLocationScreen } from "@/features/locations/components/location-page";

export const metadata: Metadata = { title: "موقع جديد", robots: { index: false, follow: false } };

/** `/dashboard/locations/new` — M22 US-22.3, owner only. */
export default function NewLocationPage() {
  return <NewLocationScreen />;
}
