"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { EmptyState } from "@/components/shared/empty-state";
import { inputClass, numericInputClass } from "@/components/shared/field";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { DataTable, FilterBar, FilterSelect, SearchBox, headerLabel, useTableUrlState } from "@/components/shared/data-table";
import { isApiError } from "@/lib/api-error";
import { formatRelative, toWesternDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useListings, usePatchListing, usePushListings } from "@/features/marketplaces/api";
import { IDENTIFIER_TYPES, SYNC_STATUSES, SYNC_STATUS_LABELS, type Listing, type Market, type SyncStatus } from "@/features/marketplaces/schemas";
import { SyncStatusText } from "@/features/marketplaces/components/bits";

/**
 * Listings (US-28.3, FR-28.04): server pages of 25, `sync_status` / `identifier_type` / `q`
 * in the URL, inline edit of the identifier and the price override, push one or many
 * (count preview → `catalog_push` job link). Prices are the server's `display_*`.
 */
const PAGE_SIZE = 25;
const parsers = {
  sync_status: parseAsStringLiteral(SYNC_STATUSES),
  identifier_type: parseAsStringLiteral(IDENTIFIER_TYPES),
  q: parseAsString.withDefault(""),
};

export function ListingsPanel({ market, canPush }: { market: Market; canPush: boolean }) {
  const router = useRouter();
  const table = useTableUrlState();
  const [f, setF] = useQueryStates(parsers, { history: "replace" });
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [pushIds, setPushIds] = useState<number[] | null>(null);
  const [now] = useState(() => new Date());
  const query = useListings(market, { sync_status: f.sync_status ?? undefined, identifier_type: f.identifier_type ?? undefined, q: f.q || undefined, page: table.page > 1 ? table.page : undefined });
  const push = usePushListings(market);
  const set = (p: Parameters<typeof setF>[0]) => {
    void setF(p);
    table.resetPage();
    setSelection({});
  };

  const columns = useMemo<ColumnDef<Listing, unknown>[]>(
    () => [
      {
        id: "product",
        header: headerLabel("المنتج"),
        cell: ({ row }) => (
          <span className="flex min-w-40 flex-col leading-tight">
            <span className="truncate">{row.original.product.name}</span>
            <Mono className="text-xs text-muted-foreground">{row.original.product.sku}</Mono>
          </span>
        ),
      },
      { id: "identifier", header: headerLabel("المعرّف"), cell: ({ row }) => <IdentifierCell market={market} l={row.original} /> },
      {
        id: "price",
        meta: { numeric: true },
        header: headerLabel("السعر على السوق"),
        cell: ({ row }) => (
          <span className="flex flex-col items-end leading-tight">
            <Money value={row.original.display_market_price} />
            {row.original.price_override ? <span className="text-[11px] text-muted-foreground">يدوي · المحسوب {row.original.display_computed_price}</span> : null}
          </span>
        ),
      },
      { id: "override", header: headerLabel("تجاوز السعر"), cell: ({ row }) => <OverrideCell market={market} l={row.original} /> },
      {
        id: "status",
        header: headerLabel("الحالة"),
        cell: ({ row }) => {
          const l = row.original;
          if (l.sync_status !== "failed" || !l.last_error) return <SyncStatusText status={l.sync_status} />;
          return (
            <details className="group max-w-64" data-testid="listing-error">
              <summary className="cursor-pointer list-none marker:content-none">
                <SyncStatusText status={l.sync_status} /> <span className="text-xs text-muted-foreground underline-offset-4 group-open:hidden">السبب</span>
              </summary>
              <p className="mt-1 text-xs">
                <Mono className="text-muted-foreground">{l.last_error.code}</Mono> <span dir="ltr">{l.last_error.message}</span>
              </p>
              {canPush ? (
                <Button size="sm" variant="outline" className="mt-1 h-11 lg:h-7" onClick={() => setPushIds([l.id])} data-testid="listing-repush">
                  إعادة الدفع
                </Button>
              ) : null}
            </details>
          );
        },
      },
      {
        id: "synced",
        header: headerLabel("آخر مزامنة"),
        cell: ({ row }) => <span className="whitespace-nowrap text-xs text-muted-foreground">{row.original.last_synced_at ? formatRelative(row.original.last_synced_at, now) : "—"}</span>,
      },
    ],
    [market, canPush, now],
  );

  const doPush = async () => {
    if (!pushIds) return;
    try {
      const r = await push.mutateAsync(pushIds);
      toast.success(`أُنشئت مهمة دفع لـ ${r.count} قائمة`, {
        action: { label: `المهمة #${r.job_id}`, onClick: () => router.push(`/dashboard/channels/marketplaces/jobs?job=${r.job_id}`) },
      });
      setSelection({});
      setPushIds(null);
    } catch (e) {
      toast.error(isApiError(e) ? e.userMessage : "تعذّر الدفع");
      setPushIds(null);
    }
  };

  const activeCount = [f.sync_status, f.identifier_type].filter(Boolean).length;
  return (
    <>
      <DataTable<Listing>
        testId="listings-table"
        caption="قوائم السوق"
        columns={columns}
        data={query.data?.results}
        getRowId={(r) => String(r.id)}
        total={query.data?.count ?? 0}
        page={table.page}
        pageSize={PAGE_SIZE}
        onPageChange={table.setPage}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        isFiltered={Boolean(activeCount || f.q)}
        selectable={canPush}
        rowSelection={selection}
        onRowSelectionChange={setSelection}
        bulkActions={(ids) => (
          <Button size="sm" className="h-11 lg:h-8" onClick={() => setPushIds(ids.map(Number))} data-testid="bulk-push">
            دفع <Mono>{ids.length}</Mono>
          </Button>
        )}
        emptyState={<EmptyState title="لا قوائم — ادفع منتجاتك الأولى" description="تُنشأ القوائم من منتجات المتجر المنشورة." />}
        renderMobileCard={(l) => (
          <div className="flex flex-col gap-1.5 p-3 text-sm">
            <span className="flex justify-between gap-2">
              <span className="truncate">{l.product.name}</span>
              <SyncStatusText status={l.sync_status} />
            </span>
            <span className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {l.identifier_type ? <Mono>{`${l.identifier_type.toUpperCase()} ${l.identifier_value}`}</Mono> : "بلا معرّف"}
              </span>
              <Money value={l.display_market_price} />
            </span>
            <IdentifierCell market={market} l={l} compact />
          </div>
        )}
        toolbar={
          <FilterBar
            activeCount={activeCount}
            onClear={() => set({ sync_status: null, identifier_type: null, q: null })}
            search={<SearchBox value={f.q} onChange={(v) => set({ q: v || null })} placeholder="المنتج أو SKU أو المعرّف" label="بحث في القوائم" />}
          >
            <FilterSelect label="الحالة" value={f.sync_status ?? ""} onChange={(v) => set({ sync_status: (v || null) as SyncStatus | null })} options={SYNC_STATUSES.map((s) => ({ value: s, label: SYNC_STATUS_LABELS[s] }))} testId="filter-sync" />
            <FilterSelect label="نوع المعرّف" value={f.identifier_type ?? ""} onChange={(v) => set({ identifier_type: (v || null) as (typeof IDENTIFIER_TYPES)[number] | null })} options={IDENTIFIER_TYPES.map((t) => ({ value: t, label: t.toUpperCase() }))} />
          </FilterBar>
        }
      />
      <Dialog open={pushIds !== null} onOpenChange={(v) => !v && setPushIds(null)}>
        <DialogContent>
          <DialogTitle>دفع القوائم إلى السوق</DialogTitle>
          <DialogDescription>
            ستُنشأ مهمة «دفع الكتالوج» لـ <Mono>{pushIds?.length ?? 0}</Mono> قائمة. القوائم التي تحتاج معرّفاً تُسجَّل في أخطاء المهمة.
          </DialogDescription>
          <DialogFooter>
            <Button variant="ghost" className="h-11 lg:h-9" onClick={() => setPushIds(null)}>
              تراجع
            </Button>
            <Button className="h-11 lg:h-9" onClick={() => void doPush()} disabled={push.isPending} data-testid="push-confirm">
              دفع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <p className="text-xs text-muted-foreground">
        المهام تُتابَع في <Link href="/dashboard/channels/marketplaces/jobs" className="underline underline-offset-4">سجل المهام</Link>.
      </p>
    </>
  );
}

