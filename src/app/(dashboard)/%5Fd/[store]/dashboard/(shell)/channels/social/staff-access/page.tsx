import type { Metadata } from "next";
import { StaffAccessScreen } from "@/features/channels/components/mapping-access";

export const metadata: Metadata = { title: "وصول الموظفين للقنوات", robots: { index: false, follow: false } };

/** `/dashboard/channels/social/staff-access` — M27 US-27.6 (T155). */
export default function StaffAccessPage() {
  return <StaffAccessScreen />;
}
