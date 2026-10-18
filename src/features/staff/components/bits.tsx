"use client";

import { Fragment, type ReactNode } from "react";
import { Ltr, Mono } from "@/components/shared/mono";
import { cn } from "@/lib/utils";
import { prettyPhone } from "@/lib/format";
import { STAFF_STATUS_LABELS, type StaffStatus } from "@/features/staff/schemas";

/** Status as text + a dot — never a filled badge (constitution I). */
export function StatusText({ status, className }: { status: StaffStatus; className?: string }) {
  const dot = status === "active" ? "bg-success" : status === "inactive" ? "bg-warning" : "bg-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-sm", status === "terminated" && "text-muted-foreground", className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", dot)} />
      {STAFF_STATUS_LABELS[status]}
    </span>
  );
}

export function Phone({ phone }: { phone: string }) {
  return <Ltr className="font-mono text-sm tabular-nums">{prettyPhone(phone)}</Ltr>;
}

/** The compact before → after diff of an audit row: only the keys that changed. */
export function SnapshotDiff({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  const changed = keys.filter((k) => JSON.stringify(before?.[k]) !== JSON.stringify(after?.[k]));
  if (changed.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs">
      {changed.slice(0, 4).map((k) => (
        <Fragment key={k}>
          <dt className="whitespace-nowrap text-muted-foreground">{k}</dt>
          <dd className="min-w-0 truncate">
            {before && k in before ? <Val v={before[k]} className="text-muted-foreground line-through" /> : null}
            {before && k in before && after && k in after ? <span aria-hidden className="px-1 text-border">→</span> : null}
            {after && k in after ? <Val v={after[k]} /> : null}
          </dd>
        </Fragment>
      ))}
      {changed.length > 4 ? (
        <dd className="col-span-2 text-muted-foreground">
          و<Mono>{changed.length - 4}</Mono> حقول أخرى
        </dd>
      ) : null}
    </dl>
  );
}

function Val({ v, className }: { v: unknown; className?: string }) {
  const text = typeof v === "boolean" ? (v ? "نعم" : "لا") : v === null || v === undefined ? "∅" : typeof v === "object" ? JSON.stringify(v) : String(v);
  const mono = typeof v === "number" || /^[\w.\-:+/ ]*$/.test(text);
  return mono ? <Mono className={className}>{text}</Mono> : <span className={className}>{text}</span>;
}

export function ShortHash({ hash }: { hash: string }) {
  return (
    <Mono title={hash} className="text-xs text-muted-foreground">
      {hash.slice(0, 10)}
    </Mono>
  );
}

/** A definition row used in sheets: label start, value end. */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-end">{children}</dd>
    </div>
  );
}

export const primaryButton = "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 lg:h-9";
export const outlineButton = "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 lg:h-9";
export const dangerButton = "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-destructive/40 px-3 text-sm text-destructive hover:bg-destructive/5 disabled:cursor-not-allowed disabled:opacity-60 lg:h-9";
