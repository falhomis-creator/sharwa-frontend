import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GatewayPageScreen } from "@/features/payments/components/gateway-form";

/** Blocks on `params` like the shell it renders in (see `(shell)/layout.tsx`). */
export const instant = false;

export const metadata: Metadata = { title: "بيانات اعتماد البوابة", robots: { index: false, follow: false } };

/** `/dashboard/payments/gateways/[code]` — the same form as the overview's sheet, as a full page (M14 §6 الجوال). */
export default async function GatewayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^[a-z0-9_-]{2,40}$/.test(code)) notFound();
  return <GatewayPageScreen code={code} />;
}
