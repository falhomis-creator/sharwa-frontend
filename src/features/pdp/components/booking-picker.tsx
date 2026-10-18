"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { storeKey } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { SlotsSchema } from "@/features/storefront/schemas/catalog";
import { useStorefront } from "@/features/storefront/components/storefront-provider";
import { usePdp } from "@/stores/pdp";

/**
 * Appointment picker (M10 US-10.5): the next seven days in the STORE's timezone,
 * then the slots of the chosen day (held/booked are shown disabled,
 * cancelled ones are hidden). The chosen `start_datetime` travels with the cart line to
 * checkout (M12 US-12.5.2). An empty day points to the nearest open one.
 */
function isoDay(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function BookingPicker({ productId, durationMinutes, missing }: { productId: number; durationMinutes: number | null; missing: boolean }) {
  const { store, timezone } = useStorefront();
  const [days] = useState(() => Array.from({ length: 7 }, (_, i) => isoDay(new Date(Date.now() + i * 86_400_000), timezone)));
  const [date, setDate] = useState(days[0]!);
  const start = usePdp((s) => s.startDatetime);
  const set = usePdp((s) => s.set);
  const q = useQuery({
    queryKey: storeKey(store, "product", productId, "slots", date),
    queryFn: () => apiFetch(`/api/bff/catalog/products/${productId}/available-slots`, SlotsSchema, { query: { date } }),
    staleTime: 30_000,
  });
  const dayFmt = new Intl.DateTimeFormat("ar", { weekday: "short", day: "numeric", numberingSystem: "latn", timeZone: "UTC" });
  const timeFmt = new Intl.DateTimeFormat("ar", { hour: "numeric", minute: "2-digit", numberingSystem: "latn", timeZone: timezone });
  const visible = (q.data?.slots ?? []).filter((s) => s.status !== "cancelled");

  return (
    <fieldset id="booking" tabIndex={-1} className="min-w-0 space-y-3 outline-none" data-testid="booking-picker">
      <legend className="text-sm font-medium">
        اختر موعداً{durationMinutes ? <span className="ms-2 text-muted-foreground">(المدة <span className="font-mono">{durationMinutes}</span> دقيقة)</span> : null}
      </legend>
      <div className="store-rail flex gap-2 overflow-x-auto" role="radiogroup" aria-label="اليوم">
        {days.map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={d === date}
            onClick={() => setDate(d)}
            className={cn("store-frame flex min-h-14 min-w-16 shrink-0 flex-col items-center justify-center rounded-lg border-border px-2 text-xs", d === date && "bg-foreground text-background")}
          >
            {dayFmt.format(new Date(`${d}T12:00:00Z`))}
          </button>
        ))}
      </div>
      {q.isPending ? (
        <div className="h-24 animate-pulse rounded-lg bg-muted" aria-hidden />
      ) : visible.some((s) => s.status === "available") ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="الوقت">
          {visible.map((s) => {
            const on = s.start_datetime === start;
            const free = s.status === "available";
            return (
              <button
                key={s.start_datetime}
                type="button"
                role="radio"
                aria-checked={on}
                aria-disabled={!free || undefined}
                onClick={() => free && set({ startDatetime: on ? null : s.start_datetime, missing: [] })}
                className={cn(
                  "store-frame min-h-11 rounded-lg border-border text-sm",
                  on && "bg-foreground text-background",
                  !free && "cursor-not-allowed text-muted-foreground line-through opacity-50",
                )}
              >
                <span className="tabular-nums">{timeFmt.format(new Date(s.start_datetime))}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          لا مواعيد متاحة في هذا اليوم.
          {q.data?.next_available_date && days.includes(q.data.next_available_date) ? (
            <button type="button" className="ms-2 min-h-11 store-link" onClick={() => setDate(q.data.next_available_date!)}>
              أقرب يوم متاح
            </button>
          ) : null}
        </p>
      )}
      {missing ? <p className="text-sm text-destructive">اختر موعداً قبل الإضافة إلى السلة.</p> : null}
    </fieldset>
  );
}
