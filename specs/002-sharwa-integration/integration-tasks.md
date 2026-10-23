---
description: "Integration roadmap — Sharwa Phase 002 (mock-adapter protocol)"
---

# Integration Tasks: Sharwa Phase 002 — API Integration

**Source**: `specs/001-sharwa-frontend-platform/tasks.md` — the phases, user stories and priorities below are taken from it unchanged (Phase 3 US1 P1 → Phase 4 US2 P1 → Phase 5 US3 P2 → Phase 6 US4 P2 → Phase 7 US5 P3), with modules in the order they were built.

**Protocol (per task)**: the 4-step mock-adapter pipeline — (1) Diagnose the frontend Data Contract (Zod schemas + `src/mocks/<module>`), (2) BFF adapter via `liveOrMock(request, "<module>", "/api/v1/…")` with the module toggled in `SHARWA_LIVE_MODULES`, (3) Django provider (services → DRF serializers/views → `api/urls.py` → migrations → tests), (4) Wiring & QA (`npm run lint`, `npx tsc --noEmit`, Django tests, live run). The frontend contract is the source of truth.

**Not in scope**: Phase 1 (Setup), Phase 2 (Foundational: BFF core, `upstream.ts`, `api-client`, mock runtime — already in place) and Phase 8 (Polish) carry no module IDs.

**Live status when this file was created (2026-10-24)**: `SHARWA_LIVE_MODULES=reports,catalog,products` — M05 Organization live-tested and committed (`catalog`); M04 Products Steps 1–3 committed, Step 4 live QA in progress (`products`); merchant auth endpoints (M03) built. Tick a task only after its Step 4 passes.

## Format: `- [ ] INT-XXX: Integrate [Module ID] - [Module Name]`

---

## Phase 3: User Story 1 — التاجر يُطلق متجره ويبيع أول طلب (Priority: P1) 🎯 MVP

### 3A — الصفحة الترويجية

- [ ] INT-001: Integrate M01 - Marketing Landing Page (public plans, public stats)

### 3B — حلّ المستأجر + هيكل اللوحة

- [ ] INT-002: Integrate M47 - Tenant Resolution & Guard (config probe, provisioning status)
- [ ] INT-003: Integrate M03 - Dashboard Shell, Auth & Overview (session, login/logout, overview, counters, account stores)

### 3C — معالج التأسيس

- [ ] INT-004: Integrate M02 - Onboarding Wizard (market categories, register, OTP verify/resend, provisioning)

### 3D — المنتجات · التنظيم · الطلبات · لوحة الأوامر · التنبيهات

- [ ] INT-005: Integrate M04 - Products (list, editor, variants, dictionary, templates, sectors, images, stock, bulk)
- [ ] INT-006: Integrate M05 - Catalog Organization (categories, brands, tags, collections, badges)
- [ ] INT-007: Integrate M06 - Orders (list, detail, statuses, manual order, refunds, print)
- [ ] INT-008: Integrate M48 - Command Palette (aggregated search)
- [ ] INT-009: Integrate M49 - Notification Center (summary, list, read, read-all)

### 3E — إعدادات المتجر

- [ ] INT-010: Integrate M34 - Store Settings (identity, contact, policies, shipping, currency/FX, SEO, announcement, payments, multi-location)

**Checkpoint US1**: `/` → متجر → منتج → طلب مكتمل على Django بلا mocks.

---

## Phase 4: User Story 2 — المشتري يتصفح ويشتري (Priority: P1)

- [ ] INT-011: Integrate M09 - Storefront Home & Catalog Listing (config, sections, categories, search)
- [ ] INT-012: Integrate M10 - Product Detail Page (variants, reviews, related, bundles, personalization, slots)
- [ ] INT-013: Integrate M11 - Cart (cart actions, coupon, abandoned-cart phone capture)
- [ ] INT-014: Integrate M12 - Checkout (delivery/payment options, quote, OTP, place order, success)
- [ ] INT-015: Integrate M41 - Order Tracking
- [ ] INT-016: Integrate M44 - PWA (manifest, install event, push subscription)

**Checkpoint US2**: جلسة شراء كاملة على Django.

---

## Phase 5: User Story 3 — إدارة يومية على نطاق أوسع (Priority: P2)

