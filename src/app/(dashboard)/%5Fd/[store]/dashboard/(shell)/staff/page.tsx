import type { Metadata } from "next";
import { StaffScreen } from "@/features/staff/components/staff-screen";

export const metadata: Metadata = { title: "الموظفون", robots: { index: false, follow: false } };

/** `/dashboard/staff` — M18 US-18.1 (T112). Data is client-fetched through the BFF. */
export default function StaffPage() {
  return <StaffScreen />;
}
