import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { normalizeCustomerPhone } from "@/features/customers/schemas";
import { CustomerPage } from "@/features/customers/components/customer-page";

/** Blocks on `params` like the shell it renders in (see `(shell)/layout.tsx`). */
export const instant = false;

export const metadata: Metadata = { title: "ملف العميل", robots: { index: false, follow: false } };

/** `/dashboard/customers/[phone]` — the full profile (FR-07.05), same component as the sheet. */
export default async function CustomerProfilePage({ params }: { params: Promise<{ phone: string }> }) {
  const { phone } = await params;
  const normalized = normalizeCustomerPhone(decodeURIComponent(phone));
  if (normalized.length < 11 || normalized.length > 15) notFound();
  return <CustomerPage phone={normalized} />;
}
