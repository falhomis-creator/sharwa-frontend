"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useSyncExternalStore } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, inputClass, numericInputClass } from "@/components/shared/field";
import { Money } from "@/components/shared/money";
import { isApiError } from "@/lib/api-error";
import { toWesternDigits } from "@/lib/format";
import { useTopup } from "@/features/wallets/api";
import { MANUAL_REASONS, WALLET_REASON_LABELS, topupSchema, type TopupInput } from "@/features/wallets/schemas";

/**
 * «تعبئة» (M35 US-35.2): amount, one of the three manual reasons, a note (required when
 * deducting), a confirm for negative adjustments. A Sheet on desktop, a bottom Drawer with
 * a numeric keypad input on phones. One `idempotency_key` per opening and the button
 * disabled while the request runs — the double-click protection (FR-35.09, SC-35.5).
 */
const MD = "(min-width: 768px)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(MD);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useIsDesktop = () => useSyncExternalStore(subscribe, () => window.matchMedia(MD).matches, () => true);

export function TopupPanel({
  open,
  onOpenChange,
  walletId,
  customerName,
  balance,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletId: number;
  customerName: string;
  balance: string;
}) {
  const desktop = useIsDesktop();
  const title = `تعبئة محفظة ${customerName}`;
  const body = open ? <TopupForm key={walletId} walletId={walletId} balance={balance} onDone={() => onOpenChange(false)} /> : null;
  if (desktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-full gap-0 overflow-y-auto p-5 data-[side=left]:sm:max-w-md" data-testid="topup-panel">
          <SheetHeader className="p-0 pb-4">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>المبلغ والسبب والملاحظة تُسجَّل في دفتر الحركات باسمك.</SheetDescription>
          </SheetHeader>
          {body}
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent data-testid="topup-panel">
        <DrawerHeader className="border-b border-border text-start">
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{body}</div>
      </DrawerContent>
    </Drawer>
  );
}

function TopupForm({ walletId, balance, onDone }: { walletId: number; balance: string; onDone: () => void }) {
  const topup = useTopup(walletId);
  // One key per opening (the form remounts with the panel): a double submit replays the same transaction.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [confirmNegative, setConfirmNegative] = useState(false);
  const form = useForm<TopupInput>({ resolver: zodResolver(topupSchema), defaultValues: { amount: "", reason: "manual_topup", note: "" } });
  const amount = useWatch({ control: form.control, name: "amount" });
  const reason = useWatch({ control: form.control, name: "reason" });
  const negative = Number(toWesternDigits(amount || "0")) < 0;

  const submit = form.handleSubmit(async (values) => {
    if (negative && !confirmNegative) {
      setConfirmNegative(true);
      return;
    }
    try {
      const res = await topup.mutateAsync({ amount: Number(toWesternDigits(values.amount)).toFixed(2), reason: values.reason, note: values.note || undefined, idempotency_key: idempotencyKey });
      toast.success(`تم ${negative ? "الخصم" : "التعبئة"} — الرصيد الآن ${res.display_balance}`);
      onDone();
    } catch (e) {
      if (isApiError(e) && e.fields) {
        for (const [k, msg] of Object.entries(e.fields)) form.setError(k as keyof TopupInput, { message: String(msg) });
      } else {
        toast.error(isApiError(e) ? e.userMessage : "تعذّرت التعبئة — تحقق من الدفتر قبل إعادة المحاولة.");
      }
    }
  });

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-4" data-testid="topup-form">
      <p className="text-sm text-muted-foreground">
        الرصيد الحالي <Money value={balance} className="text-foreground" />
      </p>
      <Field label="المبلغ (ر.س)" htmlFor="topup-amount" required error={form.formState.errors.amount?.message} hint={reason === "adjustment" ? "تسوية سالبة تخصم من الرصيد؛ تحتاج ملاحظة." : undefined}>
        <input
          id="topup-amount"
          inputMode="decimal"
          dir="ltr"
          autoComplete="off"
          placeholder="50.00"
          {...form.register("amount", { onChange: () => setConfirmNegative(false) })}
          className={numericInputClass}
          aria-invalid={Boolean(form.formState.errors.amount)}
        />
      </Field>
      <Field label="السبب" htmlFor="topup-reason" required error={form.formState.errors.reason?.message}>
        <NativeSelect id="topup-reason" {...form.register("reason", { onChange: () => setConfirmNegative(false) })} className="h-11 md:h-8">
          {MANUAL_REASONS.map((r) => (
            <option key={r} value={r}>
              {WALLET_REASON_LABELS[r]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={negative ? "الملاحظة (مطلوبة عند الخصم)" : "ملاحظة"} htmlFor="topup-note" required={negative} error={form.formState.errors.note?.message}>
        <textarea id="topup-note" rows={2} maxLength={200} {...form.register("note")} className={`${inputClass} h-auto py-2`} />
      </Field>
      {confirmNegative ? (
        <p role="alert" className="rounded-lg border border-border p-3 text-sm text-warning" data-testid="topup-confirm">
          سيُخصم من رصيد العميل. اضغط «تأكيد الخصم» للمتابعة.
        </p>
      ) : null}
      <Button type="submit" className="h-11 lg:h-9" disabled={topup.isPending} data-testid="topup-submit">
        {topup.isPending ? "يُرسل…" : confirmNegative ? "تأكيد الخصم" : negative ? "خصم" : "تعبئة"}
      </Button>
    </form>
  );
}
