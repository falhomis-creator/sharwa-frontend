# Discovery 02 — `products` App Domain Model (tenant schema)

> Source: read-only sweep of `C:\sharwa_saas\products\` on 2026-10-17. Nothing in the original project was modified.
> No model has a `store`/`tenant` FK — isolation is physical (schema per tenant). All models below are tenant-scoped.

---

## 1. Base / shared (`products/models/base.py`)
- `CURRENCY_CHOICES`: `SAR` ريال سعودي · `USD` دولار أمريكي · `YER_OLD` يمني صنعاء · `YER_NEW` يمني عدن.
- `convert_amount()` normalizes via SAR (defaults 140 / 520 / 3.75). `format_money()` → `ر.س` / `ر.ي` / `$`.
- `SEOFieldsMixin`: `meta_title(70)`, `meta_description(160)`, `meta_keywords(255)`, `og_image`.
- `LOW_STOCK_THRESHOLD = 3` (`products/constants.py`).

---

## 2. Catalog (`products/models/catalog.py`)

### Category / Brand / Tag / Collection / ProductBadge
- `Category`: `name(100)`, `parent` (self FK → `subcategories`), `image`; SEO mixin; path display «إلكترونيات ⟵ هواتف».
- `Brand`: `name`, `slug`, `logo`. `Tag`: `name(60)`, `slug`. `Collection`: `name`, `slug`, `description`, `products` M2M. `ProductBadge`: `name(50)`, `color` (hex, default `#64748b`).

### Product
Visibility: `Product.objects.visible()` = `is_available AND archived_at IS NULL AND (published_at IS NULL OR ≤ now)`.

**Enums**
- `PAYMENT_POLICY`: `cod` الدفع عند الاستلام · `deposit` عربون مقدماً والباقي عند الاستلام · `full` الدفع كاملاً مقدماً
- `UNIT` (14): `piece` قطعة · `gram` · `kilogram` · `milliliter` · `liter` · `meter` · `centimeter` · `square_meter` · `dozen` · `box` · `bundle` · `pair` · `set` · `roll`
- `PRODUCT_TYPE`: `physical` · `digital` · `service`
- `VARIANT_DISPLAY_STYLE`: `swatches` · `dropdown` · `radio`
- `PRODUCT_TEMPLATE`: `standard` · `landing_page`
- `PRICING_TYPE`: `fixed` · `formula` (unit × coefficient + fixed_extra)
- `HAZARD_CLASS`: `none` · `flammable` · `liquid` · `fragile`

**Field groups**
- Taxonomy: `category`, `brand`, `tags`, `badges`, `blueprint` (ProductTemplate).
- Identity: `name(200)`, `name_en`, `slug`, `sku` (auto `SHW-XXXXXXXX`), `barcode(64)`.
- Pricing: `price`, `old_price`, `sale_start_at`, `sale_end_at`, `cost_price`, `currency`, `payment_policy`, `deposit_required`, `is_taxable`, `tax_rate`.
- Formula pricing: `pricing_type`, `live_rate_ref`, `formula_unit_price`, `formula_coefficient`, `formula_fixed_extra`.
- Refundable deposit: `has_refundable_deposit`, `refundable_deposit_amount`, `_refund_rule`, `_return_event`.
- Flags: `is_serialized` (InventoryItem rows), `is_bundle` + `bundle_build_fee`, `is_auction` (forces stock=1), `is_personalizable`, `is_bookable` + `booking_duration_minutes`.
- Inventory: `stock Decimal(12,3)`, `unit`, `low_stock_threshold`, `allow_backorder`, `min_quantity`, `max_quantity`, `allow_variable_quantity`.
- Content: `description`, `description_en`, `image`, `image_url`, `video_url`, `variant_display_style`, `product_template`, legacy `sizes`/`colors` CSV.
- Lifecycle: `is_available`, `published_at`, `archived_at`, `is_featured`.
- Shipping: `is_free_shipping`, `delivery_duration`, `weight` kg, `length/width/height` cm, `is_hazardous`, `hazard_class`.
- Analytics: `views_count`, `add_to_cart_count`, `created_at`.

