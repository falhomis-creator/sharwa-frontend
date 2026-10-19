"use client";

import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { ScrollX } from "@/components/shared/scroll-x";
import { Mono } from "@/components/shared/mono";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAgentShipments, useMe } from "@/features/courier/api";
import { OfflineNote, StatusText, primaryAction } from "@/features/courier/components/shell";
import { STATUS_LABELS, TABS, TAB_LABELS, type ShipmentStatus } from "@/features/courier/schemas";

/**
 * `/agent/shipments?status=` (US-38.2): tabs by status (scrolling inside their own strip,
 * never the page), a count per tab, and a dense list with the waybill, the customer, the
 * address and the amount to collect exactly as the server sends it.
 */
export function statusTone(s: ShipmentStatus): "info" | "success" | "warning" | "muted" {
  if (s === "picked_up" || s === "in_transit") return "info";
  if (s === "delivered") return "success";
  if (s === "label_pending" || s === "pending_pickup") return "warning";
  return "muted";
}

export function NoShiftLock() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-5" data-testid="shift-lock">
      <p className="text-base font-medium">ابدأ مناوبتك أولاً</p>
      <p className="text-sm text-muted-foreground">تظهر الشحنات والإجراءات بعد بدء المناوبة.</p>
      <Link href="/agent" className={primaryAction}>
        إلى المناوبة
      </Link>
    </div>
  );
}

export function ShipmentsScreen() {
  const me = useMe();
  const [tab, setTab] = useQueryState("status", parseAsStringLiteral(TABS).withDefault("pending_pickup").withOptions({ history: "replace" }));
  const list = useAgentShipments(tab);
  if (me.data && !me.data.data.open_shift && !me.data.offline) return <NoShiftLock />;
  const counts = list.data?.data.counts;
  return (
    <div className="flex flex-col gap-3" data-testid="shipments-screen">
      <ScrollX className="-mx-4" scrollerClassName="px-4" cueAlign="center" role="tablist" aria-label="حالة الشحنات">
        <div className="flex w-max gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => void setTab(t)}
              className={cn("flex h-12 items-center gap-1.5 whitespace-nowrap px-3 text-sm", tab === t ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground")}
              data-testid={`status-tab-${t}`}
            >
              {TAB_LABELS[t]}
              <Mono className="text-xs" data-testid={`status-count-${t}`}>
                {counts?.[t] ?? "–"}
              </Mono>
            </button>
          ))}
        </div>
      </ScrollX>
      <OfflineNote snap={list.data} />
      {list.isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : list.error ? (
        <p role="alert" className="text-sm text-destructive">
          تعذّر تحميل الشحنات.
        </p>
      ) : !list.data?.data.results.length ? (
        <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground" data-testid="shipments-empty">
          لا شحنات في هذه الحالة.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {list.data.data.results.map((s) => (
            <li key={s.id}>
              <Link href={`/agent/shipments/${s.id}`} className="flex min-h-16 flex-col gap-1 p-3" data-testid="agent-shipment">
                <span className="flex items-center justify-between gap-2">
                  <Mono className="text-sm">{s.waybill_number}</Mono>
                  <StatusText label={STATUS_LABELS[s.status]} tone={statusTone(s.status)} />
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-medium">{s.customer_name}</span>
                  <Mono className="text-sm" data-testid="cod">
                    {s.display_cod_amount}
                  </Mono>
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  <bdi>{s.address}</bdi>
                </span>
                {s.flagged_for_review ? <span className="text-xs text-warning">قيد المراجعة</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
