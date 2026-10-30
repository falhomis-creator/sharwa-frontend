# Runbooks

> Step-by-step operational procedures, each dry-run tested (DOC-532).

> The roadmap checkbox of each `DOC-XXX` task is the source of truth for its status.

## Pages

| Page | DOC | Task | Status |
|---|---|---|---|
| [`switch-module-live.md`](switch-module-live.md) | DOC-460 | Write the runbook "switch a module live / roll it back" | Written; dry-run in Step 51 ([P2-10](../_verification.md#p2-10)) |
| [`celery.md`](celery.md) | DOC-507 | Write the runbook: operating Celery workers and Beat | Written (Step 38); dry-run in Step 51 ([P2-5](../_verification.md#p2-5)) |
| [`migrations.md`](migrations.md) | DOC-510 | Write the runbook: applying migrations across tenant schemas | Written (Step 39); executed on the Step 51 verification stack ([P2-2 → P2-4](../_verification.md#p2-2)), not yet on staging |
| [`custom-domain-tls.md`](custom-domain-tls.md) | DOC-516 | Write the runbook: TLS issuance for custom domains | Written (Step 39); Django side run in Step 51 ([P2-7](../_verification.md#p2-7)), not exercised on a real domain |

Related: the Windows development guide [`../dev-setup-windows.md`](../dev-setup-windows.md) (DOC-519).

Back to the [documentation home](../../README.md).
