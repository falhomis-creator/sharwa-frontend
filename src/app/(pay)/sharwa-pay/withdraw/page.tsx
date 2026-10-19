import type { Metadata } from "next";
import { WithdrawScreen } from "@/features/sharwa-pay/components/forms";

export const metadata: Metadata = { title: "سحب" };

/** `/sharwa-pay/withdraw` — M40 (T182). */
export default function Page() {
  return <WithdrawScreen />;
}
