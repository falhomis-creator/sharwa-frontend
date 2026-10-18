"use client";

import { useEffect, useRef } from "react";
import { toWesternDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Six-digit OTP field (M12 FR-12.06) — the ONE component every buyer OTP uses (COD, wallet,
 * Sharwa Pay, loyalty, review, bid). Mono, LTR inside RTL (M12 §11 II), Arabic-Indic digits
 * accepted and converted, paste fills all six, `Enter` submits.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  invalid = false,
  autoFocus = true,
  label = "رمز التأكيد",
  idPrefix,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  invalid?: boolean;
  autoFocus?: boolean;
  label?: string;
  idPrefix: string;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const set = (next: string) => {
    const clean = toWesternDigits(next).replace(/\D/g, "").slice(0, 6);
    onChange(clean);
    if (clean.length === 6) onComplete?.(clean);
    return clean;
  };

  return (
    <div role="group" aria-label={label} dir="ltr" className="flex justify-start gap-2" data-testid="otp-input">
      {digits.map((d, i) => (
        <input
          key={i}
          id={`${idPrefix}-${i}`}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`الخانة ${i + 1}`}
          aria-invalid={invalid || undefined}
          maxLength={6}
          value={d}
          onChange={(e) => {
            const typed = toWesternDigits(e.target.value).replace(/\D/g, "");
            if (typed.length > 1) {
              const clean = set(typed);
              refs.current[Math.min(5, clean.length)]?.focus();
              return;
            }
            const chars = digits.slice();
            chars[i] = typed;
            const clean = set(chars.join(""));
            if (typed && i < 5) refs.current[i + 1]?.focus();
            void clean;
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "Enter" && value.length === 6) onComplete?.(value);
          }}
          onPaste={(e) => {
            e.preventDefault();
            const clean = set(e.clipboardData.getData("text"));
            refs.current[Math.min(5, clean.length)]?.focus();
          }}
          className={cn(
            "store-frame size-11 rounded-lg border-input bg-background text-center font-mono text-lg tabular-nums outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 md:size-12",
            invalid && "border-destructive",
          )}
        />
      ))}
    </div>
  );
}
