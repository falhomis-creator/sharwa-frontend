"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Field, inputClass, numericInputClass } from "@/components/shared/field";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { Button } from "@/components/ui/button";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { newIdempotencyKey, useAddMovement } from "@/features/pos/api";
import { useOnline } from "@/features/pos/components/pos-frame";
import { ShiftGuard } from "@/features/pos/components/shift-guard";
import { MOVEMENT_LABELS, decimalInput, type Shift } from "@/features/pos/schemas";

/**
 * `/pos/drawer` — US-16.4.1, FR-16.08: the shift's cash movements with their five fixed
 * Arabic labels and a signed Mono amount at the end, the server's running expected
 * balance, and «إدخال نقد / سحب نقد» with a reason.
 */
export function DrawerScreen() {
  return <ShiftGuard allowPending>{(shift) => <Drawer shift={shift} />}</ShiftGuard>;
}

export function ShiftSummary({ shift }: { shift: Shift }) {
  const rows: Array<[string, string]> = [
    ["الرصيد الافتتاحي", shift.display_opening_float],
    ["المبيعات النقدية", shift.display_cash_sales],
    ["الاسترجاعات", shift.display_refunds],
    ["إدخال نقد", shift.display_cash_in],
    ["سحب نقد", shift.display_cash_out],
    ["تعديل تقريب", shift.display_rounding],
  ];
  return (
    <dl className="grid gap-1 text-sm" data-testid="pos-shift-summary">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">{label}</dt>
          <dd>
            <Money value={value} />
          </dd>
        </div>
      ))}
      <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
        <dt className="font-medium">المتوقع في الدرج</dt>
        <dd>
          <Money value={shift.display_expected_closing} className="text-lg font-semibold" />
        </dd>
      </div>
    </dl>
  );
}

function Drawer({ shift }: { shift: Shift }) {
  const online = useOnline();
  const add = useAddMovement(shift.id);
  const [type, setType] = useState<"cash_in" | "cash_out">("cash_in");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ amount?: string; note?: string }>({});
  const [key, setKey] = useState(newIdempotencyKey);
  const open = shift.status === "open";

  async function submit() {
    const parsed = decimalInput.safeParse(amount);
    const next: typeof errors = {};
    if (!parsed.success) next.amount = parsed.error.issues[0]?.message;
    if (!note.trim()) next.note = "اذكر سبب الحركة.";
    setErrors(next);
    if (next.amount || next.note) return;
    try {
      await add.mutateAsync({ movement_type: type, amount: parsed.data!, note: note.trim(), idempotency_key: key });
      toast.success(`سُجِّل «${MOVEMENT_LABELS[type]}».`);
      setAmount("");
      setNote("");
      setKey(newIdempotencyKey());
    } catch (err) {
      if (isApiError(err) && err.fields) setErrors({ amount: err.fields.amount?.[0], note: err.fields.note?.[0] });
      else toast.error(isApiError(err) ? err.userMessage : "لم تُسجَّل الحركة بسبب الشبكة — أعد المحاولة بنفس البيانات.");
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 p-4 md:p-6 lg:grid-cols-[22rem_minmax(0,1fr)]" data-testid="pos-drawer">
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <h1 className="text-lg font-semibold">درج الكاش</h1>
          <ShiftSummary shift={shift} />
        </section>
        {open ? (
          <section className="flex flex-col gap-3 rounded-lg border border-border p-4" aria-label="إضافة حركة">
            <div role="radiogroup" aria-label="نوع الحركة" className="grid grid-cols-2 gap-2">
              {(["cash_in", "cash_out"] as const).map((t) => (
                <button key={t} type="button" role="radio" aria-checked={type === t} onClick={() => setType(t)} className={cn("h-12 rounded-lg border text-sm", type === t ? "border-foreground bg-muted font-medium" : "border-border text-muted-foreground hover:bg-muted")}>
                  {MOVEMENT_LABELS[t]}
                </button>
              ))}
            </div>
            <Field label="المبلغ" htmlFor="mv-amount" error={errors.amount}>
              <input id="mv-amount" inputMode="decimal" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50.00" aria-invalid={errors.amount ? true : undefined} className={cn(numericInputClass, "h-12 md:h-12")} data-testid="mv-amount" />
            </Field>
            <Field label="السبب" htmlFor="mv-note" error={errors.note}>
              <input id="mv-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: فكّة من الإدارة" aria-invalid={errors.note ? true : undefined} className={cn(inputClass, "h-12 md:h-12")} data-testid="mv-note" />
            </Field>
            <Button className="h-12" disabled={add.isPending || !online} onClick={() => void submit()} data-testid="mv-submit">
              {add.isPending ? "جارٍ التسجيل…" : "تسجيل الحركة"}
            </Button>
          </section>
        ) : null}
      </div>

      <section className="flex min-w-0 flex-col gap-2" aria-label="حركات الوردية">
        <h2 className="text-base font-medium">
          حركات الوردية <Mono className="text-muted-foreground">#{shift.id}</Mono>
        </h2>
        {shift.movements.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">لا حركات بعد في هذه الوردية.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm" data-testid="pos-movements">
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start font-normal">النوع</th>
                  <th className="px-3 py-2 text-start font-normal">البيان</th>
                  <th className="hidden px-3 py-2 text-start font-normal sm:table-cell">بواسطة</th>
                  <th className="px-3 py-2 text-start font-normal">الوقت</th>
                  <th className="px-3 py-2 text-end font-normal">المبلغ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shift.movements.map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-2 whitespace-nowrap">{MOVEMENT_LABELS[m.movement_type]}</td>
                    <td className="max-w-56 truncate px-3 py-2 text-muted-foreground">{m.note}</td>
                    <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">{m.actor}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Mono className="text-xs">{formatDate(m.created_at, { dateStyle: "short", timeStyle: "short" })}</Mono>
                    </td>
                    <td className="px-3 py-2 text-end whitespace-nowrap">
                      <Money value={m.display_amount} className={m.direction === "out" ? "text-muted-foreground" : undefined} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
