import type { Metadata } from "next";
import { CategoriesScreen } from "@/features/platform-admin/components/catalog/categories-screen";

export const metadata: Metadata = { title: "فئات السوق" };

/** `console.<base>/market-categories` — M20 US-20.6 a3. */
export default function MarketCategoriesPage() {
  return <CategoriesScreen />;
}
