"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { MessageCircle } from "lucide-react";
import { FeatureOffState } from "@/components/shared/access-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, FilterBar, SearchBox, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { formatNumber, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useStoreOrigin } from "@/features/dashboard-shell/components/store-context";
import { useAffiliates, useInfluencers, usePartnerSummary, type PartnerListParams } from "@/features/affiliates/api";
import { PARTNER_KIND_LABELS, referralLink, whatsappLink, type Affiliate, type Influencer, type PartnerKind } from "@/features/affiliates/schemas";
import { ActiveText, CopyButton } from "@/features/affiliates/components/bits";
import { PartnerFormSheet } from "@/features/affiliates/components/partner-form-sheet";

/**
 * `/dashboard/marketing/affiliates` + `/dashboard/marketing/influencers` (M17 US-17.1/17.3,
 * FR-17.02): ONE table component with two tabs. The two tabs are the two sidebar entries,
 * so each tab is its own URL (the spec's `?tab=influencers` is honoured too). Search,
 * sort and «لديه مستحقات فقط» live in the URL (SC-17.4); amounts are the server's strings.
 */
const parsers = { q: parseAsString.withDefault(""), has_pending: parseAsBoolean.withDefault(false), tab: parseAsString };

export const newButtonClass = "inline-flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 lg:h-9";

export function PartnersScreen({ defaultKind }: { defaultKind: PartnerKind }) {
  const { canFeature } = useAccess();
  const [f] = useQueryStates(parsers);
  const kind: PartnerKind = f.tab === "influencers" || f.tab === "affiliates" ? f.tab : defaultKind;
  const enabled = { affiliates: canFeature("affiliates"), influencers: canFeature("influencers") };
  if (!enabled.affiliates && !enabled.influencers) return <FeatureOffState title="التسويق بالعمولة والمؤثرون غير متاحَين في خطتك" description="فعّل التسويق بالعمولة من باقتك." />;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="المسوّقون والمؤثرون" description="من جلب كل طلب، وكم يستحق، وتسوية المستحقات بنقرة." />
      <PartnerTabs kind={kind} enabled={enabled} />
      {enabled[kind] ? <PartnersList key={kind} kind={kind} /> : <FeatureOffState title={`ميزة ${PARTNER_KIND_LABELS[kind].plural} غير مفعّلة في خطتك`} description="فعّل التسويق بالعمولة من باقتك." />}
    </div>
  );
}

