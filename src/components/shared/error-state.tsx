"use client";

import { Button } from "@/components/ui/button";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";

/** Inline error with an Arabic message and a retry action (FR-009, FR-011). */
export function ErrorState({
  error,
  onRetry,
  title = "تعذّر تحميل البيانات",
  className,
}: {
  error?: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  const message = isApiError(error) ? error.userMessage : error instanceof Error ? error.message : undefined;
  const retryAfter = isApiError(error) ? error.retryAfter : undefined;
  return (
    <div role="alert" className={cn("flex flex-col items-start gap-3 rounded-lg border border-border p-6", className)}>
      <p className="text-base font-medium">{title}</p>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      {retryAfter ? (
        <p className="text-sm text-muted-foreground">
          حاول بعد <span className="font-mono tabular-nums">{retryAfter}</span> ثانية.
        </p>
      ) : null}
      {onRetry ? (
        <Button variant="outline" size="lg" className="h-11 lg:h-9" onClick={onRetry}>
          إعادة المحاولة
        </Button>
      ) : null}
    </div>
  );
}
