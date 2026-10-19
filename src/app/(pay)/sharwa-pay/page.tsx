import type { Metadata } from "next";
import { PayHome } from "@/features/sharwa-pay/components/wallet-screens";

export const metadata: Metadata = { title: "محفظتي" };

/** `/sharwa-pay` — M40 (T182). */
export default function Page() {
  return <PayHome />;
}
