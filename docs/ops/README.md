# Operations

> Track 3 — Operations (English): environment, dependencies, management commands, deployment, migrations, runbooks, testing.

> The roadmap checkbox of each `DOC-XXX` task is the source of truth for its status.

## Sections

| Folder | Content |
|---|---|
| [`deployment/`](deployment/README.md) | Deployment |
| [`migrations/`](migrations/README.md) | Migrations |
| [`runbooks/`](runbooks/README.md) | Runbooks |
| [`testing/`](testing/README.md) | Testing |

## Pages

The roadmap checkbox of each `DOC-XXX` task is the source of truth for its status.

| Page | DOC | Content | Status |
|---|---|---|---|
| [`environment.md`](environment.md) | DOC-461, DOC-511 | Environment variables: the mock adapter and live modules (§1), Next.js and Django variables, per-environment matrix, startup failures, `DEBUG`-only behaviour | Written (Step 07, Step 09). DOC-461 stays open until the `.env.example` sample line is fixed (Step 52) |
| [`dependencies.md`](dependencies.md) | DOC-512 | Runtime platform, packages and the external services, with credential location and outage behaviour | Written (Step 09) |
| [`management-commands.md`](management-commands.md) | DOC-513 | The custom `manage.py` commands, `sharwa.bat` and the debug-only codes | Written (Step 09) |
| [`upload-limits.md`](upload-limits.md) | DOC-514 | Upload size limits layer by layer, from the BFF to the views | Written (Step 09) |
| [`testing/`](testing/README.md) | DOC-520 → 522 | Django test-suite register, frontend QA gates and mock E2E scripts, CI proposal | Step 09: two pages written, `ci.md` is a proposal awaiting a decision |
| [`runbooks/`](runbooks/README.md) | DOC-460, DOC-507, DOC-510, DOC-516 | Operational procedures (see the folder index) | Written (Steps 38, 39 and earlier); dry-run in Step 51 ([`_verification.md`](_verification.md)) |
| [`migrations/`](migrations/README.md) | DOC-508, DOC-509 | Phase 002 migrations ledger and data backfills | Written (Step 39) |
| [`deployment/`](deployment/README.md) | DOC-515, DOC-517, DOC-518 | Production topology, go-live checklist, rollback | Written (Step 39); checklist not signed off on staging |
| [`dev-setup-windows.md`](dev-setup-windows.md) | DOC-519 | Windows development environment guide | Written (Step 39). Not yet followed on a fresh machine |
| [`_verification.md`](_verification.md) | DOC-532 | Dry-run every Track 3 runbook | Done (Step 51): every runbook has a dry-run record |

Back to the [documentation home](../README.md).
