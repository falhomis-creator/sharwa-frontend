import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WalletPageScreen } from "@/features/wallets/components/wallet-page-screen";

/** Blocks on `params` like the shell it renders in (see `(shell)/layout.tsx`). */
export const instant = false;

export const metadata: Metadata = { title: "تفاصيل المحفظة", robots: { index: false, follow: false } };

/** `/dashboard/customers/wallets/[id]` — the same detail component as the list's sheet (M35 FR-35.07). */
export default async function WalletPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <WalletPageScreen walletId={Number(id)} />;
}
