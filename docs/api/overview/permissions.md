# Permission keys and owner-only areas

> **Source**: DOC-028 · DOC-029 (owner-only sentences) · inventory A.5 · INT-010, INT-019, INT-022, INT-024, INT-026, INT-033, INT-035, INT-037, INT-038, INT-039, INT-042, INT-043
> **Code**: `products/services/permission_resolver.py` · `products/migrations/0144_seed_staff_rbac.py` and the later seeds (0159, 0172, 0174, 0178, 0182, 0186, 0194, 0200, 0210, 0235) · `api/views_*.py` (one gate per module) · `products/services/{staff_service,pos_service,behavior_service}.py`
> **Last verified against code**: 2026-10-27 (step 04; manager-role note confirmed against the full migration set in official Step 10)

A **permission key** (M18) is a dotted code such as `orders.view`. Staff members hold keys through roles; the owner holds all of them implicitly. This page lists the 36 seeded keys with the endpoints that check them, the four system roles, the role-based extras (POS discount ceiling, approver roles), and every owner-only sentence. Where the permission gate sits in the request chain is in [`conventions.md#gates`](conventions.md#gates). Plan features are a different gate: [`plan-features.md`](plan-features.md).

## 1. How a key is decided

| Step | Rule | Code |
|---|---|---|
| 1 | The owner session has no `request.staff`. `resolve_request_staff(request)` returns `None`, and every gate treats `None` as "allowed". Keys therefore only ever restrict **staff**. | `permission_resolver.resolve_request_staff` · `ProductsAPIMixin.can` |
| 2 | A staff member's keys are the **union** of the keys of every role in their active location assignments (`StaffLocationRole.is_active`), across **all** authorised locations. | `resolve_context` |
| 3 | Overrides (`PermissionOverride`) then apply on top: a grant adds a key, a revoke removes it. Only overrides with no location (global) apply, plus those for the location being evaluated. The evaluated location is the open POS shift's location, or the one requested. | `resolve_context` |
| 4 | A location the staff member is not assigned to is refused with `PermissionDenied` before any key is read. The location is never taken from the request on trust. | `resolve_context` |
| 5 | The route compares the result with the key it needs. A miss is `403` «ليست لديك صلاحية لهذا الإجراء.» (other sentences in [`conventions.md#gates`](conventions.md#gates)). | module mixin |

Things that follow:

- **Several keys on one route mean "any of"** (for example `orders.create_b2b` or `orders.update_status` on `POST orders/`), unless the table says otherwise.
- **A staff member cannot edit their own assignments or overrides** (`staff/<id>/assignments`, `overrides`): `403` «لا يمكنك تعديل تعييناتك أو استثناءات صلاحياتك بنفسك.»
- **System roles are read-only.** `is_system_role` roles cannot be edited or deleted from the API. A merchant who needs another combination creates a custom role.
- The effective set a staff member holds right now is `GET staff/<id>/effective-permissions/` (`staff.view`). The session payload `auth/me/` carries the same list in `staff.permissions` ([`auth.md`](auth.md)).

## 2. The keys

Group order follows the seed. "Seeded in" is the products-app migration; "Held by seeded roles" uses the role names from section 3. Routes are under `/api/v1/`.

### 2.1 Orders

| Key | Arabic name | Seeded in | Held by seeded roles | Endpoints that check it |
|---|---|---|---|---|
| `orders.view` | عرض الطلبات | 0144 | all four | `GET orders/`, `orders/counters/`, `orders/form-options/`, `orders/<pk>/`; `GET order-statuses/`; `GET shipping/edge-cases/`; every Sharwa Ship route under `shipping/` (sentence «ليست لديك صلاحية لعرض الشحنات.»); the orders section of `search/` |
| `orders.update_status` | تحديث حالة الطلب | 0144 | managers, كاشير | `PATCH orders/<pk>/`; `POST orders/<pk>/status/`, `fulfillment-status/`, `payment/<action>/`; `POST orders/` (with `orders.create_b2b`, either one); `order-statuses/*` writes; `POST shipments/<pk>/address/`; `POST orders/<pk>/convert-to-pickup/` |
| `orders.refund` | استرجاع مبلغ | 0144 | managers | `POST orders/<pk>/refunds/`; `GET orders/refunds/` (the refund log) |
| `orders.delete` | حذف طلب | 0144 | managers | **no route uses it** (section 5) |
| `orders.process_returns` | معالجة استرجاعات الفروع | 0159 | managers | `returns/`, `returns/<pk>/`, `returns/<pk>/approve/`, `returns/order/<id>/items/`, `returns/rma/*`. `warehouse/returns/scan/` and `warehouse/returns/<rma>/qa-decision/` also accept `inventory.adjust` (the storekeeper) |
| `orders.create_b2b` | إنشاء طلبات الجملة (B2B) | 0159 | managers | `POST orders/b2b-draft/`; `GET orders/b2b-drafts/` (with `orders.approve_b2b`, either one); `GET orders/b2b-options/` (either) |
| `orders.approve_b2b` | الموافقة على طلبات الجملة (B2B) | 0159 | managers | `POST orders/b2b-draft/<pk>/resolve/` |

### 2.2 Customers

| Key | Arabic name | Seeded in | Held by seeded roles | Endpoints |
|---|---|---|---|---|
| `customers.view` | عرض العملاء | 0144 | all except أمين مخزن | `customers/` (list, `segments/count/`, `<phone>/…` reads, notes read, write and delete); `customers/wallets/*` reads; `customers/loyalty-program/`; `loyalty/points/*`; the customers section of `search/`. Reads of a customer file by staff are counted for the behaviour alert (section 4.4) |
| `customers.edit_profile` | تعديل بيانات العميل | 0144 | managers | `POST customers/<phone>/cod/`; `PATCH reviews/<id>/`; `POST customers/wallets/` and `…/<id>/topup/` |
| `customers.manage_tier` | إدارة فئة العميل (VIP) | 0144 | managers | **no route uses it** (section 5) |
| `customers.export` | تصدير بيانات العملاء | 0144 | managers | `GET customers/export.csv`. Rate-limited per staff per day (section 4.4) |

### 2.3 Catalogue, inventory, discounts

| Key | Arabic name | Seeded in | Held by seeded roles | Endpoints |
|---|---|---|---|---|
| `catalog.manage` | إدارة الكتالوج (التصنيفات والعلامات والوسوم والتشكيلات والشارات) | 0210 | managers | writes on `categories/*`, `brands/*`, `tags/*`, `collections/*`, `badges/*`; product writes (`products/` POST, `products/<pk>/` PATCH and DELETE, `quick/`, `bulk/`, images, variants), `variant-attributes/*`, `product-templates/*`; `products/<pk>/tier-prices/*` writes; product extras writes (bundles, compatibility, personalization, auction, serials). Also lets a non-owner staff member write settings sections that are not owner-only (`«تعديل الإعدادات مقصور على المالك ومدير المتجر.»` for the others) |
| `inventory.view` | عرض المخزون | 0144 | managers, كاشير, أمين مخزن | `GET products/`, `products/<pk>/`, `products/<pk>/changes/`, `products/export/`; `GET tier-prices/`; product extras reads; `GET inventory/`, `counters/`, `movements/`, `items/`, `reservations/`, `writeoffs/`; `GET locations/<pk>/inventory/` |
| `inventory.adjust` | تعديل المخزون | 0144 | managers, أمين مخزن | `POST products/<pk>/stock/`; `POST inventory/adjustments/`; `POST locations/<pk>/inventory/adjust/`, `PATCH locations/<pk>/inventory/<unit>/`; also accepted by the warehouse return scan and QA decision |
| `inventory.writeoff` | إتلاف مخزون | 0144 | managers, أمين مخزن | `POST inventory/writeoffs/` (creates an approval request, see section 4.2) |
| `discounts.apply` | تطبيق خصم | 0144 | managers, كاشير | `GET promotions/summary/`, coupons and offers reads; POS discounts, bounded by `Role.max_discount_percent` (section 4.1) |
| `discounts.manage` | إدارة الخصومات | 0144 | managers | coupon and offer writes (`promotions/coupons/*`, `promotions/offers/*`); product discount fields (old price and discount period) on `products/`: «ليست لديك صلاحية تعديل الخصومات (السعر القديم وفترة التخفيض).» |

### 2.4 Reports

| Key | Arabic name | Seeded in | Held by seeded roles | Endpoints |
|---|---|---|---|---|
| `reports.view` | عرض التقارير | 0144 | managers, أمين مخزن | `GET push/stats/` only |
| `reports.export` | تصدير التقارير | 0144 | managers | `GET inventory/export.csv`; `reports/exports/*`, `reports/schedules/*`, `POST reports/<code>/exports/` |
| `reports.sales.view` | عرض تقارير المبيعات | 0172 | **no seed grant found** | `POST dashboard/overview/refresh/`, `POST reports/refresh-today/`; the permission code of every sales and finance report in the registry; `audit-log/` and `audit-log/verify/` (with `staff.view_sessions`, either one) |
| `reports.profit.view` | عرض صافي الربح والهامش | 0172 | **no seed grant found** | registry permission code of the profit report |
| `reports.customers.view` | عرض تقارير العملاء | 0172 | **no seed grant found** | registry permission code of customer reports (including abandoned carts) |
| `reports.inventory.view` | عرض تقارير المخزون | 0172 | **no seed grant found** | registry permission code of inventory reports |
| `reports.staff_performance.view` | عرض تقرير أداء الموظفين | 0174 | **no seed grant found** | registry permission code of the staff performance report |

The reports registry (`GET reports/`) lists each report with `has_permission`, `has_feature` and `visible`. A staff member only sees reports whose code they hold. See [`m25-reports.md`](../domains/15-reports/m25-reports.md).

### 2.5 Staff and approvals

| Key | Arabic name | Seeded in | Held by seeded roles | Endpoints |
|---|---|---|---|---|
| `staff.view` | عرض الموظفين | 0144 | managers | `GET staff/`, `counters/`, `<pk>/`, `assignments`, `overrides`, `effective-permissions`, `roster`; `GET permissions/`, `roles/`, `roles/<pk>/`; `GET approvals/` and the base gate of `POST approvals/<pk>/resolve/`; `behavior-alerts/*` |
| `staff.manage` | إدارة الموظفين (إنشاء/فصل) | 0144 | managers | `POST staff/`, `PATCH staff/<pk>/`, `terminate/`, `revoke-sessions/`, `reset-password/`, `PUT roster/`, tokens create and delete, `devices/<id>` delete. A holder can also resolve **any** approval (section 4.2) |
| `staff.manage_roles` | إدارة الأدوار والصلاحيات | 0144 | managers | `POST roles/`, `PATCH` and `DELETE roles/<pk>/` |
| `staff.manage_assignments` | إدارة إسنادات المواقع | 0144 | managers | `PUT staff/<pk>/assignments/`, `staff/<pk>/overrides/*`; `POST` and `DELETE locations/<pk>/staff/*` |
| `staff.view_sessions` | عرض جلسات الموظفين | 0144 | managers | `staff/<pk>/sessions/*`, `tokens/` list, `devices/` list; `audit-log/` (either with `reports.sales.view`) |

### 2.6 Procurement, expenses, support, channels

| Key | Arabic name | Seeded in | Held by seeded roles | Endpoints |
|---|---|---|---|---|
| `suppliers.manage` | إدارة الموردين وأوامر الشراء | 0178 | **no seed grant found** | writes on `suppliers/*` and `purchase-orders/*`; `POST purchase-orders/<pk>/<action>/` (either with `suppliers.approve`) |
| `suppliers.approve` | اعتماد/رفض أوامر الشراء | 0178 | **no seed grant found** | `POST purchase-orders/<pk>/<action>/` |
| `expenses.manage` | إدارة المصروفات التشغيلية | 0235 | managers | every route under `expenses/` (all methods) |
| `support.takeover_session` | استلام محادثات الدعم الفني | 0182 | managers | `POST support/sessions/<pk>/takeover/`, `release/`, `close/`, `messages/`: «ليست لديك صلاحية استلام جلسات الدعم.». `GET support/sessions/<pk>/` is open to any session and only reports `can_takeover` |
| `channels.inbox.access` | الوصول لصندوق وارد قنوات البيع | 0186 | managers | every `inbox/*` route; the integrations status rows for WhatsApp and the social channels; `GET channels/templates/` (the one channels route open to inbox members). The service then narrows the visible channels with `StaffChannelAccess` |
| `channels.marketplaces.manage` | إدارة الأسواق الإلكترونية (أمازون، نون) | 0194 | managers | every `marketplaces/*` route, checked **before** the plan feature |
| `channels.dropshipping.manage` | إدارة استيراد المنتجات والدروبشيبينغ | 0200 | managers | every `dropshipping/*` route, checked **before** the plan feature |

Routes with a `-` in the matrix scan that this page does not list (storefront, auth, notifications, settings reads, dues, payments, shipping, integrations, partners, apps, POS, console, Sharwa Pay) carry no permission key: they are session-only, owner-only (section 6) or enforced inside a service (POS, section 4.1).

> Every key above appears in `GET permissions/` with its name and category. The category strings are Arabic for the later seeds (`'الدعم الفني'`, `'قنوات البيع'`, `'المالية'`, `'المنتجات والكتالوج'`) and English identifiers for the first ones (`orders`, `staff`, …) in the database — but the API maps those identifiers to Arabic labels through `CATEGORY_LABELS` (`staff_service.py:49-52`), so `GET permissions/` always answers Arabic categories (corrected in official Step 08; see [`../../architecture/31-authorization.md`](../../architecture/31-authorization.md)).

## 3. System roles

Seeded by `0144` with `is_system_role = true` (read-only through the API):

| Role | Keys at seed time | `max_discount_percent` | Later grants |
|---|---|---|---|
| «مدير المتجر» | every key in the catalogue at that moment (the 20 keys of `0144`) | none (no ceiling) | `orders.process_returns`, `orders.create_b2b`, `orders.approve_b2b` (0159); `support.takeover_session` (0182); `channels.inbox.access` (0186); `channels.marketplaces.manage` (0194); `channels.dropshipping.manage` (0200); `catalog.manage` (0210); `expenses.manage` (0235) |
| «مدير الفرع» | same as above | 20 | same later grants |
| «كاشير» | `orders.view`, `orders.update_status`, `customers.view`, `inventory.view`, `discounts.apply` | 10 | none |
| «أمين مخزن» | `orders.view`, `inventory.view`, `inventory.adjust`, `inventory.writeoff`, `reports.view` | none | none |

The grants for `0159` and `0182`–`0235` are explicit `RolePermission` rows added by each migration. For the seven keys created by `0172`, `0174` and `0178` the migrations only add the `Permission` row.

> ⚠️ Discrepancy — migration comments (0159, 0186) describe «مدير المتجر» and «مدير الفرع» as holding the whole catalogue / they hold 29 of the 36 keys. `0144` copied the 20 keys that existed when it ran; `0159` and `0182`, `0186`, `0194`, `0200`, `0210`, `0235` add 9 more explicitly; **none of the 239 products migrations** grants `reports.sales.view`, `reports.profit.view`, `reports.customers.view`, `reports.inventory.view` (0172), `reports.staff_performance.view` (0174), `suppliers.manage` or `suppliers.approve` (0178) to a role, and no service or command syncs system roles with the catalogue (checked against the full repository in official Step 10; an earlier version of this note said only 19 migrations were reviewed). A staff member with a manager role is therefore refused at `reports/refresh-today/`, the sales reports, and the supplier and purchase-order writes until the owner creates a custom role that carries the keys (system roles cannot be edited).

## 4. Role-based extras

### 4.1 POS discount ceiling and approver roles

- `Role.max_discount_percent` is the ceiling for a cashier's discount in the POS. `NULL` means no ceiling. For a staff member the ceiling is the **highest** value among their roles that grant `discounts.apply` at the register's locations, and `NULL` wins over any number (`pos_service.discount_ceiling`). A staff member with no such role has a ceiling of `0.00`. The owner has no ceiling.
- A discount above the ceiling needs an approval. Either the cashier sends `manager_code` (the store's POS manager code, checked against a hash; an approved `discount_exception` request is recorded on the spot), or the POS creates a pending `discount_exception` approval request (`pos/discount-approvals/`) addressed to the approver role: `APPROVER_ROLE_NAMES = ('مدير الفرع', 'مدير المتجر')`, the first one that exists and is active. Without any of them: 400 «لا يوجد دور «مدير الفرع» لاعتماد الطلب — أعده من صفحة الأدوار.» Five wrong manager codes lock the register for 15 minutes (429, see [`rate-limits.md`](rate-limits.md)).
- `pos/shifts/<pk>/resolve-variance/` (cash shortage on closing a shift): allowed for the owner, for `staff.manage`, or for a holder of «مدير الفرع» or «مدير المتجر» at one of the POS locations. Otherwise 403 «حلّ فرق الوردية لمدير الفرع أو مالك المتجر.» Also 403 «هذه الوردية في موقع لست معيَّناً عليه.» and «لا يمكنك اعتماد عجز ورديتك.». POS routes carry no permission key: all of this is inside `pos_service`.
- Max discount values are edited through `roles/` (`max_discount_percent` between 0 and 100, error «النسبة بين 0 و100.»).

### 4.2 Approval requests

Approval requests (`ApprovalRequest`, M18) come from write-offs (`stock_writeoff`), purchase orders (`po_approval`), B2B drafts (`order_approval`), POS shortages (`shift_shortage`) and discount exceptions. Each one names an `approver_role`.

`POST approvals/<pk>/resolve/` needs `staff.view` at the route, then:

| Rule | Result |
|---|---|
| Owner, or a holder of `staff.manage` | may resolve any approval |
| Otherwise the staff member must hold the request's approver role, at the request's location (any location when the request has none) | else 403 «الحسم لحامل دور «<role>» في هذا الموقع أو للمالك.» |
| The request is already decided | 409 «حُسم الطلب من مستخدم آخر.» `{version, status}` |
| `version` differs from the current one | 409 «حُسم الطلب من مستخدم آخر.» `{version}` |
| The requester is the resolver | 403 «لا يمكنك الموافقة على طلبك.» |
| `decision` is not `approved` or `rejected` | 400 `decision` error |
| `rejected` without `note` | 400 `note` «الملاحظة مطلوبة عند الرفض.» |

Conflict shapes are in [`conflicts.md`](conflicts.md).

### 4.3 Sensitive keys

`reports.profit.view` and `reports.staff_performance.view` are labelled "sensitive" in their seed names: they reveal margins and individual performance. They are separate from `reports.sales.view` so that the owner can give a manager sales numbers without profit.

### 4.4 Behaviour limits tied to keys

`behavior_service` counts what each staff member does per day:

| Action | Alert at | Hard limit | Effect |
|---|---|---|---|
| `customers.export` | 1000 rows (level `critical`) | 5000 rows | the export route answers `429` «تجاوزت حدّ التصدير اليومي، راجع مدير المتجر.» for the rest of the day, once either a critical alert exists today or the hard limit is reached |
| `customers.view` | 5000 file views (level `warning`) | none | a `BehaviorAlert` for the owner |
| `message.send` | 200 messages (level `warning`) | 500 | defined in `ALERT_THRESHOLDS` and `HARD_LIMITS`, but **no `/api/v1` route records it today**, so it never fires |

Alerts are read at `GET behavior-alerts/` (`staff.view`). The owner is never counted. These limits are repeated in [`rate-limits.md`](rate-limits.md).

## 5. Keys no route uses

| Key | Evidence |
|---|---|
| `orders.delete` | seeded in `0144`, held by the managers, referenced by no `api/` route, service or legacy view |
| `customers.manage_tier` | same |

Code comments in several modules still say "35 keys" (the count before `expenses.manage`). The seeded count is **36** distinct keys: 20 (`0144`) + 3 (`0159`) + 5 (`0172`, of which `reports.export` is already in `0144`, so 4 new) + 1 (`0174`) + 2 (`0178`) + 1 each for `0182`, `0186`, `0194`, `0200`, `0210`, `0235`. That is 20 + 3 + 4 + 1 + 2 + 6 = **36**.

> ⚠️ Discrepancy — roadmap lists 29 keys / the code seeds 36. The roadmap omits seven: `orders.delete`, `customers.manage_tier`, `customers.export`, `reports.profit.view`, `reports.customers.view`, `reports.inventory.view`, `reports.staff_performance.view`. Two of them (`orders.delete`, `customers.manage_tier`) are seeded but never checked (section 5); the other five are checked.

<a id="owner-only"></a>
## 6. Owner-only areas

An owner-only route refuses any request where `resolve_request_staff` is not `None`, whatever keys the staff member holds. The sentence is per area and verbatim from code; clients can show it as is.

| Area (routes) | Sentence | Notes |
|---|---|---|
| Storefront design: `store/theme/`, `store/announcement/`, `admin/sections/*` | «تصميم المتجر مقصور على مالك المتجر.» | owner check runs **before** the plan feature |
| Shipping: `shipping/*` settings, delivery methods, carriers, providers, pickup points, zones | «إعدادات الشحن مقصورة على مالك المتجر.» | owner before feature |
| Payments and merchant wallet: `payments/*`, `store/payments/`, `wallet/*` | «المدفوعات والمحفظة مقصورة على مالك المتجر.» | owner before feature |
| Locations writes: `locations/` POST, `<pk>/` PATCH, `mode/`, `routing-rules/*` | «إدارة المواقع مقصورة على مالك المتجر.» | reads are open to any session; inventory and staff sub-routes use keys |
| Partners: `affiliates/*`, `influencers/*` writes | «إدارة المسوّقين والمؤثرين ومستحقاتهم لمالك المتجر.» | reads need only the feature |
| Channels settings: `channels/*` (connect, keywords, templates writes, sync, TikTok mapping, staff access) | «إعدادات القنوات لمالك المتجر فقط.» | the owner flag is waived for `channels.inbox.access` holders on `GET channels/templates/` only |
| Apps and Sharwa AI writes: install, activate, deactivate, settings `PUT`, reconnect, `console-token` | «إدارة التطبيقات لمالك المتجر فقط.» | reads need only the feature |
| Sharwa Ship writes and supervision: `shipping/*` mutating routes | «هذا الإجراء مقصور على مالك المتجر.» | after `orders.view` |
| Multi-store rollup: `merchant/stores/` | «هذه الصفحة لمالك المتجر فقط.» | answers **before** the session check |
| Push test: `push/test/` | «إرسال الإشعارات لكل المشتركين للمالك وحده.» | |
| Domains, webhooks, tracking: `domains/*`, `webhooks/*`, `store/tracking/` | «النطاقات مقصورة على مالك المتجر.» / «أدوات التتبع مقصورة على مالك المتجر.» / one sentence per `what` (`f'{what} مقصورة على مالك المتجر.'`) | feature first, then owner |
| Marketing: abandoned carts, campaigns, timeline, loyalty program, gift settings | «السلات المتروكة مقصورة على مالك المتجر.» · «الحملات مقصورة على مالك المتجر.» · «الجدول الزمني مقصور على مالك المتجر.» · «إعدادات نقاط الولاء مقصورة على مالك المتجر.» · «إعدادات الإهداء مقصورة على مالك المتجر.» · default «هذه الأداة للمالك وحده.» | coupons and offers are **not** owner-only: they use `discounts.*` |
| Store settings sections `shipping`, `currency`, `payments` (and `multi-location`) | «هذا الإعداد يحتاج صلاحية مالك المتجر.» | the other sections need `catalog.manage` for staff («تعديل الإعدادات مقصور على المالك ومدير المتجر.»). The section table is in [`plan-features.md`](plan-features.md#35-store-settings) |
| Platform console (public schema) | «هذا الإجراء لمالك المنصة فقط.» | platform owner, not store owner |

Courier routes `agent/*` are the opposite case: the owner gets `403` there, and only a staff session whose shipping provider profile is a delivery agent passes ([`m38-courier-app.md`](../domains/11-shipping/m38-courier-app.md)).

## 7. For callers

| You get | Meaning | Client behaviour |
|---|---|---|
| `403` «ليست لديك صلاحية لهذا الإجراء.» | a key is missing | hide the action. Do not retry |
| `403` owner sentence | owner-only area | show the sentence. No key fixes it |
| `403` + a plan sentence | plan feature, not a key | see [`plan-features.md`](plan-features.md) |
| `429` «تجاوزت حدّ التصدير اليومي…» | behaviour limit (section 4.4) | disable export until tomorrow |
| `404` where you expected `403` | a service hides rows the staff member's channels or locations do not cover | treat as not found |

See [`errors.md`](errors.md) for how the BFF maps these.
