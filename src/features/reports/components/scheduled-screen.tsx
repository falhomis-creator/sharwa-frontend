"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { AccessGate } from "@/components/shared/access-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useCreateSchedule, useDeleteSchedule, usePatchSchedule, useReportIndex, useSchedules } from "@/features/reports/api";
import { canOpenReport } from "@/features/reports/permissions";
import { FREQUENCIES, FREQUENCY_LABELS, FREQUENCY_SENTENCE, scheduleFormSchema, type Schedule, type ScheduleForm } from "@/features/reports/schemas";

/**
 * `/dashboard/reports/scheduled` (M25 US-25.4): subscriptions that email a report daily,
 * weekly or monthly. The email is validated locally (FR-25.08); `next_run_at` is the
 * server's, shown with `Intl.DateTimeFormat('ar')` as «يُرسل كل أسبوع — التالي: …».
 */
export function ScheduledScreen() {
  return (
    <AccessGate feature="reports" permission="reports.view">
      <ScheduledBody />
    </AccessGate>
  );
}

const NEXT_RUN = new Intl.DateTimeFormat("ar", { numberingSystem: "latn", weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });

export function scheduleSentence(s: Pick<Schedule, "frequency" | "is_active" | "next_run_at">): string {
  if (!s.is_active || !s.next_run_at) return `${FREQUENCY_SENTENCE[s.frequency]} — متوقف مؤقتاً`;
  return `${FREQUENCY_SENTENCE[s.frequency]} — التالي: ${NEXT_RUN.format(new Date(s.next_run_at))}`;
}

function ScheduledBody() {
  const query = useSchedules();
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Schedule | null>(null);
  const del = useDeleteSchedule();

  const addButton = (
    <Button className="h-11 lg:h-9" onClick={() => setOpen(true)} data-testid="schedule-new">
      <Plus className="size-4" aria-hidden /> اشتراك جديد
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="التقارير المجدولة" description="تقارير تصلك بالبريد يومياً أو أسبوعياً أو شهرياً دون فتح اللوحة." actions={addButton} />
      {query.isLoading ? (
        <div className="flex flex-col gap-2" aria-busy>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : query.error || !query.data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.results.length === 0 ? (
        <EmptyState title="لا تقارير مجدولة بعد" description="أضف اشتراكاً ليصلك تقرير المبيعات أو المخزون بالبريد في موعده." action={addButton} />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border" data-testid="schedules-list">
          {query.data.results.map((s) => (
            <ScheduleLine key={s.id} schedule={s} onDelete={() => setToDelete(s)} />
          ))}
        </ul>
      )}

      <ScheduleDialog open={open} onOpenChange={setOpen} />

      <Dialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent>
          <DialogTitle>حذف الاشتراك؟</DialogTitle>
          <DialogDescription>
            لن يصل «{toDelete?.report_title}» إلى <Mono>{toDelete?.email}</Mono> بعد الآن.
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" className="h-11 lg:h-9" onClick={() => setToDelete(null)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              className="h-11 lg:h-9"
              disabled={del.isPending}
              data-testid="schedule-delete-confirm"
              onClick={() =>
                toDelete &&
                del.mutate(toDelete.id, {
                  onSuccess: () => {
                    toast.success("حُذف الاشتراك.");
                    setToDelete(null);
                  },
                  onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر الحذف."),
                })
              }
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScheduleLine({ schedule: s, onDelete }: { schedule: Schedule; onDelete: () => void }) {
  const patch = usePatchSchedule();
  return (
    <li className="flex flex-col gap-2 px-3 py-3 md:flex-row md:items-center md:gap-4" data-testid="schedule-row" data-id={s.id}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link href={`/dashboard/reports/${s.report_code}`} className="font-medium hover:underline">
          {s.report_title}
        </Link>
        <span className={cn("text-sm", s.is_active ? "text-muted-foreground" : "text-warning")} data-testid="schedule-sentence">
          {scheduleSentence(s)}
        </span>
      </div>
      <Mono className="truncate text-sm text-muted-foreground">{s.email}</Mono>
      <div className="flex items-center gap-2">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm lg:min-h-8">
          <Switch
            checked={s.is_active}
            disabled={patch.isPending}
            onCheckedChange={(v) =>
              patch.mutate(
                { id: s.id, is_active: v },
                {
                  onSuccess: () => toast.success(v ? "استُؤنف الإرسال." : "أُوقف الإرسال مؤقتاً."),
                  onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ."),
                },
              )
            }
            data-testid="schedule-active"
          />
          {s.is_active ? "نشط" : "متوقف"}
        </label>
        <Button variant="ghost" className="size-11 lg:size-8" aria-label={`حذف اشتراك ${s.report_title}`} onClick={onDelete} data-testid="schedule-delete">
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>
    </li>
  );
}

function ScheduleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { session } = useAccess();
  const index = useReportIndex();
  const create = useCreateSchedule();
  const form = useForm<ScheduleForm>({ resolver: zodResolver(scheduleFormSchema), defaultValues: { report_code: "", frequency: "weekly", email: "" } });
  const subject = { kind: session.kind, features: session.features, permissions: session.staff?.permissions };
  const groups = (index.data ?? [])
    .map((c) => ({ ...c, reports: c.reports.filter((r) => r.status === "available" && r.allowed && canOpenReport(subject, r.code, c.category)) }))
    .filter((c) => c.reports.length > 0);
  const errors = form.formState.errors;

  const submit = form.handleSubmit((values) =>
    create.mutate(values, {
      onSuccess: () => {
        toast.success("أُضيف الاشتراك.");
        form.reset();
        onOpenChange(false);
      },
      onError: (e) => {
        if (isApiError(e) && e.fields) {
          const keys = Object.keys(e.fields).filter((k): k is keyof ScheduleForm => k === "report_code" || k === "frequency" || k === "email");
          keys.forEach((k, i) => form.setError(k, { message: String(e.fields?.[k]?.[0] ?? "") }, { shouldFocus: i === 0 }));
          if (keys.length) return;
        }
        toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ.");
      },
    }),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) form.reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogTitle>اشتراك جديد</DialogTitle>
        <DialogDescription>يُرسل التقرير إلى البريد المستلم في الساعة 7 صباحاً بتوقيت المتجر.</DialogDescription>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate data-testid="schedule-form">
          <Field label="التقرير" htmlFor="report_code" error={errors.report_code?.message} required>
            <NativeSelect id="report_code" className="h-11 md:h-8" aria-invalid={Boolean(errors.report_code)} {...form.register("report_code")}>
              <option value="">اختر تقريراً</option>
              {groups.map((c) => (
                <optgroup key={c.category} label={c.title}>
                  {c.reports.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </NativeSelect>
          </Field>
          <Field label="التكرار" htmlFor="frequency" error={errors.frequency?.message} required>
            <NativeSelect id="frequency" className="h-11 md:h-8" {...form.register("frequency")}>
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {FREQUENCY_LABELS[f]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="البريد المستلم" htmlFor="email" error={errors.email?.message} required>
            <input id="email" type="email" dir="ltr" inputMode="email" autoComplete="email" className={cn(inputClass, "font-mono")} aria-invalid={Boolean(errors.email)} {...form.register("email")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 lg:h-9" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" className="h-11 lg:h-9" disabled={create.isPending} data-testid="schedule-submit">
              إضافة الاشتراك
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
