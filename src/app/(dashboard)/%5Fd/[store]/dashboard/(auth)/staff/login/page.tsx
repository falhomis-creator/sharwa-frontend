import type { Metadata } from "next";
import { Suspense } from "react";
import { StaffLoginForm } from "@/features/dashboard-shell/components/auth/staff-login-form";

export const metadata: Metadata = { title: "دخول الموظفين", robots: { index: false, follow: false } };

/** The form reads `?next=` (POS `/pos`, courier `/agent`), so it sits behind a Suspense boundary. */
export default function StaffLoginPage() {
  return (
    <Suspense fallback={null}>
      <StaffLoginForm />
    </Suspense>
  );
}
