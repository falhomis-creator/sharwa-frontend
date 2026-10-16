# Data Model (frontend view) — Sharwa Frontend Platform (001)

**Date**: 2026-10-17 · **Scope**: الكيانات كما تراها الواجهة (Zod schemas + أنواع مشتقة)، لا نماذج قاعدة البيانات. المصدر الحاكم للحقول والـ enums هو `specs/discovery/01..03` (قراءة فقط من Django). كل كيان هنا يُنفَّذ كـ `z.object` في `src/features/<module>/schemas/*.ts` أو `src/lib/schemas/*.ts` للمشترك، وتُشتق أنواعه بـ `z.infer`.

> قاعدة: أي حقل لا يظهر في discovery لا يُخترع؛ الحقول المقترحة في عقود `[NEEDS BACKEND]` تُعلَّم بـ `// [NEEDS BACKEND]` في الشيما وتُغذّى من `src/mocks/`.

---

## 1. Cross-cutting (`src/lib/schemas/`)

### TenantContext (محلي، لا يُرسل)
| Field | Type | Notes |
|---|---|---|
| `store` | `string` | subdomain أو host مخصص كامل |
| `kind` | `'platform' \| 'reserved' \| 'subdomain' \| 'custom_domain'` | من `resolveTenant(host)` |
| `group` | `'marketing' \| 'onboarding' \| 'storefront' \| 'dashboard' \| 'pos' \| 'courier' \| 'admin' \| 'pay'` | مجموعة المسار الهدف |
| `storeHost` | `string` | يُرسل كـ `X-Store-Domain` |

**ثوابت**: `RESERVED_SUBDOMAINS` (23 قيمة من `tenants/validators.py`) · `SUBDOMAIN_RE = /^[a-z0-9]+$/`.

### ResolutionOutcome
`'ok' | 'not_found' (404) | 'inactive' (403) | 'session_bound_elsewhere' (403, retry once) | 'provisioning' (503)` — مشتق من استجابة `GET /api/v1/config/`.

### ProvisioningStatus
`{ status: 'pending'|'provisioning'|'ready'|'failed', store_url?: string, dashboard_url?: string }` — من `GET /register/status/<token>/`. انتقالات العرض: 503 → انتظار → (`ready` → تحويل بعد 2s) | (`failed` → رسالة نهائية).

### ApiError
`{ status: number, detail?: string, fields?: Record<string, string[]>, retryAfter?: number, isMock?: boolean }` — من `{detail}` أو `{field:[msg]}`.

### Pagination
`{ count: number, next: string|null, previous: string|null, results: T[] }` (DRF PageNumberPagination، `page_size` ≤ 50 للمتجر).

### Money (display-only)
`display_*: string` — يُعرض كما هو؛ `Currency = 'SAR'|'USD'|'YER_OLD'|'YER_NEW'`. لا حقل رقمي للمبلغ في الواجهة إلا للإدخال (`amount: string` decimal كنص).

### Session (M03 `GET /api/v1/auth/me/` — `[NEEDS BACKEND]`)
| Field | Type |
|---|---|
| `kind` | `'merchant' \| 'staff'` |
| `store_name`, `store_host` | `string` |
| `staff?` | `{ full_name, roles: string[], permissions: PermissionKey[], locations: {id,name}[], max_discount_percent? }` |
| `features` | `FeatureKey[]` (المفعّل من 39) |
| `behavior?` | `{ export: 'none'\|'warning'\|'critical', view: … }` |
| `csrf_token` | `string` (يُحقن خادمياً، لا يُخزَّن في المتصفح) |

### FeatureKey (39) و PermissionKey (35)
ثابتان في `src/lib/access.ts` (نُسخا حرفياً من discovery 01 §7 و 02 §10). ترتيب حسم الميزة: override → kill switch → `requires_plan=false` → `subscriptions_enabled=false` → `PlanFeature`. الواجهة لا تحسم، تقرأ النتيجة من `features[]`.

