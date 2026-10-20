"use client";

import Link from "next/link";
import { parseAsString, useQueryStates } from "nuqs";
import { Mono } from "@/components/shared/mono";
import { NativeSelect } from "@/components/ui/native-select";
import { isApiError } from "@/lib/api-error";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useRequests, useTransactions, useWallet } from "@/features/sharwa-pay/api";
import { PayLogin } from "@/features/sharwa-pay/components/login";
import { BalancesSkeleton, BottomBar, PayError, RequireWallet, payPrimary, paySecondary } from "@/features/sharwa-pay/components/pay-shell";
import {
  CURRENCY_LABELS,
  PAY_CURRENCIES,
  REASONS,
  REASON_LABELS,
  TOPUP_STATUS_LABELS,
  WITHDRAWAL_STATUS_LABELS,
  type Transaction,
  type Wallet,
} from "@/features/sharwa-pay/schemas";

/** `/sharwa-pay`: the phone screen without a session, the wallet with one (§6 «بنفس المسار»). */
export function PayHome() {
  const wallet = useWallet();
  if (wallet.isLoading) return <BalancesSkeleton />;
  if (isApiError(wallet.error) && wallet.error.status === 401) return <PayLogin />;
  if (wallet.error || !wallet.data) return <PayError error={wallet.error} onRetry={() => void wallet.refetch()} />;
  return <Dashboard w={wallet.data} />;
}

