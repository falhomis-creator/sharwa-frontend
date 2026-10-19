import type { Metadata } from "next";
import { TopupsScreen } from "@/features/platform-admin/components/money/topups-screen";

export const metadata: Metadata = { title: "طلبات شحن شروة باي" };

/** `console.<base>/sharwa-pay/topups` — M20 US-20.5 a1/a3. */
export default function TopupsPage() {
  return <TopupsScreen />;
}
