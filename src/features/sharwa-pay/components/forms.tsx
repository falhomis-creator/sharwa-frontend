"use client";

import { useState } from "react";
import Link from "next/link";
import { inputClass, numericInputClass } from "@/components/shared/field";
import { FilePicker } from "@/components/shared/file-picker";
import { Mono } from "@/components/shared/mono";
import { NativeSelect } from "@/components/ui/native-select";
import { isApiError } from "@/lib/api-error";
import { useTopup, useWithdraw } from "@/features/sharwa-pay/api";
import { RequireWallet, payPrimary, paySecondary } from "@/features/sharwa-pay/components/pay-shell";
import { CURRENCY_LABELS, PAY_CURRENCIES, RECEIPT_EXTENSIONS, RECEIPT_MAX_BYTES, type Wallet } from "@/features/sharwa-pay/schemas";

type Errors = Record<string, string | undefined>;
const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;

function FieldError({ id, text }: { id: string; text?: string }) {
  return text ? (
    <p id={id} className="text-sm text-destructive" data-testid={`err-${id}`}>
      {text}
    </p>
  ) : null;
}

function fieldsOf(err: unknown): Errors {
  if (!isApiError(err)) return { form: "تعذّر الإرسال." };
  if (err.fields) return Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, v[0]]));
  return { form: err.userMessage };
}

/** `/sharwa-pay/topup` (US-40.3, FR-40.05): multipart with the receipt; the server's field errors land under their field. */
export function TopupScreen() {
  return <RequireWallet>{(w) => (w.is_active ? <TopupForm /> : <Suspended />)}</RequireWallet>;
}

function Suspended() {
  return (
    <p role="alert" className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive" data-testid="wallet-inactive">
      المحفظة موقوفة — تواصل مع الدعم.
    </p>
  );
}

function TopupForm() {
  const topup = useTopup();
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState<number | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const local: Errors = {};
    if (!AMOUNT_RE.test(String(form.get("amount") ?? "")) || Number(form.get("amount")) < 0.01) local.amount = "أدخل مبلغاً صحيحاً لا يقل عن 0.01.";
    if (!String(form.get("bank_transaction_id") ?? "").trim()) local.bank_transaction_id = "أدخل رقم العملية البنكية.";
    const file = form.get("receipt_image");
    if (!(file instanceof File) || file.size === 0) local.receipt_image = "أرفق صورة الإيصال.";
    else {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!(RECEIPT_EXTENSIONS as readonly string[]).includes(ext)) local.receipt_image = `الصيغ المسموحة: ${RECEIPT_EXTENSIONS.join(", ")}.`;
      else if (file.size > RECEIPT_MAX_BYTES) local.receipt_image = "حجم الصورة أكبر من 5 ميغابايت.";
    }
    setErrors(local);
    if (Object.keys(local).length) return;
    try {
      const r = await topup.mutateAsync(form);
      setDone(r.id);
    } catch (err) {
      setErrors(fieldsOf(err));
    }
  }

  if (done !== null) {
    return (
      <div className="flex flex-col gap-3" data-testid="topup-done">
        <h1 className="text-xl font-semibold">أُرسل طلب الشحن</h1>
        <p className="text-sm text-muted-foreground">
          الطلب <Mono className="text-foreground">#{done}</Mono> قيد المراجعة، وسيُضاف المبلغ إلى رصيدك بعد قبوله.
        </p>
        <Link href="/sharwa-pay/requests" className={payPrimary}>
          طلباتي
        </Link>
        <Link href="/sharwa-pay" className={paySecondary}>
          المحفظة
        </Link>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate data-testid="topup-form" encType="multipart/form-data">
      <h1 className="text-xl font-semibold">شحن المحفظة</h1>
      <p className="text-sm text-muted-foreground">حوّل المبلغ إلى حساب شروة ثم أرسل رقم العملية وصورة الإيصال.</p>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label className="flex flex-col gap-1.5 text-sm">
          المبلغ
          <input name="amount" inputMode="decimal" dir="ltr" className={`${numericInputClass} h-12`} aria-describedby="amount" data-testid="topup-amount" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          العملة
          <NativeSelect name="currency" className="h-12" defaultValue="SAR" data-testid="topup-currency">
            {PAY_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {CURRENCY_LABELS[c]}
              </option>
            ))}
          </NativeSelect>
        </label>
      </div>
      <FieldError id="amount" text={errors.amount} />
      <FieldError id="currency" text={errors.currency} />
      <label className="flex flex-col gap-1.5 text-sm">
        رقم العملية البنكية
        <input name="bank_transaction_id" dir="ltr" autoComplete="off" className={`${inputClass} h-12 font-mono`} aria-describedby="bank_transaction_id" data-testid="topup-tx" />
      </label>
      <FieldError id="bank_transaction_id" text={errors.bank_transaction_id} />
      <label className="flex flex-col gap-1.5 text-sm">
        ملاحظة (اختياري)
        <input name="reference_note" maxLength={200} className={`${inputClass} h-12`} />
      </label>
      <div className="flex flex-col gap-1.5 text-sm">
        <label htmlFor="topup-receipt">صورة الإيصال</label>
        <FilePicker id="topup-receipt" name="receipt_image" accept=".jpg,.jpeg,.png,.webp,.gif,image/*" buttonClassName="h-12" aria-describedby="receipt_image" data-testid="topup-receipt" />
        <span className="text-xs text-muted-foreground">jpg، png، webp أو gif حتى 5 ميغابايت.</span>
      </div>
      <FieldError id="receipt_image" text={errors.receipt_image} />
      <FieldError id="form" text={errors.form ?? errors.detail} />
      <button type="submit" className={payPrimary} disabled={topup.isPending} data-testid="topup-submit">
        إرسال الطلب
      </button>
    </form>
  );
}

