import type { Metadata } from "next";
import { WalletScreen } from "@/features/platform-admin/components/money/wallet-screen";

export const metadata: Metadata = { title: "محفظة شروة باي" };

export const instant = false;

/** `console.<base>/wallets/<phone>` — M20 US-20.5 a4 (outside `sharwa-pay/` to keep the tree ≤ 7 folders). */
export default async function WalletPage({ params }: { params: Promise<{ phone: string }> }) {
  const { phone } = await params;
  return <WalletScreen phone={decodeURIComponent(phone)} />;
}