function Balances({ w }: { w: Wallet }) {
  return (
    <section aria-label="الأرصدة" className="flex flex-col gap-2">
      <h2 className="text-sm text-muted-foreground">الأرصدة</h2>
      {/* Four rows, always — zero is zero; never a converted «total» (FR-40.03). */}
      <ul className="divide-y divide-border/60 surface-card overflow-hidden" data-testid="balances">
        {w.balances.map((b) => (
          <li key={b.currency} className="flex items-center justify-between gap-3 px-4 py-3" data-testid="balance-row" data-currency={b.currency}>
            <span className="text-sm text-muted-foreground">{CURRENCY_LABELS[b.currency]}</span>
            <Mono className="text-2xl font-medium tabular-nums">{b.display_balance}</Mono>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Dashboard({ w }: { w: Wallet }) {
  const recent = useTransactions({ page: "1" });
  return (
    <div className="flex flex-col gap-5" data-testid="pay-dashboard">
      <div className="flex flex-col gap-0.5">
        <span className="text-xl font-semibold">{w.customer_name ?? "محفظتي"}</span>
        <bdi className="self-start font-mono text-xs text-muted-foreground">+{w.customer_phone}</bdi>
      </div>
      {!w.is_active ? (
        <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive" data-testid="wallet-inactive">
          المحفظة موقوفة — تواصل مع الدعم.
        </p>
      ) : null}
      <Balances w={w} />
      {w.exists === false ? <p className="text-sm text-muted-foreground">محفظتك جديدة — اشحنها لتدفع بها في أي متجر على شروة.</p> : null}
      <section aria-label="آخر الحركات" className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm text-muted-foreground">آخر الحركات</h2>
          <Link href="/sharwa-pay/transactions" className="inline-flex min-h-12 items-center text-sm underline underline-offset-4">
            كل الحركات
          </Link>
        </div>
        <TxList rows={recent.data?.results.slice(0, 5)} loading={recent.isLoading} />
      </section>
      <Link href="/sharwa-pay/requests" className={paySecondary} data-testid="my-requests">
        طلباتي (الشحن والسحب)
      </Link>
      <BottomBar className="grid-cols-2">
        {w.is_active ? (
          <>
            <Link href="/sharwa-pay/topup" className={payPrimary} data-testid="go-topup">
              شحن
            </Link>
            <Link href="/sharwa-pay/withdraw" className={paySecondary} data-testid="go-withdraw">
              سحب
            </Link>
          </>
        ) : (
          <>
            <button type="button" disabled className={payPrimary} title="المحفظة موقوفة">
              شحن
            </button>
            <button type="button" disabled className={paySecondary} title="المحفظة موقوفة">
              سحب
            </button>
          </>
        )}
      </BottomBar>
    </div>
  );
}

function TxRow({ t }: { t: Transaction }) {
  const credit = t.transaction_type === "credit";
  return (
    <li className="flex flex-col gap-1 px-4 py-3" data-testid="tx-row" data-reason={t.reason}>
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm">{REASON_LABELS[t.reason]}</span>
        <Mono className={cn("text-base", credit ? "text-foreground" : "text-muted-foreground")}>
          {credit ? "+" : "−"}
          {t.display_amount}
        </Mono>
      </span>
      <span className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
        <span>{credit ? "إيداع" : "خصم"}</span>
        {t.source_tenant_schema ? (
          <span data-testid="tx-store">
            {t.source_store_name ?? <Mono>{t.source_tenant_schema}</Mono>}
            {t.source_store_available === false ? " — متجر غير متاح" : ""}
          </span>
        ) : null}
        {t.source_order_id ? (
          <span>
            طلب <Mono>#{t.source_order_id}</Mono>
          </span>
        ) : null}
        {t.related_request ? (
          <Link href="/sharwa-pay/requests" className="underline underline-offset-2">
            {t.related_request.kind === "topup" ? "طلب الشحن" : "طلب السحب"} <Mono>#{t.related_request.id}</Mono>
          </Link>
        ) : null}
        <span>
          الرصيد بعدها <Mono>{t.display_balance_after}</Mono>
        </span>
        <Mono>{formatDateTime(t.created_at)}</Mono>
      </span>
    </li>
  );
}

function TxList({ rows, loading }: { rows: Transaction[] | undefined; loading: boolean }) {
  if (loading) return <BalancesSkeleton />;
  if (!rows?.length) return <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">لا حركات بعد.</p>;
  return (
    <ul className="divide-y divide-border/60 surface-card overflow-hidden" data-testid="tx-list">
      {rows.map((t) => (
        <TxRow key={t.id} t={t} />
      ))}
    </ul>
  );
}

/** `/sharwa-pay/transactions?currency=&reason=` — filters in the URL. */
export function TransactionsScreen() {
  const [f, setF] = useQueryStates({ currency: parseAsString.withDefault(""), reason: parseAsString.withDefault(""), page: parseAsString.withDefault("1") }, { history: "replace" });
  return (
    <RequireWallet>
      {() => <TransactionsBody f={f} setF={(p) => void setF(p)} />}
    </RequireWallet>
  );
}

function TransactionsBody({ f, setF }: { f: { currency: string; reason: string; page: string }; setF: (p: Partial<{ currency: string; reason: string; page: string }>) => void }) {
  const q = useTransactions({ ...(f.currency ? { currency: f.currency } : {}), ...(f.reason ? { reason: f.reason } : {}), page: f.page });
  const page = Number(f.page) || 1;
  const pages = Math.max(1, Math.ceil((q.data?.count ?? 0) / 20));
  return (
    <div className="flex flex-col gap-4" data-testid="pay-transactions">
      <h1 className="text-xl font-semibold">الحركات</h1>
      <div className="grid grid-cols-2 gap-2">
        <NativeSelect aria-label="العملة" className="h-12" value={f.currency} onChange={(e) => setF({ currency: e.target.value, page: "1" })} data-testid="tx-currency">
          <option value="">كل العملات</option>
          {PAY_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {CURRENCY_LABELS[c]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="السبب" className="h-12" value={f.reason} onChange={(e) => setF({ reason: e.target.value, page: "1" })} data-testid="tx-reason">
          <option value="">كل الأسباب</option>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {REASON_LABELS[r]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <TxList rows={q.data?.results} loading={q.isLoading} />
      {pages > 1 ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={paySecondary} disabled={page <= 1} onClick={() => setF({ page: String(page - 1) })}>
            السابق
          </button>
          <button type="button" className={paySecondary} disabled={page >= pages} onClick={() => setF({ page: String(page + 1) })}>
            التالي
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** `/sharwa-pay/requests` — top-ups and withdrawals with their six status labels (SC-40.5). */
export function RequestsScreen() {
  return <RequireWallet>{() => <RequestsBody />}</RequireWallet>;
}

function RequestsBody() {
  const q = useRequests();
  if (q.isLoading) return <BalancesSkeleton />;
  if (q.error || !q.data) return <PayError error={q.error} onRetry={() => void q.refetch()} />;
  const { topups, withdrawals } = q.data;
  const tone = (s: string) => (s === "rejected" ? "text-destructive" : s === "pending" ? "text-warning" : "text-success");
  return (
    <div className="flex flex-col gap-5" data-testid="pay-requests">
      <h1 className="text-xl font-semibold">طلباتي</h1>
      <section aria-label="طلبات الشحن" className="flex flex-col gap-2">
        <h2 className="text-sm text-muted-foreground">طلبات الشحن</h2>
        {topups.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">لا طلبات شحن.</p>
        ) : (
          <ul className="divide-y divide-border/60 surface-card overflow-hidden">
            {topups.map((t) => (
              <li key={t.id} className="flex flex-col gap-1 px-4 py-3" data-testid="topup-row" data-status={t.status}>
                <span className="flex items-center justify-between gap-2">
                  <Mono className="text-base">{t.display_amount}</Mono>
                  <span className={cn("text-sm", tone(t.status))} data-testid="topup-status">
                    {t.status === "approved" && !t.credited_at ? "مقبول — بانتظار الإيداع" : TOPUP_STATUS_LABELS[t.status]}
                  </span>
                </span>
                <span className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  <span>
                    #<Mono>{t.id}</Mono>
                  </span>
                  <span>
                    رقم العملية <bdi className="font-mono">{t.bank_transaction_id}</bdi>
                  </span>
                  <Mono>{formatDateTime(t.created_at)}</Mono>
                </span>
                {t.rejection_reason ? <span className="text-xs text-destructive">{t.rejection_reason}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-label="طلبات السحب" className="flex flex-col gap-2">
        <h2 className="text-sm text-muted-foreground">طلبات السحب</h2>
        {withdrawals.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">لا طلبات سحب.</p>
        ) : (
          <ul className="divide-y divide-border/60 surface-card overflow-hidden">
            {withdrawals.map((w) => (
              <li key={w.id} className="flex flex-col gap-1 px-4 py-3" data-testid="withdrawal-row" data-status={w.status}>
                <span className="flex items-center justify-between gap-2">
                  <Mono className="text-base">{w.display_amount}</Mono>
                  <span className={cn("text-sm", tone(w.status))} data-testid="withdrawal-status">
                    {WITHDRAWAL_STATUS_LABELS[w.status]}
                  </span>
                </span>
                <span className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  <span>
                    #<Mono>{w.id}</Mono>
                  </span>
                  <bdi>{w.payout_destination}</bdi>
                  <Mono>{formatDateTime(w.created_at)}</Mono>
                </span>
                {w.status === "rejected" ? <span className="text-xs text-muted-foreground">أُعيد المبلغ إلى رصيدك (حركة «استرجاع مبلغ سحب مرفوض»).</span> : null}
                {w.rejection_reason ? <span className="text-xs text-destructive">{w.rejection_reason}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
