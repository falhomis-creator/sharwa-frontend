import {
  ArrowUpRight,
  BarChart3,
  Box,
  CreditCard,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { Mono } from "@/components/shared/mono";
import { MockupReveal } from "@/components/motion/mockup-reveal";
import { FloatingBadges } from "@/features/landing/components/floating-badges";
import { StatusDot } from "@/features/landing/components/status-dot";
import { previewDashboard } from "@/features/landing/landing.content";

/**
 * The hero's centrepiece: a massive Glassmorphism Dashboard Mockup floating
 * over a soft emerald radial aura, rising smoothly into view via Framer Motion
 * (`MockupReveal`) and surrounded by live-signal badges.
 */
const SIDEBAR_ICONS = [LayoutDashboard, ShoppingBag, Box, Users, Settings] as const;

const KPI_TRENDS = ["+18.4%", "+24.2%", "+12.0%", "مستقر"] as const;

const CHART_BARS = [
  { day: "السبت", height: "h-10", active: false },
  { day: "الأحد", height: "h-14", active: false },
  { day: "الإثنين", height: "h-12", active: false },
  { day: "الثلاثاء", height: "h-18", active: false },
  { day: "الأربعاء", height: "h-16", active: false },
  { day: "الخميس", height: "h-22", active: false },
  { day: "اليوم", height: "h-26", active: true },
] as const;

const PAYMENT_METHODS = ["مدى", "Apple Pay", "شروة باي", "مدى", "Apple Pay"] as const;

export function DashboardPreview() {
  const { storeName, sidebar, kpis, orders } = previewDashboard;

  return (
    <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
      {/* Brand radial light pooling beneath the glass */}
      <div
        aria-hidden
        className="mockup-glow pointer-events-none absolute -inset-x-4 -bottom-10 -top-6 -z-10"
      />

      <MockupReveal className="relative">
        <FloatingBadges />

        {/* Outer glass bezel */}
        <div className="rounded-[1.75rem] border border-white/40 bg-white/25 p-2 shadow-2xl backdrop-blur-md sm:p-3 dark:border-white/10 dark:bg-white/5">
          {/* Main Glassmorphism Dashboard Container */}
          <div
            role="img"
            aria-label="معاينة لوحة تحكم التاجر: طلبات اليوم وإيراده وأحدث خمسة طلبات"
            className="float-frame relative overflow-hidden rounded-[1.35rem] border border-white/20 bg-white/40 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-900/50"
          >
            {/* Window chrome */}
            <div className="flex h-12 items-center justify-between gap-3 border-b border-white/30 bg-white/50 px-4 sm:px-5 dark:border-white/10 dark:bg-zinc-900/60">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-rose-400/80" />
                <span className="size-3 rounded-full bg-amber-400/80" />
                <span className="size-3 rounded-full bg-emerald-400/80" />
              </div>

              <div className="mx-auto hidden items-center gap-2.5 rounded-xl border border-white/50 bg-white/70 px-4 py-1.5 shadow-2xs backdrop-blur-md sm:flex dark:border-white/10 dark:bg-zinc-800/70">
                <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
                <Search className="size-3.5 text-muted-foreground" aria-hidden />
                <Mono className="text-xs font-medium text-foreground/85">
                  nada.sharwaah.com/dashboard
                </Mono>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[0.68rem] font-medium text-emerald-700 dark:text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  متصل · مباشر
                </span>
              </div>
            </div>

            <div className="flex min-h-[28rem]">
              {/* RTL Sidebar */}
              <aside className="hidden w-56 shrink-0 flex-col justify-between border-e border-white/30 bg-white/35 p-4 md:flex dark:border-white/10 dark:bg-zinc-900/40">
                <div className="flex flex-col gap-1.5">
                  <div className="mb-3 flex items-center gap-3 rounded-xl border border-white/40 bg-white/60 p-2.5 shadow-2xs dark:border-white/10 dark:bg-zinc-800/50">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white shadow-sm shadow-emerald-600/30">
                      ن
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-xs font-semibold text-foreground">
                        {storeName}
                      </span>
                      <span className="text-[0.65rem] text-emerald-700 dark:text-emerald-400">
                        متجر نشط · باقة النمو
                      </span>
                    </div>
                  </div>

                  {sidebar.map((item, i) => {
                    const Icon = SIDEBAR_ICONS[i]!;
                    return (
                      <div
                        key={item.label}
                        className={
                          item.active
                            ? "flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-600/12 px-3 py-2.5 text-xs font-semibold text-emerald-800 shadow-2xs dark:bg-emerald-500/15 dark:text-emerald-300"
                            : "flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-muted-foreground transition-colors"
                        }
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className="size-4 shrink-0" aria-hidden />
                          {item.label}
                        </span>
                        {i === 1 ? (
                          <Mono className="rounded-md bg-emerald-600/15 px-1.5 py-0.5 text-[0.65rem] font-semibold text-emerald-700 dark:text-emerald-300">
                            37
                          </Mono>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {/* Mini Sharwa Pay Wallet Card in Sidebar */}
                <div className="mt-6 rounded-xl border border-white/50 bg-white/65 p-3 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-zinc-800/60">
                  <div className="flex items-center justify-between text-[0.68rem] text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <Wallet className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                      محفظة شروة باي
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-400">متاح</span>
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <Mono className="text-sm font-bold text-foreground">24,860.75</Mono>
                    <span className="text-[0.65rem] text-muted-foreground">ر.س</span>
                  </div>
                </div>
              </aside>

              {/* Main Dashboard Workspace */}
              <div className="min-w-0 flex-1 bg-white/30 dark:bg-zinc-950/30">
                {/* Workspace Topbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/30 px-4 py-3 sm:px-6 dark:border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                      <BarChart3 className="size-4" aria-hidden />
                    </span>
                    <div>
                      <span className="block text-xs font-semibold text-foreground sm:text-sm">
                        نظرة عامة على المتجر
                      </span>
                      <span className="block text-[0.65rem] text-muted-foreground">
                        تحديث لحظي للمبيعات والطلبات والشحنات
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="hidden rounded-lg border border-white/50 bg-white/60 px-2.5 py-1 text-[0.7rem] font-medium text-muted-foreground sm:inline-flex dark:border-white/10 dark:bg-zinc-800/60">
                      اليوم · ١٧ أكتوبر
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[0.7rem] font-semibold text-white shadow-sm shadow-emerald-600/25">
                      <Plus className="size-3.5" aria-hidden />
                      منتج جديد
                    </span>
                  </div>
                </div>

                {/* KPIs Row */}
                <div className="grid grid-cols-2 gap-3 p-4 sm:px-6 lg:grid-cols-4">
                  {kpis.map((kpi, i) => (
                    <div
                      key={kpi.label}
                      className="rounded-xl border border-white/50 bg-white/70 p-3.5 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/65"
                    >
                      <div className="flex items-center justify-between gap-1 text-[0.72rem] text-muted-foreground">
                        <span className="font-medium">{kpi.label}</span>
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/12 px-1.5 py-0.5 text-[0.62rem] font-semibold text-emerald-700 dark:text-emerald-300">
                          <ArrowUpRight className="size-2.5" aria-hidden />
                          <Mono>{KPI_TRENDS[i]}</Mono>
                        </span>
                      </div>

                      <div className="mt-2 flex items-baseline gap-1">
                        <Mono className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                          {kpi.value}
                        </Mono>
                        {kpi.unit ? (
                          <span className="text-[0.7rem] font-medium text-muted-foreground">
                            {kpi.unit}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-zinc-200/70 dark:bg-zinc-800">
                        <div
                          className={
                            i === 1
                              ? "h-full w-4/5 rounded-full bg-emerald-600"
                              : i === 0
                                ? "h-full w-3/4 rounded-full bg-emerald-500"
                                : "h-full w-2/3 rounded-full bg-emerald-500/70"
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Middle Row: Live Revenue Velocity Chart + Quick Highlights */}
                <div className="mx-4 mb-4 rounded-xl border border-white/50 bg-white/65 p-4 shadow-xs backdrop-blur-md sm:mx-6 dark:border-white/10 dark:bg-zinc-900/60">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                      <span className="text-xs font-semibold text-foreground">
                        حركة المبيعات والتحصيل (آخر ٧ أيام)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[0.65rem]">
                      <span className="rounded-md bg-emerald-600/12 px-2 py-0.5 font-semibold text-emerald-700 dark:text-emerald-300">
                        ٧ أيام
                      </span>
                      <span className="rounded-md px-2 py-0.5 text-muted-foreground">
                        ٣٠ يوماً
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-7 items-end gap-2 sm:gap-3">
                    {CHART_BARS.map((bar) => (
                      <div key={bar.day} className="flex flex-col items-center gap-1.5">
                        <div className="flex h-28 w-full items-end justify-center rounded-lg bg-zinc-100/80 p-1 dark:bg-zinc-800/50">
                          <div
                            className={
                              bar.active
                                ? `${bar.height} w-full rounded-md bg-emerald-600 shadow-sm shadow-emerald-600/30`
                                : `${bar.height} w-full rounded-md bg-emerald-500/35 dark:bg-emerald-500/30`
                            }
                          />
                        </div>
                        <span className="text-[0.62rem] font-medium text-muted-foreground">
                          {bar.day}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Orders Table */}
                <div className="mx-4 mb-4 overflow-hidden rounded-xl border border-white/50 bg-white/70 px-4 py-3 shadow-xs backdrop-blur-md sm:mx-6 dark:border-white/10 dark:bg-zinc-900/65">
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs font-semibold text-foreground">أحدث الطلبات</span>
                    <Mono className="text-[0.68rem] text-emerald-700 dark:text-emerald-400">
                      ٥ من أصل ٣٧ اليوم
                    </Mono>
                  </div>

                  <div className="flex h-8 items-center gap-4 border-b border-zinc-200/60 text-[0.68rem] font-medium text-muted-foreground dark:border-white/10">
                    <span className="w-20 shrink-0">رقم الطلب</span>
                    <span className="min-w-0 flex-1">العميل</span>
                    <span className="hidden w-24 shrink-0 md:block">الدفع</span>
                    <span className="hidden w-24 shrink-0 sm:block">الحالة</span>
                    <span className="w-20 shrink-0 text-end">الإجمالي</span>
                  </div>

                  {orders.map((order, idx) => (
                    <div
                      key={order.id}
                      className="flex h-11 items-center gap-4 border-b border-zinc-200/40 text-xs last:border-b-0 dark:border-white/5"
                    >
                      <Mono className="w-20 shrink-0 text-[0.72rem] font-semibold text-foreground/90">
                        {order.id}
                      </Mono>

                      <span className="flex min-w-0 flex-1 items-center gap-2 truncate font-medium text-foreground">
                        <span className="hidden size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-[0.65rem] font-bold text-emerald-700 sm:inline-flex dark:text-emerald-300">
                          {order.customer.slice(0, 1)}
                        </span>
                        <span className="truncate">{order.customer}</span>
                      </span>

                      <span className="hidden w-24 shrink-0 items-center gap-1 text-[0.68rem] text-muted-foreground md:flex">
                        <CreditCard className="size-3 text-emerald-600 dark:text-emerald-400" aria-hidden />
                        <span>{PAYMENT_METHODS[idx]}</span>
                      </span>

                      <span className="hidden w-24 shrink-0 sm:block">
                        <StatusDot status={order.status} />
                      </span>

                      <span className="flex w-20 shrink-0 items-baseline justify-end gap-1">
                        <Mono className="text-[0.75rem] font-bold text-foreground">
                          {order.total}
                        </Mono>
                        <span className="text-[0.62rem] text-muted-foreground">ر.س</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </MockupReveal>
    </div>
  );
}