**Derived**: `is_on_sale`, `is_low_stock`, `profit_margin(_percent)`, `requires_shipping`, `average_rating`, `rating_distribution`, `active_badges` (dynamic: «نفدت الكمية» `#dc2626`, «تخفيض» `#16a34a`, «وصل حديثاً» `#0ea5e9` ≤7d), `has_variants`, `get_tier_price(qty)`.
**Change log**: `ProductChangeLog` for tracked fields (name, price, old_price, cost_price, stock, currency, is_available, payment_policy, …).

### Variant architecture (3-tier)
1. `VariantAttribute` — store-level dictionary (المقاس/اللون/الخامة). `FIELD_TYPE`: `select` · `radio` · `multi_select` · `swatches` · `text` · `numeric` · `date`. `DATA_TYPE`: `text` · `number` · `unit` · `bool` · `date` · `file` · `image`. Fields: `name`, `field_type`, `data_type`, `unit`, `min_value`, `max_value`, `is_required`, `sort_order`.
2. `VariantOption` — `attribute`, `value(255)`, typed columns (`text_value`, `numeric_value`, `unit_value`, `boolean_value`, `date_value`, `file`, `image`).
3. `GlobalVariantTemplate` — 35 central sectors (superuser-managed). `VariantTemplate` legacy.
4. `ProductTemplate` (merchant blueprint) — `global_template`, `variant_attributes`, deep copy of ~33 Product scalars (`BLUEPRINT_SCALAR_FIELDS`), `apply_to()`, `apply_relations()`.
5. `ProductVariant` — `product`, `options` M2M, `extra_price`, `stock`, `sku`, `image`; `effective_price = price + extra_price`.

### Other catalog models
`ProductImage` (`sort_order`), `ProductTierPrice` (`min_quantity`, `price`), `RelatedProduct` (`cross_sell` · `upsell` · `related`), `BundleComponent` (`quantity`, `is_optional`), `CompatibilityRule` (`equals` · `not_equals` · `in`), `Auction` (`draft` · `active` · `ended`; `start_bid`, `bid_step`, `reserve`, `buy_now`, `end_at`, `anti_sniping_seconds`), `AuctionBid`, `PersonalizationField` (`text` · `textarea` · `number` · `select` · `multi_select` · `date` · `checkbox` · `file` · `image`; `price_add`, `is_required`, `options_csv`), `ProductTemplateTierPrice`, `ProductTemplateRelatedProduct`, `StoreReview`.

---

## 3. Orders (`products/models/orders.py`)

### OrderStatus (merchant-defined fulfillment workflow)
`name(60)`, `color`, `sort_order`, `is_default`, `releases_stock`, `marks_completed`. Defaults seeded: قيد الانتظار `#f59e0b` (default) · قيد التجهيز `#3b82f6` · قيد التوصيل `#8b5cf6` · مكتمل `#16a34a` · ملغي `#dc2626` (releases_stock).

### Order
| `STATUS` | label |
|---|---|
| `pending_payment` | قيد تنفيذ الدفع |
| `new` (default) | جديد |
| `awaiting_payment` | بانتظار تأكيد الدفع |
| `payment_review` | يتطلب مراجعة دفع |
| `completed` | مكتمل |
| `cancelled` | ملغي |
| `refunded` | مسترد |

`PAYMENT_STATUS`: `unpaid` · `pending` · `partial` · `paid` · `failed` · `indeterminate`.
`PAYMENT_METHOD`: `manual` · `sharwa_pay` (+ gateway codes `jeeb`, `kuraimi`).
`TRAFFIC_SOURCES`: `tiktok` · `whatsapp` · `instagram` · `snapchat` · `facebook` · `telegram` · `amazon` · `noon` · `direct`.
`DEVICE_TYPES`: `mobile` · `desktop` · `tablet`.
`SALES_CHANNEL`: `online` · `pos` · `b2b_draft` · `phone`.

