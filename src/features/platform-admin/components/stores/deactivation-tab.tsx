"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/shared/error-state";
import { formatDate, formatDateTime } from "@/lib/format";
import { isApiError } from "@/lib/api-error";
import { useDeactivation, useDeactivationAction } from "@/features/platform-admin/api/hooks";
import { useCanWrite } from "@/features/platform-admin/components/admin-session";
import { Code, ConfirmDialog, ReadOnlyNote, StatusText, toastError } from "@/features/platform-admin/components/bits";
import { DEACTIVATION_ACTION_LABELS, DEACTIVATION_LABELS, type DeactivationAction, type DeactivationStatus } from "@/features/platform-admin/schemas";
import { toast } from "sonner";

/**
 * Deactivation lifecycle (M20 US-20.7 a2): suspended → deactivated → closed (after the
 * custody is settled), or reinstate. The server lists the transitions it allows; the
 * forbidden ones stay visible, disabled, with the server's reason (FR-20.06).
 */
const TONE: Record<DeactivationStatus, "warning" | "destructive" | "muted"> = { suspended: "warning", deactivated: "destructive", closed: "muted" };

const IMPACT: Record<DeactivationAction, string> = {
  suspend: "يتوقف المتجر عن استقبال الطلبات وتُغلق واجهته للمشترين حتى نهاية المهلة أو إعادة التفعيل.",
  deactivate: "يُعطَّل المتجر نهائياً قبل الإغلاق؛ تبقى بياناته محفوظة.",
  close: "الإغلاق نهائي ولا رجعة فيه بعد تسوية العهدة.",
  reinstate: "يعود المتجر نشطاً ويستقبل الطلبات فوراً.",
};

export function DeactivationTab({ schema, storeName }: { schema: string; storeName: string }) {
  const q = useDeactivation(schema);
  const act = useDeactivationAction(schema);
  const canWrite = useCanWrite("stores");
  const [action, setAction] = useState<DeactivationAction | null>(null);
  const [reason, setReason] = useState("");
  const [grace, setGrace] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (q.error) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (!q.data) return <Skeleton className="h-48 w-full" />;
  const { current, history, options } = q.data;

  function open(a: DeactivationAction) {
    setAction(a);
    setReason("");
    setGrace("");
    setErrors({});
  }

  async function confirm() {
    if (!action) return;
    setErrors({});
    try {
      await act.mutateAsync({ action, reason: reason.trim() || undefined, grace_period_ends_at: action === "suspend" ? grace : undefined });
      toast.success(`${DEACTIVATION_ACTION_LABELS[action]}: «${storeName}».`);
      setAction(null);
    } catch (err) {
      if (isApiError(err) && err.fields) {
        setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, v[0] ?? ""])));
      } else {
        toastError(err);
        setAction(null);
      }
    }
  }

  return (
    <div className="flex flex-col gap-6" data-testid="deactivation-tab">
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">الحالة الحالية</h2>
        {current ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 surface-card p-5 lg:p-6 text-sm md:grid-cols-4" data-testid="deactivation-current">
            <div className="flex flex-col gap-1">
              <dt className="text-xs text-muted-foreground">الحالة</dt>
              <dd>
                <StatusText tone={TONE[current.status]}>{DEACTIVATION_LABELS[current.status]}</StatusText>
              </dd>
            </div>
            <div className="col-span-2 flex flex-col gap-1 md:col-span-1">
              <dt className="text-xs text-muted-foreground">السبب</dt>
              <dd>{current.reason || "—"}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs text-muted-foreground">نهاية المهلة</dt>
              <dd className="text-xs">{current.grace_period_ends_at ? formatDate(current.grace_period_ends_at) : "—"}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs text-muted-foreground">تسوية العهدة</dt>
              <dd>{current.settled_custody ? <StatusText tone="success">مسوّاة</StatusText> : <StatusText tone="warning">غير مسوّاة</StatusText>}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm">
            <StatusText tone="success">نشط — لا سجل تعطيل مفتوح</StatusText>
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">الانتقالات</h2>
        <ul className="flex flex-col divide-y divide-border/60 surface-card overflow-hidden">
          {options.map((o) => (
            <li key={o.action} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" data-testid={`lifecycle-${o.action}`}>
              <span className="text-sm">{DEACTIVATION_ACTION_LABELS[o.action]}</span>
              <span className="flex flex-col items-start gap-1 sm:items-end">
                <Button
                  variant={o.action === "reinstate" ? "outline" : "destructive"}
                  size="sm"
                  className="h-11 lg:h-7"
                  disabled={!canWrite || !o.allowed}
                  onClick={() => open(o.action)}
                  data-testid={`lifecycle-${o.action}-button`}
                >
                  {DEACTIVATION_ACTION_LABELS[o.action]}
                </Button>
                {!o.allowed && o.reason ? (
                  <span className="text-xs text-muted-foreground" data-testid={`lifecycle-${o.action}-reason`}>
                    {o.reason}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        {!canWrite ? <ReadOnlyNote /> : null}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">السجل</h2>
        {history.length ? (
          <ul className="divide-y divide-border/60 surface-card text-sm overflow-hidden">
            {history.map((h) => (
              <li key={h.id} className="flex flex-col gap-1 px-4 py-2 md:flex-row md:items-center md:gap-4">
                <StatusText tone={TONE[h.status]}>{DEACTIVATION_LABELS[h.status]}</StatusText>
                <span className="min-w-0 flex-1">{h.reason}</span>
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  <time dateTime={h.updated_at}>{formatDateTime(h.updated_at)}</time> · <Code>{h.by}</Code>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">لا سجل تعطيل.</p>
        )}
      </section>

      <ConfirmDialog
        open={action !== null}
        onOpenChange={(o) => !o && setAction(null)}
        title={action ? `${DEACTIVATION_ACTION_LABELS[action]} «${storeName}»` : ""}
        impact={action ? IMPACT[action] : null}
        destructive={action !== "reinstate"}
        confirmLabel={action ? DEACTIVATION_ACTION_LABELS[action] : ""}
        pending={act.isPending}
        disabled={action === "suspend" && (!reason.trim() || !grace)}
        onConfirm={() => void confirm()}
        testId="deactivation-dialog"
      >
        {action === "suspend" ? (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              السبب
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} aria-invalid={Boolean(errors.reason)} data-testid="suspend-reason" />
              {errors.reason ? <span className="text-xs text-destructive">{errors.reason}</span> : null}
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              نهاية المهلة
              <Input type="date" dir="ltr" value={grace} onChange={(e) => setGrace(e.target.value)} className="h-11 font-mono lg:h-8" aria-invalid={Boolean(errors.grace_period_ends_at)} data-testid="suspend-grace" />
              {errors.grace_period_ends_at ? (
                <span className="text-xs text-destructive" data-testid="grace-error">
                  {errors.grace_period_ends_at}
                </span>
              ) : null}
            </label>
          </div>
        ) : action === "deactivate" || action === "close" ? (
          <label className="flex flex-col gap-1.5 text-sm">
            ملاحظة (اختيارية)
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} />
          </label>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