function IdentifierCell({ market, l, compact = false }: { market: Market; l: Listing; compact?: boolean }) {
  const patch = usePatchListing(market);
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState<(typeof IDENTIFIER_TYPES)[number]>(l.identifier_type ?? (market === "amazon" ? "ean" : "gtin"));
  const [value, setValue] = useState(l.identifier_value);
  const [error, setError] = useState<string | null>(null);
  if (!editing) {
    if (compact) {
      return l.sync_status === "needs_identifier" ? (
        <Button size="sm" variant="outline" className="h-11 self-start" onClick={() => setEditing(true)}>
          إدخال معرّف
        </Button>
      ) : null;
    }
    return (
      <button type="button" onClick={() => setEditing(true)} className="flex min-h-11 items-center gap-1.5 text-start hover:underline lg:min-h-8" data-testid="identifier-edit">
        {l.identifier_type ? (
          <>
            <Mono className="text-[11px] text-muted-foreground">{l.identifier_type.toUpperCase()}</Mono>
            <Mono>{l.identifier_value}</Mono>
          </>
        ) : (
          <span className="text-muted-foreground">+ معرّف</span>
        )}
      </button>
    );
  }
  return (
    <form
      className="flex flex-col gap-1"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await patch.mutateAsync({ id: l.id, identifier_type: type, identifier_value: toWesternDigits(value.trim()) });
          toast.success("حُفظ المعرّف");
          setEditing(false);
          setError(null);
        } catch (err) {
          setError(isApiError(err) ? (err.fields ? Object.values(err.fields)[0]?.[0] ?? err.userMessage : err.userMessage) : "تعذّر الحفظ");
        }
      }}
      data-testid="identifier-form"
    >
      <span className="flex gap-1">
        <NativeSelect aria-label="نوع المعرّف" value={type} onChange={(e) => setType(e.target.value as (typeof IDENTIFIER_TYPES)[number])} className="h-11 w-24 lg:h-8">
          {IDENTIFIER_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.toUpperCase()}
            </option>
          ))}
        </NativeSelect>
        <input aria-label="قيمة المعرّف" dir="ltr" value={value} onChange={(e) => setValue(e.target.value)} className={cn(inputClass, "w-40 font-mono")} autoFocus data-testid="identifier-value" />
        <Button type="submit" size="sm" className="h-11 lg:h-8" disabled={patch.isPending}>
          حفظ
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-11 lg:h-8" onClick={() => setEditing(false)}>
          إلغاء
        </Button>
      </span>
      {error ? <span role="alert" className="text-xs text-destructive">{error}</span> : null}
    </form>
  );
}

