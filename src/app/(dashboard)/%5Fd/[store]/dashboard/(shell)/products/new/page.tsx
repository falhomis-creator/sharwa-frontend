import type { Metadata } from "next";
import { ProductEditor } from "@/features/products/components/editor/product-editor";

export const metadata: Metadata = { title: "منتج جديد", robots: { index: false, follow: false } };

/** `/dashboard/products/new` — the full editor without an id (US-04.3, T072). */
export default function NewProductPage() {
  return <ProductEditor productId={null} />;
}
