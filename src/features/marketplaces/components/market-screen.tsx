"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import { useMarketHub } from "@/features/marketplaces/api";
import { MARKET_LABELS, type Market } from "@/features/marketplaces/schemas";
import { MarketplacesGate, MarketplacesNav, StatusText } from "@/features/marketplaces/components/bits";
import { ListingsPanel } from "@/features/marketplaces/components/listings-panel";
import { MarketSettingsPanel } from "@/features/marketplaces/components/market-settings";

/**
 * `/dashboard/channels/marketplaces/[market]?tab=listings|settings` — one page per market
 * (spec §6 lists `/[market]/settings` and `/[market]/listings`; a `tab` in the URL keeps the
 * route tree shallow and the state shareable).
 */
const TABS = ["listings", "settings"] as const;

export function MarketScreen({ market }: { market: Market }) {
  return (
    <MarketplacesGate>
      <MarketInner market={market} />
    </MarketplacesGate>
  );
}

function MarketInner({ market }: { market: Market }) {
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(TABS).withDefault("listings"));
  const hub = useMarketHub();
  const row = hub.data?.find((m) => m.marketplace === market);
  const canPush = Boolean(row?.connected && !row.needs_reauth);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={MARKET_LABELS[market]} description={row?.account_label ?? undefined} actions={row ? <StatusText tone={row.connected ? "success" : "muted"} label={row.connected ? "مربوط" : "غير مربوط"} /> : null} />
      <MarketplacesNav active={market} />
      {row && !canPush ? (
        <p role="status" className="rounded-lg border border-border p-3 text-sm text-muted-foreground" data-testid="push-disabled-hint">
          {row.needs_reauth ? "انتهت صلاحية الربط — أعد الربط من صفحة الأسواق لتفعيل الدفع." : "السوق غير مربوط — الدفع معطّل حتى الربط."}
        </p>
      ) : null}
      <div role="tablist" aria-label="أقسام السوق" className="flex gap-1">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => void setTab(t)} className={cn("h-11 rounded-md px-3 text-sm lg:h-8", tab === t ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground")} data-testid={`tab-${t}`}>
            {t === "listings" ? "القوائم" : "الإعدادات"}
          </button>
        ))}
      </div>
      <div role="tabpanel">{tab === "listings" ? <ListingsPanel market={market} canPush={canPush} /> : <MarketSettingsPanel market={market} />}</div>
    </div>
  );
}
