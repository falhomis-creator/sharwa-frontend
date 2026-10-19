import type { Currency } from "@/lib/schemas/money";
import { CURRENCIES } from "@/lib/schemas/money";
import { displayMoney } from "@/mocks/_fixtures";
import {
  currentSubscription,
  findClient,
  isStalled,
  money,
  planById,
  planDisplayPrice,
  platformState,
  resolveFeature,
  walletOf,
  type ChargeRow,
  type ClientRow,
  type CommissionRow,
  type DeactivationRow,
  type PlanRow,
  type SubscriptionRowM,
  type TopupRow,
  type WithdrawalRow,
} from "@/mocks/platform/state";

/** Row → contract projections (the shapes in `src/features/platform-admin/schemas`). */
export function storeRow(c: ClientRow) {
  const sub = currentSubscription(c.schema_name);
  const plan = sub ? planById(sub.plan_id) : undefined;
  const deact = currentDeactivation(c.schema_name);
  return {
    schema_name: c.schema_name,
    name: c.name,
    primary_domain: c.primary_domain,
    merchant_phone: c.merchant_phone,
    provisioning_status: c.provisioning_status,
    is_stalled: isStalled(c),
    current_plan: plan ? { id: plan.id, code: plan.code, name: plan.name } : null,
    is_active: c.is_active,
    deactivation_status: deact?.status ?? null,
    sharwa_ship: c.pending_job?.kind === "sharwa_ship" ? (c.pending_job.target ? "activating" : "deactivating") : c.sharwa_ship,
    created_on: c.created_on,
  };
}

export function currentDeactivation(schema: string): DeactivationRow | undefined {
  return platformState()
    .deactivations.filter((d) => d.schema_name === schema)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

export function subscriptionView(s: SubscriptionRowM) {
  const plan = planById(s.plan_id)!;
  const c = findClient(s.schema_name);
  return {
    id: s.id,
    schema_name: s.schema_name,
    store_name: c?.name ?? s.schema_name,
    plan: { id: plan.id, code: plan.code, name: plan.name },
    status: s.status,
    is_current: s.is_current,
    started_at: s.started_at,
    current_period_end: s.current_period_end,
    cancelled_at: s.cancelled_at,
    notes: s.notes,
  };
}

export function planView(p: PlanRow) {
  const subs = platformState().subscriptions.filter((s) => s.plan_id === p.id && s.is_current).length;
  return {
    ...p,
    display_price: planDisplayPrice(p),
    display_commission:
      p.commission_type === "none" ? "—" : p.commission_type === "percentage" ? `${Number(p.commission_value).toFixed(2)}%` : displayMoney(Number(p.commission_value), p.currency),
    current_subscriptions: subs,
  };
}

export function walletBalances(phone: string | null) {
  const w = walletOf(phone);
  if (!w) return null;
  return CURRENCIES.filter((c) => w.balances[c] !== undefined).map((c) => ({ currency: c, display_balance: money(w.balances[c]!, c) }));
}

export function snapshotView(c: ClientRow) {
  return c.snapshot ? { date: c.snapshot.date, orders_count: c.snapshot.orders_count, display_revenue_sar: money(c.snapshot.revenue_sar, "SAR") } : null;
}

export function commissionView(r: CommissionRow) {
  return {
    id: r.id,
    order_id: r.order_id,
    plan_name_snapshot: r.plan_name_snapshot,
    commission_type: r.commission_type,
    commission_value: r.commission_value,
    display_amount: money(r.amount, r.currency),
    currency: r.currency,
    created_at: r.created_at,
    collectable: r.amount > 0 && r.commission_type !== "none",
  };
}

export function chargeView(r: ChargeRow) {
  return {
    id: r.id,
    installation_id: r.installation_id,
    app_code: r.app_code,
    app_name_snapshot: r.app_name_snapshot,
    period_label: r.period_label,
    display_price: money(r.price, r.currency),
    currency: r.currency,
    created_at: r.created_at,
  };
}

export function totalsFor(commissions: CommissionRow[], charges: ChargeRow[]) {
  const sum = new Map<Currency, { c: number; a: number }>();
  for (const r of commissions) {
    const v = sum.get(r.currency) ?? { c: 0, a: 0 };
    v.c += r.amount;
    sum.set(r.currency, v);
  }
  for (const r of charges) {
    const v = sum.get(r.currency) ?? { c: 0, a: 0 };
    v.a += r.price;
    sum.set(r.currency, v);
  }
  return CURRENCIES.filter((c) => sum.has(c)).map((c) => ({ currency: c, display_commissions: money(sum.get(c)!.c, c), display_charges: money(sum.get(c)!.a, c) }));
}

function customerName(phone: string): string | null {
  return walletOf(phone)?.customer_name ?? null;
}

export function topupView(t: TopupRow) {
  return { ...t, customer_name: customerName(t.customer_phone), amount: t.amount.toFixed(2), display_amount: money(t.amount, t.currency) };
}

export function withdrawalView(w: WithdrawalRow) {
  return { ...w, customer_name: customerName(w.customer_phone), amount: w.amount.toFixed(2), display_amount: money(w.amount, w.currency) };
}

export function storeFeatures(schema: string) {
  const s = platformState();
  return s.features.map((f) => {
    const r = resolveFeature(f.code, schema);
    const o = s.overrides.find((x) => x.feature_code === f.code && x.schema_name === schema);
    return { code: f.code, name: f.name, module_group: f.module_group, effective: r.enabled, source: r.decided_by, override: o ? { is_enabled: o.is_enabled, notes: o.notes } : null };
  });
}

export function paginate<T>(rows: T[], params: URLSearchParams): { count: number; results: T[] } {
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const size = Math.min(100, Math.max(1, Number(params.get("page_size") ?? 50) || 50));
  return { count: rows.length, results: rows.slice((page - 1) * size, page * size) };
}

/** DRF `ordering=` on a known set of keys; `-key` descends. */
export function orderBy<T>(rows: T[], ordering: string | null, keys: Record<string, (r: T) => string | number>): T[] {
  if (!ordering) return rows;
  const desc = ordering.startsWith("-");
  const key = keys[desc ? ordering.slice(1) : ordering];
  if (!key) return rows;
  return [...rows].sort((a, b) => {
    const x = key(a);
    const y = key(b);
    const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "ar");
    return desc ? -cmp : cmp;
  });
}