function PartnerTabs({ kind, enabled }: { kind: PartnerKind; enabled: Record<PartnerKind, boolean> }) {
  const tabs = (["affiliates", "influencers"] as const).filter((k) => enabled[k]);
  // §8: with one of the two features off only one tab exists — no tab bar at all.
  if (tabs.length < 2) return null;
  return (
    <nav aria-label="نوع الشريك" className="-mb-2 flex gap-1 border-b border-border" data-testid="partner-tabs">
      {tabs.map((k) => (
        <Link
          key={k}
          href={PARTNER_KIND_LABELS[k].path}
          aria-current={k === kind ? "page" : undefined}
          className={cn("-mb-px inline-flex h-11 items-center border-b-2 px-3 text-sm transition-colors lg:h-9", k === kind ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
        >
          {PARTNER_KIND_LABELS[k].plural}
        </Link>
      ))}
    </nav>
  );
}

function SummaryStrip({ kind }: { kind: PartnerKind }) {
  const s = usePartnerSummary(kind);
  const item = (label: string, value: ReactNode, testId: string) => (
    <span className="flex items-baseline gap-1.5" data-testid={testId}>
      <span className="text-muted-foreground">{label}</span>
      {value}
    </span>
  );
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm" data-testid="partner-summary">
      {item("إجمالي المستحق", <Money value={s.data?.display_pending_total ?? (s.isLoading ? "…" : null)} />, "summary-pending")}
      <span aria-hidden className="text-border">·</span>
      {item("المدفوع هذا الشهر", <Money value={s.data?.display_paid_this_month ?? (s.isLoading ? "…" : null)} />, "summary-paid")}
      <span aria-hidden className="text-border">·</span>
      {item("طلبات منسوبة خلال 30 يوماً", <Mono>{s.data ? formatNumber(s.data.attributed_orders_30d) : "–"}</Mono>, "summary-orders")}
    </p>
  );
}

function PartnersList({ kind }: { kind: PartnerKind }) {
  const router = useRouter();
  const origin = useStoreOrigin();
  const { session } = useAccess();
  const isOwner = session.kind === "merchant";
  const table = useTableUrlState();
  const [f, setF] = useQueryStates(parsers, { history: "replace" });
  const [sheet, setSheet] = useState(false);
  const [now] = useState(() => new Date());
  const params: PartnerListParams = { q: f.q || undefined, sort: table.ordering || undefined, has_pending: f.has_pending ? "true" : undefined };
  const affiliates = useAffiliates(params, kind === "affiliates");
  const influencers = useInfluencers(params, kind === "influencers");
  const query = kind === "affiliates" ? affiliates : influencers;
  const rows = (query.data ?? []) as Array<Affiliate | Influencer>;
  const labels = PARTNER_KIND_LABELS[kind];

  // `N` — a new partner (§6), owner only; never while typing or with a dialog open.
  useEffect(() => {
    if (!isOwner) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable))) return;
      if (document.querySelector("[role=dialog]")) return;
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        setSheet(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOwner]);

  const columns = useMemo<ColumnDef<Affiliate | Influencer, unknown>[]>(() => {
    const cols: ColumnDef<Affiliate | Influencer, unknown>[] = [
      {
        id: "name",
        meta: { sortKey: "name" },
        header: headerLabel("الاسم"),
        cell: ({ row }) => (
          <span className="flex min-w-36 flex-col">
            <Link href={`${labels.path}/${row.original.id}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:underline">
              {row.original.name}
            </Link>
            {"phone" in row.original ? <Mono className="text-xs text-muted-foreground">{row.original.phone}</Mono> : <span dir="auto" className="text-xs text-muted-foreground">{row.original.contact}</span>}
          </span>
        ),
      },
      {
        id: "code",
        header: headerLabel("الرمز"),
        cell: ({ row }) => (
          <span className="flex items-center gap-0.5 whitespace-nowrap">
            <Mono className="text-xs" data-testid="referral-code">{row.original.referral_code}</Mono>
            <CopyButton text={"phone" in row.original ? referralLink(origin, row.original.referral_code) : row.original.referral_code} label={"phone" in row.original ? "نسخ رابط الإحالة" : "نسخ الرمز"} done={"phone" in row.original ? "نُسخ رابط الإحالة." : "نُسخ الرمز."} testId="copy-link" />
          </span>
        ),
      },
      { id: "commission", meta: { numeric: true }, header: headerLabel("العمولة"), cell: ({ row }) => <Mono className="whitespace-nowrap">{row.original.display_commission}</Mono> },
    ];
    if (kind === "affiliates") {
      cols.push({
        id: "clicks",
        meta: { numeric: true, sortKey: "clicks_count" },
        header: headerLabel("النقرات"),
        cell: ({ row }) => <Mono>{formatNumber((row.original as Affiliate).clicks_count)}</Mono>,
      });
    } else {
      cols.push({
        id: "coupons",
        header: headerLabel("الكوبونات"),
        cell: ({ row }) => {
          const c = (row.original as Influencer).coupons;
          return c.length ? <Mono className="text-xs">{c.map((x) => x.code).join("، ")}</Mono> : <span className="text-xs text-warning">لا كوبون</span>;
        },
      });
    }
    cols.push(
      {
        id: "sales",
        meta: { numeric: true, sortKey: "sales_count" },
        header: headerLabel("الطلبات"),
        cell: ({ row }) =>
          kind === "affiliates" && row.original.sales_count === 0 && (row.original as Affiliate).clicks_count > 0 ? (
            <span className="whitespace-nowrap text-xs text-muted-foreground" data-testid="conversion">
              <Mono>0</Mono> من <Mono>{formatNumber((row.original as Affiliate).clicks_count)}</Mono>
            </span>
          ) : (
            <Mono>{formatNumber(row.original.sales_count)}</Mono>
          ),
      },
      { id: "total", meta: { numeric: true }, header: headerLabel("إجمالي المبيعات"), cell: ({ row }) => <Money value={row.original.display_sales_total} className="whitespace-nowrap" /> },
      { id: "pending", meta: { numeric: true, sortKey: "pending" }, header: headerLabel("المستحق"), cell: ({ row }) => <Money value={row.original.display_pending} muted={!row.original.has_pending} className="whitespace-nowrap" /> },
      { id: "paid", meta: { numeric: true }, header: headerLabel("المدفوع"), cell: ({ row }) => <Money value={row.original.display_paid} muted className="whitespace-nowrap" /> },
      {
        id: "last",
        meta: { sortKey: "last_sale_at", className: "whitespace-nowrap" },
        header: headerLabel("آخر عملية"),
        cell: ({ row }) => (row.original.last_sale_at ? <time dateTime={row.original.last_sale_at} className="text-xs text-muted-foreground">{formatRelative(row.original.last_sale_at, now)}</time> : <span className="text-xs text-muted-foreground">—</span>),
      },
      { id: "status", header: headerLabel("الحالة"), cell: ({ row }) => <ActiveText active={row.original.is_active} /> },
    );
    if (kind === "affiliates") {
      cols.push({
        id: "whatsapp",
        meta: { srOnlyHeader: true },
        header: headerLabel("واتساب"),
        cell: ({ row }) => {
          const a = row.original as Affiliate;
          return (
            <a
              href={whatsappLink(a.phone, `رابطك للتسويق بالعمولة: ${referralLink(origin, a.referral_code)}`)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label={`إرسال الرابط إلى ${a.name} عبر واتساب`}
              title="إرسال عبر واتساب"
              className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:size-8"
              data-testid="whatsapp-link"
            >
              <MessageCircle className="size-4" strokeWidth={1.75} aria-hidden />
            </a>
          );
        },
      });
    }
    return cols;
  }, [kind, labels.path, now, origin]);

  const isFiltered = Boolean(f.q) || f.has_pending;
  const clear = () => void setF({ q: null, has_pending: null });
  const newButton = isOwner ? (
    <button type="button" className={newButtonClass} onClick={() => setSheet(true)} data-testid="new-partner">
      {labels.one} جديد
    </button>
  ) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SummaryStrip kind={kind} />
        {newButton}
      </div>
      {!isOwner ? <p className="text-sm text-muted-foreground">للعرض فقط — الإضافة والتسوية لمالك المتجر.</p> : null}
      <DataTable<Affiliate | Influencer>
        testId="partners-table"
        caption={`جدول ${labels.plural}`}
        columns={columns}
        data={query.data ? rows : undefined}
        getRowId={(r) => String(r.id)}
        total={rows.length}
        page={1}
        pageSize={Math.max(rows.length, 20)}
        onPageChange={() => undefined}
        ordering={table.ordering}
        onOrderingChange={table.setOrdering}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        isFiltered={isFiltered}
        onRowOpen={(r) => router.push(`${labels.path}/${r.id}`)}
        toolbar={
          <FilterBar activeCount={Number(f.has_pending)} onClear={clear} search={<SearchBox value={f.q} onChange={(v) => void setF({ q: v || null })} placeholder={kind === "affiliates" ? "الاسم أو الهاتف أو الرمز" : "الاسم أو وسيلة التواصل أو الرمز"} label={`بحث في ${labels.plural}`} />}>
            <label className="flex min-h-11 items-center gap-2 text-sm lg:min-h-8">
              <input type="checkbox" checked={f.has_pending} onChange={(e) => void setF({ has_pending: e.target.checked || null })} className="size-4 accent-foreground" data-testid="filter-has-pending" />
              لديه مستحقات فقط
            </label>
          </FilterBar>
        }
        renderMobileCard={(r) => (
          <div className="flex min-h-16 w-full items-center gap-3 p-3" data-testid="partner-card">
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-baseline gap-2">
                <Link href={`${labels.path}/${r.id}`} className="inline-flex min-h-11 items-center truncate text-sm font-medium hover:underline">
                  {r.name}
                </Link>
                {!r.is_active ? <span className="text-xs text-muted-foreground">موقوف</span> : null}
              </span>
              <Mono className="text-xs text-muted-foreground">{r.referral_code}</Mono>
            </span>
            <span className="flex flex-col items-end gap-0.5">
              <span className="text-[11px] text-muted-foreground">المستحق</span>
              <Money value={r.display_pending} muted={!r.has_pending} className="text-sm" />
            </span>
            <CopyButton text={"phone" in r ? referralLink(origin, r.referral_code) : r.referral_code} label={"phone" in r ? "نسخ رابط الإحالة" : "نسخ الرمز"} done={"phone" in r ? "نُسخ رابط الإحالة." : "نُسخ الرمز."} />
          </div>
        )}
        emptyState={
          <EmptyState
            title={kind === "affiliates" ? "لا مسوّقين بعد — أضف أول مسوّق وشارك رابطه" : "لا مؤثرين بعد — أضف أول مؤثر واربط به كوبوناً"}
            description={kind === "affiliates" ? "كل طلب يصل عبر رابط المسوّق يُنسب له وتُحسب عمولته تلقائياً." : "تُنسب للمؤثر الطلبات التي تستخدم كوبوناته."}
            action={newButton}
          />
        }
        noResultsState={
          <EmptyState
            title={`لا ${labels.plural} تطابق البحث`}
            action={
              <button type="button" className="inline-flex h-11 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-9" onClick={clear}>
                مسح الفلاتر
              </button>
            }
          />
        }
      />
      <PartnerFormSheet kind={kind} open={sheet} onOpenChange={setSheet} row={null} onSaved={(saved) => router.push(`${labels.path}/${saved.id}`)} />
    </div>
  );
}
