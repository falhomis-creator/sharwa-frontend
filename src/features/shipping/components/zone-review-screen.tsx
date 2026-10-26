"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { parseAsString, parseAsStringLiteral, useQueryState, useQueryStates } from "nuqs";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { DataTable, FilterBar, FilterSelect, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass, numericInputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { ToggleRow } from "@/components/shared/toggle-row";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { isApiError } from "@/lib/api-error";
import { formatRelative } from "@/lib/format";
import { useDeliveryMethods, usePickups, useResolveReview, useRestrictedWrites, useRestrictedZones, useSlaRules, useSlaWrites, useZoneReview, useZones } from "@/features/shipping/api";
import {
  REVIEW_ACTION_LABELS,
  REVIEW_REASONS,
  REVIEW_REASON_LABELS,
  REVIEW_TABS,
  REVIEW_TAB_LABELS,
  parsePolygonText,
  type RestrictedZone,
  type ReviewAction,
  type ReviewItem,
  type ReviewTab,
  type SlaRule,
} from "@/features/shipping/schemas";
import { ActiveDot, ConfirmDelete, FormSheet, OwnerGate, SheetActions, ShippingSubnav, dangerButton, ghostButton, outlineButton, primaryButton } from "@/features/shipping/components/bits";
import { SchematicMap } from "@/features/shipping/components/schematic-map";
import { zoneCircles } from "@/features/shipping/components/zones-screen";

/**
 * `/dashboard/shipping/zone-review?tab=review|restricted|sla` (US-15.6): orders whose
 * address falls outside every zone or inside a restricted polygon (confirm / convert to
 * pickup / cancel), the restricted polygons (coordinates editor, ≥ 3 points checked
 * locally, small SVG preview) and the SLA hours per zone/method.
 */
export function ZoneReviewScreen() {
  return (
    <OwnerGate>
      <ZoneReviewBody />
    </OwnerGate>
  );
}

