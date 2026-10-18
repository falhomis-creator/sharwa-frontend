import type { Metadata } from "next";
import { OrganizationScreen } from "@/features/organization/components/organization-screen";

export const metadata: Metadata = { title: "الماركات", robots: { index: false, follow: false } };

/** `/dashboard/products/brands` — the brands tab of M05 (US-05.3). */
export default function BrandsPage() {
  return <OrganizationScreen defaultTab="brands" />;
}
