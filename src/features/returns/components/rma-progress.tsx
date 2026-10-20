import { cn } from "@/lib/utils";
import { RMA_STATUSES, RMA_STATUS_LABELS, type RmaStatus } from "@/features/returns/schemas";

/**
 * The seven RMA states as a progress path (FR-24.06, §11 I/II): thin lines and dots in
 * foreground/muted only — the current state a solid dot, the passed ones an outlined dot
 * on a drawn line, the future ones muted. Horizontal from `md`, starting at the inline
 * start (right in RTL); vertical on phones. `restocked` and `rejected_disposal` are the
 * two QA outcomes: the one not taken is marked «لم يُسلك».
 */
type StepState = "passed" | "current" | "future" | "skipped";

function stepStates(status: RmaStatus, visited: Set<RmaStatus>): Record<RmaStatus, StepState> {
  const idx = RMA_STATUSES.indexOf(status);
  const out = {} as Record<RmaStatus, StepState>;
  const outcome: RmaStatus | null = visited.has("restocked") || status === "restocked" ? "restocked" : visited.has("rejected_disposal") || status === "rejected_disposal" ? "rejected_disposal" : null;
  RMA_STATUSES.forEach((s, i) => {
    if (s === status) out[s] = "current";
    else if (outcome && (s === "restocked" || s === "rejected_disposal") && s !== outcome) out[s] = "skipped";
    else if (i < idx) out[s] = "passed";
    else out[s] = "future";
  });
  return out;
}

export function RmaProgress({ status, visited = [] }: { status: RmaStatus; visited?: RmaStatus[] }) {
  const states = stepStates(status, new Set(visited));
  return (
    <ol className="flex flex-col gap-0 md:flex-row md:items-start" aria-label="مسار المرتجع" data-testid="rma-progress">
      {RMA_STATUSES.map((s, i) => {
        const st = states[s];
        const last = i === RMA_STATUSES.length - 1;
        return (
          <li
            key={s}
            className="relative flex min-w-0 flex-1 items-start gap-3 pb-5 md:flex-col md:items-center md:gap-2 md:pb-0"
            aria-current={st === "current" ? "step" : undefined}
            data-step={s}
            data-state={st}
          >
            {/* connector to the next step: vertical on phones, along the inline axis from md */}
            {!last ? (
              <span
                aria-hidden
                className={cn(
                  "absolute start-[5px] top-3 h-full w-px md:start-1/2 md:top-[5px] md:h-px md:w-full",
                  st === "passed" ? "bg-primary" : "bg-border",
                )}
              />
            ) : null}
            <span
              aria-hidden
              className={cn(
                "relative z-10 mt-0.5 size-[11px] shrink-0 rounded-full border md:mt-0",
                st === "current" && "border-primary bg-primary ring-4 ring-primary/15",
                st === "passed" && "border-primary bg-card",
                st === "future" && "border-border bg-card",
                st === "skipped" && "border-dashed border-border bg-card",
              )}
            />
            <span
              className={cn(
                "text-sm leading-tight md:px-1 md:text-center md:text-xs",
                st === "current" ? "font-medium text-foreground" : st === "passed" ? "text-foreground" : "text-muted-foreground",
                st === "skipped" && "line-through",
              )}
            >
              {RMA_STATUS_LABELS[s]}
              {st === "skipped" ? <span className="sr-only"> — لم يُسلك</span> : null}
              {st === "current" ? <span className="sr-only"> — الحالة الحالية</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
