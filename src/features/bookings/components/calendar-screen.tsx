"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { useCancelSlot, useServices, useSlots } from "@/features/bookings/api";
import { SLOT_STATUS_LABELS, type Slot } from "@/features/bookings/schemas";
import { DATE_RE, addDays, weekStartOf, zonedDate, zonedMinutes, type WeekStart } from "@/features/bookings/weekdays";

/**
 * M26 US-26.2 — the merchant's calendar (`/dashboard/bookings`). Week or day view, service
 * filter, date/view in the URL (FR-26.04); blocks on a 1px grid, `held` dashed and `booked`
 * solid (FR-26.05 — borders, never fills); `cancelled` hidden unless toggled. On phones the
 * day view is the default with a horizontal strip of the week's days.
 * Keys: `T` today · `←/→` next/previous week, mirrored for RTL.
 */
const DEFAULT_TZ = "Asia/Aden";
const HOUR_PX = 56;

export function CalendarScreen() {
  const [now] = useState(() => Date.now());
  const [q, setQ] = useQueryStates({
    date: parseAsString.withDefault(""),
    view: parseAsStringLiteral(["week", "day"] as const),
    service: parseAsInteger,
    cancelled: parseAsStringLiteral(["1"] as const),
  });
  // The store's zone and week start arrive with the data; until then the fixture defaults.
  const [context, setContext] = useState<{ timezone: string; week_start_day: WeekStart }>({ timezone: DEFAULT_TZ, week_start_day: "sunday" });
  const tz = context.timezone;
  const today = zonedDate(now, tz);
  const anchor = DATE_RE.test(q.date) ? q.date : today;
  const weekFrom = weekStartOf(anchor, context.week_start_day);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekFrom, i));
  const services = useServices();
  const slots = useSlots({ from: weekFrom, to: days[6]!, product: q.service ?? undefined, status: q.cancelled ? "held,booked,cancelled" : "held,booked" });
  const [open, setOpen] = useState<Slot | null>(null);

  // Adjust during render (not in an effect) when the server's context differs.
  if (slots.data && (slots.data.timezone !== context.timezone || slots.data.week_start_day !== context.week_start_day)) {
    setContext({ timezone: slots.data.timezone, week_start_day: slots.data.week_start_day });
  }

  const go = (date: string) => void setQ({ date: date === today ? null : date });
  const shiftWeek = (dir: 1 | -1) => go(addDays(anchor, 7 * dir));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA" || t.isContentEditable))) return;
      if (e.key === "t" || e.key === "T") go(today);
      // RTL: the left arrow points forward in time.
      if (e.key === "ArrowLeft") shiftWeek(1);
      if (e.key === "ArrowRight") shiftWeek(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const byDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots.data?.results ?? []) {
      const d = zonedDate(Date.parse(s.start_datetime), tz);
      map.set(d, [...(map.get(d) ?? []), s]);
    }
    return map;
  }, [slots.data, tz]);

  const range = useMemo(() => {
    let lo = 8 * 60;
    let hi = 20 * 60;
    for (const s of slots.data?.results ?? []) {
      lo = Math.min(lo, Math.floor(zonedMinutes(Date.parse(s.start_datetime), tz) / 60) * 60);
      hi = Math.max(hi, Math.ceil(zonedMinutes(Date.parse(s.end_datetime), tz) / 60) * 60);
    }
    return { lo, hi };
  }, [slots.data, tz]);

  const dayFmt = new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC", numberingSystem: "latn" });
  const shortDay = new Intl.DateTimeFormat("ar", { weekday: "short", day: "numeric", timeZone: "UTC", numberingSystem: "latn" });
  const rangeFmt = new Intl.DateTimeFormat("ar", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC", numberingSystem: "latn" });
  const asUtcNoon = (d: string) => new Date(`${d}T12:00:00Z`);
  const view = q.view;
  const empty = slots.data && slots.data.results.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="تقويم الحجوزات"
        description="مواعيد خدماتك القابلة للحجز. المحتجز بحدود متقطعة حتى يكتمل الدفع، والمحجوز بحدود صلبة."
        actions={
          <Link href="/dashboard/bookings/services" className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")}>
            الخدمات وساعات التوفر
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2" data-testid="calendar-toolbar">
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon" className="size-11 lg:size-8" aria-label="الأسبوع السابق" onClick={() => shiftWeek(-1)} data-testid="week-prev">
            <ChevronRight className="size-4 ltr:rotate-180" aria-hidden />
          </Button>
          <Button type="button" variant="outline" className="h-11 lg:h-8" onClick={() => go(today)}>
            اليوم <Mono className="ms-1 text-[11px] text-muted-foreground">T</Mono>
          </Button>
          <Button type="button" variant="outline" size="icon" className="size-11 lg:size-8" aria-label="الأسبوع التالي" onClick={() => shiftWeek(1)} data-testid="week-next">
            <ChevronLeft className="size-4 ltr:rotate-180" aria-hidden />
          </Button>
        </div>
        <p className="text-sm font-medium" data-testid="week-range">
          {rangeFmt.format(asUtcNoon(days[0]!))} – {rangeFmt.format(asUtcNoon(days[6]!))}
        </p>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="العرض" className="hidden overflow-hidden rounded-md border border-border md:flex">
            {(
              [
                ["week", "أسبوع"],
                ["day", "يوم"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={(view ?? "week") === k}
                onClick={() => void setQ({ view: k === "week" ? null : k })}
                className={cn("h-11 px-3 text-sm lg:h-8", (view ?? "week") === k ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted")}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="sr-only" htmlFor="bk-service">
            الخدمة
          </label>
          <NativeSelect id="bk-service" className="h-11 w-48 lg:h-8" value={q.service ?? ""} onChange={(e) => void setQ({ service: e.target.value ? Number(e.target.value) : null })}>
            <option value="">كل الخدمات</option>
            {(services.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
          <label className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground lg:min-h-8">
            <input type="checkbox" className="size-4 accent-[var(--foreground)]" checked={q.cancelled === "1"} onChange={(e) => void setQ({ cancelled: e.target.checked ? "1" : null })} data-testid="show-cancelled" />
            إظهار الملغاة
          </label>
        </div>
      </div>

      {slots.isPending ? (
        <Skeleton className="h-[28rem] w-full" />
      ) : slots.isError ? (
        <ErrorState error={slots.error} onRetry={() => void slots.refetch()} />
      ) : (
        <>
          {empty ? <EmptyState title="لا حجوزات هذا الأسبوع" description="تظهر هنا المواعيد التي يحجزها عملاؤك من صفحة الخدمة في متجرك." /> : null}

          {/* Week grid (md+, unless the day view is chosen) */}
          <div className={cn("overflow-x-auto rounded-md border border-border", view === "day" ? "hidden" : "hidden md:block")} data-testid="week-grid">
            <div className="grid min-w-[56rem]" style={{ gridTemplateColumns: "4rem repeat(7, minmax(0, 1fr))" }}>
              <div className="border-b border-border" />
              {days.map((d) => (
                <div key={d} className={cn("border-b border-s border-border px-2 py-2 text-xs", d === today ? "font-semibold text-foreground" : "text-muted-foreground")} data-testid="day-head">
                  {shortDay.format(asUtcNoon(d))}
                  {d === today ? <span className="ms-1">· اليوم</span> : null}
                </div>
              ))}
              <HourRail lo={range.lo} hi={range.hi} />
              {days.map((d) => (
                <DayColumn key={d} slots={byDay.get(d) ?? []} lo={range.lo} hi={range.hi} tz={tz} onOpen={setOpen} />
              ))}
            </div>
          </div>

          {/* Day view: always on phones, on md+ when chosen */}
          <div className={cn("flex flex-col gap-3", view === "day" ? "" : "md:hidden")} data-testid="day-view">
            <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="أيام الأسبوع">
              {days.map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={d === anchor}
                  onClick={() => go(d)}
                  className={cn("flex min-h-11 min-w-16 shrink-0 flex-col items-center justify-center rounded-md border px-2 text-xs", d === anchor ? "border-foreground font-medium" : "border-border text-muted-foreground")}
                >
                  {shortDay.format(asUtcNoon(d))}
                  <Mono className="text-[11px]">{(byDay.get(d) ?? []).length}</Mono>
                </button>
              ))}
            </div>
            <h2 className="text-sm font-medium">{dayFmt.format(asUtcNoon(anchor))}</h2>
            {(byDay.get(anchor) ?? []).length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">لا مواعيد في هذا اليوم.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {(byDay.get(anchor) ?? []).map((s) => (
                  <li key={s.id}>
                    <SlotBlock slot={s} tz={tz} onOpen={setOpen} className="w-full" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <SlotSheet slot={open} tz={tz} onClose={() => setOpen(null)} />
    </div>
  );
}

function HourRail({ lo, hi }: { lo: number; hi: number }) {
  const hours = Array.from({ length: (hi - lo) / 60 }, (_, i) => lo / 60 + i);
  return (
    <div className="relative" style={{ height: ((hi - lo) / 60) * HOUR_PX }}>
      {hours.map((h, i) => (
        <div key={h} className="absolute inset-x-0 border-t border-border px-2 text-[11px] text-muted-foreground" style={{ top: i * HOUR_PX }}>
          <Mono>{String(h).padStart(2, "0")}:00</Mono>
        </div>
      ))}
    </div>
  );
}

function DayColumn({ slots, lo, hi, tz, onOpen }: { slots: Slot[]; lo: number; hi: number; tz: string; onOpen: (s: Slot) => void }) {
  const hours = (hi - lo) / 60;
  return (
    <div className="relative border-s border-border" style={{ height: hours * HOUR_PX }}>
      {Array.from({ length: hours }, (_, i) => (
        <div key={i} aria-hidden className="absolute inset-x-0 border-t border-border" style={{ top: i * HOUR_PX }} />
      ))}
      {slots.map((s) => {
        const start = zonedMinutes(Date.parse(s.start_datetime), tz);
        const end = zonedMinutes(Date.parse(s.end_datetime), tz) || 24 * 60;
        return (
          <SlotBlock
            key={s.id}
            slot={s}
            tz={tz}
            onOpen={onOpen}
            className="absolute inset-x-1"
            style={{ top: ((start - lo) / 60) * HOUR_PX + 2, height: Math.max(28, ((end - start) / 60) * HOUR_PX - 4) }}
          />
        );
      })}
    </div>
  );
}

function SlotBlock({ slot, tz, onOpen, className, style }: { slot: Slot; tz: string; onOpen: (s: Slot) => void; className?: string; style?: React.CSSProperties }) {
  const time = new Intl.DateTimeFormat("ar", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: tz, numberingSystem: "latn" });
  const state = slot.status === "held" && slot.is_expired ? "منتهٍ" : SLOT_STATUS_LABELS[slot.status];
  return (
    <button
      type="button"
      onClick={() => onOpen(slot)}
      style={style}
      data-testid="slot-block"
      data-status={slot.status}
      className={cn(
        "flex min-h-11 flex-col items-start overflow-hidden rounded-sm border bg-background px-1.5 py-1 text-start text-xs hover:bg-muted lg:min-h-0",
        slot.status === "booked" && "border-solid border-foreground/70",
        slot.status === "held" && "border-dashed border-foreground/60",
        slot.status === "cancelled" && "border-dotted border-border text-muted-foreground line-through",
        slot.is_expired && "text-muted-foreground",
        className,
      )}
    >
      <span className="flex w-full items-baseline gap-1">
        <Mono>{time.format(Date.parse(slot.start_datetime))}</Mono>
        <span className="ms-auto text-[11px] text-muted-foreground">{state}</span>
      </span>
      <span className="w-full truncate">{slot.product.name}</span>
      <span className="w-full truncate text-muted-foreground">{slot.customer_name}</span>
    </button>
  );
}

function SlotSheet({ slot, tz, onClose }: { slot: Slot | null; tz: string; onClose: () => void }) {
  const cancel = useCancelSlot();
  const [confirm, setConfirm] = useState(false);
  const when = new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: tz, numberingSystem: "latn" });
  return (
    <Sheet open={slot !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="left" className="w-full p-0 sm:max-w-md" data-testid="slot-sheet">
        {slot ? (
          <div className="flex flex-col gap-5 p-5">
            <div className="flex flex-col gap-1">
              <SheetTitle>{slot.product.name}</SheetTitle>
              <SheetDescription>
                {when.format(Date.parse(slot.start_datetime))} · بتوقيت المتجر (<Mono>{tz}</Mono>)
              </SheetDescription>
            </div>
            <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 border-y border-border py-4 text-sm">
              <dt className="text-muted-foreground">الحالة</dt>
              <dd data-testid="slot-status">{slot.status === "held" && slot.is_expired ? "محتجز — منتهي المهلة" : SLOT_STATUS_LABELS[slot.status]}</dd>
              <dt className="text-muted-foreground">العميل</dt>
              <dd>{slot.customer_name || "—"}</dd>
              <dt className="text-muted-foreground">الهاتف</dt>
              <dd>{slot.customer_phone ? <Mono>{slot.customer_phone}</Mono> : "—"}</dd>
              {slot.held_until ? (
                <>
                  <dt className="text-muted-foreground">محتجز حتى</dt>
                  <dd>
                    <Mono>{when.format(Date.parse(slot.held_until))}</Mono>
                  </dd>
                </>
              ) : null}
              <dt className="text-muted-foreground">الطلب</dt>
              <dd>
                {slot.order_id ? (
                  <Link href={`/dashboard/orders/${slot.order_id}`} className="underline underline-offset-4" data-testid="slot-order">
                    <Mono>#{slot.order_id}</Mono>
                  </Link>
                ) : (
                  "بلا طلب بعد"
                )}
              </dd>
            </dl>
            {slot.status === "booked" ? (
              <Button type="button" variant="outline" className="h-11 self-start text-destructive lg:h-9" onClick={() => setConfirm(true)} data-testid="slot-cancel">
                إلغاء الحجز
              </Button>
            ) : null}
            <Dialog open={confirm} onOpenChange={setConfirm}>
              <DialogContent className="sm:max-w-sm">
                <DialogTitle>إلغاء الحجز</DialogTitle>
                <DialogDescription>يعود الموعد متاحاً للحجز. لا يُلغى الطلب المرتبط تلقائياً.</DialogDescription>
                <DialogFooter>
                  <Button type="button" variant="outline" className="h-11 lg:h-9" onClick={() => setConfirm(false)}>
                    تراجع
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-11 lg:h-9"
                    disabled={cancel.isPending}
                    data-testid="slot-cancel-confirm"
                    onClick={async () => {
                      try {
                        const r = await cancel.mutateAsync(slot.id);
                        toast.success(r.detail, { description: r.order_effect ?? undefined });
                        setConfirm(false);
                        onClose();
                      } catch (e) {
                        toast.error(isApiError(e) ? e.userMessage : "تعذّر إلغاء الحجز.");
                      }
                    }}
                  >
                    إلغاء الحجز
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
