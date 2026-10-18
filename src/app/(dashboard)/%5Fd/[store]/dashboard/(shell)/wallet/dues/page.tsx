import type { Metadata } from "next";
import { DuesScreen } from "@/features/payments/components/dues-screen";

export const metadata: Metadata = { title: "المستحقات للمنصة", robots: { index: false, follow: false } };

/** `/dashboard/wallet/dues` — M14 (T106). Data is client-fetched through the BFF; owner only. */
export default function Page() {
  return <DuesScreen />;
}
