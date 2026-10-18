import type { Metadata } from "next";
import { RoutingScreen } from "@/features/locations/components/routing-screen";

export const metadata: Metadata = { title: "قواعد التوجيه", robots: { index: false, follow: false } };

/** `/dashboard/locations/routing` — M22 US-22.5 (T122). */
export default function RoutingPage() {
  return <RoutingScreen />;
}