### NavItem (M03/M48 `src/features/dashboard-shell/navigation.ts`)
`{ key, title, keywords: string[], path, group (15 مجموعة الشريط), feature?: FeatureKey, permission?: PermissionKey, shortcut?, comingSoon? }`.

### Notification (M49 `[NEEDS BACKEND]`)
`{ id, kind, severity: 'info'|'warning'|'critical', title, body, link, group_key, count, created_at, read_at|null, source_ref }`.

---

## 2. Marketing & Onboarding

### LandingContent (M01، ثابت في `landing.content.ts`)
`hero{title ≤9 كلمات, subtitle ≤25, cta}`, `proofStats[{label, value, unit}]`, `capabilities[{key, title, body, size: '8/4'|'4/4/4'|'6/6', preview}]`, `howItWorks[3]`, `faqs[{q,a}]`, `footerLinks[]`.

### PublicPlan (M01/M46 `[NEEDS BACKEND]` `GET /api/v1/public/plans/`)
`{ code, name, is_free, price: string, currency, billing_interval: 'monthly'|'yearly'|'lifetime', max_products, max_orders_per_month, features: string[] }` + `PlatformBillingSettings{ subscriptions_enabled, commission_enabled }` (كلاهما `false` حالياً → عمود «مجاني الآن»).

### RegistrationDraft (M02)
`{ store_name: 3–100, merchant_phone (E.164 بعد التطبيع 0770… → 967770…), subdomain: SUBDOMAIN_RE ∧ ∉ RESERVED, interested_categories: number[], agree_terms: true }`. حالات المعالج: `form → otp(ttl) → provisioning(token) → ready|failed`. فحص النطاق: `{available, reason: 'فارغ'|'أحرف إنجليزية وأرقام فقط'|'محجوز للنظام'|'مستخدم بالفعل'}`.

### MarketCategory
`{ id, name }` (النشطة، مرتبة بـ `display_order`).

---

## 3. Storefront (Ready contract — `src/features/storefront/schemas/`)

### StoreConfig (`GET /api/v1/config/` — Ready)
`store_name, primary_color, secondary_color, background_color, text_color, heading_font, body_font, design_style, theme_preset, brand_shades{50..900}, theme_choice, logo, whatsapp_number, announcement_text, enable_announcement_bar, sections: StoreSection[]` + `[NEEDS BACKEND]` توسيعات M09/M11/M12 (`card_border_color`, `announcement_*`, `show_banner_on_*`, `free_shipping_threshold`, `currency`, `seo_*`, روابط التواصل, `tracking{…}`, `gifting_enabled`, `loyalty_enabled`).

### StoreSection
`{ id, section_type: 'hero'|'category_strip'|'featured_products'|'latest_products'|'slider'|'banner_grid'|'product_grid'|'promotional_offers', label, order, is_active, settings{title?, category_id?, limit?, show_on_mobile?}, content_data: SliderContent|BannerGridContent|ProductGridContent }`.

### CategoryNode
`{ id, name, subcategories: CategoryNode[] }` (+ `image` `[NEEDS BACKEND]`).

### ProductCard (`/catalog/products/` — Ready)
`{ id, name, image, category, display_price, display_old_price, stock, is_featured, is_free_shipping, payment_policy: 'cod'|'deposit'|'full' }` + `badges[]` `[NEEDS BACKEND]` (محلياً: «نفدت الكمية» من `stock=0`، «تخفيض» من `display_old_price`).

### ProductDetail (`/catalog/products/<id>/` — Ready جزئياً)
ProductCard + `description, sizes_list[], colors_list[], deposit_required` + `[NEEDS BACKEND]`: `images[]`, `variant_display_style`, `attributes[]`, `variants[]`, `tier_prices[]`, `formula`, `bundle`, `personalization_fields[]`, `auction`, `reviews`, `related`.

