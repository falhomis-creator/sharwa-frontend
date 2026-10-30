# Locations API — M22 (المواقع والمستودعات والفروع)

> **Source**: DOC-175, DOC-176, DOC-177 (Step 23) · DOC-178, DOC-179, DOC-180 (Step 24) · INT-025 (M22), INT-024 (M21), INT-022 (M18), INT-010 (M34) · inventory Domain 10
> **Live key**: `locations` (`SHARWA_LIVE_MODULES`) — every `src/app/api/bff/locations/**` handler is `liveOrMock(request, "locations", "/api/v1/locations/…", …)`; **missing from `.env.example:79`**
> **Django provider**: `sharwa_saas/api/views_locations.py` (`LocationsAPIMixin`, 14 URL patterns) · `sharwa_saas/products/services/location_service.py` · mode switch `products/services/settings_service.py` (`set_multi_location`) · stock writes `products/services/inventory_service.py` (`adjust`) · model `products/models/locations.py` · migration `products/0226_locations_api`
> **Frontend contract**: `sharwa-frontend/src/features/locations/schemas.ts` · hooks `src/features/locations/api.ts` · fixtures `src/mocks/locations/state.ts`, `src/mocks/locations/inventory.ts` · owner guard `src/app/api/bff/locations/_guard.ts`
> **Tests**: `sharwa_saas/api/test_locations_api.py` (7) · mock E2E `scripts/locations-check.ts`
> **Last verified against code**: 2026-10-27 (step 24)

<a id="overview"></a>

## 1. Overview

M22 manages the store's **locations**: warehouses, branches, pickup points and lockers, vehicles, 3PL warehouses and dropship suppliers. It also holds the multi-location switch, the stock rows per location, staff assignments and order-routing rules. Before INT-025 these existed only as HTML screens (`products/views/locations.py`: list / form / toggle / mode, location inventory, staff, routing rules). Since INT-025, `api/views_locations.py` exposes **14 URL patterns** over `location_service.py`.

