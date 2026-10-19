import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TicketDetail } from "@/features/support/components/tickets-screens";

export const instant = false;

export const metadata: Metadata = { title: "تذكرة دعم", robots: { index: false, follow: false } };

/** `/dashboard/wallet/tickets/[id]` — the full-page twin of the sheet (FR-32.06). */
export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <TicketDetail id={Number(id)} />;
}
