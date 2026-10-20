"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { storeKey } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { SlotHoldSchema, SlotsSchema, type SlotHold } from "@/features/storefront/schemas/catalog";
import { useStorefront } from "@/features/storefront/components/storefront-provider";
import { usePdp } from "@/stores/pdp";

/**
 * Appointment picker (M10 US-10.5, M26 US-26.3): the next seven days in the STORE's
 * timezone, then the server's slots of that day (held/booked disabled, cancelled hidden —
 * nothing generated locally, FR-26.06). Choosing a time HOLDS it on the server
 * (`POST …/slots` → `held_until`); the hold is shown as a Mono countdown, survives a reload
 * of the page (kept in this browser until it expires) and, once it runs out, sends the
 * buyer back to choose (FR-26.07). A slot taken meanwhile answers 409 → «لم يعد هذا الموعد
 * متاحاً» and the list refreshes. The held `start_datetime` travels with the cart line to
 * checkout (M12 US-12.5.2), which turns the hold into a booking.
 */
function isoDay(d: Date | number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

const holdKey = (store: string, productId: number) => `sharwa:slot-hold:${store}:${productId}`;

function readHold(store: string, productId: number): SlotHold | null {
  try {
    const raw = window.localStorage.getItem(holdKey(store, productId));
    const parsed = raw ? SlotHoldSchema.safeParse(JSON.parse(raw)) : null;
    return parsed?.success && Date.parse(parsed.data.held_until) > Date.now() ? parsed.data : null;
  } catch {
    return null;
  }
}

function writeHold(store: string, productId: number, hold: SlotHold | null) {
  try {
    if (hold) window.localStorage.setItem(holdKey(store, productId), JSON.stringify(hold));
    else window.localStorage.removeItem(holdKey(store, productId));
  } catch {
    // storage unavailable — the hold still lives on the server until `held_until`
  }
}

function mmss(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function BookingPicker({ productId, durationMinutes, missing }: { productId: number; durationMinutes: number | null; missing: boolean }) {
  const { store, timezone } = useStorefront();
  const client = useQueryClient();
  const [days] = useState(() => Array.from({ length: 7 }, (_, i) => isoDay(new Date(Date.now() + i * 86_400_000), timezone)));
  const [date, setDate] = useState(days[0]!);
  const start = usePdp((s) => s.startDatetime);
  const set = usePdp((s) => s.set);
  const [hold, setHold] = useState<SlotHold | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const key = storeKey(store, "product", productId, "slots", date);
  const q = useQuery({
    queryKey: key,
    queryFn: () => apiFetch(`/api/bff/catalog/products/${productId}/slots`, SlotsSchema, { query: { date } }),
    staleTime: 30_000,
  });

  // A hold made before a reload is offered back while it lasts (US-26.3 Independent Test).
  // Reading this browser's storage is an external sync, hence an effect.
  useEffect(() => {
    const saved = readHold(store, productId);
    if (!saved) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring from localStorage after hydration
    setHold(saved);
    set({ startDatetime: saved.start_datetime, missing: [] });
    const day = isoDay(Date.parse(saved.start_datetime), timezone);
    if (days.includes(day)) setDate(day);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per product
  }, [store, productId]);

  // The countdown ticks once a second; running out releases the choice (FR-26.07).
  useEffect(() => {
    if (!hold) return;
    const t = window.setInterval(() => {
      const at = Date.now();
      setNow(at);
      if (Date.parse(hold.held_until) <= at) {
        setHold(null);
        writeHold(store, productId, null);
        set({ startDatetime: null });
        setNotice("انتهت مهلة الاحتجاز — اختر موعداً من جديد.");
        void client.invalidateQueries({ queryKey: storeKey(store, "product", productId, "slots") });
      }
    }, 1000);
    return () => window.clearInterval(t);
  }, [hold, store, productId, set, client]);

  const left = hold ? Math.max(0, Date.parse(hold.held_until) - now) : 0;

  async function choose(slotStart: string) {
    if (slotStart === hold?.start_datetime) return;
    setNotice(null);
    setPending(slotStart);
    try {
      const next = await apiFetch(`/api/bff/catalog/products/${productId}/slots`, SlotHoldSchema, {
        method: "POST",
        json: { start_datetime: slotStart, release_slot_id: hold?.slot_id },
      });
      setHold(next);
      writeHold(store, productId, next);
      set({ startDatetime: next.start_datetime, missing: [] });
    } catch (e) {
      if (isApiError(e) && e.status === 409) setNotice(e.detail ?? "لم يعد هذا الموعد متاحاً.");
      else setNotice(isApiError(e) ? e.userMessage : "تعذّر احتجاز الموعد.");
    } finally {
      setPending(null);
      void client.invalidateQueries({ queryKey: key });
    }
  }

  const tz = q.data?.timezone ?? timezone;
  const dayFmt = new Intl.DateTimeFormat("ar", { weekday: "short", day: "numeric", numberingSystem: "latn", timeZone: "UTC" });
  const timeFmt = new Intl.DateTimeFormat("ar", { hour: "numeric", minute: "2-digit", numberingSystem: "latn", timeZone: tz });
  const visible = (q.data?.slots ?? []).filter((s) => s.status !== "cancelled");
  const held = (s: string) => hold !== null && Date.parse(s) === Date.parse(hold.start_datetime);

  return (
    <fieldset id="booking" tabIndex={-1} className="min-w-0 space-y-3 outline-none" data-testid="booking-picker">
      <legend className="text-sm font-medium">
        اختر موعداً{durationMinutes ? <span className="ms-2 text-muted-foreground">(المدة <span className="font-mono">{durationMinutes}</span> دقيقة)</span> : null}
      </legend>
      <p className="text-xs text-muted-foreground">
        الأوقات بتوقيت المتجر (<span dir="ltr" className="font-mono">{tz}</span>)
      </p>
      <div className="store-rail flex gap-2 overflow-x-auto" role="radiogroup" aria-label="اليوم">
        {days.map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={d === date}
            onClick={() => setDate(d)}
            className={cn("store-frame flex min-h-14 min-w-16 shrink-0 flex-col items-center justify-center rounded-xl border-border px-2 text-xs shadow-card bg-card", d === date && "bg-foreground text-background")}
          >
            {dayFmt.format(new Date(`${d}T12:00:00Z`))}
          </button>
        ))}
      </div>
      {q.isPending ? (
        <div className="h-24 animate-pulse rounded-lg bg-muted" aria-hidden />
      ) : visible.some((s) => s.status === "available" || held(s.start_datetime)) ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="الوقت">
          {visible.map((s) => {
            const mine = held(s.start_datetime) || (!hold && s.start_datetime === start);
            const free = s.status === "available" || mine;
            return (
              <button
                key={s.start_datetime}
                type="button"
                role="radio"
                aria-checked={mine}
                aria-disabled={!free || undefined}
                aria-busy={pending === s.start_datetime || undefined}
                data-testid="slot"
                data-status={mine ? "mine" : s.status}
                onClick={() => free && !pending && void choose(s.start_datetime)}
                className={cn(
                  "store-frame min-h-11 rounded-xl border-border text-sm shadow-card bg-card",
                  mine && "bg-foreground text-background",
                  !free && "cursor-not-allowed text-muted-foreground line-through opacity-50",
                  pending === s.start_datetime && "opacity-60",
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
      {hold && left > 0 ? (
        <p className="text-sm" role="status" data-testid="slot-hold">
          محتجز لك حتى <span className="font-mono tabular-nums">{timeFmt.format(new Date(hold.held_until))}</span> · يتبقى{" "}
          <span dir="ltr" className="font-mono tabular-nums" data-testid="slot-hold-countdown">
            {mmss(left)}
          </span>
        </p>
      ) : null}
      {notice ? (
        <p className="text-sm text-destructive" role="alert" data-testid="slot-notice">
          {notice}
        </p>
      ) : null}
      {missing ? <p className="text-sm text-destructive">اختر موعداً قبل الإضافة إلى السلة.</p> : null}
    </fieldset>
  );
}
