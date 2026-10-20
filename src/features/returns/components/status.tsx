import { cn } from "@/lib/utils";
import { formatDateTime, formatRelative } from "@/lib/format";
import {
  RETURN_STATUS_LABELS,
  RETURN_STATUS_TONE,
  RMA_STATUS_LABELS,
  RMA_STATUS_TONE,
  type ReturnStatus,
  type ReturnTimelineEvent,
  type RmaStatus,
} from "@/features/returns/schemas";

/** Statuses as text + a semantic dot (constitution I) — never a filled badge. */
const DOT = { warning: "bg-warning", info: "bg-info", destructive: "bg-destructive", success: "bg-success", muted: "bg-muted-foreground" } as const;
const TEXT = { warning: "text-warning", info: "text-info", destructive: "text-destructive", success: "text-success", muted: "text-muted-foreground" } as const;

export function ReturnStatusText({ status, className }: { status: ReturnStatus; className?: string }) {
  const tone = RETURN_STATUS_TONE[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-sm", className)} data-testid="return-status" data-status={status}>
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", DOT[tone])} />
      <span className={tone === "muted" ? TEXT.muted : "text-foreground"}>{RETURN_STATUS_LABELS[status]}</span>
    </span>
  );
}

export function RmaStatusText({ status, className }: { status: RmaStatus; className?: string }) {
  const tone = RMA_STATUS_TONE[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-sm", className)} data-testid="rma-status" data-status={status}>
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", DOT[tone])} />
      <span className={tone === "muted" ? TEXT.muted : "text-foreground"}>{RMA_STATUS_LABELS[status]}</span>
    </span>
  );
}

/**
 * The return's own timeline, in the same visual language as the M06 order timeline
 * (a hairline on the start edge, a 6px dot per event). M06 does not export its timeline
 * list, so this is a local twin; the events also land in the order's timeline (FR-24.10).
 */
export function ReturnTimeline({ events, now }: { events: ReturnTimelineEvent[]; now: Date }) {
  if (!events.length) return <p className="text-sm text-muted-foreground">لا أحداث بعد.</p>;
  return (
    <ol className="flex flex-col" data-testid="return-timeline">
      {[...events]
        .sort((a, b) => b.at.localeCompare(a.at))
        .map((ev) => (
          <li key={ev.id} className="relative flex gap-3 border-s border-border pb-4 ps-4 last:pb-0">
            <span aria-hidden className="absolute -start-[3.5px] top-1.5 size-1.5 rounded-full bg-primary" />
            <span className="flex min-w-0 flex-col gap-0.5 text-sm">
              <span>{ev.text}</span>
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
  );
}
