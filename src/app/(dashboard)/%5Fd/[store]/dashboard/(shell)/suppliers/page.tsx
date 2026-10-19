import type { Metadata } from "next";
import { SuppliersScreen } from "@/features/procurement/components/suppliers-screen";

export const metadata: Metadata = { title: "الموردون", robots: { index: false, follow: false } };

/** `/dashboard/suppliers` — M23 US-23.1 (T149). */
export default function SuppliersPage() {
  return <SuppliersScreen />;
}
