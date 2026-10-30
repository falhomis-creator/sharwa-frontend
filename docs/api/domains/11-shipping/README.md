# Shipping, couriers & Sharwa Ship — الشحن والمندوبون وشروة شيب

> Domain 11 — modules M15, M38, M39.

> Folder stub created by DOC-001 (Step 01). The pages below are planned; the roadmap checkbox of each `DOC-XXX` task is the source of truth for its status.

## Planned pages

| Page | DOC | Task |
|---|---|---|
| [`m15-shipping.md`](m15-shipping.md) | DOC-185, DOC-186, DOC-187, DOC-188, DOC-189, DOC-190, DOC-191, DOC-192, DOC-193, DOC-194 | Document the M15 module overview, gates and shipping settings row (`shipping/settings/`); Document delivery methods incl. the official «شروة شيب» method (`shipping/delivery-methods/`); Document pickup locations (`shipping/pickup-locations/`, `<pk>/`, `reorder/`); Document own-fleet providers (`shipping/providers/`, `<pk>/`, `staff-options/`); Document 3PL carriers, credentials and connection test (`shipping/carriers/`, `<code>/`, `credentials/`, `test/`); Document Sharwa Ship zones (read) and packaging profiles; Document zone review and restricted zones (`shipping/zone-review/`, `<order_id>/resolve/`, `shipping/restricted-zones/`); Document SLA rules and the edge-cases feed (`shipping/sla-rules/`, `shipping/edge-cases/`); Document in-transit address update and convert-to-pickup (`shipments/<pk>/address/`, `orders/<pk>/convert-to-pickup/`); Document M15 migrations, BFF wiring and tests |
| [`m38-courier-app.md`](m38-courier-app.md) | DOC-195, DOC-196, DOC-197 | Document the courier-app identity model and `agent/me/`; Document courier reads: shipments, shipment detail and custody ledger; Document the five courier actions and their contract/security fixes |
| [`m39-sharwa-ship.md`](m39-sharwa-ship.md) | DOC-198, DOC-199, DOC-200, DOC-201, DOC-202 | Document Sharwa Ship pending orders and waybill issuance; Document Sharwa Ship shipments: list, detail, manual status and assignment; Document the AWB failure queue and rate cards; Document courier supervision, emergency reassignment and agent shifts; Document M39 gates, messages, BFF wiring and tests |

## Status

| Page | State |
|---|---|
| [`m15-shipping.md`](m15-shipping.md) | **Written** — DOC-185 → 194 (official Step 25, 2026-10-27): the 25 M15 routes — settings, delivery methods, pickups, providers, carriers, zones and packaging, zone review and restricted zones, SLA rules and the edge-cases feed, in-transit address update, convert-to-pickup — plus migration `0222`, the BFF table and the 9 tests |
| [`m38-courier-app.md`](m38-courier-app.md) | **Written** — DOC-195 → 197 (official Step 26, 2026-10-27): the courier identity model and `agent/me/`, the four reads (shipments with tab counters, detail, custody ledger), the five actions with their ownership rules, the contract and security fixes, the BFF wiring and the 5 + 6 tests |
| [`m39-sharwa-ship.md`](m39-sharwa-ship.md) | **Written** — DOC-198 → 202 (official Step 26, 2026-10-27): the 12 `views_sharwa_ship` routes — pending orders and waybill issuance (split + Sharwa Pay debit), shipments, AWB queue and rate cards, courier supervision, emergency reassignment and shifts — plus the gate matrix, the four gate messages, the seven BFF adapters and the 6 tests |

Back to the [documentation home](../../../README.md).
