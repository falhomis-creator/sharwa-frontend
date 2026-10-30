# Marketing, storefront design & partners — التسويق والتصميم والمسوّقون والمؤثرون

> **Source**: DOC-137 (Step 21) · INT-018 (M08), INT-019 (M13), INT-034 (M17) · inventory Domain 7
> **Scope**: Domain 07 — the merchant's **storefront design studio** (M08), the **marketing center** (M13) and **affiliate / influencer commissions** (M17), plus the one public route that feeds them (`storefront/referral/`).
> **Last verified against code**: 2026-10-27 (step 21)

This page is the entry point of Domain 7. The three module pages hold the endpoint-level detail:

| Page | DOC | What it documents |
|---|---|---|
| [`m08-theme-customizer.md`](m08-theme-customizer.md) | DOC-138, DOC-139, DOC-140 | theme `store/theme/`, presets, announcement bar, storefront sections |
| [`m13-marketing.md`](m13-marketing.md) | DOC-141 → DOC-146 | gate matrix, summary, coupons, offers, abandoned carts, campaigns, timeline, gifting, loyalty |
| [`m17-affiliates-influencers.md`](m17-affiliates-influencers.md) | DOC-147, DOC-148, DOC-149 | partner CRUD, sales and payouts, referral capture and the `sharwa_aff` cookie |

<a id="overview"></a>

## 1. Overview

| Task | Module | Live key (`SHARWA_LIVE_MODULES`) | Service | Views | Routes |
|---|---|---|---|---|---|
| INT-018 | M08 Theme Customizer (مخصِّص الثيم) | `design` | `products/services/design_service.py` | `api/views_design.py` | `store/theme/`, `store/theme/presets/`, `store/announcement/`, `admin/sections/` (+ `<pk>/`, `reorder/`) — 6 routes, 6 BFF rows |
| INT-019 | M13 Marketing (مركز التسويق) | `marketing` | `products/services/marketing_service.py` | `api/views_marketing.py` | 17 routes under `promotions/` + `loyalty/program/` — **18 routes**, 18 BFF rows |
| INT-034 | M17 Affiliates & Influencers (المسوّقون والمؤثرون) | `affiliates` | `products/services/partners_service.py` | `api/views_partners.py` | per kind (`affiliates`, `influencers`): `<kind>/`, `summary/`, `<pk>/`, `<pk>/sales/`, `<pk>/sales/mark-paid/` (10 routes) + `storefront/referral/`; 2 BFF catch-alls + 1 public row |

All paths are under `/api/v1/` on the tenant host; the BFF mirrors them under `/api/bff/` ([BFF](../../overview/bff.md)). Each live key switches the whole module from the mock fixture to Django (`liveOrMock`); the full key register is [`architecture/22-live-module-keys.md`](../../../architecture/22-live-module-keys.md) (rows 10 `design`, 11 `marketing`, 24 `affiliates`).

