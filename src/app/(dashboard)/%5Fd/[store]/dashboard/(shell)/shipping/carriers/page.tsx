import type { Metadata } from "next";
import { CarriersScreen } from "@/features/shipping/components/carriers-screen";

export const metadata: Metadata = { title: "الناقلون الخارجيون", robots: { index: false, follow: false } };

/** `/dashboard/shipping/carriers` — M15 (T109). */
export default function Page() {
  return <CarriersScreen />;
}
