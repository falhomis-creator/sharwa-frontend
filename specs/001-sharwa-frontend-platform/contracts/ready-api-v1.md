# Contract — Ready endpoints on `/api/v1` (Django today)

**Source**: discovery 03 §1 (`api/urls.py`, `api/views.py`, `api/serializers.py`), verified 2026-10-17 read-only. Mounted on both tenant and public URLConfs; tenant context from `Host` or `X-Store-Domain` (under `/api/` only). OpenAPI: `GET /api/schema/` (drf-spectacular) — the typed client may be regenerated from it later; until then the Zod schemas below are hand-written from the serializers.

| # | Method | Path | Auth | Request | Response | Zod schema (file) | Consumers |
|---|---|---|---|---|---|---|---|
| 1 | GET | `/api/v1/config/` | none (`HasTenantContext`) | — | `StoreConfig` (store identity, theme tokens, `brand_shades{50..900}`, announcement, `sections[]`) · 404/403/503 as tenant probe | `storefront/schemas/config.ts` → `StoreConfigSchema` | M47 probe, M09, M10, M11, M12, M41, M44, M08 |
| 2 | GET | `/api/v1/catalog/categories/` | none | — | `[{id, name, subcategories[]}]` (no pagination) | `storefront/schemas/catalog.ts` → `CategoryNodeSchema` | M09, M05, M08, M13 |
| 3 | GET | `/api/v1/catalog/products/` | none | `?category&brand&tag&collection&search&is_featured=true&currency&page&page_size(≤50)` | `Paginated<ProductCard>` | `ProductCardSchema`, `PaginatedSchema` | M09, M05, M13, M16, M23 |
| 4 | GET | `/api/v1/catalog/products/<id>/` | none | `?currency` | `ProductDetail` (card + `description, sizes_list[], colors_list[], deposit_required`) | `ProductDetailSchema` | M10, M42 |
| 5 | GET | `/api/v1/cart/` | session cookie | `?currency` (sticky) | `{items[], count, currency, display_subtotal}` | `storefront/schemas/cart.ts` → `CartSchema` | M11, M12, header badge |
| 6 | DELETE | `/api/v1/cart/` | session cookie | — | 204 | — | M11 |
| 7 | POST | `/api/v1/cart/actions/` | session cookie | `{product_id, size, color, action_type: add\|decrease\|remove_line}` | `{cart_count, product_qty}` | `CartActionResultSchema` | M10, M11 |
| 8 | GET/POST | `/api/v1/admin/sections/` | DRF SessionAuth + `IsAdminUser` ⚠ | section object | `[StoreSection]` / created | `dashboard/theme/schemas/sections.ts` | M08 (auth unification `[NEEDS BACKEND]`) |
| 9 | PATCH/PUT/DELETE | `/api/v1/admin/sections/<pk>/` | same | per `section_type` | section / 204 | same | M08 |
| 10 | POST | `/api/v1/admin/sections/reorder/` | same | `{ordered_ids:[int]}` | `{ok, reordered}` | `ReorderResultSchema` | M08 |
| 11 | POST | `/api/v1/pwa/install-event/` | none, 300/min/IP (loose CGNAT ceiling since INT-016) | `{event_type: prompt_shown\|ios_hint_shown\|accepted\|dismissed\|installed, source:'nextjs_app'}` | 201 `{ok}` / 429 | `pwa/schemas.ts` | M44 |
| 12 | GET | `/api/v1/push/vapid-public-key/` | none | — | `{publicKey}` | `pwa/schemas.ts` | M44, M49 |
| 13 | POST | `/api/v1/push/subscribe/` | none, 120/min/IP | `{endpoint, keys:{p256dh, auth}, order_uuid?, customer_phone?}` — since INT-016 the targeting phone comes from `order_uuid`'s order; `customer_phone` alone is ignored; 400 `{order_uuid}` for an unknown order | 201 `{ok}` | same | M44, M49 |
| 14 | POST | `/api/v1/push/unsubscribe/` | none | `{endpoint}` | `{ok}` / 400 | same | M44, M49 |
| 15 | GET/POST | `/api/v1/returns/` | merchant session + CSRF, perm `orders.process_returns` | `?status&q` · POST `{order_id, reason, refund_method, line_items:[{fulfillment_item_id, quantity_returned, restock}]}` | list / created | `dashboard/returns/schemas.ts` | M24, M06 |
| 16 | GET | `/api/v1/returns/order/<order_id>/items/` | same | — | `[{fulfillment_item_id, product_name, quantity, remaining, unit_refund_amount, location_name}]` | same | M24 |
| 17 | GET | `/api/v1/returns/<pk>/` | same | — | `ReturnRequest` | same | M24 |
| 18 | POST | `/api/v1/returns/<pk>/approve/` | same | `{decision: approve\|reject, version, location_id?}` | 200 / 409 / `{detail}` (`CashLiquidityError`) | same | M24 |
| 19 | POST | `/api/v1/orders/b2b-draft/` | staff session, perm `orders.create_b2b` | `{customer_name, customer_phone, address, items:[{product_id, quantity}], approver_role_id?, location_id?, currency?}` | 201 `{detail, order_id, approval_id}` | `dashboard/b2b/schemas.ts` | M36, M06 |
| 20 | GET | `/api/v1/orders/b2b-drafts/` | perm `orders.create_b2b` | — | `[{id, customer_name, customer_phone, total_price, currency, created_at, sales_channel, approval_id, approval_version, items_count}]` | same | M36 |
| 21 | POST | `/api/v1/orders/b2b-draft/<pk>/resolve/` | perm `orders.approve_b2b` | `{decision: approved\|rejected, version}` | 200 `{detail, decision}` / 400 / 403 self-approval / 409 | same | M36 |
| 22 | POST | `/api/v1/agent/shipments/<id>/status/` | staff session + CSRF | `{to_status, client_generated_uuid(≤64), event_time?, geo_lat?, geo_lng?, geo_accuracy_m?}` | 200 `{shipment_id, waybill_number, status, accepted, rejection_reason, flagged_for_review}` | `courier/schemas.ts` | M38, M39 |
| 23 | POST | `/api/v1/agent/shifts/start/` | staff session | `{vehicle_ref?, agent_id?}` | `{shift_id, agent, started_at}` | same | M38 |
| 24 | POST | `/api/v1/agent/shifts/end-and-handover/` | staff session | `{shift_id, new_agent_id?, vehicle_ref?}` | `{shift_id, ended_at}` or `{new_shift_id, handed_over_to, balance}` | same | M38 |
| 25 | POST | `/api/v1/agent/fulfillments/<id>/scan-pickup/` | staff session | `{scanned_code}` | `{ok, fulfillment_id}` / 400 `{detail, scan_mismatch:true}` | same | M38 |
| 26 | POST | `/api/v1/agent/fulfillments/<id>/partial-delivery/` | staff session | `{line_items:[{fulfillment_item_id, delivered_quantity, rejection_reason}], client_generated_uuid, geo_*?}` | `{collected_amount, currency, delivered, rejected, duplicate}` / 409 | same | M38 |
| 27 | POST | `/api/v1/returns/rma/create/` | staff session | `{order_id, fulfillment_item_id, destination_location_id, quantity?, reason}` | RMA | `dashboard/returns/schemas.ts` | M24 |
| 28 | POST | `/api/v1/warehouse/returns/scan/` | staff session | `{rma_id, location_id}` | RMA | same | M24 |
| 29 | POST | `/api/v1/warehouse/returns/<rma_id>/qa-decision/` | staff session | `{decision}` | RMA | same | M24 |
| 30 | POST | `/api/v1/webhooks/carrier/<carrier_code>/` | `X-Carrier-Signature` | `{waybill_number, status, event_time?, event_id?}` | 202 `{received:true}` | — (display URL only) | M15, M39 |

Legacy JSON on the tenant/public URLConf (not `/api/v1`, consumed through BFF adapters in `legacy` mode): `GET /register/check-subdomain/?subdomain=` → `{available, reason}` · `GET /register/status/<token>/` → `{status, store_url?, dashboard_url?}` · `GET /product/<id>/available-slots/` · `GET /dashboard/login/` (CSRF cookie source) · `POST /dashboard/login/`, `/dashboard/logout/`, `/dashboard/staff/login/`, `/dashboard/setup-password/`.

Conventions applied to all schemas: `z.object({...}).strict()` is **not** used (Django may add fields); unknown keys pass through; every `display_*` is `z.string()`; ids are `z.number().int()` unless the serializer emits UUID strings (`public_uuid`, `client_generated_uuid`).
