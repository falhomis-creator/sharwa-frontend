# Architecture

> Track 3 — Architecture (English): system overview, multi-tenancy, BFF and live/mock switch, security, data & money integrity, background jobs, shared libraries, open items.

> Folder stub created by DOC-001 (Step 01). The pages below are planned; the roadmap checkbox of each `DOC-XXX` task is the source of truth for its status.

## Sections

| Folder | Content |
|---|---|
| [`data-model/`](data-model/README.md) | Data model |
| [`jobs/`](jobs/README.md) | Background jobs |

## Planned pages

| Page | DOC | Task |
|---|---|---|
| [`00-system-overview.md`](00-system-overview.md) | DOC-444 | Write the system architecture overview (components and request paths) |
| [`01-domain-map.md`](01-domain-map.md) | DOC-445 | Write the domain map (16 domains × 49 modules × live keys) |
| [`02-integration-protocol.md`](02-integration-protocol.md) | DOC-446 | Document the integration protocol (mock-adapter pipeline) as the standard for future modules |
| [`03-phase-history.md`](03-phase-history.md) | DOC-447 | Write the project phase history and checkpoints |
| [`10-multi-tenancy.md`](10-multi-tenancy.md) | DOC-448, DOC-449 | Document the public vs tenant schema split (model placement register); Document tenant resolution and the store guard middleware |
| [`11-provisioning.md`](11-provisioning.md) | DOC-450 | Document store provisioning, the sweeper and re-provisioning |
| [`12-custom-domains.md`](12-custom-domains.md) | DOC-451 | Document the custom domain architecture (claim → DNS → routing → TLS) |
| [`13-cross-schema-access.md`](13-cross-schema-access.md) | DOC-452 | Document cross-schema access patterns from the public console |
| [`14-store-lifecycle.md`](14-store-lifecycle.md) | DOC-453 | Document store deactivation and reinstatement |
| [`15-plans-and-features.md`](15-plans-and-features.md) | DOC-454 | Document plan features and the feature decision engine |
| [`20-bff.md`](20-bff.md) | DOC-455, DOC-456, DOC-457, DOC-462, DOC-464 | Document the `liveOrMock` switch and `forwardLive` passthrough; Document the products rule tables and the three independent product switches; Document the platform catch-all grouping and the Django-first adapters; Remove or document the superseded `account/stores` BFF route; Document the request-body buffering fix in `upstream.ts` |
| [`21-mock-runtime.md`](21-mock-runtime.md) | DOC-458 | Document the mock runtime |
| [`22-live-module-keys.md`](22-live-module-keys.md) | DOC-459 | Publish the live-module key register (all 39 keys) |
| [`23-ready-api-v1-audit.md`](23-ready-api-v1-audit.md) | DOC-463 | Re-audit `ready-api-v1.md` («Ready» passthrough list) |
| [`30-security.md`](30-security.md) | DOC-465, DOC-466 | Document identities and session establishment (7 identities); Document CSRF handling end to end |
| [`31-authorization.md`](31-authorization.md) | DOC-467 | Document the authorisation model (gate order, permission keys, owner-only areas) |
| [`32-secrets.md`](32-secrets.md) | DOC-468 | Document secrets handling and credential storage |
| [`33-otp.md`](33-otp.md) | DOC-469 | Document OTP and code-verification designs (HMAC, limits, locks) |
| [`34-rate-limits.md`](34-rate-limits.md) | DOC-470 | Document rate-limiting policy (CGNAT stance) |
| [`35-outbound-and-redirect-safety.md`](35-outbound-and-redirect-safety.md) | DOC-471 | Document outbound-request safety (webhooks SSRF, OAuth return URLs, SSO handshake) |
| [`36-ownership-checks.md`](36-ownership-checks.md) | DOC-472 | Document anti-impersonation and ownership fixes |
| [`37-audit.md`](37-audit.md) | DOC-473 | Document audit trails and data redaction |
| [`40-money.md`](40-money.md) | DOC-474 | Document money representation and formatting |
| [`41-idempotency.md`](41-idempotency.md) | DOC-475 | Document idempotency mechanisms (register) |
| [`42-concurrency.md`](42-concurrency.md) | DOC-476 | Document optimistic locking and row-lock conventions (409 register) |
| [`43-ledgers.md`](43-ledgers.md) | DOC-477 | Document wallet and ledger managers (merchant wallet, customer wallet, Sharwa Pay, dues) |
| [`44-stock-ledger.md`](44-stock-ledger.md) | DOC-478 | Document the stock ledger and multi-location stock model |
| [`45-approvals.md`](45-approvals.md) | DOC-479 | Document the approvals queue architecture |
| [`46-timelines-and-notifications.md`](46-timelines-and-notifications.md) | DOC-480 | Document timelines, change logs and notification generation |
| [`50-background-jobs.md`](50-background-jobs.md) | DOC-497 | Write the Celery architecture page and the job register |
| [`60-arabic-normalization.md`](60-arabic-normalization.md) | DOC-523 | Document the shared Arabic normalization library |
| [`61-phone-normalization.md`](61-phone-normalization.md) | DOC-524 | Document phone normalization rules |
| [`62-infra-fixes.md`](62-infra-fixes.md) | DOC-525 | Document remaining cross-cutting fixes (headers, CSRF bootstrap, savepoints, local media) |
| [`90-open-items.md`](90-open-items.md) | DOC-526 | Publish the open-items register (not built / Django rule kept) |
| [`91-legacy-surfaces.md`](91-legacy-surfaces.md) | DOC-527 | Publish the legacy-only features register and the legacy HTML surfaces map |
| [`92-inconsistencies.md`](92-inconsistencies.md) | DOC-528 | Publish the known-inconsistencies register and fix tasks |

Back to the [documentation home](../README.md).
