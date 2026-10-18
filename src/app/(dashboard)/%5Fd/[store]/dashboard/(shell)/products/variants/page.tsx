import type { Metadata } from "next";
import { VariantDictionary } from "@/features/products/components/variant-dictionary";

export const metadata: Metadata = { title: "نماذج المتغيرات", robots: { index: false, follow: false } };

/** `/dashboard/products/variants` — attribute dictionary (FR-04.10, T073). */
export default function Page() {
  return <VariantDictionary />;
}
