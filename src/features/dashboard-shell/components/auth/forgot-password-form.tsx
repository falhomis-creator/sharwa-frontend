"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Mono } from "@/components/shared/mono";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { FormError } from "@/features/dashboard-shell/components/auth/form-error";

/**
 * «نسيت كلمة المرور» (M03 US-03.1.3): there is nothing to type — the code goes to the
 * merchant phone already registered on the store, so the screen only asks for a confirm.
 * The response carries the OTP token and the masked number; the token travels to the reset
 * screen in the URL, exactly like M47's provisioning token, and never into storage.
 */
const responseSchema = z.object({
  otp_token: z.string(),
  ttl_seconds: z.number().int(),
  masked_phone: z.string(),
});

export function ForgotPasswordForm() {
  const [state, setState] = useState<z.infer<typeof responseSchema> | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function request() {
    setError("");
    setPending(true);
    try {
      setState(await apiFetch("/api/bff/auth/forgot-password", responseSchema, { method: "POST" }));
    } catch (err) {
      setError(isApiError(err) ? err.userMessage : "تعذّر إرسال الرمز، حاول مجدداً.");
    } finally {
      setPending(false);
    }
  }

  if (state) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-semibold tracking-tight">أرسلنا رمز التحقق</h1>
          <p className="text-sm text-muted-foreground">
            الرمز على واتساب الرقم <Mono>{state.masked_phone}</Mono>، وصالح{" "}
            <Mono>{Math.round(state.ttl_seconds / 60)}</Mono> دقائق.
          </p>
        </div>
        <Link
          href={`/dashboard/reset-password?t=${encodeURIComponent(state.otp_token)}`}
          className="inline-flex h-11 w-fit items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          أدخل الرمز
        </Link>
        <button
          type="button"
          onClick={() => void request()}
          disabled={pending}
          className="h-11 w-fit text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          إعادة الإرسال
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold tracking-tight">نسيت كلمة المرور</h1>
        <p className="text-sm text-muted-foreground">
          نرسل رمز تحقق على واتساب رقم مالك المتجر المسجّل. لا حاجة لإدخال أي بيانات.
        </p>
      </div>

      <FormError message={error} />

      <Button type="button" size="lg" className="h-11" onClick={() => void request()} disabled={pending}>
        {pending ? "جارٍ الإرسال…" : "أرسل الرمز"}
      </Button>

      <Link href="/dashboard/login" className="inline-flex h-11 w-fit items-center text-sm text-muted-foreground underline-offset-4 hover:underline">
        رجوع إلى تسجيل الدخول
      </Link>
    </div>
  );
}
