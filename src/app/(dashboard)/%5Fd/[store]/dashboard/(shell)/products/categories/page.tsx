import type { Metadata } from "next";
import { OrganizationScreen } from "@/features/organization/components/organization-screen";

export const metadata: Metadata = { title: "التصنيفات", robots: { index: false, follow: false } };

/** `/dashboard/products/categories` — the category tree tab of M05 (US-05.1/05.2). */
export default function CategoriesPage() {
  return <OrganizationScreen defaultTab="categories" />;
}