/** `/sharwa-pay/withdraw` (US-40.4): debited at once, reversed if rejected; over-balance refused locally AND by the server. */
export function WithdrawScreen() {
  return <RequireWallet>{(w) => (w.is_active ? <WithdrawForm w={w} /> : <Suspended />)}</RequireWallet>;
}

function WithdrawForm({ w }: { w: Wallet }) {
  const withdraw = useWithdraw();
  const [currency, setCurrency] = useState<string>("SAR");
  const [amount, setAmount] = useState("");
  const [dest, setDest] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState<{ id: number; after: string } | null>(null);
  const row = w.balances.find((b) => b.currency === currency);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const local: Errors = {};
    if (!AMOUNT_RE.test(amount) || Number(amount) < 0.01) local.amount = "أدخل مبلغاً صحيحاً لا يقل عن 0.01.";
    // A comparison against the server's own figure — not arithmetic on money (FR-40.03).
    else if (row?.balance !== undefined && Number(amount) > Number(row.balance)) local.amount = "الرصيد غير كافٍ.";
    if (dest.trim().length < 6) local.payout_destination = "أدخل بيانات الحساب المستقبِل كاملة.";
    setErrors(local);
    if (Object.keys(local).length) return;
    try {
      const r = await withdraw.mutateAsync({ amount, currency, payout_destination: dest.trim() });
      setDone({ id: r.id, after: r.display_balance_after });
    } catch (err) {
      setErrors(fieldsOf(err));
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-3" data-testid="withdraw-done">
        <h1 className="text-xl font-semibold">أُرسل طلب السحب</h1>
        <p className="text-sm text-muted-foreground">
          خُصم المبلغ من رصيدك الآن (الرصيد <Mono className="text-foreground">{done.after}</Mono>)، والطلب <Mono className="text-foreground">#{done.id}</Mono> قيد المراجعة. يُعاد المبلغ تلقائياً إن رُفض.
        </p>
        <Link href="/sharwa-pay/requests" className={payPrimary}>
          طلباتي
        </Link>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate data-testid="withdraw-form">
      <h1 className="text-xl font-semibold">سحب من المحفظة</h1>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label className="flex flex-col gap-1.5 text-sm">
          المبلغ
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" dir="ltr" className={`${numericInputClass} h-12`} data-testid="withdraw-amount" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          العملة
          <NativeSelect className="h-12" value={currency} onChange={(e) => setCurrency(e.target.value)} data-testid="withdraw-currency">
            {PAY_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {CURRENCY_LABELS[c]}
              </option>
            ))}
          </NativeSelect>
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        المتاح بهذه العملة <Mono className="text-foreground" data-testid="withdraw-available">{row?.display_balance}</Mono>
      </p>
      <FieldError id="amount" text={errors.amount} />
      <label className="flex flex-col gap-1.5 text-sm">
        الحساب المستقبِل
        <input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="البنك — رقم الحساب، أو المحفظة — الرقم" className={`${inputClass} h-12`} data-testid="withdraw-dest" />
      </label>
      <FieldError id="payout_destination" text={errors.payout_destination} />
      <FieldError id="form" text={errors.form ?? errors.detail ?? errors.currency} />
      <button type="submit" className={payPrimary} disabled={withdraw.isPending} data-testid="withdraw-submit">
        طلب السحب
      </button>
    </form>
  );
}
