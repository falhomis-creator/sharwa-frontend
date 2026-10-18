import type { Metadata } from "next";
import { RolesScreen } from "@/features/staff/components/roles-screen";

export const metadata: Metadata = { title: "الأدوار والصلاحيات", robots: { index: false, follow: false } };

/** `/dashboard/staff/roles` — M18 US-18.3 (T112). */
export default function RolesPage() {
  return <RolesScreen />;
}
