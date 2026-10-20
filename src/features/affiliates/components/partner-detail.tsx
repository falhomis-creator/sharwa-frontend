"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { ArrowRight, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FeatureOffState } from "@/components/shared/access-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, headerLabel } from "@/components/shared/data-table";
import { isApiError } from "@/lib/api-error";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useStoreOrigin } from "@/features/dashboard-shell/components/store-context";
import { ConfirmDialog } from "@/features/marketing/components/shared";
import { useAffiliate, useInfluencer, useMarkPaid, usePartnerSales, useSavePartner } from "@/features/affiliates/api";
import { COMMISSION_TYPE_LABELS, PARTNER_KIND_LABELS, PAYOUT_STATUSES, PAYOUT_STATUS_LABELS, referralLink, whatsappLink, type Affiliate, type Influencer, type MarkPaidResult, type PartnerKind, type Sale } from "@/features/affiliates/schemas";
import { ActiveText, CopyButton, OrderStateNote, PayoutStatusText } from "@/features/affiliates/components/bits";
import { PartnerFormSheet } from "@/features/affiliates/components/partner-form-sheet";

/**
 * `/dashboard/marketing/{affiliates,influencers}/[id]` (M17 §6): code/link, the
 * influencer's coupons (US-17.2), the sales with their payout state and the settlement
 * (US-17.4): select pending sales → the SERVER previews «N عمليات — المجموع X» → mark paid.
 * `pending → paid` only; there is no undo in the UI (§5).
 */
export function PartnerDetailScreen({ kind, id }: { kind: PartnerKind; id: number }) {
  const { canFeature } = useAccess();
  if (!canFeature(PARTNER_KIND_LABELS[kind].feature)) return <FeatureOffState title={`ميزة ${PARTNER_KIND_LABELS[kind].plural} غير مفعّلة في خطتك`} description="فعّل التسويق بالعمولة من باقتك." />;
  return kind === "affiliates" ? <AffiliateLoader id={id} /> : <InfluencerLoader id={id} />;
}

function AffiliateLoader({ id }: { id: number }) {
  const q = useAffiliate(id);
  return <Loaded kind="affiliates" q={q} />;
}
function InfluencerLoader({ id }: { id: number }) {
  const q = useInfluencer(id);
  return <Loaded kind="influencers" q={q} />;
}