Fields: customer (`customer_name`, `customer_phone`, `customer_email`, `address`), gift (`is_gift`, `recipient_name`, `recipient_phone`, `gift_message`), money (`subtotal`, `discount_amount`, `promotion_discount_amount`, `applied_offers`, `coupon_code`, `delivery_fee`, `delivery_method(_name)`, `total_price`, `currency`, `deposit_amount`, `upfront_required`, `amount_on_delivery`, `wallet_amount_used`, `gateway_amount`, `transaction_id`, `idempotency_key`), attribution (`traffic_source`, `device_type`, `utm_*`), ops (`fulfillment_status` FK, `pickup_location`, `shipping_provider`, `tracking_number`, `shipped_at`, `sales_rep`), architecture (`public_uuid`, `version`, `exchange_rate_locked`, `source_location`, `created_by_staff`, `sales_channel`, `pending_approval`, `fraud_score`, `otp_verification`, `is_backordered`).

Transitions: `set_fulfillment_status()` only legal path; `cancel_order()` restocks + reverses wallet credit; `refunded` only via refund path; `cancelled → new|completed` re-deducts stock. Rollup display: «مكتمل بالكامل» / «قيد التنفيذ الجزئي (n من m شحنات وصلت)» / «قيد التنفيذ».

### OrderItem
`product`, `product_name`, `price`, `currency`, `quantity`, `selected_size`, `variant`, `variant_label`, `booking_slot`, `source_location`, snapshots (`product_image_snapshot`, `sku_snapshot`, `tax_rate_snapshot`, `tax_amount`, `discount_allocated`, `exchange_rate_locked`).

### OrderRefund
`METHOD`: `wallet` · `sharwa_pay` · `manual` · `wallet_credit`. `amount`, `reason`, `loyalty_points_clawed_back`. Partial refunds allowed.

### PaymentIntent
`METHOD`: `wallet` · `gateway` · `cod` · `gift_card`. `STATUS`: `pending` · `completed` · `failed` · `refunded`. `gateway_transaction_id` unique.

### Shipping-option models (same file)
- `PickupLocation`: `name`, `address`, `phone`, `is_active`, `sort_order`.
- `DeliveryMethod`: `name`, `price` (stored YER_NEW), `estimated_time`, `is_active`, `is_sharwa_official`.
- `ShippingProvider` (courier/agent): `name`, `phone_number`, `is_active`, `max_weight_per_awb`, `max_items_per_awb`, `accepts_hazardous`, `volumetric_divisor`, `carrier_code` (blank = Sharwa Ship), `staff_account`.

---

## 4. Cart & Checkout
- Session cart (`products/cart.py`): item key `"{product_id}_v{variant_id}"` or `"{product_id}_{size}_{color}"`; stored `{product_id, quantity, size, color, variant_id}`; enriched with `price`, `subtotal`, `currency`.
- Checkout POST fields: `action_type, checkout_mode, client_uuid, name, phone, email, address, latitude, longitude, delivery_method_id, payment_method, coupon_code, use_wallet, wallet_otp, sharwa_pay_otp, otp, transfer_amount_reported, is_gift, recipient_name, recipient_phone, gift_message, size, color, variant_id, start_datetime`.
- Invoice engine `products/pricing.py` (`OrderInvoice`, `calculate_upfront`, `build_order_invoice`); `services/checkout_service.py`.

### Abandoned carts (`carts_recovery.py`)
`AbandonedCart.STATUS`: `active` · `abandoned` · `recovered`. Fields: `session_key`, `customer_phone`, `customer_name`, `total_amount`, `currency`, `items_count`, `last_interaction_at`, `recovered_order`, `reminder_step`, `last_reminder_sent_at`, `reminder_discount_coupon`. `AbandonedCartItem` snapshot. Threshold 2h.
`AbandonedCartSettings`: `is_enabled`, `min_cart_value`, `channel_whatsapp` (True), `channel_email` («قريباً»), `channel_sms` («قريباً»), `channel_conversational_enabled`, `reminder_1_delay_hours=2`, `reminder_1_message` (`{customer_name}` `{cart_url}`), `reminder_2_delay_hours=24`, `reminder_2_message` (`{discount_percent}` `{discount_code}` `{cart_url}`), `discount_percent`, `discount_validity_hours=24`.

---

