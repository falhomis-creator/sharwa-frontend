import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { connection } from "next/server";
import { getOverview } from "@/features/dashboard-shell/api/overview";
import { getSession } from "@/features/dashboard-shell/api/session";
import { requestIdentity } from "@/features/tenant/request";
import { TodayBar } from "@/features/dashboard-shell/components/overview/today-bar";
import { NewOrdersBlock } from "@/features/dashboard-shell/components/overview/new-orders-block";
import { AttentionBlock } from "@/features/dashboard-shell/components/overview/attention-block";
import { TopProductsBlock } from "@/features/dashboard-shell/components/overview/top-products-block";
import { TrafficSourcesBlock } from "@/features/dashboard-shell/components/overview/traffic-sources-block";
import { RetryBlock } from "@/features/dashboard-shell/components/overview/retry-block";

/** Blocks on its data by design (see below) — the same opt-out the shell layout declares. */
export const instant = false;

export const metadata: Metadata = { title: "النظرة العامة", robots: { index: false, follow: false } };

/**
 * `/dashboard` — the overview (M03 US-03.4, US-03.5).
 *
 * Layout: the six-number bar, then a 12-column Bento at 8/4 and then 4/8 (FR-03.10 — no row
 * of equal-width cards anywhere). One column on mobile with differing heights.
 *
 * The page awaits its data instead of streaming it behind a `<Suspense>`: any boundary at or
 * above the shell layout lets Next flush a static shell with a 200 BEFORE the layout's
 * session gate resolves, which turned an unauthenticated request into overview markup plus
 * a client-side redirect. Without one, the gate produces a real 307 to the login screen.
 */
export default async function DashboardOverviewPage() {
  // Request-time: the overview (and its mock, which reads the clock) is session data.
  await connection();
  const [identity, session] = await Promise.all([requestIdentity(), getSession()]);
  const { data } = await getOverview(identity.store, identity.storeHost);

  if (!data) {
    return (
      <RetryBlock
        title="تعذّر تحميل النظرة العامة"
        description="عقد لوحة النظرة العامة غير متاح بعد على الخادم."
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            أهلاً بك في لوحة تحكم {session?.store_name ?? identity.store}
          </h1>
          <p className="text-sm text-muted-foreground">ما حدث اليوم، وما يحتاج تدخلك الآن.</p>
        </div>
        <Link href="/dashboard/products/new" className={cn(buttonVariants({ size: "lg" }), "h-11 gap-2 px-5")}>
          <Plus className="size-4" strokeWidth={2.25} aria-hidden />
          إضافة منتج جديد
        </Link>
      </div>

      <TodayBar initial={data.today} store={identity.store} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
        <NewOrdersBlock rows={data.new_orders} storeUrl={identity.storeOrigin} />
        <AttentionBlock attention={data.attention} />
        <TopProductsBlock products={data.top_products} />
        <TrafficSourcesBlock sources={data.traffic_sources} />
      </div>
    </div>
  );
}
