import type { Metadata } from "next";
import Link from "next/link";
import { Spotlight } from "@/components/motion/spotlight";
import { StoreLoginForm } from "@/features/landing/components/store-login-form";
import { env } from "@/env";

export const metadata: Metadata = {
  title: "دخول التاجر",
  description: "ادخل إلى لوحة تحكم متجرك على منصة شروه.",
  robots: { index: false, follow: false },
};

/** T044 — one field, one action; the store's own dashboard login does the auth. */
export default function LoginPage() {
  return (
    <Spotlight className="border-b border-border/60 py-16 md:py-24">
      <div className="mx-auto w-full max-w-md px-6">
        <h1 className="text-3xl font-semibold tracking-tight">دخول التاجر</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          اكتب نطاق متجرك وسنحوّلك إلى صفحة الدخول الخاصة به.
        </p>

        <div className="mt-8">
          <StoreLoginForm baseDomain={env.NEXT_PUBLIC_TENANT_BASE_DOMAIN} />
        </div>

        <p className="mt-8 border-t border-border/60 pt-6 text-sm text-muted-foreground">
          لا تملك متجراً بعد؟{" "}
          <Link href="/#start" className="text-foreground underline underline-offset-4">
            أنشئ متجرك
          </Link>
        </p>
      </div>
    </Spotlight>
  );
}
