"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Field, numericInputClass } from "@/components/shared/field";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { Button, buttonVariants } from "@/components/ui/button";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { useCloseShift } from "@/features/pos/api";
import { clearCartsOfRegister } from "@/features/pos/cart-store";
import { usePosStore } from "@/features/pos/components/pos-provider";
import { useOnline } from "@/features/pos/components/pos-frame";
import { ShiftSummary } from "@/features/pos/components/drawer-screen";
import { ShiftGuard } from "@/features/pos/components/shift-guard";
import { SHIFT_STATUS_LABELS, decimalInput, type Shift } from "@/features/pos/schemas";

/**
 * `/pos/shift/close` — US-16.4.2/3, FR-16.09: the preview first (opening, cash sales,
 * refunds, cash in/out, expected), then the physical count. The server computes the
 * variance; a shortage parks the shift at «بانتظار اعتماد المدير» with the gap shown in
 * the semantic colour, zero or over closes it with the shift summary.
 */
export function CloseShiftScreen() {
  const [result, setResult] = useState<Shift | null>(null);
  if (result) return <Outcome shift={result} />;
  return <ShiftGuard allowPending>{(shift) => (shift.status === "open" ? <CloseForm shift={shift} onDone={setResult} /> : <Outcome shift={shift} />)}</ShiftGuard>;
}

function CloseForm({ shift, onDone }: { shift: Shift; onDone: (s: Shift) => void }) {
  const store = usePosStore();
  const online = useOnline();
  const close = useCloseShift(shift.id);
  const [actual, setActual] = useState("");
  const [error, setError] = useState<string | undefined>();

  async function submit() {
    const parsed = decimalInput.safeParse(actual);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    try {
      const res = await close.mutateAsync({ actual_closing: parsed.data });
      clearCartsOfRegister(store, shift.register.id);
      onDone(res.shift);
    } catch (err) {
      if (isApiError(err) && err.fields?.actual_closing) setError(err.fields.actual_closing[0]);
      else toast.error(isApiError(err) ? err.userMessage : "تعذّر إغلاق الوردية.");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-4 md:p-6" data-testid="pos-close">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">إغلاق الوردية</h1>
        <p className="text-sm text-muted-foreground">
          راجع المعاينة ثم عُدّ النقد في الدرج وأدخل المبلغ الفعلي. يحسب الخادم الفرق.
        </p>
      </div>
      <section className="surface-card p-5 lg:p-6" aria-label="معاينة الإغلاق">
        <ShiftSummary shift={shift} />
      </section>
      <Field label="المبلغ المعدود فعلياً" htmlFor="actual-closing" error={error}>
        <input
          id="actual-closing"
          inputMode="decimal"
          dir="ltr"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          placeholder="0.00"
          aria-invalid={error ? true : undefined}
          className={cn(numericInputClass, "h-12 text-lg md:h-12")}
          data-testid="pos-actual"
        />
      </Field>
      <Button className="h-12 text-base" disabled={close.isPending || !online} onClick={() => void submit()} data-testid="pos-close-submit">
        {close.isPending ? "جارٍ الإغلاق…" : "إغلاق الوردية"}
      </Button>
      {!online ? <p className="text-sm text-muted-foreground">لا يمكن إغلاق وردية دون اتصال.</p> : null}
    </div>
  );
}

function Outcome({ shift }: { shift: Shift }) {
  const shortage = shift.variance_kind === "shortage";
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 p-4 md:p-6" data-testid="pos-close-result">
      <div className="flex flex-col gap-1">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span aria-hidden className={cn("size-2 rounded-full", shortage ? "bg-destructive" : "bg-primary")} />
          الوردية <Mono>#{shift.id}</Mono> · <span data-testid="pos-close-status">{SHIFT_STATUS_LABELS[shift.status]}</span>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{shortage ? "عجز في الدرج — بانتظار اعتماد المدير" : "أُغلقت الوردية"}</h1>
      </div>
      <dl className="grid gap-1 surface-card p-5 lg:p-6 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">المتوقع</dt>
          <dd>
            <Money value={shift.display_expected_closing} />
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">المعدود</dt>
          <dd>
            <Money value={shift.display_actual_closing} />
          </dd>
        </div>
        <div className="flex justify-between border-t border-border pt-2">
          <dt className="font-medium">الفرق</dt>
          <dd>
            <Money value={shift.display_variance} className={cn("text-lg font-semibold", shortage && "text-destructive")} />
          </dd>
        </div>
      </dl>
      {shortage ? (
        <p className="text-sm text-muted-foreground">
          أُرسل طلب «عجز وردية» {shift.approval ? <Mono>#{shift.approval.id}</Mono> : null} إلى المدير. البيع موقوف على هذا الجهاز حتى يُحسم.
        </p>
      ) : null}
      <section className="surface-card p-5 lg:p-6" aria-label="ملخص الوردية">
        <p className="mb-2 text-sm font-medium">
          ملخص الوردية · <Mono>{shift.sales_count}</Mono> عملية بيع نقدية
        </p>
        <ShiftSummary shift={shift} />
      </section>
      {shift.status === "closed" ? (
        <Link href="/pos" className={buttonVariants({ className: "h-12 text-base" })}>
          فتح وردية جديدة
        </Link>
      ) : null}
    </div>
  );
}
