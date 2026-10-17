import { Mono } from "@/components/shared/mono";
import { StatusDot } from "@/features/landing/components/status-dot";
import { previewDashboard } from "@/features/landing/landing.content";

/**
 * T035 — the merchant dashboard rendered as a REAL miniature component, never a
 * screenshot. It sits in a window frame lifted off the page by a neutral
 * three-layer shadow, a 1px border, a hairline top sheen and a light pool
 * underneath: elevation without a colored glow (constitution I).
 *
 * TODO(M03): replace the body with the actual dashboard shell once it exists.
 */
export function DashboardPreview() {
  const { storeName, sidebar, kpis, orders } = previewDashboard;

  return (
    <div className="relative mx-auto w-full max-w-6xl px-6">
      <div aria-hidden className="ambient-underlight pointer-events-none absolute inset-x-0 -top-8 h-48" />

      <div className="relative">
        <div
          role="img"
          aria-label="معاينة لوحة تحكم التاجر: نظرة عامة على طلبات اليوم وإيراده وأحدث خمسة طلبات"
          className="sheet-lift edge-sheen relative overflow-hidden rounded-xl border border-border/80 bg-elevated"
        >
          {/* window chrome */}
          <div className="flex h-10 items-center gap-3 border-b border-border/60 bg-background/60 px-4">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-border" />
              <span className="size-2.5 rounded-full bg-border" />
              <span className="size-2.5 rounded-full bg-border" />
            </div>
            <div className="mx-auto hidden items-center rounded-md border border-border/60 bg-elevated px-3 py-0.5 sm:flex">
              <Mono className="text-[0.65rem] text-muted-foreground">nada.sharwaah.com/dashboard</Mono>
            </div>
          </div>

          <div className="flex min-h-80">
            {/* sidebar */}
            <aside className="hidden w-40 shrink-0 flex-col gap-1 border-e border-border/60 bg-background/40 p-3 md:flex">
              <div className="px-2 pb-3 text-xs font-medium text-foreground">{storeName}</div>
              {sidebar.map((item) => (
                <div
                  key={item.label}
                  className={
                    item.active
                      ? "rounded-md bg-secondary px-2 py-1.5 text-xs font-medium text-foreground"
                      : "rounded-md px-2 py-1.5 text-xs text-muted-foreground"
                  }
                >
                  {item.label}
                </div>
              ))}
            </aside>

            <div className="min-w-0 flex-1">
              {/* topbar */}
              <div className="flex h-10 items-center justify-between border-b border-border/60 px-4">
                <span className="text-xs font-medium text-foreground">نظرة عامة</span>
                <span className="text-[0.65rem] text-muted-foreground">اليوم</span>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 border-b border-border/60 md:grid-cols-4">
                {kpis.map((kpi, i) => (
                  <div
                    key={kpi.label}
                    className={`border-border/60 p-4 ${i < kpis.length - 1 ? "border-e" : ""} ${i < 2 ? "border-b md:border-b-0" : ""}`}
                  >
                    <div className="flex items-baseline gap-1">
                      <Mono className="text-xl font-medium tracking-tight text-foreground">
                        {kpi.value}
                      </Mono>
                      {kpi.unit ? (
                        <span className="text-[0.65rem] text-muted-foreground">{kpi.unit}</span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-[0.7rem] text-muted-foreground">{kpi.label}</div>
                  </div>
                ))}
              </div>

              {/* orders table: horizontal rules only */}
              <div className="px-4 py-3">
                <div className="flex h-8 items-center gap-4 border-b border-border/60 text-[0.65rem] text-muted-foreground">
                  <span className="w-20 shrink-0">الطلب</span>
                  <span className="min-w-0 flex-1">العميل</span>
                  <span className="hidden w-24 shrink-0 sm:block">الحالة</span>
                  <span className="w-20 shrink-0 text-end">الإجمالي</span>
                </div>
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex h-11 items-center gap-4 border-b border-border/40 text-xs last:border-b-0"
                  >
                    <Mono className="w-20 shrink-0 text-[0.7rem] text-muted-foreground">
                      {order.id}
                    </Mono>
                    <span className="min-w-0 flex-1 truncate text-foreground">{order.customer}</span>
                    <span className="hidden w-24 shrink-0 sm:block">
                      <StatusDot status={order.status} />
                    </span>
                    <span className="flex w-20 shrink-0 items-baseline justify-end gap-1">
                      <Mono className="text-[0.7rem] text-foreground">{order.total}</Mono>
                      <span className="text-[0.6rem] text-muted-foreground">ر.س</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
