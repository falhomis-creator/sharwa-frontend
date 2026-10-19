"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useOverview } from "@/features/platform-admin/api/hooks";
import { baseStoreColumns } from "@/features/platform-admin/components/store-cells";
import type { StoreRow } from "@/features/platform-admin/schemas";

/**
 * `console.<base>/` (M20 US-20.1). A text strip of numbers — not four equal KPI cards
 * (constitution I) — then the queues that need a decision, then the last 50 stores.
 * Every number is the server's (`TenantStatsSnapshot`), sales exactly as sent.
 */
export function OverviewScreen() {
  const q = useOverview();
  const [now] = useState(() => new Date());
  const columns = useMemo(() => baseStoreColumns(now), [now]);
  const d = q.data;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="النظرة العامة"
        description="كل متاجر المنصة من لقطات TenantStatsSnapshot اليومية."
        eyebrow={d?.snapshot_date ? `snapshot ${d.snapshot_date}` : undefined}
      />

      {q.error ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : null}

      <section aria-label="أرقام المنصة" data-testid="overview-numbers" className="grid grid-cols-2 gap-x-8 gap-y-5 border-b border-border pb-8 md:flex md:flex-wrap md:items-end">
        <Figure label="إجمالي المتاجر" loading={q.isLoading} testId="total-stores">
          {d ? <Mono>{formatNumber(d.total_stores)}</Mono> : null}
        </Figure>
        <Figure label="المبيعات (آخر لقطة)" loading={q.isLoading} testId="total-sales" className="col-span-2 md:col-span-1">
          {d ? <Money value={d.display_total_sales} /> : null}
        </Figure>
        <Figure label="الطلبات" loading={q.isLoading} testId="total-orders">
          {d ? <Mono>{formatNumber(d.total_orders)}</Mono> : null}
        </Figure>
        <Figure label="فشل التجهيز" loading={q.isLoading} testId="failed-stores" href="/stores?status=failed" tone={d && d.failed_stores > 0 ? "destructive" : undefined}>
          {d ? <Mono>{d.failed_stores}</Mono> : null}
        </Figure>
        <Figure label="متعثّرة (> 30 دقيقة)" loading={q.isLoading} testId="stalled-stores" href="/stores?status=stalled" tone={d && d.stalled_stores > 0 ? "warning" : undefined}>
          {d ? <Mono>{d.stalled_stores}</Mono> : null}
        </Figure>
      </section>

      <section aria-labelledby="queues-h" className="flex flex-col gap-3">
        <h2 id="queues-h" className="text-sm font-medium">بانتظار قرار</h2>
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border text-sm" data-testid="overview-queues">
          <Queue href="/sharwa-pay/topups?status=pending" label="طلبات شحن شروة باي قيد المراجعة" count={d?.pending_topups} />
          <Queue href="/sharwa-pay/withdrawals?status=pending" label="طلبات سحب بانتظار التنفيذ" count={d?.pending_withdrawals} />
          <Queue href="/webhook-events?status=pending" label="أحداث Webhook معلّقة" count={d?.pending_webhook_events} />
          <Queue href="/dues" label="المستحقات — تحصيل وإعفاء" />
        </ul>
      </section>

      <section aria-labelledby="recent-h" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="recent-h" className="text-sm font-medium">
            آخر المتاجر المُنشأة <Mono className="text-muted-foreground">({d?.recent_stores.length ?? "–"})</Mono>
          </h2>
          <Link href="/stores" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            كل المتاجر
          </Link>
        </div>
        <DataTable<StoreRow>
          testId="recent-stores"
          caption="آخر 50 متجراً"
          columns={columns}
          data={d?.recent_stores}
          getRowId={(r) => r.schema_name}
          total={d?.recent_stores.length ?? 0}
          page={1}
          pageSize={50}
          onPageChange={() => undefined}
          isLoading={q.isLoading}
          error={q.error}
          onRetry={() => void q.refetch()}
          emptyState={<EmptyState title="لا متاجر بعد" description="تظهر هنا المتاجر فور تسجيلها من صفحة الإنشاء." />}
          renderMobileCard={(r) => (
            <Link href={`/stores/${encodeURIComponent(r.schema_name)}`} className="flex flex-col gap-1 py-1">
              <span className="font-medium">{r.name}</span>
              <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Mono>{r.schema_name}</Mono> · {formatDate(r.created_on)}
              </span>
            </Link>
          )}
        />
      </section>
    </div>
  );
}

function Figure({ label, children, loading, href, tone, testId, className }: { label: string; children: React.ReactNode; loading: boolean; href?: string; tone?: "warning" | "destructive"; testId: string; className?: string }) {
  const value = (
    <span className={cn("text-xl font-semibold sm:text-2xl md:text-3xl", tone === "destructive" && "text-destructive", tone === "warning" && "text-warning")} data-testid={testId}>
      {loading ? <Skeleton className="h-8 w-20" /> : children}
    </span>
  );
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      {href ? (
        <Link href={href} className="hover:underline" aria-label={`${label} — اعرض القائمة`}>
          {value}
        </Link>
      ) : (
        value
      )}
    </div>
  );
}

function Queue({ href, label, count }: { href: string; label: string; count?: number }) {
  return (
    <li>
      <Link href={href} className="flex min-h-11 items-center justify-between gap-3 px-4 py-2 transition-colors hover:bg-muted">
        <span>{label}</span>
        {count === undefined ? <span aria-hidden className="text-muted-foreground">←</span> : <Mono className={count > 0 ? "text-foreground" : "text-muted-foreground"}>{count}</Mono>}
      </Link>
    </li>
  );
}
