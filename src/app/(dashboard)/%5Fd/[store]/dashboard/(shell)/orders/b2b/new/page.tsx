import type { Metadata } from "next";
import { B2bNewScreen } from "@/features/b2b/components/b2b-new-screen";

export const metadata: Metadata = { title: "مسودة جملة جديدة", robots: { index: false, follow: false } };

/** `/dashboard/orders/b2b/new` — M36 US-36.1 (T170). */
export default function Page() {
  return <B2bNewScreen />;
}
