# Management commands and debug-only codes

> **Source**: DOC-513 · inventory A.10 · INT-033, INT-020
> **Code**: `sharwa_saas/products/management/commands/*` · `tenants/management/commands/*` · `sharwa.bat` · `deploy/deploy.sh` · `products/services/pos_service.py` · `api/views_onboarding.py` · `products/abandoned_cart_service.py`
> **Last verified against code**: 2026-10-27 (official Step 09)

## 1. Purpose

Every custom `manage.py` command of the Django project: what it does, which schemas it touches, whether it is safe on production, and whether anything schedules it. The three debug-only codes (`123456`, `2468`) are in [§5](#debug-codes). Nothing here was executed while writing the page (the shell on the machine was unavailable); output lines are copied from the code.

All commands run from the Django repository root with the virtual environment active. Windows `cmd` (UTF-8 so Arabic names print correctly — the same two lines `sharwa.bat` uses):

```bat
cd /d C:\sharwa_saas
call venv\Scripts\activate
chcp 65001 >nul
set PYTHONUTF8=1&& set PYTHONIOENCODING=utf-8
python manage.py <command> [options]
```

Linux: `source venv/bin/activate && python manage.py <command>`. The service environment (`.env` or systemd / compose) must be the one the target environment uses — a command run with a development `.env` against a production database is the most common mistake.

## 2. Register

"Scope" = which schemas the command reads or writes. "All stores" means `Client.objects.exclude(schema_name='public')` inside `schema_context`, one store at a time.

| Command | App | Scope | What it does | Production | Scheduled by |
|---|---|---|---|---|---|
| [`set_pos_manager_code`](#set_pos_manager_code) | products | one store (`--schema`) | Sets or clears the POS manager code (stored hashed) | Yes — the only way to set the code | operator, once per store |
| [`normalize_media_filenames`](#normalize_media_filenames) | products | all stores + `public` (or `--schema`) | Renames non-ASCII media files to `uuid` names and fixes every reference | Yes, after a backup; preview first | operator, once after INT-020 |
| [`send_abandoned_cart_reminders`](#send_abandoned_cart_reminders) | products | all stores | Sends step-1 / step-2 abandoned-cart reminders | Yes | **Nothing in the repository** — external cron / Task Scheduler, hourly suggested |
| [`release_stuck_orders`](#release_stuck_orders) | products | all stores | Cancels `pending_payment` orders older than a timeout and returns their stock | Yes; `--dry-run` first | **Nothing in the repository** — external cron |
| [`migrate_passwords`](#migrate_passwords) | tenants | all stores | Hashes any plaintext `StoreSetting.admin_password` | Yes, idempotent | `deploy.sh` / compose `release` on **every** release |
| [`migrate_merchant_phone`](#migrate_merchant_phone) | tenants | all stores → `public` | Copies `whatsapp_number` into `Client.merchant_phone` | Yes, idempotent | `deploy.sh` / compose `release` on **every** release |
| [`backfill_whatsapp_app_installations`](#backfill_whatsapp_app_installations) | products | all stores | Creates the `whatsapp` app installation where missing | Yes, once, idempotent | operator, when the app-store feature was deployed |
| [`seed_variant_templates`](#seed_variant_templates) | products | all stores | Seeds the 35 sector templates, variants and product templates | Yes, idempotent (`get_or_create`) | operator |
| [`generate_sharwa_pay_icons`](#generate_sharwa_pay_icons) | tenants | none (writes `static/sharwa_pay/`) | Draws the three PWA icons | Yes | operator, then `collectstatic` |
| [`sharwa_ai_engine_status`](#sharwa_ai_engine_status) | tenants | all stores, read-only | Lists each store's engine reference and whether it can be a gift-link label | Yes (read-only) | operator |
| [`audit_personalization_variant_conflicts`](#audit-commands) | products | all stores or one (`schema_name`), read-only | Finds personalization inputs that should have been variants | Yes (read-only) | one-off audit |
| [`audit_sharwa_pay_mislabels`](#audit-commands) | products | all stores or one, read-only | Finds orders labelled `sharwa_pay` with no wallet transaction | Yes (read-only) | one-off audit |
| [`reset_app_installation`](#dev-commands) | products | named stores | Deletes an app installation **and everything cascading from it** | **No** — test data only | never |
| [`seed_store`](#dev-commands) | products | one store (positional) | Fake categories and products (Faker) | **No** — local only | never |
| [`seed_products`](#dev-commands), [`seed_test_products`](#dev-commands) | products | one store (`-s`) | 50 fake products each | **No** | never |
| [`seed_tenants`](#dev-commands) | tenants | creates stores | Load-test stores and products | **No** | never |

Standard commands the operations pages rely on: `migrate_schemas --shared`, `migrate_schemas --tenant`, `collectstatic --noinput`, `check --deploy --fail-level ERROR`, `makemigrations --check --dry-run`, `test` ([`testing/django-suites.md`](testing/django-suites.md)). The release pipeline (`deploy/deploy.sh` and the compose `release` service) runs, in this order: `check --deploy`, `deploy/check_celery_queues.py`, `migrate_schemas --shared`, `migrate_schemas --tenant`, `migrate_passwords`, `migrate_merchant_phone`, `collectstatic --noinput`, then reloads Gunicorn and restarts the worker and Beat ([`runbooks/migrations.md`](runbooks/migrations.md), DOC-510).

<a id="set_pos_manager_code"></a>

## 3. Commands used in production

### 3.1 `set_pos_manager_code`

The manager code lets a cashier release a discount above their role's ceiling at the till (INT-033, M16). It is stored only as a Django password hash in `StoreSetting.pos_manager_code_hash`; the raw code is never saved or shown again.

```bash
python manage.py set_pos_manager_code --schema=<STORE_SCHEMA> <CODE>     # set (4 to 8 digits)
python manage.py set_pos_manager_code --schema=<STORE_SCHEMA> --clear    # remove
```

| Rule | Behaviour |
|---|---|
| Code format | `^\d{4,8}$`, otherwise `CommandError` «الرمز 4 إلى 8 أرقام (أو استخدم --clear).» |
| Store | `public` or a schema that has no `Client` → `CommandError` «لا يوجد متجر بالـ schema «<schema>».» |
| Success | «ضُبط رمز المدير لنقطة البيع لـ «<schema>».» / «مُسح رمز المدير لـ «<schema>».» |
| No code set (production) | Typing a code at the till is refused: «لم يُعيَّن رمز مدير لنقطة البيع بعد — أرسل طلب اعتماد للمدير.» The approval-request path (M18 queue) stays available. |
| Wrong code | «رمز المدير غير صحيح.»; after **5** wrong attempts the register is locked for **15 minutes** (900 s) with «أُقفل رمز المدير مؤقتاً بعد 5 محاولات خاطئة. حاول بعد 15 دقيقة أو أرسل طلب اعتماد.» |

Safety: the code is part of the command line, so it lands in the shell history and the process list. Run it yourself on the server, give the manager the code on a private channel, and set a different code per store. Re-running replaces the previous hash; there is no "show" command. Setting a code per store is a go-live gate ([`deployment/go-live-checklist.md`](deployment/go-live-checklist.md), DOC-517).

<a id="normalize_media_filenames"></a>

### 3.2 `normalize_media_filenames`

Since 2026-10-24 `core.uploads.tenant_upload_path` stores any upload with a non-ASCII name under a `uuid` name. This command fixes the files uploaded before that (screenshots named «لقطة_شاشة_….png» and similar): it renames the file **on disk, in the same folder**, keeps the extension, and updates every `FileField` / `ImageField` row that points to it, in each store schema and in `public`.

```bash
python manage.py normalize_media_filenames                    # preview only (default)
python manage.py normalize_media_filenames --apply            # do it
python manage.py normalize_media_filenames --apply --schema <STORE_SCHEMA>
```

Output (preview): one line per file `<schema> <app.Model>.<field>: <old> → <new>`, then «معاينة — لم يتغيّر شيء (أضف --apply للتنفيذ): ملفات N · صفوف N · مفقودة على القرص N». With `--apply` the summary starts with «نُفّذ». A referenced file that is not on disk is listed as «[مفقود] …» and counted; its row is **not** changed. An unknown `--schema` prints «المخطط '…' غير موجود.» and does nothing.

Safety: back up `media/` and the database first. The rename uses `os.replace` on the local file system (for other storage back ends it copies then deletes). There is no undo command; the old and new names are printed, so keep the **`--apply`** output. The preview draws its own `uuid`, so the new name it prints is not the name `--apply` will use (verified in Step 51, [`_verification.md`](_verification.md#o-2)). Run the preview, read the «مفقود» lines, then apply. Rows are updated after each file move, not in one transaction, so an interruption can leave a few files renamed with rows not yet updated — re-run the same command (already-ASCII names are skipped, and a moved file that is still referenced by its old name shows up as «مفقود» for you to repair by hand).

<a id="send_abandoned_cart_reminders"></a>

### 3.3 `send_abandoned_cart_reminders`

For every store: builds the store's base URL (the custom domain if set, otherwise the primary `Domain`; a store with neither is skipped with a warning «لا يوجد نطاق موثوق — تخطي هذا المتجر.»), then calls `run_abandoned_cart_reminders(base_url)`.

```bash
python manage.py send_abandoned_cart_reminders
```

What the engine does (`products/abandoned_cart_service.py`): returns `{'sent': 0, 'skipped': 'disabled'}` when the store's `AbandonedCartSettings.is_enabled` is off; otherwise promotes stale carts to `abandoned`, then for step 1 and step 2 sends a reminder to each cart with `status='abandoned'`, a total ≥ the store's minimum and the step's delay elapsed. `_send_one_reminder` picks the channel (an earlier conversation, otherwise WhatsApp if enabled; e-mail / SMS are not implemented, the cart is skipped with a warning), writes a usage-log row and queues `dispatch_channel_message`. A "sent" count therefore means **queued**, not delivered. The same `_send_one_reminder` serves the manual "send reminder" action of the marketing screen (`marketing_service.py`), so both paths behave identically.

Isolation: each store is wrapped in its own `try/except`; a failing store prints «[<schema>] فشل — انظر السجل.» and the loop continues. Safe to run repeatedly: a cart is reminded once per step. **There is no Beat entry or cron line for it in the repository**; until one is added, reminders are sent only when someone runs the command. Suggested: hourly cron (`0 * * * *`) on the host that has the application environment — a decision for fares (see [`runbooks/celery.md`](runbooks/celery.md), DOC-507).

<a id="release_stuck_orders"></a>

### 3.4 `release_stuck_orders`

Cancels orders that stayed in `pending_payment` longer than a timeout and returns their reserved stock, store by store.

```bash
python manage.py release_stuck_orders --dry-run                # list what would be cancelled
python manage.py release_stuck_orders                          # default timeout 60 minutes
python manage.py release_stuck_orders --minutes 120
```

For each order: `release_reserved_stock()`, then `status='cancelled'`, `payment_status='failed'`, inside `transaction.atomic()`. Output: `[dry-run] [<schema>] سيُلغى الطلب #<id> (أُنشئ <time>)` per order, `[<schema>] أُلغي N طلب pending_payment.` per store (`سيُلغى` in dry-run) and a final «اكتمل. أُلغي إجمالاً N طلب.» (or «اكتمل. (تجربة جافة — بلا تعديل)»).

Safety: it never touches `payment_review` — that status means the payment outcome is undecided and money may already have left the customer; those orders are decided by hand in the review screen. It does not write an order timeline event or a stock-ledger movement (see the stock-ledger discrepancy list in [`../architecture/44-stock-ledger.md`](../architecture/44-stock-ledger.md)). Like the previous command it is not scheduled anywhere in the repository. A related Beat task, `products.tasks.escalate_stale_manual_transfers` (manual transfers in `awaiting_payment`), covers a different status.

<a id="migrate_passwords"></a>

### 3.5 `migrate_passwords` and `migrate_merchant_phone` <a id="migrate_merchant_phone"></a>

Both are one-time data migrations kept in the release pipeline so a restored old database is brought forward automatically. Both are idempotent.

- `migrate_passwords` — for each store, if `StoreSetting.admin_password` is not a recognisable hash (`identify_hasher` fails) it is replaced by `make_password(...)`. Prints «Upgraded tenant: <schema>» per store and «Done! Upgraded: N, Failed: N».
- `migrate_merchant_phone` — copies each store's `StoreSetting.whatsapp_number`, cleaned by `clean_phone_number`, to `Client.merchant_phone` in `public`. A number that cannot be cleaned counts as empty; a number already owned by another store (unique violation) is skipped with «Duplicate phone … Skipped to prevent crash.» Prints «Migration complete! Success: N, Duplicates Skipped: N, Empty: N». It never overwrites on a duplicate, so after a restore check the duplicate count.

<a id="backfill_whatsapp_app_installations"></a>

### 3.6 `backfill_whatsapp_app_installations`

Creates `StoreAppInstallation(app_code='whatsapp', is_active=True)` for every store that has none, so WhatsApp notifications keep working for stores that existed before the app store. Output «تم إنشاء N تثبيت جديد، وتخطّي N متجر يملك تثبيتاً مسبقاً.» Unlike the other store loops it has no `try/except` per store: one broken schema stops the run (rows already created stay).

### 3.7 `seed_variant_templates` <a id="seed_variant_templates"></a>

Seeds, in every store, the 35 business-sector templates with their variable dictionaries and a ready product template each (`GlobalVariantTemplate`, `VariantAttribute`, `ProductTemplate`). Uses `get_or_create`, with an independent `try/except` per store, so it can be repeated.

### 3.8 `generate_sharwa_pay_icons` <a id="generate_sharwa_pay_icons"></a>

Draws `icon-192.png`, `icon-512.png` and `icon-512-maskable.png` (a white wallet on `#4f46e5`, no text) into `static/sharwa_pay/` so the Sharwa Pay PWA meets the install criteria. Needs Pillow ([`dependencies.md`](dependencies.md)); run `collectstatic` afterwards in production.

### 3.9 `sharwa_ai_engine_status` <a id="sharwa_ai_engine_status"></a>

Read-only. Prints a tab-separated table `tenant_ref  active  link_label  primary_domain  name` for every store, then `stores=<n> invalid_link_label=<n>`. `--invalid-only` shows only stores whose schema name cannot be used as a label in the engine's gift link `https://<tenant_ref>.<TENANT_BASE_DOMAIN>/checkout/gift/<id>`; for those the engine hands the customer to a human instead of a link. After checking, the owner registers each valid store at the engine with `create-tenant --platform-ref <tenant_ref> --name "<name>"` (engine side).

<a id="audit-commands"></a>

### 3.10 Audit commands (read-only)

- `audit_personalization_variant_conflicts [schema_name]` — lists products where a personalization input (engraving, printing, gift text — deliberately stockless) was used for something that should be a real variant; it changes nothing because creating a variant with zero stock could zero out a product's visible stock.
- `audit_sharwa_pay_mislabels [schema_name]` — lists orders marked `payment_method='sharwa_pay'` that have no `SharwaPayWalletTransaction`. Before the checkout fix, a wallet that covered the full amount still produced that label, and the merchant credit logic trusts that field; the command only reports so the owner can decide on a correction.

<a id="dev-commands"></a>

## 4. Development and test commands — never on production

| Command | Why it is dangerous |
|---|---|
| `reset_app_installation <schema…> [--app whatsapp]` | Deletes the `StoreAppInstallation` and, by cascade, `AppUsageLog`, `AppTemplate` and `AppInstallationEvent` of those stores. Test stores only. |
| `seed_store <schema> [--categories 20] [--products 1000] [--clear] [--seed N]` | Generates fake data in **one named** store; `--clear` first deletes all categories and products of that store (manual confirmation). The name is mandatory so a live store is never hit by accident. |
| `seed_products -s <schema>`, `seed_test_products -s <schema>` | Two commands with the same help text («يزرع 50 منتج وهمي لاختبار الضغط بضغطة زر»): 50 fake products. Duplicate of each other; keep one when the code is next touched. |
| `seed_tenants [--count 5] [--products 20]` | Creates real schemas (`store_test_<n>_<suffix>`, domains `…sharwa.local`) with fake merchants and products — each runs the full tenant migrations. |

## 5. Debug-only codes <a id="debug-codes"></a>

These work **only while `DEBUG=True`**. They exist so a developer can run the sign-up and POS flows without a WhatsApp gateway. In production (`DEBUG=False`) none of them is accepted, but the safety depends on one environment variable, so [`deployment/go-live-checklist.md`](deployment/go-live-checklist.md) (DOC-517) makes "DEBUG off" a gate and [`environment.md`](environment.md) §6 lists every DEBUG-only behaviour.

| Code | Where it is accepted | Condition | Code location |
|---|---|---|---|
| `123456` (`DEBUG_STATIC_OTP`) | Store sign-up, OTP verify step | `DEBUG`; any attempt, no WhatsApp message is sent (the real code is logged instead) | `api/views_onboarding.py:85, 129, 321` |
| `123456` | POS large refund, OTP check | `DEBUG` **and** a refund challenge has been created; the code is logged instead of sent | `products/services/pos_service.py:1201, 1232` (imports the constant from `views_onboarding`) |
| `2468` (`DEBUG_MANAGER_CODE`) | POS manager code (discount above the role ceiling) | `DEBUG` **and** the store has **no** manager code hash set. After `set_pos_manager_code` the real code is required and `2468` is rejected | `pos_service.py:74, 885` |

The wrong-code lockouts still apply to the debug codes (the manager-code lock counts failures; the refund OTP allows 3 attempts).

## 6. `sharwa.bat` (Windows development)

`sharwa.bat` in the repository root is the developer's launcher, not a deployment tool: it changes to its own folder (`cd /d "%~dp0"`), switches the console to UTF-8 (`chcp 65001`, `PYTHONUTF8=1`, `PYTHONIOENCODING=utf-8`) so Arabic file names in `django.request` logs are readable instead of garbled, activates `venv\Scripts\activate` (edit the folder name if yours is `env` or `.venv`), and runs `python manage.py runserver`. It does not start Celery, Beat, Redis or the Next.js server — [`dev-setup-windows.md`](dev-setup-windows.md) (DOC-519) covers running all of them together.

## 7. Failure modes and fixes

| Failure | Symptom | Cause | Fix |
|---|---|---|---|
| `KeyError: 'SECRET_KEY'` on any command | Command never starts | `.env` not found / not loaded | [`environment.md`](environment.md) §5. |
| A command "works" but changes nothing in the live site | Counts are zero | Ran with the development `.env` (different database) | Check `DB_NAME` / `DB_HOST` before running. |
| Output shows `[<schema>] فشل — انظر السجل.` | One store failed, others continued | An exception inside that store (log has the traceback) | Fix the store, re-run; the loops are idempotent. |
| Arabic text in the console is `????` | Console code page | `chcp 65001` and `PYTHONUTF8=1` missing | §1 snippet. |
| Reminders / stuck orders never processed | No Beat entry or cron | Not scheduled in the repository | Add a cron / Task Scheduler entry; record it in [`runbooks/celery.md`](runbooks/celery.md). |

## 8. Related pages

- [`environment.md`](environment.md) — variables, `DEBUG`-only behaviour
- [`upload-limits.md`](upload-limits.md) — what `normalize_media_filenames` protects against
- [`runbooks/migrations.md`](runbooks/migrations.md) — release order of the commands above
- [`../architecture/40-money.md`](../architecture/40-money.md), [`../architecture/45-approvals.md`](../architecture/45-approvals.md) — POS discount approval path