## 5. Marketing (`marketing.py`)
- **Coupon**: `DISCOUNT_TYPE` `percent` · `fixed`; `APPLY_TO` `all` · `category` · `product`; `code(50)`, `discount_value`, `min_order_amount`, `influencer`, `start_date`, `expires_at`, `is_active`, `max_uses`, `used_count`. Errors: «هذا الكوبون غير مُفعَّل حالياً» / «لم يبدأ هذا الكوبون بعد» / «انتهت صلاحية هذا الكوبون» / «تم استخدام هذا الكوبون الحد الأقصى من المرات».
- **PromotionalOffer** (automatic): `OFFER_TYPE` `discount` · `free_shipping` · `buy_x_get_y`; `CONDITION_TYPE` `all` · `category` · `product` · `min_items`; fields `name`, `discount_type`, `discount_value`, `min_order_amount`, `description`, `image`, `cta_text`, `buy_quantity`, `buy_condition_type`, `buy_category`, `buy_product`, `get_product`, `get_quantity`, `get_discount_percent`, `min_total_items`, `priority`, `valid_from`, `valid_until`, `is_active`.
- **Influencer** (coupon-based): `name`, `contact`, `referral_code` (`inf_xxxxxxxx`), `commission_type` `percent|fixed`, `commission_value`. `InfluencerSale.PAYOUT_STATUS` `pending` مستحقة · `paid` مدفوعة.
- **Affiliate** (link `?aff_id=`): `name`, `phone`, `referral_code` (`aff_xxxxxxxx`), commission. `AffiliateClick`, `AffiliateSale` (OneToOne order).
- **MarketingCampaign**: `CHANNEL` `sms` · `email` · `whatsapp` · `meta_social_commerce` · `tiktok_shop` · `telegram_bot`; `AUDIENCE_TYPE` `all` · `abandoned_carts` · `dormant` · `bought_product`; `STATUS` `draft` · `scheduled` · `sent`. `CampaignRecipient.STATUS` `pending` · `sent` · `failed`.
- **MarketingEvent** (timeline): `EVENT_TYPE` `seasonal` · `holiday` · `campaign_plan` · `custom`; `COLOR` `indigo` · `emerald` · `amber` · `rose` · `sky`; `title`, `start_date`, `end_date`, `linked_campaign`, `linked_offer`.
- **Loyalty** (`loyalty.py`): `LoyaltyProgram` singleton (`is_enabled`, `riyals_per_point` 10, `points_per_riyal_redemption` 10, `min_points_to_redeem`); `CustomerPoints` by phone (`balance`); `CustomerPointsTransaction` `earn` · `redeem`.
- **NegotiationDraft** (B2B): `draft` · `submitted` · `approved` · `rejected`; `proposed_unit_price`, `quantity`, `approval`.
- **GiftSettings**: `is_enabled`.

---

## 6. Shipping & Logistics
### ShipmentOrder (`shipping.py`)
`STATUS`: `label_pending` بانتظار تأكيد الملصق · `pending_pickup` بانتظار الاستلام من التاجر (default) · `picked_up` تم الاستلام · `in_transit` قيد التوصيل · `delivered` تم التسليم · `returned` مُعاد · `cancelled` ملغي · `compensated_lost` شحنة مُعوَّضة.
`BILLING_STATUS`: `pending` · `collected` · `waived`.
State machine (`services/shipment_state_service.py`): `label_pending → {pending_pickup, cancelled}`; `pending_pickup → {picked_up, cancelled}`; `picked_up → {in_transit, returned, cancelled}`; `in_transit → {delivered, returned}`; `delivered → {returned}`; terminal: `returned`, `cancelled`, `compensated_lost`.
`ShipmentEvent.SOURCE`: `webhook` · `agent_app` · `merchant_manual` · `system`.
`PackagingProfile`, `PendingAWBQueue` (`pending` · `processing` · `issued` · `failed`), `CarrierRateCardSnapshot`.

### Zones (`zones.py`): `RestrictedZonePolygon` (`polygon_points` JSON), `DeliverySLARule` (`sla_hours`).
### Couriers (`courier.py`): `CourierShift`; `CourierCustodyLedger.ENTRY_TYPE` `collected_cod` · `handed_over` · `lost` · `written_off` · `reversed`.
### Carriers: `aramex`, `smsa` adapters.

---

