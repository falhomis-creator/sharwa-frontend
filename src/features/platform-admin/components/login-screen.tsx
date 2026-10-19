"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { useAdminLogin } from "@/features/platform-admin/api/hooks";
import { adminLoginInputSchema, type AdminLoginInput } from "@/features/platform-admin/schemas/auth";

/**
 * `console.<base>/login` — the Django admin session on the public schema (M20 §7). The
 * merchant login never opens the console: different host, different session marker.
 */
export function AdminLoginScreen() {
  const router = useRouter();
  const login = useAdminLogin();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<AdminLoginInput>({ resolver: zodResolver(adminLoginInputSchema), defaultValues: { username: "", password: "" } });
  const { errors } = form.formState;

  const submit = form.handleSubmit(async (v) => {
    setFormError(null);
    try {
      await login.mutateAsync(v);
      router.replace("/");
      router.refresh();
    } catch (err) {
      if (isApiError(err) && err.fields) {
        for (const [k, msgs] of Object.entries(err.fields)) {
          if (k === "username" || k === "password") form.setError(k, { message: msgs[0] });
        }
      }
      setFormError(isApiError(err) ? err.userMessage : "تعذّر تسجيل الدخول.");
    }
  });

  return (
    <main id="main" className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-4 py-16">
      <div className="flex flex-col gap-2">
        <Mono className="self-start text-xs text-muted-foreground">console</Mono>
        <h1 className="text-2xl font-semibold tracking-tight">لوحة المنصة</h1>
        <p className="text-sm text-muted-foreground">لمالك المنصة وفريق التشغيل فقط.</p>
      </div>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4" data-testid="admin-login">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username">اسم المستخدم</Label>
          <Input id="username" dir="ltr" autoComplete="username" className="h-11 lg:h-9" aria-invalid={Boolean(errors.username)} {...form.register("username")} />
          {errors.username ? <p className="text-xs text-destructive">{errors.username.message}</p> : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">كلمة المرور</Label>
          <Input id="password" type="password" dir="ltr" autoComplete="current-password" className="h-11 lg:h-9" aria-invalid={Boolean(errors.password)} {...form.register("password")} />
          {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
        </div>
        {formError ? (
          <p role="alert" className="text-sm text-destructive" data-testid="login-error">
            {formError}
          </p>
        ) : null}
        <Button type="submit" className="h-11 lg:h-9" disabled={login.isPending}>
          {login.isPending ? "جارٍ الدخول…" : "دخول"}
        </Button>
      </form>
    </main>
  );
}
