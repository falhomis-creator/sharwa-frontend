"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { parseAsStringLiteral, useQueryStates } from "nuqs";
import { X } from "lucide-react";
import { toast } from "sonner";
import { DataTable, FilterBar, FilterSelect, StatStrip, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Field, numericInputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { ToggleRow } from "@/components/shared/toggle-row";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isApiError } from "@/lib/api-error";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCatalogSync, useResyncProduct, useRunCatalogSync, useSaveCatalogSync, useSyncProducts } from "@/features/channels/api";
import { SYNC_STATUSES, SYNC_STATUS_LABELS, SYNC_STATUS_TONE, type CatalogSync, type SyncProduct, type SyncStatus } from "@/features/channels/schemas";
import { ChannelsShell } from "@/features/channels/components/channels-shell";
import { StatusDot } from "@/features/inbox/components/bits";
import { ConfirmDialog } from "@/features/inbox/components/confirm-dialog";

/**
 * `/dashboard/channels/social/catalog` (US-27.5, FR-27.09): per channel (Meta / TikTok)
 * the scope, a price adjustment, the stock shield; the impact (products in scope, from the
 * server) before running and the four-status report after; the per-product table.
 */
const parsers = { channel: parseAsStringLiteral(["meta", "tiktok"] as const).withDefault("meta"), sync_status: parseAsStringLiteral(SYNC_STATUSES) };

export function CatalogSyncScreen() {
  return (
    <ChannelsShell title="مزامنة الكتالوج" description="اختر ما يُعرض من منتجاتك على Meta وTikTok Shop، وراقب حالة كل منتج على القناة.">
      <CatalogInner />
    </ChannelsShell>
  );
}

function CatalogInner() {
  const [f, setF] = useQueryStates(parsers, { history: "replace" });
  const sync = useCatalogSync(f.channel);
  return (
    <div className="flex flex-col gap-8">
      <div role="tablist" aria-label="القناة" className="flex gap-2">
        {(["meta", "tiktok"] as const).map((c) => (
          <button key={c} role="tab" type="button" aria-selected={f.channel === c} onClick={() => void setF({ channel: c, sync_status: null })} className={cn("h-11 rounded-lg border px-4 text-sm lg:h-9", f.channel === c ? "border-foreground font-medium" : "border-border text-muted-foreground")}>
            {c === "meta" ? "Meta" : "TikTok Shop"}
          </button>
        ))}
      </div>
      {sync.isLoading ? <Skeleton className="h-64" /> : sync.data ? <SyncSettings key={`${f.channel}:${sync.data.scope}:${sync.data.category_ids.join(",")}:${sync.data.price_adjustment_percent}:${sync.data.stock_shield_enabled}`} data={sync.data} /> : <ErrorState error={sync.error} onRetry={() => void sync.refetch()} />}
      <ProductsTable channel={f.channel} status={f.sync_status} onStatus={(s) => void setF({ sync_status: s })} report={sync.data?.report ?? null} />
    </div>
  );
}

