"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { AccessGate } from "@/components/shared/access-gate";
import { ErrorState } from "@/components/shared/error-state";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useMarketingSummary } from "@/features/marketing/api";
import { CAMPAIGN_STATUS_LABELS } from "@/features/marketing/schemas";
import type { FeatureKey } from "@/lib/access";
import { formatNumber, formatRelative } from "@/lib/format";

/**
 * US-13.1 — the hub: a text number strip (no KPI cards) and a dense list of the seven tools,
 * each gated by its plan feature. Tools the plan lacks stay visible as «غير متاح في خطتك».
 */
const TOOLS: Array<{ href: string; title: string; description: string; feature: FeatureKey; ownerOnly?: boolean }> = [
  { href: "/dashboard/marketing/coupons", title: "الكوبونات", description: "أكواد خصم بنسبة أو مبلغ، على كل المتجر أو تصنيف أو منتج.", feature: "coupon" },
  { href: "/dashboard/marketing/offers", title: "العروض الترويجية", description: "خصومات تلقائية، شحن مجاني، اشترِ X واحصل على Y — تظهر في واجهة المتجر.", feature: "promotions" },
  { href: "/dashboard/marketing/abandoned-carts", title: "السلات المتروكة", description: "السلات التي لم تُكمَل، مع تذكيرات واتساب وكوبون استرداد.", feature: "abandoned_carts", ownerOnly: true },
  { href: "/dashboard/marketing/campaigns", title: "الحملات", description: "رسائل جماعية لجمهور محدد عبر القنوات المربوطة.", feature: "campaigns", ownerOnly: true },
  { href: "/dashboard/marketing/timeline", title: "الجدول الزمني", description: "المواسم والمناسبات والحملات المخططة على شريط الأشهر.", feature: "timeline", ownerOnly: true },
  { href: "/dashboard/marketing/loyalty", title: "نقاط الولاء", description: "نقاط لكل ريال وقيمة استبدالها.", feature: "loyalty_settings", ownerOnly: true },
  { href: "/dashboard/marketing/gifting", title: "الإهداء", description: "السماح للعميل بإرسال الطلب كهدية برسالة.", feature: "gift_settings", ownerOnly: true },
];

export function MarketingHub() {
  return (
    <AccessGate feature="marketing">
      <div className="flex flex-col gap-6" data-testid="marketing-hub">
        <PageHeader title="مركز التسويق" description="الكوبونات والعروض والحملات وكل ما يجلب العملاء ويعيدهم." />
        <SummaryStrip />
        <ToolList />
        <p className="text-xs text-muted-foreground">
          الشريط التسويقي أعلى المتجر يُدار من{" "}
          <Link href="/dashboard/settings/announcement" className="text-foreground underline-offset-4 hover:underline" data-testid="bar-link">
            إعدادات شريط الإعلان
          </Link>
          .
        </p>
      </div>
    </AccessGate>
  );
}

function SummaryStrip() {
  const summary = useMarketingSummary();
  if (summary.isError) return <ErrorState error={summary.error} onRetry={() => void summary.refetch()} className="py-4" />;
  const d = summary.data;
  const items: Array<{ label: string; value: string | null; href: string }> = [
    { label: "كوبونات فعّالة", value: d ? formatNumber(d.active_coupons) : null, href: "/dashboard/marketing/coupons?status=active" },
    { label: "عروض فعّالة", value: d ? formatNumber(d.active_offers) : null, href: "/dashboard/marketing/offers?status=active" },
    { label: "سلات متروكة اليوم", value: d ? formatNumber(d.abandoned_today) : null, href: "/dashboard/marketing/abandoned-carts?status=abandoned" },
  ];
  return (
    <section aria-label="ملخص التسويق" className="flex flex-col gap-2 border-b border-border pb-5 text-sm md:flex-row md:flex-wrap md:items-baseline md:gap-x-6" data-testid="marketing-summary">
      {items.map((it) => (
        <Link key={it.label} href={it.href} className="inline-flex min-h-11 items-baseline gap-2 hover:underline md:min-h-0">
          {it.value === null ? <Skeleton className="h-5 w-8" /> : <Mono className="text-base font-semibold">{it.value}</Mono>}
          <span className="text-muted-foreground">{it.label}</span>
        </Link>
      ))}
      <span className="inline-flex min-h-11 items-baseline gap-2 text-muted-foreground md:min-h-0 md:ms-auto">
        <span>آخر حملة:</span>
        {d === undefined ? (
          <Skeleton className="h-4 w-24" />
        ) : d.last_campaign ? (
          <Link href={`/dashboard/marketing/campaigns/${d.last_campaign.id}`} className="inline-flex min-h-11 items-center text-foreground hover:underline md:min-h-0">
            {d.last_campaign.name} · {CAMPAIGN_STATUS_LABELS[d.last_campaign.status]}
            {d.last_campaign.sent_at ? ` · ${formatRelative(d.last_campaign.sent_at)}` : ""}
          </Link>
        ) : (
          <span>لا حملات بعد</span>
        )}
      </span>
    </section>
  );
}

function ToolList() {
  const { canFeature, session } = useAccess();
  const isOwner = session.kind === "merchant";
  return (
    <ul className="divide-y divide-border/60 surface-card overflow-hidden" data-testid="marketing-tools">
      {TOOLS.map((t) => {
        const on = canFeature(t.feature);
        const allowed = on && (!t.ownerOnly || isOwner);
        const inner = (
          <>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium">{t.title}</span>
              <span className="text-xs text-muted-foreground">{t.description}</span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">{!on ? "غير متاح في خطتك" : !isOwner && t.ownerOnly ? "للمالك فقط" : <span aria-hidden>←</span>}</span>
          </>
        );
        return (
          <li key={t.href} data-feature={t.feature} data-enabled={allowed}>
            {allowed ? (
              <Link href={t.href} className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 hover:bg-muted">
                {inner}
              </Link>
            ) : (
              <div aria-disabled className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 opacity-60">
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