- [ ] INT-017: Integrate M07 - Customers (list, profile, orders, wallet, points, wishlist, reviews, notes, COD, export, segments)
- [ ] INT-018: Integrate M08 - Theme Customizer (theme, presets, sections, announcement)
- [ ] INT-019: Integrate M13 - Marketing (coupons, offers, abandoned carts, campaigns, timeline, loyalty, gifting)
- [ ] INT-020: Integrate M14 - Payments & Merchant Wallet (gateways, payout accounts, wallet, withdrawals, dues)
- [ ] INT-021: Integrate M15 - Shipping (settings, delivery methods, pickup locations, providers, carriers, zones, packaging, edge cases)
- [ ] INT-022: Integrate M18 - Staff & Permissions (staff, roles, permissions, approvals, audit log, behavior alerts)
- [ ] INT-023: Integrate M19 - Domains & Integrations (domains, tracking pixels, webhooks, integration status)
- [ ] INT-024: Integrate M21 - Inventory (stock, movements, items, reservations, write-offs)
- [ ] INT-025: Integrate M22 - Locations (locations, location inventory, location staff, routing rules)
- [ ] INT-026: Integrate M24 - Returns & RMA (returns, RMA, refunds)
- [ ] INT-027: Integrate M25 - Reports (registry, report data, exports, schedules)
- [ ] INT-028: Integrate M35 - Customer Wallets & Loyalty Points
- [ ] INT-029: Integrate M42 - Wishlist & Reviews (storefront engagement, back-in-stock, store reviews)

**Checkpoint US3**: كل وحدة P2 تعمل على Django وحدها.

---

## Phase 6: User Story 4 — مالك المنصة (Priority: P2)

- [ ] INT-030: Integrate M20 - Platform Admin Console (stores, re-provisioning, feature overrides, deactivation, webhook events)
- [ ] INT-031: Integrate M45 - Platform Dues & Sharwa Pay Administration (dues actions, top-ups, withdrawals, wallets, Sharwa Ship zones)
- [ ] INT-032: Integrate M46 - Plans, Features & Subscriptions (plans, feature matrix, subscriptions, apps, billing settings, market categories)

**Checkpoint US4**: إعادة تجهيز متجر، تفعيل ميزة، قبول شحن محفظة، تحصيل مستحق — على Django.

---

## Phase 7: User Story 5 — القنوات والامتدادات المتقدمة (Priority: P3)

- [ ] INT-033: Integrate M16 - Point of Sale (registers, shifts, cash movements, OTP step-up)
- [ ] INT-034: Integrate M17 - Affiliates & Influencers
- [ ] INT-035: Integrate M23 - Suppliers & Purchase Orders
- [ ] INT-036: Integrate M26 - Bookings (services, availability, slots, holds)
- [ ] INT-037: Integrate M27 - Unified Inbox & Social Channels
- [ ] INT-038: Integrate M28 - Marketplaces (Amazon/Noon listings, sync jobs, orders)
- [ ] INT-039: Integrate M29 - Dropshipping (supplier connections, pricing rules, feeds, supplier orders)
- [ ] INT-040: Integrate M30 - App Store (catalog, installations, events, fees, WhatsApp)
- [ ] INT-041: Integrate M31 - Sharwa AI (status, settings, SSO)
- [ ] INT-042: Integrate M32 - Support (sessions, tickets)
- [ ] INT-043: Integrate M33 - Expenses
- [ ] INT-044: Integrate M36 - B2B Wholesale (B2B drafts/approvals, tier prices, haggling)
- [ ] INT-045: Integrate M37 - Advanced Products (bundles, compatibility, personalization, auctions/bids, serials, formula preview, CSV import/export)
- [ ] INT-046: Integrate M38 - Courier App (agent shipments, shifts, custody)
- [ ] INT-047: Integrate M39 - Sharwa Ship (shipments, AWB queue, rate cards, supervision)
- [ ] INT-048: Integrate M40 - Sharwa Pay (OTP login, wallet, top-up, withdrawal)
- [ ] INT-049: Integrate M43 - Multi-Store Rollup

**Checkpoint US5**: كل وحدة P3 تعمل على Django دون تضارب حالات مع M06/M21.

---

## Summary

| Phase | Priority | Modules | Tasks |
|---|---|---|---|
| 3 — US1 (3A–3E) | P1 | M01 M47 M03 M02 M04 M05 M06 M48 M49 M34 | INT-001 → INT-010 (10) |
| 4 — US2 | P1 | M09 M10 M11 M12 M41 M44 | INT-011 → INT-016 (6) |
| 5 — US3 | P2 | M07 M08 M13 M14 M15 M18 M19 M21 M22 M24 M25 M35 M42 | INT-017 → INT-029 (13) |
| 6 — US4 | P2 | M20 M45 M46 | INT-030 → INT-032 (3) |
| 7 — US5 | P3 | M16 M17 M23 M26–M33 M36–M40 M43 | INT-033 → INT-049 (17) |
| **Total** | | **M01–M49** | **49** |
