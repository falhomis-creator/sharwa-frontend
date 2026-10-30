# Runbook — rollback after going live

> **Source**: DOC-518 · inventory A.3, A.9 · INT-001 → INT-049 (module switch), Phase 002 migrations
> **Owner**: fares · **Last dry run**: not dry-run in step 39 (no environment was available; no rollback was performed or rehearsed)

> **Acceptance check.** DOC-518 is done when "rollback options are ranked by blast radius": the ranking is in "Impact and risk" below. **No option was executed**; every command is taken from `deploy/` or the code and is marked **derived** or **unverified** where it was not run. Treat the first staging rehearsal as the dry run.

## When to use

A production problem appeared after a release or after `SHARWA_MOCKS=off` went live, and you must decide how far back to go. Read the ranking first and use the **lowest rank that fixes the problem** — each rank down changes more of the system and some cannot be undone.

## Impact and risk

### Ranking by blast radius

Rank 1 is the smallest. "Data" says what happens to rows already written.

| Rank | Option | Scope of effect | Data effect | Reversible | Needs deploy |
|---|---|---|---|---|---|
| 1 | **Feature gate off** (kill switch or per-store override) | one plan-gated feature, all stores or chosen stores | none | yes, instantly | no (console, Django database) |
| 2 | **Next.js code rollback** (previous build) | every screen of the frontend and the BFF; Django untouched | none | yes (roll forward) | yes, Next.js only |
| 3 | **Django code rollback** (previous commit or image), migrations left as they are | every API call, Celery tasks and Beat | none by itself; the new schema stays | yes (roll forward) | yes, Django, worker and Beat |
| 4 | **Per-module switch-off** in production (`SHARWA_MOCKS=on` + the other 38 keys) | that module's rows **and every row that has no Django provider** switch from `501` to fixture data; Django-first rows unaffected | live writes stay in the database but are invisible while the fixture answers | yes, but customers can see fake data meanwhile | restart Next.js |
| 5 | **Reverse migrations** (`migrate_schemas … <previous>`) | schema of one app, in every store schema or in `public` | columns/tables added by the migration are **dropped with their data**; data steps with `noop` reverse are not undone | partly | maintenance window |
| 6 | **Restore the database (and `media/`) from a backup** | the whole platform back to the backup time | everything written since is lost | no | maintenance window |

Never use "all mocks" (`SHARWA_MOCKS=on` with an empty list) as a rollback: every module then serves fixtures to real merchants and shoppers, and the only Django-first rows are the ones listed in the next section.

> ⚠️ Discrepancy — roadmap says per-module switch-off is done by "remove key from `SHARWA_LIVE_MODULES`" / in production that does nothing: `isModuleLive()` returns `true` for every module while `SHARWA_MOCKS=off` and never reads the list (`src/mocks/runtime.ts:48-49`). A production module can be switched off only by turning mocks **on** and listing the other 38 keys (rank 4). Reported in step 39.

### What a rollback cannot do

- **Django-first rows have no key** and keep calling Django: landing and tenant probe (INT-001/002), dashboard overview/counters/refresh and auth (INT-003), onboarding (INT-004), storefront catalogue, product, cart, checkout and tracking (INT-011 → INT-015), the PWA passthrough rows (INT-016), the storefront rows of INT-028/029/034/036/045, B2B draft rows (INT-044) and courier actions (INT-046). They fall back to a fixture only when Django answers `404`/`405`/`501` or is unreachable, and only while `SHARWA_MOCKS=on` ([`../runbooks/switch-module-live.md`](../runbooks/switch-module-live.md) "Roll back"; [`../../api/overview/bff.md`](../../api/overview/bff.md)). With mocks off and Django down they answer `502` «الخادم غير متاح حالياً.» (`src/lib/bff/upstream.ts:192-194`). Taking one off Django means changing code.
- **Data written live is not visible in mock mode.** A fixture is code under `src/mocks`; it never reads Django rows, and a write it answers is never sent to Django. Orders, products and settings created live remain in PostgreSQL and reappear when the module goes live again; anything done meanwhile on a fixture is lost.
- **Migrations are forward-only in practice.** A code rollback leaves the database schema at the newer level (rank 3 note below); `deploy.sh` and the compose `release` service only ever run `migrate_schemas` forward, and neither takes a backup (`deploy/deploy.sh:38-49`, `deploy/docker-compose.prod.yml:41-52`).

