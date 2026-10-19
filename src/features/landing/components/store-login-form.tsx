"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mono } from "@/components/shared/mono";
import { apiFetch } from "@/lib/api-client";
import { buildStoreUrl, validateSubdomain } from "@/lib/tenant";
import { cn } from "@/lib/utils";

const ResponseSchema = z.object({ available: z.boolean(), reason: z.string().optional() });

const schema = z.object({
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .superRefine((value, ctx) => {
      const result = validateSubdomain(value);
      if (!result.ok) ctx.addIssue({ code: "custom", message: result.reason });
    }),
});

type Values = z.infer<typeof schema>;

const NOT_FOUND = "لم نجد متجراً بهذا الاسم";

/**
 * US-01.4 — the merchant types their subdomain and lands on their own store's
 * dashboard login. Existence is decided by the server (`check-subdomain`):
 * `available === false` with reason "مستخدم بالفعل" means the store exists.
 */
export function StoreLoginForm({ baseDomain }: { baseDomain: string }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), mode: "onSubmit" });

  const message = errors.subdomain?.message ?? serverError;
  const invalid = Boolean(message);

  async function onSubmit({ subdomain }: Values) {
    setServerError(null);
    try {
      const data = await apiFetch("/api/bff/public/check-subdomain", ResponseSchema, {
        query: { subdomain },
      });
      if (data.available === false && data.reason === "مستخدم بالفعل") {
        // Cross-ORIGIN hand-off to the tenant host (<store>.<base>), which the
        // Next router cannot perform — `router.push` stays within this origin.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign(`${buildStoreUrl(subdomain, baseDomain)}/dashboard/login`);
        return;
      }
      setServerError(NOT_FOUND);
    } catch {
      setServerError("تعذّر التحقق الآن. أعد المحاولة بعد لحظات.");
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} aria-busy={isSubmitting} className="w-full">
      <Label htmlFor="subdomain" className="text-sm font-medium">
        نطاق متجرك
      </Label>

      <div
        className={cn(
          "sheet mt-2 flex items-center gap-1 rounded-md border bg-elevated p-1 transition-colors duration-200",
          invalid ? "border-destructive" : "border-border focus-within:border-ring",
        )}
      >
        <input
          id="subdomain"
          type="text"
          dir="ltr"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="text"
          enterKeyHint="go"
          placeholder="mystore"
          aria-invalid={invalid}
          aria-describedby={invalid ? "subdomain-error" : "subdomain-hint"}
          className="h-11 min-w-0 flex-1 bg-transparent px-3 font-mono text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none md:text-sm"
          {...register("subdomain")}
        />
        <Mono className="shrink-0 pe-1 text-sm text-muted-foreground">.{baseDomain}</Mono>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 shrink-0 gap-2 rounded-md px-4 text-sm"
        >
          {isSubmitting ? "جارٍ التحقق…" : "متابعة"}
          <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
        </Button>
      </div>

      {invalid ? (
        <p id="subdomain-error" role="alert" className="mt-2 text-sm text-destructive">
          {message}
          {serverError === NOT_FOUND ? (
            <>
              {" · "}
              <Link href="/#start" className="underline underline-offset-4 hover:text-foreground">
                أنشئ متجرك
              </Link>
            </>
          ) : null}
        </p>
      ) : (
        <p id="subdomain-hint" className="mt-2 text-sm text-muted-foreground">
          أحرف إنجليزية صغيرة وأرقام فقط، من ٣ أحرف.
        </p>
      )}
    </form>
  );
}
