import type { Metadata } from "next";
import { DropJobsScreen } from "@/features/dropshipping/components/orders-jobs-screens";

export const metadata: Metadata = { title: "مهام الموردين", robots: { index: false, follow: false } };

/** `/dashboard/channels/dropshipping/jobs` — M29 (T161). */
export default function Page() {
  return <DropJobsScreen />;
}
