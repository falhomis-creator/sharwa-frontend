import {
  TRAFFIC_SOURCES,
  type Overview,
  type OverviewOrderRow,
  type TodayMetrics,
} from "@/features/dashboard-shell/schemas";
import { displayMoney, fullName, int, isoDaysAgo, phone, pick, seeded } from "@/mocks/_fixtures";

/**
 * `GET /api/v1/dashboard/overview/` fixture (M03 §7 — `[NEEDS BACKEND]`), built from
 * `DailyStoreMetrics` + the "needs you" sources listed in FR-03.11.
 *
 * Two shapes on purpose, so both states are screenshot-able without extra plumbing:
 * a working store (`noor`) and a brand-new store with nothing in it (`shop`, US-03.4.3).
 * The PRNG is seeded from the store slug, so a capture is stable.
 */
const FULFILLMENT_STATES = [
  { id: 1, name: "قيد الانتظار", color: "#f59e0b" },
  { id: 2, name: "قيد التجهيز", color: "#3b82f6" },
  { id: 3, name: "قيد التوصيل", color: "#8b5cf6" },
] as const;

const PAYMENT_MIX = ["unpaid", "pending", "paid"] as const;
const CHANNEL_MIX = ["online", "online", "online", "pos", "phone"] as const;

const EMPTY_TODAY: TodayMetrics = {
  orders_count: 0,
  completed_orders_count: 0,
  cancelled_orders_count: 0,
  refunded_orders_count: 0,
  display_gross_revenue: displayMoney(0),
  display_net_revenue: displayMoney(0),
  refreshed_at: null,
};

function seedOf(store: string | null): number {
  if (!store) return 7;
  let s = 0;
  for (const ch of store) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  return s || 7;
}

/** A store with no orders at all - the empty-overview state. */
export function isEmptyStore(store: string | null): boolean {
  return store === "shop";
}

function newOrders(store: string, count: number): OverviewOrderRow[] {
  const rnd = seeded(seedOf(store));
  return Array.from({ length: count }, (_, i) => ({
    id: 10_480 - i * 3,
    customer_name: fullName(rnd),
    customer_phone: phone(rnd),
    display_total: displayMoney(int(rnd, 85, 2_400) + 0.5),
    status: "new" as const,
    payment_status: pick(rnd, PAYMENT_MIX),
    fulfillment_status: { ...pick(rnd, FULFILLMENT_STATES) },
    sales_channel: pick(rnd, CHANNEL_MIX),
    created_at: isoDaysAgo(0, 20 - i),
  }));
}

export function overviewMock(store: string | null, refreshedAt?: string): Overview {
  if (isEmptyStore(store)) {
    return {
      today: { ...EMPTY_TODAY, refreshed_at: refreshedAt ?? null },
      new_orders: [],
      attention: {
        pending_approvals: 0,
        unread_behavior_alerts: { warning: 0, critical: 0 },
        low_stock_products: 0,
        unread_conversations: 0,
      },
      top_products: [],
      // All nine sources at zero: every bar row is hidden (US-03.5.1).
      traffic_sources: Object.fromEntries(TRAFFIC_SOURCES.map((s) => [s, 0])),
    };
  }

  const slug = store ?? "noor";
  const rnd = seeded(seedOf(slug));
  const orders = int(rnd, 18, 34);
  const completed = int(rnd, 8, orders - 6);
  const cancelled = int(rnd, 0, 3);
  const refunded = int(rnd, 0, 2);
  const gross = int(rnd, 9_000, 24_000) + 0.75;

  return {
    today: {
      orders_count: orders,
      completed_orders_count: completed,
      cancelled_orders_count: cancelled,
      refunded_orders_count: refunded,
      display_gross_revenue: displayMoney(gross),
      display_net_revenue: displayMoney(gross * 0.82),
      refreshed_at: refreshedAt ?? isoDaysAgo(0, 19),
    },
    new_orders: newOrders(slug, 8),
    attention: {
      pending_approvals: 3,
      unread_behavior_alerts: { warning: 2, critical: 1 },
      low_stock_products: 7,
      // Zero on purpose: the row must disappear rather than render a 0 (US-03.5.3).
      unread_conversations: 0,
    },
    top_products: [
      { id: 412, name: "عباية كلاسيك سوداء", image: null, qty: 23, display_revenue: displayMoney(5_290) },
      { id: 318, name: "عطر عود ملكي 50مل", image: null, qty: 17, display_revenue: displayMoney(4_080) },
      { id: 509, name: "تمر سكري فاخر 1كغ", image: null, qty: 14, display_revenue: displayMoney(1_120) },
      { id: 221, name: "شماغ أحمر", image: null, qty: 9, display_revenue: displayMoney(810) },
    ],
    traffic_sources: {
      tiktok: 412,
      whatsapp: 268,
      instagram: 143,
      snapchat: 61,
      facebook: 0,
      telegram: 24,
      amazon: 0,
      noon: 0,
      direct: 97,
    },
  };
}
