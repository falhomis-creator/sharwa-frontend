import type { Metadata } from "next";
import { PartnersScreen } from "@/features/affiliates/components/partners-screen";

export const metadata: Metadata = { title: "المؤثرون", robots: { index: false, follow: false } };

/** `/dashboard/marketing/influencers` — M17 US-17.1/17.3 (T146): the influencers tab of the one partners table. */
export default function Page() {
  return <PartnersScreen defaultKind="influencers" />;
}
