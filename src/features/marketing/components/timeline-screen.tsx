"use client";

import Link from "next/link";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AccessGate } from "@/components/shared/access-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { useCampaigns, useDeleteEvent, useOffers, useSaveEvent, useTimeline } from "@/features/marketing/api";
import { applyServerErrors, BackToHub, ConfirmDialog, errorMessage, OwnerGate } from "@/features/marketing/components/shared";
import { CAMPAIGN_STATUS_LABELS, EVENT_COLOR_HEX, EVENT_COLOR_LABELS, EVENT_COLORS, EVENT_TYPE_LABELS, EVENT_TYPES, eventInputSchema, type EventInput, type MarketingEvent } from "@/features/marketing/schemas";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * US-13.5.1 — the marketing timeline: one row per month (newest first), events as thin bars
 * positioned by day; the merchant's colour is a 2px start border only (M13 §11 I). An event
 * spanning months is split into one bar per month. Below md the same data is a list.
 */
const urlParsers = { event: parseAsInteger, new: parseAsString };

type MonthKey = string; // "2026-10"
const monthKey = (d: string) => d.slice(0, 7);
const MIN_SPAN = 5;
const daysIn = (key: MonthKey) => { const [y, m] = key.split("-").map(Number); return new Date(y!, m!, 0).getDate(); };
const monthLabel = (key: MonthKey) => { const [y, m] = key.split("-").map(Number); return new Intl.DateTimeFormat("ar", { month: "long", year: "numeric", numberingSystem: "latn" }).format(new Date(y!, m! - 1, 1)); };
const shiftMonth = (key: MonthKey, by: number) => { const [y, m] = key.split("-").map(Number); const d = new Date(y!, m! - 1 + by, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export function TimelineScreen() {
  return (
    <AccessGate feature="timeline">
      <OwnerGate description="الجدول الزمني مقصور على مالك المتجر.">
        <Inner />
      </OwnerGate>
    </AccessGate>
  );
}

function Inner() {
  const [url, setUrl] = useQueryStates(urlParsers, { history: "replace" });
  const events = useTimeline();
  const rows = useMemo(() => events.data ?? [], [events.data]);
  const today = todayKey();

  const months = useMemo(() => {
    const keys = new Set<MonthKey>();
    const cur = monthKey(today);
    [-1, 0, 1, 2].forEach((by) => keys.add(shiftMonth(cur, by)));
    for (const e of rows) {
      let k = monthKey(e.start_date);
      const last = monthKey(e.end_date);
      while (k <= last) { keys.add(k); k = shiftMonth(k, 1); }
    }
    return [...keys].sort((a, b) => b.localeCompare(a));
  }, [rows, today]);

  const selected = url.event !== null ? rows.find((e) => e.id === url.event) ?? null : null;
  const sheetOpen = url.event !== null || url.new !== null;

  return (
    <div className="flex flex-col gap-5" data-testid="timeline-screen">
      <BackToHub />
      <PageHeader title="الجدول الزمني" description="المواسم والمناسبات والحملات المخططة — شهر في كل صف، الأحدث أولاً." actions={<Button type="button" className="h-11 lg:h-9" onClick={() => void setUrl({ new: "1", event: null })} data-testid="new-event">حدث جديد</Button>} />
      {events.isLoading ? <div className="flex flex-col gap-3" aria-busy>{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div> : null}
      {events.isError ? <ErrorState error={events.error} onRetry={() => void events.refetch()} /> : null}
      {events.data && rows.length === 0 ? <EmptyState title="لا أحداث على الجدول" description="أضف المواسم والمناسبات القادمة لتخطيط العروض والحملات حولها." action={<Button type="button" className="h-11 lg:h-9" onClick={() => void setUrl({ new: "1" })}>حدث جديد</Button>} /> : null}
      {events.data && rows.length > 0 ? (
        <>
          <ol className="hidden flex-col divide-y divide-border/60 surface-card md:flex overflow-hidden" aria-label="الأشهر" data-testid="timeline-months">
            {months.map((m) => (
              <MonthRow key={m} month={m} events={rows} today={today} onOpen={(id) => void setUrl({ event: id, new: null })} />
            ))}
          </ol>
          <ol className="flex flex-col gap-4 md:hidden" aria-label="الأحداث" data-testid="timeline-list">
            {months.filter((m) => rows.some((e) => monthKey(e.start_date) <= m && monthKey(e.end_date) >= m)).map((m) => (
              <li key={m} className="flex flex-col gap-1">
                <h3 className="text-xs font-medium text-muted-foreground">{monthLabel(m)}</h3>
                <ul className="divide-y divide-border/60 surface-card overflow-hidden">
                  {rows.filter((e) => monthKey(e.start_date) <= m && monthKey(e.end_date) >= m).sort((a, b) => a.start_date.localeCompare(b.start_date)).map((e) => (
                    <li key={e.id}>
                      <button type="button" onClick={() => void setUrl({ event: e.id, new: null })} className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-start" style={{ borderInlineStartWidth: 2, borderInlineStartColor: EVENT_COLOR_HEX[e.color] }}>
                        <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-sm">{e.title}</span><span className="text-xs text-muted-foreground">{EVENT_TYPE_LABELS[e.event_type]} · {formatDate(e.start_date)} → {formatDate(e.end_date)}</span></span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </>
      ) : null}
      <EventSheet open={sheetOpen} event={selected} onClose={() => void setUrl({ event: null, new: null })} />
    </div>
  );
}

function MonthRow({ month, events, today, onOpen }: { month: MonthKey; events: MarketingEvent[]; today: string; onOpen: (id: number) => void }) {
  const days = daysIn(month);
  const inMonth = events.filter((e) => monthKey(e.start_date) <= month && monthKey(e.end_date) >= month).sort((a, b) => a.start_date.localeCompare(b.start_date));
  // Pack bars into lanes so overlapping events stack (max 4 lanes shown, rest counted).
  const lanes: Array<Array<{ e: MarketingEvent; from: number; to: number }>> = [];
  for (const e of inMonth) {
    const from = monthKey(e.start_date) === month ? Number(e.start_date.slice(8)) : 1;
    const realTo = monthKey(e.end_date) === month ? Number(e.end_date.slice(8)) : days;
    // A bar spans its real days, but never fewer than MIN_SPAN columns so a one-day event keeps a readable label.
    const to = Math.min(days, Math.max(realTo, from + MIN_SPAN - 1));
    const lane = lanes.find((l) => l.every((x) => x.to < from || x.from > to)) ?? (lanes.push([]), lanes[lanes.length - 1]!);
    lane.push({ e, from, to });
  }
  const isCurrent = monthKey(today) === month;
  const todayDay = isCurrent ? Number(today.slice(8)) : null;
  return (
    <li className={cn("grid grid-cols-[8rem_minmax(0,1fr)] gap-3 px-3 py-2", isCurrent && "bg-muted/40")} data-month={month}>
      <div className="flex flex-col pt-0.5">
        <span className="text-sm font-medium">{monthLabel(month)}</span>
        <Mono className="text-[11px] text-muted-foreground">{inMonth.length} {inMonth.length === 1 ? "حدث" : "أحداث"}</Mono>
      </div>
      <div className="relative flex min-h-9 flex-col gap-1" style={{ ["--days" as string]: days }}>
        {todayDay ? <span aria-hidden className="pointer-events-none absolute inset-y-0 w-px bg-foreground/60" style={{ insetInlineStart: `calc((${todayDay} - 0.5) / var(--days) * 100%)` }} /> : null}
        {lanes.length === 0 ? <span className="self-start text-xs text-muted-foreground/60">—</span> : null}
        {lanes.slice(0, 4).map((lane, li) => (
          <div key={li} className="grid" style={{ gridTemplateColumns: `repeat(var(--days), minmax(0, 1fr))` }}>
            {lane.map(({ e, from, to }) => (
              <button
                key={e.id}
                type="button"
                onClick={() => onOpen(e.id)}
                title={`${e.title} · ${formatDate(e.start_date)} → ${formatDate(e.end_date)}`}
                className="flex h-6 min-w-0 items-center truncate rounded-sm border-s-2 bg-muted px-1.5 text-xs hover:bg-muted/70"
                style={{ gridColumn: `${from} / ${to + 1}`, borderInlineStartColor: EVENT_COLOR_HEX[e.color] }}
                data-testid="timeline-bar"
                data-event={e.id}
              >
                <span className="truncate">{e.title}</span>
              </button>
            ))}
          </div>
        ))}
        {lanes.length > 4 ? <span className="text-[11px] text-muted-foreground">+{lanes.length - 4} أخرى</span> : null}
      </div>
    </li>
  );
}

function toInput(e: MarketingEvent | null): EventInput {
  const today = todayKey();
  return { title: e?.title ?? "", event_type: e?.event_type ?? "custom", color: e?.color ?? "indigo", start_date: e?.start_date ?? today, end_date: e?.end_date ?? today, linked_campaign_id: e?.linked_campaign ? String(e.linked_campaign.id) : "", linked_offer_id: e?.linked_offer ? String(e.linked_offer.id) : "", notes: e?.notes ?? "" };
}

function EventSheet({ open, event, onClose }: { open: boolean; event: MarketingEvent | null; onClose: () => void }) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="left" className="w-full gap-0 overflow-y-auto p-5 data-[side=left]:w-full data-[side=left]:sm:max-w-md" data-testid="event-sheet">
        <SheetHeader className="p-0 pb-4">
          <SheetTitle>{event ? event.title : "حدث جديد"}</SheetTitle>
          <SheetDescription>{event ? `${EVENT_TYPE_LABELS[event.event_type]} · ${formatDate(event.start_date)} → ${formatDate(event.end_date)}` : "موسم أو مناسبة أو خطة حملة على الجدول."}</SheetDescription>
        </SheetHeader>
        {open ? <EventForm key={event?.id ?? "new"} event={event} onDone={onClose} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function EventForm({ event, onDone }: { event: MarketingEvent | null; onDone: () => void }) {
  const save = useSaveEvent();
  const remove = useDeleteEvent();
  const campaigns = useCampaigns({});
  const offers = useOffers({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const form = useForm<EventInput>({ resolver: zodResolver(eventInputSchema), defaultValues: toInput(event) });
  const { register, control, formState: { errors } } = form;
  const color = useWatch({ control, name: "color" });
  const notes = useWatch({ control, name: "notes" });

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    try {
      await save.mutateAsync({ id: event?.id ?? null, json: { ...v, linked_campaign_id: v.linked_campaign_id || null, linked_offer_id: v.linked_offer_id || null } });
      toast.success(event ? "حُفظ الحدث" : "أُضيف الحدث");
      onDone();
    } catch (err) {
      if (!applyServerErrors(form, err)) setFormError(errorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {event?.linked_campaign || event?.linked_offer ? (
        <dl className="flex flex-col gap-1 border-b border-border pb-3 text-sm">
          {event.linked_campaign ? <div className="flex justify-between gap-3"><dt className="text-muted-foreground">الحملة</dt><dd><Link href={`/dashboard/marketing/campaigns/${event.linked_campaign.id}`} className="hover:underline">{event.linked_campaign.name}</Link> <span className="text-xs text-muted-foreground">· {CAMPAIGN_STATUS_LABELS[event.linked_campaign.status]}</span></dd></div> : null}
          {event.linked_offer ? <div className="flex justify-between gap-3"><dt className="text-muted-foreground">العرض</dt><dd><Link href={`/dashboard/marketing/offers/${event.linked_offer.id}`} className="hover:underline">{event.linked_offer.name}</Link> <span className="text-xs text-muted-foreground">· {event.linked_offer.is_active ? "فعّال" : "غير فعّال"}</span></dd></div> : null}
        </dl>
      ) : null}
      <Field label="العنوان" htmlFor="title" error={errors.title?.message} required>
        <input id="title" {...register("title")} className={inputClass} aria-invalid={!!errors.title} data-testid="event-title" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="النوع" htmlFor="event_type" required>
          <NativeSelect id="event_type" {...register("event_type")} className="h-11 lg:h-9">{EVENT_TYPES.map((t) => <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>)}</NativeSelect>
        </Field>
        <Field label="اللون" htmlFor="color" required>
          <span className="flex items-center gap-2">
            <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ backgroundColor: EVENT_COLOR_HEX[color] }} />
            <NativeSelect id="color" {...register("color")} className="h-11 flex-1 lg:h-9">{EVENT_COLORS.map((c) => <option key={c} value={c}>{EVENT_COLOR_LABELS[c]}</option>)}</NativeSelect>
          </span>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="من" htmlFor="start_date" error={errors.start_date?.message} required><input id="start_date" type="date" {...register("start_date")} className={inputClass} dir="ltr" data-testid="event-start" /></Field>
        <Field label="إلى" htmlFor="end_date" error={errors.end_date?.message} required><input id="end_date" type="date" {...register("end_date")} className={inputClass} dir="ltr" aria-invalid={!!errors.end_date} data-testid="event-end" /></Field>
      </div>
      <Field label="ربط بحملة" htmlFor="linked_campaign_id" hint="اختياري.">
        <NativeSelect id="linked_campaign_id" {...register("linked_campaign_id")} className="h-11 lg:h-9"><option value="">بلا</option>{(campaigns.data?.results ?? []).map((c) => <option key={c.id} value={String(c.id)}>{c.name} · {CAMPAIGN_STATUS_LABELS[c.status]}</option>)}</NativeSelect>
      </Field>
      <Field label="ربط بعرض" htmlFor="linked_offer_id" hint="اختياري.">
        <NativeSelect id="linked_offer_id" {...register("linked_offer_id")} className="h-11 lg:h-9"><option value="">بلا</option>{(offers.data?.results ?? []).map((o) => <option key={o.id} value={String(o.id)}>{o.name}</option>)}</NativeSelect>
      </Field>
      <Field label="ملاحظات" htmlFor="notes" error={errors.notes?.message} counter={{ value: notes.length, max: 300 }}>
        <Textarea id="notes" {...register("notes")} rows={3} />
      </Field>
      {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button type="submit" className="h-11 lg:h-9" disabled={save.isPending} data-testid="event-save">{save.isPending ? "جارٍ الحفظ…" : "حفظ"}</Button>
        <Button type="button" variant="outline" className="h-11 lg:h-9" onClick={onDone}>إلغاء</Button>
        {event ? <Button type="button" variant="ghost" className="ms-auto h-11 text-destructive lg:h-9" onClick={() => setConfirmDelete(true)} data-testid="event-delete">حذف</Button> : null}
      </div>
      {event ? <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title={`حذف «${event.title}»؟`} description="يُحذف من الجدول فقط؛ الحملة أو العرض المرتبط لا يتأثر." confirmLabel="حذف" destructive pending={remove.isPending} onConfirm={() => remove.mutate(event.id, { onSuccess: () => { toast.success("حُذف الحدث"); onDone(); }, onError: (e) => toast.error(errorMessage(e)) })} testId="event-delete-dialog" /> : null}
    </form>
  );
}