> ⚠️ Discrepancy — roadmap says (DOC-137) "18 routes under `promotions/` + `loyalty/program/`" / code does: 17 routes under `promotions/` + `loyalty/program/` = **18** routes in total. Counted in [`m13-marketing.md#gates-summary`](m13-marketing.md#gates-summary).

<a id="shared-models"></a>

## 2. Same models as the pricing engine

Nothing in this domain keeps a parallel copy of what checkout reads:

| Written here | Read by |
|---|---|
| `Coupon` (M13 coupons; `Coupon.influencer` from M17) | cart and checkout coupon validation; `create_influencer_sale` |
| `PromotionalOffer` (M13 offers) | cart pricing, including `CheckoutService._buy_x_get_y_discount`; the storefront offers section |
| `AbandonedCart`, `AbandonedCartSettings` | the abandoned-cart scheduled command (`_send_one_reminder` is shared with the manual «remind» action) |
| `MarketingCampaign`, `CampaignRecipient`, `MarketingEvent` | the campaign sender (`send_campaign`, Celery) and the Beat dispatcher |
| `LoyaltyProgram`, `GiftSettings` | checkout (points redemption, gifting) and the points ledger ([M35](../06-customers-wallets/m35-wallets-loyalty.md)) |
| `StoreSetting` theme columns, `StoreSection` | the storefront `/config/` response and the storefront home ([M09](../05-storefront/m09-storefront-home-catalog.md)) |
| `Affiliate`, `AffiliateClick`, `AffiliateSale`, `Influencer`, `InfluencerSale` | checkout attribution (`sharwa_aff` cookie, `Order.coupon_code`) |

So a change made through the API takes effect on the next cart or checkout with no sync step. The only schema changes of the domain are migrations `0219_theme_version_section_label` (M08) and `0220_marketing_api` (M13); M17 added none.

<a id="owner-only"></a>

## 3. Ownership and gates

The gate order is the same in spirit everywhere — session first, then who may call, then the plan feature — but the order of the last two differs per module, so each page has its own table.

| Area | Who may call | Plan feature | Staff refused with |
|---|---|---|---|
| **Design** — theme, announcement bar, sections | owner only | `storefront_design`; `coupon` for the announcement bar | «تصميم المتجر مقصور على مالك المتجر.» |
| Design — presets list | any signed-in session | none | — |
| **Marketing** — summary, coupons, offers | staff with `discounts.apply` (read) / `discounts.manage` (write) | none for summary; `coupon` for coupons and offers | `403` «ليست لديك صلاحية لهذا الإجراء.» |
| Marketing — abandoned carts, campaigns, timeline, loyalty programme, gifting | owner only | `abandoned_carts`, `campaigns`, `timeline`, `loyalty_settings`, `gift_settings` | one sentence per tool, for example «الحملات مقصورة على مالك المتجر.» |
| Marketing — campaign channels list | any signed-in session | none | — |
| **Partners** — reads (list, summary, detail, sales) | owner or staff | `affiliates` / `influencers` | — |
| Partners — writes (create, edit, mark paid) | owner only | same | «إدارة المسوّقين والمؤثرين ومستحقاتهم لمالك المتجر.» |
| `storefront/referral/` | public (tenant context only) | none | — |

A plan whose feature is off answers `403` «هذه الميزة غير متاحة في باقتك الحالية» (no final full stop) for design and marketing, and the feature-specific sentences «ميزة التسويق بالعمولة غير مفعّلة في خطتك.» / «ميزة المؤثرين غير مفعّلة في خطتك.» for partners. Details: [permissions](../../overview/permissions.md) · [plan features](../../overview/plan-features.md).

<a id="conventions"></a>

## 4. Conventions that hold across the domain

- **Money.** Stored in SAR; every `display_*` field is converted and formatted by the server in the store currency. Clients never format or sum money ([money](../../overview/money.md)).
- **Enums.** Values are Django's; Arabic labels are UI text.
- **Errors.** Field errors are `{field: [message]}` with status `400`; `404` and gate errors are `{"detail": message}` ([errors](../../overview/errors.md)). Server sentences are quoted verbatim in «…».
- **Optimistic locking.** Only the theme PATCH carries a version (`409` with `current_version`, [conflicts](../../overview/conflicts.md)).
- **Uploads.** Images accept `jpg, jpeg, png, webp, gif`, up to 5 MB each; Django's request body limit is 8 MB (`DATA_UPLOAD_MAX_MEMORY_SIZE`, file parts of a multipart request excluded), see [`ops/upload-limits.md`](../../../ops/upload-limits.md).
- **Background work.** Campaign sending uses Celery chunks on the queue `channels_broadcast`; scheduled campaigns are released by the Beat task `dispatch-scheduled-campaigns` every 5 minutes per tenant.

<a id="related"></a>

## 5. Related pages

- Merchant guides for these screens (Arabic): [`../../../guides/merchant/07-marketing-design-partners/README.md`](../../../guides/merchant/07-marketing-design-partners/README.md)
- The storefront that renders the theme, sections, offers and captures the referral: [`../05-storefront/m09-storefront-home-catalog.md`](../05-storefront/m09-storefront-home-catalog.md) · [`m11-cart.md`](../05-storefront/m11-cart.md) · [`m12-checkout.md`](../05-storefront/m12-checkout.md)
- Previous domain: [Customers & wallets](../06-customers-wallets/README.md) · Back to the [documentation home](../../../README.md)
