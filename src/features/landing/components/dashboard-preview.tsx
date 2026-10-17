import {
  ArrowUpRight,
  BarChart3,
  Box,
  LayoutDashboard,
  Search,
  Settings,
  ShoppingBag,
  Users,
} from "lucide-react";
import { Mono } from "@/components/shared/mono";
import { MockupReveal } from "@/components/motion/mockup-reveal";
import { FloatingBadges } from "@/features/landing/components/floating-badges";
import { StatusDot } from "@/features/landing/components/status-dot";
import { previewDashboard } from "@/features/landing/landing.content";

/**
 * The hero's centrepiece (constitution I-أ): a large glass dashboard floating
 * over a brand aura, with live-signal badges orbiting it.
 *
 * Still a REAL miniature component, never a screenshot — every number, row and
 * status below is rendered from `landing.content.ts`.
 * TODO(M03): swap the body for the actual dashboard shell once it exists.
 */
const SIDEBAR_ICONS = [LayoutDashboard, ShoppingBag, Box, Users, Settings] as const;

export function DashboardPreview() {
  const { storeName, sidebar, kpis, orders } = previewDashboard;

  return (
    <div className="relative mx-auto w-full max-w-5xl px-6">
      {/* brand light pooling beneath the glass */}
      <div
        aria-hidden
        className="mockup-glow pointer-events-none absolute inset-x-10 bottom-0 top-1/3 -z-10"
      />

      <MockupReveal className="relative">
        <FloatingBadges />

        <div
          role="img"
          aria-label="معاينة لوحة تحكم التاجر: طلبات اليوم وإيراده وأحدث خمسة طلبات"
          className="glass relative overflow-hidden rounded-2xl"
        >
          {/* window chrome */}
          <div className="flex h-11 items-center gap-3 border-b border-white/20 px-4 dark:border-white/5">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-zinc-300/80 dark:bg-zinc-700" />
              <span className="size-2.5 rounded-full bg-zinc-300/80 dark:bg-zinc-700" />
              <span className="size-2.5 rounded-full bg-zinc-300/80 dark:bg-zinc-700" />
            </div>
            <div className="mx-auto hidden items-center gap-2 rounded-lg border border-white/30 bg-white/40 px-3 py-1 sm:flex dark:border-white/10 dark:bg-white/5">
              <Search className="size-3 text-muted-foreground" aria-hidden />
              <Mono className="text-[0.65rem] text-muted-foreground">nada.sharwaah.com/dashboard</Mono>
            </div>
          </div>

          <div className="flex min-h-[22rem]">
            {/* sidebar */}
            <aside className="hidden w-44 shrink-0 flex-col gap-1 border-e border-white/20 p-3 md:flex dark:border-white/5">
              <div className="flex items-center gap-2 px-2 pb-4">
                <span className="flex size-6 items-center justify-center rounded-md bg-emerald-600 text-[0.6rem] font-bold text-white">
                  ن
                </span>
                <span className="text-xs font-medium text-foreground">{storeName}</span>
              </div>
              {sidebar.map((item, i) => {
                const Icon = SIDEBAR_ICONS[i]!;
                return (
                  <div
                    key={item.label}
                    className={
                      item.active
                        ? "flex items-center gap-2 rounded-lg bg-emerald-500/12 px-2.5 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                        : "flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-muted-foreground"
                    }
                  >
                    <Icon className="size-3.5 shrink-0" aria-hidden />
                    {item.label}
                  </div>
                );
              })}
            </aside>

            <div className="min-w-0 flex-1">
              {/* topbar */}
              <div className="flex h-11 items-center justify-between border-b border-white/20 px-4 dark:border-white/5">
                <span className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <BarChart3 className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  نظرة عامة
                </span>
                <span className="text-[0.65rem] text-muted-foreground">اليوم</span>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 border-b border-white/20 md:grid-cols-4 dark:border-white/5">
                {kpis.map((kpi, i) => (
                  <div
                    key={kpi.label}
                    className={`border-white/20 p-4 dark:border-white/5 ${i < kpis.length - 1 ? "border-e" : ""} ${i < 2 ? "border-b md:border-b-0" : ""}`}
                  >
                    <div className="flex items-baseline gap-1">
                      <Mono className="text-xl font-semibold tracking-tight text-foreground">
                        {kpi.value}
                      </Mono>
                      {kpi.unit ? (
                        <span className="text-[0.65rem] text-muted-foreground">{kpi.unit}</span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[0.7rem] text-muted-foreground">
                      {kpi.label}
                      {i === 1 ? (
                        <ArrowUpRight
                          className="size-3 text-emerald-600 dark:text-emerald-400"
                          aria-hidden
                        />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              {/* orders */}
              <div className="px-4 py-3">
                <div className="flex h-8 items-center gap-4 border-b border-white/20 text-[0.65rem] text-muted-foreground dark:border-white/5">
                  <span className="w-20 shrink-0">الطلب</span>
                  <span className="min-w-0 flex-1">العميل</span>
                  <span className="hidden w-24 shrink-0 sm:block">الحالة</span>
                  <span className="w-20 shrink-0 text-end">الإجمالي</span>
                </div>
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex h-11 items-center gap-4 border-b border-white/10 text-xs last:border-b-0 dark:border-white/5"
                  >
                    <Mono className="w-20 shrink-0 text-[0.7rem] text-muted-foreground">
                      {order.id}
                    </Mono>
                    <span className="min-w-0 flex-1 truncate text-foreground">{order.customer}</span>
                    <span className="hidden w-24 shrink-0 sm:block">
                      <StatusDot status={order.status} />
                    </span>
                    <span className="flex w-20 shrink-0 items-baseline justify-end gap-1">
                      <Mono className="text-[0.7rem] font-medium text-foreground">{order.total}</Mono>
                      <span className="text-[0.6rem] text-muted-foreground">ر.س</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </MockupReveal>
    </div>
  );
}
