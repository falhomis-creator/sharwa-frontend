import type { Metadata } from "next";
import { PackagingScreen } from "@/features/shipping/components/packaging-screen";

export const metadata: Metadata = { title: "ملفات التغليف", robots: { index: false, follow: false } };

/** `/dashboard/shipping/packaging` — M15 (T109). */
export default function Page() {
  return <PackagingScreen />;
}
