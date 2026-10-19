import { displayMoney, int, seeded } from "@/mocks/_fixtures";
import { FIXTURE_NOW } from "@/mocks/store-state";
import { findClient } from "@/mocks/platform/state";
import { storeNameFor } from "@/mocks/dashboard/me";

/**
 * M43 fixture (`[NEEDS BACKEND]`): one `MerchantAccount` owning noor, shop and pending1 —
 * the same three stores M03's switcher lists — with 90 days of `TenantStatsSnapshot` rows
 * for the two ready stores and none for pending1 (provisioning, §8 «غير متاح» + «لا بيانات
 * مجمَّعة بعد»). Any other store has no account (`has_account=false`, US-43.3).
 *
 * Read-only and deterministic, so no per-store mutable state is needed.
 */
const ACCOUNT: Array<{ schema: string; status: "ready" | "provisioning" }> = [
  { schema: "noor", status: "ready" },
  { schema: "shop", status: "ready" },
  { schema: "pending1", status: "provisioning" },
];

interface Snapshot {
  date: string;
  orders: number;
  completed: number;
  refunded: number;
  revenue_sar: number;
}

const DAY = 86_400_000;
const TODAY = new Date(FIXTURE_NOW).toISOString().slice(0, 10);

function dateOf(daysAgo: number): string {
  return new Date(FIXTURE_NOW - daysAgo * DAY).toISOString().slice(0, 10);
}

const SNAPSHOTS = new Map<string, Snapshot[]>();
function snapshots(schema: string): Snapshot[] {
  let rows = SNAPSHOTS.get(schema);
  if (rows) return rows;
  rows = [];
  if (schema !== "pending1") {
    const rnd = seeded(schema === "noor" ? 4301 : 4302);
    const scale = schema === "noor" ? 1 : 0.45;
    // Daily snapshots for 90 days, with two missing days (shown as-is, no interpolation — §8).
    for (let d = 89; d >= 0; d--) {
      if (d === 12 || d === 40) continue;
      const orders = Math.round(int(rnd, 6, 22) * scale) + 1;
      const refunded = rnd() < 0.3 ? 1 : 0;
      const completed = Math.max(0, orders - int(rnd, 0, 3) - refunded);
      rows.push({ date: dateOf(d), orders, completed, refunded, revenue_sar: Math.round(completed * (110 + rnd() * 160) * 100) / 100 });
    }
  }
  SNAPSHOTS.set(schema, rows);
  return rows;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function rollupMock(currentStore: string | null, baseDomain: string, params: URLSearchParams) {
  const current = currentStore ?? "";
  const linked = ACCOUNT.some((a) => a.schema === current);
  const fromRaw = params.get("from") ?? "";
  const toRaw = params.get("to") ?? "";
  const to = ISO.test(toRaw) ? toRaw : TODAY;
  const from = ISO.test(fromRaw) ? fromRaw : new Date(Date.parse(`${to}T00:00:00Z`) - 29 * DAY).toISOString().slice(0, 10);
  if (!linked) {
    return { has_account: false, current_schema: current, from, to, stores: [], totals: { orders: 0, completed: 0, refunded: 0, display_revenue_sar: displayMoney(0) } };
  }
  const [lo, hi] = from <= to ? [from, to] : [to, from];
  const stores = ACCOUNT.map(({ schema, status }) => {
    const rows = snapshots(schema).filter((s) => s.date >= lo && s.date <= hi);
    const revenue = rows.reduce((acc, s) => acc + s.revenue_sar, 0);
    const client = findClient(schema);
    return {
      name: storeNameFor(schema),
      schema,
      domain: `${schema}.${baseDomain}`,
      orders: rows.reduce((acc, s) => acc + s.orders, 0),
      completed: rows.reduce((acc, s) => acc + s.completed, 0),
      refunded: rows.reduce((acc, s) => acc + s.refunded, 0),
      revenue,
      display_revenue_sar: displayMoney(revenue),
      last_snapshot_date: snapshots(schema).at(-1)?.date ?? null,
      is_available: status === "ready" && (client?.is_active ?? true),
    };
  }).sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = stores.reduce((acc, s) => acc + s.revenue, 0);
  return {
    has_account: true,
    current_schema: current,
    from: lo,
    to: hi,
    stores: stores.map((row) => {
      const s = { ...row } as Partial<typeof row>;
      delete s.revenue;
      return s as Omit<typeof row, "revenue">;
    }),
    totals: {
      orders: stores.reduce((acc, s) => acc + s.orders, 0),
      completed: stores.reduce((acc, s) => acc + s.completed, 0),
      refunded: stores.reduce((acc, s) => acc + s.refunded, 0),
      display_revenue_sar: displayMoney(totalRevenue),
    },
  };
}
