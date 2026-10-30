# Theme Customizer API — M08 (مخصِّص ثيم المتجر)

> **Source**: DOC-138 → DOC-140 (Step 21) · INT-018 (M08), INT-010 · inventory Domain 7 + A.7 + A.10
> **Live key**: `design` (`SHARWA_LIVE_MODULES`) — **6 BFF rows**, all `liveOrMock(request, "design", …)`: `store/theme` (GET, PATCH), `store/theme/presets`, `store/announcement` (GET, PATCH), `admin/sections` (GET, POST), `admin/sections/[id]` (PATCH, DELETE), `admin/sections/reorder` (POST). Multipart bodies are forwarded as they are (the BFF buffers the body as an `ArrayBuffer`, see [`architecture/22-live-module-keys.md`](../../../architecture/22-live-module-keys.md)).
> **Django provider**: `sharwa_saas/api/views_design.py` (`DesignAPIMixin`, 6 views) · `sharwa_saas/products/services/design_service.py` (theme, presets, announcement delegate, sections) · `products/theme_presets.py` (9 presets) · `products/services/settings_service.py` (`patch_announcement`, shared with M34) · migration `products/migrations/0219_theme_version_section_label.py`
> **Frontend contract**: `sharwa-frontend/src/features/design/schemas.ts` (`themeSchema`, `presetSchema`, `announcementSchema`, `adminSectionSchema`, `reorderResultSchema`, per-type content schemas) · hooks `src/features/design/api.ts` · fixture `src/mocks/design/state.ts` · BFF `src/app/api/bff/store/{theme,theme/presets,announcement}/route.ts` and `src/app/api/bff/admin/sections/**`
> **Tests**: `sharwa_saas/api/test_design_api.py` (**7** tests: `test_auth`, `test_theme_read_patch_and_conflict`, `test_logo_multipart_data_url_and_clear`, `test_presets`, `test_announcement`, `test_sections_seed_create_update_delete`, `test_reorder`)
> **Last verified against code**: 2026-10-27 (step 21)

<a id="overview"></a>

## 1. Overview

M08 is the merchant's **storefront design studio**: brand identity (logo, five colours, two fonts, a design style), nine ready-made presets, the announcement bar, and the **sections** of the storefront home page. Before INT-018 the merchant only had the HTML screen «تصميم المتجر» (`StorefrontDesignForm` + `AnnouncementBarForm`), and `admin/sections` sat behind `IsAdminUser` (platform superuser only).