function ZoneReviewBody() {
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(REVIEW_TABS).withDefault("review").withOptions({ history: "replace" }));
  const table = useTableUrlState();
  return (
    <div className="flex min-w-0 flex-col gap-6" data-testid="zone-review-screen">
      <PageHeader title="مراجعة المناطق" description="الطلبات التي لا تقع عناوينها في منطقة توصيل، والنطاقات المحظورة، ومهل التوصيل." />
      <ShippingSubnav />
      <Tabs
        value={tab}
        onValueChange={(v) => {
          void setTab(v as ReviewTab);
          table.resetPage();
        }}
        className="min-w-0"
      >
        <TabsList variant="line" className="h-11 border-b border-border lg:h-9" aria-label="أقسام المراجعة">
          {REVIEW_TABS.map((t) => (
            <TabsTrigger key={t} value={t} className="min-h-11 px-3 lg:min-h-8" data-testid={`review-tab-${t}`}>
              {REVIEW_TAB_LABELS[t]}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="review" className="min-w-0 pt-4">
          {tab === "review" ? <ReviewTabBody /> : null}
        </TabsContent>
        <TabsContent value="restricted" className="min-w-0 pt-4">
          {tab === "restricted" ? <RestrictedTab /> : null}
        </TabsContent>
        <TabsContent value="sla" className="min-w-0 pt-4">
          {tab === "sla" ? <SlaTab /> : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── review ───────────────────────────────────────────────────────────────────────────
const REVIEW_FILTERS = { reason: parseAsStringLiteral(REVIEW_REASONS) };

function ReviewTabBody() {
  const table = useTableUrlState();
  const [filters, setFilters] = useQueryStates(REVIEW_FILTERS, { history: "replace" });
  const query = useZoneReview({ reason: filters.reason ?? undefined, page: table.page, page_size: table.pageSize });
  const zones = useZones({ page_size: 100 });
  const restricted = useRestrictedZones({ page_size: 100 });
  const [acting, setActing] = useState<{ item: ReviewItem; action: ReviewAction } | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [now] = useState(() => new Date());
  const rows = query.data?.results;

  const columns = useMemo<ColumnDef<ReviewItem, unknown>[]>(
    () => [
      {
        id: "order",
        header: headerLabel("الطلب"),
        meta: { className: "whitespace-nowrap" },
        cell: ({ row }) => (
          <Link href={`/dashboard/orders?order=${row.original.order_id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
            <Mono>#{row.original.order_id}</Mono>
          </Link>
        ),
      },
      { id: "customer", header: headerLabel("العميل"), cell: ({ row }) => <span className="font-medium">{row.original.customer_name}</span> },
      {
        id: "address",
        header: headerLabel("العنوان"),
        cell: ({ row }) => (
          <span className="flex flex-col">
            <span>{row.original.address}</span>
            {row.original.city ? <span className="text-xs text-muted-foreground">{row.original.city}</span> : null}
          </span>
        ),
      },
      {
        id: "reason",
        header: headerLabel("السبب"),
        cell: ({ row }) => <ReasonText item={row.original} />,
      },
      { id: "created", header: headerLabel("منذ"), meta: { className: "whitespace-nowrap" }, cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatRelative(row.original.created_at, now)}</span> },
      {
        id: "actions",
        meta: { srOnlyHeader: true, className: "w-px whitespace-nowrap" },
        header: headerLabel("إجراءات"),
        cell: ({ row }) => <ReviewActions item={row.original} onAct={(action) => setActing({ item: row.original, action })} />,
      },
    ],
    [now],
  );

  const mapReady = zones.data && restricted.data;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {mapReady && (zones.data.results.length > 0 || (rows?.length ?? 0) > 0) ? (
        <SchematicMap
          circles={zoneCircles(zones.data.results)}
          polygons={restricted.data.results.map((z) => ({ id: `rz-${z.id}`, label: z.name, points: z.polygon_points, muted: !z.is_active }))}
          points={(rows ?? []).flatMap((r) => (r.latitude === null || r.longitude === null ? [] : [{ id: `o-${r.order_id}`, label: `#${r.order_id} — ${r.address}`, lat: r.latitude, lng: r.longitude }]))}
          highlight={focus}
          label="مخطط المناطق والنطاقات المحظورة وطلبات المراجعة"
        />
      ) : null}
      <DataTable<ReviewItem>
        testId="review-table"
        caption="طلبات بانتظار مراجعة المنطقة"
        columns={columns}
        data={rows}
        getRowId={(r) => String(r.order_id)}
        total={query.data?.count ?? 0}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        isFiltered={Boolean(filters.reason)}
        onRowOpen={(r) => setFocus(`o-${r.order_id}`)}
        toolbar={
          <FilterBar activeCount={filters.reason ? 1 : 0} onClear={() => void setFilters({ reason: null })}>
            <FilterSelect
              label="السبب"
              value={filters.reason ?? ""}
              onChange={(v) => {
                void setFilters({ reason: (v || null) as (typeof REVIEW_REASONS)[number] | null });
                table.resetPage();
              }}
              options={REVIEW_REASONS.map((r) => ({ value: r, label: REVIEW_REASON_LABELS[r] }))}
              testId="filter-reason"
            />
          </FilterBar>
        }
        emptyState={<EmptyState title="لا طلبات بانتظار المراجعة — كل العناوين داخل مناطق التوصيل" description="يظهر هنا كل طلب يقع عنوانه خارج المناطق أو داخل نطاق محظور." />}
        noResultsState={<EmptyState title="لا طلبات بهذا السبب" />}
        renderMobileCard={(r) => (
          <div className="flex flex-col gap-1.5 p-3" data-testid="review-card">
            <span className="flex items-center justify-between gap-2">
              <span className="font-medium">{r.customer_name}</span>
              <Link href={`/dashboard/orders?order=${r.order_id}`} className="inline-flex min-h-11 items-center">
                <Mono>#{r.order_id}</Mono>
              </Link>
            </span>
            <span className="text-xs text-muted-foreground">{[r.address, r.city].filter(Boolean).join(" · ")}</span>
            <ReasonText item={r} />
            <ReviewActions item={r} onAct={(action) => setActing({ item: r, action })} />
          </div>
        )}
      />
      <ResolveDialog acting={acting} onClose={() => setActing(null)} />
    </div>
  );
}

function ReasonText({ item }: { item: ReviewItem }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span aria-hidden className={item.reason === "restricted_polygon" ? "size-1.5 rounded-full bg-destructive" : "size-1.5 rounded-full bg-warning"} />
      {REVIEW_REASON_LABELS[item.reason]}
      {item.restricted_zone_name ? <span className="text-muted-foreground">«{item.restricted_zone_name}»</span> : null}
    </span>
  );
}

function ReviewActions({ item, onAct }: { item: ReviewItem; onAct: (a: ReviewAction) => void }) {
  return (
    <span className="flex flex-wrap justify-end gap-1 md:flex-nowrap" onClick={(e) => e.stopPropagation()} data-testid={`review-actions-${item.order_id}`}>
      <button type="button" className={ghostButton} onClick={() => onAct("confirm")} data-testid="review-confirm">
        {REVIEW_ACTION_LABELS.confirm}
      </button>
      <button type="button" className={ghostButton} onClick={() => onAct("convert_pickup")} data-testid="review-convert">
        {REVIEW_ACTION_LABELS.convert_pickup}
      </button>
      <button type="button" className={`${ghostButton} text-destructive`} onClick={() => onAct("cancel")} data-testid="review-cancel">
        {REVIEW_ACTION_LABELS.cancel}
      </button>
    </span>
  );
}

function ResolveDialog({ acting, onClose }: { acting: { item: ReviewItem; action: ReviewAction } | null; onClose: () => void }) {
  const resolve = useResolveReview();
  const pickups = usePickups({ is_active: "true", page_size: 100 });
  const [pickup, setPickup] = useState("");
  const [error, setError] = useState<string | null>(null);
  const action = acting?.action;
  const item = acting?.item;

  const run = () => {
    if (!item || !action) return;
    setError(null);
    resolve.mutate(
      { orderId: item.order_id, body: action === "convert_pickup" ? { action, pickup_location_id: Number(pickup) } : { action } },
      {
        onSuccess: (r) => {
          toast.success(r.message);
          setPickup("");
          onClose();
        },
        onError: (e) => {
          if (isApiError(e) && e.status === 409) {
            toast.info(e.userMessage);
            onClose();
          } else setError(isApiError(e) ? e.userMessage : "تعذّر تنفيذ الإجراء.");
        },
      },
    );
  };

  const title = !item ? "" : action === "confirm" ? `تأكيد عنوان الطلب #${item.order_id}؟` : action === "cancel" ? `إلغاء شحن الطلب #${item.order_id}؟` : `تحويل الطلب #${item.order_id} إلى استلام`;
  const desc = action === "confirm" ? "يُشحن الطلب إلى العنوان كما هو رغم وقوعه خارج المناطق." : action === "cancel" ? "يُلغى شحن الطلب ويخرج من القائمة؛ تواصل مع العميل لترتيب بديل." : "يستلم العميل طلبه بنفسه من نقطة الاستلام المختارة.";
  return (
    <Dialog open={acting !== null} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="sm:max-w-md" data-testid="resolve-dialog">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{desc}</DialogDescription>
        {item ? <p className="text-sm text-muted-foreground">{[item.address, item.city].filter(Boolean).join(" · ")}</p> : null}
        {action === "convert_pickup" ? (
          <Field label="نقطة الاستلام" htmlFor="resolve-pickup" required>
            <NativeSelect id="resolve-pickup" value={pickup} onChange={(e) => setPickup(e.target.value)} className="h-11 md:h-8" data-testid="resolve-pickup">
              <option value="">اختر نقطة نشطة</option>
              {(pickups.data?.results ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <button type="button" className={outlineButton} onClick={onClose}>
            رجوع
          </button>
          <button type="button" className={action === "cancel" ? dangerButton : primaryButton} disabled={resolve.isPending || (action === "convert_pickup" && !pickup)} onClick={run} data-testid="resolve-submit">
            {action ? REVIEW_ACTION_LABELS[action] : ""}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── restricted polygons ──────────────────────────────────────────────────────────────
function RestrictedTab() {
  const query = useRestrictedZones({ page_size: 100 });
  const writes = useRestrictedWrites();
  const [openId, setOpenId] = useQueryState("zone", parseAsString.withOptions({ history: "replace" }));
  const [deleting, setDeleting] = useState<RestrictedZone | null>(null);
  const list = query.data?.results ?? [];
  const editing = openId && openId !== "new" ? list.find((z) => String(z.id) === openId) : undefined;
  const add = (
    <button type="button" className={primaryButton} onClick={() => void setOpenId("new")} data-testid="add-restricted">
      <Plus className="size-4" aria-hidden /> نطاق محظور
    </button>
  );

  return (
    <div className="flex min-w-0 flex-col gap-4" data-testid="restricted-tab">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">مضلعات لا يُوصَل إليها؛ أي طلب داخلها يذهب إلى المراجعة.</p>
        {list.length > 0 ? add : null}
      </div>
      {query.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : query.error && !query.data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState title="لا نطاقات محظورة" description="أضف نطاقاً بإحداثيات زواياه (3 نقاط على الأقل)." action={add} />
      ) : (
        <>
          <SchematicMap polygons={list.map((z) => ({ id: `rz-${z.id}`, label: z.name, points: z.polygon_points, muted: !z.is_active }))} label="مخطط النطاقات المحظورة" />
          <ul className="divide-y divide-border/60 surface-card overflow-hidden" data-testid="restricted-list">
            {list.map((z) => (
              <li key={z.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3" data-testid="restricted-row">
                <span className="flex min-w-0 flex-1 basis-48 flex-col">
                  <span className="font-medium">{z.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {z.reason || "بلا سبب"} · <Mono>{z.polygon_points.length}</Mono> نقاط
                  </span>
                </span>
                <ActiveDot active={z.is_active} />
                <span className="flex gap-1">
                  <button type="button" className={ghostButton} onClick={() => void setOpenId(String(z.id))} data-testid="restricted-edit">
                    تعديل
                  </button>
                  <button type="button" className={`${ghostButton} text-destructive`} onClick={() => setDeleting(z)}>
                    حذف
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <RestrictedSheet open={openId === "new" || Boolean(editing)} zone={editing} onOpenChange={(o) => (o ? null : void setOpenId(null))} />
      <ConfirmDelete
        open={deleting !== null}
        title={`حذف «${deleting?.name ?? ""}»؟`}
        description="تعود العناوين داخله إلى التوصيل العادي."
        pending={writes.remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          writes.remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("حُذف النطاق.");
              setDeleting(null);
            },
            onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر الحذف."),
          })
        }
      />
    </div>
  );
}

const pointsToText = (pts: Array<[number, number]>) => pts.map(([a, b]) => `${a}, ${b}`).join("\n");

function RestrictedSheet({ open, zone, onOpenChange }: { open: boolean; zone?: RestrictedZone; onOpenChange: (o: boolean) => void }) {
  const writes = useRestrictedWrites();
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [active, setActive] = useState(true);
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastKey, setLastKey] = useState<string | null>(null);
  // Render-time reset when the sheet opens on another row (no setState in an effect).
  const key = open ? String(zone?.id ?? "new") : null;
  if (key !== lastKey) {
    setLastKey(key);
    if (key) {
      setName(zone?.name ?? "");
      setReason(zone?.reason ?? "");
      setActive(zone?.is_active ?? true);
      setText(zone ? pointsToText(zone.polygon_points) : "");
      setErrors({});
    }
  }
  const parsed = parsePolygonText(text);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!name.trim()) local.name = "أدخل اسم النطاق.";
    if (parsed.error) local.polygon_points = parsed.error;
    setErrors(local);
    if (Object.keys(local).length) {
      document.getElementById(local.name ? "rz-name" : "rz-points")?.focus();
      return;
    }
    writes.save.mutate(
      { id: zone?.id ?? null, body: { name, reason, is_active: active, polygon_points: parsed.points } },
      {
        onSuccess: () => {
          toast.success(zone ? "حُفظ النطاق." : "أُضيف النطاق المحظور.");
          onOpenChange(false);
        },
        onError: (err) => {
          if (isApiError(err) && err.fields) setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, v[0] ?? ""])));
          else toast.error(isApiError(err) ? err.userMessage : "تعذّر الحفظ.");
        },
      },
    );
  };

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={zone ? "تعديل النطاق المحظور" : "نطاق محظور جديد"} description="كل سطر نقطة: خط العرض، خط الطول. 3 نقاط على الأقل." testId="restricted-form">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="الاسم" htmlFor="rz-name" required error={errors.name}>
          <input id="rz-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} aria-invalid={Boolean(errors.name)} />
        </Field>
        <Field label="السبب" htmlFor="rz-reason">
          <input id="rz-reason" value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
        </Field>
        <Field label="النقاط" htmlFor="rz-points" required error={errors.polygon_points} hint={`${parsed.points.length} نقاط`}>
          <Textarea id="rz-points" dir="ltr" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={"15.47, 44.15\n15.50, 44.24\n15.44, 44.27"} className="font-mono text-sm" aria-invalid={Boolean(errors.polygon_points)} data-testid="rz-points" />
        </Field>
        {parsed.points.length >= 3 ? <SchematicMap polygons={[{ id: "draft", label: name || "النطاق", points: parsed.points }]} label="معاينة النطاق" className="[&>div]:h-48 [&>div]:md:h-48" /> : null}
        <div className="surface-card px-3">
          <ToggleRow id="rz-active" label="نشط" description="غير النشط لا يُرسل الطلبات إلى المراجعة." checked={active} onCheckedChange={setActive} />
        </div>
        <SheetActions onCancel={() => onOpenChange(false)} submitLabel={zone ? "حفظ" : "إضافة"} pending={writes.save.isPending} testId="restricted-submit" />
      </form>
    </FormSheet>
  );
}

// ── SLA rules ────────────────────────────────────────────────────────────────────────
function SlaTab() {
  const table = useTableUrlState();
  const query = useSlaRules({ page: table.page, page_size: table.pageSize });
  const writes = useSlaWrites();
  const [openId, setOpenId] = useQueryState("rule", parseAsString.withOptions({ history: "replace" }));
  const [deleting, setDeleting] = useState<SlaRule | null>(null);
  const rows = query.data?.results;
  const editing = openId && openId !== "new" ? rows?.find((r) => String(r.id) === openId) : undefined;

  const columns = useMemo<ColumnDef<SlaRule, unknown>[]>(
    () => [
      { id: "zone", header: headerLabel("المنطقة"), cell: ({ row }) => (row.original.zone_code ? <span>{row.original.zone_name} <Mono className="text-xs text-muted-foreground">{row.original.zone_code}</Mono></span> : <span className="text-muted-foreground">كل المناطق</span>) },
      { id: "method", header: headerLabel("طريقة التوصيل"), cell: ({ row }) => <span className={row.original.delivery_method_name ? "" : "text-muted-foreground"}>{row.original.delivery_method_name ?? "كل الطرق"}</span> },
      { id: "hours", meta: { numeric: true }, header: headerLabel("المهلة (ساعة)"), cell: ({ row }) => <Mono>{row.original.sla_hours}</Mono> },
      {
        id: "actions",
        meta: { srOnlyHeader: true, className: "w-px whitespace-nowrap" },
        header: headerLabel("إجراءات"),
        cell: ({ row }) => (
          <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <button type="button" className={ghostButton} onClick={() => void setOpenId(String(row.original.id))}>
              تعديل
            </button>
            <button type="button" className={`${ghostButton} text-destructive`} onClick={() => setDeleting(row.original)}>
              حذف
            </button>
          </span>
        ),
      },
    ],
    [setOpenId],
  );

  const add = (
    <button type="button" className={primaryButton} onClick={() => void setOpenId("new")} data-testid="add-sla">
      <Plus className="size-4" aria-hidden /> قاعدة SLA
    </button>
  );
  return (
    <div className="flex min-w-0 flex-col gap-4" data-testid="sla-tab">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">مهلة التسليم بالساعات من إصدار البوليصة؛ الشحنات المتجاوزة تظهر في الحالات الحدّية.</p>
        {rows && rows.length > 0 ? add : null}
      </div>
      <DataTable<SlaRule>
        testId="sla-table"
        caption="قواعد SLA"
        columns={columns}
        data={rows}
        getRowId={(r) => String(r.id)}
        total={query.data?.count ?? 0}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        onRowOpen={(r) => void setOpenId(String(r.id))}
        emptyState={<EmptyState title="لا قواعد SLA — لن تُرصد الشحنات المتأخرة" description="أضف مهلة لكل منطقة أو طريقة توصيل." action={add} />}
        renderMobileCard={(r) => (
          <div className="flex items-center justify-between gap-2 p-3">
            <span className="flex flex-col text-sm">
              <span>{r.zone_name ?? "كل المناطق"}</span>
              <span className="text-xs text-muted-foreground">{r.delivery_method_name ?? "كل الطرق"}</span>
            </span>
            <span className="flex items-center gap-2">
              <Mono>{r.sla_hours} س</Mono>
              <button type="button" className={ghostButton} onClick={() => void setOpenId(String(r.id))}>
                تعديل
              </button>
            </span>
          </div>
        )}
      />
      <SlaSheet open={openId === "new" || Boolean(editing)} rule={editing} onOpenChange={(o) => (o ? null : void setOpenId(null))} />
      <ConfirmDelete
        open={deleting !== null}
        title="حذف القاعدة؟"
        description="لن تُرصد الشحنات المتأخرة لهذه المنطقة/الطريقة."
        pending={writes.remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          writes.remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("حُذفت القاعدة.");
              setDeleting(null);
            },
            onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر الحذف."),
          })
        }
      />
    </div>
  );
}

function SlaSheet({ open, rule, onOpenChange }: { open: boolean; rule?: SlaRule; onOpenChange: (o: boolean) => void }) {
  const writes = useSlaWrites();
  const zones = useZones({ page_size: 100 });
  const methods = useDeliveryMethods({ page_size: 100 });
  const [zone, setZone] = useState("");
  const [method, setMethod] = useState("");
  const [hours, setHours] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setZone(rule?.zone_code ?? "");
      setMethod(rule?.delivery_method_id ? String(rule.delivery_method_id) : "");
      setHours(rule ? String(rule.sla_hours) : "24");
      setErrors({});
    });
  }, [open, rule]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d+$/.test(hours) || Number(hours) < 1) {
      setErrors({ sla_hours: "عدد ساعات صحيح ≥ 1." });
      document.getElementById("sla-hours")?.focus();
      return;
    }
    writes.save.mutate(
      { id: rule?.id ?? null, body: { zone_code: zone || null, delivery_method_id: method ? Number(method) : null, sla_hours: Number(hours) } },
      {
        onSuccess: () => {
          toast.success(rule ? "حُفظت القاعدة." : "أُضيفت القاعدة.");
          onOpenChange(false);
        },
        onError: (err) => {
          if (isApiError(err) && err.fields) setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, v[0] ?? ""])));
          else toast.error(isApiError(err) ? err.userMessage : "تعذّر الحفظ.");
        },
      },
    );
  };

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={rule ? "تعديل قاعدة SLA" : "قاعدة SLA جديدة"} description="اختر منطقة أو طريقة أو كليهما." testId="sla-form">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="المنطقة" htmlFor="sla-zone" error={errors.zone_code}>
          <NativeSelect id="sla-zone" value={zone} onChange={(e) => setZone(e.target.value)} className="h-11 md:h-8" aria-invalid={Boolean(errors.zone_code)}>
            <option value="">كل المناطق</option>
            {(zones.data?.results ?? []).map((z) => (
              <option key={z.code} value={z.code}>
                {z.code} — {z.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="طريقة التوصيل" htmlFor="sla-method" error={errors.delivery_method_id}>
          <NativeSelect id="sla-method" value={method} onChange={(e) => setMethod(e.target.value)} className="h-11 md:h-8">
            <option value="">كل الطرق</option>
            {(methods.data?.results ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="المهلة بالساعات" htmlFor="sla-hours" required error={errors.sla_hours}>
          <input id="sla-hours" dir="ltr" inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value)} className={numericInputClass} aria-invalid={Boolean(errors.sla_hours)} />
        </Field>
        <SheetActions onCancel={() => onOpenChange(false)} submitLabel={rule ? "حفظ" : "إضافة"} pending={writes.save.isPending} />
      </form>
    </FormSheet>
  );
}
