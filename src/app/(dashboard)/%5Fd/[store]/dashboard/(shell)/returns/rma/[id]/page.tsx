import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RmaPage } from "@/features/returns/components/rma-page";

/** Blocks on `params` like the shell it renders in (see `(shell)/layout.tsx`). */
export const instant = false;

export const metadata: Metadata = { title: "تفاصيل RMA", robots: { index: false, follow: false } };

/** `/dashboard/returns/rma/[id]` — M24 (T124): the 7-step path, events and the QA decision. */
export default async function RmaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <RmaPage rmaId={Number(id)} />;
}
