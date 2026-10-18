import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionEditor } from "@/features/organization/components/collection-editor";

/** Blocks on `params` like the shell it renders in (see `(shell)/layout.tsx`). */
export const instant = false;

export const metadata: Metadata = { title: "محرّر المجموعة", robots: { index: false, follow: false } };

/** `/dashboard/products/organization/collections/[id]` — M05 US-05.5. */
export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <CollectionEditor collectionId={Number(id)} />;
}
