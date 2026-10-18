"use client";

import Link from "next/link";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { AccessGate, ForbiddenState } from "@/components/shared/access-gate";
import { DataTable, headerLabel } from "@/components/shared/data-table/data-table";
import { FilterBar, FilterSelect, SearchBox, StatStrip } from "@/components/shared/data-table/filter-bar";
import { useTableUrlState } from "@/components/shared/data-table/use-table-url-state";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { inputClass } from "@/components/shared/field";
import { Mono } from "@/components/shared/mono";
import { Money } from "@/components/shared/money";
import { PageHeader } from "@/components/shared/page-header";
import { useAccess } from "@/features/dashboard-shell/components/session-context";
import { useAbandonedCart, useAbandonedCarts, useRemindCart } from "@/features/marketing/api";
import { BackToHub, ConfirmDialog, errorMessage } from "@/features/marketing/components/shared";
import { CART_STATUS_LABELS, CART_STATUSES, type AbandonedCart } from "@/features/marketing/schemas";
import { formatDateTime, formatRelative, prettyPhone } from "@/lib/format";
import { cn } from "@/lib/utils";

/** US-13.3.1 — abandoned carts: owner only (plan feature `abandoned_carts`). */
const filterParsers = { status: parseAsStringLiteral(CART_STATUSES), from: parseAsString.withDefault(""), to: parseAsString.withDefault(""), q: parseAsString.withDefault(""), cart: parseAsInteger };

const STATUS_DOT: Record<AbandonedCart["status"], string> = { active: "bg-muted-foreground", abandoned: "bg-warning", recovered: "bg-success" };

function CartStatus({ status, className }: { status: AbandonedCart["status"]; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-sm", status !== "recovered" && "text-muted-foreground", className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
      {CART_STATUS_LABELS[status]}
    </span>
  );
}

export function AbandonedCartsScreen() {
  const { session } = useAccess();
  return (
    <AccessGate feature="abandoned_carts">
      {session.kind !== "merchant" ? <OwnerOnly /> : <Inner />}
    </AccessGate>
  );
}

function OwnerOnly() {
  return <ForbiddenState description="السلات المتروكة مقصورة على مالك المتجر." />;
}

