import type { StoreConfig } from "@/lib/schemas/store-config";
import { registeredStatus, registeredStore } from "@/mocks/public/register";
import { settingsOverlay } from "@/mocks/settings/overlay";
import { NOOR_SECTIONS } from "@/mocks/storefront/sections";
import { presetTheme } from "@/mocks/storefront/theme";

/**
 * Tenant probe fixtures for `GET /api/v1/config/` (M47 T049).
 *
 * Django is the authority: these only answer when the real upstream has no row for
 * the host (see `probeStore`). `demo` is deliberately absent — it is a RESERVED
 * subdomain in `tenants/validators.py`, so it can never be a store.
 *
 * Raw colour values live here because that is what Django stores and sends; the UI
 * consumes them as data (inline CSS variables), never as styling literals.
 */
export type TenantFixtureOutcome = "ok" | "not_found" | "inactive" | "provisioning";

export interface TenantFixture {
  outcome: TenantFixtureOutcome;
  config?: StoreConfig;
  /** Short-lived provisioning token the waiting page may poll with. */
  token?: string;
}

/** Django's defaults for a new store: the «الأساسي» preset (`DEFAULT_THEME_KEY`, theme_presets.py). */
function baseConfig(overrides: Partial<StoreConfig> & Pick<StoreConfig, "store_name">): StoreConfig {
  return {
    ...presetTheme("modern_trust"),
    theme_choice: "default",
    logo: null,
    whatsapp_number: "967770000011",
    announcement_text: null,
    enable_announcement_bar: false,
    sections: [],
    ...overrides,
  };
}

export const TENANT_FIXTURES: Record<string, TenantFixture> = {
  // Phase 4: two stores with two different presets in one session (M09 §11 IV) — `noor` on
  // «تَرَف» (`luxury_boutique`: gold ink, Amiri/Cairo, the full home page), `shop` on Django's
  // default «الأساسي» (`modern_trust`) with no sections and no products (the empty states).
  noor: {
    outcome: "ok",
    config: baseConfig({
      store_name: "متجر نور",
      ...presetTheme("luxury_boutique"),
      announcement_text: "توصيل مجاني للطلبات فوق 300 ر.س",
      enable_announcement_bar: true,
      whatsapp_number: "967770000011",
      sections: NOOR_SECTIONS,
    }),
  },
  shop: {
    outcome: "ok",
    config: baseConfig({
      store_name: "سوق الحكمة",
      ...presetTheme("modern_trust"),
      whatsapp_number: "967770000022",
    }),
  },
  pending1: { outcome: "provisioning", token: "prov-pending1" },
  closed: { outcome: "inactive" },
};

/**
 * Fixture for a store slug (subdomain) — `undefined` when the slug is not a fixture.
 *
 * Stores created through the mocked onboarding wizard (M02) resolve here too: 503 with
 * their status token while the poll count says pending/provisioning, then a fresh
 * zinc-default store once it says ready. Reading does not advance the poll count — only
 * the status endpoint does — so the probe never races the wait page.
 */
export function tenantFixture(store: string | null): TenantFixture | undefined {
  const fixture = baseFixture(store);
  if (!fixture?.config) return fixture;
  // Fields saved from the settings hub (M34) win over the static fixture.
  const overlay = settingsOverlay(store);
  return Object.keys(overlay).length ? { ...fixture, config: { ...fixture.config, ...overlay } } : fixture;
}

function baseFixture(store: string | null): TenantFixture | undefined {
  if (!store) return undefined;
  const fixed = TENANT_FIXTURES[store];
  if (fixed) return fixed;
  const registered = registeredStore(store);
  if (!registered) return undefined;
  if (registeredStatus(registered.polls) !== "ready") {
    return { outcome: "provisioning", token: registered.status_token };
  }
  return {
    outcome: "ok",
    config: baseConfig({ store_name: registered.store_name, whatsapp_number: registered.merchant_phone }),
  };
}

export const FIXTURE_STORES = Object.keys(TENANT_FIXTURES);