A location is described by eight capability **flags** and an **ownership** model. Its human label `display_type` is **computed by the server** from those (FR-22.02), and the UI never derives it. When **multi-location mode** is on, the `LocationInventory` rows become the stock source of truth ([m21-inventory.md › overview](m21-inventory.md#overview)).

Callers are the owner or a staff member on the store host. **Defining** locations, routing and the mode is owner-only. **Reading** is open to any session; the location stock endpoints use the M21 inventory keys.

<a id="access"></a>

## 2. Access — gate chain

`LocationsAPIMixin.check(request, permission)` (`views_locations.py:48`):

| # | Gate | Requirement | Failure |
|---|---|---|---|
| 1 | Session | owner session or a resolved staff member | `401` `{"detail": "انتهت جلستك، سجّل الدخول مجدداً."}` |
| 2 | Plan feature | `multi_location` (the same decision as `require_feature('multi_location')` on the legacy screens) | `403` `{"detail": "هذه الميزة غير متاحة في باقتك الحالية"}` |
| 3a | Owner-only | writes on locations, mode and routing rules: any **staff** session is refused | `403` `{"detail": "إدارة المواقع مقصورة على مالك المتجر."}` |
| 3b | Permission key | location stock: `inventory.view` (read) / `inventory.adjust` (writes); assignments: `staff.manage_assignments` | `403` `{"detail": "ليست لديك صلاحية لهذا الإجراء."}` |
| — | none | list, detail, deactivation impact, staff options, assignment list, rule list, preview | any session |

There is no `locations.*` permission key among the 35 (M22 §2), which is why definitions are owner-only.

`multi_location` is one of the five features that are **off for every store** until the platform adds a `TenantFeatureOverride` ([plan features](../../overview/plan-features.md)). The plan feature (gate 2) is separate from the store's **mode** (`StoreSetting.multi_location_enabled`, [§4.3](#mode)). The feature opens the API; the mode decides where stock lives.

`test_feature_and_owner_only` asserts:

- no session ⇒ `401`
- feature off ⇒ `403`
- staff `POST locations/` ⇒ `403` «إدارة المواقع مقصورة على مالك المتجر.»
- staff `GET locations/` ⇒ `200`

<a id="summary"></a>

## 3. Endpoint summary

| Method | Django path (`/api/v1/…`) | BFF path (`/api/bff/…`) | Purpose | Gate after feature | DOC |
|---|---|---|---|---|---|
| `GET` | `locations/` | `locations` | list, parents first | any session | 175 |
| `POST` | `locations/` | `locations` | create | owner | 175 |
| `POST` | `locations/mode/` | `locations/mode` | multi-location on / off | owner | 175 |
| `GET` | `locations/staff-options/` | `locations/staff-options` | staff picker | any session | 175 |
| `GET` · `PATCH` | `locations/<pk>/` | `locations/[id]` | detail · update | any · owner | 176 |
| `GET` | `locations/<pk>/deactivation-impact/` | `locations/[id]/deactivation-impact` | what deactivating would strand | any session | 176 |
| `GET` | `locations/<pk>/inventory/` | `locations/[id]/inventory` | stock rows at the location | `inventory.view` | 177 |
| `POST` | `locations/<pk>/inventory/adjust/` | `locations/[id]/inventory/adjust` | adjust stock here | `inventory.adjust` | 177 |
| `PATCH` | `locations/<pk>/inventory/<unit>/` | `locations/[id]/inventory/[unit]` | reorder point / quarantine | `inventory.adjust` | 177 |
| `GET` · `POST` | `locations/<pk>/staff/` | `locations/[id]/staff` | assignments | any · `staff.manage_assignments` | 178 |
| `DELETE` | `locations/<pk>/staff/<aid>/` | `locations/[id]/staff/[aid]` | remove assignment | `staff.manage_assignments` | 178 |
| `GET` · `POST` | `locations/routing-rules/` | `locations/routing-rules` | rules | any · owner | 179 |
| `PATCH` · `DELETE` | `locations/routing-rules/<pk>/` | `locations/routing-rules/[id]` | edit / delete rule | owner | 179 |
| `POST` | `locations/routing-rules/reorder/` | `locations/routing-rules/reorder` | reorder | owner | 179 |
| `GET` | `locations/routing-rules/preview/` | `locations/routing-rules/preview` | which location a rule picks | any session | 179 |

M34 `settings/multi-location/` (`api/urls.py:187`) calls the same `settings_service.set_multi_location`.

<a id="list-create-mode"></a>

## 4. List, create, mode switch and staff options (DOC-175)

<a id="list"></a>

### 4.1 `GET /api/v1/locations/` — any session

`svc.list_locations(params, multi_enabled=…)` (`location_service.py:202`).

| Query | Rule |
|---|---|
| `q` | Arabic-normalized (`normalize_arabic`) substring of `name`, `code` or `city` |
| `flag` | one of the eight flags below; keeps locations where that flag is `true`. Other values are ignored |
| `ownership` | exact `ownership_model` (`owned`, `franchise`, `third_party_3pl`, `dropship_supplier`) |
| `is_active` | `true` / `false`; other values: no filter |

**Ordering.** All locations are read in `(sort_order, id)` order. Then, for each **parent** (a location with no `parent_location`), the parent is emitted followed **immediately by its direct children**. Locations whose parent is itself a child (deeper levels) are appended at the end. Filters apply after ordering, and the list is **not paginated**.

```json
{
  "count": 3,
  "multi_location_enabled": false,
  "results": [
    { "id": 1, "code": "WH-01", "name": "المستودع", "city": "الرياض", "display_type": "مستودع مغلق", "ownership": "owned",
      "is_active": true, "parent_location": null,
      "flags": { "stores_inventory": true, "ships_to_customer": true, "is_transient": false, "is_mobile": false,
                 "is_virtual": false, "serves_walk_in_customers": false, "has_pos_terminal": false, "is_pickup_point": false },
      "products_count": 1 },
    { "id": 3, "code": "PUDO-1", "name": "خزانة", "city": "", "display_type": "نقطة استلام", "ownership": "owned",
      "is_active": true, "parent_location": 1, "flags": { "is_pickup_point": true, "…": false }, "products_count": 0 },
    { "id": 2, "code": "3PL-DMM", "name": "دمام", "city": "", "display_type": "مستودع مشترك (3PL)", "ownership": "third_party_3pl",
      "is_active": false, "parent_location": null, "flags": { "…": false }, "products_count": 0 }
  ]
}
```

(`test_list_order_filters_and_counts`: the order is `WH-01, PUDO-1, 3PL-DMM`; `?flag=is_pickup_point` ⇒ 1; `?is_active=false` ⇒ the 3PL; `?q=wh-01` ⇒ 1.)

| Field | Meaning |
|---|---|
| `display_type` | `Location.display_type` (see [§5.3](#display-type)) |
| `ownership` | `Location.ownership_model` |
| `parent_location` | parent id or `null` |
| `flags` | the eight booleans `stores_inventory`, `ships_to_customer`, `is_transient`, `is_mobile`, `is_virtual`, `serves_walk_in_customers`, `has_pos_terminal`, `is_pickup_point` |
| `products_count` | **distinct products** with a `LocationInventory` row at this location whose `quantity_on_hand > 0` |
| `multi_location_enabled` | the store's mode, `StoreSetting.multi_location_enabled` |

<a id="create"></a>

### 4.2 `POST /api/v1/locations/` — owner only → `201`

`svc.create_location(body)` validates with the same `_validate` as `PATCH` ([§5.2](#fields)). On create, `name` and `code` are always checked, even when they are absent. All errors are returned together in one `400` (for example `{"code": […], "latitude": […], "name": […]}`). The location and its conditional sections are created in one transaction, and the response is the **detail** object of [§5.1](#detail).

A staff session gets `403` «إدارة المواقع مقصورة على مالك المتجر.» from Django. In mock mode, `ownerOnly()` in `src/app/api/bff/locations/_guard.ts` returns the same sentence.

<a id="mode"></a>

### 4.3 `POST /api/v1/locations/mode/` — owner only

`LocationModeView` (`views_locations.py:91`) calls the M34 service `settings_service.set_multi_location(body)` (`settings_service.py:348`), then returns the new mode.

**Request body**

| Field | Type | Required | Rule |
|---|---|---|---|
| `enabled` | boolean | yes | must be a JSON boolean; otherwise `400` `{"enabled": ["قيمة غير صالحة."]}` |
| `merge` | boolean | no | `true` confirms merging spread stock when turning the mode **off** |

**Response `200`**: `{"multi_location_enabled": true}`.

**409 contract.** The refusal applies only when turning the mode **off** (`enabled: false`) while it is on and `merge` is not `true`. The service calls `location_stock_conflicts()`, which lists locations holding stock (`quantity_on_hand > 0`) with their count of distinct products, ordered by location name. If **more than one** location holds stock, the answer is:

```json
{
  "detail": "يوجد مخزون في أكثر من موقع؛ الإيقاف يجعل مخزون كل منتج رقماً واحداً (مجموع المواقع).",
  "conflicts": [
    { "location": "A-1", "products_with_stock": 1 },
    { "location": "B-1", "products_with_stock": 1 }
  ]
}
```

with status `409`. Sending the same request with `"merge": true` commits the change. Turning the mode **on** is never refused.

> ⚠️ Discrepancy — roadmap says "409 + `conflicts` unless `merge`" / code returns `409` only when turning the mode **off**, and only when stock sits in **more than one** location (`settings_service.py:353-359`). Turning it on, or off with stock in a single location, always succeeds. Reported in step 23.

**Side effects.** Only `StoreSetting.multi_location_enabled` (and `updated_at`) is written (`_commit`). The service creates or deletes no `LocationInventory` row and does not merge stock itself. With the mode off, the mirror signal stops, and stock reads and writes go back to `Product` / `ProductVariant.stock`, which keeps whatever value the last mirror wrote. `test_mode_toggle_with_conflicts` checks on → `{multi_location_enabled: true}`; off with two stocked locations → `409`; off with `merge: true` → `false`.

<a id="staff-options"></a>

### 4.4 `GET /api/v1/locations/staff-options/` — any session

`svc.staff_options()` (`:566`) returns a bare **array** (no envelope) of active staff members, ordered by `full_name` then `id`:

```json
[ { "id": 2, "full_name": "سارة الحربي", "phone": "9677XXXXXXXX" }, { "id": 3, "full_name": "خالد المطيري", "phone": "9677XXXXXXXX" } ]
```

It only filters `StaffMember.is_active = true`; it does not check whether the member already has an assignment. It feeds the assignment picker of [§7](#staff). The mock returns the fixed `STAFF_OPTIONS` list (`src/mocks/locations/state.ts:185`).

<a id="detail-update"></a>

## 5. Detail, update and deactivation impact (DOC-176)

<a id="detail"></a>

### 5.1 `GET /api/v1/locations/<pk>/` — any session · `PATCH` — owner only

`svc.get_location(pk)` / `svc.patch_location(pk, body)` (`location_service.py:198`, `:448`). An unknown id gives `404` `{"detail": "الموقع غير موجود."}`. `PATCH` locks the row (`select_for_update`), validates **only the keys sent** (partial update), saves the fields, applies the conditional sections, and returns the detail.

**Detail object** = the list item of [§4.1](#list) plus:

```json
{
  "id": 7, "code": "BR-RUH-01", "name": "فرع الرياض", "city": "الرياض", "display_type": "فرع تجزئة", "ownership": "owned",
  "is_active": true, "parent_location": null, "flags": { "stores_inventory": true, "serves_walk_in_customers": true, "has_pos_terminal": true, "is_pickup_point": true, "…": false },
  "products_count": 0,
  "address_text": "شارع التحلية", "latitude": "24.6911", "longitude": "46.6855", "phone": "9677XXXXXXXX",
  "operating_hours": [
    { "weekday": 0, "opens_at": "09:00", "closes_at": "23:00", "is_closed": false },
    { "weekday": 5, "opens_at": null, "closes_at": null, "is_closed": true }
  ],
  "locker": { "provider": "QuickBox", "locker_code": "RUH-ML-17", "capacity": 24 },
  "franchise": null, "dropship_supplier": null, "vehicle": null,
  "external_refs": [ { "system": "wms", "ref": "RUH-1" } ],
  "created_at": "2026-10-25T10:00:00+03:00", "updated_at": "2026-10-25T10:00:00+03:00"
}
```

(`test_create_detail_roundtrip_and_sections`. The code is upper-cased from `br-ruh-01`, and `GET` returns exactly the `POST` response. Only two of the seven `operating_hours` rows are shown.)

| Field | Meaning |
|---|---|
| `latitude` / `longitude` | decimal **strings** (normalized, at least one decimal place, e.g. `"24.6911"`) or `null` |
| `operating_hours[]` | sorted by `weekday` (0 = الأحد … 6 = السبت). A closed day has `opens_at` / `closes_at` `null` |
| `locker` · `franchise` · `dropship_supplier` · `vehicle` | the type-specific section, or `null` when absent ([§5.2](#fields)) |
| `external_refs[]` | `Location.external_refs`, generic `[{system, ref}]` |

<a id="fields"></a>

### 5.2 Writable fields and their rules

| Field | Rule | Error |
|---|---|---|
| `name` | required on create, trimmed, ≤ 150 | «اسم الموقع مطلوب.» · «150 حرفاً على الأكثر.» |
| `code` | upper-cased; `^[A-Z0-9][A-Z0-9-]{1,19}$`; unique among locations | «الكود أحرف لاتينية وأرقام وشرطات (2–20).» · «هذا الكود مستخدم لموقع آخر.» |
| `address_text` · `city` · `phone` | trimmed, ≤ 2000 / 100 / 20 | f-string `{limit} حرفاً على الأكثر.` (rendered with 2000, 100 or 20) |
| `is_active` | `true` only when the JSON value is `true` | — |
| `parent_location` | `null` / `""` clears it; otherwise it must exist and must **not create a cycle** (`_creates_cycle` walks up from the new parent) | «الموقع الأب غير صالح.» |
| `latitude` · `longitude` | empty ⇒ `null`; a finite number with \|lat\| ≤ 90, \|lng\| ≤ 180; stored to 7 places | «خط العرض بين -90 و90.» · «خط الطول بين -180 و180.» |
| `flags` | an object; each of the eight flags is `true` only when sent as `true` (missing ⇒ `false`) | «الأعلام غير صالحة.» |
| `ownership` | one of `owned`, `franchise`, `third_party_3pl`, `dropship_supplier` | «الملكية غير صالحة.» |
| `external_refs` | a list; entries with an empty `system` or `ref` are dropped; `system` ≤ 50, `ref` ≤ 100 | — |

**Virtual ⇒ no coordinates.** When the location is (or becomes) `is_virtual`, `latitude` and `longitude` are forced to `null` on **every** write, whatever was sent.

<a id="sections"></a>

### 5.3 Type-specific sections — conditions and field mapping

Each section is written only when its key is **sent** in the body. When the section's trigger is off after the update, the section is **dropped** (its row deleted), whatever was sent (FR-22.03). The frontend `payloadFromForm` already omits hidden sections (`src/features/locations/schemas.ts:247`).

**Operating hours** — kept when `is_pickup_point` **or** `serves_walk_in_customers` is on; otherwise saved as `[]`. A write replaces every `LocationOperatingHours` row of the location.

| Contract (`operating_hours[]`) | Django `LocationOperatingHours` | Rule / error |
|---|---|---|
| `weekday` | `weekday` | int 0–6, no duplicates — «يوم غير صالح (0 = الأحد … 6 = السبت).» |
| `opens_at` · `closes_at` | `opens_at` · `closes_at` (`time`) | `HH:MM` unless closed — «أدخل الساعات بصيغة HH:MM أو علّم اليوم مغلقاً.» |
| `is_closed` | `is_closed` | closed ⇒ both times `null` |

**Locker** (`LockerDetails`) — trigger: `is_pickup_point`.

| Contract (`locker`) | Django `LockerDetails` | Rule |
|---|---|---|
| `provider` | `provider_name` (**new in `0226`**) | ≤ 100 |
| `locker_code` | `locker_code` (**new in `0226`**) | ≤ 50 |
| `capacity` | `compartment_count` | int; a negative value ⇒ «السعة رقم موجب.» (stored as `max(0, capacity)`) |

When `is_pickup_point` is off, the locker is deleted **unless the location is `is_transient`**. A legacy transit location without a pickup point keeps its locker, because the old Django screen tied lockers to `is_transient`.

**Franchise** (`FranchiseDetails`) — trigger: `ownership = franchise`.

| Contract (`franchise`) | Django `FranchiseDetails` | Rule |
|---|---|---|
| `franchisee_name` | `franchisee_name` | ≤ 150 |
| `contract_ends_at` | `contract_end` | ISO date (first 10 characters); invalid ⇒ «تاريخ نهاية العقد غير صالح.»; empty ⇒ `null` |
| — | `contract_start` | set to **the creation day** (`timezone.localdate()`) when the row is first created; never exposed or changed by the API |

**Dropship supplier** (`DropshipSupplierDetails`) — trigger: `ownership = dropship_supplier`. `contact` is stored in a **different column per channel**:

| `channel` | `contact` stored in | Rule / error |
|---|---|---|
| `whatsapp` | `supplier_contact_phone` | ≤ 20 — «رقم واتساب 20 خانة على الأكثر.» |
| `email` | `supplier_email` | ≤ 150 |
| `api_webhook` | `api_endpoint_url` | must start with `http://` or `https://` — «رابط الـ Webhook يبدأ بـ http:// أو https://» |
| other | — | «قناة التواصل غير صالحة.» |

`channel` is stored in `forward_method`. `supplier_contact_name` defaults to the location name. On read, an unknown `forward_method` is shown as `whatsapp`, and the contact is read back from the channel's column.

**Vehicle** (`VehicleDetails`) — trigger: `is_mobile`.

| Contract (`vehicle`) | Django `VehicleDetails` | Rule |
|---|---|---|
| `plate_number` | `plate_number` | ≤ 30 |
| `driver_phone` | `driver_phone` (**new in `0226`**) | ≤ 20. On read, an empty value **falls back to the linked driver's phone** (`driver.phone`) |

**Virtual** — `is_virtual` has no section: coordinates are forced to `null` ([§5.2](#fields)).

**External references** — `Location.external_refs` (**new in `0226`**, JSON list `[{system, ref}]`) is a generic list for any system. It is **separate from** the 3PL snapshot model `LocationExternalRef` (`products/models/locations.py:645`), which the API neither reads nor writes.

`test_create_detail_roundtrip_and_sections` checks these cases:

- the locker round trip
- turning off the pickup point and walk-in flags deletes the locker and the hours (`display_type` → «مستودع مغلق»)
- an `email` supplier stores `supplier_email` and drops coordinates (`is_virtual`)
- `contract_ends_at` round-trips
- a vehicle shows «مركبة متنقلة»
- making a location the child of its own child gives «الموقع الأب غير صالح.»

<a id="display-type"></a>

### 5.4 `display_type` — computed by Django

`display_type` is the `Location.display_type` property (`products/models/locations.py:120`). It is a read-only label: the first matching rule wins.

| # | Condition | `display_type` |
|---|---|---|
| 1 | `ownership = dropship_supplier` | «مورد دروبشيبينج» |
| 2 | `is_mobile` | «مركبة متنقلة» |
| 3 | `ownership = third_party_3pl` | «مستودع مشترك (3PL)» |
| 4 | `is_transient` and not `ships_to_customer` | «خزانة / PUDO» |
| 5 | `stores_inventory` + `ships_to_customer` + `serves_walk_in_customers` + `has_pos_terminal` | «موقع هجين» |
| 6 | `stores_inventory` + `ships_to_customer`, not `serves_walk_in_customers` | «مستودع مغلق» |
| 7 | `serves_walk_in_customers` + `has_pos_terminal` | «فرع تجزئة» |
| 8 | `is_pickup_point` | «نقطة استلام» |
| 9 | otherwise | «موقع» |

The mock's `displayType()` (`src/mocks/locations/state.ts:157`) is now a **verbatim port** of this property. Its earlier derivation had drifted.

<a id="deactivation-impact"></a>

### 5.5 `GET /api/v1/locations/<pk>/deactivation-impact/` — any session

`svc.deactivation_impact(pk)` (`:461`) tells the UI what deactivating the location would strand (FR-22.08). It changes nothing.

```json
{ "on_hand_total": "17.000", "open_fulfillments": 0 }
```

| Field | Meaning |
|---|---|
| `on_hand_total` | sum of `LocationInventory.quantity_on_hand` at the location (three places) |
| `open_fulfillments` | count of `Fulfillment` rows at the location with status `pending`, `preparing` or `ready_for_pickup` |

The roadmap's "ready" is the `Fulfillment` status value `ready_for_pickup` (`OPEN_FULFILLMENT`, `location_service.py:60`). An unknown id gives `404` «الموقع غير موجود.».

Deactivating is a normal `PATCH {"is_active": false}`. Django does **not** refuse it when stock or open fulfillments remain; the impact route only informs the confirmation dialog.

<a id="location-inventory"></a>

## 6. Location inventory (DOC-177)

These three routes pass the M22 gates (session → `multi_location`) and then the **M21 inventory keys**. They are not owner-only.

### 6.1 `GET /api/v1/locations/<pk>/inventory/` — `inventory.view`

`svc.list_location_inventory(pk, params)` (`location_service.py:497`) lists the location's `LocationInventory` rows, joined to the product and variant names. Rows that have neither a product nor a variant are skipped.

| Query | Rule |
|---|---|
| `q` | Arabic-normalized substring of the product name, **or** a case-insensitive substring of the SKU |
| `below_reorder` | `true` keeps only rows below their reorder point |
| `page` · `page_size` | page ≥ 1; size default 50, clamped to **1…100** |

**Ordering**: rows **below their reorder point first**, then by normalized name, then by `variant_id`.

```json
{
  "count": 2,
  "results": [
    { "product_id": 22, "variant_id": null, "name": "عسل", "variant_label": null, "sku": "SHW-0022", "unit": "piece",
      "on_hand": "2.000", "reserved": "1.000", "quarantine": "0.000", "available": "1.000", "reorder_point": "3.000", "below_reorder": true },
    { "product_id": 21, "variant_id": null, "name": "قهوة", "variant_label": null, "sku": "C-1", "unit": "piece",
      "on_hand": "20.000", "reserved": "0.000", "quarantine": "0.000", "available": "20.000", "reorder_point": "5.000", "below_reorder": false }
  ]
}
```

(`test_location_inventory_rows_patch_and_adjust`. The honey's SKU is auto-generated by `Product.save()`.)

| Field | Meaning |
|---|---|
| `available` | `quantity_on_hand − quantity_reserved − quarantine_quantity` |
| `reorder_point` | the row's `reorder_point`; when `NULL` it **falls back to the product's `low_stock_threshold`** (and to `3` when that is also unset) |
| `below_reorder` | `available < reorder_point` (strict) |

### 6.2 `POST /api/v1/locations/<pk>/inventory/adjust/` — `inventory.adjust`

`LocationInventoryAdjustView` (`views_locations.py:122`):

1. It returns `404` «الموقع غير موجود.» when `<pk>` does not exist.
2. It calls **`inventory_service.adjust({...body, 'location_id': pk}, actor=…)`**. Any `location_id` in the body is overwritten.

The body, the response `{stock, location_stock, movement_id, quantity_available}`, the error list, the ledger row and the locking are exactly those of [M21 › stock adjustments](m21-inventory.md#adjustments). In practice this route needs multi-location **mode** on and an existing row for the unit at this location. With the mode off, `adjust` ignores `location_id` and writes catalog stock.

Example from the test: coffee at 20 on hand, 2 in quarantine. The body `{"product_id": 21, "delta": "-5", "reason": "manual_adjust", "note": "تالف"}` returns `location_stock "15.000"` and `quantity_available "13.000"`. `locations/999999/inventory/adjust/` returns `404`.

<a id="location-row"></a>

### 6.3 `PATCH /api/v1/locations/<pk>/inventory/<unit>/` — `inventory.adjust`

`svc.patch_location_row(pk, unit, body)` (`location_service.py:531`) sets a unit's **reorder point** and **quarantine** at one location. It never changes `quantity_on_hand` and writes no `StockMovement`.

**Unit-key grammar** (`UNIT_RE = ^(p|v)(\d+)(?:-(\d+))?$`, `_parse_unit`):

| `<unit>` | Meaning | Example |
|---|---|---|
| `p<pid>` | the product itself (a product without variants) | `p21` → product 21, no variant |
| `v<vid>-<pid>` | variant `vid` of product `pid` | `v8-43` → variant 8 of product 43 |
| `v<vid>` (no product part) | refused | `v8` → `404` |
| anything else | refused | `x1` → `404` |

Refusals: a malformed key gives `404` `{"detail": "الوحدة غير معروفة."}`. An unknown location, product or variant gives `404` «الموقع غير موجود.», «المنتج غير موجود.» or «المتغير غير موجود.».

**Request body** — both fields optional; only the keys sent are changed:

| Field | Type | Rule |
|---|---|---|
| `reorder_point` | decimal string | `^\d{1,9}(\.\d{1,3})?$` (no sign) — else `{"reorder_point": ["رقم حتى 3 خانات عشرية."]}` |
| `quarantine_quantity` | decimal string | same pattern — else `{"quarantine_quantity": ["رقم حتى 3 خانات عشرية."]}` |

**Rules**

- **Creates the row when missing.** When the location has no `LocationInventory` row for the unit, one is created with on-hand `0`, and `reorder_point` is seeded from the product's `low_stock_threshold` (default `3`). The PATCH is the way to place a new product at a location. The row is locked with `select_for_update` when it exists.
- **Quarantine cap.** After applying the body, `on_hand − reserved − quarantine` must stay `≥ 0`, so quarantine may not exceed **on-hand − reserved**. Otherwise the answer is `400` `{"quarantine_quantity": ["الحجر يتجاوز الكمية الفعلية."]}`. On a freshly created row (on-hand 0), any quarantine above 0 is therefore refused.
- Saving the row fires the mirror signal when multi-location mode is on. The mirror uses `on_hand − reserved` and does not subtract quarantine ([m21-inventory.md › open items](m21-inventory.md#open-items)).

**Response `200`** — the row view of [§6.1](#location-inventory), plus two aliases:

```json
{ "product_id": 21, "variant_id": null, "name": "قهوة", "variant_label": null, "sku": "C-1", "unit": "piece",
  "on_hand": "20.000", "reserved": "0.000", "quarantine": "2.000", "available": "18.000",
  "reorder_point": "8.000", "below_reorder": false,
  "quantity_on_hand": "20.000", "quantity_available": "18.000" }
```

Examples from `test_location_inventory_rows_patch_and_adjust`:

| Request | Result |
|---|---|
| `PATCH …/inventory/p21/` `{"reorder_point": "8", "quarantine_quantity": "2"}` | `200`, `reorder_point "8.000"`, `quarantine "2.000"`, `quantity_available "18.000"` |
| `PATCH …/inventory/p21/` `{"quarantine_quantity": "30"}` (on-hand 20) | `400` `{"quarantine_quantity": ["الحجر يتجاوز الكمية الفعلية."]}` |
| `PATCH …/inventory/x1/` `{}` | `404` |

The location inventory tab always builds the key as `v${variant_id}-${product_id}` or `p${product_id}` (`src/features/locations/components/location-inventory-tab.tsx:136-137`). The mock route (`src/app/api/bff/locations/[id]/inventory/[unit]/route.ts`) uses the same regex and answers «الوحدة غير معروفة.» when the key does not match it.

> ⚠️ Discrepancy — roadmap gives the grammar `p<pid>` | `v<vid>-<pid>` (matches Django) / the mock route's doc comment says "`p<productId>` or `v<variantId>`". For a bare `v<vid>`, Django answers `404` «الوحدة غير معروفة.» (`location_service.py:526-527`). The mock reads the missing product id as `NaN` and answers `404` «المنتج غير موجود.» — same status, different sentence. The UI never sends that form. Reported in step 23.

**Permissions.** `GET …/inventory/` needs `inventory.view`. `POST …/inventory/adjust/` and `PATCH …/inventory/<unit>/` need `inventory.adjust`. The owner holds both implicitly; a staff member without the key gets `403` «ليست لديك صلاحية لهذا الإجراء.».

<a id="staff"></a>

## 7. Staff assignments (DOC-178)

A **staff assignment** gives one staff member one **operational role** at one location. It is a location-scoped label (who runs this branch, who cashiers, who packs, who drives). It is **not** an M18 permission: the role does not grant or remove any permission key. Two routes serve it, both behind the plan feature `multi_location` (gate 2 of [§2](#access)):

| Method | Django path (`/api/v1/…`) | Gate after the feature | Success |
|---|---|---|---|
| `GET` | `locations/<pk>/staff/` | any session | `200` array |
| `POST` | `locations/<pk>/staff/` | `staff.manage_assignments` + [self-refusal](#staff-self) | `201` created · `200` role replaced |
| `DELETE` | `locations/<pk>/staff/<aid>/` | `staff.manage_assignments` + [self-refusal](#staff-self) | `204`, no body |

The staff picker that feeds the form is [`GET locations/staff-options/`](#staff-options). `<pk>` and `<aid>` are `<int:…>` URL converters, so a non-numeric segment never reaches the view (Django's own `404`).

### 7.1 The assignment object

```json
{
  "id": 41,
  "location_id": 7,
  "staff_id": 2,
  "role": "cashier",
  "staff": { "id": 2, "full_name": "سارة", "phone": "967770000001" }
}
```

(ids are illustrative; names and the phone are the fixture of `test_staff_assignments`.) The shape is `assignment_view` in `location_service.py`. The Zod twin is `assignmentSchema` in `src/features/locations/schemas.ts`, which also types `role` as an enum of the five codes below.

| `role` | Meaning in the model (`LocationStaffAssignment.ROLE_CHOICES`) | Label in the UI (`LOCATION_ROLE_LABELS`) |
|---|---|---|
| `manager` | «مدير الموقع — كل الصلاحيات على هذا الموقع» | «مدير» |
| `cashier` | «كاشير — نقطة البيع فقط» | «كاشير» |
| `warehouse_operator` | «عامل مستودع — تحضير/تعبئة الطلبات فقط» | «عامل مستودع» |
| `driver` | «سائق/مندوب — تسليم فقط (للمركبات المتنقلة)» | «سائق» |
| `pickup_agent` | «وكيل استلام — تأكيد تسليم PUDO فقط» | «موظف استلام» |

The API sends and accepts only the **code**; both label columns are presentation. The two wordings differ (for `pickup_agent` «وكيل استلام» in the model against «موظف استلام» in the UI). The model text is what the Django admin shows.

<a id="staff-list"></a>

### 7.2 `GET /api/v1/locations/<pk>/staff/` — any session

Returns a bare **array** (no envelope) of the location's assignments with `is_active = true`, ordered by `id`. Unknown location: `404` `{"detail": "الموقع غير موجود."}`. An empty location returns `[]` (asserted at the end of `test_staff_assignments`).

<a id="staff-assign"></a>

### 7.3 `POST /api/v1/locations/<pk>/staff/` — `staff.manage_assignments`

**Request body**

| Field | Type | Required | Rules |
|---|---|---|---|
| `staff_id` | integer | yes | must be an **active** `StaffMember`; anything else (missing, `0`, unknown id, deactivated member) fails the same way |
| `role` | string | yes | one of `manager`, `cashier`, `warehouse_operator`, `driver`, `pickup_agent` |

**Errors** (checked in this order; the first failing rule answers, errors are **not** accumulated)

| Status | Body | When |
|---|---|---|
| `404` | `{"detail": "الموقع غير موجود."}` | `<pk>` is not a location (checked before the body) |
| `400` | `{"staff_id": ["اختر موظفاً."]}` | no active staff member with that id |
| `400` | `{"role": ["اختر دوراً تشغيلياً."]}` | `role` outside the five codes (`test_staff_assignments` sends `"boss"`) |
| `403` | `{"detail": "ليست لديك صلاحية لهذا الإجراء."}` | the staff session lacks `staff.manage_assignments` |
| `403` | `{"detail": "لا يمكنك تعديل تعييناتك أو استثناءات صلاحياتك بنفسك."}` | [self-assignment](#staff-self) |

**Replace on re-assign — the rule of this task.** A staff member holds **one** operational role per location. `add_assignment` runs in `transaction.atomic()` and locks the member's rows at that location with `select_for_update`:

| State before | Result | Status | `id` |
|---|---|---|---|
| no row for (location, staff) | a row is created | `201` | new |
| one row (any role, active or not) | `role` is replaced and `is_active` set to `true` | `200` | **unchanged** |
| several rows (legacy data) | the oldest row is kept and updated; the others are **deleted** | `200` | the oldest id |

`test_staff_assignments` posts `cashier` (→ `201`), then `manager` for the same member (→ `200`, `role: "manager"`, same `id`), and asserts that exactly one `LocationStaffAssignment` exists for the location.

> The database constraint is `UniqueConstraint(location, staff, role)` (`unique_staff_role_per_location`). It allows one member to hold **several different roles** at a location. The one-role-per-member rule exists only in this API (`add_assignment`), so a row created by the Django admin or the legacy HTML screen can coexist with others until the next `POST` for that member collapses them.

<a id="staff-self"></a>

### 7.4 The self-assignment refusal

A staff member cannot create, change or remove **their own** assignment (the same anti-escalation rule M18 applies to roles and permission overrides). Both views run the same pre-check before the normal gate chain:

| Route | Self when | Refusal |
|---|---|---|
| `POST …/staff/` | `str(body.staff_id) == str(me.pk)` | `403` `{"detail": "لا يمكنك تعديل تعييناتك أو استثناءات صلاحياتك بنفسك."}` |
| `DELETE …/staff/<aid>/` | the assignment `<aid>` at this location belongs to `me` | the same `403` |

`me` is `resolve_request_staff(request)`. Steps, in order:

1. If the request carries **no staff member** (the owner session), the pre-check is skipped: the owner may assign any active staff member.
2. If it is a self-target, the view first runs `check(request, "staff.manage_assignments")` — session `401`, feature `403`, or the **generic** permission `403` «ليست لديك صلاحية لهذا الإجراء.» win over the self message.
3. Only a caller who **has** the key and targets themselves gets «لا يمكنك تعديل تعييناتك أو استثناءات صلاحياتك بنفسك.».
4. For `DELETE` the self test uses `assignment_staff_id(pk, aid)`. An unknown `<aid>` returns `None`, never equals `me.pk`, and falls through to the `404` «التعيين غير موجود.».

Holding the key does **not** restrict *which* location or *which* member: a staff member with `staff.manage_assignments` can assign anyone else to any location.

`test_staff_assignments` covers `POST` as a staff member targeting themselves (→ `403`). The `DELETE` branch and the exact message are not asserted by a test.

> ⚠️ Discrepancy — roadmap says "never on yourself (same rule as M18)" / code does the comparison on **strings** in the `POST` view (`str(data.get('staff_id')) == str(me.pk)`, `views_locations.py:152`), while `add_assignment` reads the id with `int(raw)`. A body that names the caller's own id in another spelling — `5.0`, `"05"` or `" 5"` for staff `5` — does not match as a string, yet `int()` resolves it to staff `5`, so the assignment would be created for the caller. This was derived by reading the code; it is **not** exercised by a test and was not run. Reported in the Step 24 report as a security finding; the application code was not changed.

<a id="staff-remove"></a>

### 7.5 `DELETE /api/v1/locations/<pk>/staff/<aid>/` — `staff.manage_assignments`

Deletes the row `(id = aid, location = pk)` and answers `204` with an empty body. If no row matches — a wrong `aid`, an `aid` that belongs to another location, or an unknown location — the answer is `404` `{"detail": "التعيين غير موجود."}`. The route does not filter on `is_active`, so an inactive row can also be removed. The [self-refusal](#staff-self) applies first.

<a id="staff-bff"></a>

### 7.6 BFF and mock

- `GET`/`POST`: `src/app/api/bff/locations/[id]/staff/route.ts` → `/api/v1/locations/<id>/staff/` (`liveOrMock`, module `locations`). In mock mode `POST` is guarded by `staff.manage_assignments` through `mockRoute`; `GET` answers `404` «الموقع غير موجود.» for an unknown location.
- `DELETE`: `src/app/api/bff/locations/[id]/staff/[aid]/route.ts`. **Limitation of this step**: the file sits eight folders below the repository root and could not be staged for reading (the tool supports seven). Its behaviour is documented from the Django view and from the client hook `useRemoveAssignment` (`DELETE /api/bff/locations/<id>/staff/<assignmentId>`), not from the handler itself.
- The mock (`src/mocks/locations/state.ts › addAssignment`) replaces the role of an existing (location, staff) pair and answers `200`, as Django does; it creates with `201`. It has **no self-assignment check**: that refusal exists only in Django. It also accepts any id in the fixed `STAFF_OPTIONS` list without testing `is_active`.

<a id="routing-rules"></a>

## 8. Order routing rules (DOC-179)

A **routing rule** says "for this category and/or this city, prefer this location". Rules are ordered by `priority` (smallest first) and the first **active** rule that matches wins. Four routes plus the preview serve them. **Writes are owner-only** (gate 3a of [§2](#access): a staff session gets `403` «إدارة المواقع مقصورة على مالك المتجر.»); **reads and the preview are open to any session** after the feature gate.

| Method | Django path (`/api/v1/…`) | Gate after the feature | Success |
|---|---|---|---|
| `GET` | `locations/routing-rules/` | any session | `200` array, `priority` order |
| `POST` | `locations/routing-rules/` | owner | `201` rule |
| `PATCH` | `locations/routing-rules/<pk>/` | owner | `200` rule |
| `DELETE` | `locations/routing-rules/<pk>/` | owner | `204`, no body |
| `POST` | `locations/routing-rules/reorder/` | owner | `200` `{ok, reordered, results}` |
| `GET` | `locations/routing-rules/preview/` | any session | `200` preview object |

In `api/urls.py` the three fixed paths (`routing-rules/`, `reorder/`, `preview/`) are declared **before** `locations/<int:pk>/`, so they are never read as a location id.

<a id="rule-object"></a>

### 8.1 The rule object

```json
{
  "id": 12,
  "priority": 1,
  "applies_to_category": 5,
  "applies_to_city": "جدة",
  "preferred_location": 7,
  "category_name": "عطور",
  "location": { "id": 7, "code": "BR-JED", "name": "فرع جدة", "is_active": true }
}
```

(from `test_routing_rules_priority_reorder_preview`; ids illustrative.)

| Field | Type | Meaning |
|---|---|---|
| `id` | integer | rule id |
| `priority` | integer | position, renumbered to **1..n with no gaps** after create, delete and reorder (see [§8.3](#rule-priority)) |
| `applies_to_category` | integer \| `null` | category id; `null` = every category |
| `applies_to_city` | string \| `null` | exact city text; `null` = every city (an empty string is stored but sent as `null`) |
| `preferred_location` | integer | the location the rule prefers |
| `category_name` | string \| `null` | category name for display, `null` when there is no category |
| `location` | object \| `null` | `{id, code, name, is_active}` of the preferred location (it can be inactive — rules are not removed when a location is deactivated) |

The object does **not** contain the rule's `is_active` flag or its stored `name`. The list returns every rule, active or not, and no route in this API can change `is_active`: rules created here are always active, and `PATCH` never touches the flag. Deactivating a rule is possible only outside this API (Django admin or the legacy screen).

<a id="rule-list"></a>

### 8.2 `GET /api/v1/locations/routing-rules/`

A bare array ordered by `(priority, id)`, not paginated.

<a id="rule-create"></a>

### 8.3 `POST /api/v1/locations/routing-rules/` — owner → `201`

**Request body**

| Field | Type | Required | Rules |
|---|---|---|---|
| `preferred_location` | integer | yes | an existing `Location` (any, inactive included) |
| `applies_to_category` | integer \| `null` | no | `null`, `""` or `0` = every category; otherwise the category must exist |
| `applies_to_city` | string | no | trimmed, cut to 100 characters; empty = every city |

**Errors** — `400`; both fields are validated together, so one response can carry both:

| Body | When |
|---|---|
| `{"preferred_location": ["اختر الموقع المفضَّل."]}` | missing, `0`, non-numeric or unknown location (the test posts `0`) |
| `{"applies_to_category": ["التصنيف غير موجود."]}` | a category id that does not exist |

<a id="rule-priority"></a>

**Priority and renumbering.** A new rule gets `max(priority) + 1`, then `_renumber()` walks all rules in `(priority, id)` order and rewrites `priority` as `1, 2, 3 …`. The same renumbering runs after every `DELETE`, and `reorder/` writes `1..n` itself. After a create, a delete or a reorder the priorities are therefore contiguous from 1, whatever the old values were (including legacy rows with `0` or duplicates). `PATCH` does not touch or renumber priorities. In the test two creates return priorities `1` and `2`.

<a id="rule-name"></a>

**Generated name.** The model requires a `name` (max 100). The client never sends one. The server builds it on every create **and every patch**:

`{category name | «كل التصنيفات»} · {city | «كل المدن»} ← {preferred location name}` — cut to 100 characters.

For the test rule (category «عطور», city «جدة», location «فرع جدة») it is «عطور · جدة ← فرع جدة». The name is visible in the Django admin and the legacy screen; the JSON rule object does not carry it.

<a id="rule-update"></a>

### 8.4 `PATCH /api/v1/locations/routing-rules/<pk>/` — owner

The body is **merged over the stored values**, so a partial body keeps the omitted fields. The merged result is validated by the same rules as create and the generated name is rebuilt. `priority` is not touched. To clear a condition send `applies_to_city: ""` (stored empty, returned as `null`) or `applies_to_category: null`. The test patches `{"applies_to_city": ""}` and gets `applies_to_city: null`, `applies_to_category` unchanged. Unknown rule: `404` `{"detail": "القاعدة غير موجودة."}`.

<a id="rule-delete"></a>

### 8.5 `DELETE /api/v1/locations/routing-rules/<pk>/` — owner → `204`

Deletes the rule and renumbers the rest in one transaction. Unknown rule: `404` `{"detail": "القاعدة غير موجودة."}`. In the test, deleting the first of two rules leaves one rule with `priority` `1`.

<a id="rule-reorder"></a>

### 8.6 `POST /api/v1/locations/routing-rules/reorder/` — owner

**Request body**: `{"ordered_ids": [12, 11]}` — **the complete set** of rule ids in the new order. Anything else is refused:

| Status | Body | When |
|---|---|---|
| `400` | `{"ordered_ids": ["أرسل كل معرّفات القواعد بترتيبها الكامل."]}` | not a list, a different count, an unknown id, a non-numeric entry, or a duplicate |

On success the server writes `priority = 1..n` in the given order and answers:

```json
{ "ok": true, "reordered": 2, "results": [ { "id": 11, "priority": 1, "…": "…" }, { "id": 12, "priority": 2, "…": "…" } ] }
```

`results` is the full rule list, so the client does not need a second `GET`. The test sends one id of two (→ `400`) and then both ids (→ `ok`, `reordered: 2`, `results` in the new order). The client hook is optimistic: the list moves at once, and a failure rolls back (FR-22.07).

> ⚠️ Discrepancy — the doc comment of `src/app/api/bff/locations/routing-rules/reorder/route.ts` says the answer is `{ok, reordered}` / the server (and the Zod `reorderResultSchema`, and the mock) also return `results`. The comment is stale; the contract is the three keys.

<a id="rule-preview"></a>

### 8.7 `GET /api/v1/locations/routing-rules/preview/?city&category` — any session

Simulates "which location would a rule pick?" for a city and an optional category id.

| Query | Type | Notes |
|---|---|---|
| `city` | string | trimmed; empty = no city |
| `category` | integer | optional; a non-numeric value counts as "no category" |

```json
{
  "rule_id": 12,
  "location": { "id": 7, "code": "BR-JED", "name": "فرع جدة", "is_active": true },
  "city": "جدة",
  "category_name": "عطور",
  "single_location": false
}
```

**How the winner is chosen** — `preview_routing` walks the rules with `is_active = true` in `(priority, id)` order and takes the first for which `location_routing_service._rule_matches(rule, probe, city)` is true:

| Condition on the rule | The rule matches when |
|---|---|
| `applies_to_category` set | the request's `category` id equals it (no category sent ⇒ no match) |
| `applies_to_city` set | `city` is non-empty and equals it after trimming both sides — an exact, case-sensitive comparison with no normalisation |
| both set | **both** hold (AND) |
| neither set | always matches |

- **Hit** → `rule_id` is the rule's id and `location` is its preferred location (even if that location is inactive, which shows in `location.is_active`).
- **No hit (fallback)** → `rule_id: null` and `location` is the first location with `is_active` and `ships_to_customer`, ordered by `(sort_order, id)`; `null` if there is none.
- `category_name` is looked up from the `category` id (`null` if absent or unknown; an unknown id still takes part in matching).
- `single_location` is `true` when at most one location is active.

Worked from `test_routing_rules_priority_reorder_preview` (rule 1: category «عطور» + city «جدة» → «فرع جدة»; rule 2: city «جدة» → «المستودع»):

| Request | `rule_id` | Location |
|---|---|---|
| `city=جدة&category=<عطور>` | rule 1 | «فرع جدة» |
| `city=جدة` | rule 2 (rule 1 needs the category) | «المستودع» |
| `city=صنعاء` | `null` | the first active shipping location (fallback) |

> The preview is a **rule-only** simulation: it ignores stock. The routing engine (`location_routing_service._sorted_candidates`) uses the same rules differently — it first keeps only active locations holding enough available stock, then **ranks** them by the best matching rule, then by distance, then by available quantity. Its module docstring states that the engine is a stand-alone service "not activated automatically" in the live checkout path. This step read `location_routing_service.py` only for `_rule_matches`; the checkout call sites were not traced.

<a id="rule-mock"></a>

### 8.8 Mock differences

The Next.js mock (`src/mocks/locations/state.ts`) follows the same contract (priorities renumbered, full-set reorder with the same message, `201`/`204`) with these differences:

| Aspect | Django | Mock |
|---|---|---|
| Rule `is_active` | filtered in `preview` | rules have no such flag, so every rule takes part |
| City comparison | trimmed on both sides | raw `===` |
| Fallback location | first by `(sort_order, id)` | first in the fixture array |
| Generated `name` | built and stored | not modelled |
| New rule priority | `max + 1`, then renumber | `count + 1` |

<a id="bff"></a>

## 9. BFF wiring and tests (DOC-180)

Every `src/app/api/bff/locations/**` handler is wrapped by `liveOrMock(request, "locations", "/api/v1/locations/…", mockHandler)` (`src/lib/bff/live-route.ts`). With `locations` in `SHARWA_LIVE_MODULES` the request goes to Django (`api/views_locations.py`); otherwise the fixture handler (`src/mocks/locations/state.ts`, `inventory.ts`) answers. Dynamic segments are `encodeURIComponent`-ed. Static folders (`mode`, `staff-options`, `routing-rules`) win over `[id]` in the Next.js router, as the fixed paths do in `api/urls.py`.

<a id="bff-table"></a>

### 9.1 The 14 routes in one table

`Gate` is the Django gate **after** the plan feature `multi_location` ([§2](#access)); `Mock guard` is what the fixture handler enforces when the module is not live.

| # | Method | Django path (`/api/v1/locations/…`) | BFF file (`src/app/api/bff/locations/…`) | Gate (Django) | Mock guard | DOC |
|---|---|---|---|---|---|---|
| 1 | `GET` · `POST` | `` (list · create) | `route.ts` | any · owner | `POST`: `ownerOnly` | 175 |
| 2 | `POST` | `mode/` | `mode/route.ts` | owner | `ownerOnly` | 175 |
| 3 | `GET` | `staff-options/` | `staff-options/route.ts` | any session | — | 175 |
| 4 | `GET` · `PATCH` | `<pk>/` | `[id]/route.ts` | any · owner | `PATCH`: `ownerOnly` | 176 |
| 5 | `GET` | `<pk>/deactivation-impact/` | `[id]/deactivation-impact/route.ts` | any session | — | 176 |
| 6 | `GET` | `<pk>/inventory/` | `[id]/inventory/route.ts` | `inventory.view` | `inventory.view` | 177 |
| 7 | `POST` | `<pk>/inventory/adjust/` | `[id]/inventory/adjust/route.ts` | `inventory.adjust` | `inventory.adjust` | 177 |
| 8 | `PATCH` | `<pk>/inventory/<unit>/` | `[id]/inventory/[unit]/route.ts` | `inventory.adjust` | `inventory.adjust` | 177 |
| 9 | `GET` · `POST` | `<pk>/staff/` | `[id]/staff/route.ts` | any · `staff.manage_assignments` (+ [self-refusal](#staff-self)) | `GET`: location must exist · `POST`: `staff.manage_assignments` | 178 |
| 10 | `DELETE` | `<pk>/staff/<aid>/` | `[id]/staff/[aid]/route.ts` † | `staff.manage_assignments` (+ self-refusal) | not read † | 178 |
| 11 | `GET` · `POST` | `routing-rules/` | `routing-rules/route.ts` | any · owner | `POST`: `ownerOnly` | 179 |
| 12 | `PATCH` · `DELETE` | `routing-rules/<pk>/` | `routing-rules/[id]/route.ts` | owner | `ownerOnly` | 179 |
| 13 | `POST` | `routing-rules/reorder/` | `routing-rules/reorder/route.ts` | owner | `ownerOnly` | 179 |
| 14 | `GET` | `routing-rules/preview/` | `routing-rules/preview/route.ts` | any session | — | 179 |

The table has one row per URL pattern: 14 patterns in `api/urls.py` (lines 447-460) and 14 BFF `route.ts` files; five files export two methods. It matches the register [`architecture/22-live-module-keys.md`](../../../architecture/22-live-module-keys.md) row 17, `locations`, "14 (11 + 3 deep)" — the three deep files are rows 7, 8 and 10.

† **Limitation of this step**: `[id]/staff/[aid]/route.ts` is nested too deeply to be staged for reading (see [§7.6](#staff-bff)); its row comes from the Django view and the client hook. Rows 1–8 are carried over from Step 23 (row 3 was re-read here); rows 9 and 11–14 were read in this step.

The owner guard `_guard.ts` (`ownerOnly(session)`) answers the mock `403` «إدارة المواقع مقصورة على مالك المتجر.» for any session whose `kind` is not `merchant` — the same sentence and status as Django's gate 3a. The reorder handler comment is stale ([§8.6](#rule-reorder)).

**Live key.** `locations` is row 17 of the register. It is **missing from the sample line `.env.example:79`** (that line lists 35 of the 39 keys; see the discrepancy in the register page). A store that copies the sample keeps every location screen on fixtures; use the 39-key line from [`ops/environment.md › live modules`](../../../ops/environment.md#live-modules) (fix DOC-461 — **done in Step 52, 2026-10-30**: the sample line now has all 39 keys).

<a id="tests"></a>

### 9.2 Tests — `api/test_locations_api.py`

**Seven** test methods in one class, `LocationsApiTests` (a `TenantTestCase` driven through `TenantClient` with a merchant session; `settings_feature_enabled` is patched on `views_inventory` and `views_locations`):

| Test | Covers | Page section |
|---|---|---|
| `test_feature_and_owner_only` | 401 without a session, feature off → 403, staff `POST` → 403 «إدارة المواقع مقصورة على مالك المتجر.», staff `GET` → 200 | [§2](#access) |
| `test_create_detail_roundtrip_and_sections` | create → detail round trip, conditional sections, `display_type` | [§4.2](#create), [§5](#detail-update) |
| `test_list_order_filters_and_counts` | parents-first order, filters, `products_count` | [§4.1](#list) |
| `test_mode_toggle_with_conflicts` | mode on/off, `409` + `merge` | [§4.3](#mode) |
| `test_location_inventory_rows_patch_and_adjust` | location stock, reorder point, quarantine, adjust, deactivation impact | [§5.5](#deactivation-impact), [§6](#location-inventory) |
| `test_staff_assignments` | staff picker order, invalid role, create `201`, replace `200` with the same id, one row per member, self-assignment `403`, delete `204`, empty list | [§7](#staff) |
| `test_routing_rules_priority_reorder_preview` | invalid location, priorities `1`/`2`, `category_name`, preview hit and fallback, partial reorder `400`, full reorder, patch clearing the city, delete renumbering | [§8](#routing-rules) |

Run: `python manage.py test api.test_locations_api`. The mock end-to-end check is `scripts/locations-check.ts`.

> ⚠️ Discrepancy — roadmap says `api/test_locations_api.py` has **8** tests / the file defines **7** (`def test_` at lines 85, 96, 132, 145, 155, 186, 206), and the page header already said 7. The roadmap count is stale.

Not asserted by any test: the `DELETE …/staff/<aid>/` self-refusal and its message, the `403` when a staff session lacks `staff.manage_assignments`, owner-only on rule `PATCH`/`DELETE`/`reorder`, `404` for unknown rules and assignments, and the name generation of [§8.3](#rule-name).

<a id="schema-changes"></a>

## 10. Migration `products/0226_locations_api`

`0226_locations_api` (depends on `0225_inventory_api`) adds four fields; it has no data migration.

| Model | Field | Type | Contract |
|---|---|---|---|
| `Location` | `external_refs` | `JSONField`, default `[]` | `external_refs[{system, ref}]` |
| `LockerDetails` | `provider_name` | `CharField(100)` | `locker.provider` |
| `LockerDetails` | `locker_code` | `CharField(50)` | `locker.locker_code` |
| `VehicleDetails` | `driver_phone` | `CharField(20)` | `vehicle.driver_phone` (falls back to `driver.phone`) |

<a id="open-items"></a>

## 11. Open items and legacy-only behaviour

- **Mode switch does not move stock.** `locations/mode/` only flips the flag; there is no server-side merge when `merge: true` is sent ([§4.3](#mode)).
- **Deactivation is never blocked** by stock or open fulfillments ([§5.5](#deactivation-impact)).
- **Legacy HTML toggle.** `products/views/locations.py:323` (`toggle_multi_location_mode`) flips the mode with no conflict check at all. The JSON route is stricter.
- **`multi_location` is off by default** for every store until the platform adds an override ([plan features](../../overview/plan-features.md)).
- **`.env.example`** lacks the `locations` key.
- **Self-assignment check compares strings** (`views_locations.py:152`) while the service reads the id as an integer, so another spelling of the caller's own id (`5.0`, `"05"`) may slip past it ([§7.4](#staff-self)). Derived from code, not tested or run.
- **Routing rules cannot be switched off through the API.** The rule object has no `is_active`; rules created here are always active ([§8.1](#rule-object)).
- **The routing engine is stand-alone.** `location_routing_service.route_order` is documented as "not activated automatically"; the preview is a rule-only simulation that ignores stock ([§8.7](#rule-preview)).
- **`DELETE …/staff/<aid>/` BFF handler not read** — too deeply nested to stage ([§7.6](#staff-bff)).

<a id="related"></a>

## 12. Related pages

- Domain: [`README.md`](README.md) · inventory [`m21-inventory.md`](m21-inventory.md) · procurement [`m23-procurement.md`](m23-procurement.md) · store settings (M34 multi-location) [`../12-settings-staff-integrations/m34-store-settings.md`](../12-settings-staff-integrations/m34-store-settings.md) · staff roles [`../12-settings-staff-integrations/m18-staff-permissions.md`](../12-settings-staff-integrations/m18-staff-permissions.md)
- Cross-cutting: [permissions › owner-only areas](../../overview/permissions.md#owner-only) · [plan features](../../overview/plan-features.md) · [errors](../../overview/errors.md) · [BFF](../../overview/bff.md)
- Architecture: [stock ledger › multi-location on / off](../../../architecture/44-stock-ledger.md) · [live module keys](../../../architecture/22-live-module-keys.md) · [data model — Domain 10](../../../architecture/data-model/10-inventory-locations-procurement.md)
- Merchant guides (Arabic): [locations](../../../guides/merchant/10-inventory-locations-procurement/locations.md) · [multi-location mode](../../../guides/merchant/10-inventory-locations-procurement/multi-location-mode.md) · [location inventory](../../../guides/merchant/10-inventory-locations-procurement/location-inventory.md) · [location staff](../../../guides/merchant/10-inventory-locations-procurement/location-staff.md) · [routing rules](../../../guides/merchant/10-inventory-locations-procurement/routing-rules.md)