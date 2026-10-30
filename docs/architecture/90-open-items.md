# Open-items register — not built / Django rule kept

> **Source**: DOC-526 · inventory A.13 · INT-014, INT-015, INT-017, INT-019, INT-021, INT-022, INT-037, INT-044, INT-045 (§A mirrors the 17-row table of DOC-076, Step 18)
> **Code**: per row (`sharwa_saas/…`, `sharwa-frontend/src/…`)
> **Last verified against code**: 2026-10-29 (step 50)

## 1. Purpose and how to use this register

Phase 003 documentation must never present unfinished behaviour as available. This register is the single list every page defers to: an item lands here when a feature is **not built**, when a **Django rule is kept by decision**, or when only part of a flow exists. Each row carries an owner, a status and the wording documentation may use, so guides and API pages quote one consistent sentence instead of improvising.

- **Status legend** — `not built` (no code path exists), `not wired` (model/route exists, nothing calls it), `Django rule kept` (deliberate decision, works as coded), `deferred` (decision postponed by fares), `superseded` (an earlier mock-era decision replaced by the real implementation — recorded so old constants are not repeated), `open` (finding, undecided).
- **Owner legend** — `fares` (product decision), `platform team` (code work inside `sharwa_saas`/`sharwa-frontend`), `docs` (documentation-only follow-up).
- Quotation convention: text in «…» that carries a `file:line` is a verbatim string from the code; Arabic text in the **Wording docs must use** column is the recommended documentation wording written for this register (not a string from the code) and is quoted in «…» only to mark it as Arabic.
- Adding a row: verify the claim against the code first (file:line), then fill every column. A row is removed only when a migration or route makes it untrue — with the closing step noted.

Related registers: legacy-only features and HTML surfaces → [`91-legacy-surfaces.md`](91-legacy-surfaces.md); environment/BFF/audit inconsistencies with fix tasks → [`92-inconsistencies.md`](92-inconsistencies.md).

## 2. §A — Platform open items (roadmap A.13)

