import type { Metadata } from "next";
import { LocationsScreen } from "@/features/locations/components/locations-screen";

export const metadata: Metadata = { title: "المواقع", robots: { index: false, follow: false } };

/** `/dashboard/locations` — M22 (T121): activation screen while the mode is off, else the list. */
export default function LocationsPage() {
  return <LocationsScreen />;
}
