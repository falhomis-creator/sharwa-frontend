import type { Metadata } from "next";
import { ImportScreen } from "@/features/products/components/import-screen";

export const metadata: Metadata = { title: "استيراد المنتجات", robots: { index: false, follow: false } };

/** `/dashboard/products/import` — three-stage CSV import (US-04.7, FR-04.13). */
export default function Page() {
  return <ImportScreen />;
}
