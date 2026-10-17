"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { hero } from "@/features/landing/landing.content";
import { cn } from "@/lib/utils";

/** Arabic letters, Latin letters, digits, spaces and the few separators a shop name uses. */
const STORE_NAME_RE = /^[؀-ۿݐ-ݿA-Za-z0-9\s'\-&.]+$/u;

const schema = z.object({
  store_name: z
    .string()
    .trim()
    .min(3, "اسم المتجر من ٣ أحرف على الأقل")
    .max(100, "اسم المتجر حتى ١٠٠ حرف")
    .regex(STORE_NAME_RE, "استخدم أحرفاً وأرقاماً ومسافات فقط"),
});

type Values = z.infer<typeof schema>;

/**
 * The single conversion point of the page. One field inside one hairline shell
 * with the black action welded to its end — the merchant types a name and is
 * handed to M02 `/register?store_name=…` (US-02.1 contract).
 */
export function StartForm({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<Values>({ resolver: zodResolver(schema), mode: "onSubmit" });

  const busy = isSubmitting || isSubmitSuccessful;
  const invalid = Boolean(errors.store_name);

  function onSubmit(values: Values) {
    router.push(`/register?store_name=${encodeURIComponent(values.store_name)}`);
  }

  return (
    <form
      id="start"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      aria-busy={busy}
      style={style}
      className={cn("w-full max-w-xl", className)}
    >
      <Label htmlFor="store_name" className="sr-only">
        اسم المتجر
      </Label>

      <div
        className={cn(
          "sheet flex items-center gap-1 rounded-md border bg-elevated p-1 transition-colors duration-200",
          invalid ? "border-destructive" : "border-border focus-within:border-ring",
        )}
      >
        <input
          id="store_name"
          type="text"
          autoComplete="organization"
          inputMode="text"
          enterKeyHint="go"
          placeholder="اسم متجرك"
          aria-invalid={invalid}
          aria-describedby={invalid ? "store_name-error" : "store_name-hint"}
          className="h-11 min-w-0 flex-1 bg-transparent px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none md:text-sm"
          {...register("store_name")}
        />
        <Button
          type="submit"
          disabled={busy}
          className="h-11 shrink-0 gap-2 rounded-md px-4 text-sm font-medium"
        >
          {busy ? "جارٍ التحويل…" : hero.cta}
          <ArrowLeft className="size-4 transition-transform duration-200 group-hover/button:-translate-x-0.5" aria-hidden />
        </Button>
      </div>

      {invalid ? (
        <p id="store_name-error" role="alert" className="mt-2 text-sm text-destructive">
          {errors.store_name?.message}
        </p>
      ) : (
        <p id="store_name-hint" className="mt-2 text-sm text-muted-foreground">
          بلا بطاقة بنكية. تختار النطاق الفرعي في الخطوة التالية.
        </p>
      )}
    </form>
  );
}
