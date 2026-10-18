import type { Metadata } from "next";
import { notFound } from "next/navigation";

/** Blocks on `params` like the shell it renders in (see `(shell)/layout.tsx`). */
export const instant = false;

export const metadata: Metadata = { title: "تحرير قسم — تصميم المتجر", robots: { index: false, follow: false } };

/**
 * `/dashboard/design/sections/[id]` — the section editor panel; the editor itself is mounted by
 * `design/layout.tsx` and reads the id from the URL. Negative ids are draft rows not yet published.
 */
export default async function DesignSectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^-?\d+$/.test(id)) notFound();
  return null;
}
