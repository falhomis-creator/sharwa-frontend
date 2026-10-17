"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import { normalizePhone } from "@/lib/format";
import { FieldError, FormError, applyApiError } from "@/features/dashboard-shell/components/auth/form-error";

/**
 * Staff login (M03 US-03.1.2). The phone is the identifier because `StaffMember.phone` is
 * unique (M03 §10); the input is `dir="ltr"` so a latin number cannot flip in the RTL form
 * (constitution II), and it is normalized to the backend form (0770… → 967770…) on submit.
 */
const schema = z.object({
  phone: z.string().min(6, "أدخل رقم الهاتف."),
  password: z.string().min(1, "أدخل كلمة المرور."),
});
type Values = z.infer<typeof schema>;
const FIELDS = ["phone", "password"] as const;

export function StaffLoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState("");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { phone: "", password: "" } });

  async function onSubmit(values: Values) {
    setFormError("");
    try {
      await apiFetch("/api/bff/auth/staff/login", z.undefined(), {
        json: { phone: normalizePhone(values.phone), password: values.password },
      });
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setFormError(applyApiError(error, setError, FIELDS));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold tracking-tight">دخول الموظفين</h1>
        <p className="text-sm text-muted-foreground">استخدم رقم هاتفك وكلمة المرور التي منحك إياها مدير المتجر.</p>
      </div>

      <FormError message={formError} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">رقم الهاتف</Label>
        <Input
          id="phone"
          type="tel"
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          autoFocus
          className="h-11 font-mono"
          aria-invalid={Boolean(errors.phone)}
          {...register("phone")}
        />
        <FieldError message={errors.phone?.message} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="staff-password">كلمة المرور</Label>
        <Input
          id="staff-password"
          type="password"
          autoComplete="current-password"
          className="h-11"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        <FieldError message={errors.password?.message} />
      </div>

      <Button type="submit" size="lg" className="h-11" disabled={isSubmitting}>
        {isSubmitting ? "جارٍ الدخول…" : "دخول"}
      </Button>

      <Link href="/dashboard/login" className="inline-flex h-11 w-fit items-center text-sm text-muted-foreground underline-offset-4 hover:underline">
        دخول مالك المتجر
      </Link>
    </form>
  );
}
