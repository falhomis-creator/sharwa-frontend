import type { Metadata } from "next";
import { Suspense } from "react";
import { PasswordForm } from "@/features/dashboard-shell/components/auth/password-form";

export const metadata: Metadata = { title: "إعادة تعيين كلمة المرور", robots: { index: false, follow: false } };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <PasswordForm mode="reset" />
    </Suspense>
  );
}
