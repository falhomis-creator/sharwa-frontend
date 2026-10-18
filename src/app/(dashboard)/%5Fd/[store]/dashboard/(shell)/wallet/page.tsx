import type { Metadata } from "next";
import { WalletScreen } from "@/features/payments/components/wallet-screen";

export const metadata: Metadata = { title: "محفظة المتجر", robots: { index: false, follow: false } };

/** `/dashboard/wallet` — M14 (T106). Data is client-fetched through the BFF; owner only. */
export default function Page() {
  return <WalletScreen />;
}