| Surface | Method | Django path (`/api/v1/…`) | BFF path (`/api/bff/…`) | Section |
|---|---|---|---|---|
| Theme | `GET` · `PATCH` | `store/theme/` | `store/theme` | [§4.1](#theme) |
| Presets | `GET` | `store/theme/presets/` | `store/theme/presets` | [§4.2](#presets-announcement) |
| Announcement bar | `GET` · `PATCH` | `store/announcement/` | `store/announcement` | [§4.2](#presets-announcement) |
| Sections | `GET` · `POST` | `admin/sections/` | `admin/sections` | [§4.3](#sections) |
| Section | `PATCH` · `DELETE` | `admin/sections/<pk>/` | `admin/sections/[id]` | [§4.3](#sections) |
| Reorder | `POST` | `admin/sections/reorder/` | `admin/sections/reorder` | [§4.3](#sections) |

**Rules that hold everywhere**

- **Owner only.** There is no permission key for «تصميم المتجر» among the 35 keys (M08 §2); a staff session is always refused. The single exception is the presets list ([§2](#access)).
- Colours are stored as `#RRGGBB` upper-case; fonts come from `GOOGLE_FONT_CHOICES`; the design style is one of five codes ([§4.1](#theme)).
- Images are never stored as base64 inside JSON: a data URL is decoded and saved to tenant storage, and the row keeps an absolute URL.
- Validation errors have the shape `{field: [message]}` (DRF-style) and are returned before any write.
- Server messages are Arabic and quoted verbatim in «…» on this page.

<a id="access"></a>

## 2. Access

`DesignAPIMixin.owner_gate` is evaluated in this order; the first failing gate answers.

| # | Gate | Requirement | Failure |
|---|---|---|---|
| 1 | CSRF / tenant / session | `ProductsAPIMixin.gate(request)` — session authentication with CSRF on unsafe methods, `HasTenantContext`, owner or staff session | `403` (CSRF) · tenant-guard answer · `401` `{"detail": "انتهت جلستك، سجّل الدخول مجدداً."}` |
| 2 | **Owner only** | `resolve_request_staff(request)` is `None` (an owner session, not a staff member) | `403` `{"detail": "تصميم المتجر مقصور على مالك المتجر."}` |
| 3 | **Plan feature** | `settings_feature_enabled(request, code)` | `403` `{"detail": "هذه الميزة غير متاحة في باقتك الحالية"}` (no final full stop) |

| Plan feature | Routes |
|---|---|
| `storefront_design` | `store/theme/`, `admin/sections/`, `admin/sections/<pk>/`, `admin/sections/reorder/` |
| `coupon` | `store/announcement/` (the same code M34 uses for the bar) |

`GET store/theme/presets/` calls **only `self.gate`** (gate 1): any signed-in owner **or staff** session reads the list, with no ownership check and no plan feature.

> ⚠️ Discrepancy — roadmap says (DOC-138/139) the design area is "owner-only" with plan feature `storefront_design` / `coupon`, without exception / code does: `store/theme/presets/` answers any signed-in session (owner or staff) and ignores the plan feature. The presets are static platform data (`products/theme_presets.py`), so nothing tenant-specific leaks, but the gate matrix is not uniform.

`test_auth` covers: no session ⇒ `401`; staff ⇒ `403` with the owner-only sentence; feature off ⇒ `403` with the plan sentence.

<a id="summary"></a>

## 3. Endpoint summary

| # | Method | Django path | Purpose | Gate | Success | Section |
|---|---|---|---|---|---|---|
| 1 | `GET` | `store/theme/` | read the identity row (14 keys) | owner + `storefront_design` | `200` | [§4.1](#theme) |
| 2 | `PATCH` | `store/theme/` | save identity, optimistic lock `version` | owner + `storefront_design` | `200` full row | [§4.1](#theme) |
| 3 | `GET` | `store/theme/presets/` | the nine presets | session only | `200` array | [§4.2](#presets-announcement) |
| 4 | `GET` | `store/announcement/` | the nine announcement fields | owner + `coupon` | `200` | [§4.2](#presets-announcement) |
| 5 | `PATCH` | `store/announcement/` | save the bar (shared validation with M34) | owner + `coupon` | `200` | [§4.2](#presets-announcement) |
| 6 | `GET` | `admin/sections/` | all sections ordered; defaults seeded on first read | owner + `storefront_design` | `200` array | [§4.3](#sections) |
| 7 | `POST` | `admin/sections/` | create a section | owner + `storefront_design` | `201` | [§4.3](#sections) |
| 8 | `PATCH` | `admin/sections/<pk>/` | edit a section | owner + `storefront_design` | `200` | [§4.3](#sections) |
| 9 | `DELETE` | `admin/sections/<pk>/` | delete an addable section | owner + `storefront_design` | `204` | [§4.3](#sections) |
| 10 | `POST` | `admin/sections/reorder/` | full order `{ordered_ids}` | owner + `storefront_design` | `200` `{ok, reordered}` | [§4.3](#sections) |

<a id="theme"></a>

## 4. Endpoint groups

### 4.1 Theme — `GET|PATCH /api/v1/store/theme/` (DOC-138)

**Before.** The HTML screen «تصميم المتجر» (`StorefrontDesignForm`) wrote the same `StoreSetting` columns; the Next dashboard had no API for them.

**Parsers.** `JSONParser`, `MultiPartParser`, `FormParser` — a logo may be uploaded as a file or sent as a data URL. The BFF forwards the multipart body untouched.

**Response (GET, and the body of every successful PATCH)** — 14 keys (`read_theme`):

| Key | Type | Note |
|---|---|---|
| `theme_preset` | string | a preset code or `custom` (an empty column reads as `custom`) |
| `primary_color`, `secondary_color`, `background_color`, `text_color`, `card_border_color` | string | `#RRGGBB` |
| `heading_font`, `body_font` | string | a name from `GOOGLE_FONT_CHOICES` |
| `design_style` | string | `fluid` (default when empty) · `aurora_glass` · `neo_brutalism` · `cinematic_silk` · `clay_zen` |
| `theme_choice` | string | `default` when empty — **read-only** here |
| `logo` | string \| null | absolute URL (`request.build_absolute_uri`) or `null` |
| `brand_shades` | object | derived shades keyed by name — **read-only** here |
| `version` | integer | `StoreSetting.theme_version` (starts at `1`) |
| `updated_at` | string | `StoreSetting.theme_updated_at`, ISO 8601 |

```json
{
  "theme_preset": "modern_trust",
  "primary_color": "#4F46E5",
  "secondary_color": "#1E293B",
  "background_color": "#F8FAFC",
  "text_color": "#0F172A",
  "card_border_color": "#E2E8F0",
  "heading_font": "Tajawal",
  "body_font": "Tajawal",
  "design_style": "fluid",
  "theme_choice": "default",
  "logo": null,
  "brand_shades": {},
  "version": 1,
  "updated_at": "2026-01-01T09:00:00+00:00"
}
```

**PATCH body — every key optional (partial update).**

| Field | Rule | Error (`400`) |
|---|---|---|
| `theme_preset` | `custom` or one of the nine preset codes | `theme_preset`: «قالب غير معروف.» |
| `primary_color`, `secondary_color`, `background_color`, `text_color`, `card_border_color` | `#RRGGBB` (regex `^#[0-9a-fA-F]{6}$`); stored **upper-cased** | the key: «لون بصيغة #RRGGBB.» |
| `heading_font`, `body_font` | a value from `GOOGLE_FONT_CHOICES` | the key: «اختر خطاً من القائمة.» |
| `design_style` | one of the five codes | `design_style`: «نمط تصميم غير معروف.» |
| `logo` (file) | extension in `jpg, jpeg, png, webp, gif`; size ≤ 5 MB | `logo`: «الصيغ المسموحة: jpg, jpeg, png, webp, gif» · «حجم الشعار 5MB على الأكثر.» |
| `logo` (text) | `null` or `''` ⇒ **clear**; `data:…` ⇒ decoded and saved; any other string (an existing `https://…` URL) ⇒ **no change** | `logo`: the format / size message above when the data URL is invalid or too large |
| `version` | integer; optional | `version`: «قيمة غير صالحة.» when it is not an integer |

**Server behaviour**

- `theme_preset` is only a **label**: the server stores the code and does **not** copy the preset's tokens. The client sends the colours, fonts and style together with the preset code (picking a preset in the UI fills the draft; editing a colour afterwards sends `custom`).
- Order of checks: field validation (all errors collected) ⇒ `400`; then, inside `transaction.atomic()` with `select_for_update()` on the store settings row, the version check; then the write.
- Every successful PATCH sets `theme_version += 1` and `theme_updated_at = now`, **even when the body changes nothing**.

**Optimistic lock — the 409 flow**

1. `GET` returns `version: N`.
2. The editor sends `PATCH {…, "version": N}`.
3. If another session saved in between (`version` ≠ the row's `theme_version`) the server answers `409`:

```json
{
  "detail": "حُدِّث الثيم من جلسة أخرى. أعد التحميل لترى آخر نسخة منشورة.",
  "current_version": 4
}
```

4. The UI reloads (`GET`) and the merchant re-applies the changes. Omitting `version` (or sending `null` / `''`) **skips the lock** — the last writer wins; this is intentional for scripts.

Validation errors come **before** the version check: a stale `version` together with an invalid colour answers `400`, not `409`. The storefront cache tag is revalidated by the BFF after a successful live write (`liveOrMock`).

**Idempotency.** `PATCH` is not idempotent in `version`/`updated_at` (each call bumps them); the lock, not an `Idempotency-Key`, protects against double submits.

<a id="presets-announcement"></a>

### 4.2 Presets and announcement bar — `store/theme/presets/`, `store/announcement/` (DOC-139)

#### Presets — `GET /api/v1/store/theme/presets/`

Source of truth: `products/theme_presets.py` (`THEME_PRESETS`, constants in code, no table). Each row of the response is `{code, name, description, tokens, heading_font, body_font, design_style}` where `tokens` holds the five colours. `DEFAULT_THEME_KEY = 'modern_trust'`.

| `code` | `name` | primary | secondary | background | text | card border | heading / body font | `design_style` |
|---|---|---|---|---|---|---|---|---|
| `modern_trust` | «الأساسي» | `#4F46E5` | `#1E293B` | `#F8FAFC` | `#0F172A` | `#E2E8F0` | Tajawal / Tajawal | `fluid` |
| `luxury_boutique` | «تَرَف» | `#D4AF37` | `#1A1A1A` | `#FAFAFA` | `#27272A` | `#E8DCC0` | Amiri / Cairo | `fluid` |
| `organic_earth` | «طبيعة» | `#4A5D23` | `#D4B895` | `#F9F6F0` | `#3E3E3E` | `#E6DCC8` | Almarai / Almarai | `fluid` |
| `tech_cyber` | «نيون» | `#00F0FF` | `#7000FF` | `#09090B` | `#F4F4F5` | `#26262E` | IBM Plex Sans Arabic / IBM Plex Sans Arabic | `fluid` |
| `bold_streetwear` | «حيوية» | `#FF4500` | `#000000` | `#FFFFFF` | `#111827` | `#E5E7EB` | Rubik / Rubik | `fluid` |
| `aurora_glass` | «الزجاج المضيء» | `#00F0FF` | `#FF007A` | `#0B0F19` | `#F1F5F9` | `#FFFFFF` | Alexandria / Alexandria | `aurora_glass` |
| `neo_brutalism` | «التمرد العصري» | `#FFD700` | `#2563EB` | `#F8FAFC` | `#000000` | `#000000` | Cairo / Cairo | `neo_brutalism` |
| `cinematic_silk` | «الحرير السينمائي» | `#F3E5AB` | `#A1A1AA` | `#050505` | `#E4E4E7` | `#F3E5AB` | Amiri / Tajawal | `cinematic_silk` |
| `clay_zen` | «الزن العضوي» | `#E2725B` | `#9CAF88` | `#FDFBF7` | `#44403C` | `#E2725B` | Almarai / Almarai | `clay_zen` |

The `description` strings are Arabic sentences kept in the file (for example `modern_trust`: «إنديجو حديث وموثوق — الاختيار الآمن لأي متجر عام، وهوية شروة الافتراضية.»); read them from `products/theme_presets.py` rather than copying them here. The five colour keys and the two fonts in each row are exactly what the client copies into a draft; `card_border_color` was chosen by engineering to harmonise with each identity (it is not in the design brief).

> Note — the response row names the key `code`, the Python constant names it `key`. `list_presets()` renames it; the stored `StoreSetting.theme_preset` holds that same code.

#### Announcement bar — `GET|PATCH /api/v1/store/announcement/`

Both verbs go through `design_service.read_announcement` / `patch_announcement`, which **delegate to `settings_service`** — the same code and the same validation as M34's `PATCH settings/announcement/` (one row, one set of rules). Only the nine keys of `ANNOUNCEMENT_KEYS` are read or accepted; any other key in the body is dropped.

| Field | Type | Rule | Error (`400`) |
|---|---|---|---|
| `enable_announcement_bar` | boolean | must be a real boolean | «قيمة غير صالحة.» |
| `announcement_text` | string | ≤ 255 characters (`ANNOUNCEMENT_MAX`), trimmed; empty is stored as `NULL` | «255 حرفاً على الأكثر.» |
| `announcement_bg_color`, `announcement_text_color` | string | `#RRGGBB` | «لون بصيغة #RRGGBB.» |
| `announcement_scroll_speed` | string | `slow` · `medium` · `fast` | `announcement_scroll_speed`: «اختر سرعة.» |
| `show_banner_on_home`, `show_banner_on_products`, `show_banner_on_product_detail`, `show_banner_on_checkout` | boolean | must be a real boolean | «قيمة غير صالحة.» |

**Rule — an enabled bar needs text.** The check runs on the **merged row** (stored value overlaid with the body), whichever field changed: an enabled bar whose text is empty answers `400` with `announcement_text`: «اكتب نص الشريط قبل تفعيله، أو أوقفه.». The rule is skipped when `announcement_text` already has its own error.

> ⚠️ Discrepancy — roadmap says (DOC-139) "plan feature `coupon` as in M34" / code does: the plan feature is the same (`coupon`), but this endpoint is **owner-only** (`owner_gate`, staff ⇒ `403` «تصميم المتجر مقصور على مالك المتجر.»), whereas M34's `PATCH settings/announcement/` is also open to staff holding `catalog.manage`. Same row, same validation, **stricter caller rule** here. The settings-side gate is documented with M34 in Domain 12 (`docs/api/domains/12-settings-staff-integrations/`, a later step).

<a id="sections"></a>

### 4.3 Storefront sections — `admin/sections/`, `<pk>/`, `reorder/` (DOC-140)

**Before.** `admin/sections` was an `AdminStoreSectionViewSet` behind `IsAdminUser` (platform superuser only) and its serializer demanded an image on every item. That viewset and its router entry were **removed**; only a comment remains at `api/urls.py:54`. The routes now live in `api/views_design.py` behind the owner session.

**Row shape** (`adminSectionSchema`): `{id, section_type, label, order, is_active, settings, content_data}`.

**Types**

| Group | `section_type` | Rule |
|---|---|---|
| Singletons (`SINGLETON_TYPES`) | `hero`, `category_strip`, `featured_products`, `latest_products`, `promotional_offers` | at most one row each; cannot be deleted — only disabled |
| Addable (`ADDABLE_TYPES`) | `slider`, `banner_grid`, `product_grid` | any number |

`GET` **seeds the defaults** on the first read: `DEFAULT_ORDER` creates the five singleton rows when they do not exist, so a new store always returns at least five rows. The list is ordered by `order`.

**Endpoints**

| Verb | Path | Body | Result |
|---|---|---|---|
| `GET` | `admin/sections/` | — | `200` array of rows |
| `POST` | `admin/sections/` | `{section_type, label?, is_active?, settings?, content_data?}` | `201` the created row |
| `PATCH` | `admin/sections/<pk>/` | any of `label`, `is_active`, `settings`, `content_data` (+ `section_type` only if unchanged) | `200` the row |
| `DELETE` | `admin/sections/<pk>/` | — | `204` empty |
| `POST` | `admin/sections/reorder/` | `{ordered_ids: [int, …]}` — **every** section id, in the new order | `200` `{"ok": true, "reordered": N}` |

**Lifecycle and structural errors**

| Case | Status | Message |
|---|---|---|
| `section_type` not in the eight types | `400` | `section_type`: «نوع قسم غير معروف.» |
| creating a second singleton | `400` | «قسم مفرد موجود مسبقاً.» |
| id not found (PATCH / DELETE) | `404` | «القسم غير موجود.» |
| PATCH with another `section_type` | `400` | «لا يمكن تغيير نوع القسم.» (type is immutable) |
| DELETE of a singleton | `400` | «قسم مفرد لا يُحذف — عطّله بدلاً من حذفه.» |
| `ordered_ids` not a list of integers | `400` | «قائمة معرّفات غير صالحة.» |
| `ordered_ids` is not the complete set | `400` | «أرسل كل معرّفات الأقسام بترتيبها الكامل.» |

**Validation per type** — the rules mirror the frontend contract FR-08.06 (`sectionErrors` in `features/design/schemas.ts`) and use its error keys. All errors are collected and returned together as `{key: [message]}`.

| Applies to | Key | Rule | Message |
|---|---|---|---|
| every type | `label` | ≤ 80 characters | «80 حرفاً على الأكثر.» |
| every type | `limit` | integer 1–50, read from `content_data.limit` or `settings.limit` | «العدد من 1 إلى 50.» |
| `product_grid` | `category_id` | required and must exist | «اختر تصنيفاً.» · «تصنيف محذوف — اختر آخر.» |
| `product_grid` | `title` | ≤ 80 | «80 حرفاً على الأكثر.» |
| `slider`, `banner_grid` | `items` | 1–12 items | «أضف عنصراً واحداً على الأقل.» · «12 عنصراً على الأكثر.» |
| `slider`, `banner_grid` | `items.<i>.title` | each item needs a title **or** an image | «أدخل عنواناً أو صورة.» |
| `slider`, `banner_grid` | `items.<i>.title` | ≤ 80 (checked before the title-or-image rule) | «80 حرفاً على الأكثر.» |
| `slider`, `banner_grid`, `hero` | `items.<i>.link` / `link` | `''`, a path starting with `/`, or `http(s)://` | «الرابط يبدأ بـ / أو https://» |
| `slider`, `banner_grid` | `items.<i>.image` | a data URL (jpg/png/webp/gif, ≤ 5 MB) or an existing link | «الصيغ المسموحة: jpg, jpeg, png, webp, gif» · «حجم الصورة 5MB على الأكثر.» |
| `hero` | `title` / `subtitle` / `cta_text` | ≤ 120 / ≤ 240 / ≤ 40 | «120 حرفاً على الأكثر.» · «240 حرفاً على الأكثر.» · «40 حرفاً على الأكثر.» |
| every type | `settings`, `content_data` | must be JSON objects | «قيمة غير صالحة.» |
| other types | `title` (from `settings.title`) | ≤ 80 | «80 حرفاً على الأكثر.» |

> ⚠️ Discrepancy — roadmap says (DOC-140) `limit` 1–50 belongs to `product_grid` among the type rules / code does: `limit` 1–50 is validated for **every** section type (it is read from `content_data.limit` first, then `settings.limit`), so a `latest_products` row with `settings.limit = 0` is rejected too.

**Item images.** A data URL is decoded and written under `tenant_upload_path('store_sections', …)`, i.e. `<schema>/store_sections/…`; `content_data` then keeps an **absolute URL**, never base64. A value that is already a link is left as it is. The old serializer demanded an image on every item; now an item may have only a title.

**Label.** `StoreSection.label` (CharField 80) is added by migration `0219_theme_version_section_label`, the same migration that adds `StoreSetting.theme_version` (PositiveInteger, default `1`) and `StoreSetting.theme_updated_at`.

**Upload bound.** Section images travel as data URLs inside a JSON `PATCH`/`POST`, so they count against Django's `DATA_UPLOAD_MAX_MEMORY_SIZE = 8 * 1024 * 1024` (8 MB, `config/settings.py`, line 368), which covers the **whole** request body. A publish that carries many new slider images in a single PATCH is therefore bounded by 8 MB in total (a 5 MB image is about 6.7 MB of base64), and an over-size body answers a generic `400` from Django (`RequestDataTooBig`) before the 5 MB per-image check can run. The theme `logo`, when sent as a multipart **file**, is not counted by that setting (file parts are excluded). Nginx in front of Django allows 55 MB (`client_max_body_size 55m`), so it is Django, not Nginx, that enforces the 8 MB bound — see [`ops/upload-limits.md`](../../../ops/upload-limits.md).

**Tests.** `test_sections_seed_create_update_delete` (seed, create, singleton refusal, type immutability, delete) and `test_reorder` (full order accepted; incomplete order refused).

<a id="schema-changes"></a>

## 5. Gaps closed, bugs fixed, migrations

| Item | Change |
|---|---|
| Migration `0219_theme_version_section_label` | `StoreSetting.theme_version`, `StoreSetting.theme_updated_at` (back the contract's `version` / `updated_at`), `StoreSection.label` |
| `AdminStoreSectionViewSet` | removed (platform-superuser only); replaced by owner-session views with M08 validation |
| Section item image | no longer mandatory; stored as a file, URL in `content_data` |
| Theme concurrency | `409` with `current_version` instead of silent last-write-wins |

<a id="open-items"></a>

## 6. Open items

- The preset list is static: a new preset is a code change (`THEME_PRESETS`) and a deploy.
- `theme_choice` and `brand_shades` are readable but not writable through this API.
- The BFF mock and Django differ in wording only where the mock hard-codes the owner-only sentence; the live sentence is the one quoted above.

> **Limitation of this step.** The BFF files `store/theme`, `store/theme/presets`, `store/announcement` and the three `admin/sections` files were read. The page does not describe any mock fixture beyond the BFF header comments.

<a id="related"></a>

## 7. Related pages

- [Domain 7 overview](README.md) · [Marketing](m13-marketing.md) · [Affiliates & influencers](m17-affiliates-influencers.md)
- Storefront config that consumes the theme and the sections: [`../05-storefront/m09-storefront-home-catalog.md`](../05-storefront/m09-storefront-home-catalog.md)
- Cross-cutting: [auth](../../overview/auth.md) · [errors](../../overview/errors.md) · [conflicts](../../overview/conflicts.md) · [plan features](../../overview/plan-features.md) · [BFF](../../overview/bff.md)
