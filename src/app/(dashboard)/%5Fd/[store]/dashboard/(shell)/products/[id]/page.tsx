import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductEditor } from "@/features/products/components/editor/product-editor";

/** Blocks on `params` like the shell it renders in (see `(shell)/layout.tsx`). */
export const instant = false;

export const metadata: Metadata = { title: "تحرير منتج", robots: { index: false, follow: false } };

/** `/dashboard/products/[id]` — the full editor; `?tab=history` shows the change log (US-04.8). */
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <ProductEditor productId={Number(id)} />;
}
