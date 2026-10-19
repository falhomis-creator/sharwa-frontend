"use client";

import { parseAsString, useQueryStates } from "nuqs";
import { ForbiddenState } from "@/components/shared/access-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Field, inputClass } from "@/components/shared/field";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { isStoreOwner } from "@/lib/access";
import { useSession } from "@/features/dashboard-shell/components/session-context";
import { useStoreOrigin } from "@/features/dashboard-shell/components/store-context";
import { useRollup } from "@/features/stores-rollup/api";
import { NO_DOMAIN, type Rollup as RollupData, type RollupStore } from "@/features/stores-rollup/schemas";

/**
 * `/dashboard/stores` — M43 US-43.1/43.3: one row per linked store (orders, completed,
 * refunded, revenue in SAR as the server formats it), sorted by revenue by the server, and
 * the server's totals as the last row in Mono — no KPI cards, no charts (§11 I).
 * The date range lives in the URL (FR-43.04): the same link shows the same numbers.
 */
const parsers = { from: parseAsString.withDefault(""), to: parseAsString.withDefault("") };

export function StoresScreen() {
  const session = useSession();
  if (!isStoreOwner(session)) return <ForbiddenState title="هذه الصفحة لمالك المتجر فقط" />;
  return <Rollup />;
}

function Rollup() {
  const [range, setRange] = useQueryStates(parsers, { history: "replace" });
  const rollup = useRollup(range);
  const data = rollup.data;

  return (
    <div className="flex flex-col gap-6" data-testid="stores-rollup">
      <PageHeader title="كل متاجري" description="أداء متاجرك المرتبطة بحسابك في مكان واحد. قيم مجمَّعة بالريال السعودي من لقطات يومية." />

      {rollup.isError ? (
        <ErrorState error={rollup.error} onRetry={() => void rollup.refetch()} />
      ) : !data ? (
        <div className="grid gap-2" aria-busy data-testid="stores-skeleton">
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
      ) : !data.has_account ? (
        <EmptyState title="هذه الصفحة لمالكي أكثر من متجر" description="تواصل مع الدعم لربط متاجرك بحساب واحد، ثم تظهر هنا جنباً إلى جنب." />
      ) : (
        <>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void setRange({ from: String(f.get("from") ?? ""), to: String(f.get("to") ?? "") });
            }}
          >
            <Field label="من" htmlFor="rollup-from">
              <input key={`f-${data.from}`} id="rollup-from" name="from" type="date" dir="ltr" defaultValue={data.from} className={cn(inputClass, "w-44 font-mono")} />
            </Field>
            <Field label="إلى" htmlFor="rollup-to">
              <input key={`t-${data.to}`} id="rollup-to" name="to" type="date" dir="ltr" defaultValue={data.to} className={cn(inputClass, "w-44 font-mono")} />
            </Field>
            <Button type="submit" variant="outline" className="h-11 px-4 lg:h-8">
              تطبيق
            </Button>
            {range.from || range.to ? (
              <Button type="button" variant="ghost" className="h-11 px-3 lg:h-8" onClick={() => void setRange({ from: "", to: "" })}>
                آخر 30 يوماً
              </Button>
            ) : null}
            <p className="w-full text-xs text-muted-foreground">
              النطاق المطبَّق: <Mono>{data.from}</Mono> — <Mono>{data.to}</Mono>
            </p>
          </form>
          <RollupTable data={data} stale={rollup.isFetching} />
        </>
      )}
    </div>
  );
}

function useDashboardHref() {
  const origin = useStoreOrigin();
  const url = new URL(origin);
  return (domain: string) => `${url.protocol}//${domain}${url.port ? `:${url.port}` : ""}/dashboard`;
}

function StoreName({ s, current }: { s: RollupStore; current: boolean }) {
  const href = useDashboardHref();
  const reachable = s.is_available && s.domain !== NO_DOMAIN && !current;
  const title = (
    <span className="flex flex-col">
      <span className="truncate font-medium">
        {s.name}
        {current ? <span className="ms-2 text-xs font-normal text-muted-foreground">المتجر الحالي</span> : null}
        {!s.is_available ? <span className="ms-2 text-xs font-normal text-muted-foreground">غير متاح</span> : null}
      </span>
      <Mono className="truncate text-xs text-muted-foreground">
        <bdi>{s.domain === NO_DOMAIN ? "بلا نطاق" : s.domain}</bdi>
      </Mono>
    </span>
  );
  // FR-43.06: another store is another origin — a full navigation, never a query param.
  return reachable ? (
    <a href={href(s.domain)} className="block rounded-sm underline-offset-4 hover:underline" data-testid="rollup-store-link">
      {title}
    </a>
  ) : (
    title
  );
}

