"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-error";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useConnections, useDropJobs, useSyncInventory } from "@/features/dropshipping/api";
import { JOB_TYPE_LABELS, SUPPLIER_LABELS, type Connection } from "@/features/dropshipping/schemas";
import { DROP_ROOT, DropJobStatus, DropshippingGate, DropshippingNav, StatusText } from "@/features/dropshipping/components/bits";

/**
 * `/dashboard/channels/dropshipping` (M29 US-29.1, FR-29.02): the four suppliers as ROWS
 * (no logo cards), the attention counter (held/rejected/failed supplier orders) and the
 * latest jobs.
 */
export function DropshippingHubScreen() {
  return (
    <DropshippingGate>
      <HubInner />
    </DropshippingGate>
  );
}

function HubInner() {
  const q = useConnections();
  const jobs = useDropJobs({ page_size: 5 });
  const [now] = useState(() => new Date());
  const attention = q.data?.attention_total ?? 0;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="الدروبشيبينغ"
        description="منتجات من موردين خارجيين: ربط، تسعير، استيراد، وإحالة الطلبات إليهم."
        actions={
          <Link href={`${DROP_ROOT}/feeds/new`} className={cn(buttonVariants({ variant: "outline" }), "h-11 lg:h-9")} aria-keyshortcuts="N">
            ملف جديد
          </Link>
        }
      />
      <DropshippingNav active="hub" />
      {attention ? (
        <Link href={`${DROP_ROOT}/orders?attention=1`} className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm hover:bg-muted" data-testid="attention-link">
          <StatusText tone="warning" label="طلبات موردين تحتاج انتباهاً" />
          <Mono className="font-medium" data-testid="attention-count">
            {attention}
          </Mono>
        </Link>
      ) : null}
      {q.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : q.error || !q.data ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          {!q.data.results.some((c) => c.connected) ? <EmptyState title="لم تربط مورداً بعد" description="اربط CJ أو مخازن أو كنوات، أو أنشئ ملفاً مسطّحاً." /> : null}
          <ul className="divide-y divide-border/60 surface-card overflow-hidden" data-testid="supplier-rows">
            {q.data.results.map((c) => (
              <SupplierRow key={c.supplier_code} c={c} now={now} />
            ))}
          </ul>
        </>
      )}
      <section className="flex flex-col gap-3" aria-labelledby="drop-jobs">
        <div className="flex items-baseline justify-between">
          <h2 id="drop-jobs" className="text-base font-medium">
            آخر المهام
          </h2>
          <Link href={`${DROP_ROOT}/jobs`} className="text-sm text-muted-foreground hover:underline">
            كل المهام
          </Link>
        </div>
        <ul className="divide-y divide-border/60 surface-card overflow-hidden">
          {(jobs.data?.results ?? []).map((j) => (
            <li key={j.id} className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm">
              <Mono className="text-muted-foreground">#{j.id}</Mono>
              <span>{JOB_TYPE_LABELS[j.job_type]}</span>
              <span className="text-muted-foreground">{SUPPLIER_LABELS[j.supplier_code]}</span>
              <DropJobStatus status={j.status} />
              <span className="ms-auto text-xs text-muted-foreground">{formatRelative(j.created_at, now)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SupplierRow({ c, now }: { c: Connection; now: Date }) {
  const sync = useSyncInventory();
  const btn = "h-11 lg:h-8";
  return (
    <li className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:gap-6" data-testid="supplier-row" data-code={c.supplier_code}>
      <div className="flex min-w-44 flex-col gap-1">
        <span className="font-medium">{SUPPLIER_LABELS[c.supplier_code]}</span>
        <StatusText tone={c.connected ? "success" : "muted"} label={c.connected ? "مربوط" : "غير مربوط"} testId="supplier-conn" value={c.connected ? "connected" : "disconnected"} />
      </div>
      <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
        <div>
          <dt>الحساب</dt>
          <dd className="truncate text-sm text-foreground" dir="ltr">
            {c.account_label ?? "—"}
          </dd>
        </div>
        <div>
          <dt>آخر مزامنة</dt>
          <dd className="text-sm text-foreground">{c.last_sync_at ? formatRelative(c.last_sync_at, now) : "—"}</dd>
        </div>
        <div>
          <dt>منتجات المورد</dt>
          <dd className="text-sm text-foreground">
            <Mono>{c.products_count}</Mono>
          </dd>
        </div>
        <div>
          <dt>تحتاج انتباهاً</dt>
          <dd className="text-sm text-foreground">
            <Mono>{c.attention_count}</Mono>
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        {c.connected ? (
          <>
            <Link href={`${DROP_ROOT}/catalog/${c.supplier_code}`} className={cn(buttonVariants({ variant: "outline" }), btn)} data-testid="to-catalog">
              الكتالوج
            </Link>
            <Button
              variant="outline"
              className={btn}
              disabled={sync.isPending}
              onClick={async () => {
                try {
                  const r = await sync.mutateAsync(c.supplier_code);
                  toast.success(`بدأت مزامنة المخزون — المهمة #${r.job_id}`);
                } catch (e) {
                  toast.error(isApiError(e) ? e.userMessage : "تعذّرت المزامنة");
                }
              }}
              data-testid="sync-now"
            >
              مزامنة المخزون الآن
            </Button>
          </>
        ) : null}
        <Link href={`${DROP_ROOT}/suppliers/${c.supplier_code}`} className={cn(buttonVariants({ variant: c.connected ? "ghost" : "default" }), btn)} data-testid="to-supplier">
          {c.connected ? "الإعدادات" : "ربط"}
        </Link>
      </div>
    </li>
  );
}
