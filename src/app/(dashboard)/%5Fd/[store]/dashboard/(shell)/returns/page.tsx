import type { Metadata } from "next";
import { ReturnsScreen } from "@/features/returns/components/returns-screen";

export const metadata: Metadata = { title: "المرتجعات", robots: { index: false, follow: false } };

/** `/dashboard/returns` — M24 (T124): ReturnRequest list + `?return=` sheet. */
export default function ReturnsPage() {
  return <ReturnsScreen />;
}
