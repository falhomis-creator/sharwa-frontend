import type { Metadata } from "next";
import { FeedsScreen } from "@/features/dropshipping/components/feeds-screen";

export const metadata: Metadata = { title: "الملفات والموجزات", robots: { index: false, follow: false } };

/** `/dashboard/channels/dropshipping/feeds` — M29 (T161). */
export default function Page() {
  return <FeedsScreen />;
}
