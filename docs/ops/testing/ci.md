# CI pipeline — what exists and what is proposed

> **Source**: DOC-522 · A.12 · A.1 Step 4
> **Code**: `sharwa_saas/.github/workflows/ci.yml` · `sharwa_saas/deploy/deploy.sh` · frontend `package.json`, `README.md`, `scripts/*.ts`
> **Last verified against code**: 2026-10-27 (official Step 09)
> **Status: DECIDED — option A, accepted by fares on 2026-10-30** (§8). The backend pipeline in §2 is real and active in the Django repository. §4.1 + §4.4 and §5 are accepted; §4.2 later; nothing in §4 onward has been created or run yet — the workflow file is a later code change.

## 1. Purpose

Today nothing runs the frontend gates automatically, and the backend pipeline is red by design (§2.3). This page records what exists, what is missing and a concrete, minimal pipeline that closes the gap, so the decision can be taken once and written down ([§8](#decision)).

## 2. What exists today

### 2.1 Backend — `sharwa_saas/.github/workflows/ci.yml` (active)

Name `CI`. Triggers: **push** to `main`, `feature/**`, `fix/**`, `refactor/**`; **pull request** to `main`; manual `workflow_dispatch`. One run per ref (`concurrency` with `cancel-in-progress`). Read-only token (`permissions: contents: read`). Environment: Python 3.13, `DEBUG=False`, `DJANGO_TESTING=1`, a throw-away PostgreSQL 16 service (`sharwa_ci`), and CI-only dummy values for `SECRET_KEY`, `CRYPTOGRAPHY_KEY`, `KURAIMI_WEBHOOK_TOKEN` and `SHARWA_ESCROW_ACCOUNT` (not reproduced here; they are unrelated to any real environment).

| Job | Timeout | Steps | Blocking? |
|---|---|---|---|
| `static` — Lint, security & queue drift | 15 min | `flake8 --select=E9,F63,F7,F82` (syntax errors and undefined names, two documented `F821` per-file ignores); full flake8 report (informational); `bandit -lll` (high severity); medium+ report (informational); `python deploy/check_celery_queues.py` | Flake8-select, Bandit high and the queue check block |
| `test` — Migrations & test suite | 90 min | `pip install -r requirements.txt` (after `libpq-dev`); `manage.py check`; `makemigrations --check --dry-run`; `migrate_schemas --shared`; **`manage.py test --noinput`**; `check --deploy` (informational) | Everything but `check --deploy` blocks |
| `docker` — Image build & smoke test | 30 min | Build `deploy/Dockerfile` (no push); assert the image holds no `.env`, `venv`, `media`, `node_modules`, `.git` and does not run as root; import `django, psycopg2, celery, gunicorn, redis`; load Django and assert at least 87 `products.tasks.*` Celery tasks are registered | All blocking |

Notes from the file itself: tests run **here, no longer on the production server** (`deploy/deploy.sh`); the pipeline was activated from an inactive draft with the Python 3.13 fix, feature-branch triggers and four new blocking gates (migrations in sync, Celery queue drift, syntax/undefined names, high-severity Bandit).

### 2.2 Frontend — nothing

`sharwa-frontend/.github/` contains only `skills/` (Spec Kit helper skills). There is **no workflow**: lint, `tsc`, the audits and the mock E2E scripts ([`frontend-qa.md`](frontend-qa.md)) are run by hand before each commit.

### 2.3 The backend gate is expected to be red

The comment above the "Test suite" step records owner decision D1 (2026-10-15): the gate is **strict**, and **15 known legacy failures** exist — `products/tests_payment_policy.py` ×12, `products/test_sharwa_ai_phase3a.py` ×1 and "2 from Phase 0" — "until then this job is expected to be red". A red `test` job therefore carries no information about a new change until those 15 are fixed or isolated. This is the single most valuable thing to resolve before adding more jobs ([§7](#order)). The list was not re-run for this page.

## 3. Gaps against the roadmap's wish-list

| Wish (DOC-522) | State |
|---|---|
| Frontend lint + typecheck + mock E2E in CI | **Missing** (§2.2) |
| Django `migrate_schemas` on a fresh Postgres + full test run, including tenant-schema tests | **Present** — the `test` job uses a fresh PostgreSQL 16 service, runs `migrate_schemas --shared`, then the whole suite; the `TenantTestCase` classes create their own test store schemas ([`django-suites.md`](django-suites.md)). Red because of the 15 failures. |
| Contract check, Zod vs responses | **Missing** — the static diff exists as a script (`openapi-contract-diff.ts`) but is not run anywhere; a *live* diff against a running Django does not exist |
| `.env.example` key parity (A.13) | **Missing** — the sample line itself was fixed in Step 52 (39 keys, DOC-461), so the step can be added and should pass ( [`../environment.md`](../environment.md#live-modules)) |

<a id="proposal"></a>

## 4. Proposed frontend jobs

Three jobs, cheapest first. All run on every push and pull request; none needs a secret.

### 4.1 `frontend-static` (minutes, no browser, no server)

`npm ci`, then in order, each a separate step so a failure names itself:

1. `npm run lint`
2. `rm -rf .next/types && npx tsc --noEmit` — the only type gate, because `next.config.ts` has `ignoreBuildErrors: true`
3. `npx tsx scripts/rtl-audit.ts`
4. `npx tsx scripts/anti-ai-audit.ts`
5. `npx tsx scripts/needs-backend-inventory.ts --check`
6. `npx tsx scripts/openapi-contract-diff.ts` — Zod ↔ OpenAPI, no server needed (reads `docs/api/openapi/sharwa-v1.yaml`; uses `js-yaml`, which arrives with ESLint)
7. `npx tsx scripts/openapi-examples.ts --check`
8. `npx tsx scripts/product-minimum-check.ts` — no output file needed

Every one of these exits non-zero on a finding ([`frontend-qa.md`](frontend-qa.md) §2). No environment variables are needed: `lint` and `tsc` do not load `src/env.ts`. This job alone would have caught most regressions the manual gates exist for.

### 4.2 `frontend-mock-e2e` (tens of minutes, browser + server)

The 40 module scripts plus `tenant-isolation-check.ts` against a mock server:

- Build and start: `npm run build` then `npm start` with `SHARWA_MOCKS=on`, `SHARWA_LIVE_MODULES=` (empty = nothing live), and the four values the build requires — `TENANT_BASE_DOMAIN=localhost`, `NEXT_PUBLIC_TENANT_BASE_DOMAIN=localhost`, `API_INTERNAL_URL=http://127.0.0.1:8000` (never called in mock mode), `NEXT_PUBLIC_PLATFORM_WHATSAPP=` any 9–15 digit placeholder. Production builds default `SHARWA_MOCKS` to `off`, so it must be set to `on` explicitly.
- Browser: `npx playwright install --with-deps chromium`, no `SHARWA_CHROMIUM`.
- Run each `scripts/*-check.ts` with the port as argument. **Mock state is per server process and several scripts leave data behind or consume seeded rows** (`courier-check`, `sharwa-ship-check`, `payments-check`, `wallets-check`…), so the safe design is one fresh server per script; a small runner script that starts the server, runs one script, stops it and collects the exit codes does **not exist yet** and would have to be written. `tenant-shell-check` needs its own port (default 3100).
- Upload `docs/visual-checks/**` as a build artifact; the job must not commit or push anything. Screenshots are tracked files — the job should compare nothing, only keep them for inspection.
- Unknowns, not yet measured: total run time, and whether every script passes on a clean machine. Start with `continue-on-error: true`, collect two weeks of results, then make it blocking.

### 4.3 `contract-live` (later, nightly)

A *live* contract check — responses from a running Django parsed with the Zod schemas — is the recommendation in the roadmap. It needs Django + PostgreSQL + seeded data in the job and is the same work as the pending live Newman runs (DOC-011 / DOC-012). Propose it only after 4.1 is green and the backend gate in §2.3 is fixed.

### 4.4 Env parity step (after Step 52)

Add the `.env.example` ↔ code key comparison from [`../environment.md`](../environment.md#live-modules) as the last step of `frontend-static`. It fails until the sample line is corrected, so it can only be added after that fix.

## 5. Proposed backend changes

| Change | Why |
|---|---|
| Fix or quarantine the 15 known failures | The `test` job cannot be a required status while it is red by design (§2.3). |
| Make `check --deploy` blocking with `--fail-level ERROR` | `deploy.sh` already runs it that way before every release; CI shows it as informational only. |
| Keep the `docker` job; add nothing | It already guards image contents and task registration. |
| No change to triggers | Push on feature / fix / refactor branches plus PRs to `main` already covers the workflow fares uses. |

## 6. Draft workflow for the frontend repository (untested)

Not committed anywhere. It shows §4.1 and the skeleton of §4.2; the Node version must be confirmed against the Next.js 16.4 requirement (the repository pins `@types/node` ^20 and no `engines`).

```yaml
name: Frontend CI
on:
  push:
    branches: [main, "feature/**", "fix/**", "refactor/**"]
  pull_request:
    branches: [main]
permissions:
  contents: read
concurrency:
  group: fe-ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
  static:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: rm -rf .next/types && npx tsc --noEmit
      - run: npx tsx scripts/rtl-audit.ts
      - run: npx tsx scripts/anti-ai-audit.ts
      - run: npx tsx scripts/needs-backend-inventory.ts --check
      - run: npx tsx scripts/openapi-contract-diff.ts
      - run: npx tsx scripts/openapi-examples.ts --check
      - run: npx tsx scripts/product-minimum-check.ts
  mock-e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 90
    continue-on-error: true        # until two weeks of green runs
    env:
      SHARWA_MOCKS: "on"
      SHARWA_LIVE_MODULES: ""
      TENANT_BASE_DOMAIN: localhost
      NEXT_PUBLIC_TENANT_BASE_DOMAIN: localhost
      API_INTERNAL_URL: http://127.0.0.1:8000
      NEXT_PUBLIC_PLATFORM_WHATSAPP: "123456789012"
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      # one fresh `npm start` per script — see §4.2; a runner script has to be written
      - run: echo "run scripts/*-check.ts here"
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: visual-checks, path: docs/visual-checks }
```

<a id="order"></a>

## 7. Suggested order

1. Fix or quarantine the 15 backend failures (the existing job becomes meaningful).
2. Add `frontend-static` (§4.1) — half a day, no unknowns.
3. Correct `.env.example`, then add the parity step (§4.4).
4. Write the per-script runner, add `frontend-mock-e2e` as non-blocking, then make it blocking.
5. Turn on branch protection requiring `static`, `test`, `docker`, `frontend-static`.
6. Live contract job (§4.3) together with the Newman runs.

<a id="decision"></a>

## 8. Git process note and decision

**Process.** Claude never runs `git commit` or `git push` in this project. Documentation and code changes are left in the working tree; fares reviews them and runs `git add`, `git commit` and `git push` himself. The Django repository's CI starts on that push (any of the branch patterns in §2.1), so the first signal a change gets is after fares pushes; neither repository defines a hook runner (no `husky` or `lint-staged` in the frontend `package.json`; `.git/hooks` was not inspected), so nothing runs the gates before a commit.

**Decision — taken by fares on 2026-10-30 (Step 52): option A.** §4.1 `frontend-static` (with the §4.4 env-parity step, now passing after the Step 52 `.env.example` fix) and the §5 backend changes are accepted now; §4.2 `frontend-mock-e2e` follows later, and §4.3 stays a nightly idea. The draft workflow in §6 is still untested — it becomes a file under `.github/workflows/` in a later code change, not in Phase 003. The options as they were offered:

| Option | Meaning |
|---|---|
| A — accept §4.1 and §5 now, §4.2 later | Recommended order of §7. |
| B — accept everything in §4 | Includes writing the per-script runner. |
| C — keep manual gates only | Record the reason; the backend pipeline stays as is. |

## 9. Related pages

- [`frontend-qa.md`](frontend-qa.md) — the gates and scripts this pipeline would run
- [`django-suites.md`](django-suites.md) — the backend suites and the known failures
- [`../environment.md`](../environment.md) — variables for the build and the test job
- `../deployment/go-live-checklist.md` — release gates (DOC-517, planned)
- [`README.md`](README.md) — testing index
