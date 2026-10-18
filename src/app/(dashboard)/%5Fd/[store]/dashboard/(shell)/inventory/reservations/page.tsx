import type { Metadata } from "next";
import { ReservationsScreen } from "@/features/inventory/components/reservations-screen";

export const metadata: Metadata = { title: "الحجوزات", robots: { index: false, follow: false } };

/** `/dashboard/inventory/reservations` — M21 US-21.6 (T118). Data is client-fetched through the BFF. */
export default function InventoryReservationsPage() {
  return <ReservationsScreen />;
}
