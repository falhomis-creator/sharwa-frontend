import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReceiptScreen } from "@/features/pos/components/receipts-screen";

export const metadata: Metadata = { title: "إيصال" };

/**
 * `/pos/receipts/[id]` — receipt, print (`?print=1` prints on open), refund with OTP.
 * `params` is read INSIDE the boundary (Cache Components: URL data outside `<Suspense>`
 * blocks the navigation and logs an error).
 */
export default function PosReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <Receipt params={params} />
    </Suspense>
  );
}

async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound();
  return <ReceiptScreen id={n} />;
}
