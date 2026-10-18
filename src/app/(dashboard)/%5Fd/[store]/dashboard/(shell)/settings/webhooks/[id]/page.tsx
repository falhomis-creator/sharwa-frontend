import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WebhookDetailScreen } from "@/features/integrations/components/webhook-detail";

export const instant = false;
export const metadata: Metadata = { title: "نقطة نهاية Webhook", robots: { index: false, follow: false } };

/** `/dashboard/settings/webhooks/[id]` — M19 US-19.3 (T115). */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <WebhookDetailScreen id={Number(id)} />;
}
