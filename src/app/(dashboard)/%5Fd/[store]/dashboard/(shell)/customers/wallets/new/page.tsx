import type { Metadata } from "next";
import { NewWalletScreen } from "@/features/wallets/components/new-wallet-screen";

export const metadata: Metadata = { title: "محفظة جديدة", robots: { index: false, follow: false } };

/** `/dashboard/customers/wallets/new` — M35 US-35.2 (T130). */
export default function NewWalletPage() {
  return <NewWalletScreen />;
}
