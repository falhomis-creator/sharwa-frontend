import type { Metadata } from "next";
import { AppsCatalogScreen } from "@/features/apps/components/apps-screens";

export const metadata: Metadata = { title: "متجر التطبيقات", robots: { index: false, follow: false } };

/** `/dashboard/apps` — M30 US-30.1 (T164). */
export default function AppsPage() {
  return <AppsCatalogScreen />;
}
