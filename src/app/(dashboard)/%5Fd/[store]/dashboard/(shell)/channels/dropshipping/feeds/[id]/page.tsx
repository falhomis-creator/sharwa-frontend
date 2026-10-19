import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeedDetailScreen } from "@/features/dropshipping/components/feeds-screen";

export const instant = false;
export const metadata: Metadata = { title: "ملف المورد", robots: { index: false, follow: false } };

/** `/dashboard/channels/dropshipping/feeds/[id]` — M29 US-29.4 (T161). */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <FeedDetailScreen feedId={Number(id)} />;
}
