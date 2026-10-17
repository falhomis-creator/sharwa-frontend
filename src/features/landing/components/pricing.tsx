import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mono } from "@/components/shared/mono";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionHeading } from "@/features/landing/components/section-heading";
import { getPublicPlans } from "@/features/landing/api/plans";
import { hero, sections } from "@/features/landing/landing.content";
import type { PublicPlan } from "@/features/landing/schemas/plans";

/**
 * T038 — reflects reality rather than inventing tiers: with
 * `subscriptions_enabled: false` there is ONE column (free, everything
 * included). The comparison table only appears once Django actually returns
 * plans, and collapses to per-plan Tabs under `md`.
 */
export async function Pricing() {
  const { subscriptions_enabled, plans } = await getPublicPlans();
  const free = plans.find((p) => p.is_free) ?? plans[0];

  return (
    <section id="pricing" className="mx-auto w-full max-w-6xl px-6">
      <SectionHeading {...sections.pricing} />
      {!subscriptions_enabled || plans.length <= 1 ? (
        <SinglePlan plan={free} />
      ) : (
        <PlanComparison plans={plans} />
      )}
    </section>
  );
}

const LIMIT = (v: number | null) => (v === null ? "بلا حد" : String(v));

function SinglePlan({ plan }: { plan?: PublicPlan }) {
  const features = plan?.features ?? [];

  return (
    <div className="mt-12 grid grid-cols-1 overflow-hidden rounded-xl border border-border/60 bg-elevated lg:mt-16 lg:grid-cols-12">
      <div className="flex flex-col gap-4 border-b border-border/60 p-8 lg:col-span-5 lg:border-b-0 lg:border-e lg:p-12">
        <span className="text-sm text-muted-foreground">{plan?.name ?? "مجاني"}</span>
        <div className="flex items-baseline gap-2">
          <Mono className="text-5xl font-medium tracking-tight text-foreground">0</Mono>
          <span className="text-base text-muted-foreground">ر.س / شهرياً</span>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          بلا بطاقة بنكية وبلا سقف للمنتجات أو الطلبات. حين نفتح الاشتراكات سنخبرك قبل أي تغيير.
        </p>
        <Button render={<a href="#start" />}
              nativeButton={false} className="mt-4 h-12 rounded-md text-sm">
          {hero.cta}
        </Button>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          لديك متجر؟ ادخل لوحة التاجر
        </Link>
      </div>

      <div className="p-8 lg:col-span-7 lg:p-12">
        <span className="text-sm text-muted-foreground">ما يشمله</span>
        <ul className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-baseline gap-3 text-sm text-foreground">
              <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-foreground" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PlanRows({ plan }: { plan: PublicPlan }) {
  return (
    <>
      <div className="flex items-baseline justify-between border-b border-border/60 py-3 text-sm">
        <span className="text-muted-foreground">السعر</span>
        <span className="flex items-baseline gap-1">
          <Mono className="text-foreground">{plan.price}</Mono>
          <span className="text-xs text-muted-foreground">ر.س</span>
        </span>
      </div>
      <div className="flex items-baseline justify-between border-b border-border/60 py-3 text-sm">
        <span className="text-muted-foreground">المنتجات</span>
        <Mono className="text-foreground">{LIMIT(plan.max_products)}</Mono>
      </div>
      <div className="flex items-baseline justify-between border-b border-border/60 py-3 text-sm">
        <span className="text-muted-foreground">الطلبات شهرياً</span>
        <Mono className="text-foreground">{LIMIT(plan.max_orders_per_month)}</Mono>
      </div>
      <ul className="mt-4 flex flex-col gap-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-baseline gap-3 text-sm text-foreground">
            <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-foreground" />
            {feature}
          </li>
        ))}
      </ul>
    </>
  );
}

function PlanComparison({ plans }: { plans: PublicPlan[] }) {
  return (
    <>
      {/* ≥ md: one comparison table, numbers aligned to the inline end */}
      <div className="mt-12 hidden overflow-hidden rounded-xl border border-border/60 bg-elevated md:mt-16 md:block">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${plans.length}, minmax(0, 1fr))` }}>
          {plans.map((plan, i) => (
            <div
              key={plan.code}
              className={`border-border/60 p-8 lg:p-10 ${i === plans.length - 1 ? "" : "border-e"}`}
            >
              <h3 className="text-lg font-medium tracking-tight text-foreground">{plan.name}</h3>
              <div className="mt-6">
                <PlanRows plan={plan} />
              </div>
              <Button render={<a href="#start" />}
              nativeButton={false} className="mt-8 h-12 w-full rounded-md text-sm">
                {hero.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* < md: one tab per plan */}
      <Tabs defaultValue={plans[0]!.code} className="mt-12 md:hidden">
        <TabsList className="w-full">
          {plans.map((plan) => (
            <TabsTrigger key={plan.code} value={plan.code} className="flex-1">
              {plan.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {plans.map((plan) => (
          <TabsContent key={plan.code} value={plan.code}>
            <div className="rounded-xl border border-border/60 bg-elevated p-8">
              <PlanRows plan={plan} />
              <Button render={<a href="#start" />}
              nativeButton={false} className="mt-8 h-12 w-full rounded-md text-sm">
                {hero.cta}
              </Button>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