## 7. Returns
- `ReturnRequest.STATUS`: `requested` · `approved` · `rejected` · `processing` · `completed`; `REFUND_METHOD`: `original_payment` · `cash` · `wallet` · `store_credit`; `version` optimistic lock. `ReturnLineItem` → `FulfillmentItem` (`quantity_returned`, `refund_amount_allocated`, `restock`).
- `ReturnAuthorization` (RMA): `REASON` `customer_rejected` · `damaged` · `wrong_item` · `bundle_partial_return`; `STATUS` `requested` · `in_transit_back` · `received_at_warehouse` · `qa_pending` · `restocked` · `rejected_disposal` · `closed`; `FEE_PAYER` `customer` · `merchant` · `platform`.
- `CustomerReliabilityRecord`: `cod_refusals_count`, `cod_disabled`.

---

## 8. Locations / Fulfillment (`locations.py`)
### Location (capability flags, no rigid type)
`name`, `code` (e.g. `WH-01`, `BR-JED-02`), `is_active`, `address_text`, `city`, `latitude/longitude`, `phone`. Flags: `stores_inventory`, `ships_to_customer`, `is_transient`, `is_mobile`, `is_virtual`, `serves_walk_in_customers`, `has_pos_terminal`, `is_pickup_point`. `OWNERSHIP`: `owned` · `franchise` · `third_party_3pl` · `dropship_supplier`. `parent_location`. Display types: مورد دروبشيبينج / مركبة متنقلة / مستودع مشترك (3PL) / خزانة PUDO / موقع هجين / مستودع مغلق / فرع تجزئة / نقطة استلام.
Detail tables: `LocationOperatingHours` (weekday 0=Sunday), `LockerDetails`, `FranchiseDetails`, `DropshipSupplierDetails` (`whatsapp` · `email` · `api_webhook`), `VehicleDetails`, `LocationExternalRef`.
### LocationInventory
`quantity_on_hand`, `quantity_reserved`, `quarantine_quantity`, `reorder_point`; `quantity_available = on_hand − reserved − quarantine`. Stock truth: LocationInventory → ProductVariant.stock → Product.stock.
### Fulfillment
`STATUS`: `pending` بانتظار التجهيز · `preparing` · `ready_for_pickup` · `shipped` · `delivered` · `forwarded_to_supplier` · `cancelled`. `FulfillmentItem` (`quantity`, `delivered_quantity`, `rejection_reason`, `is_backordered`). `DropshipForwardLog`, `PickupCode`, `LocationRoutingRule` (`priority`, `applies_to_category`, `applies_to_city`, `preferred_location`).
### StaffMember (RBAC root)
`full_name`, `phone` (unique), `token_version`, `is_active`, `terminated_at`, `enforce_ip_whitelist`, `enforce_roster_schedule`. `LocationStaffAssignment.ROLE`: `manager` · `cashier` · `warehouse_operator` · `driver` · `pickup_agent`.

---

## 9. Stock ledger (`stock.py`)
`StockMovement.REASON`: `sale` · `cancel_restock` · `refund_restock` · `manual_adjust` · `restock` · `po_received`. `InventoryItem.STATUS`: `available` · `reserved` · `sold`. `InventoryReservation.STATUS`: `active` · `consumed` · `released`.

---

## 10. Staff: RBAC / POS / Sessions / Approvals / Audit
### RBAC (`staff_rbac.py`)
`Permission` (`code` dotted, `name`, `category`), `Role` (`name`, `is_system_role`, `max_discount_percent`), `RolePermission`, `StaffLocationRole` (staff × location × role), `PermissionOverride`.
**Permission keys**: `orders.view` · `orders.update_status` · `orders.refund` · `orders.delete` · `orders.process_returns` · `orders.create_b2b` · `orders.approve_b2b` · `staff.view` · `staff.manage` · `staff.manage_roles` · `staff.manage_assignments` · `staff.view_sessions` · `customers.view` · `customers.edit_profile` · `customers.manage_tier` · `customers.export` · `inventory.view` · `inventory.adjust` · `inventory.writeoff` · `reports.view` · `reports.export` · `reports.sales.view` · `reports.profit.view` · `reports.inventory.view` · `reports.customers.view` · `reports.staff_performance.view` · `discounts.apply` · `discounts.manage` · `suppliers.manage` · `suppliers.approve` · `support.takeover_session` · `channels.inbox.access` · `channels.marketplaces.manage` · `channels.dropshipping.manage`.
**System roles**: مدير المتجر (all) · مدير الفرع (all, max 20%) · كاشير (`orders.view, orders.update_status, customers.view, inventory.view, discounts.apply`, max 10%) · أمين مخزن (`orders.view, inventory.view, inventory.adjust, inventory.writeoff, reports.view`).

