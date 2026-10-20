"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CircleCheck, CircleX, RefreshCw, RotateCcw, ShoppingCart, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { Money } from "@/components/shared/money";
import { apiFetch } from "@/lib/api-client";
import { formatRelative } from "@/lib/format";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { TODAY_FIELDS } from "@/features/dashboard-shell/labels";
import { todayMetricsSchema, type TodayMetrics } from "@/features/dashboard-shell/schemas";

/** The pale-blue icon tile each stat card carries (owner mockup 2026-10-20). */
const FIELD_ICONS: Record<(typeof TODAY_FIELDS)[number]["key"], LucideIcon> = {
  orders_count: ShoppingCart,
  completed_orders_count: CircleCheck,
  cancelled_orders_count: CircleX,
  refunded_orders_count: RotateCcw,
  display_gross_revenue: Wallet,
  display_net_revenue: TrendingUp,
};

/**
 * Today's six numbers (M03 US-03.4) as six elevated stat cards — UI/UX Polish Phase (owner
 * direction 2026-10-19 supersedes the earlier hairline row): white surface, soft shadow,
 * 16px corners, 24px padding, 16–24px gaps. Label and a pale-blue icon tile on top, 32px Mono
 * value below (owner mockup 2026-10-20).
 *
 * 2×3 on mobile, 3 columns on tablet and small laptops, 6 across from xl. Money values step their
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
    <section aria-labelledby="today-heading" className="flex flex-col gap-4" data-testid="today-bar">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="today-heading" className="text-base font-semibold">
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
            className="flex h-11 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60 lg:h-9"
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

      <dl className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-6 xl:grid-cols-6">
        {TODAY_FIELDS.map((field) => {
          const Icon = FIELD_ICONS[field.key];
          return (
          <div key={field.key} className="surface-card @container flex min-w-0 flex-col gap-4 p-5 lg:p-6">
            <dt className="flex items-start justify-between gap-2 text-sm text-muted-foreground">
              <span className="min-w-0 pt-1">{field.label}</span>
              <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink">
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
            </dt>
            <dd
              className={cn(
                "min-w-0 font-mono text-[2rem] font-semibold leading-none tabular-nums text-foreground transition-opacity duration-150",
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
          </div>
          );
        })}
      </dl>
      <span className="sr-only" data-testid="today-store">
        {store}
      </span>
    </section>
  );
}
