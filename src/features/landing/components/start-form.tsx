"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Sparkles, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mono } from "@/components/shared/mono";
import { hero } from "@/features/landing/landing.content";
import { cn } from "@/lib/utils";

/** Arabic letters, Latin letters, digits, spaces and the few separators a shop name uses. */
const STORE_NAME_RE = /^[؀-ۿݐ-ݿA-Za-z0-9\s'\-&.]+$/u;

/**
 * Validation is hand-rolled rather than React Hook Form + Zod.
 *
 * This is ONE text field with three rules, and the RHF/Zod/resolvers trio cost
 * ~140KB of client JS on the landing route — the single largest chunk on the
 * page, and the page's whole job is to load fast and convert. `/login` and the
 * multi-field onboarding forms keep RHF + Zod, where the ergonomics earn it.
 */
function validate(name: string): string | null {
  const value = name.trim();
  if (value.length < 3) return "اسم المتجر من ٣ أحرف على الأقل";
  if (value.length > 100) return "اسم المتجر حتى ١٠٠ حرف";
  if (!STORE_NAME_RE.test(value)) return "استخدم أحرفاً وأرقاماً ومسافات فقط";
  return null;
}

/**
 * The page's single conversion point, and the thing the whole hero is built to
 * point at: one massive Shopify-inspired field with the emerald action welded
 * to its end, sized so it out-weighs every other element above the fold. The
 * merchant types a name and is handed to M02 `/register?store_name=…` (US-02.1 contract).
 */
export function StartForm({ className }: { className?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("store_name") as HTMLInputElement | null;
    const value = input?.value ?? "";
    const message = validate(value);
    setError(message);
    if (message) {
      input?.focus();
      return;
    }
    setBusy(true);
    router.push(`/register?store_name=${encodeURIComponent(value.trim())}`);
  }

  const invalid = Boolean(error);

  return (
    <form
      id="start"
      noValidate
      onSubmit={onSubmit}
      aria-busy={busy}
      className={cn("w-full", className)}
    >
      <Label htmlFor="store_name" className="sr-only">
        اسم المتجر
      </Label>

      <div
        className={cn(
          "start-field group/form relative flex w-full flex-col gap-2.5 rounded-2xl border bg-white/95 p-2.5 backdrop-blur-xl sm:flex-row sm:items-center sm:gap-2 sm:rounded-[1.5rem] sm:p-3 dark:bg-zinc-900/90",
          "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          invalid
            ? "border-destructive ring-4 ring-destructive/10"
            : "border-zinc-200/90 hover:border-emerald-500/40 focus-within:border-emerald-500/80 focus-within:ring-4 focus-within:ring-emerald-500/15 dark:border-white/15 dark:hover:border-emerald-500/40",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3 ps-2 sm:ps-3">
          <span
            aria-hidden
            className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 transition-colors duration-200 group-focus-within/form:bg-emerald-600 group-focus-within/form:text-white sm:flex dark:text-emerald-400"
          >
            <Store className="size-5" />
          </span>

          <input
            id="store_name"
            name="store_name"
            type="text"
            autoComplete="organization"
            inputMode="text"
            enterKeyHint="go"
            placeholder="اكتب اسم متجرك هنا... (مثال: متجر الندى)"
            aria-invalid={invalid}
            aria-describedby={invalid ? "store_name-error" : "store_name-hint"}
            onInput={() => error && setError(null)}
            className="h-14 w-full min-w-0 bg-transparent px-2 text-base font-medium text-foreground placeholder:font-normal placeholder:text-muted-foreground/75 focus-visible:outline-none sm:h-16 sm:text-lg md:text-xl"
          />

          <span
            aria-hidden
            dir="ltr"
            className="hidden shrink-0 items-center rounded-xl border border-zinc-200/80 bg-zinc-100/80 px-3 py-1.5 text-xs text-muted-foreground lg:inline-flex dark:border-white/10 dark:bg-zinc-800/80"
          >
            <Mono className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              .sharwaah.com
            </Mono>
          </span>
        </div>

        <Button
          type="submit"
          disabled={busy}
          className="group/button h-14 w-full shrink-0 gap-2.5 rounded-xl bg-emerald-600 px-8 text-base font-semibold text-white shadow-xl shadow-emerald-600/30 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.03] hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-2xl hover:shadow-emerald-500/45 active:scale-[0.98] disabled:scale-100 disabled:translate-y-0 disabled:shadow-none sm:h-16 sm:w-auto sm:rounded-[1.1rem] sm:px-10 sm:text-lg"
        >
          <Sparkles className="size-4 text-emerald-100 transition-transform duration-300 group-hover/button:rotate-12" aria-hidden />
          <span>{busy ? "جارٍ التحويل…" : hero.cta}</span>
          <ArrowRight
            className="size-5 transition-transform duration-300 rtl:group-hover/button:-translate-x-1 ltr:group-hover/button:translate-x-1 rtl:rotate-180"
            aria-hidden
          />
        </Button>
      </div>

      {invalid ? (
        <p id="store_name-error" role="alert" className="mt-3.5 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : (
        <p id="store_name-hint" className="mt-4 text-sm text-muted-foreground">
          {hero.startHint}
        </p>
      )}
    </form>
  );
}

