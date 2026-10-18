import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { RoleFormScreen } from "@/features/staff/components/role-form";

/** Blocks on `params` like the shell it renders in (see `(shell)/layout.tsx`). */
export const instant = false;

export const metadata: Metadata = { title: "الدور", robots: { index: false, follow: false } };

/** `/dashboard/staff/roles/[id]` — M18 US-18.3 (T112): read-only for system roles. */
export default async function RolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return (
    <Suspense>
      <RoleFormScreen id={Number(id)} />
    </Suspense>
  );
}
