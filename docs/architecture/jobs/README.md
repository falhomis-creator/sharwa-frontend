# Background jobs

> One page per Celery job family / Beat schedule: trigger, queue, retry, idempotency, failure modes.

> Folder stub created by DOC-001 (Step 01). The pages below are planned; the roadmap checkbox of each `DOC-XXX` task is the source of truth for its status.

## Planned pages

| Page | DOC | Task | Status |
|---|---|---|---|
| [`order-push.md`](order-push.md) | DOC-498 | Document the order push job (`send_order_push`) | written (Step 38) |
| [`campaigns.md`](campaigns.md) | DOC-499 | Document marketing campaign jobs (`send_campaign`, `dispatch_scheduled_campaigns`) | written (Step 38) |
| [`webhooks.md`](webhooks.md) | DOC-500 | Document outgoing webhook delivery jobs | written (Step 38) |
| [`provisioning-and-carrier-webhooks.md`](provisioning-and-carrier-webhooks.md) | DOC-501 | Document provisioning and carrier-webhook jobs | written (Step 38) |
| [`pos-support-awb.md`](pos-support-awb.md) | DOC-502 | Document POS, support and AWB jobs | written (Step 38) |
| [`channels.md`](channels.md) | DOC-503 | Document channel (inbox & social) jobs | written (Step 38) |
| [`marketplaces.md`](marketplaces.md) | DOC-504 | Document marketplace jobs | written (Step 38) |
| [`dropshipping.md`](dropshipping.md) | DOC-505 | Document dropshipping jobs and schedules | written (Step 38) |
| [`whatsapp.md`](whatsapp.md) | DOC-506 | Document WhatsApp / SharwaConnect messaging jobs | written (Step 38) |

The job register and Celery architecture are in [`../50-background-jobs.md`](../50-background-jobs.md) (DOC-497); the operations runbook is [`../../ops/runbooks/celery.md`](../../ops/runbooks/celery.md) (DOC-507).

Back to the [documentation home](../../README.md).