| ID | Item | Domain / INT | What is missing / kept (evidence) | Owner | Status | Wording docs must use |
|---|---|---|---|---|---|---|
| OI-01 | IP allow-list addresses behind `enforce_ip_whitelist` | Staff · INT-022 | The per-staff toggle exists (`StaffMember`, migration `products/0143_staff_rbac.py`; read/patched by `staff_service.py:190`, `:242`, `:263`; dashboard label «مقيَّد بعناوين IP», `src/features/staff/components/staff-detail.tsx:122`) but **no model stores allowed addresses and no middleware enforces the flag** — a grep of `sharwa_saas` finds no other consumer | platform team | not built | «تقييد الموظف بعناوين IP محفوظ في ملفه لكنه غير مُفعَّل بعد — لا تُدار قائمة العناوين من أي شاشة.» (Arabic guides); English pages: "the flag is stored; enforcement is not implemented yet." |
| OI-02 | Meta catalog sync needs a category mapping with no screen | Channels · INT-037 | Only TikTok offers a category-mapping screen; Meta products without a mapping fail sync per product with «لا يوجد ربط تصنيف لهذا المنتج على هذه القناة.» (`social_channels/catalog_sync_service.py:117`). TikTok categories come from a static starter list (no TikTok category API client) plus codes saved from the legacy free-text screen | fares | deferred (by fares) | «مزامنة كتالوج ميتا تتطلب ربط تصنيفات — الشاشة المتاحة اليوم لتيك توك فقط؛ المنتجات غير المربوطة تُبلَّغ بالرسالة نفسها.» |
| OI-03 | `bundle_selection` not wired; merchant order detail hides personalization | Advanced products · INT-045 | The PDP does not send the buyer's optional-component choice and `storefront_cart_service.py` never reads it; `OrderItem.personalization` is saved at checkout but `order_api_service.py` has no `personalization` reference (details: [`../../api/domains/03-catalog/m37-advanced-products.md`](../api/domains/03-catalog/m37-advanced-products.md) §4.8) | platform team | not wired | "The buyer's choice of optional bundle components is not sent to the cart yet." / "Personalization the buyer entered is saved with the order line but is not shown in the order screen yet." |
| OI-04 | Haggling drafts (`NegotiationDraft`) | B2B · INT-044 | Model exists (`products/models/negotiation.py:10`, migration `0156_negotiation_draft.py`) for price/quantity negotiation as an independent draft; **no route, view, template or admin reaches it** — the import in `api/serializers.py:5` is dead; the mock router keeps the future route hidden on purpose (`src/mocks/b2b/router.ts:9`) | fares | not wired | «مفاوضات السعر/الكمية غير متاحة في الواجهة بعد.» (English: "haggling drafts are modelled but have no screen.") |
| OI-05 | Verifying the pickup code at the counter | Shipping/POS · INT-015 | `PickupCode.ensure_pickup_code()` issues the 6-digit code (30 days) shown to the customer, but **no M15/M22/POS route verifies it** — grep of `api/urls.py` and `pos_service.py` finds no verify endpoint | platform team | not built | «رمز الاستلام يُعرض للعميل لكن لا توجد شاشة تتحقق منه عند الكاشير بعد.» |
| OI-06 | `CentralCustomerTrust` is a merchant signal only | Checkout/CRM · INT-014/INT-017 | The public-schema trust record is never consulted by checkout: `cod_allowed` is decided **only** by the store's own `CustomerReliabilityRecord.cod_disabled` (`storefront_checkout_service.py:507-511`, docstring `:29-31`); the platform signal is informational for the merchant | fares | Django rule kept | «قرار السماح بالدفع عند الاستلام يعتمد على سجل المتجر نفسه فقط — ثقة المنصة إشارة استرشادية للتاجر.» |
| OI-07 | smsa carrier `test_connection` | Shipping · INT-021 | `SMSAAdapter` is a registered skeleton: `test_connection` always returns `(False, message)` with the message «SMSA غير مرتبطة بواجهة فعلية بعد — لا يمكن اختبار الاتصال الآن.» (`products/carriers/smsa.py:22-23`); every operation raises `CarrierUnavailableError` (→ `PendingAWBQueue`) | platform team | not built | «SMSA غير مرتبطة بواجهة فعلية بعد — لا يمكن اختبار الاتصال الآن.» is the literal answer; guides add «أرامكس هي شركة الشحن الخارجية المفعّلة الوحيدة.» |
| OI-08 | SMS/e-mail campaign channels have no provider | Marketing · INT-019 | `channel_connected` hard-codes `sms`/`email` to `False` («SMS/البريد بلا مزوّد حقيقي بعد», `marketing_service.py:719-722`); WhatsApp/social channels require an active app installation | platform team | not built | «قناتا الرسائل النصية والبريد غير متصلتين — الحملات المتاحة اليوم عبر واتساب وقنوات المحادثة المفعّلة.» |
| OI-09a | `live_rate_refs` always `[]` | Products · INT-005 (M04) | The serializer returns `'live_rate_refs': []` unconditionally (decision D4, `api/serializers_products.py:13`, `:257`); `live_rate_ref` itself is free text ≤ 50 chars | fares | Django rule kept | «لا توجد قائمة أسعار صرف حية بعد — يُعرض `live_rate_refs` فارغاً دوماً والحقل الحر يُستخدم للمرجع اليدوي.» |
| OI-09b | POS manager code 2468 / 200 SAR refund threshold | POS · INT-033 | **Superseded**: the mock-era constants became real settings — `StoreSetting.pos_manager_code_hash` and `pos_refund_otp_threshold` (default 200.00) in `products/models/store_settings.py:335-340`, migration `products/0229_pos_api.py` + `billing/0013_seed_pos_feature` | — | superseded (closed in INT-033) | Docs must not repeat 2468 as the code; the manager code is set by the `set_pos_manager_code` management command and is never displayed. |

## 3. §B — Advanced products (M37) register mirror — DOC-076

Copied verbatim from [`../../api/domains/03-catalog/m37-advanced-products.md`](../api/domains/03-catalog/m37-advanced-products.md) §4.8 (written in Step 18) as that page required. Owners: items 1–2 are OI-03 above (platform team); items 3–13 are platform-team code findings awaiting scheduling; 14–17 are by-design or documentation limits. "Where" refers to sections of the M37 page.

