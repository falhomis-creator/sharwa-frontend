# API overview

> Cross-cutting API topics every endpoint page links to: identities, auth, CSRF, gate order, errors, money, idempotency, conflicts, pagination, rate limits, caching, uploads, normalization, BFF.

> Folder stub created by DOC-001 (Step 01). The pages below are planned; the roadmap checkbox of each `DOC-XXX` task is the source of truth for its status.

## Planned pages

| Page | DOC | Task |
|---|---|---|
| [`csrf.md`](csrf.md) | DOC-012, DOC-016 | Write the Postman CSRF pre-request script and cookie handling guide; Document the CSRF flow end to end |
| [`conventions.md`](conventions.md) | DOC-014, DOC-026, DOC-036, DOC-038, DOC-039 | Define API versioning, deprecation and changelog policy; Document the gate order and its status codes; Document caching and security headers; Document upload limits and file rules; Document Arabic search normalisation and phone normalisation |
| [`auth.md`](auth.md) | DOC-015, DOC-020, DOC-022, DOC-023, DOC-024 | Document the identity matrix; Document tenant pinning and session-switch protection; Document the Sharwa Pay customer session (auth summary); Document courier-agent and multi-store-owner identity checks; Document personal access tokens |
| [`otp.md`](otp.md) | DOC-025 | Build the platform-wide OTP cross-reference table |
| [`plan-features.md`](plan-features.md) | DOC-027 | Publish the plan-feature catalog mapped to modules |
| [`permissions.md`](permissions.md) | DOC-028, DOC-029 | Publish the M18 permission-key catalog mapped to endpoints; List the owner-only areas |
| [`money.md`](money.md) | DOC-030, DOC-031 | Document money representation and formatting; Document currency conversion rules per module |
| [`idempotency.md`](idempotency.md) | DOC-032 | Document idempotency mechanisms |
| [`conflicts.md`](conflicts.md) | DOC-033 | Document optimistic locking and 409 conflict shapes |
| [`pagination.md`](pagination.md) | DOC-034 | Document pagination and list conventions |
| [`rate-limits.md`](rate-limits.md) | DOC-035 | Document rate limits, 429 and the CGNAT stance |
| [`errors.md`](errors.md) | DOC-037 | Document error body shapes |
| [`bff.md`](bff.md) | DOC-040, DOC-041, DOC-042, DOC-043, DOC-044, DOC-045, DOC-046, DOC-047 | Document the `liveOrMock` / `forwardLive` switch; Document the products rule tables; Document the platform catch-all grouping; Document the Django-first adapters; Document the `/api/v1/*` passthrough and the «Ready» list; Document the mock runtime; Document the request-buffering fix and forwarded headers; Publish the live-key ↔ BFF-row ↔ Django-route map |

Back to the [documentation home](../../README.md).
