"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Field, numericInputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { useCurrentShift, useOpenShift, usePendingShifts, usePosContext, useRegisters, useResolveVariance } from "@/features/pos/api";
import { decimalInput, type Register, type Shift } from "@/features/pos/schemas";
import { useOnline } from "@/features/pos/components/pos-frame";

/**
 * `/pos` — US-16.1: location → register (available / busy by name) → `opening_float` →
 * the sale screen. A shift already open for this cashier resumes (US-16.1.3); a
 * force-closed one is announced before a new one starts (US-16.4.4).
 */
export function OpenShiftScreen() {
  const router = useRouter();
  const online = useOnline();
  const ctx = usePosContext();
  const current = useCurrentShift();
  const [location, setLocation] = useState<number | null>(null);
  const [registerId, setRegisterId] = useState<number | null>(null);
  const [float, setFloat] = useState("");
  const [floatError, setFloatError] = useState<string | undefined>();
  const open = useOpenShift();

  const locations = ctx.data?.locations ?? [];
  const effectiveLocation = location ?? (locations.length === 1 ? locations[0]!.id : null);
  const registers = useRegisters(effectiveLocation);

  useEffect(() => {
    if (current.data?.status === "open") router.replace("/pos/sell");
  }, [current.data, router]);

  if (ctx.isError) return <ErrorState error={ctx.error} onRetry={() => void ctx.refetch()} className="m-4" />;
  if (!ctx.data || current.isPending) {
    return (
      <div className="mx-auto grid w-full max-w-3xl gap-3 p-4" aria-busy>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  async function submit() {
    if (!registerId) return;
    const parsed = decimalInput.safeParse(float);
    if (!parsed.success) {
      setFloatError(parsed.error.issues[0]?.message);
      return;
    }
    setFloatError(undefined);
    try {
      await open.mutateAsync({ register_id: registerId, opening_float: parsed.data });
      router.replace("/pos/sell");
    } catch (err) {
      if (isApiError(err) && err.fields?.opening_float) setFloatError(err.fields.opening_float[0]);
      else toast.error(isApiError(err) ? err.userMessage : "تعذّر فتح الوردية.");
    }
  }

  const pending = current.data?.status === "pending_manager_approval" ? current.data : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6" data-testid="pos-open">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">فتح وردية</h1>
        <p className="text-sm text-muted-foreground">اختر الموقع وجهاز الكاش، ثم أدخل الرصيد الافتتاحي في الدرج.</p>
      </div>

      {ctx.data.force_closed_notice ? (
        <div role="status" className="rounded-lg border border-border p-4 text-sm" data-testid="pos-force-closed">
          <p className="font-medium">أُغلقت ورديتك السابقة قسرياً</p>
          <p className="text-muted-foreground">
            أغلق النظام الوردية <Mono>#{ctx.data.force_closed_notice.shift_id}</Mono> على «{ctx.data.force_closed_notice.register_name}» في{" "}
            <Mono>{formatDate(ctx.data.force_closed_notice.closed_at, { dateStyle: "medium", timeStyle: "short" })}</Mono> لبقائها مفتوحة. ابدأ وردية جديدة.
          </p>
        </div>
      ) : null}

      {pending ? (
        <div className="rounded-lg border border-border p-4 text-sm" data-testid="pos-pending">
          <p className="font-medium">ورديتك بانتظار اعتماد المدير</p>
          <p className="text-muted-foreground">
            عجز <Mono>{pending.display_variance}</Mono> على «{pending.register.name}». لا يمكن فتح وردية جديدة قبل أن يحسمه المدير.
          </p>
        </div>
      ) : locations.length === 0 ? (
        <EmptyState title="لست معيَّناً على موقع فيه نقطة بيع" description="اطلب من مالك المتجر تعيينك على فرع مفعَّلة فيه «نقطة بيع» من صفحة المواقع." />
      ) : (
        <>
          {locations.length > 1 ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">الموقع</legend>
              <div className="flex flex-wrap gap-2">
                {locations.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    aria-pressed={effectiveLocation === l.id}
                    onClick={() => {
                      setLocation(l.id);
                      setRegisterId(null);
                    }}
                    className={cn("h-12 rounded-lg border px-4 text-sm transition-colors", effectiveLocation === l.id ? "border-foreground bg-muted font-medium" : "border-border hover:bg-muted")}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          {effectiveLocation !== null ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">جهاز الكاش</legend>
              {registers.isPending ? (
                <Skeleton className="h-28" />
              ) : registers.isError ? (
                <ErrorState error={registers.error} onRetry={() => void registers.refetch()} />
              ) : registers.data.length === 0 ? (
                <EmptyState title="لا أجهزة كاش في هذا الموقع — أضفها من المواقع" />
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border" data-testid="pos-registers">
                  {registers.data.map((r) => (
                    <RegisterRow key={r.id} r={r} selected={registerId === r.id} onSelect={() => setRegisterId(r.id)} onResume={() => router.replace("/pos/sell")} />
                  ))}
                </ul>
              )}
            </fieldset>
          ) : null}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Field label="الرصيد الافتتاحي" htmlFor="opening-float" error={floatError} hint="النقد الموجود في الدرج عند البدء." className="sm:w-64">
              <input
                id="opening-float"
                inputMode="decimal"
                dir="ltr"
                value={float}
                onChange={(e) => setFloat(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submit();
                }}
                placeholder="200.00"
                aria-invalid={floatError ? true : undefined}
                className={cn(numericInputClass, "h-12 md:h-12")}
              />
            </Field>
            <Button type="button" className="h-12 px-6 text-base" disabled={!registerId || open.isPending || !online} onClick={() => void submit()} data-testid="pos-open-submit">
              {open.isPending ? "جارٍ الفتح…" : "فتح الوردية"}
            </Button>
          </div>
          {!online ? <p className="text-sm text-muted-foreground">لا يمكن فتح وردية دون اتصال.</p> : null}
        </>
      )}

      {ctx.data.can_resolve_variance ? <PendingVariances /> : null}
    </div>
  );
}

function RegisterRow({ r, selected, onSelect, onResume }: { r: Register; selected: boolean; onSelect: () => void; onResume: () => void }) {
  const busy = r.open_shift && !r.open_shift.is_mine;
  const mine = r.open_shift?.is_mine;
  const disabled = Boolean(busy) || !r.is_active;
  return (
    <li>
      <button
        type="button"
        disabled={disabled && !mine}
        onClick={mine ? onResume : onSelect}
        aria-pressed={selected}
        data-testid={`pos-register-${r.id}`}
        className={cn("flex min-h-14 w-full items-center gap-3 px-4 py-2 text-start transition-colors", selected ? "bg-muted" : "hover:bg-muted/60", disabled && !mine && "cursor-not-allowed opacity-70 hover:bg-transparent")}
      >
        <span aria-hidden className={cn("size-2 shrink-0 rounded-full", busy || !r.is_active ? "bg-muted-foreground" : "bg-foreground")} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{r.name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {!r.is_active ? "معطّل — لا تُفتح عليه وردية جديدة" : busy ? `مشغول — ${r.open_shift!.staff_name}` : mine ? "ورديتك مفتوحة عليه — استكمل" : "متاح"}
          </span>
        </span>
        {r.open_shift ? <Mono className="text-xs text-muted-foreground">{formatDate(r.open_shift.opened_at, { dateStyle: "short", timeStyle: "short" })}</Mono> : null}
      </button>
    </li>
  );
}

/** A manager at the till settles a cashier's shortage (US-16.4.2, `resolve-variance`). */
function PendingVariances() {
  const pending = usePendingShifts(true);
  const resolve = useResolveVariance();
  if (!pending.data?.length) return null;
  async function act(s: Shift, decision: "approved" | "rejected") {
    try {
      await resolve.mutateAsync({ shiftId: s.id, decision, version: s.version });
      toast.success(decision === "approved" ? "اعتُمد الفرق وأُغلقت الوردية." : "رُفض تبرير الفرق وأُغلقت الوردية.");
    } catch (err) {
      toast.error(isApiError(err) ? err.userMessage : "تعذّر حسم الفرق.");
    }
  }
  return (
    <section className="flex flex-col gap-2 border-t border-border pt-6" data-testid="pos-pending-variances">
      <h2 className="text-base font-medium">ورديات بانتظار اعتمادك</h2>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {pending.data.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1 text-sm">
              <Mono>#{s.id}</Mono> · {s.staff_name} · {s.register.name}
              <span className="block text-xs text-muted-foreground">
                المتوقع <Mono>{s.display_expected_closing}</Mono> · المعدود <Mono>{s.display_actual_closing}</Mono> · الفرق <Mono className="text-destructive">{s.display_variance}</Mono>
              </span>
            </span>
            <Button variant="outline" className="h-12 px-4" disabled={resolve.isPending} onClick={() => void act(s, "rejected")}>
              رفض
            </Button>
            <Button className="h-12 px-4" disabled={resolve.isPending} onClick={() => void act(s, "approved")}>
              اعتماد
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