function SyncSettings({ data }: { data: CatalogSync }) {
  const save = useSaveCatalogSync(data.channel_code);
  const run = useRunCatalogSync(data.channel_code);
  const [scope, setScope] = useState(data.scope);
  const [cats, setCats] = useState<number[]>(data.category_ids);
  const [pct, setPct] = useState(data.price_adjustment_percent);
  const [shield, setShield] = useState(data.stock_shield_enabled);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState(false);
  const dirty = scope !== data.scope || pct !== data.price_adjustment_percent || shield !== data.stock_shield_enabled || cats.join(",") !== data.category_ids.join(",");
  const catName = (id: number) => data.categories.find((c) => c.id === id)?.name ?? `#${id}`;

  async function onSave() {
    try {
      await save.mutateAsync({ scope, category_ids: scope === "all" ? [] : cats, price_adjustment_percent: pct.trim() || "0", stock_shield_enabled: shield });
      setErrors({});
      toast.success("حُفظت إعدادات المزامنة.");
    } catch (e) {
      if (isApiError(e) && e.fields) setErrors(Object.fromEntries(Object.entries(e.fields).map(([k, v]) => [k, v[0] ?? ""])));
      else toast.error(isApiError(e) ? e.userMessage : "تعذّر الحفظ.");
    }
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_18rem]" data-testid="sync-settings">
      <div className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="pb-1 text-sm font-medium">النطاق</legend>
          {(["all", "selected_categories"] as const).map((s) => (
            <label key={s} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm lg:min-h-8">
              <input type="radio" name="scope" checked={scope === s} onChange={() => setScope(s)} className="size-4 accent-foreground" />
              {s === "all" ? "كل المنتجات" : "فئات محددة"}
            </label>
          ))}
        </fieldset>
        {scope === "selected_categories" ? (
          <Field label="الفئات" htmlFor="sync-cats" error={errors.category_ids}>
            <NativeSelect
              id="sync-cats"
              value=""
              onChange={(e) => {
                const id = Number(e.target.value);
                if (id && !cats.includes(id)) setCats([...cats, id]);
              }}
              className="h-11 lg:h-8"
              data-testid="sync-add-category"
            >
              <option value="">أضف فئة…</option>
              {data.categories
                .filter((c) => !cats.includes(c.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </NativeSelect>
            <ul className="flex flex-wrap gap-1.5 pt-1" data-testid="sync-categories">
              {cats.map((id) => (
                <li key={id} className="inline-flex h-11 items-center gap-1 rounded-md border border-border ps-2.5 text-sm lg:h-7">
                  {catName(id)}
                  <button type="button" aria-label={`إزالة ${catName(id)}`} onClick={() => setCats(cats.filter((x) => x !== id))} className="flex size-11 items-center justify-center rounded-md hover:bg-muted lg:size-7">
                    <X className="size-3.5" strokeWidth={1.75} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </Field>
        ) : null}
        <Field label="تعديل السعر على القناة (%)" htmlFor="sync-pct" error={errors.price_adjustment_percent} hint="موجب للزيادة وسالب للخصم؛ يطبّقه الخادم على سعر المتجر.">
          <input id="sync-pct" dir="ltr" inputMode="decimal" className={`${numericInputClass} w-32`} value={pct} onChange={(e) => setPct(e.target.value)} />
        </Field>
        <ToggleRow id="sync-shield" label="درع المخزون" description="إخفاء المنتج تلقائياً من القناة حين ينفد مخزونه، وإظهاره عند توفره." checked={shield} onCheckedChange={setShield} />
        <div className="flex gap-2">
          <Button className="h-11 lg:h-9" disabled={!dirty || save.isPending} onClick={() => void onSave()} data-testid="sync-save">
            {save.isPending ? "جارٍ الحفظ…" : "حفظ الإعدادات"}
          </Button>
        </div>
      </div>
      <aside className="flex flex-col gap-3 border-t border-border pt-4 text-sm lg:border-s lg:border-t-0 lg:ps-6 lg:pt-0">
        <p>
          المنتجات المشمولة بالإعدادات المحفوظة: <Mono className="font-medium" data-testid="sync-count">{data.included_products_count}</Mono>
        </p>
        <p className="text-xs text-muted-foreground">
          آخر تشغيل: {data.last_run_at ? <Mono>{formatDateTime(data.last_run_at)}</Mono> : "لم تُشغَّل بعد"}
        </p>
        <Button variant="outline" className="h-11 self-start lg:h-9" disabled={dirty || run.isPending} onClick={() => setConfirm(true)} data-testid="sync-run">
          {run.isPending ? "جارٍ المزامنة…" : "تشغيل المزامنة الآن"}
        </Button>
        {dirty ? <p className="text-xs text-muted-foreground">احفظ التغييرات أولاً.</p> : null}
      </aside>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="تشغيل المزامنة"
        description={
          <>
            ستُرسَل <Mono>{data.included_products_count}</Mono> منتجاً إلى {data.channel_code === "meta" ? "Meta" : "TikTok Shop"} بالإعدادات المحفوظة.
          </>
        }
        confirmLabel="تشغيل"
        pending={run.isPending}
        onConfirm={() =>
          run.mutate(undefined, {
            onSuccess: (d) => {
              setConfirm(false);
              const r = d.report;
              toast.success(r ? `انتهت المزامنة: ${r.synced} متزامن · ${r.error} خطأ · ${r.hidden_out_of_stock} مخفي · ${r.pending} بالانتظار.` : "انتهت المزامنة.");
            },
            onError: (e) => {
              setConfirm(false);
              toast.error(isApiError(e) ? e.userMessage : "تعذّر تشغيل المزامنة.");
            },
          })
        }
      />
    </section>
  );
}

function ProductsTable({ channel, status, onStatus, report }: { channel: "meta" | "tiktok"; status: SyncStatus | null; onStatus: (s: SyncStatus | null) => void; report: CatalogSync["report"] }) {
  const table = useTableUrlState();
  const query = useSyncProducts(channel, { sync_status: status ?? undefined, page: table.page, page_size: table.pageSize });
  const resync = useResyncProduct(channel);
  const columns = useMemo<ColumnDef<SyncProduct, unknown>[]>(
    () => [
      { id: "name", header: headerLabel("المنتج"), cell: ({ row }) => <span className="min-w-40">{row.original.name}</span> },
      { id: "sku", header: headerLabel("SKU"), cell: ({ row }) => <Mono className="text-xs">{row.original.sku}</Mono> },
      {
        id: "status",
        header: headerLabel("الحالة"),
        cell: ({ row }) => {
          const s = row.original.sync_status;
          const dot = <StatusDot tone={SYNC_STATUS_TONE[s]} label={SYNC_STATUS_LABELS[s]} testId="sync-status" value={s} />;
          return (
            <span className="flex flex-col gap-0.5">
              {s === "hidden_out_of_stock" ? (
                <Tooltip>
                  <TooltipTrigger render={<span tabIndex={0} />}>{dot}</TooltipTrigger>
                  <TooltipContent>مخفي تلقائياً حتى يتوفر المخزون</TooltipContent>
                </Tooltip>
              ) : (
                dot
              )}
              {row.original.error ? <span className="max-w-72 text-xs text-destructive">{row.original.error}</span> : null}
            </span>
          );
        },
      },
      { id: "at", header: headerLabel("آخر مزامنة"), cell: ({ row }) => (row.original.synced_at ? <Mono className="text-xs text-muted-foreground">{formatDateTime(row.original.synced_at)}</Mono> : <span className="text-muted-foreground">—</span>) },
      {
        id: "act",
        header: () => <span className="sr-only">إجراء</span>,
        cell: ({ row }) =>
          row.original.sync_status === "error" || row.original.sync_status === "synced" ? (
            <button
              type="button"
              className="h-11 rounded-md px-2 text-xs underline-offset-4 hover:underline lg:h-7"
              onClick={() => resync.mutate(row.original.product_id, { onSuccess: () => toast.success("أُعيدت إلى طابور المزامنة."), onError: (e) => toast.error(isApiError(e) ? e.userMessage : "تعذّر.") })}
              data-testid="resync"
            >
              إعادة المزامنة
            </button>
          ) : null,
      },
    ],
    [resync],
  );
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">حالة المنتجات على القناة</h2>
      {report ? (
        <StatStrip
          label="تقرير آخر مزامنة"
          items={SYNC_STATUSES.map((s) => ({ key: s, label: SYNC_STATUS_LABELS[s], count: report[s], active: status === s, onSelect: () => onStatus(status === s ? null : s), tone: s === "error" ? ("destructive" as const) : s === "pending" ? ("warning" as const) : undefined }))}
        />
      ) : null}
      <DataTable<SyncProduct>
        testId="sync-products"
        caption="حالة مزامنة المنتجات"
        columns={columns}
        data={query.data?.results}
        getRowId={(r) => String(r.product_id)}
        total={query.data?.count ?? 0}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        isFiltered={Boolean(status)}
        toolbar={
          <FilterBar activeCount={status ? 1 : 0} onClear={() => onStatus(null)}>
            <FilterSelect label="الحالة" value={status ?? ""} onChange={(v) => onStatus((v || null) as SyncStatus | null)} options={SYNC_STATUSES.map((s) => ({ value: s, label: SYNC_STATUS_LABELS[s] }))} testId="filter-sync-status" />
          </FilterBar>
        }
        renderMobileCard={(r) => (
          <div className="flex min-h-16 w-full flex-col gap-1 p-3">
            <span className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.name}</span>
              <Mono className="text-xs text-muted-foreground">{r.sku}</Mono>
            </span>
            <StatusDot tone={SYNC_STATUS_TONE[r.sync_status]} label={SYNC_STATUS_LABELS[r.sync_status]} />
            {r.error ? <span className="text-xs text-destructive">{r.error}</span> : null}
          </div>
        )}
        emptyState={<EmptyState title="لم تُشغَّل المزامنة بعد" description="احفظ الإعدادات ثم شغّل المزامنة لتظهر هنا حالة كل منتج." />}
        noResultsState={<EmptyState title="لا منتجات بهذه الحالة" />}
      />
    </section>
  );
}
