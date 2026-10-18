import type { Metadata } from "next";
import { WalletsScreen } from "@/features/wallets/components/wallets-screen";

export const metadata: Metadata = { title: "محافظ العملاء", robots: { index: false, follow: false } };

/** `/dashboard/customers/wallets` — M35 US-35.1 (T130). Data is client-fetched through the BFF. */
export default function WalletsPage() {
  return <WalletsScreen />;
}
