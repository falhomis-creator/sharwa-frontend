"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mono } from "@/components/shared/mono";
import { apiFetch } from "@/lib/api-client";
import { FieldError, FormError, applyApiError } from "@/features/dashboard-shell/components/auth/form-error";

/**
 * Sets a password: first entry after provisioning (`setup`) and the OTP reset (`reset`).
 * Both demand ≥ 8 characters and a matching confirmation (T057); the reset adds the
 * six-digit WhatsApp code. The code is never stored — it is posted and forgotten.
 */
const base = {
  password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل."),
  password_confirm: z.string(),
};

const setupSchema = z.object(base).refine((v) => v.password === v.password_confirm, {
  path: ["password_confirm"],
  message: "كلمتا المرور غير متطابقتين.",
});

const resetSchema = z
  .object({ ...base, code: z.string().regex(/^\d{6}$/, "الرمز ستة أرقام.") })
  .refine((v) => v.password === v.password_confirm, {
    path: ["password_confirm"],
    message: "كلمتا المرور غير متطابقتين.",
  });

type SetupValues = z.infer<typeof setupSchema>;
type ResetValues = z.infer<typeof resetSchema>;

export function PasswordForm({ mode }: { mode: "setup" | "reset" }) {
  const router = useRouter();
  const search = useSearchParams();
  const otpToken = search.get("t") ?? "";
  /** First entry only: the signed proof from the `ready` redirect (decision 2026-10-21). */
  const setupToken = search.get("setup") ?? "";
  const [formError, setFormError] = useState("");

  const isReset = mode === "reset";
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(isReset ? resetSchema : (setupSchema as unknown as typeof resetSchema)),
    defaultValues: { password: "", password_confirm: "", code: "" },
  });

  async function onSubmit(values: SetupValues & { code?: string }) {
    setFormError("");
    try {
      if (isReset) {
        await apiFetch("/api/bff/auth/reset-password", z.undefined(), {
          json: { otp_token: otpToken, code: values.code, password: values.password },
        });
      } else {
        await apiFetch("/api/bff/auth/setup-password", z.undefined(), {
          json: { password: values.password, password_confirm: values.password_confirm, setup_token: setupToken },
        });
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setFormError(applyApiError(error, setError, ["password", "password_confirm", "code"]));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold tracking-tight">
          {isReset ? "إعادة تعيين كلمة المرور" : "اختر كلمة مرور متجرك"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isReset
            ? "أدخل الرمز الذي أرسلناه على واتساب ثم كلمة المرور الجديدة."
            : "هذه أول مرة تدخل فيها؛ اختر كلمة مرور لا تقل عن 8 أحرف."}
        </p>
      </div>

      <FormError message={formError} />

      {!isReset && !setupToken ? (
        <p className="text-sm text-warning" role="status">
          رابط التفعيل ناقص. افتح الرابط الذي ظهر في صفحة تجهيز المتجر، أو فعّل المتجر برمز واتساب من لوحة التحكم.
        </p>
      ) : null}

      {isReset ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">رمز التحقق</Label>
          <Input
            id="code"
            dir="ltr"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="h-11 font-mono tracking-[0.4em]"
            aria-invalid={Boolean(errors.code)}
            {...register("code")}
          />
          <FieldError message={errors.code?.message} />
          {otpToken ? null : (
            <p className="text-sm text-warning">
              لا يوجد رمز في الرابط — اطلب رمزاً جديداً من صفحة <Mono>نسيت كلمة المرور</Mono>.
            </p>
          )}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="new-password">كلمة المرور</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          className="h-11"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        <FieldError message={errors.password?.message} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          className="h-11"
          aria-invalid={Boolean(errors.password_confirm)}
          {...register("password_confirm")}
        />
        <FieldError message={errors.password_confirm?.message} />
      </div>

      <Button type="submit" size="lg" className="h-11" disabled={isSubmitting}>
        {isSubmitting ? "جارٍ الحفظ…" : "حفظ ومتابعة"}
      </Button>
    </form>
  );
}
