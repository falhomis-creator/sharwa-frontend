import {
  TRAFFIC_SOURCES,
  type Overview,
  type OverviewOrderRow,
  type TodayMetrics,
} from "@/features/dashboard-shell/schemas";
import { displayMoney, int, isoDaysAgo, seeded } from "@/mocks/_fixtures";
import { newestNewOrders } from "@/mocks/orders/state";
import { productSummary } from "@/mocks/catalog/products";
import { catalog } from "@/mocks/catalog/state";
import { isEmptyStore } from "@/mocks/empty-store";

/**
 * `GET /api/v1/dashboard/overview/` fixture (M03 §7 — `[NEEDS BACKEND]`), built from
 * `DailyStoreMetrics` + the "needs you" sources listed in FR-03.11.
 *
 * Two shapes on purpose, so both states are screenshot-able without extra plumbing:
 * a working store (`noor`) and a brand-new store with nothing in it (`shop`, US-03.4.3).
 * The PRNG is seeded from the store slug, so a capture is stable.
 */
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

/** A store with no orders at all - the empty-overview state (now shared: `@/mocks/empty-store`). */
export { isEmptyStore };

/**
 * The «طلبات جديدة» block reads the M06 order fixture (newest `status=new` first), so a row
 * here opens the very order the list shows and the sidebar counter agrees (one source).
 */
function newOrders(store: string, count: number): OverviewOrderRow[] {
  return newestNewOrders(store, count).map((o) => ({
    id: o.id,
    customer_name: o.customer_name,
    customer_phone: o.customer_phone,
    display_total: o.display_total,
    status: o.status,
    payment_status: o.payment_status,
    fulfillment_status: o.fulfillment_status,
    sales_channel: o.sales_channel,
    created_at: o.created_at,
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
      // M04: the same number the products list strip shows.
      low_stock_products: productSummary(catalog(slug)).low_stock,
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
