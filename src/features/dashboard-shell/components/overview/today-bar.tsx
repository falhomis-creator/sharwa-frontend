"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Money } from "@/components/shared/money";
import { apiFetch } from "@/lib/api-client";
import { formatRelative } from "@/lib/format";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { TODAY_FIELDS } from "@/features/dashboard-shell/labels";
import { todayMetricsSchema, type TodayMetrics } from "@/features/dashboard-shell/schemas";

/**
 * Today's six numbers in ONE dense row (M03 US-03.4): 32px Mono values separated by 1px
 * hairlines, 12px labels underneath. Explicitly NOT four identical KPI cards — that row of
 * cards is the first thing constitution I-ب rules out.
 *
 * 2×3 on mobile, 3 columns on tablet and small laptops, 6 across from xl; the hairlines come from a 1px
 * gap over `bg-border`, so there is no shadow and no card chrome. Money values step their
 * size down with the cell's own width (container queries) and may wrap — never truncate —
 * so a long figure such as «1,222,278.75 ر.س» stays whole inside its cell.
 */
export function TodayBar({ initial, store }: { initial: TodayMetrics; store: string }) {
  const [today, setToday] = useState(initial);
  const [error, setError] = useState("");

  // `Date.now()` differs between the server render and hydration by design; the element
  // carries `suppressHydrationWarning` so a timestamp cannot be mistaken for a real
  // mismatch (constitution IV treats hydration warnings as gate failures).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(id);
  }, []);

  const refresh = useMutation({
    mutationFn: () =>
      apiFetch("/api/bff/dashboard/overview/refresh", todayMetricsSchema, { method: "POST" }),
    onSuccess: (data) => {
      setToday(data);
      setError("");
    },
    onError: (err) => setError(isApiError(err) ? err.userMessage : "تعذّر التحديث."),
  });

  return (
    <section aria-labelledby="today-heading" className="flex flex-col gap-3" data-testid="today-bar">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="today-heading" className="text-sm font-medium">
          أرقام اليوم
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground" suppressHydrationWarning>
            {today.refreshed_at
              ? `آخر تحديث ${formatRelative(today.refreshed_at, new Date(now))}`
              : "لم تُجمَّع أرقام اليوم بعد"}
          </span>
          <button
            type="button"
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending}
            className="flex h-11 items-center gap-1.5 rounded-md border border-border px-3 text-sm transition-colors hover:bg-muted disabled:opacity-60 lg:h-8"
          >
            <RefreshCw
              className={cn("size-4", refresh.isPending && "animate-spin")}
              strokeWidth={1.75}
              aria-hidden
            />
            تحديث
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <dl className="grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-3 xl:grid-cols-6">
        {TODAY_FIELDS.map((field) => (
          <div key={field.key} className="@container flex min-w-0 flex-col gap-1 bg-background p-4">
            <dd
              className={cn(
                "min-w-0 font-mono text-[2rem] leading-none tabular-nums transition-opacity duration-150",
                refresh.isPending && "opacity-50",
              )}
              data-mono
              dir="ltr"
            >
              {"money" in field && field.money ? (
                <Money
                  value={today[field.key] as string}
                  className="inline-block max-w-full text-base leading-tight [overflow-wrap:anywhere] @[9rem]:text-lg @[11rem]:text-[1.375rem]"
                />
              ) : (
                (today[field.key] as number).toLocaleString("en-US")
              )}
            </dd>
            <dt className="text-xs text-muted-foreground">{field.label}</dt>
          </div>
        ))}
      </dl>
      <span className="sr-only" data-testid="today-store">
        {store}
      </span>
    </section>
  );
}
