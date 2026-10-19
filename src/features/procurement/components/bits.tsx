"use client";

import type { ReactNode } from "react";
import { ForbiddenState } from "@/components/shared/access-gate";
import { Mono } from "@/components/shared/mono";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { PO_STATUS_LABELS, PO_STATUS_TONE, type PoEvent, type PoStatus, type Tone } from "@/features/procurement/schemas";

const DOT: Record<Tone, string> = { warning: "bg-warning", info: "bg-info", destructive: "bg-destructive", success: "bg-success", muted: "bg-muted-foreground" };

/** Status as a semantic dot + the Arabic name (constitution I) — never a filled pill. */
export function PoStatusText({ status, className }: { status: PoStatus; className?: string }) {
  const tone = PO_STATUS_TONE[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-sm", className)} data-testid="po-status" data-status={status}>
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", DOT[tone])} />
      <span className={tone === "muted" ? "text-muted-foreground" : "text-foreground"}>{PO_STATUS_LABELS[status]}</span>
    </span>
  );
}

/** FR-23.01: `suppliers.manage` OR `suppliers.approve`. */
export function ProcurementGate({ children }: { children: ReactNode }) {
  const { canPermission } = useAccess();
  if (!canPermission("suppliers.manage") && !canPermission("suppliers.approve")) return <ForbiddenState />;
  return <>{children}</>;
}

export function useProcurementAccess() {
  const { canPermission } = useAccess();
  return { canManage: canPermission("suppliers.manage"), canApprove: canPermission("suppliers.approve") };
}

/** «استُلم 4 من 10» + a 2px line, no gradient (§11 I). */
export function ReceivedProgress({ received, ordered }: { received: number; ordered: number }) {
  const pct = ordered > 0 ? Math.min(100, Math.round((received / ordered) * 100)) : 0;
  return (
    <span className="flex min-w-28 flex-col gap-1" data-testid="po-line-progress">
      <span className="text-xs text-muted-foreground">
        استُلم <Mono className="text-foreground">{received}</Mono> من <Mono className="text-foreground">{ordered}</Mono>
      </span>
      <span aria-hidden className="h-0.5 w-full bg-border">
        <span className="block h-0.5 bg-foreground" style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}

export function PoTimeline({ events, now }: { events: PoEvent[]; now: Date }) {
  if (!events.length) return <p className="text-sm text-muted-foreground">لا أحداث بعد.</p>;
  return (
    <ol className="flex flex-col" data-testid="po-timeline">
      {events.map((ev) => (
        <li key={ev.id} className="relative flex gap-3 border-s border-border pb-4 ps-4 last:pb-0" data-kind={ev.kind}>
          <span aria-hidden className="absolute -start-[3.5px] top-1.5 size-1.5 rounded-full bg-foreground" />
          <span className="flex min-w-0 flex-col gap-0.5 text-sm">
            <span>{ev.text}</span>
            {ev.quantities?.length ? (
              <span className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                {ev.quantities.map((q) => (
                  <span key={q.sku}>
                    <Mono>{q.sku}</Mono> × <Mono>{q.quantity}</Mono>
                  </span>
                ))}
              </span>
            ) : null}
            <span className="text-xs text-muted-foreground">
              <time dateTime={ev.at} title={formatDateTime(ev.at)}>
                {formatRelative(ev.at, now)}
              </time>
              {` · ${ev.actor}`}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
