"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import { FieldError, FormError, applyApiError } from "@/features/dashboard-shell/components/auth/form-error";

/**
 * Owner login (M03 US-03.1): one password field, because the store is resolved from the
 * host and there is no `auth.User` behind it (M03 §10).
 *
 * No minimum length is enforced on sign-in — a length rule here would lock out a merchant
 * whose existing password is shorter. The ≥8 rule belongs to the setup/reset forms.
 */
const schema = z.object({ password: z.string().min(1, "أدخل كلمة المرور.") });
type Values = z.infer<typeof schema>;
const FIELDS = ["password"] as const;

export function MerchantLoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [formError, setFormError] = useState("");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: "" } });

  async function onSubmit(values: Values) {
    setFormError("");
    try {
      await apiFetch("/api/bff/auth/merchant/login", z.undefined(), { json: values });
      const next = search.get("next");
      router.replace(next && next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch (error) {
      setFormError(applyApiError(error, setError, FIELDS));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold tracking-tight">تسجيل الدخول</h1>
        <p className="text-sm text-muted-foreground">أدخل كلمة مرور المتجر للمتابعة.</p>
      </div>

      <FormError message={formError} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">كلمة المرور</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          className="h-11"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        <FieldError message={errors.password?.message} />
      </div>

      <Button type="submit" size="lg" className="h-11" disabled={isSubmitting}>
        {isSubmitting ? "جارٍ الدخول…" : "دخول"}
      </Button>

      <div className="flex flex-col gap-2 text-sm">
        <Link href="/dashboard/forgot-password" className="inline-flex h-11 w-fit items-center text-muted-foreground underline-offset-4 hover:underline">
          نسيت كلمة المرور؟
        </Link>
        <Link href="/dashboard/staff/login" className="inline-flex h-11 w-fit items-center text-muted-foreground underline-offset-4 hover:underline">
          دخول الموظفين
        </Link>
      </div>
    </form>
  );
}
