import type { AccountStore } from "@/features/dashboard-shell/schemas";
import { TENANT_FIXTURES } from "@/mocks/tenant/config";

/**
 * `GET /api/v1/account/stores/` fixture (M03 §7 — `[NEEDS BACKEND]`, `MerchantAccount`).
 * Three stores so the switcher, the current-store marker and the disabled provisioning row
 * (M03 §8) are all reachable. Staff never see the switcher, so this is merchant-only.
 */
export function accountStoresMock(currentStore: string | null, baseDomain: string): AccountStore[] {
  const rows: Array<{ slug: string; status: AccountStore["provisioning_status"] }> = [
    { slug: "noor", status: "ready" },
    { slug: "shop", status: "ready" },
    { slug: "pending1", status: "provisioning" },
  ];
  return rows.map(({ slug, status }) => ({
    name: TENANT_FIXTURES[slug]?.config?.store_name ?? `متجر ${slug}`,
    host: `${slug}.${baseDomain}`,
    is_current: slug === currentStore,
    provisioning_status: status,
  }));
}
