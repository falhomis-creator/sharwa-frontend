import type { Metadata } from "next";
import { OfflineState } from "@/features/sharwa-pay/components/pay-shell";

export const metadata: Metadata = { title: "لا اتصال" };

/** `/sharwa-pay/offline` — M40 §6: no balance is ever shown from a cache. */
export default function Page() {
  return <OfflineState />;
}