## Prerequisites

- The last known-good version of each part, written down **before** the release: Django commit or tag, image tag (`sharwa:${SHARWA_IMAGE_TAG}`), Next.js commit/build, and the production `SHARWA_LIVE_MODULES` / `SHARWA_MOCKS` values. The repository has no release-tag convention and no deployment record, and CI builds the image without pushing it (`.github/workflows/ci.yml`, job `docker`; [`../testing/ci.md`](../testing/ci.md)), so an old image exists only if the host still has it — keep the previous tag.
- A database backup taken **before** every release that has migrations. The repository contains no backup tool (**unverified** how production backs up PostgreSQL and `media/`).
- Console access as platform owner (rank 1) and shell access to the Django and Next.js hosts.
- `<KEY>` — the module key; `<TAG>` — the previous Django tag/commit; `<SCHEMA>` — a store schema; `<PREV_MIGRATION>` — a migration name.

## Steps

### Rank 1 — turn a feature off without a deploy

For a module that is gated by a feature code (for example `pos`, `dropshipping`, `social_channels`; the catalogue is in [`../../architecture/15-plans-and-features.md`](../../architecture/15-plans-and-features.md)):

- **Everywhere**: Console → Features → the feature → switch "enabled globally" off. API: `PATCH /api/v1/platform/features/<code>/` with `{"is_active_globally": false}` (logs `feature.update`). A **store override that says enabled wins over the kill switch** (override is step 1 of the decision order), so also look at `enabled_override_schemas` in the catalogue view and remove or flip those overrides.
- **One store**: Console → Store → Features, or `PUT /api/v1/platform/stores/<schema>/features/` with `{"overrides":[{"code":"<code>","is_enabled":false,"notes":"rollback"}]}`; `null` removes the override.

A code absent from the catalogue is off for everyone, so a missing seed has the same effect. Roll forward by reverting the same switch. This does not delete or hide data; the screen and API answer the usual «feature disabled» refusal. Not every module has a feature code: use rank 2-4 for the rest.

### Rank 2 — roll back Next.js

The Next.js deployment is not described in the repository ([`topology.md`](topology.md) §9), so this is the generic procedure (**unverified**):

```bash
git checkout <NEXT_TAG>
npm ci
npm run build                 # NEXT_PUBLIC_* values are inlined at build time
# restart the Next.js process however it is supervised
```

`next.config.ts:22-24` ignores TypeScript errors at build, so also run `npx tsc --noEmit` on the version you roll back **to**. Keep `SHARWA_MOCKS=off`. Django needs no change; the BFF and Django contract of both versions must still match — a Next.js build older than a Django change that renamed a field will break exactly those screens.

### Rank 3 — roll back Django (code only)

**Bare metal** (`deploy/deploy.sh`):

```bash
cd /srv/sharwa
git fetch --tags
git checkout <TAG>
SKIP_PULL=1 ./deploy.sh
```

`SKIP_PULL=1` is required: by default the script runs `git pull --ff-only origin $DEPLOY_BRANCH` (`deploy.sh:26-28`), which would move the tree back to the branch tip. The script then reinstalls `requirements.txt`, runs `check --deploy`, `check_celery_queues.py`, **forward** `migrate_schemas --shared` / `--tenant` (a no-op when the database is already ahead of the old code), the two data commands, `collectstatic`, reloads Gunicorn and restarts the worker and Beat (`deploy.sh:34-58`).

**Docker Compose**:

```bash
SHARWA_IMAGE_TAG=<OLD_TAG> docker compose -f deploy/docker-compose.prod.yml --env-file .env up -d
```

The old image must already exist on the host (do not add `--build` unless you rebuild the old tag). The `release` service runs again (forward migrations only), then `web`, `worker` and `beat` restart from the old image (**derived**). Never scale `beat`.

**Risk (derived, test on staging first):** the old code runs against the newer schema. It tolerates new nullable columns and new tables, but a column added as `NOT NULL` without a database default would break the old code's inserts, and a column the old code still reads but a migration removed would fail. The Phase 002 migrations are additive for the most part ([`../migrations/phase-002-ledger.md`](../migrations/phase-002-ledger.md) lists each operation); that ledger, not this page, is the place to check a specific release. If a code rollback fails because of the schema, go to rank 5 or restore (rank 6) — do not edit tables by hand.

### Rank 4 — switch one module off in production (emergency)

Only when the module is the problem, ranks 1-3 do not apply, and showing fixture data for a while is acceptable:

```bash
# Linux: build the list = the 39 keys minus the failing one
KEYS="reports,catalog,products,orders,search,notifications,settings,pwa,customers,design,marketing,payments,shipping,staff,integrations,inventory,locations,returns,wallets,platform,platform_money,platform_billing,pos,affiliates,procurement,bookings,channels,marketplaces,dropshipping,apps,sharwa_ai,support,expenses,b2b,advanced_products,courier,sharwa_ship,sharwa_pay,rollup"
echo "$KEYS" | tr ',' '\n' | grep -vx "<KEY>" | paste -sd, -
```

```powershell
# Windows PowerShell
$keys = "reports,catalog,...,rollup"      # the same 39-key line
($keys -split ',' | Where-Object { $_ -ne '<KEY>' }) -join ','
```

Then in the Next.js service environment: `SHARWA_MOCKS=on` and `SHARWA_LIVE_MODULES=<the 38 keys>`; restart Next.js. The 39-key line comes from [`../environment.md`](../environment.md) §1.1 (a shorter list in `.env.example` omits four keys — do not copy that one). An unknown word in the list matches nothing and is not reported, so a typo silently drops a module: verify.

Consequences, all of them: the module answers its fixtures (`x-sharwa-mock: 1`); every row with **no** Django provider also answers fixtures instead of `501`; Django-first rows may show fixtures when Django answers `404`; and the three QA hooks (`pos/__reset`, `inbox/_mock/*`, `b2b/_test/bump/*`) become reachable again — `__reset` resets the POS fixture seed ([`go-live-checklist.md`](go-live-checklist.md) G15). Roll forward by restoring `SHARWA_MOCKS=off` and removing the list.

### Rank 5 — reverse migrations (last resort before a restore)

Migrations are forward-only unless a defect forces otherwise. Every Phase 002 migration has a reverse function, but none was run ([`../migrations/phase-002-ledger.md`](../migrations/phase-002-ledger.md) classes R1-R4; R1 drops the added columns with their data), and:

- data steps whose reverse is `RunPython.noop` do not undo the values they wrote (the ledger's R2 class);
- migrations that made a column nullable cannot be reversed while rows hold `NULL` there (R4: `0222`, `0223`, `0225`, `0229` per the ledger);
- `products/0036_encrypt_existing_payment_credentials` has `noop` as its reverse on purpose (the code comment at `products/migrations/0036_encrypt_existing_payment_credentials.py:30-31` says restoring the secrets as clear text is not safe to do automatically), and `0037` drops the clear-text column — going back past `0037` can never restore the old data;
- reversing a seed (`billing/0013_seed_pos_feature`) deletes the catalogue row (the ledger's R3 class).

Procedure (**derived from django-tenants usage, not run**): stop the web, worker and Beat so nothing touches half-migrated schemas, **take a backup of the schema** (`pg_dump -n <SCHEMA> -Fc …`), reverse store schemas first and shared apps last, in reverse dependency order:

```bash
python manage.py migrate_schemas --schema=<SCHEMA> products <PREV_MIGRATION>       # one store; repeat for every store
python manage.py migrate_schemas --shared tenants <PREV_MIGRATION>                  # shared apps, last
```

then deploy the old code (rank 3). Check the result with the leaf-migration query in [`go-live-checklist.md`](go-live-checklist.md) G6. A store that is not reversed stays on the newer level, which the old code may not tolerate — all stores need the same treatment.

### Rank 6 — restore from backup

Stop Gunicorn, the worker and Beat; restore PostgreSQL and `media/` from the same backup point; deploy the code version that matches that point (rank 3); start Redis consumers last. Everything written after the backup is lost: orders, payments, wallet movements — reconcile with payment gateways and the Kuraimi bank notices before reopening. No script for this exists in the repository (**unverified**).

## Verify

After any rank:

1. Version: the running Django commit/image tag and Next.js build are the intended ones.
2. Mocks: `curl -s -D - -o /dev/null -H "Cookie: <SESSION>" https://noor.<BASE>/api/bff/orders/refunds | grep -i x-sharwa-mock` prints nothing for a live row (after rank 4, it prints `x-sharwa-mock: 1` for the switched-off module — that is the intended state).
3. Health: `curl -I https://noor.<BASE>/` and `https://<BASE>/` answer; a login, a storefront order and a dashboard list load.
4. Background work: worker and exactly one Beat running; no queue backlog (`celery -A config inspect active`), stores in `ready` ([`go-live-checklist.md`](go-live-checklist.md) G7-G9).
5. Schema level matches the code (G6 SQL) — after ranks 3 and 5 it deliberately may not; record which.

## Roll back

Roll forward = repeat the procedure with the newer version: rank 1 flip the switch back; rank 2-3 redeploy the newer tag; rank 4 set `SHARWA_MOCKS=off` and remove the list; ranks 5-6 are not reversible except by another restore.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Removing a key changed nothing in production | mocks are off, so the list is ignored (`runtime.ts:49`) | rank 4 procedure |
| After rank 4 every module shows demo data | list wrong (typo dropped keys) or `*` left set | recompute the list; verify with the header check |
| Old Django code fails with a database error (`column … does not exist` or `null value in column`) | newer schema ahead of the old code (rank 3 risk) | rank 5 for that migration, or roll forward and fix instead |
| `deploy.sh` ends on `git pull` error | `SKIP_PULL=1` not set after `git checkout <TAG>` | rerun with `SKIP_PULL=1` |
| Old image tag not found (Docker) | CI never pushes images | rebuild the old commit's image on the host: `docker compose … build` with the old tree and `SHARWA_IMAGE_TAG=<OLD_TAG>` |
| A feature re-appears for some stores after the global kill | stores with an enabled override keep it | `enabled_override_schemas` in the catalogue view; bulk-flip with `POST platform/feature-overrides/bulk/` |
| Reverse migration stops on `NULL` | R4-class migration with rows using the new nullability | fill or delete the rows first, or restore (rank 6) |
| Fixtures answer after switching back to off | Next.js not restarted | restart; `SHARWA_MOCKS` is read when the process starts |

## Related

- [`go-live-checklist.md`](go-live-checklist.md) · [`topology.md`](topology.md) · [`../runbooks/switch-module-live.md`](../runbooks/switch-module-live.md) · [`../environment.md`](../environment.md)
- [`../migrations/phase-002-ledger.md`](../migrations/phase-002-ledger.md) · [`../management-commands.md`](../management-commands.md) · [`../runbooks/celery.md`](../runbooks/celery.md)
- [`../../architecture/21-mock-runtime.md`](../../architecture/21-mock-runtime.md) · [`../../architecture/22-live-module-keys.md`](../../architecture/22-live-module-keys.md) · [`../../architecture/15-plans-and-features.md`](../../architecture/15-plans-and-features.md)
