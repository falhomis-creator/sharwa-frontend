"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { useAvailability, useSaveAvailability } from "@/features/bookings/api";
import { toMinutes, validateWindows, type Availability, type DraftWindow } from "@/features/bookings/schemas";
import { BACKEND_WEEKDAY_LABELS, displayOrder } from "@/features/bookings/weekdays";

/**
 * M26 US-26.1 — `/dashboard/bookings/services/[id]/availability`: seven days (in the store's
 * week order) × any number of windows. Local checks first (end after start, no overlap —
 * FR-26.03), then `PUT` the full set; the server re-validates and its row errors land back
 * under the rows. Weekday numbers are the backend's (0 = Monday) end to end.
 */
let keySeq = 0;
const newKey = () => `w${++keySeq}`;

export function AvailabilityScreen({ productId }: { productId: number }) {
  const q = useAvailability(productId);
  if (q.isPending) return <Skeleton className="h-[30rem] w-full" />;
  if (q.isError) return <ErrorState title={isApiError(q.error) && q.error.status === 404 ? "الخدمة غير موجودة" : undefined} error={q.error} onRetry={() => void q.refetch()} />;
  // Remount on every server answer (load, save): the draft starts from what the server holds.
  return <Editor key={`${productId}:${JSON.stringify(q.data.results)}`} data={q.data} productId={productId} />;
}

function Editor({ data, productId }: { data: Availability; productId: number }) {
  const save = useSaveAvailability(productId);
  const initial = useMemo(() => data.results.map((w) => ({ key: newKey(), ...w })), [data]);
  const [rows, setRows] = useState<DraftWindow[]>(initial);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const errors = { ...validateWindows(rows), ...serverErrors };
  const duration = data.product.booking_duration_minutes ?? 0;
  const dirty = JSON.stringify(rows.map((r) => ({ weekday: r.weekday, start_time: r.start_time, end_time: r.end_time }))) !== JSON.stringify(data.results);

  const update = (key: string, patch: Partial<DraftWindow>) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setServerErrors({});
  };

  async function submit() {
    if (Object.keys(validateWindows(rows)).length) return;
    const ordered = [...rows];
    try {
      await save.mutateAsync(ordered.map(({ weekday, start_time, end_time }) => ({ weekday, start_time, end_time })));
      toast.success("حُفظت ساعات التوفر");
      setServerErrors({});
    } catch (e) {
      const body = isApiError(e) ? (e.body as { results?: Array<Record<string, string[]>> } | undefined) : undefined;
      if (body?.results) {
        const next: Record<string, string> = {};
        body.results.forEach((r, i) => {
          const msg = Object.values(r).flat()[0];
          if (msg && ordered[i]) next[ordered[i]!.key] = msg;
        });
        setServerErrors(next);
      }
      toast.error(isApiError(e) ? (e.detail ?? "تحقق من النوافذ المعلّمة.") : "تعذّر الحفظ.");
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div className="flex flex-col gap-1.5 border-b border-border pb-5">
        <Link href="/dashboard/bookings/services" className="inline-flex min-h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground lg:min-h-0">
          <ArrowRight className="size-4 ltr:rotate-180" aria-hidden /> الخدمات
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">ساعات توفر «{data.product.name}»</h1>
        <p className="text-sm text-muted-foreground">
          مدة الموعد <Mono>{duration || "—"}</Mono> دقيقة · الأوقات بتوقيت المتجر (<Mono>{data.timezone}</Mono>) · يبدأ الأسبوع يوم {data.week_start_day === "sunday" ? "الأحد" : "الاثنين"}
        </p>
      </div>

      <ul className="flex flex-col divide-y divide-border border-y border-border" data-testid="availability-days">
        {displayOrder(data.week_start_day).map((weekday) => {
          const day = rows.filter((r) => r.weekday === weekday);
          return (
            <li key={weekday} className="flex flex-col gap-3 py-4 md:flex-row md:items-start" data-testid="availability-day" data-weekday={weekday}>
              <p className="w-28 shrink-0 pt-2 text-sm font-medium">{BACKEND_WEEKDAY_LABELS[weekday]}</p>
              <div className="flex flex-1 flex-col gap-2">
                {day.length === 0 ? <p className="pt-2 text-sm text-muted-foreground">غير متاح</p> : null}
                {day.map((r) => {
                  const err = errors[r.key];
                  const short = !errors[r.key] && duration > 0 && toMinutes(r.end_time) - toMinutes(r.start_time) < duration;
                  return (
                    <div key={r.key} className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="sr-only" htmlFor={`${r.key}-s`}>
                          من
                        </label>
                        <input
                          id={`${r.key}-s`}
                          type="time"
                          dir="ltr"
                          step={300}
                          value={r.start_time}
                          onChange={(e) => update(r.key, { start_time: e.target.value })}
                          aria-invalid={Boolean(err)}
                          className={cn("h-11 w-32 rounded-md border border-input bg-background px-2 font-mono text-sm tabular-nums lg:h-8", err && "border-destructive")}
                          data-testid="window-start"
                        />
                        <span className="text-sm text-muted-foreground">إلى</span>
                        <label className="sr-only" htmlFor={`${r.key}-e`}>
                          إلى
                        </label>
                        <input
                          id={`${r.key}-e`}
                          type="time"
                          dir="ltr"
                          step={300}
                          value={r.end_time}
                          onChange={(e) => update(r.key, { end_time: e.target.value })}
                          aria-invalid={Boolean(err)}
                          className={cn("h-11 w-32 rounded-md border border-input bg-background px-2 font-mono text-sm tabular-nums lg:h-8", err && "border-destructive")}
                          data-testid="window-end"
                        />
                        <Button type="button" variant="ghost" size="icon" className="size-11 lg:size-8" aria-label="حذف النافذة" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </div>
                      {err ? (
                        <p className="text-xs text-destructive" data-testid="window-error">
                          {err}
                        </p>
                      ) : short ? (
                        <p className="text-xs text-muted-foreground">النافذة أقصر من مدة الموعد — لن تُولَّد منها مواعيد.</p>
                      ) : null}
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 gap-1.5 self-start px-2 text-sm lg:h-8"
                  onClick={() => {
                    const last = day.at(-1);
                    const start = last ? last.end_time : "09:00";
                    const endMin = Math.min(toMinutes(start) + 180, 23 * 60 + 55);
                    setRows((rs) => [...rs, { key: newKey(), weekday, start_time: start, end_time: `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}` }]);
                  }}
                  data-testid="add-window"
                >
                  <Plus className="size-4" aria-hidden /> أضف نافذة
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {dirty ? (
        <div role="region" aria-label="حفظ التغييرات" className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-background lg:bottom-0 lg:start-auto lg:end-0 lg:w-[calc(100%-16rem)]" data-testid="save-bar">
          <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-3 lg:px-6">
            <p className="flex-1 text-sm">تغييرات غير محفوظة</p>
            <Button type="button" variant="ghost" className="h-11 lg:h-9" onClick={() => setRows(initial)}>
              تجاهل
            </Button>
            <Button type="button" className="h-11 lg:h-9" disabled={save.isPending} onClick={() => void submit()} data-testid="availability-save">
              {save.isPending ? "جارٍ الحفظ…" : "حفظ"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
