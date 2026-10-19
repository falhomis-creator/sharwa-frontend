import type { Metadata } from "next";
import { SupplierOrdersScreen } from "@/features/dropshipping/components/orders-jobs-screens";

export const metadata: Metadata = { title: "طلبات الموردين", robots: { index: false, follow: false } };

/** `/dashboard/channels/dropshipping/orders` — M29 (T161). */
export default function Page() {
  return <SupplierOrdersScreen />;
}
