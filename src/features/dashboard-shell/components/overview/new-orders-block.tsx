import Link from "next/link";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/format";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  SALES_CHANNEL_LABELS,
} from "@/features/dashboard-shell/labels";
import type { OverviewOrderRow } from "@/features/dashboard-shell/schemas";
import { CopyStoreLink } from "@/features/dashboard-shell/components/overview/copy-store-link";

/**
 * «طلبات جديدة» — 8 columns of the Bento (M03 US-03.5). 44px rows, horizontal hairlines
 * only, numeric columns aligned to the end. The two status axes are shown side by side and
 * never merged; the fulfilment status is a 6px dot in the merchant's own colour, which is
 * the only place a non-token colour is allowed to appear — it is data, not styling.
 *
 * A row links to the order screen (M06). US-03.5.2 wants it to open in a sheet without
 * leaving the page; that sheet is M06's and arrives with it.
 */
export function NewOrdersBlock({ rows, storeUrl }: { rows: OverviewOrderRow[]; storeUrl: string }) {
  return (
    <section
      aria-labelledby="new-orders-heading"
      className="surface-card flex flex-col overflow-hidden lg:col-span-8"
    >
      <header className="flex items-center justify-between gap-2 border-b border-border/60 px-6 pt-5 pb-4">
        <h2 id="new-orders-heading" className="text-base font-semibold">
          طلبات جديدة
        </h2>
        <Link
          href="/dashboard/orders"
          className="inline-flex min-h-11 items-center text-sm font-medium text-accent-ink underline-offset-4 hover:underline lg:min-h-0"
        >
          كل الطلبات
        </Link>
      </header>

      {rows.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="لا طلبات اليوم بعد"
            description="شارك رابط متجرك مع عملائك ليبدأ أول طلب."
            action={<CopyStoreLink storeUrl={storeUrl} />}
            className="border-0 p-0"
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-xs text-muted-foreground">
                <th scope="col" className="h-10 px-4 text-start font-medium first:ps-6 last:pe-6">
                  الطلب
                </th>
                <th scope="col" className="h-10 px-4 text-start font-medium first:ps-6 last:pe-6">
                  العميل
                </th>
                <th scope="col" className="h-10 px-4 text-start font-medium first:ps-6 last:pe-6">
                  الحالة
                </th>
                <th scope="col" className="h-10 px-4 text-start font-medium first:ps-6 last:pe-6">
                  الدفع
                </th>
                <th scope="col" className="h-10 px-4 text-end font-medium first:ps-6 last:pe-6">
                  الإجمالي
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-accent/60">
                  <td className="h-14 px-4 first:ps-6 last:pe-6">
                    <Link href={`/dashboard/orders/${row.id}`} className="flex flex-col leading-tight">
                      <Mono className="text-sm">#{row.id}</Mono>
                      <span className="text-[11px] text-muted-foreground">
                        {SALES_CHANNEL_LABELS[row.sales_channel] ?? row.sales_channel} ·{" "}
                        {formatDate(row.created_at, { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </Link>
                  </td>
                  <td className="h-14 px-4 first:ps-6 last:pe-6">
                    <span className="flex flex-col leading-tight">
                      <span className="truncate">{row.customer_name}</span>
                      <Mono className="text-[11px] text-muted-foreground">{row.customer_phone}</Mono>
                    </span>
                  </td>
                  <td className="h-14 px-4 first:ps-6 last:pe-6">
                    <span className="flex items-center gap-1.5">
                      {row.fulfillment_status ? (
                        <span
                          aria-hidden
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: row.fulfillment_status.color }}
                        />
                      ) : null}
                      <span className="truncate">
                        {row.fulfillment_status?.name ?? ORDER_STATUS_LABELS[row.status] ?? row.status}
                      </span>
                    </span>
                  </td>
                  <td className="h-14 px-4 text-muted-foreground first:ps-6 last:pe-6">
                    {PAYMENT_STATUS_LABELS[row.payment_status] ?? row.payment_status}
                  </td>
                  <td className="h-14 px-4 text-end first:ps-6 last:pe-6">
                    <Money value={row.display_total} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
