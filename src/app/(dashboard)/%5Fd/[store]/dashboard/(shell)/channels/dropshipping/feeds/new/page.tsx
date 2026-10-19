import type { Metadata } from "next";
import { FeedWizardScreen } from "@/features/dropshipping/components/feeds-screen";

export const metadata: Metadata = { title: "ملف جديد", robots: { index: false, follow: false } };

/** `/dashboard/channels/dropshipping/feeds/new?step=1..4` — M29 (T161). */
export default function Page() {
  return <FeedWizardScreen />;
}
