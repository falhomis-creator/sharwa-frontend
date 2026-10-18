import type { Metadata } from "next";
import { AbandonedCartsScreen } from "@/features/marketing/components/abandoned-carts-screen";

export const metadata: Metadata = { title: "السلات المتروكة", robots: { index: false, follow: false } };

/** `/dashboard/marketing/abandoned-carts` — M13 US-13.3.1 (T103). */
export default function Page() {
  return <AbandonedCartsScreen />;
}
