# Store config API — `/api/v1/config/` (إعدادات المتجر العامة)

> **Source**: DOC-050 · INT-002 (M47), INT-010 (M34), INT-018 (M08), INT-019 (M13), INT-023 (M19) · inventory Domain 1 / 12
> **Live key**: *Django-first, no switch* — read server-side by `getStoreConfig()` and `probeStore()`; fixtures only on `404`/`405`/`501` or Django down with `SHARWA_MOCKS=on` ([`bff.md#django-first`](../../overview/bff.md#django-first))
> **Django provider**: `sharwa_saas/api/views.py` (`StoreConfigView`) · `api/serializers.py` (`StoreConfigSerializer`, `StoreSectionSerializer`) · `products/services/integrations_service.py` (`public_tracking`) · `products/services/design_service.py` (theme and section rules) · `api/views_settings.py` (`settings_feature_enabled`) · model `StoreSetting`, `StoreSection`
> **Frontend contract**: `sharwa-frontend/src/lib/schemas/store-config.ts` (`storeConfigSchema`) · fetchers `src/features/storefront/api/config.ts`, `src/features/tenant/api/probe.ts` · fixtures `src/mocks/tenant/config.ts`, `src/mocks/storefront/config.ts` · Next-owned consumers `src/app/(storefront)/%5Fs/[store]/{manifest.webmanifest/route.ts, icon/route.tsx, sw.js/route.ts}`
> **Tests**: `sharwa_saas/api/test_tenant_guard_api.py` (probe contract, 9 required fields); other tests of the extension fields live with their modules (settings, design, integrations)
> **Last verified against code**: 2026-10-27 (step 06)

## 1. Overview

`GET /api/v1/config/` is the single public description of a store: its name, brand colours and fonts, logo, announcement bar, home-page sections, contact and social links, SEO tags, currency, free-shipping threshold, time settings, and its public tracking ids. The storefront renders every page from it, the browser takes the store's colour from it, and the PWA manifest and icons are generated from it.

It is **public** — no login, no CSRF — but it needs a store: the host (or `X-Store-Domain`) must resolve to a ready store, otherwise the guard answers first ([`m47-tenant-guard.md`](m47-tenant-guard.md)). Only fields that are safe to show a customer are in it: no secrets, no merchant money, no CAPI tokens.

The payload grew in layers. The first layer was already live (INT-002); each integration then added the fields that had been `[NEEDS BACKEND]` in `store-config.ts`. §4.2 lists every field with the module that owns it.

## 2. Access — gate chain

| # | Gate | Requirement | Failure |
|---|---|---|---|
| 1 | Tenant | host or `X-Store-Domain` resolves to an active, provisioned store | `404` / `403` / `503` from the middlewares — [`m47-tenant-guard.md`](m47-tenant-guard.md) |
| 2 | Tenant context | `HasTenantContext`: the connection is not on the public schema | `403` «لم يتم تحديد المتجر المطلوب. استخدم النطاق الفرعي للمتجر أو أرسل ترويسة X-Store-Domain.» |
| 3 | Session / CSRF / permission key / plan feature | none (the `tracking` block checks the plan feature `tracking_tools` itself) | — |

## 3. Endpoint summary

| Method | Django path | BFF path | Purpose |
|---|---|---|---|
| `GET` · `HEAD` | `/api/v1/config/` | none — server fetchers; the same-origin passthrough serves `HEAD` | the store's public config |
| `GET` | — (Next route) | `/manifest.webmanifest` on the store host | PWA manifest built from the config |
| `GET` | — (Next route) | `/icon?size=192\|512[&maskable=1]` | generated app icon |
| `GET` | — (Next route) | `/sw.js` | store service worker |

## 4. The config payload

### 4.1 `GET /api/v1/config/`

**Query parameters**: none.

**Response `200`** (abbreviated; `…` is a long value)

```json
{
  "store_name": "متجر نور",
  "primary_color": "#…", "secondary_color": "#…", "background_color": "#…", "text_color": "#…",
  "heading_font": "…", "body_font": "…",
  "design_style": "fluid", "theme_preset": "luxury_boutique", "theme_choice": "default",
  "brand_shades": { "50": "#…", "500": "#…", "900": "#…" },
  "logo": null,
  "whatsapp_number": "967770000011",
  "announcement_text": "توصيل مجاني للطلبات فوق 300 ر.س",
  "enable_announcement_bar": true,
  "sections": [
    { "id": 1, "section_type": "hero", "label": "…", "order": 0, "is_active": true,
      "settings": {}, "content_data": {} }
  ],
  "currency": "SAR",
  "free_shipping_threshold": "300.00",
  "timezone": "Asia/Aden",
  "week_start_day": "sunday",
  "tracking": null
}
```

The store name, announcement and WhatsApp number are those of the front-end fixture `noor` (`src/mocks/tenant/config.ts`). A real response carries all the fields of §4.2; the Zod schema keeps the extension fields optional so an older Django still passes.

**Errors**: see the gate chain. The body of a `200` that fails `storeConfigSchema` is treated as "store not found" by the probe and as a thrown `StorefrontUnavailableError` by `getStoreConfig`.

### 4.2 Every field and its owner

"Owner" is the integration task that put the field in the contract. Types are the Zod types; `?` = optional in the schema, `null` = may be null.

| Field | Type | Owner | Source / meaning |
|---|---|---|---|
| `store_name` | string | INT-002 (M47) | `StoreSetting.store_name` |
| `primary_color` · `secondary_color` · `background_color` · `text_color` | string (`#RRGGBB`) | INT-002 | theme colours; the editor accepts only six-digit hex |
| `heading_font` · `body_font` | string | INT-002 | Google font codes |
| `design_style` | string | INT-002 | `fluid` · `aurora_glass` · `neo_brutalism` · `cinematic_silk` · `clay_zen` (the values the theme editor accepts) |
| `theme_preset` | string | INT-002 | preset key, or `custom` |
| `brand_shades` | record string→string, default `{}` | INT-002 | full tint ramp derived from the primary colour |
| `theme_choice` | string, default `"default"` | INT-002 | |
| `logo` | string \| null | INT-002 | **absolute** URL built from the request, `null` without a logo |
| `whatsapp_number` | string \| null | INT-002 | store contact number |
| `announcement_text` | string \| null | INT-002 | |
| `enable_announcement_bar` | boolean, default `false` | INT-002 | |
| `sections[]` | array | INT-002 / **INT-018** | see §4.3 |
| `card_border_color` | string? | **INT-010 (M34)** | card border colour |
| `announcement_bg_color` · `announcement_text_color` | string? | INT-010 | bar colours |
| `announcement_scroll_speed` | `slow` \| `medium` \| `fast`? | INT-010 | |
| `show_banner_on_home` · `show_banner_on_products` · `show_banner_on_product_detail` · `show_banner_on_checkout` | boolean? | INT-010 | where the announcement banner shows |
| `free_shipping_threshold` | string \| null | INT-010 | `"%.2f"` of the stored value (`"0.00"` = disabled), `null` when unset. An amount in the **store currency** (`currency` of this payload), as raw decimal text. Django converts it into the cart currency before comparing it with the subtotal (`pricing.build_order_invoice`); see [`../05-storefront/m09-storefront-home-catalog.md#free-shipping-threshold`](../05-storefront/m09-storefront-home-catalog.md#free-shipping-threshold). Corrected in step 12: this row used to say «new Yemeni rial», which repeated an outdated code comment |
| `currency` | `SAR` \| `USD` \| `YER_NEW` \| `YER_OLD`? | INT-010 | store base currency |
| `seo_title` · `seo_description` · `seo_keywords` | string \| null | INT-010 | |
| `seo_og_image` | string \| null | INT-010 | **absolute** URL, `null` when none |
| `contact_email` | string \| null | INT-010 | |
| `facebook_link` · `instagram_link` · `tiktok_link` · `snapchat_link` | string \| null | INT-010 | footer social links |
| `about_us` · `return_policy` | string \| null | INT-010 | policy texts |
| `timezone` | string? | INT-010 | IANA name, e.g. `Asia/Aden` |
| `week_start_day` | `sunday` \| `monday`? | INT-010 | |
| `tracking` | object \| null | **INT-023 (M19)** | see §4.4 |
| `gifting_enabled` · `loyalty_enabled` | boolean? | INT-019 (M13) | **not emitted by Django** — see the discrepancy below |

Counts: the serializer emits 39 fields (16 base + 23 from INT-010) and the view adds `tracking`, 40 in all.

> ⚠️ Discrepancy — roadmap says INT-019 (M13) added `gifting` and `loyalty` to the config / code: `gifting_enabled` and `loyalty_enabled` exist in the Zod schema (`store-config.ts` lines 85–86) and the storefront layout reads them (`config.gifting_enabled ?? false`), but **no Django code emits them**: they are absent from `StoreConfigSerializer.Meta.fields` and `StoreConfigView` adds only `tracking`. With Django live both flags are therefore always `false` on the storefront (gift option and loyalty UI never shown) until a provider is added. Decision needed.

### 4.3 `sections[]`

Source: `StoreSection.get_or_seed_defaults(store_setting).filter(is_active=True)`, serialised with `StoreSectionSerializer`. This is the same single source of truth the theme editor (M08) and the legacy storefront use, so the store always has its default sections even if nobody edited them.

| Field | Type | Meaning |
|---|---|---|
| `id` | integer | |
| `section_type` | enum | the frontend accepts `hero` · `category_strip` · `featured_products` · `latest_products` · `slider` · `banner_grid` · `product_grid` · `promotional_offers` |
| `label` | string | the custom name from the M08 editor if set, **otherwise the display name of the section type** (INT-018) — never empty |
| `order` | integer | display order (managed by create and reorder, not by the payload) |
| `is_active` | boolean | always `true` here — inactive sections are filtered out |
| `settings` | object | per-type display options |
| `content_data` | object | per-type content (images, links, items) |

An unknown `section_type` (a newer Django) is dropped by the Zod transform with a `console.warn`; one bad section never fails the whole config or 404s the store.

### 4.4 `tracking` (INT-023 · M19)

`public_tracking(request, settings_feature_enabled)` returns:

- `null` when the plan lacks the feature `tracking_tools`, when tracking is switched off for the store (`is_tracking_enabled = false`), when no id is filled, or when reading the settings raises (logged);
- otherwise an object with **only the filled public ids** among `meta_pixel_id`, `tiktok_pixel_id`, `snapchat_pixel_id`, `gtm_container_id`, `ga4_measurement_id`, `google_ads_conversion_id`, `google_ads_conversion_label`.

Conversion-API tokens (`meta_conversions_api_token`, `tiktok_events_api_token`) never appear.

### 4.5 Caching

| Layer | Behaviour |
|---|---|
| `getStoreConfig(store, storeHost)` | `"use cache"`, `cacheLife("minutes")`, `cacheTag("store:<store>")`. The store is an explicit argument so two stores can never share an entry. Failures **throw** and are not cached |
| `probeStore()` | uncached, always asks Django (status authority) |
| Dashboard writes | a successful write from a store host calls `revalidateTag(storeTag(store), {expire: 0})`, so a settings or theme change shows at once |
| Service worker | `/api/v1/config/` is **network only** — never cached |

## 5. Next-owned consumers (research R-16)

These three routes live in Next, not Django. They have no Django row; the manifest and icon read the config, the worker does not.

| Route | Built from | Output |
|---|---|---|
| `/manifest.webmanifest` | `getStoreConfig` → `store_name`, `seo_description`, colours through `buildStoreTheme` (an invalid colour falls back like the page does) | JSON `application/manifest+json`, `cache-control: no-cache`: `name`, `short_name` (`shortName(store_name)`), `description`, `start_url: "/"`, `scope: "/"`, `id: "/"`, `display: "standalone"`, `dir: "rtl"`, `lang: "ar"`, `background_color`, `theme_color`, and three icons (`/icon?size=192`, `/icon?size=512`, `/icon?size=512&maskable=1`). Scope is the **current origin**, so a custom domain gets its own scope |
| `/icon` | `getStoreConfig` → `logo`, `store_name`, colours | PNG, `size=192` or `512` (default 512), `maskable=1` keeps the content in the 60 % safe zone (78 % otherwise). With a logo: the logo centred on the store background. Without: the first letter of the name (a leading «متجر » is stripped) in the store's text colour. A logo served by Django itself (same origin as the upstream, or a private host) is fetched server-side — only `/media/` paths, 3 s timeout, 2 MB cap, `png`/`jpeg`/`gif`/`svg` — and inlined as a data URL because Satori refuses private addresses; other formats fall back to the letter. `cache-control: public, max-age=3600` |
| `/sw.js` | the store host only (no config call) | JavaScript, `cache-control: no-cache, no-store, must-revalidate`, `service-worker-allowed: /`. Policy: `/api/v1/cart*`, `/api/v1/config/` and every `/api/bff/*` → network only; other `/api/v1/*` `GET` → network first with the last answer as offline fallback; images and fonts → cache first; pages → network, with the precached `/offline` page when offline. No page with personal data is stored. Cache names carry the host and the release, so two stores never share a cache; a new worker waits until the page tells it to |

## 6. Gaps closed, bugs fixed and migrations

- **INT-010**: the 23 extension fields moved from `[NEEDS BACKEND]` to `StoreConfigSerializer`. The serializer comment states they are all public, customer-visible `StoreSetting` fields — no secrets and no merchant money.
- **INT-018**: `StoreSection.label` is returned, falling back to the section-type display name, so the editor's custom names reach the storefront.
- **INT-023**: `tracking` added (ids only, `null` when off or outside the plan).
- **2026-10-20 fix** (session read from the wrong schema) is described in [`m47-tenant-guard.md`](m47-tenant-guard.md#5-gaps-closed-bugs-fixed-and-migrations).

## 7. Open items and legacy-only behaviour

- `gifting_enabled` and `loyalty_enabled` — the discrepancy in §4.2.
- The Zod enum for `section_type` has eight values; the Django model defines the full list through `StoreSection.LEGACY_SINGLETON_TYPES` and `ADDABLE_TYPES`. A type added in Django but not in the schema is dropped silently on the storefront.

## 8. Related pages

- [`m47-tenant-guard.md`](m47-tenant-guard.md) — what happens before the config view
- [`m01-landing.md`](m01-landing.md) — the platform-level public routes
- [`../../overview/bff.md#django-first`](../../overview/bff.md#django-first) — fetcher rules
- [`../../overview/conventions.md`](../../overview/conventions.md) — money display strings, absolute media URLs
