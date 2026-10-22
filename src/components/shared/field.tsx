import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Form field frame (constitution › النماذج): label above, the control, then a one-line hint
 * OR the error under the field in the semantic colour (SC-04.6: every message under the
 * field it belongs to, in Arabic).
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  counter,
  className,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  /** «32/70» character counter (Mono), rendered at the end of the label row. */
  counter?: { value: number; max: number };
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
          {required ? (
            <>
              <span aria-hidden className="ms-0.5 text-destructive">
                *
              </span>
              <span className="sr-only"> (مطلوب)</span>
            </>
          ) : null}
        </label>
        {counter ? (
          <span
            data-mono
            dir="ltr"
            className={cn(
              "font-mono text-[11px] tabular-nums text-muted-foreground",
              counter.value > counter.max && "text-destructive",
            )}
          >
            {counter.value}/{counter.max}
          </span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p role="alert" id={htmlFor ? `${htmlFor}-error` : undefined} data-field-error="" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Text input tuned for the dashboard: 44px on touch, 32px on desktop, numeric in LTR Mono. */
export const inputClass =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-card px-2.5 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 read-only:bg-muted/40 aria-invalid:border-destructive md:h-8 md:text-sm dark:bg-input/30";

export const numericInputClass = `${inputClass} font-mono tabular-nums text-end`;
