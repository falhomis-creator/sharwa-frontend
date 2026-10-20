"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AccessGate } from "@/components/shared/access-gate";
import { cn } from "@/lib/utils";
import {
  JOB_STATUS_LABELS,
  JOB_STATUS_TONE,
  MARKET_LABELS,
  SYNC_STATUS_LABELS,
  SYNC_STATUS_TONE,
  isLive,
  type JobStatus,
  type Market,
  type SyncStatus,
  type Tone,
} from "@/features/marketplaces/schemas";

const DOT: Record<Tone, string> = { warning: "bg-warning", info: "bg-info", destructive: "bg-destructive", success: "bg-success", muted: "bg-muted-foreground" };

/** Dot + Arabic label (constitution I). A live job pulses quietly (spec §6). */
export function StatusText({ tone, label, pulse = false, testId, value, className }: { tone: Tone; label: string; pulse?: boolean; testId?: string; value?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-sm", className)} data-testid={testId} data-status={value}>
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", DOT[tone], pulse && "motion-safe:animate-pulse")} />
      <span className={tone === "muted" ? "text-muted-foreground" : "text-foreground"}>{label}</span>
    </span>
  );
}

export const SyncStatusText = ({ status }: { status: SyncStatus }) => <StatusText tone={SYNC_STATUS_TONE[status]} label={SYNC_STATUS_LABELS[status]} testId="listing-status" value={status} />;
export const JobStatusText = ({ status }: { status: JobStatus }) => <StatusText tone={JOB_STATUS_TONE[status]} label={JOB_STATUS_LABELS[status]} pulse={isLive(status)} testId="job-status" value={status} />;

/** FR-28.01: plan feature first, then `channels.marketplaces.manage`. */
export function MarketplacesGate({ children }: { children: ReactNode }) {
  return (
    <AccessGate feature="marketplaces" permission="channels.marketplaces.manage">
      {children}
    </AccessGate>
  );
}

const TABS = [
  { href: "/dashboard/channels/marketplaces", label: "الأسواق" },
  { href: "/dashboard/channels/marketplaces/amazon", label: MARKET_LABELS.amazon },
  { href: "/dashboard/channels/marketplaces/noon", label: MARKET_LABELS.noon },
  { href: "/dashboard/channels/marketplaces/jobs", label: "المهام" },
  { href: "/dashboard/channels/marketplaces/orders", label: "طلبات الأسواق" },
] as const;

/** Section nav shared by the M28 screens (text tabs, 1px underline). */
export function MarketplacesNav({ active }: { active: "hub" | Market | "jobs" | "orders" }) {
  const key = (h: string) => (h.endsWith("marketplaces") ? "hub" : h.split("/").at(-1));
  return (
    <nav aria-label="أقسام الأسواق" className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 lg:mx-0 lg:px-0">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={key(t.href) === active ? "page" : undefined}
          className={cn("flex h-11 shrink-0 items-center border-b-2 px-3 text-sm lg:h-9", key(t.href) === active ? "border-cta font-medium text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m}د ${s}ث` : `${s}ث`;
}
