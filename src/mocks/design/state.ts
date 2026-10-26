import type { MockResult } from "@/lib/bff/mock-route";
import { isHex } from "@/lib/color";
import type { StoreSection } from "@/lib/schemas/store-config";
import {
  DESIGN_STYLES,
  STORE_FONTS,
  THEME_PRESETS,
  isPresetKey,
} from "@/features/storefront/theme/presets";
import { catalog } from "@/mocks/catalog/state";
import { isEmptyStore } from "@/mocks/empty-store";
import { settingsOverlay } from "@/mocks/settings/overlay";
import { nextId, storeState } from "@/mocks/store-state";
import { deriveBrandShades } from "@/mocks/storefront/theme";
import { tenantFixture } from "@/mocks/tenant/config";

/**
 * M08 theme customizer mocks (T099) — Django serves the same rows since INT-018
 * (`api/views_design.py`, `liveOrMock` module `design`).
 *
 * - `store/theme` and `store/announcement` are `[NEEDS BACKEND]` (M08 §7): Django has only the
 *   HTML `StorefrontDesignForm` / `AnnouncementBarForm`. The announcement half writes the SAME
 *   settings row M34 edits (`patchAnnouncement`), so both screens stay in step.
 * - `admin/sections` is Ready upstream (with the `IsAdminUser` auth caveat), mocked here with
 *   the same contract until the owner session is accepted there.
 *
 * Publishing writes the theme fields and the full `sections[]` into the settings overlay that
 * `tenantFixture()` merges into `/api/v1/config/`, so the published storefront changes on its
 * next render (the cached storefront reads are dropped by `mockRoute` on every write).
 */
type Body = Record<string, unknown>;

export const SINGLETON_TYPES = ["hero", "category_strip", "featured_products", "latest_products", "promotional_offers"] as const;
export const ADDABLE_TYPES = ["slider", "banner_grid", "product_grid"] as const;
const ALL_TYPES = [...SINGLETON_TYPES, ...ADDABLE_TYPES] as const;
const ALLOWED_IMAGE = /^(data:image\/(jpe?g|png|webp|gif);base64,|https?:\/\/|\/)/;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ITEMS_MAX = 12;

export interface ThemeEntity {
  theme_preset: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  card_border_color: string;
  heading_font: string;
  body_font: string;
  design_style: string;
  theme_choice: string;
  logo: string | null;
  brand_shades: Record<string, string>;
  version: number;
  updated_at: string;
}

const THEME_KEYS = [
  "theme_preset",
  "primary_color",
  "secondary_color",
  "background_color",
  "text_color",
  "card_border_color",
  "heading_font",
  "body_font",
  "design_style",
] as const;
const COLOR_KEYS = ["primary_color", "secondary_color", "background_color", "text_color", "card_border_color"] as const;

function themeState(store: string | null): ThemeEntity {
  return storeState<ThemeEntity>(store, "design:theme", () => {
    const cfg = tenantFixture(store)?.config;
    const p = THEME_PRESETS[0]!;
    return {
      theme_preset: cfg?.theme_preset ?? p.key,
      primary_color: cfg?.primary_color ?? p.primary_color,
      secondary_color: cfg?.secondary_color ?? p.secondary_color,
      background_color: cfg?.background_color ?? p.background_color,
      text_color: cfg?.text_color ?? p.text_color,
      card_border_color: cfg?.card_border_color ?? p.card_border_color,
      heading_font: cfg?.heading_font ?? p.heading_font,
      body_font: cfg?.body_font ?? p.body_font,
      design_style: cfg?.design_style ?? p.design_style,
      theme_choice: cfg?.theme_choice ?? "default",
      logo: cfg?.logo ?? null,
      brand_shades: cfg?.brand_shades && Object.keys(cfg.brand_shades).length ? cfg.brand_shades : deriveBrandShades(cfg?.primary_color ?? p.primary_color),
      version: 1,
      updated_at: new Date(Date.UTC(2026, 9, 12, 8, 0)).toISOString(),
    };
  });
}

function sectionsState(store: string | null): { rows: StoreSection[] } {
  return storeState(store, "design:sections", () => {
    const cfg = tenantFixture(store)?.config;
    const rows = isEmptyStore(store) ? [] : (cfg?.sections ?? []);
    return { rows: rows.map((r) => structuredClone(r)) };
  });
}

/** Write what `/api/v1/config/` returns for this store (the published identity + sections). */
function publishToConfig(store: string | null) {
  const overlay = settingsOverlay(store) as Record<string, unknown>;
  const t = themeState(store);
  for (const k of THEME_KEYS) overlay[k] = t[k];
  overlay.brand_shades = t.brand_shades;
  overlay.logo = t.logo;
  overlay.sections = sectionsState(store).rows.map((r) => structuredClone(r));
}

