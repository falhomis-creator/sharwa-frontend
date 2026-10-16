# Discovery 00 — Module Map: 20 Baseline Actors → Expanded Frontend Module List

> Derived from read-only discovery of `C:\sharwa_saas` (see 01/02/03 in this folder) on 2026-10-17.
> This is the reference list `/speckit-specify` will spec against. Baseline items keep their original number; expansions are appended with `E-` numbers.

## Legend
- **Backend ready**: a usable `/api/v1` contract exists today.
- **HTML-only**: exists in Django as server-rendered views; needs new REST endpoints or a BFF proxy → `[NEEDS BACKEND]`.
- **Absent**: not in the backend at all → `[NEEDS BACKEND]` + proposed contract.

## A. Baseline 20 (from the brief) — mapped to what actually exists

| # | Module | Route group | Backend status | Key backend sources |
|---|---|---|---|---|
| 1 | SaaS Landing Page | `(marketing)` | n/a (static) | `tenants/templates/tenants/home.html` for messaging |
| 2 | Merchant Onboarding Wizard | `(onboarding)` | HTML-only (`/register/*`, status JSON exists) | `tenants/views.py`, `tenants/forms.py`, provisioning states `pending|provisioning|ready|failed` |
| 3 | Merchant Overview Dashboard | `(dashboard)` | HTML-only | `dashboard_home`, `DailyStoreMetrics`, `refresh_today_metrics` |
| 4 | Product & Variant Manager | `(dashboard)` | HTML-only (read API exists for storefront) | `Product` (80+ fields), 3-tier variants, `ProductForm`, `ProductQuickAddForm`, templates/blueprints |
| 5 | Categories, Brands, Tags, Collections, Badges | `(dashboard)` | Categories read API; rest HTML-only | `Category`, `Brand`, `Tag`, `Collection`, `ProductBadge`, `organization` |
| 6 | Orders & Fulfillment Pipeline | `(dashboard)` | HTML-only (+ returns/B2B API) | `Order` 7 statuses + `OrderStatus` custom workflow, `Fulfillment`, `PaymentIntent`, `OrderRefund`, `order_detail_api` |
| 7 | Customers & CRM | `(dashboard)` | HTML-only | `customer_report`, customer `Wallet`, `CustomerPoints`, `CentralCustomerTrust`, wishlists, reviews |
| 8 | Storefront Theme Customizer | `(dashboard)` | Sections API ready (`/api/v1/admin/sections/`); identity HTML-only | `StoreSetting` tokens, 9 presets, 11 fonts, `StoreSection` 8 types, announcement bar |
| 9 | Customer Storefront (home) | `(storefront)` | **Ready** (`/config/`, `/catalog/*`) | sections renderer, `brand_shades` |
| 10 | Product Detail Page | `(storefront)` | **Ready** (`/catalog/products/<id>/`) | variants, tier prices, badges, reviews, bookings slots (HTML) |
| 11 | Slide-over Cart & Mini-Cart | `(storefront)` | **Ready** (`/cart/`, `/cart/actions/`, session cookie) | `products/cart.py` shape |
| 12 | Frictionless Checkout | `(storefront)` | HTML-only (`POST /checkout/`, coupon, shipping, COD OTP, wallet OTP) | `cart_checkout.py` fields, `OrderInvoice` |
| 13 | Marketing: Coupons, Offers, Abandoned Carts, Campaigns, Timeline, Loyalty, Gifting | `(dashboard)` | HTML-only | `Coupon`, `PromotionalOffer`, `AbandonedCart(+Settings)`, `MarketingCampaign`, `MarketingEvent`, `LoyaltyProgram`, `GiftSettings` |
| 14 | Payments, Wallets & Payouts | `(dashboard)` | HTML-only | gateways `jeeb|kuraimi`, `PaymentCredential`, `PayoutAccount`, `MerchantWallet` (4 currencies), `MerchantWithdrawalRequest`, Sharwa Pay toggle, bank transfers |
| 15 | Shipping Zones & Couriers | `(dashboard)` | HTML-only (+ carrier webhook API) | `DeliveryMethod`, `PickupLocation`, `ShippingProvider`, `SharwaShipZone`, `ShipmentOrder` 8 statuses, carriers `aramex|smsa`, packaging, zones |
| 16 | POS Interface | `(pos)` | HTML-only | `CashRegister`, `Shift` 4 statuses, `ShiftCashMovement`, `OTPChallenge`, orders `sales_channel='pos'` |
| 17 | Affiliates & Influencers | `(dashboard)` | HTML-only | `Affiliate`/`AffiliateSale` (link), `Influencer`/`InfluencerSale` (coupon), payout `pending|paid` |
| 18 | Staff & RBAC | `(dashboard)` | HTML-only | `StaffMember`, `Role`, `Permission` (35 keys), `StaffLocationRole`, `PermissionOverride`, sessions, approvals, audit chain, behavior alerts |
| 19 | Domains, Webhooks & Integrations | `(dashboard)` | **Absent** for domains & outbound webhooks; pixels HTML-only | `Domain` admin-only, `TrackingSettings` (Meta/TikTok/Snap/GTM/GA4/Google Ads), `custom_domain` field |
| 20 | Super Admin SaaS Portal | `(admin)` | HTML-only (`/master-dashboard/*`, Django admin) | `Client`, `Plan`, `Subscription`, `Feature` (39 keys), `TenantFeatureOverride`, `App`, SharwaPay approvals, dues console (8 actions), `TenantStatsSnapshot` |

