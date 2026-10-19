import type { Metadata } from "next";
import { TopupScreen } from "@/features/sharwa-pay/components/forms";

export const metadata: Metadata = { title: "شحن المحفظة" };

/** `/sharwa-pay/topup` — M40 (T182). */
export default function Page() {
  return <TopupScreen />;
}
