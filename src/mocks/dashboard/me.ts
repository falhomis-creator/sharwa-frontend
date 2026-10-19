import type { Session } from "@/features/dashboard-shell/schemas";
import { tenantFixture } from "@/mocks/tenant/config";
import { effectiveFeatures, findClient } from "@/mocks/platform/state";

/**
 * `GET /api/v1/auth/me/` fixture (M03 §7 — `[NEEDS BACKEND]`).
 *
 * The merchant gets all 39 feature keys because that is the platform's real state today:
 * `PlatformBillingSettings.subscriptions_enabled` and `commission_enabled` are both False,
 * so the gate resolves open for every store (discovery 01 §2.2, §7).
 *
 * The staff fixture is the «كاشير» role from M03 US-03.2.2: a narrow feature set and six
 * permissions, so the sidebar's feature gate AND permission gate are both demonstrable.
 */
export const MOCK_STAFF_FEATURES = ["inventory", "refunds", "customer_report"] as const;

export const MOCK_STAFF_PERMISSIONS = [
  "orders.view",
  "orders.update_status",
  "customers.view",
  "inventory.view",
  "inventory.adjust",
  "discounts.apply",
] as const;

/**
 * «مدير المتجر» (decision 2026-10-19, Phase 5 open item 2). Plan features are STORE-wide,
 * so the manager sees the full plan (like the owner); access narrows by permission only.
 * Every key a store manager plausibly holds — but not the owner's prerogatives: no
 * `orders.delete`, no `staff.manage_roles`, no `support.takeover_session`, no supplier
 * approval. Owner-only screens (no key at all) stay hidden for this member too, which is
 * exactly what the screenshots must show: «forbidden» and «owner-only», not «feature off».
 */
export const MOCK_MANAGER_PERMISSIONS = [
  "orders.view",
  "orders.update_status",
  "orders.refund",
  "orders.process_returns",
  "orders.create_b2b",
  "orders.approve_b2b",
  "staff.view",
  "staff.manage",
  "staff.manage_assignments",
  "staff.view_sessions",
  "customers.view",
  "customers.edit_profile",
  "customers.manage_tier",
  "customers.export",
  "inventory.view",
  "inventory.adjust",
  "inventory.writeoff",
  "reports.view",
  "reports.export",
  "reports.sales.view",
  "reports.inventory.view",
  "reports.customers.view",
  "reports.staff_performance.view",
  "discounts.apply",
  "discounts.manage",
  "suppliers.manage",
  "channels.inbox.access",
] as const;

export function storeNameFor(store: string | null): string {
  const fixture = tenantFixture(store);
  return fixture?.config?.store_name ?? (store ? (findClient(store)?.name ?? `متجر ${store}`) : "متجري");
}

export function sessionMock(
  kind: "merchant" | "staff" | "manager",
  opts: { store: string | null; storeHost: string },
): Session {
  const store_name = storeNameFor(opts.store);
  if (kind === "merchant") {
    return {
      kind: "merchant",
      store_name,
      store_host: opts.storeHost,
      // Resolved by the platform (M46 FR-46.04) — the console and this session never disagree.
      features: effectiveFeatures(opts.store),
      behavior: { export: "none", view: "none" },
    };
  }
  if (kind === "manager") {
    return {
      kind: "staff",
      store_name,
      store_host: opts.storeHost,
      staff: {
        full_name: "منى القحطاني",
        roles: ["مدير المتجر"],
        permissions: [...MOCK_MANAGER_PERMISSIONS],
        // M22 assignment #3: manager at location 3.
        locations: [{ id: 3, name: "فرع جدة" }],
        max_discount_percent: "25.00",
      },
      features: effectiveFeatures(opts.store),
      behavior: { export: "none", view: "none" },
    };
  }
  return {
    kind: "staff",
    store_name,
    store_host: opts.storeHost,
    staff: {
      full_name: "سارة الحربي",
      roles: ["كاشير"],
      permissions: [...MOCK_STAFF_PERMISSIONS],
      locations: [{ id: 1, name: "الفرع الرئيسي" }],
      max_discount_percent: "10.00",
    },
    features: [...MOCK_STAFF_FEATURES],
    behavior: { export: "warning", view: "none" },
  };
}