| # | Item | Status | Wording for guides and API pages | Where |
|---|---|---|---|---|
| 1 | `bundle_selection` is not sent or read | not built (INT-045) | "The buyer's choice of optional bundle components is not sent to the cart yet." | §4.8, §6 |
| 2 | Merchant order detail shows no personalization | not built (no M06 field) | "Personalization the buyer entered is saved with the order line but is not shown in the order screen yet." | §4.3, §4.8 |
| 3 | Compatibility rules are not enforced by the server | Django rule not found | "Rules are shown to the buyer on the product page; the server does not refuse an order that breaks one." | §4.2 |
| 4 | Personalization values are not validated against the field definitions (required, options, length, type); the surcharge is charged even when the product's personalization flag is off | Django rule not found | "The form checks required fields and options; the server does not." | §4.3 |
| 5 | Live bundle components carry `choice: null`; the mock fills choices from fixtures | open | "Rule behaviour on the live product page is unconfirmed." | §4.2 |
| 6 | Two bundle price computations (`bundle_view` vs `Product.bundle_total_price()`) | open | "The bundle total shown in the dashboard is computed by the API." | §4.1, §6 |
| 7 | Bundle `PATCH` is not in the change log; no component reorder route; stock of components not deducted by these routes (not verified) | open | — | §4.1, §6 |
| 8 | Merchant auction `PUT` is not row-locked; the roadmap says "locked on writes" | open | "Bids are serialised; settings saves are not." | §4.4 |
| 9 | An ended auction creates no order and no notification in the code read; how a win becomes a sale was not traced | not traced | "Ending an auction does not by itself create an order." | §4.7 |
| 10 | Bid amount has no upper cap; phone accepts Arabic-Indic digits; the bid form accepts only Yemeni and Saudi mobile numbers while Django accepts any 9–15 digits (reported in step 16) | open | "A phone number of 9 to 15 digits is accepted by the server." | §4.7 |
| 11 | Import: `failed` status is never set; the `uploaded` status of the schema is never returned | open | "A job ends `done`; read `failed[]` for rows that did not import." | §4.6 |
| 12 | Import: row numbers drift after blank rows; finished jobs and their rows are never deleted; raw exception text is shown in a row message | open | — | §4.6 |
| 13 | Export does not neutralise cells starting with `=`, `+`, `-`, `@` | open (security) | — | §4.6 |
| 14 | Serial codes: no delete or edit route; stock is replaced by the available count on each paste | by design / open | "Pasting codes sets the stock to the number of available codes." | §4.5 |
| 15 | Stale docstrings: `storefront_cart_service.py` (personalization "not priced", now priced); `storefront_auction_service.py` (anti-sniping "same duration", code is now + window) | cosmetic | — | §4.3, §4.7 |
| 16 | Fixture server differs from Django: bundle total, serial stock and 255 limit, import `old_price` / `xlsx` / pacing, bid field validation and currency basis, CSV line ending | by design | "Mock mode is for screens; amounts and limits come from Django." | §4.1, §4.5, §4.6, §4.7 |
| 17 | BFF route files for `extras` and the storefront auction could not be read (path depth) | documentation limit | — | §6 |

> ⚠️ Discrepancy — roadmap says the register covers "«لا يوجد ربط تصنيف…»" as an abbreviation / code does: the full fixed sentence is «لا يوجد ربط تصنيف لهذا المنتج على هذه القناة.» (`catalog_sync_service.py:117`); the register quotes it in full (OI-02). Reported in step 50.

## 4. §C — Security items (from [`30-security.md`](30-security.md) §9)

Collected as that page promised. Evidence and discussion are on the security page; statuses follow its wording.