## B. Expansion — modules discovered in the backend beyond the baseline

| # | Module | Route group | Backend status | Notes |
|---|---|---|---|---|
| E-21 | Inventory Hub & Stock Ledger | `(dashboard)` | HTML-only | `StockMovement` 6 reasons, `InventoryItem` (serialized), `InventoryReservation`, low-stock |
| E-22 | Locations / Warehouses / Branches | `(dashboard)` | HTML-only | `Location` capability flags + 4 ownership types, `LocationInventory`, routing rules, operating hours, lockers, vehicles |
| E-23 | Suppliers & Purchase Orders | `(dashboard)` | HTML-only | `Supplier`, `PurchaseOrder` 6 statuses, approvals |
| E-24 | Returns & Reverse Logistics (RMA) | `(dashboard)` | **Ready** (`/returns/*`, `/returns/rma/*`, `/warehouse/returns/*`) | `ReturnRequest` 5 statuses, `ReturnAuthorization` 7 statuses, legacy `OrderRefund` |
| E-25 | Reports Hub (42 reports / 10 categories) + Exports + Scheduled | `(dashboard)` | HTML-only | `REPORT_REGISTRY`, `ReportExportJob` 5 statuses, `ScheduledReportSubscription` |
| E-26 | Bookings & Appointments | `(dashboard)` + `(storefront)` | HTML-only (slots JSON exists) | `ServiceAvailability`, `BookingSlot` `held|booked|cancelled` |
| E-27 | Unified Inbox & Social Channels (Meta, TikTok, Telegram) | `(dashboard)` | HTML-only (poll JSON) | `Conversation`, `Message`, keyword triggers, catalog sync, staff channel access |
| E-28 | Marketplaces (Amazon, noon) | `(dashboard)` | HTML-only | listings, sync jobs, feeds, marketplace orders |
| E-29 | Dropshipping & Supplier Feeds | `(dashboard)` | HTML-only | `SupplierConnection`, pricing rules, feed mapping wizard, supplier orders 10 statuses |
| E-30 | App Store (per-store installs) | `(dashboard)` | HTML-only | WhatsApp (SharwaConnect), Sharwa AI; usage logs, templates |
| E-31 | Sharwa AI Support Console | `(dashboard)` | HTML-only + SSO | `SupportSession` 4 statuses, live takeover |
| E-32 | Support Tickets & Live Sessions | `(dashboard)` | HTML-only | `SupportTicket`, `support_sessions_*` |
| E-33 | Operating Expenses | `(dashboard)` | HTML-only | `OperatingExpense` 4 categories |
| E-34 | Store Settings Hub (identity, contact, policies, SEO, currency/FX, timezone) | `(dashboard)` | HTML-only | `StoreSetting` forms (7 forms) |
| E-35 | Customer Wallets & Loyalty Points (merchant side) | `(dashboard)` | HTML-only | `Wallet`, `WalletTransaction`, `CustomerPoints` |
| E-36 | B2B Wholesale (tier prices, drafts, negotiation) | `(dashboard)` | **Ready** (`/orders/b2b-draft*`) | `NegotiationDraft`, `ProductTierPrice`, `ApprovalRequest` |
| E-37 | Bundles, Personalization, Auctions, Formula Pricing | `(dashboard)` + `(storefront)` | HTML-only | `BundleComponent`, `CompatibilityRule`, `PersonalizationField`, `Auction`, `AuctionBid` |
| E-38 | Courier / Delivery Agent App | `(courier)` | **Ready** (`/agent/*`) | shifts, custody ledger, scan pickup, partial delivery, geo |
| E-39 | Sharwa Ship Waybills & Shipment Events | `(dashboard)` | HTML-only (+ carrier webhook API) | `ShipmentOrder`, `ShipmentEvent`, AWB queue, rate cards |
| E-40 | Sharwa Pay Customer Wallet PWA | `(pay)` | HTML-only (platform origin) | OTP login, topup, withdrawal; 4 currencies |
| E-41 | Order Tracking Page (public) | `(storefront)` | HTML-only (`/orders/track/<uuid>/`) | by `public_uuid` |
| E-42 | Wishlist, Reviews, Back-in-stock | `(storefront)` | HTML-only | phone-keyed |
| E-43 | Multi-store Owner Rollup | `(dashboard)` | HTML-only | `MerchantAccount`, `TenantStatsSnapshot` |
| E-44 | PWA & Web Push | `(storefront)` | **Ready** (`/pwa/*`, `/push/*`) | `source='nextjs_app'` |
| E-45 | Platform Dues Console (super admin) | `(admin)` | HTML-only | commission/charge collect/waive, app suspend |
| E-46 | Plans, Subscriptions & Feature Flags admin | `(admin)` | HTML-only (Django admin) | 39 feature keys, override hierarchy |
| E-47 | Provisioning Wait State & 503 guard | `(onboarding)` + global | status JSON exists | must be handled by middleware/UI |
| E-48 | Command Palette (⌘K) & Global Search | `(dashboard)` cross-cutting | **Absent** `[NEEDS BACKEND]` | spec a `/api/v1/search/` contract |
| E-49 | Notifications Center (topbar bell) | `(dashboard)` cross-cutting | **Absent** `[NEEDS BACKEND]` | approvals, behavior alerts, unread inbox exist as counts |

## C. Cross-cutting contracts to spec once
- **Tenant resolution**: Host subdomain by default; `X-Store-Domain` under `/api/` only; 503 provisioning guard.
- **Auth**: merchant/staff session cookie + CSRF (`X-CSRFToken`, server-rendered token); customers are phone + WhatsApp OTP, no accounts.
- **Money**: never format client-side; use server `display_*`; currencies `SAR | USD | YER_OLD | YER_NEW`.
- **Errors**: `{detail}` or `{field: [msg]}`; 409 = conflict/concurrency (optimistic `version`).
- **Feature gating**: 39 keys; sidebar items hidden when a feature is off.
- **Permissions**: 35 dotted keys; UI hides/disables per key.
- **Two status axes on orders**: financial `Order.status` + merchant-defined `fulfillment_status`.

## D. Backend gaps summary (`[NEEDS BACKEND]`)
1. REST endpoints for all dashboard CRUD (products, orders, customers, marketing, settings, staff, reports).
2. Checkout / coupon / shipping-quote / order-tracking JSON endpoints for the headless storefront.
3. Tracking pixel IDs over API (or SSR injection).
4. Merchant domain management + outbound webhook subscriptions.
5. Global search and notifications feed.
6. Decide `/sw.js` ownership per origin.
