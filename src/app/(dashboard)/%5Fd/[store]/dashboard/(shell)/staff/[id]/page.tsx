import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StaffDetailScreen } from "@/features/staff/components/staff-detail";

/** Blocks on `params` like the shell it renders in (see `(shell)/layout.tsx`). */
export const instant = false;

export const metadata: Metadata = { title: "الموظف", robots: { index: false, follow: false } };

/** `/dashboard/staff/[id]` — M18 US-18.2/18.4 (T112): assignments, overrides, sessions, roster. */
export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <StaffDetailScreen id={Number(id)} />;
}