### Cart (`GET /api/v1/cart/` — Ready، مرتبطة بكوكي الجلسة)
`{ items: [{product_id, name, size, color, quantity, display_price, display_subtotal}], count, currency, display_subtotal }`؛ إجراءات `{product_id, size, color, action_type: 'add'|'decrease'|'remove_line'}` → `{cart_count, product_qty}`. توسيعات `[NEEDS BACKEND]`: `image, variant_id, variant_label, product_slug, max_quantity, stock, set_quantity, coupon, applied_offers, display_total`.

### CheckoutDraft (M12، RHF + Zod)
`{ checkout_mode: 'delivery'|'pickup', name, phone, email?, address, latitude?, longitude?, delivery_method_id?, pickup_location_id?, payment_method, coupon_code?, use_wallet, otp?, is_gift, recipient_name?, recipient_phone?, gift_message?, start_datetime?, transfer_amount_reported? }` → `OrderInvoice{display_*}` → `CheckoutResult{ order_id, public_uuid, status, payment_status, display_total, next_action: {type: 'none'|'redirect_gateway'|'show_transfer_instructions', url?} }`.

### PublicOrderTracking (M41 `[NEEDS BACKEND]`)
انظر `contracts/needs-backend-inventory.md` §M41 (الشكل الكامل).

---

## 4. Dashboard core

### Product (M04، `ProductForm` كاملاً)
**Enums**: `payment_policy cod|deposit|full` · `unit` (14) · `product_type physical|digital|service` · `variant_display_style swatches|dropdown|radio` · `pricing_type fixed|formula` · `hazard_class none|flammable|liquid|fragile`. **مجموعات الحقول**: taxonomy, identity (`sku` auto `SHW-XXXXXXXX`), pricing, formula, deposit, flags (`is_serialized, is_bundle, is_auction, is_personalizable, is_bookable`), inventory (`stock Decimal(12,3)`), content, lifecycle (`is_available, published_at, archived_at, is_featured`), shipping. **Visible** = `is_available ∧ archived_at=null ∧ (published_at=null ∨ ≤ now)`.

### Variants (3-tier)
`VariantAttribute{ id, name, field_type: select|radio|multi_select|swatches|text|numeric|date, data_type: text|number|unit|bool|date|file|image, unit?, min_value?, max_value?, is_required, sort_order }` → `VariantOption{ id, attribute, value, typed value }` → `ProductVariant{ id, option_ids[], extra_price, stock, sku, image, effective_price }`. `ProductTemplate` (blueprint) و`GlobalVariantTemplate` (35 قطاعاً).

### Organization (M05)
`Category{ id, name, parent_id, sort_order, image, products_count, meta_* }` · `Brand{ id, name, slug, logo }` · `Tag{ id, name, slug }` · `Collection{ id, name, slug, description, products[] }` · `ProductBadge{ id, name, color }`.

### Order (M06) — **محوران للحالة، لا يُدمجان**
| Axis | Field | Values |
|---|---|---|
| مالي | `status` | `pending_payment` · `new` (افتراضي) · `awaiting_payment` · `payment_review` · `completed` · `cancelled` · `refunded` |
| دفع | `payment_status` | `unpaid` · `pending` · `partial` · `paid` · `failed` · `indeterminate` |
| تنفيذ (يعرّفه التاجر) | `fulfillment_status` → `OrderStatus{ id, name, color, sort_order, is_default, releases_stock, marks_completed }` | افتراضي: قيد الانتظار `#f59e0b` · قيد التجهيز `#3b82f6` · قيد التوصيل `#8b5cf6` · مكتمل `#16a34a` · ملغي `#dc2626` |

حقول القائمة: `id, customer_name, customer_phone, display_total, status, payment_status, fulfillment_status{id,name,color}, sales_channel: online|pos|b2b_draft|phone, created_at, version`. انتقالات: `set_fulfillment_status()` فقط؛ `cancel_order()` يعيد المخزون؛ `refunded` عبر مسار الاسترجاع فقط؛ كل كتابة تحمل `version` (409 عند التعارض). `OrderItem`, `Fulfillment{status: pending|preparing|ready_for_pickup|shipped|delivered|forwarded_to_supplier|cancelled}`, `PaymentIntent{method: wallet|gateway|cod|gift_card, status}`, `OrderRefund{method: wallet|sharwa_pay|manual|wallet_credit}`.

