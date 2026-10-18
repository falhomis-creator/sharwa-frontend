import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CampaignFormScreen } from "@/features/marketing/components/campaign-form";

export const instant = false;
export const metadata: Metadata = { title: "الحملة", robots: { index: false, follow: false } };

/** `/dashboard/marketing/campaigns/[id]` — M13 US-13.4.1 (T103). */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <CampaignFormScreen id={Number(id)} />;
}
