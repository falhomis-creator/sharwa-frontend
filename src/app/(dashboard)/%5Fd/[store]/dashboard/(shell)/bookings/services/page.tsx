import type { Metadata } from "next";
import { AccessGate } from "@/components/shared/access-gate";
import { ServicesScreen } from "@/features/bookings/components/services-screen";

export const metadata: Metadata = { title: "الخدمات القابلة للحجز", robots: { index: false, follow: false } };

/** `/dashboard/bookings/services` — M26 US-26.1 (T152). */
export default function BookingServicesPage() {
  return (
    <AccessGate feature="bookings">
      <ServicesScreen />
    </AccessGate>
  );
}
