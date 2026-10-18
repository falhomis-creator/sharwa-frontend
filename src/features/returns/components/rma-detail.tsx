"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { isApiError } from "@/lib/api-error";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useQaDecision, useRma } from "@/features/returns/api";
import { FEE_PAYER_LABELS, RMA_REASON_LABELS, RMA_STATUS_LABELS, type QaDecision, type Rma } from "@/features/returns/schemas";
import { RmaStatusText } from "@/features/returns/components/status";
import { RmaProgress } from "@/features/returns/components/rma-progress";

/** One RMA (M24 US-24.4): the 7-step path, reason, `fee_payer`, events, and the QA decision while `qa_pending`. */
export function RmaDetailView({ rmaId, variant }: { rmaId: number; variant: "sheet" | "page" }) {
  const query = useRma(rmaId);
  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-16" />
        <Skeleton className="h-32" />
      </div>
    );
  }
  if (query.error || !query.data) {
    const notFound = isApiError(query.error) && query.error.status === 404;
    return <ErrorState title={notFound ? "RMA غير موجود" : "تعذّر تحميل RMA"} error={query.error} onRetry={notFound ? undefined : () => void query.refetch()} />;
  }
  return <RmaBody rma={query.data} variant={variant} />;
}

export function QaButtons({ rma, onDone }: { rma: Rma; onDone?: (r: Rma) => void }) {
  const { canPermission } = useAccess();
  const can = canPermission("orders.process_returns") || canPermission("inventory.adjust");
  const qa = useQaDecision();
  const [error, setError] = useState<string | null>(null);
  if (rma.status !== "qa_pending") return null;
  const reason = can ? undefined : "يتطلب صلاحية «معالجة المرتجعات» أو «تعديل المخزون»";
  async function decide(decision: QaDecision) {
    setError(null);
    try {
      const res = await qa.mutateAsync({ id: rma.id, decision });
      toast.success(`RMA-${res.id}: ${RMA_STATUS_LABELS[res.status]}`);
      onDone?.(res);
    } catch (e) {
      setError(isApiError(e) ? e.userMessage : "تعذّر الإرسال — تحقق من الحالة قبل إعادة المحاولة.");
    }
  }
  return (
    <div className="flex flex-col gap-2" data-testid="qa-decision">
      <div className="flex flex-wrap gap-2">
        <span title={reason}>
          <Button className="h-11 lg:h-9" disabled={!can || qa.isPending} onClick={() => void decide("restocked")} data-testid="qa-restock">
            إعادة للمخزون
          </Button>
        </span>
        <span title={reason}>
          <Button variant="destructive" className="h-11 lg:h-9" disabled={!can || qa.isPending} onClick={() => void decide("rejected_disposal")} data-testid="qa-dispose">
            رفض / إعدام
          </Button>
        </span>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function RmaBody({ rma, variant }: { rma: Rma; variant: "sheet" | "page" }) {
  const [now] = useState(() => new Date());
  const visited = rma.events.map((e) => e.to_status);
  return (
    <div className="flex flex-col gap-6" data-testid="rma-detail" data-rma-id={rma.id} data-status={rma.status}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-4">
        <h2 className={cn("font-semibold tracking-tight", variant === "page" ? "text-2xl" : "text-xl")}>
          <Mono>RMA-{rma.id}</Mono>
        </h2>
        <RmaStatusText status={rma.status} />
      </div>

      <RmaProgress status={rma.status} visited={visited} />

      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <Info label="الطلب">
          <Link href={`/dashboard/orders?order=${rma.order_id}`} className="inline-flex min-h-11 items-center hover:underline lg:min-h-0">
            <Mono>#{rma.order_id}</Mono>
          </Link>
        </Info>
        <Info label="العنصر">
          {rma.fulfillment_item.product_name}
          {rma.fulfillment_item.sku ? (
            <>
              {" · "}
              <Mono className="text-xs text-muted-foreground">{rma.fulfillment_item.sku}</Mono>
            </>
          ) : null}
        </Info>
        <Info label="الكمية">
          <Mono>{rma.quantity}</Mono>
        </Info>
        <Info label="السبب">{RMA_REASON_LABELS[rma.reason]}</Info>
        <Info label="الوجهة">{rma.destination_location?.name ?? "—"}</Info>
        <Info label="الرسوم">
          <span data-testid="rma-fee-payer">رسوم الإرجاع على: {FEE_PAYER_LABELS[rma.fee_payer]}</span>
        </Info>
      </dl>

      {rma.status === "qa_pending" ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">قرار الفحص</h3>
          <QaButtons rma={rma} />
        </section>
      ) : null}
      {rma.status === "restocked" || (rma.status === "closed" && visited.includes("restocked")) ? (
        <p className="text-sm" data-testid="rma-restock-link">
          أُعيدت الكمية للمخزون —{" "}
          <Link
            href={`/dashboard/inventory/movements?reason=refund_restock${rma.fulfillment_item.product_id ? `&product=${rma.fulfillment_item.product_id}` : ""}`}
            className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-foreground lg:min-h-0"
          >
            حركة «إعادة مخزون من استرجاع»
            {rma.restock_movement_id ? <Mono className="ms-1">#{rma.restock_movement_id}</Mono> : null}
          </Link>
        </p>
      ) : null}

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">الأحداث</h3>
        <ol className="flex flex-col" data-testid="rma-events">
          {[...rma.events].reverse().map((ev, i) => (
            <li key={`${ev.to_status}-${i}`} className="relative flex gap-3 border-s border-border pb-4 ps-4 last:pb-0">
              <span aria-hidden className="absolute -start-[3.5px] top-1.5 size-1.5 rounded-full bg-foreground" />
              <span className="flex min-w-0 flex-col gap-0.5 text-sm">
                <span>{RMA_STATUS_LABELS[ev.to_status]}</span>
                <span className="text-xs text-muted-foreground">
                  <time dateTime={ev.at} title={formatDateTime(ev.at)}>
                    {formatRelative(ev.at, now)}
                  </time>
                  {ev.actor ? ` · ${ev.actor}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 sm:justify-start">
      <dt className="shrink-0 text-muted-foreground sm:w-20">{label}</dt>
      <dd className="min-w-0 text-end sm:text-start">{children}</dd>
    </div>
  );
}
