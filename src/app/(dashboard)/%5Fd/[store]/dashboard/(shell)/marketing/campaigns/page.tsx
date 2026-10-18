import type { Metadata } from "next";
import { CampaignsScreen } from "@/features/marketing/components/campaigns-screen";

export const metadata: Metadata = { title: "الحملات", robots: { index: false, follow: false } };

/** `/dashboard/marketing/campaigns` — M13 US-13.4.1 (T103). */
export default function Page() {
  return <CampaignsScreen />;
}
