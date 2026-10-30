# Operations verification — Step 51 (DOC-532)

> **Source**: DOC-532 (official Step 51) · Track 3 runbooks · inventory A.8–A.10
> **Run dates**: 2026-10-29 (pass 1, read-only, on the developer machine) · 2026-10-30 (pass 2, executed, on a disposable verification stack)
> **Run by**: Claude · **Signed off by**: — (fares)
> **Status**: ✅ **Every runbook has a dry-run record** ([§4](#record)). Every step that can run outside production was executed on a disposable copy, with the commands copied from the pages. The steps that need the production host (systemd, Nginx, certbot, real DNS, `DEBUG=False`) are listed in [§6](#not-run) with the reason. Seven findings, [§5](#findings).

<a id="passes"></a>

## 1. Two passes

| Pass | Where | What it could do |
|---|---|---|
| 1 — 2026-10-29 | the developer machine, `C:\sharwa_saas` + its local PostgreSQL | **read-only only**: the local database holds named stores (`store1`, `fares`, `trumax67` …) and nothing says it is disposable, so only `--help`, `--plan`, `--dry-run`, previews, `showmigrations` and `check` were run (§3, records P1-1 … P1-11) |
| 2 — 2026-10-30 | a disposable verification stack in an isolated Linux container (nothing shared with any real machine) | **everything that changes data or processes**: fresh database, migrations, store registration and provisioning, failure and resume, reverse migrations, worker and Beat restarts, media renaming, POS manager code, `deploy/deploy.sh` (records P2-1 … P2-12) |

<a id="method"></a>

## 2. Method and safety rules

1. **Commands were taken from the pages.** Pass 1 read every fenced block of the 11 runbook, deployment, migration and command pages by script (717 command lines). Pass 2 ran each runbook in page order, copying the commands; placeholders were filled with the verification values (`<SCHEMA>` = `alnoor`, `<HOST>` = `shop.example.test`).
2. **Pass 1 wrote nothing.** Before running a command in a "preview" mode, its source was read to confirm that the mode writes nothing: `release_stuck_orders --dry-run` (`products/management/commands/release_stuck_orders.py:52-57`) and `normalize_media_filenames` without `--apply` (`…/normalize_media_filenames.py:102`).
3. **Pass 2 stack** — code: `sharwa_saas` at the commit of 2026-10-26 15:49 (`e3df05a`, the last code change before Phase 003; Phase 003 changed documentation only), `sharwa-frontend` at `bd9a690`. Python 3.13.18, Django 6.1, DRF 3.18.0, django-tenants 3.14.0, Celery 5.6.3, PostgreSQL 16.15, Redis 7.0.15, Node 22.23.4. `DEBUG=True`, `TENANT_BASE_DOMAIN=localhost`. One Celery worker (`-P solo`, the 11 queues) and one Beat ran for the whole pass.
4. **No real data, no real messages.** All stores, phones and passwords are fixtures (`alnoor`, `ghost1`, `9677700000XX`). WhatsApp went to a local stand-in for Green API (`GREEN_API_URL=http://127.0.0.1:9099`) that records the message, so OTP codes could be read without sending anything.
5. **Environment** in pass 1: Python 3.13.15 (`venv` of `sharwa_saas`), Django 6.1, DRF 3.18.0, django-tenants 3.14.0, Celery 5.6.3, Node 24.20.0, PostgreSQL service `postgresql-x64-18`, Redis on 6379, `DEBUG=True`.

<a id="static"></a>

## 3. Static check — every named command exists (pass 1)

| Check | Result |
|---|---|
| Distinct `manage.py` commands named in `docs/ops/**` | **13**: `check`, `createsuperuser`, `makemigrations`, `migrate_schemas`, `normalize_media_filenames`, `release_stuck_orders`, `seed_store`, `send_abandoned_cart_reminders`, `set_pos_manager_code`, `shell`, `showmigrations`, `tenant_command`, `test` |
| …that exist in `manage.py help --commands` (61 commands listed) | **13 / 13** |
| Flags used on those pages, compared with each command's own `--help` | every flag found (`--deploy`, `--fail-level`, `--check`, `--dry-run`, `--plan`, `--schema`, `--shared`, `--tenant`, `--apply`, `--minutes`, `--clear`, `--products`, `--username`). `tenant_command --help` fails with `Unknown command: '--help'` because the django-tenants command takes the wrapped command first; the form the pages use, `tenant_command showmigrations products --schema=<SCHEMA>`, works (P1-4, P2-3) |
| Repository scripts named in the commands (`deploy/deploy.sh`, `deploy/check_celery_queues.py`) | both exist |
| `deploy/deploy.sh` steps vs the runbook text | lines 35, 36, 40, 42, 46 are `check --deploy --fail-level ERROR`, `check_celery_queues.py`, `migrate_schemas --shared`, `migrate_schemas --tenant`, `migrate_passwords`, the order the pages describe |
| Celery application named by the pages (`celery -A config …`) | `config/celery.py` exists (`app = Celery('sharwa')`) |

<a id="record"></a>

## 4. Dry-run record

### 4.1 Summary — one row per runbook

| Runbook / page | Pass 2 record | Result |
|---|---|---|
| [`dev-setup-windows.md`](dev-setup-windows.md) (DOC-519) | P2-1 | ✅ executed in its Linux-equivalent form, end to end; two corrections ([O-4](#o-4), [O-5](#o-5)) |
| [`runbooks/migrations.md`](runbooks/migrations.md) (DOC-510) | P2-2, P2-3, P2-4 | ✅ §1–§8 and *Roll back* executed, failure reproduced; one correction ([O-3](#o-3)) |
| [`runbooks/celery.md`](runbooks/celery.md) (DOC-507) | P2-5 | ✅ §1–§4, §6 (warm restart), §7 (re-queue), §8 (cron commands) executed |
| Re-provisioning — [`../api/domains/16-platform-console/m20-console.md`](../api/domains/16-platform-console/m20-console.md#43-store-re-provisioning-doc-268) §4.3 + [`../guides/console/16-platform-console/reprovision.md`](../guides/console/16-platform-console/reprovision.md) | P2-6 | ✅ failed store re-provisioned to `ready` from the console API |
| [`runbooks/custom-domain-tls.md`](runbooks/custom-domain-tls.md) (DOC-516) | P2-7 | ⚠️ partial by nature: §1, §8 (Django side) executed; §2, §5–§7, §9 need public DNS, Nginx and certbot ([§6](#not-run)) |
| POS manager code — [`management-commands.md`](management-commands.md#set_pos_manager_code) §3.1 + go-live G12 | P2-8 | ✅ every rule of the table reproduced, then proved at the till |
| Media normalisation — [`management-commands.md`](management-commands.md#normalize_media_filenames) §3.2 | P2-9 | ✅ preview, backup, apply, re-run; one correction ([O-2](#o-2)) |
| [`runbooks/switch-module-live.md`](runbooks/switch-module-live.md) (DOC-460) + [`deployment/rollback.md`](deployment/rollback.md) rank 4 | P2-10 | ✅ see the record |
| [`deployment/rollback.md`](deployment/rollback.md) (DOC-518) ranks 1 and 5 | P2-4, P2-11 | ✅ reverse migrations and a feature switched off without a deploy |
| [`deployment/go-live-checklist.md`](deployment/go-live-checklist.md) (DOC-517) + `deploy/deploy.sh` | P2-12 | ✅ `deploy.sh` ran to the end with `systemctl` stubbed; G1, G6–G8, G10–G12, G16 executed; G2, G3, G5, G9 partly ([§6](#not-run)) |
| [`management-commands.md`](management-commands.md) (DOC-513) | P1-6 … P1-8, P2-5, P2-8, P2-9 | ✅ every command run at least in its safe form |

### 4.2 Pass 1 — developer machine (read-only, 2026-10-29)

All commands ran from `C:\sharwa_saas` with the repository's `venv` interpreter. "Exit" is the process exit code.

| # | Page that gives the command | Command as run | Exit | Observed | Verdict |
|---|---|---|---|---|---|
| P1-1 | `runbooks/migrations.md` §1 | `manage.py check` | 0 | `System check identified no issues (0 silenced).` | as documented |
| P1-2 | `runbooks/migrations.md` §1, `deployment/go-live-checklist.md:95`, `deploy/deploy.sh:35` | `manage.py check --deploy --fail-level ERROR` | 0 | the page says "expect exit 0" | as documented, see [O-1](#o-1) |
| P1-3 | `runbooks/migrations.md` | `manage.py makemigrations --check --dry-run` | 0 | `No changes detected` | as documented |
| P1-4 | `runbooks/migrations.md:228`, `migrations/phase-002-ledger.md:134` | `manage.py tenant_command showmigrations products --schema=store1` | 0 | the tail lists `0230_procurement_api` … `0236_advanced_products_api`, all `[X]` | as documented |
| P1-5 | `runbooks/migrations.md` | `manage.py migrate_schemas --plan --schema=store1` | 0 | `No planned migration operations.` | as documented |
| P1-6 | `management-commands.md` §3.4, `runbooks/celery.md` | `manage.py release_stuck_orders --dry-run` | 0 | `[dry-run]` lines and one count line per store; 0 orders | as documented; nothing written |
| P1-7 | `management-commands.md` §3.2 | `manage.py normalize_media_filenames --schema=store1` (no `--apply`) | 0 | preview: 0 files, 0 rows, 0 missing on disk | as documented; nothing written |
| P1-8 | many pages | `manage.py <cmd> --help` for the 12 other named commands | 0 each | usage lines match the flags the pages use | as documented |
| P1-9 | `deployment/go-live-checklist.md` | `manage.py check --deploy` (no `--fail-level`) | 0 | **983 issues printed**: 977 `drf_spectacular` warnings, 6 `security.W004/W008/W009/W012/W016/W018` | see [O-1](#o-1) |
| P1-10 | — | `manage.py check --deploy --fail-level WARNING` | 1 | the warnings above fail it | not a documented command; recorded so nobody adds it to a gate |
| P1-11 | `runbooks/migrations.md` | `manage.py tenant_command --help` | 1 | `Unknown command: '--help'` | not a runbook step (§3) |

### 4.3 Pass 2 — disposable verification stack (executed, 2026-10-30)

<a id="p2-1"></a>

#### P2-1 — Development environment ([`dev-setup-windows.md`](dev-setup-windows.md), Linux equivalent)

| Step | Command (from the page; `cmd` syntax translated to `bash`) | Observed | Verdict |
|---|---|---|---|
| §2 venv | `python -m venv …` + `pip install -r requirements.txt` | `psycopg2==2.9.12` is built from source and needs `pg_config` (PostgreSQL client headers, `libpq-dev`); with them installed every requirement installs | as documented in `dependencies.md` (build dependency not named on the Windows page, where a wheel exists) |
| §5 `.env` | the variables of [`environment.md`](environment.md) | `SECRET_KEY`, `ALLOWED_HOSTS`, `DB_*`, `CRYPTOGRAPHY_KEY` are enforced at start, as the page says | as documented |
| Troubleshooting row "logs folder" | first `manage.py check` on a fresh clone | start-up stops: `ValueError: Unable to configure handler 'file'` (caused by the missing `logs/` folder). A fresh clone has **no** `logs/` folder | the page's open item "whether `logs\` exists after a fresh clone is not verified" is now answered: it does not. See [O-4](#o-4) |
| §6 schema | `manage.py migrate_schemas --shared` | exit 0 in 29 s; last line `Applying tenants.0027_platform_console_api... OK` | as documented |
| §6 platform tenant | the one-line `shell -c "…Client.objects.get_or_create(schema_name='public'…)…"` (marked *unverified*) | exit 0; `Client` `public` + `Domain` `localhost` created | ✅ now verified |
| §6 owner | `createsuperuser --username <ADMIN_USER>` (`--noinput` with `DJANGO_SUPERUSER_PASSWORD`) | `Superuser created successfully.` | as documented |
| §7–§9 | `runserver`; `celery -A config worker -l info -P solo -Q <11 queues>`; `celery -A config beat -l info --schedule <file>` | all three start; the worker lists 110 tasks and `ready`; Beat `Starting...` | as documented (the solo pool also runs on Linux) |
| §13 get a store | `POST public/register/` → `verify-otp/` with `123456` (DEBUG) → poll `/register/status/<token>/` | `200` → `200` → `{"status": "ready", …, "setup_token": …}`; `provision_tenant_schema` succeeded in **31.7 s** | as documented |
| §13 first password | `POST auth/merchant/setup-password/` | `204`; login before it answered `409` `setup_required`, a second setup `409` `already_set`, a weak password `400` «كلمة المرور يجب أن تتكون من 8 خانات على الأقل.» | as documented |
| §13 demo data | `pip install Faker` then `manage.py seed_store alnoor --products 50` | `✅ تم بنجاح داخل 'alnoor': 20 تصنيف و 50 منتج.` in 2 s | as documented (Faker is not in `requirements.txt`, as the page says) |
| Verify 1 | `curl -i http://localhost:8000/api/v1/auth/csrf/` (marked *unverified*) | `200`, `{"csrfToken": "…"}`, `Set-Cookie: csrftoken` | ✅ now verified |
| Verify 6 | `npm run lint`; `npm run typecheck` | lint exit 0 (77 s). `tsc --noEmit` on a fresh clone **fails** (exit 2, `TS2304: Cannot find name 'RouteContext'` / `'LayoutProps'`); after `npx next typegen` it passes (exit 0, 65 s) | see [O-5](#o-5) |

<a id="p2-2"></a>

#### P2-2 — Migrations runbook, normal run ([`runbooks/migrations.md`](runbooks/migrations.md))

| Step | Command as run | Exit | Observed | Verdict |
|---|---|---|---|---|
| §1.1 | `makemigrations --check --dry-run` | 0 | `No changes detected` | as documented |
| §1.2 | `check --deploy --fail-level ERROR` · `python deploy/check_celery_queues.py` | 0 · 0 | 982 issues printed (DEBUG on, see [O-1](#o-1)) · `RESULT: OK` with the note that `support` is consumed but not referenced | as documented (*unverified* → verified) |
| §1.3 | `migrate_schemas --shared --plan` · `--tenant --plan` | 0 · 0 | `Planned operations:` / `No planned migration operations.` | as documented |
| §1.4 | both SQL queries | — | no rows on a clean database; with the failure of P2-3 in place the second query lists `ghost1 | failed` | ✅ the "untested SQL" works |
| §2 | `pg_dump -h <DBHOST> -U <DBUSER> -Fc -f sharwa-before-migrate.dump <DBNAME>` · `pg_restore -l … ` | 0 | dump written; `pg_restore -l` lists 232 `TABLE DATA` entries (public + store) | ✅ verified (restore itself not exercised) |
| §4 | `migrate_schemas --shared` · `migrate_schemas --tenant` | 0 · 0 | `No migrations to apply.` per schema, 2 s | as documented; output prefix see [O-3](#o-3) |
| §8.1 | `showmigrations tenants billing sharwapay appstore` · `tenant_command showmigrations products --schema=alnoor` | 0 | 50 × `[X]`, 0 × `[ ]` · 238 × `[X]`, 0 × `[ ]` | ✅ verified |
| §8.2 | the shell snippet, verbatim | 0 | `alnoor ready True 2 3` | ✅ verified |
| §8.3 | the SQL, verbatim | — | `alnoor|t|t` | ✅ verified |
| §8.4 | the `Feature` shell check | 0 | `[{'code': 'pos', 'is_active_globally': True, 'requires_plan': True, 'module_group': 'merchant_sections'}]` | ✅ matches the expected row |
| §8.5 | the generator SQL, then its output | — | `alnoor|1` | ✅ verified |

<a id="p2-3"></a>

#### P2-3 — Migrations runbook, failure on one schema and resume (§6, Troubleshooting)

A `tenants_client` row without a schema was created on purpose (`ghost1`, `provisioning_status = failed`, `auto_create_schema = False`) — the state a failed provisioning leaves.

| Step | Command as run | Exit | Observed | Verdict |
|---|---|---|---|---|
| bulk run | `migrate_schemas --tenant` | **1** | `alnoor` migrated, then `MigrationSchemaMissing: Unable to create the django_migrations table (no schema has been selected to create in …)` | ✅ the page's inference ("expected to raise partway", marked *inferred, not reproduced*) is now reproduced |
| which schema failed | same, on a terminal (`script -qc …`) | 1 | the last prefix printed is `[1/2 (50%) standard:alnoor] === Starting migration`; the failing schema `ghost1` (2/2) prints **no** line before the traceback | ❌ contradicts §6 "the last prefix printed names the schema that failed" — [O-3](#o-3) |
| one schema | `migrate_schemas --schema=ghost1` | 1 | `RuntimeError: Schema "ghost1" does not exist` | as documented (`migrate_schemas.py:73-75`) |
| resume | reprovision from the console (P2-6), then `migrate_schemas --tenant` | 0 | `No migrations to apply.`; §1.4 query returns no rows | as documented |

<a id="p2-4"></a>

#### P2-4 — Reverse migrations ([`runbooks/migrations.md`](runbooks/migrations.md#roll-back), [`deployment/rollback.md`](deployment/rollback.md) rank 5)

Run on the disposable store `ghost1` (no business rows), so no data could be lost.

| Command as run | Exit | Observed | Verdict |
|---|---|---|---|
| `migrate_schemas --schema=ghost1 products 0234_support_api` | 0 (3 s) | `Unapplying products.0236_advanced_products_api... OK`, `Unapplying products.0235_seed_expenses_permission... OK`; `showmigrations` shows `[ ]` for both | as documented |
| `migrate_schemas --schema=ghost1` | 0 (2 s) | both re-applied, `[X]` | as documented |

The blocked reverses with data (0222, 0223, 0225, 0229) and a restore from the dump were **not** exercised: they need a store with history and are destructive by design (the page says to restore instead).

<a id="p2-5"></a>

#### P2-5 — Celery workers and Beat ([`runbooks/celery.md`](runbooks/celery.md))

| Step | Command as run | Observed | Verdict |
|---|---|---|---|
| §1 | `python deploy/check_celery_queues.py` | 10 queues used in code, 11 consumed, note for `support`, `RESULT: OK`, exit 0 | as documented |
| §2 | `celery -A config inspect ping` · `inspect active_queues` | `1 node online.` · the 11 queue names | as documented |
| §3 | the `LLEN` loop (on `redis://localhost:6379/1`) | 0 for every queue | as documented (*not verified* → verified) |
| §3 | `inspect registered` | **110** task names | ✅ matches "expect 110" |
| §3 | `inspect active` / `reserved` / `scheduled` | answer from the node | as documented |
| §4 | the `CELERY_BEAT_SCHEDULE` print | **26** lines | ✅ matches "Expected: 26 lines" |
| §4 | `grep -c "Sending due task"` on the Beat log | 33 lines after 35 minutes, 54 after 40 more | healthy by the page's rule |
| §6 | warm stop of a worker (`SIGTERM`) | `worker: Warm shutdown (MainProcess)`; the remaining worker kept serving; `inspect ping` → 1 node | as documented. A second worker started by mistake on the same host showed Celery's `DuplicateNodenameWarning` and doubled `inspect registered` to 220 — worth knowing when reading §3 |
| §7 | `shell -c "from products.tasks import compute_all_tenants_daily_metrics; print(compute_all_tenants_daily_metrics.delay())"` | task id printed; the worker ran `compute_daily_store_metrics` for each store and logged `succeeded` | as documented |
| §8 | `manage.py send_abandoned_cart_reminders` · `release_stuck_orders --minutes 60 --dry-run` | `[alnoor] {'sent': 0, 'skipped': 'disabled'}` and the same for `ghost1` · `[alnoor] سيُلغى 0 طلب pending_payment.` … `اكتمل. (تجربة جافة — بلا تعديل)` | as documented |
| §7.1–§7.3 | the DLQ, AWB-queue and webhook re-queue routes | exercised by the live API run ([`../api/_verification.md`](../api/_verification.md#live-run), console and owner sweeps): every route answers, no 5xx | as documented |

<a id="p2-6"></a>

#### P2-6 — Re-provisioning a failed store (console)

| Step | Call | Observed | Verdict |
|---|---|---|---|
| find it | `GET /api/v1/platform/stores/?status=failed` (superuser) | `ghost1`, `provisioning_status: failed` | as documented |
| operator | `POST /api/v1/platform/stores/reprovision/` as «مشرف تشغيلي» | `403` «هذا الإجراء لمالك المنصة فقط.» | as documented |
| empty list | `{"schemas": []}` | `400` `{"schemas": ["اختر متجراً واحداً على الأقل."]}` | as documented |
| mixed list | `{"schemas": ["ghost1", "alnoor", "nosuch"]}` | `200` «أُرسلت 1 من 3 مهمة إعادة تجهيز.»; reasons «المتجر جاهز — لا شيء لإعادة تجهيزه.» and «متجر غير معروف.» | as documented, verbatim |
| repeat at once | `{"schemas": ["ghost1"]}` | «أُرسلت 0 من 1 …», reason «إعادة تجهيز قيد التنفيذ بالفعل.» | as documented (row 3) |
| outcome | worker log + database | `provision_tenant_schema` succeeded in 35.2 s; `ghost1` is `ready` ~40 s after the call | as documented |

<a id="p2-7"></a>

#### P2-7 — Custom domain TLS ([`runbooks/custom-domain-tls.md`](runbooks/custom-domain-tls.md)), Django side

| Step | Command / call | Observed | Verdict |
|---|---|---|---|
| claim | owner `POST /api/v1/domains/` `{"domain": "shop.example.test"}` | `201`, `status: pending_dns`, `dns_records` = `CNAME shop → localhost` + `TXT _sharwa.shop = sharwa-verify=…` | as documented in `12-custom-domains.md` |
| §1 | the claims shell command (marked *unverified*) | runs; prints nothing because the claim is `pending_dns`, not `verifying` (all claims: `1 alnoor shop.example.test pending_dns False None`) | ✅ command verified; a claim reaches this list only after its DNS passes |
| §1 | the `Domain` row command | `[]` — no routing row exists while the claim is not `verifying` | consistent with "it must, for a `verifying` claim" |
| §8 | owner `POST /api/v1/domains/1/verify/` | `200`, `status: failed`, `failure_reason` «لم نجد سجل TXT المطلوب لـ shop.example.test عند مزوّد النطاق.» | as documented |
| §2, §5–§7, §9 | `dig`, Nginx blocks, `certbot`, renewal | not executable here — [§6](#not-run) | — |

<a id="p2-8"></a>

#### P2-8 — POS manager code ([`management-commands.md`](management-commands.md#set_pos_manager_code) §3.1)

| Command / call | Exit / status | Observed | Verdict |
|---|---|---|---|
| `set_pos_manager_code --schema=alnoor 12` | 1 | `CommandError: الرمز 4 إلى 8 أرقام (أو استخدم --clear).` | verbatim |
| `--schema=public 4321` · `--schema=nosuchstore 4321` | 1 · 1 | `CommandError: لا يوجد متجر بالـ schema «public».` / `«nosuchstore».` | verbatim |
| `--schema=alnoor 4321` | 0 | «ضُبط رمز المدير لنقطة البيع لـ «alnoor».»; `StoreSetting.pos_manager_code_hash` starts `pbkdf2_sha256$` and does not contain the code | as documented |
| `--schema=alnoor --clear`, then set again | 0 | «مُسح رمز المدير لـ «alnoor».» | verbatim |
| till: cashier sale with a 30 % line discount (role ceiling 10 %), no code | `403` | `{"code": "discount_exceeds_limit", "detail": "الخصم يتجاوز حدّك (10.00%) — يلزم اعتماد المدير.", …}` | as documented (m16 §9) |
| same with `manager_code: 2468` (the DEBUG code) | `400` | `{"manager_code": ["رمز المدير غير صحيح."]}` | ✅ "after `set_pos_manager_code` the real code is required and `2468` is rejected" |
| same with `manager_code: 4321` | `201` | receipt `POS-0001-001` | as documented |

A register had to be created in the Django shell first: no screen, route or command creates a `CashRegister`. The guide already says so ([`pos-open-shift.md`](../guides/merchant/13-channels-operations/pos-open-shift.md) «قيد معروف», "contact Sharwa support"); the support procedure itself is not written anywhere — see [O-6](#o-6).

<a id="p2-9"></a>

#### P2-9 — Media normalisation ([`management-commands.md`](management-commands.md#normalize_media_filenames) §3.2)

A category image with an Arabic file name (`alnoor/categories/لقطة_شاشة_تجربة.png`) was placed on disk and referenced by `Category 1`, the state of a pre-INT-020 upload.

| Step | Command as run | Observed | Verdict |
|---|---|---|---|
| backup | `pg_dump -Fc …` + archive of `media/` | both written | as the page asks |
| preview | `normalize_media_filenames` | `alnoor products.Category.image: …/لقطة_شاشة_تجربة.png → …/37fe7c83….png` then «معاينة — لم يتغيّر شيء (أضف --apply للتنفيذ): ملفات 1 · صفوف 1 · مفقودة على القرص 0» | verbatim |
| unknown schema | `--schema nosuchstore` | «المخطط 'nosuchstore' غير موجود.» | verbatim |
| apply | `--apply --schema alnoor` | `… → …/c5b074f6….png`, «نُفّذ: ملفات 1 · صفوف 1 · مفقودة على القرص 0»; the file on disk and `Category.image` both carry the new name | as documented; the new name differs from the preview's — [O-2](#o-2) |
| re-run | preview again | «… ملفات 0 · صفوف 0 · مفقودة على القرص 0» | as documented (already-ASCII names are skipped) |

<a id="p2-10"></a>

#### P2-10 — Switch a module live and roll it back ([`runbooks/switch-module-live.md`](runbooks/switch-module-live.md))

Run with Next.js 16.4.2 against the live Django of the stack, key `search` (M48) as the module being switched.

| Step | Command / check | Observed | Verdict |
|---|---|---|---|
| §1 preconditions | `python manage.py test api.test_<x>_api` (here `api.test_order_tracking_api api.test_reports_api`) | 31 tests, `OK`, exit 0 (131 s) | as documented |
| §2–§3 add the key, restart | `SHARWA_MOCKS=on SHARWA_LIVE_MODULES=reports,catalog,products,search npm run dev` | server starts | as documented (the Linux form of §2) |
| §4 the module answers from Django | the `curl -D -` check with the owner's `sessionid` | `search?q=ab`, `reports`, `categories` → `HTTP/1.1 200` and **no** `x-sharwa-mock`; `orders`, `customers` (not in the list) → `200` **with** `x-sharwa-mock: 1`; Django's access log shows `"GET /api/v1/search/?q=ab HTTP/1.1" 200` | ✅ |
| §5 live smoke | one read and one harmless write: rename category 1 through `PATCH /api/bff/categories/1` and back | `PATCH /api/v1/categories/1/` lines in the Django log, `200`; a rename to a name that already exists at the same level answers `400` «تصنيف بهذا الاسم موجود في نفس المستوى.» — the name was restored | ✅ |
| §6 401/403 come from Django | the same `search` call without a cookie | `401` `{"detail": "انتهت جلستك، سجّل الدخول مجدداً."}`, and the Django log shows the `401` | ✅ |
| Roll back | remove `search` from the list, restart | `search?q=ab` → `200` with `x-sharwa-mock: 1`; `categories` still live | ✅ |
| `rollback.md` rank 4 list builder | the `echo "$KEYS" \| tr … \| grep -vx "<KEY>" \| paste -sd, -` line | 39 keys in, 38 out | ✅ |

With `SHARWA_MOCKS=off` (every key live, the production setting) the whole guides walkthrough ran with no `x-sharwa-mock` response at all ([`../guides/_verification.md`](../guides/_verification.md)).

<a id="p2-11"></a>

#### P2-11 — Turn a feature off without a deploy ([`deployment/rollback.md`](deployment/rollback.md) rank 1)

Run on the disposable store `ghost1` (owner session) and with the global switch of a feature that `alnoor` holds an override for.

| Step | Call | Observed | Verdict |
|---|---|---|---|
| before | `GET /api/v1/pos/context/` on `ghost1` | `200` | — |
| one store off | `PUT /api/v1/platform/stores/ghost1/features/` `{"overrides":[{"code":"pos","is_enabled":false,"notes":"rollback"}]}` | `200`; the `pos` row reads `effective: false`, `source: "override"` | as documented |
| effect | `GET /api/v1/pos/context/` on `ghost1` | `403` `{"detail": "ميزة نقطة البيع غير مفعّلة في خطتك.", "code": "feature_disabled"}` — no deploy, no restart | ✅ |
| roll forward | same `PUT` with `"is_enabled": null` | `200`; `pos/context/` → `200` again | ✅ |
| everywhere off | `PATCH /api/v1/platform/features/dropshipping/` `{"is_active_globally": false}` | `200`; the catalogue row shows `enabled_override_schemas: ["alnoor"]` | as documented |
| override wins | `GET /api/v1/dropshipping/suppliers/` on `alnoor` (override = enabled) · on `ghost1` (no override) | `200` · `403` «ميزة الدروبشيبينغ غير مفعّلة في خطتك.» | ✅ "a store override that says enabled wins over the kill switch" |
| roll forward | `PATCH … {"is_active_globally": true}` | `200` | ✅ |

<a id="p2-12"></a>

#### P2-12 — Deployment: `deploy/deploy.sh` and the go-live checklist

`deploy.sh` was run as written (`SKIP_PULL=1 ./deploy/deploy.sh`), with only `sudo` replaced by a stub that prints the command, because the container has no systemd.

| `deploy.sh` step | Observed |
|---|---|
| `pip install -r requirements.txt` | `Successfully installed psycopg2-2.9.12` (built from source) |
| `check --deploy --fail-level ERROR` · `check_celery_queues.py` | exit 0 · `RESULT: OK` |
| `migrate_schemas --shared` · `--tenant` | no migrations to apply |
| `migrate_passwords` · `migrate_merchant_phone` | `Done! Upgraded: 0, Failed: 0` · `Migrated phone for tenant alnoor` / `Migration complete! Success: 1, Duplicates Skipped: 0, Empty: 1` |
| `collectstatic --noinput` | `164 static files copied` |
| `systemctl reload gunicorn`, `restart celery-sharwa`, `restart celery-sharwa-beat` | printed by the stub |
| end | `✅ Deployment completed.`, exit 0, 22 s |

`gunicorn -c deploy/gunicorn.conf.py config.wsgi:application` boots and listens with 4 sync workers (`workers` = CPU-based, `preload_app = False`).

| Gate | Command as run | Observed | Verdict |
|---|---|---|---|
| G1 backend | the parity script, verbatim | read by code, absent from `.env.example`: `DJANGO_TESTING`, `GUNICORN_ACCESS_LOG`, `GUNICORN_BIND`, `GUNICORN_ERROR_LOG`, `GUNICORN_FORWARDED_ALLOW_IPS`, `GUNICORN_LOG_LEVEL`, `SHARWA_CHANNELS_RATE_LIMIT_PER_MINUTE` | ✅ script verified. `DJANGO_TESTING` is set by `manage.py test` itself; the six others belong in `.env.example` — [O-7](#o-7) |
| G1 frontend | `.env.example` `SHARWA_LIVE_MODULES` sample | unchanged since Step 50: KI-01, fixed in Step 52 (DOC-461 / DOC-535) | known |
| G6 | the two SQL blocks | public apps at `appstore 0007`, `billing 0013`, `core 0001`, `marketing 0001`, `sharwa_ship 0003`, `sharwapay 0003`, `tenants 0027`; store at `0236_advanced_products_api` | ✅ equals the expected table |
| G7 | the two shell checks | `[{'id': 1, 'name': 'Platform'}]`, `['localhost']`; no store outside `ready` | ✅ verified on this stack |
| G8 | `check_celery_queues.py` · `inspect active_queues` | exit 0 · 11 queues | ✅ |
| G10 | `GET /.well-known/sharwa-ai-jwks.json` | `503` `{"keys": []}` = SSO not configured | ✅ the documented "not configured" answer |
| G11 | `GET /api/v1/push/vapid-public-key/` · `POST /webhooks/kuraimi/topup/` | `{"publicKey": ""}` · `503` `{"ok": false, "error": "webhook_not_configured"}` | ✅ the documented "not configured" answers |
| G12 | the per-store snippet | `alnoor True`, `ghost1 False` | ✅ the snippet finds the store without a code |
| G15 | the `curl` loop, against Next.js with `SHARWA_MOCKS=off` | `401` for each without a session (as expected); with an owner session `501` «غير متاح بعد.» for each — `mockRoute` stops all three | ✅ as documented (the only guard is `SHARWA_MOCKS=off`, as the page's Discrepancy says) |
| G16 | `npm run lint` · `npx tsc --noEmit` · `npm run build` | lint exit 0 (77 s); typecheck exit 0 after `next typegen` ([O-5](#o-5)); build `✓ Compiled successfully in 51s`, exit 0 (75 s) | ✅ |

<a id="findings"></a>

## 5. Findings

<a id="o-1"></a>

### O-1 — `check --deploy` prints ~980 issues and the runbooks do not say 977 of them are expected · low · fixed in this step

Plain `manage.py check --deploy` prints 983 lines on the developer machine (982 on the verification stack): `drf_spectacular.W001` (497, "unable to resolve type hint for function …") and `W002` (480), and only 6 Django security checks. An operator reading the output for security problems has to find 6 lines among 977. `--fail-level ERROR` still exits 0, as the pages say. **Fixed**: one sentence added to [`runbooks/migrations.md`](runbooks/migrations.md) §1.2 and [`deployment/go-live-checklist.md`](deployment/go-live-checklist.md) G3. (Silencing the two codes in `SPECTACULAR_SETTINGS` would be a code change, outside this phase.)

<a id="o-2"></a>

### O-2 — the preview's new file name is not the one `--apply` uses · low · fixed in this step

`normalize_media_filenames` draws a new `uuid` on every run, so the target name printed by the preview (`37fe7c83….png`) is not the name `--apply` writes (`c5b074f6….png`). The page tells the operator to "keep the preview output" as the record of old and new names. **Fixed**: [`management-commands.md`](management-commands.md) §3.2 now says to keep the `--apply` output.

<a id="o-3"></a>

### O-3 — after a failed bulk `--tenant` run, the last printed prefix does not name the failing schema · medium · fixed in this step

Two facts from P2-3 and the django-tenants 3.14.0 source (`migration_executors/base.py`): (1) the `[n/N (pct%) standard:<schema>]` prefix is added by Django's `OutputWrapper` style function, which is applied **only when stdout is a terminal** — in `deploy.sh` logs, journald or a redirected file the lines read `=== Starting migration` with no schema name; (2) the per-schema `django_migrations` table is created (`ensure_schema()`) **before** the "Starting migration" line, so a schema that does not exist fails before it prints anything, and the last prefix on screen belongs to the previous, successful schema. **Fixed**: [`runbooks/migrations.md`](runbooks/migrations.md) §4 and §6 now say this and point to the §1.4 query and `--schema` runs to find the culprit.

<a id="o-4"></a>

### O-4 — a fresh clone has no `logs/` folder · low · fixed in this step

Answered an open item of [`dev-setup-windows.md`](dev-setup-windows.md): the folder is not in the repository, and the first command stops with `ValueError: Unable to configure handler 'file'` (the traceback's cause is the missing `logs/sharwa_errors.log`). **Fixed**: the open item is closed and the troubleshooting row names the message actually printed.

<a id="o-5"></a>

### O-5 — `tsc --noEmit` fails on a fresh clone until Next.js has generated its route types · low · fixed in this step

`RouteContext` and `LayoutProps` are global helper types that Next.js 16 writes under `.next/types` (`next dev`, `next build` or `next typegen`). On a fresh clone, or right after the documented `rm -rf .next/types`, `npx tsc --noEmit` fails with `TS2304` on every route handler and on `src/app/layout.tsx`. `npx next typegen` (Next.js 16.4.2) regenerates them in seconds and `tsc` then exits 0. **Fixed**: [`testing/frontend-qa.md`](testing/frontend-qa.md) gate table and [`dev-setup-windows.md`](dev-setup-windows.md) Verify 6 now run `npx next typegen` before `tsc`.

<a id="o-6"></a>

### O-6 — no written procedure for creating a POS register · low · logged (scheduled)

`CashRegister` rows have no route, screen, admin registration or management command; a store cannot open a shift until support creates one. The merchant guide states the limitation; the operator side has no procedure. Registered as OI-22 ([`../architecture/90-open-items.md`](../architecture/90-open-items.md) §E); the one-line shell command used here is in P2-8.

<a id="o-7"></a>

### O-7 — six environment variables the code reads are absent from the backend `.env.example` · low · logged (scheduled)

`GUNICORN_ACCESS_LOG`, `GUNICORN_BIND`, `GUNICORN_ERROR_LOG`, `GUNICORN_FORWARDED_ALLOW_IPS`, `GUNICORN_LOG_LEVEL` (all `deploy/gunicorn.conf.py`, with defaults) and `SHARWA_CHANNELS_RATE_LIMIT_PER_MINUTE`. They are documented in [`environment.md`](environment.md); the template is a code file, so the fix goes with the A.13 fixes of Step 52 (DOC-535) — registered as OI-23.

<a id="not-run"></a>

## 6. What was not executed, and why

| Step | Why | Where it stands |
|---|---|---|
| `systemctl` / `journalctl` lines (`celery.md` §2, §6; `deploy.sh` 55-58; G8, G9) | no systemd in the verification container | the equivalent process commands were run (P2-5, P2-12) |
| Docker compose variants | no Docker engine in the container | the `release` → `web/worker/beat` order is read from `docker-compose.prod.yml`, unchanged |
| Custom domain §2, §5–§7, §9 (DNS, Nginx, certbot, renewal) | needs a real domain and a public host | must be done once on staging with a test domain |
| G2, G3, G5 with production values; `DEBUG=False` behaviour | the stack runs `DEBUG=True` by design | production checks; the commands themselves were verified |
| Restore from a dump; reverses blocked by data (0222, 0223, 0225, 0229) | destructive by design | the page's advice ("restore instead") stands |
| Windows-only details (`cmd` `set …&&`, Task Scheduler, `sharwa.bat`, hosts file) | Linux container | pass 1 ran on the Windows machine for the read-only commands |

Back to the [operations index](README.md).
