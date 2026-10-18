import type { Metadata } from "next";
import { MarketingHub } from "@/features/marketing/components/marketing-hub";

export const metadata: Metadata = { title: "مركز التسويق", robots: { index: false, follow: false } };

/** `/dashboard/marketing` — M13 US-13.1 (T102). */
export default function Page() {
  return <MarketingHub />;
}
