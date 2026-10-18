import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReturnPage } from "@/features/returns/components/return-page";

/** Blocks on `params` like the shell it renders in (see `(shell)/layout.tsx`). */
export const instant = false;

export const metadata: Metadata = { title: "تفاصيل الإرجاع", robots: { index: false, follow: false } };

/** `/dashboard/returns/[id]` — M24 (T124): the same detail as the list's sheet. */
export default async function ReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <ReturnPage returnId={Number(id)} />;
}
