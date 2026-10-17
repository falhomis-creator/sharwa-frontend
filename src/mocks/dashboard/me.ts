import { FEATURE_KEYS } from "@/lib/access";
import type { Session } from "@/features/dashboard-shell/schemas";
import { TENANT_FIXTURES } from "@/mocks/tenant/config";

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

export function storeNameFor(store: string | null): string {
  const fixture = store ? TENANT_FIXTURES[store] : undefined;
  return fixture?.config?.store_name ?? (store ? `متجر ${store}` : "متجري");
}

export function sessionMock(
  kind: "merchant" | "staff",
  opts: { store: string | null; storeHost: string },
): Session {
  const store_name = storeNameFor(opts.store);
  if (kind === "merchant") {
    return {
      kind: "merchant",
      store_name,
      store_host: opts.storeHost,
      features: [...FEATURE_KEYS],
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
