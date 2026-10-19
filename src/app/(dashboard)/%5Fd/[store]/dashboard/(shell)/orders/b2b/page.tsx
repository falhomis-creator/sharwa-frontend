import type { Metadata } from "next";
import { B2bDraftsScreen } from "@/features/b2b/components/b2b-drafts-screen";

export const metadata: Metadata = { title: "مسودات الجملة", robots: { index: false, follow: false } };

/** `/dashboard/orders/b2b` — M36 US-36.2 (T170): pending wholesale drafts and their decision. */
export default function Page() {
  return <B2bDraftsScreen />;
}
