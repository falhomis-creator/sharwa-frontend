import type { Metadata } from "next";
import { ProductsScreen } from "@/features/products/components/products-screen";

export const metadata: Metadata = { title: "المنتجات", robots: { index: false, follow: false } };

/** `/dashboard/products` — M04 US-04.1 (T071). Data is client-fetched through the BFF. */
export default function ProductsPage() {
  return <ProductsScreen />;
}
