"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BILLING_LABELS, type BillingStatus } from "@/features/shipping/sharwa-ship/schemas";

/** Billing axis as text + dot — always its OWN column next to the shipment status (FR-39.04). */
export function BillingText({ status }: { status: BillingStatus }) {
  const dot = status === "collected" ? "bg-success" : status === "waived" ? "bg-muted-foreground/50" : "bg-warning";
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-sm", status === "waived" && "text-muted-foreground")} data-testid="billing-status">
      <span aria-hidden className={cn("size-1.5 rounded-full", dot)} />
      {BILLING_LABELS[status]}
    </span>
  );
}

const LINKS = [
  { href: "/dashboard/shipping/sharwa-ship", label: "الإصدار والبوليصات", exact: true },
  { href: "/dashboard/shipping/sharwa-ship/queue", label: "طابور AWB" },
  { href: "/dashboard/shipping/sharwa-ship/rate-cards", label: "لقطات التسعيرة" },
  { href: "/dashboard/shipping/supervisor", label: "الإشراف وإعادة الإسناد" },
  { href: "/dashboard/shipping/agent-shifts", label: "المناوبات" },
];

/** The M39 sub-navigation (text links, wraps on phones). */
export function SharwaShipNav() {
  const pathname = usePathname();
  const active = (l: (typeof LINKS)[number]) => (l.exact ? pathname === l.href || /^\/dashboard\/shipping\/sharwa-ship\/\d+$/.test(pathname) : pathname === l.href || pathname.startsWith(`${l.href}/`));
  return (
    <nav aria-label="أقسام شروة شيب" className="-mx-1 flex flex-wrap gap-x-1 text-sm" data-testid="sharwa-ship-nav">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={active(l) ? "page" : undefined}
          className={cn("inline-flex min-h-11 items-center rounded-md px-1.5 text-muted-foreground hover:text-foreground lg:min-h-8", active(l) && "text-foreground underline underline-offset-[6px]")}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

/** Weight triple in Mono (FR-39.03): «فعلي / حجمي / للاحتساب». */
export function WeightPreview({ w }: { w: { actual: string; volumetric: string; chargeable: string } | null }) {
  if (!w) return <span className="text-sm text-muted-foreground" title="الطلب بلا تجهيز — بوليصة على مستوى الطلب">—</span>;
  return (
    <span className="inline-flex flex-col text-xs" data-testid="weight-preview">
      <span className="text-muted-foreground">
        فعلي <bdi className="font-mono tabular-nums">{w.actual}</bdi> · حجمي <bdi className="font-mono tabular-nums">{w.volumetric}</bdi>
      </span>
      <span>
        للاحتساب <bdi className="font-mono text-sm tabular-nums text-foreground" data-testid="chargeable">{w.chargeable}</bdi> كغ
      </span>
    </span>
  );
}