### POS (`staff_pos.py`)
`CashRegister` (`location`, `name`, `is_active`). `Shift.STATUS`: `open` · `pending_manager_approval` · `closed` · `force_closed`; `opening_float`, `expected_closing`, `actual_closing`, `variance`; one open shift per register. `ShiftCashMovement.MOVEMENT_TYPES`: `sale` · `cash_in` · `cash_out` · `refund` · `rounding_adjustment`. `OTPChallenge` (`shift_step_up`, `large_refund`, `customer_phone_change`). POS receipts = `Order` with `sales_channel='pos'`.

### Sessions (`staff_sessions.py`): `StaffSession`, `PersonalAccessToken`, `TrustedDevice`, `RosterSchedule`.
### Approvals (`staff_approvals.py`): `ApprovalRequest.REQUEST_TYPES` `refund` · `shift_shortage` · `stock_writeoff` · `discount_exception` · `order_approval` · `po_approval`; `STATUS` `pending` · `approved` · `rejected`; `approver_role`, `version`, `escalated_at`. `CommissionLedgerEntry`.
### Audit (`audit.py`): `AuditLog` append-only hash chain (`action_code`, `before_snapshot`, `after_snapshot`, `prev_hash`, `row_hash`); `verify_chain()`.
### Behavior (`behavior.py`): `StaffDailyUsage`, `BehaviorAlert.LEVEL` `warning` · `critical` (`export_volume`, `view_volume`, `message_volume`).

---

## 11. Store settings (`store_settings.py`)
### StoreSetting (singleton)
Identity: `store_name`, `logo`, `admin_password`, `whatsapp_number`, `contact_email`, `custom_domain`, `about_us`, `return_policy`. SEO: `seo_title`, `seo_description`, `seo_keywords`, `seo_og_image`. Social: `facebook_link`, `instagram_link`, `tiktok_link`, `snapchat_link`.
Theme: `theme_choice`, `primary_color` `#4F46E5`, `secondary_color` `#1E293B`, `background_color` `#f8fafc`, `text_color` `#0f172a`, `card_border_color` `#e2e8f0`, `theme_preset` `modern_trust`, `design_style` `fluid`, `heading_font`/`body_font` `Tajawal`. `GOOGLE_FONT_CHOICES`: Alexandria, Tajawal, Cairo, Almarai, IBM Plex Sans Arabic, Changa, Reem Kufi, El Messiri, Noto Kufi Arabic, Amiri, Rubik. Presets: `modern_trust` · `luxury_boutique` · `organic_earth` · `tech_cyber` · `bold_streetwear` · `aurora_glass` · `neo_brutalism` · `cinematic_silk` · `clay_zen` · `custom`.
Announcement bar: `enable_announcement_bar`, `announcement_text`, `announcement_bg_color`, `announcement_text_color`, `announcement_scroll_speed` (`slow` · `medium` · `fast`), `show_banner_on_home/_products/_product_detail/_checkout`.
Commerce: `default_delivery_fee` (YER_NEW), `free_shipping_threshold`, `sar_to_yer_old`, `sar_to_yer_new`, `usd_to_sar`, `currency`, `enable_manual_payment`, `enable_sharwa_pay`, `merchant_balance`, `multi_location_enabled`, `timezone` `Asia/Aden`, `week_start_day` `sunday` · `monday`.

### StoreSection (page builder)
`SECTION_TYPE`: `hero` البانر الرئيسي · `category_strip` شريط تصفّح الأقسام · `featured_products` · `latest_products` · `slider` سلايدر · `banner_grid` شبكة بنرات · `product_grid` شبكة منتجات حسب تصنيف · `promotional_offers`. `settings{title, category_id, limit, show_on_mobile}`, `content_data` (slider/banner_grid `{items:[{image,title,link}]}`; product_grid `{category_id, limit, title}`).