### Customer (M07، بلا حسابات — مفتاح الهاتف)
`{ phone, name, email?, orders_count, display_total_spent, first/last_order_at, trust{ platform{successful_cod_orders, failed_cod_orders, risk_percentage}, store{cod_refusals_count, cod_disabled} }, wallet{display_balance}, points{balance} }`.

### StoreSetting (M34/M08)
الهوية، SEO، التواصل، الثيم (5 ألوان + خطّان من 11 + `theme_preset` من 9 + `custom`, `design_style`), شريط الإعلان (9 حقول), التجارة (`default_delivery_fee` YER_NEW, `free_shipping_threshold`, FX `sar_to_yer_old 140`, `sar_to_yer_new 520`, `usd_to_sar 3.75`, `currency`, `enable_manual_payment`, `enable_sharwa_pay`, `multi_location_enabled`, `timezone 'Asia/Aden'`, `week_start_day sunday|monday`). **لا يُعرض** `admin_password` ولا أي سر.

### Marketing (M13/M17)
`Coupon{ code, discount_type percent|fixed, discount_value, apply_to all|category|product, min_order_amount, start_date, expires_at, is_active, max_uses, used_count }` · `PromotionalOffer{ offer_type discount|free_shipping|buy_x_get_y, condition_type all|category|product|min_items, … }` · `AbandonedCart{ status active|abandoned|recovered, reminder_step }` · `MarketingCampaign{ channel sms|email|whatsapp|meta_social_commerce|tiktok_shop|telegram_bot, audience_type, status draft|scheduled|sent }` · `MarketingEvent{ event_type, color indigo|emerald|amber|rose|sky }` · `Affiliate`/`Influencer` (`payout_status pending|paid`).

### Payments & Wallets (M14/M35/M40)
`Gateway{ gateway_code jeeb|kuraimi, is_enabled, has_credentials, fields[] }` · `PayoutAccount{ account_type bank|wallet, provider_name, account_number, account_name, sort_order }` · `MerchantWallet{ balances[{currency, display_balance}] }` · `WithdrawalRequest{ status pending|approved|rejected }` · `CustomerWallet` (SAR) `WalletTransaction.reason manual_topup|refund|reward|order_payment|adjustment|loyalty_redeem` · `SharwaPayWallet{ balances×4 }`, `SharwaPayTransaction{ transaction_type credit|debit, reason topup_manual|topup_auto|purchase|purchase_refund|withdrawal|withdrawal_reversal|platform_fee }`.

### Shipping (M15/M38/M39)
`DeliveryMethod{ name, display_price, estimated_time, is_active, is_sharwa_official }` · `PickupLocation` · `ShippingProvider{ carrier_code ''|aramex|smsa, max_weight_per_awb, accepts_hazardous }` · `ShipmentOrder{ waybill_number 'SHW-<ts>', status: label_pending|pending_pickup|picked_up|in_transit|delivered|returned|cancelled|compensated_lost, billing_status pending|collected|waived }` مع آلة الحالات (`label_pending→{pending_pickup,cancelled}`, `pending_pickup→{picked_up,cancelled}`, `picked_up→{in_transit,returned,cancelled}`, `in_transit→{delivered,returned}`, `delivered→{returned}`) · `ShipmentEvent{ source webhook|agent_app|merchant_manual|system, is_rejected, out_of_order, flagged_for_review, geo }` · `CourierCustodyLedger.entry_type collected_cod|handed_over|lost|written_off|reversed`.

### Returns (M24)
`ReturnRequest{ status requested|approved|rejected|processing|completed, refund_method original_payment|cash|wallet|store_credit, version }` · `ReturnAuthorization{ reason customer_rejected|damaged|wrong_item|bundle_partial_return, status requested|in_transit_back|received_at_warehouse|qa_pending|restocked|rejected_disposal|closed, fee_payer customer|merchant|platform }`.

