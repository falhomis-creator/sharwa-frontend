"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { NativeSelect } from "@/components/ui/native-select";
import { formatDateTime, formatNumber, formatRelative, prettyPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useLoyaltyProgram, usePointsOf, useWallet, useWalletTransactions } from "@/features/wallets/api";
import { WALLET_REASONS, WALLET_REASON_LABELS, type WalletTransaction } from "@/features/wallets/schemas";
import { TopupPanel } from "@/features/wallets/components/topup-panel";

/**
 * The wallet detail (M35 US-35.2–35.4): the SAME component behind the list's side sheet and
 * `/dashboard/customers/wallets/[id]` (FR-35.07). Tabs and the ledger's reason filter live in
 * the URL. The ledger is append-only: nothing here edits or deletes a line (FR-35.05).
 */
const TABS = ["transactions", "points"] as const;
const tabParsers = { tab: parseAsStringLiteral(TABS).withDefault("transactions"), reason: parseAsString.withDefault("") };

export function WalletDetailView({ walletId, variant }: { walletId: number; variant: "sheet" | "page" }) {
  const wallet = useWallet(walletId);
  const [{ tab, reason }, setParams] = useQueryStates(tabParsers, { history: "replace" });
  const { canFeature, canPermission } = useAccess();
  const canTopup = canPermission("customers.edit_profile");
  const [topupOpen, setTopupOpen] = useState(false);
  const [now] = useState(() => new Date());
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  if (wallet.isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (wallet.error || !wallet.data) return <ErrorState error={wallet.error} onRetry={() => void wallet.refetch()} />;
  const w = wallet.data;
  const showPoints = canFeature("loyalty_settings");
  const topupBlocked = !canTopup ? "تحتاج صلاحية تعديل ملف العميل" : !w.is_active ? "المحفظة معطّلة — لا تعبئة" : null;

  async function copyPhone() {
    try {
      await navigator.clipboard.writeText(w.customer_phone);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <div className="flex flex-col gap-6" data-testid="wallet-detail">
      <header className="flex flex-col gap-3 border-b border-border pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold">{w.customer_name}</h2>
              {!w.is_active ? <span className="text-xs text-destructive" data-testid="wallet-inactive">معطّلة</span> : null}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <Mono className="text-sm">{prettyPhone(w.customer_phone)}</Mono>
              <button type="button" onClick={() => void copyPhone()} className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:size-8" aria-label="نسخ الهاتف">
                {copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              </button>
              <a
                href={`https://wa.me/${w.customer_phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:size-8"
                aria-label="فتح واتساب"
              >
                <MessageCircle className="size-4" aria-hidden />
              </a>
            </div>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs text-muted-foreground">الرصيد</span>
            <Money value={w.display_balance} className="text-2xl font-semibold" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            أُنشئت <time dateTime={w.created_at}>{formatDateTime(w.created_at)}</time>
          </span>
          <span aria-hidden>·</span>
          <span>
            <Mono>{formatNumber(w.transactions_count)}</Mono> حركة
          </span>
          {w.last_transaction_at ? (
            <>
              <span aria-hidden>·</span>
              <span>آخر حركة {formatRelative(w.last_transaction_at, now)}</span>
            </>
          ) : null}
          <span className="ms-auto flex gap-2">
            {variant === "sheet" ? (
              <Link href={`/dashboard/customers/wallets/${w.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-11 lg:h-8")}>
                الصفحة الكاملة
              </Link>
            ) : null}
            <Button size="sm" className="h-11 lg:h-8" disabled={Boolean(topupBlocked)} title={topupBlocked ?? undefined} onClick={() => setTopupOpen(true)} data-testid="topup-open">
              تعبئة
            </Button>
          </span>
        </div>
      </header>

      <div role="tablist" aria-label="أقسام المحفظة" className="flex gap-1 border-b border-border">
        {TABS.filter((t) => t !== "points" || showPoints).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => void setParams({ tab: t })}
            data-testid={`wallet-tab-${t}`}
            className={cn("-mb-px min-h-11 border-b-2 px-3 text-sm lg:min-h-9", tab === t ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {t === "transactions" ? "الحركات" : "النقاط"}
          </button>
        ))}
      </div>

      {tab === "points" && showPoints ? (
        <PointsTab phone={w.customer_phone} />
      ) : (
        <Ledger walletId={w.id} reason={reason} onReason={(r) => void setParams({ reason: r || null })} onOpenOrder={(id) => router.push(`/dashboard/orders?order=${id}`)} />
      )}

      <TopupPanel open={topupOpen} onOpenChange={setTopupOpen} walletId={w.id} customerName={w.customer_name} balance={w.display_balance} />
    </div>
  );
}

function Ledger({ walletId, reason, onReason, onOpenOrder }: { walletId: number; reason: string; onReason: (r: string) => void; onOpenOrder: (orderId: number) => void }) {
  const query = useWalletTransactions(walletId, { reason: reason || undefined, page_size: 100 });
  const [now] = useState(() => new Date());
  return (
    <section className="flex flex-col gap-3" aria-label="دفتر الحركات" data-testid="wallet-ledger">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {query.data ? (
            <>
              <Mono className="text-foreground">{formatNumber(query.data.count)}</Mono> حركة{reason ? ` · ${WALLET_REASON_LABELS[reason as keyof typeof WALLET_REASON_LABELS]}` : ""}
            </>
          ) : (
            "…"
          )}
        </p>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          السبب
          <NativeSelect value={reason} onChange={(e) => onReason(e.target.value)} className="h-11 lg:h-8" aria-label="تصفية بالسبب" data-testid="ledger-reason">
            <option value="">الكل</option>
            {WALLET_REASONS.map((r) => (
              <option key={r} value={r}>
                {WALLET_REASON_LABELS[r]}
              </option>
            ))}
          </NativeSelect>
        </label>
      </div>
      {query.isLoading ? (
        <div className="flex flex-col gap-2" aria-busy>
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data && query.data.results.length === 0 ? (
        <EmptyState title={reason ? "لا حركات بهذا السبب" : "لا حركات بعد"} description={reason ? "جرّب سبباً آخر أو أزل التصفية." : "أول تعبئة تظهر هنا مع رصيدها بعد الحركة."} />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {query.data?.results.map((t) => (
            <LedgerRow key={t.id} t={t} now={now} onOpenOrder={onOpenOrder} />
          ))}
        </ul>
      )}
    </section>
  );
}

function LedgerRow({ t, now, onOpenOrder }: { t: WalletTransaction; now: Date; onOpenOrder: (id: number) => void }) {
  const positive = Number(t.amount) >= 0;
  return (
    <li className="flex flex-col gap-1 p-3 md:flex-row md:items-center md:gap-4" data-testid="ledger-row" data-reason={t.reason}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{WALLET_REASON_LABELS[t.reason]}</span>
          {t.reference ? (
            t.reference.type === "order" ? (
              <button type="button" onClick={() => onOpenOrder(t.reference!.id)} className="text-xs text-muted-foreground underline-offset-4 hover:underline" data-testid="ledger-ref">
                {t.reference.label}
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">{t.reference.label}</span>
            )
          ) : null}
        </span>
        {t.note ? <span className="text-xs text-muted-foreground">{t.note}</span> : null}
        <span className="text-xs text-muted-foreground">
          {t.actor} · <time dateTime={t.created_at} title={formatDateTime(t.created_at)}>{formatRelative(t.created_at, now)}</time>
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-4 md:flex-col md:items-end md:gap-0.5">
        <Money value={t.display_amount} className={cn("text-sm font-medium", positive ? "text-success" : "text-destructive")} />
        <span className="text-xs text-muted-foreground">
          بعد: <Money value={t.display_balance_after} muted />
        </span>
      </div>
    </li>
  );
}

function PointsTab({ phone }: { phone: string }) {
  const program = useLoyaltyProgram();
  const points = usePointsOf(phone, { page_size: 100 });
  const [now] = useState(() => new Date());
  return (
    <section className="flex flex-col gap-4" aria-label="نقاط الولاء" data-testid="wallet-points">
      <div className="rounded-lg border border-border p-4 text-sm">
        {program.isLoading ? (
          <Skeleton className="h-5 w-72" />
        ) : program.data?.is_enabled ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
            <span>
              كل <Mono className="text-foreground">{program.data.riyals_per_point}</Mono> ر.س = نقطة
            </span>
            <span aria-hidden>·</span>
            <span>
              <Mono className="text-foreground">{program.data.points_per_riyal_redemption}</Mono> نقطة = ر.س عند الاستبدال
            </span>
            <span aria-hidden>·</span>
            <span>
              الحد الأدنى للاستبدال <Mono className="text-foreground">{program.data.min_points_to_redeem}</Mono>
            </span>
            <Link href="/dashboard/marketing/loyalty" className="ms-auto underline-offset-4 hover:underline">
              تعديل في برنامج الولاء
            </Link>
          </p>
        ) : (
          <p className="flex flex-wrap items-center gap-2 text-muted-foreground" data-testid="loyalty-off">
            برنامج الولاء غير مفعّل — الحركات التاريخية تبقى مقروءة.
            <Link href="/dashboard/marketing/loyalty" className="underline-offset-4 hover:underline">
              تفعيل البرنامج
            </Link>
          </p>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xs text-muted-foreground">الرصيد</span>
        <Mono className="text-2xl font-semibold">{points.data ? formatNumber(points.data.balance) : "…"}</Mono>
        <span className="text-xs text-muted-foreground">نقطة</span>
      </div>
      {points.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : points.error ? (
        <ErrorState error={points.error} onRetry={() => void points.refetch()} />
      ) : points.data && points.data.results.length === 0 ? (
        <EmptyState title="لا حركات نقاط بعد" description="تُكتب نقاط الكسب تلقائياً من الطلبات المكتملة." />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {points.data?.results.map((t) => (
            <li key={t.id} className="flex items-center gap-3 p-3 text-sm" data-testid="points-row" data-type={t.type}>
              <span className="flex-1">
                {t.type === "earn" ? "كسب" : "استبدال"}
                {t.order_id ? (
                  <Link href={`/dashboard/orders?order=${t.order_id}`} className="ms-2 text-xs text-muted-foreground underline-offset-4 hover:underline">
                    #{t.order_id}
                  </Link>
                ) : null}
                {t.wallet_transaction_id ? <span className="ms-2 text-xs text-muted-foreground">حركة محفظة #{t.wallet_transaction_id}</span> : null}
              </span>
              <time dateTime={t.created_at} className="text-xs text-muted-foreground">
                {formatRelative(t.created_at, now)}
              </time>
              <Mono className={cn("text-sm font-medium", t.type === "earn" ? "text-success" : "text-destructive")}>
                {t.type === "earn" ? "+" : "-"}
                {formatNumber(t.points)}
              </Mono>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
