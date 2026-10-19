import type { Metadata } from "next";
import { AccessGate } from "@/components/shared/access-gate";
import { CalendarScreen } from "@/features/bookings/components/calendar-screen";

export const metadata: Metadata = { title: "تقويم الحجوزات", robots: { index: false, follow: false } };

/** `/dashboard/bookings` — M26 US-26.2 (T152). Hidden entirely without the `bookings` feature (FR-26.01). */
export default function BookingsPage() {
  return (
    <AccessGate feature="bookings">
      <CalendarScreen />
    </AccessGate>
  );
}
