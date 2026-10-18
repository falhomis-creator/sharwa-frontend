import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocationScreen } from "@/features/locations/components/location-page";

/** Blocks on `params` like the shell it renders in (see `(shell)/layout.tsx`). */
export const instant = false;

export const metadata: Metadata = { title: "الموقع", robots: { index: false, follow: false } };

/** `/dashboard/locations/[id]?tab=details|inventory|staff` — M22 US-22.3/22.4/22.6. */
export default async function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <LocationScreen id={Number(id)} />;
}
