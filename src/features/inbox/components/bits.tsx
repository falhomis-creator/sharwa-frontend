"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatDateTime, formatRelative } from "@/lib/format";

/**
 * Shared text-first pieces of the M27/M30/M31/M32 screens: a status as a 6px semantic
 * dot + text (constitution I — never a filled badge), and a relative time in Mono that
 * re-renders every 30s so «منذ دقيقة» never goes stale while the inbox is open.
 */
export type Tone = "info" | "warning" | "success" | "destructive" | "muted";
const DOT: Record<Tone, string> = { info: "bg-info", warning: "bg-warning", success: "bg-success", destructive: "bg-destructive", muted: "bg-muted-foreground" };

export function StatusDot({ tone, label, className, testId, value }: { tone: Tone; label: string; className?: string; testId?: string; value?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-sm", className)} data-testid={testId} data-status={value}>
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", DOT[tone])} />
      <span className={tone === "muted" ? "text-muted-foreground" : "text-foreground"}>{label}</span>
    </span>
  );
}

export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function RelTime({ iso, now, className }: { iso: string; now: Date; className?: string }) {
  return (
    <time dateTime={iso} title={formatDateTime(iso)} className={cn("whitespace-nowrap text-xs text-muted-foreground", className)}>
      {formatRelative(iso, now)}
    </time>
  );
}

/** A calm, persistent strip (polling broken, channel disconnected, AI disabled…). */
export function Notice({ children, tone = "muted", action, testId }: { children: React.ReactNode; tone?: "muted" | "warning" | "destructive"; action?: React.ReactNode; testId?: string }) {
  return (
    <div
      role="status"
      data-testid={testId}
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2 text-sm",
        tone === "warning" ? "border-warning/40 text-foreground" : tone === "destructive" ? "border-destructive/40 text-foreground" : "border-border text-muted-foreground",
      )}
    >
      <span className="min-w-0 flex-1">{children}</span>
      {action}
    </div>
  );
}

export function newClientId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `c-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}