function RollupTable({ data, stale }: { data: RollupData; stale: boolean }) {
  const num = "px-3 py-2 text-end whitespace-nowrap";
  return (
    <>
      {/* ≥ md: the table */}
      <div className={cn("hidden overflow-x-auto rounded-lg border border-border md:block", stale && "opacity-70")}>
        <table className="w-full text-sm" data-testid="rollup-table">
          <thead className="border-b border-border text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start font-normal">المتجر</th>
              <th className={cn(num, "font-normal")}>الطلبات</th>
              <th className={cn(num, "font-normal")}>المكتملة</th>
              <th className={cn(num, "font-normal")}>المستردة</th>
              <th className={cn(num, "font-normal")}>الإيراد (ر.س)</th>
              <th className={cn(num, "font-normal")}>آخر لقطة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.stores.map((s) => (
              <tr key={s.schema} data-testid="rollup-row" aria-current={s.schema === data.current_schema ? "true" : undefined}>
                <td className="max-w-72 px-3 py-2">
                  <StoreName s={s} current={s.schema === data.current_schema} />
                </td>
                <td className={num}>
                  <Mono data-testid="rollup-orders">{s.orders}</Mono>
                </td>
                <td className={num}>
                  <Mono>{s.completed}</Mono>
                </td>
                <td className={num}>
                  <Mono>{s.refunded}</Mono>
                </td>
                <td className={num}>
                  <Money value={s.display_revenue_sar} />
                </td>
                <td className={cn(num, "text-muted-foreground")}>{s.last_snapshot_date ? <Mono className="text-xs">{s.last_snapshot_date}</Mono> : <span className="text-xs">لا بيانات مجمَّعة بعد</span>}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-border font-medium" data-testid="rollup-totals">
            <tr>
              <td className="px-3 py-2">المجموع</td>
              <td className={num}>
                <Mono data-testid="rollup-total-orders">{data.totals.orders}</Mono>
              </td>
              <td className={num}>
                <Mono>{data.totals.completed}</Mono>
              </td>
              <td className={num}>
                <Mono>{data.totals.refunded}</Mono>
              </td>
              <td className={num}>
                <span data-testid="rollup-total-revenue">
                  <Money value={data.totals.display_revenue_sar} />
                </span>
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* < md: one row per store, revenue first, the counts on a second line (§6). */}
      <ul className="divide-y divide-border rounded-lg border border-border md:hidden" data-testid="rollup-list">
        {data.stores.map((s) => (
          <li key={s.schema} className="flex flex-col gap-1 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <StoreName s={s} current={s.schema === data.current_schema} />
              <Money value={s.display_revenue_sar} className="shrink-0" />
            </div>
            <p className="text-xs text-muted-foreground">
              الطلبات <Mono>{s.orders}</Mono> · المكتملة <Mono>{s.completed}</Mono> · المستردة <Mono>{s.refunded}</Mono>
              {" · "}
              {s.last_snapshot_date ? (
                <>
                  آخر لقطة <Mono>{s.last_snapshot_date}</Mono>
                </>
              ) : (
                "لا بيانات مجمَّعة بعد"
              )}
            </p>
          </li>
        ))}
        <li className="flex flex-col gap-1 bg-muted/40 px-3 py-3 font-medium">
          <div className="flex justify-between gap-3">
            <span>المجموع</span>
            <Money value={data.totals.display_revenue_sar} />
          </div>
          <p className="text-xs font-normal text-muted-foreground">
            الطلبات <Mono>{data.totals.orders}</Mono> · المكتملة <Mono>{data.totals.completed}</Mono> · المستردة <Mono>{data.totals.refunded}</Mono>
          </p>
        </li>
      </ul>
    </>
  );
}
