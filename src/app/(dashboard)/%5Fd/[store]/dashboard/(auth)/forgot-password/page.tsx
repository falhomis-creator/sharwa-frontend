import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/dashboard-shell/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "نسيت كلمة المرور", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
