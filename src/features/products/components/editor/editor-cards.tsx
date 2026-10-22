"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shopify-style editor surfaces (UI/UX overhaul 2026-10-22): the product editor is one
 * scrollable page of vertical cards — no tabs, no section nav. A card is the `.surface-card`
 * token sheet; `CollapsibleCard` is the closed-by-default variant used for shipping, SEO and
 * the edit-only panels. It opens by itself when it holds a validation error, so a failed
 * save never hides the field that blocked it.
 */
export function EditorCard({
  id,
  title,
  description,
  action,
  children,
  className,
  testId,
}: {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("surface-card flex flex-col gap-5 p-5 md:p-6", className)} data-testid={testId}>
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={`${id}-title`} className="text-base font-semibold">
            {title}
          </h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function CollapsibleCard({
  id,
  title,
  summary,
  defaultOpen = false,
  forceOpen = false,
  children,
  testId,
}: {
  id: string;
  title: ReactNode;
  /** One line shown under the title while the card is closed. */
  summary?: ReactNode;
  defaultOpen?: boolean;
  /** Keeps the card open (e.g. a field inside has an error). */
  forceOpen?: boolean;
  children: ReactNode;
  testId?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const expanded = open || forceOpen;
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="surface-card flex flex-col" data-testid={testId}>
      <h2 id={`${id}-title`} className="text-base font-semibold">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !(o || forceOpen))}
          className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-5 py-4 text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:px-6"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span>{title}</span>
            {!expanded && summary ? <span className="truncate text-sm font-normal text-muted-foreground">{summary}</span> : null}
          </span>
          <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} aria-hidden />
        </button>
      </h2>
      {expanded ? (
        <div id={panelId} className="flex flex-col gap-4 border-t border-border/60 px-5 pt-5 pb-5 md:px-6 md:pb-6">
          {children}
        </div>
      ) : null}
    </section>
  );
}

/** A titled group inside a card, separated from the previous group by a hairline. */
export function CardGroup({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-t border-border/60 pt-5 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}
