"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { FeatureOffState, ForbiddenState } from "@/components/shared/access-gate";
import type { FeatureKey } from "@/lib/access";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";

/**
 * M14 gates: every screen is owner-only (§2 — no staff permission key covers money), then
 * the plan feature (FR-14.07). `anyOf` lets the payout-accounts screen open when either
 * `bank_transfers` or `local_wallets` is on.
 */
export function PaymentsGate({ anyOf, children }: { anyOf: FeatureKey[]; children: ReactNode }) {
  const { session, canFeature } = useAccess();
  if (session.kind !== "merchant") return <ForbiddenState description="المدفوعات والمحفظة وحسابات الاستلام مقصورة على مالك المتجر." />;
  if (!anyOf.some((f) => canFeature(f))) return <FeatureOffState />;
  return <>{children}</>;
}

/** Status as text + dot (constitution I: never a filled badge). */
export function StatusText({ label, dot, text, testId, className }: { label: string; dot: string; text?: string; testId?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-xs", text ?? "text-muted-foreground", className)} data-testid={testId}>
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", dot)} />
      {label}
    </span>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground lg:h-8">
      <ArrowRight className="size-4 ltr:rotate-180" aria-hidden /> {children}
    </Link>
  );
}

const MD = "(min-width: 768px)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(MD);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
export const useIsDesktop = () => useSyncExternalStore(subscribe, () => window.matchMedia(MD).matches, () => true);

export function isTyping(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)));
}

/** Small section frame used across the M14 screens. */
export function Section({ title, description, actions, children, testId }: { title: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; testId?: string }) {
  return (
    <section className="flex flex-col gap-3" data-testid={testId} aria-label={title}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
