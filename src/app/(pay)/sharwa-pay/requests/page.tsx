import type { Metadata } from "next";
import { RequestsScreen } from "@/features/sharwa-pay/components/wallet-screens";

export const metadata: Metadata = { title: "طلباتي" };

/** `/sharwa-pay/requests` — M40 (T182). */
export default function Page() {
  return <RequestsScreen />;
}
