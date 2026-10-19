import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WhatsappTemplateEditor } from "@/features/apps/components/whatsapp-screens";

export const instant = false;

export const metadata: Metadata = { title: "تحرير قالب الواتساب", robots: { index: false, follow: false } };

/** `/dashboard/apps/whatsapp/templates/[id]` — M30 US-30.3 acceptance 2 (T164). */
export default async function WhatsappTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <WhatsappTemplateEditor id={Number(id)} />;
}
