"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AccessGate } from "@/components/shared/access-gate";
import { cn } from "@/lib/utils";
import { JOB_STATUS_LABELS, isLive, type JobStatus } from "@/features/dropshipping/schemas";

type Tone = "warning" | "info" | "destructive" | "success" | "muted";
const DOT: Record<Tone, string> = { warning: "bg-warning", info: "bg-info", destructive: "bg-destructive", success: "bg-success", muted: "bg-muted-foreground" };

export function StatusText({ tone, label, pulse = false, testId, value }: { tone: Tone; label: string; pulse?: boolean; testId?: string; value?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm" data-testid={testId} data-status={value}>
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", DOT[tone], pulse && "motion-safe:animate-pulse")} />
      <span className={tone === "muted" ? "text-muted-foreground" : "text-foreground"}>{label}</span>
    </span>
  );
}

const JOB_TONE: Record<JobStatus, Tone> = { queued: "muted", running: "info", completed: "success", completed_with_errors: "warning", failed: "destructive" };
export const DropJobStatus = ({ status }: { status: JobStatus }) => <StatusText tone={JOB_TONE[status]} label={JOB_STATUS_LABELS[status]} pulse={isLive(status)} testId="drop-job-status" value={status} />;

/** FR-29.01: plan feature `dropshipping`, then `channels.dropshipping.manage`. */
export function DropshippingGate({ children }: { children: ReactNode }) {
  return (
    <AccessGate feature="dropshipping" permission="channels.dropshipping.manage">
      {children}
    </AccessGate>
  );
}

const ROOT = "/dashboard/channels/dropshipping";
const TABS = [
  { key: "hub", href: ROOT, label: "الموردون" },
  { key: "rules", href: `${ROOT}/pricing-rules`, label: "قواعد التسعير" },
  { key: "feeds", href: `${ROOT}/feeds`, label: "الملفات" },
  { key: "orders", href: `${ROOT}/orders`, label: "طلبات الموردين" },
  { key: "jobs", href: `${ROOT}/jobs`, label: "المهام" },
] as const;

export function DropshippingNav({ active }: { active: (typeof TABS)[number]["key"] | null }) {
  return (
    <nav aria-label="أقسام الدروبشيبينغ" className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 lg:mx-0 lg:px-0">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          className={cn("flex h-11 shrink-0 items-center border-b-2 px-3 text-sm lg:h-9", t.key === active ? "border-cta font-medium text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export const DROP_ROOT = ROOT;

export function duration(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  return m ? `${m}د ${seconds % 60}ث` : `${seconds}ث`;
}
