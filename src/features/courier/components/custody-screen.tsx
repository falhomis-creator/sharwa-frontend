"use client";

import { Mono } from "@/components/shared/mono";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCustody } from "@/features/courier/api";
import { OfflineNote } from "@/features/courier/components/shell";
import { CUSTODY_LABELS } from "@/features/courier/schemas";

/**
 * `/agent/custody` (US-38.5): the balance and every movement as the server writes it —
 * no local sum (FR-38.10). A `reversed` entry is amber and points at the entry it undoes.
 */
export function CustodyScreen() {
  const q = useCustody();
  if (q.isLoading) return <Skeleton className="h-64 w-full" />;
  if (q.error || !q.data) return <p role="alert" className="text-sm text-destructive">تعذّر تحميل دفتر العهدة.</p>;
  const c = q.data.data;
  return (
    <div className="flex flex-col gap-4" data-testid="custody-screen">
      <OfflineNote snap={q.data} />
      <section className="flex flex-col gap-1 surface-card p-5 lg:p-6" aria-label="الرصيد">
        <span className="text-xs text-muted-foreground">الرصيد الحالي</span>
        <Mono className="text-3xl font-medium" data-testid="custody-balance">
          {c.display_balance}
        </Mono>
      </section>
      {c.results.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">لا حركات بعد.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border/60 surface-card overflow-hidden">
          {c.results.map((e) => (
            <li key={e.id} className="flex flex-col gap-1 p-3" data-testid="custody-entry" data-type={e.entry_type}>
              <span className="flex items-center justify-between gap-2">
                <span className={cn("text-sm", e.entry_type === "reversed" && "text-warning")}>{CUSTODY_LABELS[e.entry_type]}</span>
                <Mono className={cn("text-base", e.entry_type === "reversed" && "text-warning")}>
                  {e.sign === "-" ? "−" : "+"}
                  {e.display_amount}
                </Mono>
              </span>
              <span className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                {e.related_shipment?.waybill_number ? <Mono>{e.related_shipment.waybill_number}</Mono> : null}
                {e.related_shift ? <span>مناوبة <Mono>#{e.related_shift}</Mono></span> : null}
                {e.reverses ? <span className="text-warning">يعكس الحركة <Mono>#{e.reverses}</Mono></span> : null}
                <Mono>{formatDateTime(e.created_at)}</Mono>
              </span>
              {e.note ? <span className="text-xs text-muted-foreground">{e.note}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
