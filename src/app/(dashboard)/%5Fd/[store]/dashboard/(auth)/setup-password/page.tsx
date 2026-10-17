import type { Metadata } from "next";
import { Suspense } from "react";
import { PasswordForm } from "@/features/dashboard-shell/components/auth/password-form";

export const metadata: Metadata = { title: "اختر كلمة مرور متجرك", robots: { index: false, follow: false } };

export default function SetupPasswordPage() {
  return (
    <Suspense fallback={null}>
      <PasswordForm mode="setup" />
    </Suspense>
  );
}
