# Apps, AI & automation, support — التطبيقات والذكاء الاصطناعي والدعم

> Domain 14 — modules M30, M31, M32.
> Page status: written in official Step 43 (2026-10-28).

The platform app catalogue (`appstore.App`, managed in the console) is installed per store (`StoreAppInstallation`); WhatsApp messaging (SharwaConnect) and the Sharwa AI support bot are apps gated by `app_marketplace` and by being installed AND effectively active. The AI bot hands conversations to humans through the support sessions lock service (M32). Both report back through public-schema webhooks routed by public session indexes.

| Page | DOC | Task | Status |
|---|---|---|---|
| [`m30-app-store.md`](m30-app-store.md) | DOC-253, DOC-254, DOC-255, DOC-256 | Document the app catalogue and app detail (`apps/`, `apps/<code>/`); Document app lifecycle actions, events and charges; Document WhatsApp app usage, summary, templates and connect URL; Document M30 migrations, legacy-only features, BFF wiring and tests | Written (Step 43) |
| [`m31-sharwa-ai.md`](m31-sharwa-ai.md) | DOC-257, DOC-258, DOC-259 | Document Sharwa AI status and reconnect (`apps/sharwa-ai/status/`, `reconnect/`); Document Sharwa AI bot settings (`apps/sharwa-ai/settings/`); Document the Sharwa AI console SSO token and postMessage handshake (`apps/sharwa-ai/console-token/`) | Written (Step 43) |
| [`m32-support.md`](m32-support.md) | DOC-260, DOC-261, DOC-262 | Document support sessions: list, counters and detail timeline; Document session takeover/release/close and staff replies; Document support tickets and assignees (`tickets/`, `tickets/counters/`, `tickets/<id>/`, `assignees/`) | Written (Step 43) |

Back to the [documentation home](../../../README.md).
