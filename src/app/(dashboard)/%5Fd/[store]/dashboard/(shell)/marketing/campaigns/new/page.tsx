import type { Metadata } from "next";
import { CampaignFormScreen } from "@/features/marketing/components/campaign-form";

export const metadata: Metadata = { title: "حملة جديدة", robots: { index: false, follow: false } };

/** `/dashboard/marketing/campaigns/new?segment=&product_id=` — M13 US-13.4.1 (T103); the query is read client-side (nuqs). */
export default function Page() {
  return <CampaignFormScreen id={null} />;
}
