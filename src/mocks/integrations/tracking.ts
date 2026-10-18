import type { MockResult } from "@/lib/bff/mock-route";
import { TRACKING_ID_FIELDS, TRACKING_TOKEN_FIELDS, type Tracking, type TrackingTokenField } from "@/features/integrations/schemas";
import { isEmptyStore } from "@/mocks/empty-store";
import { FIXTURE_NOW, storeState } from "@/mocks/store-state";

/**
 * M19 tracking tools `[NEEDS BACKEND]` (`TrackingSettingsForm` is HTML-only today). One row per
 * store. The two CAPI tokens are write-only: kept here, never returned — responses carry
 * `has_*` only (FR-19.04, SC-19.3). An empty token in a PATCH keeps the stored one; `null`
 * removes it.
 */
interface Row {
  is_tracking_enabled: boolean;
  ids: Record<(typeof TRACKING_ID_FIELDS)[number], string>;
  tokens: Record<TrackingTokenField, string | null>;
  updated_at: string | null;
}

const blankIds = () => Object.fromEntries(TRACKING_ID_FIELDS.map((f) => [f, ""])) as Row["ids"];

function seed(store: string | null): Row {
  if (isEmptyStore(store)) return { is_tracking_enabled: false, ids: blankIds(), tokens: { meta_conversions_api_token: null, tiktok_events_api_token: null }, updated_at: null };
  return {
    is_tracking_enabled: true,
    ids: { ...blankIds(), meta_pixel_id: "781240965531208", ga4_measurement_id: "G-8JX2K4LQ9P", gtm_container_id: "GTM-W7Q2KXD" },
    tokens: { meta_conversions_api_token: "EAAG-mock-capi-token-noor-0001", tiktok_events_api_token: null },
    updated_at: new Date(FIXTURE_NOW - 6 * 86_400_000).toISOString(),
  };
}

function state(store: string | null): Row {
  return storeState(store, "integrations:tracking", () => seed(store));
}

function view(r: Row): Tracking {
  return {
    is_tracking_enabled: r.is_tracking_enabled,
    ...r.ids,
    has_meta_conversions_api_token: Boolean(r.tokens.meta_conversions_api_token),
    has_tiktok_events_api_token: Boolean(r.tokens.tiktok_events_api_token),
    updated_at: r.updated_at,
  };
}

export function getTracking(store: string | null): Tracking {
  return view(state(store));
}

export function patchTracking(store: string | null, body: Record<string, unknown>): MockResult<Tracking> {
  const r = state(store);
  const errors: Record<string, string[]> = {};
  const nextIds = { ...r.ids };
  for (const f of TRACKING_ID_FIELDS) {
    if (!(f in body)) continue;
    const v = String(body[f] ?? "").trim();
    if (v.length > 64) errors[f] = ["64 حرفاً كحد أقصى."];
    else if (/\s|<|>|"/.test(v)) errors[f] = ["المعرّف لا يحتوي مسافات أو رموز HTML."];
    else nextIds[f] = v;
  }
  const nextTokens = { ...r.tokens };
  for (const f of TRACKING_TOKEN_FIELDS) {
    if (!(f in body)) continue;
    const v = body[f];
    if (v === null) nextTokens[f] = null;
    else if (typeof v === "string" && v.trim()) {
      if (v.trim().length < 10) errors[f] = ["الرمز أقصر من المعتاد — انسخه كاملاً من مدير الأعمال."];
      else nextTokens[f] = v.trim();
    }
  }
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  if ("is_tracking_enabled" in body) r.is_tracking_enabled = Boolean(body.is_tracking_enabled);
  r.ids = nextIds;
  r.tokens = nextTokens;
  r.updated_at = new Date().toISOString();
  return { ok: true, data: view(r) };
}