### TrackingSettings
`is_tracking_enabled`, `meta_pixel_id`, `tiktok_pixel_id`, `snapchat_pixel_id`, `gtm_container_id`, `ga4_measurement_id`, `google_ads_conversion_id`, `google_ads_conversion_label`, `meta_conversions_api_token`, `tiktok_events_api_token`.

### PaymentCredential / PayoutAccount
`PaymentCredential` (`gateway_code`, `is_enabled`, `credentials_encrypted`). `PayoutAccount.ACCOUNT_TYPE` `bank` 🏦 · `wallet` 📲; `provider_name`, `account_number`, `account_name`, `is_active`, `sort_order`.

---

## 12. Reports / Finance / Wallets
- `DailyStoreMetrics` (nightly rollup): `orders_count`, `completed_orders_count`, `cancelled_orders_count`, `refunded_orders_count`, `gross_revenue`, `net_revenue`, `top_products_snapshot`, `traffic_source_breakdown`.
- `ReportExportJob.STATUS`: `queued` · `processing` · `ready` · `failed` · `expired`; `download_token`. `ScheduledReportSubscription.FREQUENCY`: `daily` · `weekly` · `monthly`.
- **REPORT_REGISTRY** (42 reports): `core` (sales_overview, best_sellers, orders, store_overview, inventory_overview) · `customers` (customers_vip, abandoned_carts, visits*, ratings) · `finance` (payment_gateways, taxes, coupons, refunds, wallet_custody, invoices_settlements*, platform_commissions) · `shipping` (third_party_logistics, couriers, returns, zones) · `inventory` (categories, variants, stock_movements, suppliers) · `operations` (staff_performance, audit_log, customer_service, system_performance*, marketing_utm, ai_forecasting*) · `local_market` (currencies, pos, operating_expenses) · `advanced_behavior` (failed_searches, wishlists, loyalty) · `marketing` (affiliates, bundles*, subscriptions*) · `infrastructure` (export_engine, scheduled_reports, whatsapp_costs). `*` = not yet available.
- `OperatingExpense.CATEGORY`: `packaging` · `rent` · `salaries` · `other`. `SupportTicket.STATUS`: `open` · `in_progress` · `closed`. `ZeroResultSearchLog`, `WhatsAppMessageCostLog`.
- `PlatformCommissionRecord` / `AppBillingCharge`: `pending` · `collected` · `waived`.
- Wallets: customer `Wallet` (SAR) + `WalletTransaction.REASON` `manual_topup` · `refund` · `reward` · `order_payment` · `adjustment` · `loyalty_redeem`; `MerchantWallet` (4 currencies) + `MerchantWithdrawalRequest` (`pending` · `approved` · `rejected`).

---

## 13. Bookings & customer interactions
- `ServiceAvailability` (weekday 0=Monday ⚠ differs from locations), `start_time`, `end_time`. `BookingSlot.STATUS`: `held` · `booked` · `cancelled`; partial unique `(product, start_datetime)`.
- `ProductReview` (`rating` 1–5, `admin_reply`), `WishlistItem` (by phone), `BackInStockNotification`.

---