// ── Theme ──────────────────────────────────────────────────────────────────────────
export function readTheme(store: string | null): ThemeEntity {
  return { ...themeState(store) };
}

export function listPresets() {
  return THEME_PRESETS.map((p) => ({
    code: p.key,
    name: p.name,
    description: p.description,
    tokens: {
      primary_color: p.primary_color,
      secondary_color: p.secondary_color,
      background_color: p.background_color,
      text_color: p.text_color,
      card_border_color: p.card_border_color,
    },
    heading_font: p.heading_font,
    body_font: p.body_font,
    design_style: p.design_style,
  }));
}

/** `PATCH store/theme` — JSON fields + an optional `logo` data URL (multipart decoded by the route). */
export function patchTheme(store: string | null, body: Body, opts: { conflict?: boolean } = {}): MockResult<ThemeEntity> {
  const t = themeState(store);
  if (opts.conflict || (body.version !== undefined && Number(body.version) !== t.version)) {
    return {
      ok: false,
      status: 409,
      body: { detail: "حُدِّث الثيم من جلسة أخرى. أعد التحميل لترى آخر نسخة منشورة.", current_version: t.version + (opts.conflict ? 1 : 0) },
    };
  }
  const e: Record<string, string[]> = {};
  const patch: Partial<ThemeEntity> = {};
  if ("theme_preset" in body) {
    const v = String(body.theme_preset ?? "");
    if (v !== "custom" && !isPresetKey(v)) e.theme_preset = ["قالب غير معروف."];
    else patch.theme_preset = v;
  }
  for (const k of COLOR_KEYS) {
    if (!(k in body)) continue;
    const v = String(body[k] ?? "");
    if (!isHex(v) || !/^#[0-9a-fA-F]{6}$/.test(v)) e[k] = ["لون بصيغة #RRGGBB."];
    else patch[k] = v.toUpperCase();
  }
  for (const k of ["heading_font", "body_font"] as const) {
    if (!(k in body)) continue;
    const v = String(body[k] ?? "");
    if (!(STORE_FONTS as readonly string[]).includes(v)) e[k] = ["اختر خطاً من القائمة."];
    else patch[k] = v;
  }
  if ("design_style" in body) {
    const v = String(body.design_style ?? "");
    if (!(DESIGN_STYLES as readonly string[]).includes(v)) e.design_style = ["نمط تصميم غير معروف."];
    else patch.design_style = v;
  }
  if ("logo" in body) {
    const v = body.logo;
    if (v === null || v === "") patch.logo = null;
    else if (typeof v !== "string" || !ALLOWED_IMAGE.test(v)) e.logo = ["الصيغ المسموحة: jpg, jpeg, png, webp, gif"];
    else if (v.startsWith("data:") && Math.floor((v.length - v.indexOf(",") - 1) * 0.75) > MAX_IMAGE_BYTES) e.logo = ["حجم الشعار 5MB على الأكثر."];
    else patch.logo = v;
  }
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  Object.assign(t, patch);
  // Django derives the 50..900 ramp from primary_color on save (M08 §5).
  t.brand_shades = deriveBrandShades(t.primary_color);
  t.version += 1;
  t.updated_at = new Date().toISOString();
  publishToConfig(store);
  return { ok: true, data: { ...t } };
}

// ── Sections ───────────────────────────────────────────────────────────────────────
export function listSections(store: string | null): StoreSection[] {
  return [...sectionsState(store).rows].sort((a, b) => a.order - b.order).map((r) => structuredClone(r));
}

const isSingleton = (t: string) => (SINGLETON_TYPES as readonly string[]).includes(t);

function validateSection(store: string | null, type: string, body: Body): Record<string, string[]> {
  const e: Record<string, string[]> = {};
  const settings = (body.settings ?? {}) as Body;
  const content = (body.content_data ?? {}) as Body;
  if ("label" in body && String(body.label ?? "").length > 80) e.label = ["80 حرفاً على الأكثر."];
  if (settings && typeof settings !== "object") e.settings = ["قيمة غير صالحة."];
  const limit = content.limit ?? settings.limit;
  if (limit !== undefined && limit !== null && (!Number.isInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 50)) e.limit = ["العدد من 1 إلى 50."];
  if (type === "product_grid") {
    const id = Number(content.category_id);
    if (!content.category_id) e.category_id = ["اختر تصنيفاً."];
    else if (!catalog(store).categories.some((c) => c.id === id)) e.category_id = ["تصنيف محذوف — اختر آخر."];
  }
  if (type === "slider" || type === "banner_grid") {
    const items = Array.isArray(content.items) ? (content.items as Body[]) : [];
    if (items.length === 0) e.items = ["أضف عنصراً واحداً على الأقل."];
    if (items.length > ITEMS_MAX) e.items = [`${ITEMS_MAX} عنصراً على الأكثر.`];
    items.forEach((it, i) => {
      const img = it.image;
      if (img && (typeof img !== "string" || !ALLOWED_IMAGE.test(img))) e[`items.${i}.image`] = ["الصيغ المسموحة: jpg, jpeg, png, webp, gif"];
      if (!String(it.title ?? "").trim() && !img) e[`items.${i}.title`] = ["أدخل عنواناً أو صورة."];
      const link = String(it.link ?? "");
      if (link && !/^(\/|https?:\/\/)/.test(link)) e[`items.${i}.link`] = ["الرابط يبدأ بـ / أو https://"];
    });
  }
  if (type === "hero") {
    const link = String(content.link ?? "");
    if (link && !/^(\/|https?:\/\/)/.test(link)) e.link = ["الرابط يبدأ بـ / أو https://"];
  }
  return e;
}

export function createSection(store: string | null, body: Body): MockResult<StoreSection> {
  const type = String(body.section_type ?? "");
  if (!(ALL_TYPES as readonly string[]).includes(type)) return { ok: false, status: 400, body: { section_type: ["نوع قسم غير معروف."] } };
  const state = sectionsState(store);
  if (isSingleton(type) && state.rows.some((r) => r.section_type === type)) {
    return { ok: false, status: 400, body: { section_type: ["قسم مفرد موجود مسبقاً."] } };
  }
  const e = validateSection(store, type, body);
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  const row: StoreSection = {
    id: nextId(store, "design-section", 100),
    section_type: type as StoreSection["section_type"],
    label: String(body.label ?? ""),
    order: Number.isInteger(body.order) ? Number(body.order) : state.rows.reduce((m, r) => Math.max(m, r.order), 0) + 1,
    is_active: body.is_active !== false,
    settings: (body.settings as Record<string, unknown>) ?? {},
    content_data: (body.content_data as Record<string, unknown>) ?? {},
  };
  state.rows.push(row);
  publishToConfig(store);
  return { ok: true, data: structuredClone(row), status: 201 };
}

export function updateSection(store: string | null, id: number, body: Body): MockResult<StoreSection> {
  const row = sectionsState(store).rows.find((r) => r.id === id);
  if (!row) return { ok: false, status: 404, body: { detail: "القسم غير موجود." } };
  if ("section_type" in body && body.section_type !== row.section_type) return { ok: false, status: 400, body: { section_type: ["لا يمكن تغيير نوع القسم."] } };
  const merged = {
    label: "label" in body ? body.label : row.label,
    settings: "settings" in body ? body.settings : row.settings,
    content_data: "content_data" in body ? body.content_data : row.content_data,
  };
  const e = validateSection(store, row.section_type, merged);
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  if ("label" in body) row.label = String(body.label ?? "");
  if ("is_active" in body) row.is_active = body.is_active === true;
  if ("order" in body && Number.isInteger(body.order)) row.order = Number(body.order);
  if ("settings" in body) row.settings = (body.settings as Record<string, unknown>) ?? {};
  if ("content_data" in body) row.content_data = (body.content_data as Record<string, unknown>) ?? {};
  publishToConfig(store);
  return { ok: true, data: structuredClone(row) };
}

export function deleteSection(store: string | null, id: number): MockResult<null> {
  const state = sectionsState(store);
  const row = state.rows.find((r) => r.id === id);
  if (!row) return { ok: false, status: 404, body: { detail: "القسم غير موجود." } };
  if (isSingleton(row.section_type)) return { ok: false, status: 400, body: { detail: "قسم مفرد لا يُحذف — عطّله بدلاً من حذفه." } };
  state.rows = state.rows.filter((r) => r.id !== id);
  publishToConfig(store);
  return { ok: true, data: null, status: 200 };
}

/** `POST admin/sections/reorder/ {ordered_ids}` → `{ok, reordered}` — every id, in full order (FR-08.05). */
export function reorderSections(store: string | null, body: Body): MockResult<{ ok: true; reordered: number }> {
  const ids = Array.isArray(body.ordered_ids) ? body.ordered_ids.map(Number) : null;
  const state = sectionsState(store);
  if (!ids || ids.some((n) => !Number.isInteger(n))) return { ok: false, status: 400, body: { ordered_ids: ["قائمة معرّفات غير صالحة."] } };
  const known = new Set(state.rows.map((r) => r.id));
  if (ids.length !== known.size || new Set(ids).size !== ids.length || ids.some((n) => !known.has(n))) {
    return { ok: false, status: 400, body: { ordered_ids: ["أرسل كل معرّفات الأقسام بترتيبها الكامل."] } };
  }
  ids.forEach((id, i) => {
    const row = state.rows.find((r) => r.id === id)!;
    row.order = i + 1;
  });
  publishToConfig(store);
  return { ok: true, data: { ok: true, reordered: ids.length } };
}
