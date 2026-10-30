# Inventory, locations & procurement — المخزون والمواقع والمشتريات

> Domain 10 — modules M21, M22, M23.

> Folder stub created by DOC-001 (Step 01). The pages below are planned; the roadmap checkbox of each `DOC-XXX` task is the source of truth for its status.

## Planned pages

| Page | DOC | Task |
|---|---|---|
| [`m21-inventory.md`](m21-inventory.md) | DOC-169, DOC-170, DOC-171, DOC-172, DOC-173, DOC-174 | Document the inventory list endpoint (`GET /api/v1/inventory/`); Document inventory counters and CSV export (`inventory/counters/`, `inventory/export.csv`); Document stock adjustments (`POST inventory/adjustments/`); Document movements, items and reservations (`inventory/movements/`, `inventory/items/`, `inventory/reservations/`); Document write-offs and their M18 approval flow (`inventory/writeoffs/` GET/POST); Document M21 data-model changes, BFF wiring and tests |
| [`m22-locations.md`](m22-locations.md) | DOC-175, DOC-176, DOC-177, DOC-178, DOC-179, DOC-180 | Document the locations list, create and mode switch (`locations/`, `locations/mode/`, `staff-options/`); Document location detail, update and deactivation impact (`locations/<pk>/`, `locations/<pk>/deactivation-impact/`); Document location inventory endpoints (`locations/<pk>/inventory/`, `inventory/adjust/`, `inventory/<unit>/`); Document location staff assignments (`locations/<pk>/staff/`, `staff/<aid>/`); Document order routing rules (`routing-rules/`, `<pk>/`, `reorder/`, `preview/`); Document M22 BFF wiring and tests |
| [`m23-procurement.md`](m23-procurement.md) | DOC-181, DOC-182, DOC-183, DOC-184 | Document suppliers (`suppliers/`, `suppliers/<id>/`); Document purchase-order list, draft creation, form options and product picker; Document purchase-order detail, edits and lifecycle transitions (`<id>/`, `submit|resolve|receive|cancel/`); Document M23 BFF wiring and tests |

## Status

| Page | State |
|---|---|
| [`m21-inventory.md`](m21-inventory.md) | **Written** — DOC-169 → 174 (official Step 23, 2026-10-27) |
| [`m22-locations.md`](m22-locations.md) | **Written** — DOC-175 → 177 (Step 23), DOC-178 → 180 (official Step 24, 2026-10-27): staff assignments, routing rules, the 14-route BFF table and tests |
| [`m23-procurement.md`](m23-procurement.md) | **Written** — DOC-181 → 184 (official Step 24, 2026-10-27): suppliers, purchase-order list/draft/picker, lifecycle with state diagram and the `409` contract, BFF catch-alls and tests |

Back to the [documentation home](../../../README.md).
