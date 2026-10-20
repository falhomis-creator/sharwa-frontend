"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Field, numericInputClass } from "@/components/shared/field";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { isApiError } from "@/lib/api-error";
import { compareDecimal } from "@/lib/decimal";
import { toWesternDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCreateWithdrawal, useMerchantWallet, usePayoutAccounts } from "@/features/payments/api";
import {
  ACCOUNT_TYPE_LABELS,
  CURRENCIES,
  CURRENCY_SHORT,
  withdrawalInputSchema,
  type Currency,
  type MerchantWallet,
  type PayoutAccount,
  type WithdrawalInput,
} from "@/features/payments/schemas";
import { BackLink, PaymentsGate } from "@/features/payments/components/shared";

/**
 * `/dashboard/wallet/withdrawals/new` (M14 US-14.4.2, FR-14.04, SC-14.5): one of the four
 * currencies, an amount checked locally against that currency's AVAILABLE balance (decimal
 * text, never a float), a receiving account from the active ones, a warning when a request
 * is already pending in that currency, and an explicit confirm before the POST.
 */
export function NewWithdrawalScreen() {
  return (
    <PaymentsGate anyOf={["merchantwallet"]}>
      <Loader />
    </PaymentsGate>
  );
}

function Loader() {
  const wallet = useMerchantWallet();
  const accounts = usePayoutAccounts("all");
  const body =
    wallet.isLoading || accounts.isLoading ? (
      <div className="flex max-w-xl flex-col gap-3" aria-busy>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    ) : wallet.error || accounts.error || !wallet.data || !accounts.data ? (
      <ErrorState
        error={wallet.error ?? accounts.error}
        onRetry={() => {
          void wallet.refetch();
          void accounts.refetch();
        }}
      />
    ) : accounts.data.results.filter((a) => a.is_active).length === 0 ? (
      <EmptyState
        title="لا حساب استلام نشط"
        description="أضف حساباً بنكياً أو محفظة محلية وفعّله لتستلم عليه المبلغ."
        action={
          <Link href="/dashboard/payments/payout-accounts" className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")}>
            إضافة حساب
          </Link>
        }
      />
    ) : (
      <WithdrawalForm wallet={wallet.data} accounts={accounts.data.results.filter((a) => a.is_active)} />
    );
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/dashboard/wallet">محفظة المتجر</BackLink>
      <PageHeader title="طلب سحب" description="يُراجع الطلب من إدارة شروة ثم يُحوَّل المبلغ إلى الحساب الذي تختاره." />
      {body}
    </div>
  );
}