function OverrideCell({ market, l }: { market: Market; l: Listing }) {
  const patch = usePatchListing(market);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(l.price_override ?? "");
  const save = async (v: string | null) => {
    try {
      await patch.mutateAsync({ id: l.id, price_override: v });
      toast.success(v ? "حُفظ تجاوز السعر" : "أُزيل تجاوز السعر");
      setEditing(false);
    } catch (e) {
      toast.error(isApiError(e) ? (e.fields?.price_override?.[0] ?? e.userMessage) : "تعذّر الحفظ");
    }
  };
  if (!editing)
    return l.price_override ? (
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        <Mono>{l.price_override}</Mono>
        <span className="text-[11px] text-muted-foreground">يدوي</span>
        <Button size="sm" variant="ghost" className="h-11 px-2 lg:h-7" onClick={() => void save(null)} aria-label="إزالة تجاوز السعر" data-testid="override-remove">
          إزالة
        </Button>
      </span>
    ) : (
      <button type="button" className="min-h-11 text-muted-foreground hover:underline lg:min-h-8" onClick={() => setEditing(true)} data-testid="override-edit">
        + تجاوز
      </button>
    );
  return (
    <form
      className="flex gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        void save(toWesternDigits(value.trim()) || null);
      }}
    >
      <input aria-label="سعر يدوي" inputMode="decimal" dir="ltr" value={value} onChange={(e) => setValue(e.target.value)} className={cn(numericInputClass, "w-24")} autoFocus data-testid="override-value" />
      <Button type="submit" size="sm" className="h-11 lg:h-8" disabled={patch.isPending}>
        حفظ
      </Button>
    </form>
  );
}
