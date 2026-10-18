import type { StoreConfig } from "@/lib/schemas/store-config";
import { registeredStatus, registeredStore } from "@/mocks/public/register";
import { settingsOverlay } from "@/mocks/settings/overlay";

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

function shades(hues: readonly string[]): Record<string, string> {
  const keys = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"];
  return Object.fromEntries(keys.map((k, i) => [k, hues[i]!]));
}

function baseConfig(overrides: Partial<StoreConfig> & Pick<StoreConfig, "store_name">): StoreConfig {
  return {
    primary_color: "#0f766e",
    secondary_color: "#115e59",
    background_color: "#ffffff",
    text_color: "#18181b",
    heading_font: "IBM Plex Sans Arabic",
    body_font: "IBM Plex Sans Arabic",
    design_style: "minimal",
    theme_preset: "default",
    theme_choice: "default",
    brand_shades: shades([
      "#f0fdfa",
      "#ccfbf1",
      "#99f6e4",
      "#5eead4",
      "#2dd4bf",
      "#14b8a6",
      "#0d9488",
      "#0f766e",
      "#115e59",
      "#134e4a",
    ]),
    logo: null,
    whatsapp_number: "967770000011",
    announcement_text: null,
    enable_announcement_bar: false,
    sections: [],
    ...overrides,
  };
}

export const TENANT_FIXTURES: Record<string, TenantFixture> = {
  noor: {
    outcome: "ok",
    config: baseConfig({
      store_name: "متجر نور",
      announcement_text: "توصيل مجاني للطلبات فوق 300 ر.س",
      enable_announcement_bar: true,
      whatsapp_number: "967770000011",
    }),
  },
  shop: {
    outcome: "ok",
    config: baseConfig({
      store_name: "سوق الحكمة",
      primary_color: "#1d4ed8",
      secondary_color: "#1e3fa8",
      brand_shades: shades([
        "#eff6ff",
        "#dbeafe",
        "#bfdbfe",
        "#93c5fd",
        "#60a5fa",
        "#3b82f6",
        "#2563eb",
        "#1d4ed8",
        "#1e3fa8",
        "#1e3a8a",
      ]),
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
