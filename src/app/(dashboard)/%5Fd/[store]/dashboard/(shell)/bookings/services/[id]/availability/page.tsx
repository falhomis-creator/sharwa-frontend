import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccessGate } from "@/components/shared/access-gate";
import { AvailabilityScreen } from "@/features/bookings/components/availability-screen";

/** Blocks on `params` like the shell it renders in (see `(shell)/layout.tsx`). */
export const instant = false;

export const metadata: Metadata = { title: "ساعات التوفر", robots: { index: false, follow: false } };

/** `/dashboard/bookings/services/[id]/availability` — M26 US-26.1 (T152). */
export default async function AvailabilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return (
    <AccessGate feature="bookings">
      <AvailabilityScreen productId={Number(id)} />
    </AccessGate>
  );
}
