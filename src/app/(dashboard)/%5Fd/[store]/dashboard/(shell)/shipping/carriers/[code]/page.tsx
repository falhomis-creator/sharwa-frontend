import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CarrierScreen } from "@/features/shipping/components/carriers-screen";
import { CARRIER_CODES, type CarrierCode } from "@/features/shipping/schemas";

/** Blocks on `params` like the shell it renders in (see `(shell)/layout.tsx`). */
export const instant = false;

export const metadata: Metadata = { title: "ربط الناقل", robots: { index: false, follow: false } };

/** `/dashboard/shipping/carriers/[code]` — `aramex` · `smsa` (M15 US-15.4). */
export default async function CarrierPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!(CARRIER_CODES as readonly string[]).includes(code)) notFound();
  return <CarrierScreen code={code as CarrierCode} />;
}
