# Integrator specs

> Outgoing webhooks (signature, events, retries) and the inbound webhook receivers.

> Folder stub created by DOC-001 (Step 01). The pages below are planned; the roadmap checkbox of each `DOC-XXX` task is the source of truth for its status.

## Planned pages

| Page | DOC | Task |
|---|---|---|
| [`webhooks-outgoing.md`](webhooks-outgoing.md) | DOC-218 | Write the outgoing-webhooks security and delivery spec |
| [`webhooks-events.md`](webhooks-events.md) | DOC-219 | Write the outgoing event catalogue with triggers and payload examples |
| [`webhooks-verify-samples.md`](webhooks-verify-samples.md) | DOC-220 | Provide signature-verification code samples (Node.js and Python) |
| [`webhooks-inbound.md`](webhooks-inbound.md) | DOC-221 | Document the inbound webhook receivers reference |

## Status

| Page | State |
|---|---|
| [`webhooks-outgoing.md`](webhooks-outgoing.md) | **Written** — DOC-218 (official Step 28, 2026-10-27): https-only endpoints and the SSRF guard, the `whsec_` secret, the three headers and the signature, the delivery lifecycle with retries and auto-disable, redeliver and the test event, replay and idempotency guidance |
| [`webhooks-events.md`](webhooks-events.md) | **Written** — DOC-219 (official Step 28, 2026-10-27): the 7 subscribable events plus `webhook.test`, each with trigger, timing and a sample payload |
| [`webhooks-verify-samples.md`](webhooks-verify-samples.md) | **Written** — DOC-220 (official Step 28, 2026-10-27): Node.js (Express, Next) and Python (Flask, Django) verification samples, run against a fixture generated with the real signing function |
| [`webhooks-inbound.md`](webhooks-inbound.md) | **Written** — DOC-221 (official Step 28, 2026-10-27): the nine inbound receivers (Kuraimi bank, carriers, SharwaConnect, Sharwa AI, Meta, TikTok, Telegram, dropshipping suppliers and the supplier rotate route) with URL, schema, auth, idempotency and downstream task |

Back to the [documentation home](../../README.md).
