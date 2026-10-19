import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SessionPage } from "@/features/support/components/sessions-screens";

export const instant = false;

export const metadata: Metadata = { title: "جلسة دعم", robots: { index: false, follow: false } };

/** `/dashboard/support/sessions/[id]` — M31 US-31.3/31.4 (T164). */
export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <SessionPage id={Number(id)} />;
}
