"use client";

import { useDeferredValue, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass, numericInputClass } from "@/components/shared/field";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { newIdempotencyKey, usePosContext, useReceipt, useReceipts, useRefund } from "@/features/pos/api";
import { ReceiptView } from "@/features/pos/components/receipt-view";
import { ShiftGuard } from "@/features/pos/components/shift-guard";
import { PAYMENT_METHOD_LABELS, decimalInput, otpRequiredSchema } from "@/features/pos/schemas";

/** `/pos/receipts` — the current shift's receipts, searched by number (§6). */
export function ReceiptsScreen() {
  return <ShiftGuard allowPending>{() => <ReceiptList />}</ShiftGuard>;
}

function ReceiptList() {
  const [q, setQ] = useState("");
  const deferred = useDeferredValue(q.trim());
  const list = useReceipts(deferred);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 md:p-6" data-testid="pos-receipts">
      <h1 className="text-2xl font-semibold tracking-tight">إيصالات الوردية</h1>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث برقم الإيصال" aria-label="ابحث برقم الإيصال" className={cn(inputClass, "h-12 md:h-12")} />
      {list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : !list.data ? (
        <Skeleton className="h-40" />
      ) : list.data.results.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">{deferred ? "لا إيصال بهذا الرقم في الوردية الحالية." : "لا إيصالات بعد في هذه الوردية."}</p>
      ) : (
        <ul className="divide-y divide-border/60 surface-card overflow-hidden">
          {list.data.results.map((r) => (
            <li key={r.id}>
              <Link href={`/pos/receipts/${r.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-muted" data-testid="pos-receipt-row">
                <Mono className="text-sm">{r.number}</Mono>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  <Mono>{formatDate(r.created_at, { dateStyle: "short", timeStyle: "short" })}</Mono> · <Mono>{r.items_count}</Mono> قطعة · {PAYMENT_METHOD_LABELS[r.payment_method]}
                  {r.display_refunded ? (
                    <>
                      {" "}
                      · مُسترد <Mono>{r.display_refunded}</Mono>
                    </>
                  ) : null}
                </span>
                <Money value={r.display_total} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** `/pos/receipts/[id]` — the receipt, print, and the refund path with OTP step-up (US-16.3.2). */
export function ReceiptScreen({ id }: { id: number }) {
  const receipt = useReceipt(id);
  const ctx = usePosContext();
  const params = useSearchParams();
  const print = params.get("print") === "1";

  useEffect(() => {
    if (print && receipt.data) {
      const t = window.setTimeout(() => window.print(), 300);
      return () => window.clearTimeout(t);
    }
  }, [print, receipt.data]);

  if (receipt.isError) return <ErrorState error={receipt.error} onRetry={() => void receipt.refetch()} className="m-4" />;
  if (!receipt.data) return <Skeleton className="m-4 h-96" />;
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 p-4 md:grid-cols-[minmax(0,1fr)_18rem] md:p-6 print:block print:p-0">
      <div className="rounded-lg border border-border p-4 print:border-0">
        <ReceiptView receipt={receipt.data} />
      </div>
      <div className="flex flex-col gap-3 print:hidden">
        <Button variant="outline" className="h-12" onClick={() => window.print()}>
          طباعة
        </Button>
        <Link href="/pos/receipts" className="flex h-12 items-center justify-center rounded-lg text-sm text-muted-foreground hover:bg-muted">
          كل إيصالات الوردية
        </Link>
        {/* FR-16.12: no `orders.refund` → the refund path is hidden, not disabled. */}
        {ctx.data?.can_refund && receipt.data.refundable_amount !== "0.00" ? <RefundPanel id={id} max={receipt.data.display_refundable} /> : null}
      </div>
    </div>
  );
}

function RefundPanel({ id, max }: { id: number; max: string }) {
  const refund = useRefund(id);
  const [amount, setAmount] = useState("");
  const [otp, setOtp] = useState("");
  const [challenge, setChallenge] = useState<{ detail: string; sent_to: string } | null>(null);
  const [error, setError] = useState<{ amount?: string; otp?: string; general?: string }>({});
  const [key, setKey] = useState(newIdempotencyKey);

  async function submit() {
    const parsed = decimalInput.safeParse(amount);
    if (!parsed.success) {
      setError({ amount: parsed.error.issues[0]?.message });
      return;
    }
    setError({});
    try {
      await refund.mutateAsync({ amount: parsed.data, otp_code: challenge ? otp : undefined, idempotency_key: key });
      toast.success("سُجِّل الاسترجاع في درج الكاش.");
      setAmount("");
      setOtp("");
      setChallenge(null);
      setKey(newIdempotencyKey());
    } catch (err) {
      if (!isApiError(err)) {
        setError({ general: "لم يكتمل الاسترجاع بسبب الشبكة — أعد المحاولة (لن يتكرر)." });
        return;
      }
      const otpReq = otpRequiredSchema.safeParse(err.body);
      if (err.status === 428 && otpReq.success) {
        setChallenge({ detail: otpReq.data.detail, sent_to: otpReq.data.sent_to });
        return;
      }
      if (err.fields?.otp_code) setError({ otp: err.fields.otp_code[0] });
      else if (err.fields?.amount) setError({ amount: err.fields.amount[0] });
      else setError({ general: err.userMessage });
    }
  }

  return (
    <section className="flex flex-col gap-3 surface-card p-5 lg:p-6" aria-label="استرجاع" data-testid="pos-refund">
      <p className="text-sm font-medium">استرجاع</p>
      <p className="text-xs text-muted-foreground">
        القابل للاسترجاع <Mono>{max}</Mono>
      </p>
      <Field label="المبلغ" htmlFor="refund-amount" error={error.amount}>
        <input id="refund-amount" inputMode="decimal" dir="ltr" value={amount} disabled={challenge !== null} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={cn(numericInputClass, "h-12 md:h-12")} data-testid="refund-amount" />
      </Field>
      {challenge ? (
        <Field label="رمز التحقق" htmlFor="refund-otp" error={error.otp} hint={<>{challenge.detail} (<Mono>{challenge.sent_to}</Mono>)</>}>
          <input id="refund-otp" inputMode="numeric" dir="ltr" autoComplete="one-time-code" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} className={cn(numericInputClass, "h-12 tracking-[0.3em] md:h-12")} data-testid="refund-otp" autoFocus />
        </Field>
      ) : null}
      {error.general ? (
        <p role="alert" className="text-sm text-destructive" data-testid="refund-error">
          {error.general}
        </p>
      ) : null}
      <Button className="h-12" disabled={refund.isPending || (challenge !== null && otp.length < 6)} onClick={() => void submit()} data-testid="refund-submit">
        {refund.isPending ? "جارٍ التنفيذ…" : challenge ? "تأكيد الاسترجاع" : "استرجاع"}
      </Button>
      {challenge ? (
        <button type="button" className="h-11 text-xs text-muted-foreground underline underline-offset-4" onClick={() => setChallenge(null)}>
          إلغاء
        </button>
      ) : null}
    </section>
  );
}