function WithdrawalForm({ wallet, accounts }: { wallet: MerchantWallet; accounts: PayoutAccount[] }) {
  const router = useRouter();
  const [requested] = useQueryState("currency", parseAsStringLiteral(CURRENCIES));
  const initial: Currency = requested ?? wallet.balances.find((b) => compareDecimal(b.available, "0") > 0)?.currency ?? "SAR";
  const create = useCreateWithdrawal();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [confirming, setConfirming] = useState<WithdrawalInput | null>(null);
  const form = useForm<WithdrawalInput>({
    resolver: zodResolver(withdrawalInputSchema),
    defaultValues: { currency: initial, amount: "", payout_account_id: accounts.length === 1 ? String(accounts[0]!.id) : "" },
  });
  const currency = useWatch({ control: form.control, name: "currency" });
  const balance = wallet.balances.find((b) => b.currency === currency)!;
  const errors = form.formState.errors;

  const review = form.handleSubmit((values) => {
    const amount = toWesternDigits(values.amount).trim();
    if (compareDecimal(amount, balance.available) > 0) {
      form.setError("amount", { message: `المبلغ أكبر من المتاح للسحب (${balance.display_available}).` });
      form.setFocus("amount");
      return;
    }
    if (!accounts.some((a) => String(a.id) === values.payout_account_id)) {
      form.setError("payout_account_id", { message: "اختر حساباً نشطاً." });
      return;
    }
    setConfirming({ ...values, amount });
  });

  async function send() {
    if (!confirming) return;
    try {
      const res = await create.mutateAsync({ currency: confirming.currency, amount: confirming.amount, payout_account_id: Number(confirming.payout_account_id), idempotency_key: idempotencyKey });
      toast.success(`أُرسل طلب السحب #${res.id} — قيد المراجعة`);
      router.push("/dashboard/wallet/withdrawals");
    } catch (e) {
      setConfirming(null);
      if (isApiError(e) && e.fields) {
        for (const [k, msg] of Object.entries(e.fields)) form.setError(k as keyof WithdrawalInput, { message: msg[0] });
      } else toast.error(isApiError(e) ? e.userMessage : "تعذّر إرسال الطلب — تحقق من قائمة الطلبات قبل إعادة المحاولة.");
    }
  }

  const account = confirming ? accounts.find((a) => String(a.id) === confirming.payout_account_id) : null;

  return (
    <form onSubmit={(e) => void review(e)} noValidate className="flex max-w-xl flex-col gap-5" data-testid="withdrawal-form">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">العملة</legend>
        <div className="divide-y divide-border/60 surface-card overflow-hidden">
          {wallet.balances.map((b) => {
            const zero = compareDecimal(b.available, "0") <= 0;
            return (
              <label key={b.currency} className={cn("flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2", zero && "cursor-not-allowed opacity-60")} title={zero ? "لا رصيد متاح بهذه العملة" : undefined}>
                <input type="radio" value={b.currency} disabled={zero} {...form.register("currency", { onChange: () => form.clearErrors("amount") })} className="size-4 accent-foreground" data-testid={`wd-currency-${b.currency}`} />
                <span className="flex w-28 flex-col">
                  <Mono className="text-sm font-medium">{b.currency}</Mono>
                  <span className="text-xs text-muted-foreground">{CURRENCY_SHORT[b.currency]}</span>
                </span>
                <span className="ms-auto flex flex-col items-end text-xs text-muted-foreground">
                  المتاح
                  <Money value={b.display_available} className="text-sm text-foreground" />
                </span>
              </label>
            );
          })}
        </div>
        {errors.currency ? <p className="text-xs text-destructive">{errors.currency.message}</p> : null}
      </fieldset>

      {balance.pending_withdrawals > 0 ? (
        <p role="status" className="rounded-lg border border-border p-3 text-sm text-warning" data-testid="wd-pending-warning">
          لديك طلب سحب قيد المراجعة بعملة <Mono>{currency}</Mono>؛ المبلغ المحجوز <Money value={balance.display_reserved} />. يمكنك إرسال طلب جديد من المتاح فقط.
        </p>
      ) : null}

      <Field label={`المبلغ (${currency})`} htmlFor="wd-amount" required error={errors.amount?.message} hint={<>الحد الأقصى <Money value={balance.display_available} /></>}>
        <div className="flex gap-2">
          <input id="wd-amount" inputMode="decimal" dir="ltr" autoComplete="off" placeholder="250.00" {...form.register("amount")} className={numericInputClass} aria-invalid={Boolean(errors.amount)} data-testid="wd-amount" />
          <Button type="button" variant="outline" className="h-11 shrink-0 md:h-8" onClick={() => form.setValue("amount", balance.available, { shouldValidate: true })} data-testid="wd-all">
            كامل المتاح
          </Button>
        </div>
      </Field>

      <Field label="حساب الاستلام" htmlFor="wd-account" required error={errors.payout_account_id?.message} hint="الحسابات النشطة فقط.">
        <NativeSelect id="wd-account" {...form.register("payout_account_id")} className="h-11 md:h-8" aria-invalid={Boolean(errors.payout_account_id)} data-testid="wd-account">
          <option value="">اختر حساباً</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {ACCOUNT_TYPE_LABELS[a.account_type]} · {a.provider_name} — {a.account_number}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="h-11 lg:h-9" data-testid="wd-review">
          مراجعة الطلب
        </Button>
        <Link href="/dashboard/wallet" className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")}>
          إلغاء
        </Link>
      </div>

      <Dialog open={confirming !== null} onOpenChange={(o) => !o && setConfirming(null)}>
        <DialogContent className="sm:max-w-sm" data-testid="wd-confirm">
          <DialogTitle>تأكيد طلب السحب</DialogTitle>
          <DialogDescription>راجع البيانات؛ لا يمكن تعديل الطلب بعد إرساله.</DialogDescription>
          {confirming ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">العملة</dt>
              <dd>
                <Mono>{confirming.currency}</Mono> · {CURRENCY_SHORT[confirming.currency]}
              </dd>
              <dt className="text-muted-foreground">المبلغ</dt>
              <dd>
                <Mono className="font-semibold">{confirming.amount}</Mono> <Mono className="text-xs text-muted-foreground">{confirming.currency}</Mono>
              </dd>
              <dt className="text-muted-foreground">إلى</dt>
              <dd className="flex flex-col">
                <span>{account?.provider_name} — {account?.account_name}</span>
                <Mono className="text-xs text-muted-foreground">{account?.account_number}</Mono>
              </dd>
            </dl>
          ) : null}
          <DialogFooter>
            <Button variant="outline" className="h-11 lg:h-9" onClick={() => setConfirming(null)}>
              تعديل
            </Button>
            <Button className="h-11 lg:h-9" onClick={() => void send()} disabled={create.isPending} data-testid="wd-send">
              {create.isPending ? "يُرسل…" : "تأكيد وإرسال"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
