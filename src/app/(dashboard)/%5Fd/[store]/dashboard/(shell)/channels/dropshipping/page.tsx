import type { Metadata } from "next";
import { DropshippingHubScreen } from "@/features/dropshipping/components/hub-screen";

export const metadata: Metadata = { title: "الدروبشيبينغ", robots: { index: false, follow: false } };

/** `/dashboard/channels/dropshipping` — M29 (T161). */
export default function Page() {
  return <DropshippingHubScreen />;
}
