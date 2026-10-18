"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ForbiddenState } from "@/components/shared/access-gate";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { CONNECTION_LABELS, type Connection } from "@/features/shipping/schemas";

export const primaryButton = "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 lg:h-9";
export const outlineButton = "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 lg:h-9";
export const ghostButton = "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 lg:h-8";
export const dangerButton = "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-destructive/40 px-3 text-sm text-destructive hover:bg-destructive/5 disabled:cursor-not-allowed disabled:opacity-60 lg:h-9";

/** M15 §2: every settings screen is the owner's (no `shipping.*` key among the 35). */
export function OwnerGate({ children }: { children: ReactNode }) {
  const { session } = useAccess();
  if (session.kind !== "merchant") return <ForbiddenState description="إعدادات الشحن مقصورة على مالك المتجر." />;
  return <>{children}</>;
}

export function useIsOwner() {
  return useAccess().session.kind === "merchant";
}

export const OWNER_ONLY_TITLE = "مقصور على مالك المتجر";

/** Status as text + dot (constitution I). */
export function ActiveDot({ active, on = "نشط", off = "معطّل" }: { active: boolean; on?: string; off?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
      <span aria-hidden className={cn("size-1.5 rounded-full", active ? "bg-success" : "bg-muted-foreground/50")} />
      {active ? on : off}
    </span>
  );
}

export function ConnectionText({ connection }: { connection: Connection }) {
  const dot = connection === "connected" ? "bg-success" : connection === "error" ? "bg-destructive" : "bg-muted-foreground/50";
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-sm", connection === "error" && "text-destructive")} data-testid="carrier-connection">
      <span aria-hidden className={cn("size-1.5 rounded-full", dot)} />
      {CONNECTION_LABELS[connection]}
    </span>
  );
}

/** «شروة شيب» marker as plain bordered text — not a filled badge. */
export function SharwaTag() {
  return <span className="inline-flex items-center rounded border border-border px-1.5 text-xs text-muted-foreground" data-testid="sharwa-official">شروة شيب</span>;
}

const LINKS = [
  { href: "/dashboard/shipping", label: "الرسوم والطرق" },
  { href: "/dashboard/shipping/pickup-locations", label: "نقاط الاستلام" },
  { href: "/dashboard/shipping/providers", label: "المندوبون والشركات" },
  { href: "/dashboard/shipping/carriers", label: "الناقلون" },
  { href: "/dashboard/shipping/zones", label: "مناطق شروة شيب" },
  { href: "/dashboard/shipping/packaging", label: "التغليف" },
  { href: "/dashboard/shipping/zone-review", label: "مراجعة المناطق" },
  { href: "/dashboard/shipping/edge-cases", label: "الحالات الحدّية" },
];

/** A quiet text sub-navigation across the shipping screens (wraps on phones, never scrolls the page). */
export function ShippingSubnav() {
  const pathname = usePathname();
  const current = LINKS.filter((l) => pathname === l.href || pathname.startsWith(`${l.href}/`)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav aria-label="أقسام الشحن" className="-mx-1 flex flex-wrap gap-x-1 text-sm">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={current === l.href ? "page" : undefined}
          className={cn("inline-flex min-h-11 items-center rounded-md px-1.5 text-muted-foreground hover:text-foreground lg:min-h-8", current === l.href && "text-foreground underline underline-offset-[6px]")}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

/** The form sheet every CRUD in this module uses (side="left" in RTL = the reading end; full width on phones). */
export function FormSheet({ open, onOpenChange, title, description, children, testId }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; children: ReactNode; testId?: string }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full gap-0 overflow-y-auto p-5 data-[side=left]:w-full data-[side=left]:sm:max-w-md" data-testid={testId}>
        <SheetHeader className="p-0 pb-4 text-start">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}

export function SheetActions({ onCancel, submitLabel, pending, testId }: { onCancel: () => void; submitLabel: string; pending: boolean; testId?: string }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" className={outlineButton} onClick={onCancel}>
        إلغاء
      </button>
      <button type="submit" className={primaryButton} disabled={pending} data-testid={testId}>
        {submitLabel}
      </button>
    </div>
  );
}

/** Delete confirmation — a sentence naming what goes, then the destructive button. */
export function ConfirmDelete({ open, title, description, pending, onCancel, onConfirm }: { open: boolean; title: string; description: string; pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onCancel())}>
      <DialogContent className="sm:max-w-sm" data-testid="confirm-delete">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <DialogFooter>
          <button type="button" className={outlineButton} onClick={onCancel}>
            إلغاء
          </button>
          <button type="button" className={dangerButton} disabled={pending} onClick={onConfirm} data-testid="confirm-delete-button">
            حذف
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
