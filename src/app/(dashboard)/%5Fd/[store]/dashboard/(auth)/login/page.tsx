import type { Metadata } from "next";
import { Suspense } from "react";
import { MerchantLoginForm } from "@/features/dashboard-shell/components/auth/merchant-login-form";

export const metadata: Metadata = { title: "تسجيل الدخول", robots: { index: false, follow: false } };

export default function MerchantLoginPage() {
  return (
    <Suspense fallback={null}>
      <MerchantLoginForm />
    </Suspense>
  );
}
