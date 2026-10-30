# Store settings, staff & permissions, domains & integrations — الإعدادات والفريق والصلاحيات والتكاملات

> Domain 12 — modules M18, M19, M34.

> Folder stub created by DOC-001 (Step 01). The pages below are planned; the roadmap checkbox of each `DOC-XXX` task is the source of truth for its status.

## Planned pages

| Page | DOC | Task |
|---|---|---|
| [`m34-store-settings.md`](m34-store-settings.md) | DOC-203, DOC-204, DOC-205, DOC-206 | Document the full store-settings read (`GET /api/v1/settings/`); Document the eight settings section PATCHes (`settings/<identity|contact|policies|shipping|currency|seo|announcement|payments>/`); Document the multi-location switch (`POST settings/multi-location/`); Document the `/api/v1/config/` extensions served by `StoreConfigSerializer` |
| [`m18-staff-permissions.md`](m18-staff-permissions.md) | DOC-207, DOC-208, DOC-209, DOC-210, DOC-211, DOC-212, DOC-213 | Document staff CRUD, counters, termination and temporary passwords; Document assignments, overrides and effective permissions; Document sessions, personal access tokens, trusted devices and roster; Document the permissions catalogue and roles (`permissions/`, `roles/`, `roles/<pk>/`); Document the approvals queue (`approvals/`, `approvals/<pk>/resolve/`); Document the audit log, chain verification and behavior alerts; Document M18 migrations, open items, BFF wiring and tests |
| [`m19-domains-integrations.md`](m19-domains-integrations.md) | DOC-214, DOC-215, DOC-216, DOC-217 | Document custom domains: claim, DNS records, verification and primary switch; Document tracking pixels settings, `/config/` tracking and the storefront injection; Document the webhook endpoint management API and delivery log; Document the integrations status overview (`GET integrations/status/`) and M19 wiring |

## Status

| Page | State |
|---|---|
| [`m34-store-settings.md`](m34-store-settings.md) | **Written** — DOC-203 → 206 (official Step 27, 2026-10-27): the full settings read (40 fields), the eight section PATCHes with their gates and validations, the multi-location switch and its `409`, the `/config/` extensions, the ten BFF rows and the 11 tests |
| [`m18-staff-permissions.md`](m18-staff-permissions.md) | **Written** — DOC-207 → 213 (official Step 27, 2026-10-27): the 26 staff routes — staff CRUD and the one-time temporary password, assignments / overrides / effective permissions, sessions, personal keys, trusted devices and roster, the 36-key catalogue and roles, the approvals queue, the audit log and behaviour alerts — plus migration `0223`, the BFF wiring and the 9 tests |
| [`m19-domains-integrations.md`](m19-domains-integrations.md) | **Written** — DOC-214 → 217 (official Step 27, 2026-10-27): the 13 M19 routes — custom domains (claim, DNS records, verification, primary), tracking tools, outgoing-webhook management and delivery log, the integrations status overview — plus the BFF parity, the new env variables and the 21 tests |

Back to the [documentation home](../../../README.md).
