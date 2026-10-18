import type { Metadata } from "next";
import { ProvidersScreen } from "@/features/shipping/components/providers-screen";

export const metadata: Metadata = { title: "المندوبون وشركات الشحن", robots: { index: false, follow: false } };

/** `/dashboard/shipping/providers?tab=agents|companies` — M15 (T109). */
export default function Page() {
  return <ProvidersScreen />;
}
