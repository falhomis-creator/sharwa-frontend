import type { Metadata } from "next";
import { OrganizationScreen } from "@/features/organization/components/organization-screen";

export const metadata: Metadata = { title: "التنظيم والاكتشاف", robots: { index: false, follow: false } };

/** `/dashboard/products/organization?tab=tags|badges|collections|…` — M05 (T074). */
export default function OrganizationPage() {
  return <OrganizationScreen defaultTab="tags" />;
}