## 14. Additional modules
### A. Social channels
`ChannelCatalogSync` (`all` · `selected_categories`; `price_adjustment_percent`, `stock_shield_enabled`), `ChannelCategoryMapping`, `ChannelProductLink.SYNC_STATUS` `pending` · `synced` · `error` · `hidden_out_of_stock`. Inbox: `Conversation.STATUS` `open` · `pending` · `resolved` (`channel_code`, `external_contact_id`, `assigned_staff`, `unread_count`, `order`); `Message.DIRECTION` `inbound` · `outbound`, `SENDER_TYPE` `customer` · `staff` · `bot`, `STATUS` `sent` · `delivered` · `read` · `failed`. `ConversationKeywordTrigger` (`contains` · `exact`; `text` · `product_card` · `catalog_link`). `ChannelOrderRoutingSettings`, `ChannelOrderLink`, `StaffChannelAccess`.
### B. Marketplaces
`MarketplaceSettings` (`amazon` · `noon`; `SAR` · `AED`; markup, fx, auto_push, stock_buffer). `MarketplaceListing.IDENTIFIER` `asin` · `nsku` · `ean` · `upc` · `gtin`; `SYNC_STATUS` `needs_identifier` · `pending` · `synced` · `failed` · `unpublished` · `hidden_out_of_stock`. `MarketplaceSyncJob.JOB_TYPE` `catalog_push` · `price_update` · `inventory_update` · `order_pull` · `barcode_match` · `feed_result` · `shipment_confirm` · `fba_inventory`; `STATUS` `queued` · `running` · `completed` · `completed_with_errors` · `failed`. `MarketplaceFeed`, `MarketplaceOrderDetail` (`marketplace` · `merchant` fulfillment; `pending` · `open` · `shipped` · `canceled` · `unknown`).
### C. Dropshipping
`SUPPLIER_CODE`: `cj` · `makhazen` · `knawat` · `flat_feed`. `SupplierConnection` (sync toggles, `stock_buffer`, `hide_when_out_of_stock`, intervals), `SupplierSyncJob`, `PricingRule` (`markup_percent`, rounding `none` · `nearest_1` · `end_99` · `end_95` · `end_00`), `SupplierProduct.IMPORT_STATUS` `not_imported` · `importing` · `imported` · `failed`, `SupplierVariant`, `FeedMapping` (csv/xlsx, 20 mappable columns), `DropshipStockHold`, `SupplierOrder.STATUS` `queued` · `held` · `submitted` · `accepted` · `processing` · `shipped` · `delivered` · `cancelled` · `rejected` · `failed`.
### D. Procurement
`Supplier`, `PurchaseOrder.STATUS` `draft` · `pending_approval` · `approved` · `partially_received` · `received` · `cancelled`; `PurchaseOrderLineItem`.
### E. Apps
`StoreAppInstallation`, `AppUsageLog` (`order_new`, `order_shipping_update`, `payment_confirmed`, `abandoned_cart_reminder`, `otp`, `manual`), `AppInstallationEvent`, `AppTemplate`.
### F. PWA
`PWAInstallEvent.EVENT_TYPE` `prompt_shown` · `ios_hint_shown` · `accepted` · `dismissed` · `installed`; `SOURCE` `django_storefront` · **`nextjs_app`** (use this). `PushSubscription`.
### G. AI support
`SupportSession.STATUS` `bot_active` · `human_locked` · `escalated` · `closed`; `session_type` `customer` · `affiliate` · `staff_internal`. `SupportMessage`, `BotToolCallLog`, `SupportBotSettings`.

---

## 15. Merchant forms (what the merchant edits)
`ProductForm` (all Product fields + `collections`, `serial_codes`, `auction_*`), `ProductQuickAddForm` (`name, name_en, image, price, stock, unit, blueprint, pricing_type…, is_serialized, is_bundle, is_auction, is_personalizable`), `ProductTemplateForm`, `VariantAttributeForm`, `ServiceAvailabilityForm`, `StoreIdentityForm` (`store_name, about_us, timezone, week_start_day`), `ContactInfoForm`, `StorePoliciesForm`, `ShippingSettingsForm`, `CurrencySettingsForm`, `SEOSettingsForm`, `AnnouncementBarForm`, `StorefrontDesignForm` (`primary_color, secondary_color, background_color, text_color, card_border_color, heading_font, body_font, theme_choice, logo, theme_preset, design_style`), `LoyaltySettingsForm`, `GiftSettingsForm`, `AbandonedCartSettingsForm`, `TrackingSettingsForm`, `GatewayCredentialForm` (dynamic), `InfluencerForm`, `AffiliateForm`, `PromotionalOfferForm`, `CampaignForm`, `TimelineEventForm`, `OperatingExpenseForm`, `SupportTicketForm`, `SupplierForm`, `PurchaseOrderForm`.

---

## 16. Gotchas for the frontend spec
1. **Two order-status axes**: `Order.status` (financial, 7 values) vs `fulfillment_status` (merchant-defined, colored). Render both; never conflate.
2. `refunded` only via the refund path.
3. Stock is a mirror: LocationInventory → Variant → Product. Serialized products use `InventoryItem`.
4. Weekday encoding inconsistent (bookings 0=Mon; locations/roster 0=Sun).
5. Amounts stored in order currency with `exchange_rate_locked`; delivery fees stored in YER_NEW.
6. Secrets live in encrypted JSON — never in API payloads.
7. Use `source='nextjs_app'` for PWA install telemetry.
