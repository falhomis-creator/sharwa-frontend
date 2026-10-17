"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
 * point at: one field with the emerald action welded to its end, sized so it
 * out-weighs every other element above the fold. The merchant types a name and
 * is handed to M02 `/register?store_name=…` (US-02.1 contract).
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
          // Below sm the field and the action stack: side by side at 390px the
          // input is left with ~160px, which is not enough to read a shop name
          // back while typing it.
          "start-field flex w-full flex-col gap-2 rounded-[1.15rem] border bg-elevated p-2",
          "sm:flex-row sm:items-center sm:gap-1.5",
          "transition-colors duration-200",
          invalid
            ? "border-destructive"
            : "border-border/70 focus-within:border-emerald-500/70 dark:border-white/10",
        )}
      >
        <input
          id="store_name"
          name="store_name"
          type="text"
          autoComplete="organization"
          inputMode="text"
          enterKeyHint="go"
          placeholder="اسم متجرك"
          aria-invalid={invalid}
          aria-describedby={invalid ? "store_name-error" : "store_name-hint"}
          onInput={() => error && setError(null)}
          className="h-13 w-full min-w-0 bg-transparent px-4 text-base text-foreground placeholder:text-muted-foreground/80 focus-visible:outline-none sm:flex-1"
        />
        <Button
          type="submit"
          disabled={busy}
          className="h-13 w-full shrink-0 gap-2 rounded-[0.85rem] bg-emerald-600 px-6 sm:w-auto text-[0.95rem] font-semibold text-white shadow-lg shadow-emerald-600/30 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-xl hover:shadow-emerald-500/40 disabled:translate-y-0 disabled:shadow-none"
        >
          {busy ? "جارٍ التحويل…" : hero.cta}
          <ArrowLeft
            className="size-4 transition-transform duration-200 group-hover/button:-translate-x-0.5"
            aria-hidden
          />
        </Button>
      </div>

      {invalid ? (
        <p id="store_name-error" role="alert" className="mt-3.5 text-sm text-destructive">
          {error}
        </p>
      ) : (
        <p id="store_name-hint" className="mt-3.5 text-sm text-muted-foreground">
          {hero.startHint}
        </p>
      )}
    </form>
  );
}