| ID | Item | Owner | Status | Wording docs must use |
|---|---|---|---|---|
| OI-10 | B2B drafts unreachable for staff — `check_merchant` requires the owner flag (`30-security.md` §4.4) | platform team (Step 52 candidate) | open | "B2B draft screens answer the owner session only; a staff session with the permission key gets 401 «غير مصرح لك بالوصول.» today." — confirmed live in Step 51, where the staff answer is `401`, not `403` ([`../api/_verification.md`](../api/_verification.md#f-1)) |
| OI-11 | Personal access tokens authenticate nothing (`shw_pat_…` issued, no DRF class accepts them) | fares (decision carried from step 03) | open | "Personal access tokens are not accepted by any route yet." |
| OI-12 | Roster is checked at login only — `StaffSessionMiddleware` never calls `roster_allows` again | fares (intended?) | open | «تُفحص جدولة الورديات عند تسجيل الدخول فقط.» |
| OI-13 | `StaffSession.last_seen_at` is `auto_now` but never saved after login — the sessions list shows the login time | platform team | open | — |
| OI-14 | Trusted devices are not enforced (no POS check; `last_seen_at` never written) | platform team | open | — |
| OI-15 | Storefront writes are CSRF-free by design | fares | Django rule kept | "Storefront public writes are CSRF-exempt by design; any future merchant-data write must declare an authentication class." |

## 5. §D — Items from the Domain 9–16 data-model pages (step 50)

User-facing items found while writing [`data-model/09-b2b.md`](data-model/09-b2b.md) … [`data-model/16-platform-console.md`](data-model/16-platform-console.md); each stays on its page with full evidence — this section indexes them.

| ID | Item | Page | Status |
|---|---|---|---|
| OI-16 | B2B fulfillment gate `is_pending_approval` has no caller; the rich draft state machine is an unwired validation layer | [`data-model/09-b2b.md`](data-model/09-b2b.md) §9 | open |
| OI-17 | `approver_role` not checked on the B2B resolve route (permission + self-approval ban are the only gate) | [`data-model/09-b2b.md`](data-model/09-b2b.md) §9 | open |
| OI-18 | Placeholder reports: `currencies` reuses the payment-methods builder, `categories` reuses the inventory builder | [`data-model/15-reports.md`](data-model/15-reports.md) §9 | Django rule kept |
| OI-19 | Two writers of `TenantStatsSnapshot` with different semantics; the unscheduled legacy `aggregate_tenant_stats` is dead unless run manually | [`data-model/15-reports.md`](data-model/15-reports.md) §9 + [`data-model/16-platform-console.md`](data-model/16-platform-console.md) §9 | open |
| OI-20 | Legacy Sharwa Pay admin bulk actions stamp `reviewed_at` but never `reviewed_by`; dues decided from `master-dashboard/dues/` never reach `PlatformActionLog` | [`data-model/16-platform-console.md`](data-model/16-platform-console.md) §9 | open |

Items 5–12 of the M37 table (§B above) and OI-16–OI-20 are code-quality findings: none changes what a user sees today, so no reader-facing wording is prescribed beyond "the page says".

## 6. §E — Items found by the Step 51 live verification

Found on the running stack ([`../api/_verification.md`](../api/_verification.md), [`../guides/_verification.md`](../guides/_verification.md), [`../ops/_verification.md`](../ops/_verification.md)); each is also documented on the page it affects.

| ID | Item | Evidence | Owner | Status | Wording docs must use |
|---|---|---|---|---|---|
| OI-21 | With mocks off, the storefront BFF (`storefrontAdapter`) answers `501` «غير متاح بعد.» for **every** Django `404` — an expired cart-restore link, an unknown order or tracking link, a hidden product — so the buyer never sees Django's message | [`../api/overview/bff.md`](../api/overview/bff.md) §4.6 (decision needed since Step 05); reproduced live, [`../api/_verification.md`](../api/_verification.md#f-2) | fares (decision) | open | "In this build the screen shows «غير متاح بعد.» instead of the explanation." |
| OI-22 | No route, screen, admin page or command creates a POS register (`CashRegister`); support has no written procedure | [`../ops/_verification.md`](../ops/_verification.md#o-6) | platform team | open | the «قيد معروف» of `pos-open-shift.md` |
| OI-23 | Six variables the code reads are missing from the backend `.env.example` (`GUNICORN_*` ×5, `SHARWA_CHANNELS_RATE_LIMIT_PER_MINUTE`) | [`../ops/_verification.md`](../ops/_verification.md#o-7) | platform team (Step 52, DOC-535) | scheduled | — |
| OI-24 | `scripts/openapi/route_inventory.py` misses chained alias methods (`get = patch = put = delete = _not_allowed`), so `expenses/<pk>/` has no operation in the generated files | [`../api/_verification.md`](../api/_verification.md#a-2) | Claude (Step 52, DOC-535) | scheduled | — |

## 7. Related pages

- [`91-legacy-surfaces.md`](91-legacy-surfaces.md) — features that exist only on the legacy HTML screens, and the HTML surfaces kept beside every API.
- [`92-inconsistencies.md`](92-inconsistencies.md) — `.env.example`, BFF and audit-file inconsistencies with fix tasks.
- [`30-security.md`](30-security.md) §9, [`data-model/09-b2b.md`](data-model/09-b2b.md) §9, [`data-model/11-shipping.md`](data-model/11-shipping.md) §9, [`data-model/15-reports.md`](data-model/15-reports.md) §9, [`data-model/16-platform-console.md`](data-model/16-platform-console.md) §9 — the pages these rows come from.