function Loaded({ kind, q }: { kind: PartnerKind; q: { data?: Affiliate | Influencer; isLoading: boolean; error: unknown; refetch: () => unknown } }) {
  const labels = PARTNER_KIND_LABELS[kind];
  const back = (
    <Link href={labels.path} className="inline-flex h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground lg:h-8">
      <ArrowRight className="size-4 ltr:rotate-180" aria-hidden /> {labels.plural}
    </Link>
  );
  if (q.isLoading)
    return (
      <div className="flex flex-col gap-4">
        {back}
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  if (!q.data) {
    if (isApiError(q.error) && q.error.status === 404) return <div className="flex flex-col gap-4">{back}<EmptyState title={`لا يوجد ${labels.one} بهذا المعرّف`} /></div>;
    return <div className="flex flex-col gap-4">{back}<ErrorState error={q.error} onRetry={() => void q.refetch()} /></div>;
  }
  return (
    <div className="flex flex-col gap-6" data-testid="partner-detail">
      {back}
      <PartnerHeader kind={kind} row={q.data} />
      <ReferralBlock kind={kind} row={q.data} />
      {kind === "influencers" ? <CouponsBlock row={q.data as Influencer} /> : null}
      <SalesBlock kind={kind} row={q.data} />
    </div>
  );
}

function PartnerHeader({ kind, row }: { kind: PartnerKind; row: Affiliate | Influencer }) {
  const { session } = useAccess();
  const isOwner = session.kind === "merchant";
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const save = useSavePartner(kind, row.id);
  async function toggle() {
    try {
      await save.mutateAsync({ is_active: !row.is_active });
      toast.success(row.is_active ? "أُوقف — يبقى رابطه يفتح المتجر بلا نسب جديد." : "أُعيد تفعيله.");
      setConfirm(false);
    } catch (err) {
      toast.error(isApiError(err) ? err.userMessage : "تعذّر الحفظ.");
    }
  }
  return (
    <>
      <PageHeader
        title={row.name}
        eyebrow={row.referral_code}
        description={`${COMMISSION_TYPE_LABELS[row.commission_type]} · ${row.display_commission}`}
        actions={
          <span className="flex flex-wrap items-center gap-2">
            <ActiveText active={row.is_active} />
            {isOwner ? (
              <>
                <Button type="button" variant="outline" className="h-11 lg:h-9" onClick={() => setEdit(true)} data-testid="edit-partner">
                  تعديل
                </Button>
                <Button type="button" variant="outline" className={cn("h-11 lg:h-9", row.is_active && "text-destructive")} onClick={() => setConfirm(true)} data-testid="toggle-partner">
                  {row.is_active ? "إيقاف" : "إعادة التفعيل"}
                </Button>
              </>
            ) : null}
          </span>
        }
      />
      <PartnerFormSheet kind={kind} open={edit} onOpenChange={setEdit} row={row} />
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={row.is_active ? `إيقاف ${row.name}؟` : `إعادة تفعيل ${row.name}؟`}
        description={row.is_active ? "تبقى بياناته ومستحقاته كما هي، ويتوقف احتساب أي طلب جديد له." : "يعود احتساب الطلبات الجديدة له."}
        confirmLabel={row.is_active ? "إيقاف" : "إعادة التفعيل"}
        destructive={row.is_active}
        pending={save.isPending}
        onConfirm={() => void toggle()}
        testId="toggle-dialog"
      />
    </>
  );
}

function ReferralBlock({ kind, row }: { kind: PartnerKind; row: Affiliate | Influencer }) {
  const origin = useStoreOrigin();
  const a = kind === "affiliates" ? (row as Affiliate) : null;
  const link = referralLink(origin, row.referral_code);
  return (
    <section aria-labelledby="ref-h" className="flex flex-col gap-3 border-b border-border pb-6">
      <h2 id="ref-h" className="text-sm font-medium">
        {a ? "رمز الإحالة ورابطه" : "رمز الإحالة"}
      </h2>
      <div className="flex items-center gap-1">
        <Mono className="text-sm" data-testid="detail-code">{row.referral_code}</Mono>
        <CopyButton text={row.referral_code} label="نسخ الرمز" done="نُسخ الرمز." />
      </div>
      {a ? (
        <>
          <div className="flex max-w-2xl items-center gap-1">
            {/* §11 II: the copied link is an isolated LTR field. */}
            <input readOnly value={link} dir="ltr" aria-label="رابط الإحالة" onFocus={(e) => e.currentTarget.select()} className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-muted/40 px-3 font-mono text-xs lg:h-9" data-testid="referral-link" />
            <CopyButton text={link} label="نسخ الرابط" done="نُسخ رابط الإحالة." testId="copy-referral-link" />
            <a
              href={whatsappLink(a.phone, `رابطك للتسويق بالعمولة: ${link}`)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-9"
              data-testid="detail-whatsapp"
            >
              <MessageCircle className="size-4" strokeWidth={1.75} aria-hidden />
              إرسال عبر واتساب
            </a>
          </div>
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div className="flex gap-1.5"><dt className="text-muted-foreground">الهاتف</dt><dd><Mono>{a.phone}</Mono></dd></div>
            <div className="flex gap-1.5"><dt className="text-muted-foreground">النقرات</dt><dd><Mono>{formatNumber(a.clicks_count)}</Mono></dd></div>
            <div className="flex gap-1.5"><dt className="text-muted-foreground">التحويل</dt><dd><Mono>{formatNumber(a.sales_count)}</Mono> من <Mono>{formatNumber(a.clicks_count)}</Mono></dd></div>
          </dl>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          وسيلة التواصل: <span dir="auto" className="text-foreground">{(row as Influencer).contact}</span>
        </p>
      )}
    </section>
  );
}

function CouponsBlock({ row }: { row: Influencer }) {
  const newHref = `/dashboard/marketing/coupons/new?influencer=${row.id}`;
  return (
    <section aria-labelledby="coupons-h" className="flex flex-col gap-3 border-b border-border pb-6" data-testid="influencer-coupons">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="coupons-h" className="text-sm font-medium">الكوبونات المرتبطة</h2>
        <Link href={newHref} className="inline-flex h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline lg:h-8" data-testid="new-influencer-coupon">
          إنشاء كوبون لهذا المؤثر
        </Link>
      </div>
      {row.coupons.length === 0 ? (
        <p className="text-sm text-warning" data-testid="no-coupon">لا كوبون مرتبط — لن تُنسب له مبيعات.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border/60 surface-card overflow-hidden">
          {row.coupons.map((c) => (
            <li key={c.id} className="flex min-h-11 items-center gap-3 px-3 text-sm">
              <Link href={`/dashboard/marketing/coupons/${c.id}`} className="hover:underline">
                <Mono>{c.code}</Mono>
              </Link>
              <span className="text-muted-foreground">
                <Mono>{formatNumber(c.used_count)}</Mono>
                {c.max_uses !== null ? <Mono>/{formatNumber(c.max_uses)}</Mono> : <span className="ms-1 text-xs">بلا حد</span>}
              </span>
              <span className={cn("ms-auto text-xs", c.is_active ? "" : "text-muted-foreground")}>{c.is_active ? "مفعّل" : "غير مفعّل"}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const STATUS_FILTERS = ["all", ...PAYOUT_STATUSES] as const;

function SalesBlock({ kind, row }: { kind: PartnerKind; row: Affiliate | Influencer }) {
  const { session } = useAccess();
  const isOwner = session.kind === "merchant";
  const [status, setStatus] = useQueryState("payout", parseAsStringLiteral(STATUS_FILTERS).withDefault("all").withOptions({ history: "replace" }));
  const sales = usePartnerSales(kind, row.id, status === "all" ? undefined : status);
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [settle, setSettle] = useState<number[] | null>(null);
  const rows = sales.data ?? [];
  const pendingIds = rows.filter((s) => s.payout_status === "pending").map((s) => s.id);

  const columns = useMemo<ColumnDef<Sale, unknown>[]>(
    () => [
      {
        id: "order",
        header: headerLabel("الطلب"),
        cell: ({ row: r }) => (
          <span className="whitespace-nowrap">
            <Link href={`/dashboard/orders/${r.original.order_id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
              <Mono>#{r.original.order_number}</Mono>
            </Link>
            <OrderStateNote state={r.original.order_state} />
          </span>
        ),
      },
      ...(kind === "influencers" ? [{ id: "coupon", header: headerLabel("الكوبون"), cell: ({ row: r }: { row: { original: Sale } }) => <Mono className="text-xs">{r.original.coupon_code ?? "—"}</Mono> } as ColumnDef<Sale, unknown>] : []),
      { id: "date", meta: { className: "whitespace-nowrap" }, header: headerLabel("التاريخ"), cell: ({ row: r }) => <time dateTime={r.original.created_at} title={formatDateTime(r.original.created_at)} className="text-xs text-muted-foreground"><Mono>{formatDate(r.original.created_at)}</Mono></time> },
      { id: "total", meta: { numeric: true }, header: headerLabel("إجمالي الطلب"), cell: ({ row: r }) => <Money value={r.original.display_order_total} className="whitespace-nowrap" /> },
      { id: "commission", meta: { numeric: true }, header: headerLabel("العمولة"), cell: ({ row: r }) => <Money value={r.original.display_commission} className="whitespace-nowrap" /> },
      {
        id: "payout",
        header: headerLabel("حالة الصرف"),
        cell: ({ row: r }) => (
          <span className="flex flex-col" title={r.original.payout_status === "paid" ? "قرار نهائي — لا تراجع عن الصرف من الواجهة." : undefined}>
            <PayoutStatusText status={r.original.payout_status} />
            {r.original.paid_at ? <Mono className="text-[11px] text-muted-foreground">{formatDate(r.original.paid_at)}</Mono> : null}
          </span>
        ),
      },
    ],
    [kind],
  );

  const selected = Object.keys(selection).filter((k) => selection[k]).map(Number).filter((idNum) => pendingIds.includes(idNum));

  return (
    <section aria-labelledby="sales-h" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="sales-h" className="text-sm font-medium">
          المبيعات <span className="text-muted-foreground">· المستحق <Money value={row.display_pending} /> · المدفوع <Money value={row.display_paid} muted /></span>
        </h2>
        {isOwner && pendingIds.length > 0 ? (
          <Button type="button" variant="outline" className="h-11 lg:h-9" onClick={() => setSettle(pendingIds)} data-testid="settle-all">
            تعليم كل المستحق كمدفوع
          </Button>
        ) : null}
      </div>
      <nav aria-label="حالة الصرف" className="flex flex-wrap gap-1 text-sm">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => {
              setSelection({});
              void setStatus(s === "all" ? null : s);
            }}
            className={cn("inline-flex min-h-11 items-center rounded-md px-2 transition-colors lg:min-h-8", status === s ? "text-foreground underline underline-offset-[6px]" : "text-muted-foreground hover:text-foreground")}
          >
            {s === "all" ? "الكل" : PAYOUT_STATUS_LABELS[s]}
          </button>
        ))}
      </nav>
      <DataTable<Sale>
        testId="sales-table"
        caption="مبيعات الشريك"
        columns={columns}
        data={sales.data}
        getRowId={(s) => String(s.id)}
        total={rows.length}
        page={1}
        pageSize={Math.max(rows.length, 20)}
        onPageChange={() => undefined}
        isLoading={sales.isLoading}
        isFetching={sales.isFetching}
        error={sales.error}
        onRetry={() => void sales.refetch()}
        selectable={isOwner && pendingIds.length > 0}
        rowSelection={selection}
        onRowSelectionChange={setSelection}
        bulkActions={() => (
          <Button type="button" className="h-11 lg:h-8" disabled={selected.length === 0} onClick={() => setSettle(selected)} data-testid="mark-paid">
            تعليم كمدفوعة
          </Button>
        )}
        isFiltered={status !== "all"}
        renderMobileCard={(s) => (
          <div className="flex min-h-16 w-full items-center gap-3 p-3" data-testid="sale-card">
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span>
                <Link href={`/dashboard/orders/${s.order_id}`} className="inline-flex min-h-11 items-center text-sm hover:underline">
                  <Mono>#{s.order_number}</Mono>
                </Link>
                <OrderStateNote state={s.order_state} />
              </span>
              <PayoutStatusText status={s.payout_status} />
            </span>
            <span className="flex flex-col items-end gap-1">
              <Money value={s.display_commission} className="text-sm" />
              <Money value={s.display_order_total} muted className="text-[11px]" />
            </span>
          </div>
        )}
        emptyState={<EmptyState title="لا مبيعات منسوبة بعد" description={kind === "affiliates" ? "تظهر هنا الطلبات التي جاءت عبر رابط المسوّق." : "تظهر هنا الطلبات التي استخدمت كوبونات المؤثر."} />}
        noResultsState={<EmptyState title="لا عمليات بهذه الحالة" />}
      />
      {settle ? (
        <SettleDialog
          kind={kind}
          partnerId={row.id}
          saleIds={settle}
          onClose={(done) => {
            setSettle(null);
            if (done) setSelection({});
          }}
        />
      ) : null}
    </section>
  );
}

/** FR-17.06: the server previews (count + total), then writes, then reports. */
function SettleDialog({ kind, partnerId, saleIds, onClose }: { kind: PartnerKind; partnerId: number; saleIds: number[]; onClose: (done: boolean) => void }) {
  const { preview, commit } = useMarkPaid(kind, partnerId);
  const [state, setState] = useState<{ phase: "loading" | "preview" | "error"; data?: MarkPaidResult; error?: string }>({ phase: "loading" });
  const idsKey = saleIds.join(",");
  useEffect(() => {
    let live = true;
    preview(idsKey.split(",").map(Number)).then(
      (data) => live && setState({ phase: "preview", data }),
      (err: unknown) => live && setState({ phase: "error", error: isApiError(err) ? err.userMessage : "تعذّرت المعاينة." }),
    );
    return () => {
      live = false;
    };
    // `preview` is a plain function rebuilt each render; the ids are the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);
  async function confirm() {
    try {
      const res = await commit.mutateAsync(saleIds);
      toast.success(`عُلّمت ${formatNumber(res.updated)} عمليات مدفوعة — المجموع ${res.display_total}`);
      onClose(true);
    } catch (err) {
      setState((s) => ({ ...s, error: isApiError(err) ? err.userMessage : "تعذّر الحفظ." }));
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose(false)}>
      <DialogContent className="sm:max-w-md" data-testid="settle-dialog">
        <DialogHeader>
          <DialogTitle>تعليم المستحقات كمدفوعة</DialogTitle>
          <DialogDescription>قرار نهائي: لا يمكن التراجع عن الصرف من الواجهة.</DialogDescription>
        </DialogHeader>
        {state.phase === "loading" ? (
          <Skeleton className="h-6 w-48" />
        ) : state.data ? (
          <p className="text-base" data-testid="settle-preview">
            <Mono>{formatNumber(state.data.updated)}</Mono> عمليات — المجموع <Money value={state.data.display_total} />
          </p>
        ) : null}
        {state.error ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" className="h-11 lg:h-9" onClick={() => onClose(false)} disabled={commit.isPending}>
            إلغاء
          </Button>
          <Button type="button" className="h-11 lg:h-9" onClick={() => void confirm()} disabled={state.phase !== "preview" || !state.data?.updated || commit.isPending} data-testid="settle-confirm">
            {commit.isPending ? "جارٍ الحفظ…" : "تأكيد الصرف"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
