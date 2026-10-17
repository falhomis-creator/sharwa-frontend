import type { Metadata } from "next";
import { StaffLoginForm } from "@/features/dashboard-shell/components/auth/staff-login-form";

export const metadata: Metadata = { title: "دخول الموظفين", robots: { index: false, follow: false } };

export default function StaffLoginPage() {
  return <StaffLoginForm />;
}