### Inventory & Locations (M21/M22)
`Location{ code, name, flags×8, ownership owned|franchise|third_party_3pl|dropship_supplier, display_type }` · `LocationInventory{ on_hand, reserved, quarantine, available = on_hand−reserved−quarantine, reorder_point }` · `StockMovement.reason sale|cancel_restock|refund_restock|manual_adjust|restock|po_received` · `InventoryItem.status available|reserved|sold` · `InventoryReservation.status active|consumed|released`. حقيقة المخزون: LocationInventory → Variant → Product.

### Staff / RBAC / POS (M18/M16)
`StaffMember{ full_name, phone, token_version, is_active, terminated_at }` · `Role{ name, is_system_role, max_discount_percent, permission_codes[] }` · `ApprovalRequest{ request_type refund|shift_shortage|stock_writeoff|discount_exception|order_approval|po_approval, status pending|approved|rejected, version }` · `AuditLog` (hash chain) · `BehaviorAlert.level warning|critical` · `CashRegister` · `Shift{ status open|pending_manager_approval|closed|force_closed, opening_float, expected_closing, actual_closing, variance }` · `ShiftCashMovement.movement_type sale|cash_in|cash_out|refund|rounding_adjustment`.

### Reports (M25)
`ReportRegistry` 42 تقريراً / 10 فئات (`core, customers, finance, shipping, inventory, operations, local_market, advanced_behavior, marketing, infrastructure`) · `ReportExportJob.status queued|processing|ready|failed|expired` · `ScheduledReportSubscription.frequency daily|weekly|monthly`.

### Channels & Extensions (M26–M33, M36, M37)
`BookingSlot.status held|booked|cancelled` (weekday 0=Monday ⚠ يختلف عن المواقع 0=Sunday) · `Conversation.status open|pending|resolved`, `Message{ direction inbound|outbound, sender_type customer|staff|bot, status sent|delivered|read|failed }` · `MarketplaceListing.sync_status needs_identifier|pending|synced|failed|unpublished|hidden_out_of_stock` · `SupplierOrder.status` (10) · `PurchaseOrder.status draft|pending_approval|approved|partially_received|received|cancelled` · `SupportSession.status bot_active|human_locked|escalated|closed` · `SupportTicket.status open|in_progress|closed` · `OperatingExpense.category packaging|rent|salaries|other` · `NegotiationDraft.status draft|submitted|approved|rejected` · `Auction.status draft|active|ended`.

---

## 5. Platform admin (M20/M45/M46)
`Client{ name, schema_name, merchant_phone, is_active, provisioning_status, current_plan }` · `Plan{ code, name, is_free, price, currency, billing_interval monthly|yearly|lifetime, commission_type none|percentage|fixed, max_products, max_orders_per_month, is_active, is_default_free }` · `Subscription.status active|cancelled|expired` · `Feature{ code, name, module_group, is_active_globally, requires_plan }` · `TenantFeatureOverride` · `App{ code, is_free, display_price, billing_interval monthly|yearly }` · `PlatformCommissionRecord`/`AppBillingCharge.status pending|collected|waived` · `SharwaPayTopupRequest`/`WithdrawalRequest.status pending|approved|rejected` · `TenantDeactivationRecord.status suspended|deactivated|closed`.

---

## 6. Validation rules (Zod، مشتركة)
- الهاتف: يُطبَّع إلى E.164 يمني/خليجي قبل الإرسال؛ يُعرض `dir="ltr"`.
- النطاق الفرعي: `SUBDOMAIN_RE` ∧ ∉ `RESERVED_SUBDOMAINS`؛ الحكم النهائي للخادم.
- المبالغ المُدخلة: نص decimal (`/^\d+(\.\d{1,2})?$/`)؛ لا `number` float.
- `version`: مطلوب في كل كتابة على كيان متعدد الكتّاب (orders, returns, approvals, purchase orders, shifts).
- `idempotency_key` / `client_generated_uuid`: UUID v4 يُولَّد في العميل مرة لكل إجراء ويُعاد استعماله عند إعادة المحاولة.
