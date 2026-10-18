import type { Metadata } from "next";
import { TemplatesScreen } from "@/features/products/components/templates-screen";

export const metadata: Metadata = { title: "نماذج المنتجات", robots: { index: false, follow: false } };

/** `/dashboard/products/templates` — merchant blueprints (US-04.6, T073). */
export default function Page() {
  return <TemplatesScreen />;
}