function Inner() {
  const [filters, setFilters] = useQueryStates(filterParsers, { history: "replace" });
  const table = useTableUrlState();
  const params = { status: filters.status ?? undefined, from: filters.from || undefined, to: filters.to || undefined, q: filters.q || undefined };
  const list = useAbandonedCarts(params);
  const counters = list.data?.counters;
  const isFiltered = !!(filters.status || filters.from || filters.to || filters.q);

  const columns = useMemo<ColumnDef<AbandonedCart, unknown>[]>(
    () => [
      { id: "customer", header: headerLabel("العميل"), cell: ({ row }) => (<span className="flex min-w-36 flex-col leading-tight"><span className="truncate">{row.original.customer_name ?? <span className="text-muted-foreground">زائر</span>}</span>{row.original.customer_phone ? <Mono className="text-[11px] text-muted-foreground">{prettyPhone(row.original.customer_phone)}</Mono> : null}</span>) },
      { id: "items", meta: { numeric: true }, header: headerLabel("العناصر"), cell: ({ row }) => <Mono>{row.original.items_count}</Mono> },
      { id: "total", meta: { numeric: true }, header: headerLabel("القيمة"), cell: ({ row }) => <Money value={row.original.display_total} /> },
      { id: "status", header: headerLabel("الحالة"), cell: ({ row }) => <CartStatus status={row.original.status} /> },
      { id: "reminders", header: headerLabel("التذكيرات"), cell: ({ row }) => (<span className="whitespace-nowrap text-xs text-muted-foreground">{row.original.reminder_step === 0 ? "لم يُرسل" : `${row.original.reminder_step}/2`}{row.original.last_reminder_sent_at ? ` · ${formatRelative(row.original.last_reminder_sent_at)}` : ""}</span>) },
      { id: "last", header: headerLabel("آخر نشاط"), cell: ({ row }) => <span className="whitespace-nowrap text-xs text-muted-foreground">{formatRelative(row.original.last_interaction_at)}</span> },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-5" data-testid="abandoned-carts-screen">
      <BackToHub />
      <PageHeader title="السلات المتروكة" description="سلات لم تُكمَل خلال ساعتين. التذكير عبر واتساب، والثاني يحمل كوبون استرداد." actions={<Link href="/dashboard/marketing/abandoned-carts/settings" className="inline-flex h-11 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted lg:h-9" data-testid="carts-settings">إعدادات التذكير</Link>} />
      <StatStrip
        label="حالات السلات"
        items={[
          { key: "", label: "الكل", count: list.data?.count !== undefined && !isFiltered ? list.data.count : counters ? counters.active + counters.abandoned + counters.recovered : undefined, active: !filters.status, onSelect: () => void setFilters({ status: null }) },
          ...CART_STATUSES.map((s) => ({ key: s, label: CART_STATUS_LABELS[s], count: counters?.[s], active: filters.status === s, onSelect: () => void setFilters({ status: s }), tone: s === "abandoned" ? ("warning" as const) : undefined })),
        ]}
      />
      <DataTable
        columns={columns}
        data={list.data?.results}
        getRowId={(c) => String(c.id)}
        caption="السلات المتروكة"
        total={list.data?.count ?? 0}
        page={1}
        pageSize={100}
        onPageChange={() => undefined}
        density={table.density}
        onDensityChange={table.setDensity}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        error={list.error}
        onRetry={() => void list.refetch()}
        isFiltered={isFiltered}
        emptyState={<EmptyState title="لا سلات متروكة" description="كل سلة لا تُكمَل خلال ساعتين تظهر هنا تلقائياً." />}
        noResultsState={<EmptyState title="لا نتائج مطابقة" description="غيّر الفلتر أو الفترة." />}
        onRowOpen={(c) => void setFilters({ cart: c.id })}
        toolbar={
          <FilterBar
            search={<SearchBox value={filters.q} onChange={(q) => void setFilters({ q: q || null })} placeholder="ابحث بالاسم أو الهاتف" />}
            activeCount={Number(!!filters.from) + Number(!!filters.to)}
            onClear={() => void setFilters({ status: null, from: null, to: null, q: null })}
          >
            <label className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-1.5"><span className="text-xs text-muted-foreground">من</span><input type="date" value={filters.from} onChange={(e) => void setFilters({ from: e.target.value || null })} className={`${inputClass} md:h-8 md:w-auto`} dir="ltr" data-testid="from" /></label>
            <label className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-1.5"><span className="text-xs text-muted-foreground">إلى</span><input type="date" value={filters.to} onChange={(e) => void setFilters({ to: e.target.value || null })} className={`${inputClass} md:h-8 md:w-auto`} dir="ltr" data-testid="to" /></label>
            <FilterSelect label="الحالة" value={filters.status ?? ""} onChange={(v) => void setFilters({ status: (v || null) as typeof filters.status })} options={CART_STATUSES.map((s) => ({ value: s, label: CART_STATUS_LABELS[s] }))} testId="cart-status" />
          </FilterBar>
        }
        renderMobileCard={(c) => (
          <button type="button" onClick={() => void setFilters({ cart: c.id })} className="flex min-h-16 w-full items-center gap-3 p-3 text-start" data-testid="cart-card">
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-sm">{c.customer_name ?? "زائر"}</span>
              <span className="flex items-center gap-2 text-xs"><CartStatus status={c.status} className="text-xs" /><span className="text-muted-foreground">{formatRelative(c.last_interaction_at)}</span></span>
            </span>
            <span className="flex flex-col items-end gap-1 text-xs"><Money value={c.display_total} className="text-sm" /><span className="text-muted-foreground"><Mono>{c.items_count}</Mono> عناصر</span></span>
          </button>
        )}
        testId="carts-table"
      />
      <CartSheet id={filters.cart} onClose={() => void setFilters({ cart: null })} />
    </div>
  );
}

function CartSheet({ id, onClose }: { id: number | null; onClose: () => void }) {
  const cart = useAbandonedCart(id);
  const remind = useRemindCart();
  const [confirm, setConfirm] = useState(false);
  const c = cart.data;
  return (
    <Sheet open={id !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="left" className="w-full gap-0 overflow-y-auto p-5 data-[side=left]:w-full data-[side=left]:sm:max-w-lg" data-testid="cart-sheet">
        <SheetHeader className="p-0 pb-4">
          <SheetTitle>{c ? (c.customer_name ?? "زائر") : "السلة"}</SheetTitle>
          <SheetDescription>{c ? `${c.customer_phone ? prettyPhone(c.customer_phone) + " · " : ""}آخر نشاط ${formatRelative(c.last_interaction_at)}` : "تفاصيل السلة المتروكة"}</SheetDescription>
        </SheetHeader>
        {cart.isLoading ? <div className="flex flex-col gap-3"><Skeleton className="h-5 w-40" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> : null}
        {cart.isError ? <ErrorState error={cart.error} onRetry={() => void cart.refetch()} /> : null}
        {c ? (
          <div className="flex flex-col gap-5">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div><dt className="text-xs text-muted-foreground">الحالة</dt><dd><CartStatus status={c.status} /></dd></div>
              <div><dt className="text-xs text-muted-foreground">القيمة</dt><dd><Money value={c.display_total} /></dd></div>
              <div><dt className="text-xs text-muted-foreground">التذكيرات</dt><dd>{c.reminder_step === 0 ? "لم يُرسل" : <><Mono>{c.reminder_step}/2</Mono>{c.last_reminder_sent_at ? <span className="ms-1 text-xs text-muted-foreground">آخرها {formatDateTime(c.last_reminder_sent_at)}</span> : null}</>}</dd></div>
              <div><dt className="text-xs text-muted-foreground">كوبون الاسترداد</dt><dd>{c.reminder_discount_coupon ? <Mono>{c.reminder_discount_coupon}</Mono> : <span className="text-muted-foreground">—</span>}</dd></div>
              {c.recovered_order_id ? <div className="col-span-2"><dt className="text-xs text-muted-foreground">استُردّت بالطلب</dt><dd><Link href={`/dashboard/orders/${c.recovered_order_id}`} className="hover:underline"><Mono>#{c.recovered_order_id}</Mono></Link></dd></div> : null}
            </dl>
            <section aria-label="عناصر السلة" className="flex flex-col gap-2">
              <h3 className="text-xs font-medium text-muted-foreground">العناصر ({c.items_count})</h3>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {c.items.map((it, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="flex min-w-0 flex-col"><span className="truncate">{it.product_id ? <Link href={`/dashboard/products/${it.product_id}`} className="hover:underline">{it.name}</Link> : it.name}</span><Mono className="text-[11px] text-muted-foreground">× {it.quantity}</Mono></span>
                    <Money value={it.display_price} />
                  </li>
                ))}
              </ul>
            </section>
            {c.status === "abandoned" ? (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                {!c.customer_phone ? <p className="text-xs text-muted-foreground">زائر بلا رقم هاتف — لا يمكن التذكير.</p> : c.reminder_step >= 2 ? <p className="text-xs text-muted-foreground">أُرسل التذكيران. يمكن إرسال تذكير إضافي يدوياً.</p> : null}
                <Button type="button" className="h-11 self-start lg:h-9" disabled={!c.customer_phone} onClick={() => setConfirm(true)} data-testid="remind">إرسال تذكير</Button>
              </div>
            ) : null}
            <ConfirmDialog
              open={confirm}
              onOpenChange={setConfirm}
              title="إرسال تذكير عبر واتساب؟"
              description={c.last_reminder_sent_at ? `آخر تذكير أُرسل ${formatDateTime(c.last_reminder_sent_at)}.` : "لم يُرسل أي تذكير لهذه السلة بعد."}
              confirmLabel="إرسال"
              pending={remind.isPending}
              onConfirm={() => remind.mutate(c.id, { onSuccess: () => { setConfirm(false); toast.success("أُرسل التذكير"); }, onError: (e) => toast.error(errorMessage(e)) })}
              testId="remind-dialog"
            />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
