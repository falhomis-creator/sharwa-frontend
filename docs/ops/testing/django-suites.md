# Django test-suite register

> **Source**: DOC-520 · inventory A.12 · INT-001 → INT-049
> **Code**: `sharwa_saas/**/test*.py` · `manage.py` · `config/settings.py` · `.github/workflows/ci.yml`
> **Last verified against code**: 2026-10-27 (official Step 09) — **counts are static, see [§2](#counting)**

## 1. Purpose

One register of every Django test file: what it covers, which integration task it belongs to, how many tests it holds and what kind of database it needs. Use it to find "which suite pins this behaviour" and to run just that suite. The frontend gates are in [`frontend-qa.md`](frontend-qa.md); the pipeline that runs these suites is in [`ci.md`](ci.md).

**Totals (static scan): 160 test files · 1,814 test methods.** 49 integration tasks account for 521 of them; the rest are the legacy and phase suites ([§5](#legacy)).

<a id="counting"></a>

## 2. How the counts were made — and why they are not `--list` output

The roadmap's done-condition is "the register matches discovery output". Django has no `manage.py test --list`, and no test run was available while this page was written. The counts were therefore made by reading each test file's syntax tree: **one test = one method named `test*` inside a class whose base chain ends in a Django / django-tenants test case**. That differs from a real run in these cases: a test method inherited from a mixin or a base class is counted once, not once per subclass; `subTest` blocks count as one; tests created by code (loops) are not seen.

To replace the static count by the real one, on a machine with the virtual environment (this command was **not run**; treat it as a suggestion until someone has):

```bat
cd /d C:\sharwa_saas
call venv\Scripts\activate
set DJANGO_TESTING=1
python -c "import os, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings'); django.setup(); from django.test.runner import DiscoverRunner as R; print(R().build_suite(['.']).countTestCases())"
```

`manage.py test` sets `DJANGO_TESTING=1` itself (`manage.py`, whenever `test` is among the arguments); a plain `python -c` does not, so it is set by hand above. Discovery builds the suite without touching the database. If the printed number differs from 1,814, update this page and the totals in the changelog.

## 3. Running the suites

| What | Command | Notes |
|---|---|---|
| Everything (what CI runs) | `python manage.py test --noinput` | Needs PostgreSQL; the CI job first runs `migrate_schemas --shared`. |
| One file | `python manage.py test api.test_pos_api` | Each console / integration test file documents its own command in its docstring. |
| One class or method | `python manage.py test <module>.<Class>.<test_method>` | Standard Django labels. |
| Verbose | add `-v 2` | |

What `manage.py test` changes (all from code): it sets `DJANGO_TESTING=1`, which makes `config/settings.py` use **LocMemCache** instead of Redis, run Celery **eagerly** (`CELERY_TASK_ALWAYS_EAGER`), log at `WARNING`, and disable Sentry. No Redis, Celery worker or WhatsApp gateway is needed. The database is PostgreSQL (django-tenants needs schemas), created by Django as `test_<DB_NAME>`; the database user therefore needs permission to create databases.

Base classes seen (number of **files** that contain at least one class of that kind): `TenantTestCase` 142 (django-tenants creates a throw-away store schema for the class), `SimpleTestCase` 21 (no database), `TestCase` 14 (public schema only), and `TransactionTestCase` / the local `TenantTransactionTestCase` copies in 3 files (see [§6](#special)).

<a id="int"></a>

## 4. Integration-task suites (INT-001 → INT-049)

"Static" = tests counted in the file(s); "Roadmap" = the number the roadmap (A.12) states, where it states one.

| Task | Module | File(s) | Classes | Static | Roadmap | Match |
|---|---|---|---|---|---|---|
| INT-001 | Public API | `test_public_api.py` | 1 | 7 | — | — |
| INT-002 | Tenant guard | `test_tenant_guard_api.py` | 1 | 5 | — | — |
| INT-003 | Dashboard | `test_dashboard_api.py` | 4 | 22 | — | — |
| INT-004 | Onboarding | `test_onboarding_api.py` | 5 | 28 | — | — |
| INT-005 | Products | `test_products_api.py` | 6 | 30 | — | — |
| INT-006 | Catalog (org models + serializers) | `test_catalog_api.py`, `test_catalog_serializers.py` | 12 | 37 | — | — |
| INT-007 | Orders | `test_orders_api.py` | 5 | 18 | — | — |
| INT-008 | Search | `test_search_api.py` | 1 | 7 | — | — |
| INT-009 | Notifications | `test_notifications_api.py` | 1 | 7 | — | — |
| INT-010 | Settings | `test_settings_api.py` | 1 | 11 | — | — |
| INT-011 | Storefront catalog | `test_storefront_catalog_api.py` | 1 | 6 | — | — |
| INT-012 | Storefront product | `test_storefront_product_api.py` | 1 | 5 | — | — |
| INT-013 | Storefront cart | `test_storefront_cart_api.py` | 1 | 8 | — | — |
| INT-014 | Storefront checkout | `test_storefront_checkout_api.py` | 1 | 10 | — | — |
| INT-015 | Order tracking | `test_order_tracking_api.py` | 1 | 12 | — | — |
| INT-016 | PWA & push | `test_pwa_push_api.py` | 1 | 11 | — | — |
| INT-017 | Customers | `test_customers_api.py` | 1 | 13 | — | — |
| INT-018 | Design / theme | `test_design_api.py` | 1 | 7 | — | — |
| INT-019 | Marketing | `test_marketing_api.py` | 1 | 10 | — | — |
| INT-020 | Payments | `test_payments_api.py` | 1 | 6 | — | — |
| INT-021 | Shipping | `test_shipping_api.py` | 1 | 9 | 9 | = |
| INT-022 | Staff | `test_staff_api.py` | 1 | 9 | 9 | = |
| INT-023 | Integrations (domains) | `test_integrations_api.py` | 5 | 21 | 21 | = |
| INT-024 | Inventory | `test_inventory_api.py` | 1 | 9 | 9 | = |
| INT-025 | Locations | `test_locations_api.py` | 1 | 7 | 8 | ⚠ 8 |
| INT-026 | Returns | `test_returns_api.py` | 1 | 8 | 8 | = |
| INT-027 | Reports | `test_reports_api.py` | 3 | 19 | 3 | ⚠ 3 |
| INT-028 | Wallets | `test_wallets_api.py` | 2 | 5 | 5 | = |
| INT-029 | Engagement | `test_engagement_api.py` | 1 | 4 | 4 | = |
| INT-030 | Platform console | `test_platform_console_api.py` | 3 | 14 | 14 | = |
| INT-031 | Platform money | `test_platform_money_api.py` | 3 | 7 | 7 | = |
| INT-032 | Platform billing | `test_platform_billing_api.py` | 2 | 7 | 7 | = |
| INT-033 | Point of sale | `test_pos_api.py` | 1 | 17 | 17 | = |
| INT-034 | Partners | `test_partners_api.py` | 1 | 8 | 8 | = |
| INT-035 | Procurement | `test_procurement_api.py` | 1 | 9 | 9 | = |
| INT-036 | Bookings | `test_bookings_api.py` | 1 | 9 | 9 | = |
| INT-037 | Channels (inbox) | `test_channels_api.py` | 1 | 10 | 10 | = |
| INT-038 | Marketplaces | `test_marketplaces_api.py` | 1 | 9 | 9 | = |
| INT-039 | Dropshipping | `test_dropshipping_api.py` | 2 | 11 | 11 | = |
| INT-040 | App store | `test_apps_api.py` | 1 | 7 | 7 | = |
| INT-041 | Sharwa AI | `test_sharwa_ai_api.py` | 1 | 6 | 6 | = |
| INT-042 | Support | `test_support_api.py` | 1 | 6 | 6 | = |
| INT-043 | Expenses | `test_expenses_api.py` | 1 | 8 | 8 | = |
| INT-044 | B2B | `test_b2b_api.py` | 4 | 8 | 8 | = |
| INT-045 | Advanced products (extras) | `test_product_extras_api.py` | 4 | 10 | 10 | = |
| INT-046 | Courier | `test_courier_api.py` | 3 | 5 | 6 | ⚠ 6 |
| INT-047 | Sharwa Ship | `test_sharwa_ship_api.py` | 3 | 6 | 7 | ⚠ 7 |
| INT-048 | Sharwa Pay | `test_sharwa_pay_api.py` | 3 | 9 | 9 | = |
| INT-049 | Roll-up | `test_rollup_api.py` | 1 | 4 | 4 | = |
| | **Total** | **50 files** | | **521** | | |

⚠ in the last column marks a difference between the roadmap number and the static count — see [§7](#discrepancies). The roadmap states no counts for INT-001 → INT-020.

Not in this table but also under `api/`:

| File | Classes | Tests | Base class |
|---|---|---|---|
| `api/test_auth_api.py` | 2 | 13 | TenantTestCase |
| `api/test_dev_media.py` | 2 | 7 | SimpleTestCase |
| `api/test_normalize_media.py` | 1 | 2 | TenantTestCase |
| `api/tests.py` | 1 | 8 | TenantTestCase |
| **4 files** | **6** | **30** | |

<a id="legacy"></a>

## 5. Legacy and phase suites

These predate the integration tasks, or are phase-numbered suites of the big features. The roadmap asks that the legacy ones named in it are re-run and kept green; they are listed by family.

### 5.1 Dropshipping, phases 1 → 5 (254 tests)

| File | Classes | Tests | Base class |
|---|---|---|---|
| `products/test_dropshipping_phase1.py` | 10 | 68 | SimpleTestCase, TenantTestCase |
| `products/test_dropshipping_phase2.py` | 11 | 69 | SimpleTestCase, TenantTestCase |
| `products/test_dropshipping_phase3.py` | 8 | 34 | SimpleTestCase, TenantTestCase |
| `products/test_dropshipping_phase4.py` | 8 | 45 | SimpleTestCase, TenantTestCase, support.TenantTransactionTestCase |
| `products/test_dropshipping_phase5.py` | 8 | 38 | TenantTestCase |
| **5 files** | **45** | **254** | |

`test_dropshipping_phase4.py` contains a **transaction-level** class (see [§6](#special)); phase 3 pins `feed_reader.MAX_FILE_BYTES` and a peak-memory bound for feed chunks ([`../upload-limits.md`](../upload-limits.md)).

### 5.2 Marketplaces, phases 1 → 5 (144 tests)

| File | Classes | Tests | Base class |
|---|---|---|---|
| `products/test_marketplaces_phase1.py` | 5 | 33 | TenantTestCase |
| `products/test_marketplaces_phase2.py` | 5 | 26 | TenantTestCase |
| `products/test_marketplaces_phase3.py` | 5 | 24 | TenantTestCase |
| `products/test_marketplaces_phase4.py` | 8 | 38 | TenantTestCase |
| `products/test_marketplaces_phase5.py` | 4 | 23 | TenantTestCase |
| **5 files** | **27** | **144** | |

### 5.3 Social channels, phases 1 → 8 (123 tests)

| File | Classes | Tests | Base class |
|---|---|---|---|
| `products/test_social_channels_phase1.py` | 1 | 8 | TenantTestCase |
| `products/test_social_channels_phase2.py` | 1 | 15 | TenantTestCase |
| `products/test_social_channels_phase3.py` | 1 | 6 | TenantTestCase |
| `products/test_social_channels_phase4.py` | 1 | 10 | TenantTestCase |
| `products/test_social_channels_phase5.py` | 1 | 14 | TenantTestCase |
| `products/test_social_channels_phase6.py` | 1 | 23 | TenantTestCase |
| `products/test_social_channels_phase7.py` | 8 | 27 | TenantTestCase |
| `products/test_social_channels_phase8.py` | 6 | 20 | TenantTestCase |
| **8 files** | **20** | **123** | |

`test_social_channels_phase2.py` is the suite that pins the Meta mapping rule (roadmap A.12).

### 5.4 Sharwa AI (123 tests, excluding `api/test_sharwa_ai_api.py`)

| File | Classes | Tests | Base class |
|---|---|---|---|
| `products/test_sharwa_ai_cart_publisher.py` | 3 | 31 | SimpleTestCase, TenantTestCase |
| `products/test_sharwa_ai_commerce_api.py` | 3 | 16 | SimpleTestCase, TenantTestCase |
| `products/test_sharwa_ai_gift.py` | 2 | 14 | SimpleTestCase, TenantTestCase |
| `products/test_sharwa_ai_phase10.py` | 1 | 7 | TenantTestCase |
| `products/test_sharwa_ai_phase3a.py` | 3 | 8 | SimpleTestCase, TenantTestCase |
| `products/test_sharwa_ai_phase3b.py` | 1 | 7 | TenantTestCase |
| `products/test_sharwa_ai_phase3c.py` | 1 | 6 | TenantTestCase |
| `products/test_sharwa_ai_phase4.py` | 3 | 5 | TenantTestCase, TenantTransactionTestCase, TransactionTestCase |
| `products/test_sharwa_ai_phase5.py` | 1 | 6 | TenantTestCase |
| `products/test_sharwa_ai_phase7.py` | 1 | 8 | TenantTestCase |
| `products/test_sharwa_ai_phase8.py` | 1 | 7 | TenantTestCase |
| `products/test_sharwa_ai_phase9.py` | 1 | 8 | TenantTestCase |
| **12 files** | **21** | **123** | |

### 5.5 Support, phases 1 → 3 (19 tests)

| File | Classes | Tests | Base class |
|---|---|---|---|
| `products/test_support_phase1.py` | 3 | 7 | TenantTestCase, TestCase |
| `products/test_support_phase2.py` | 3 | 5 | TenantTestCase, TenantTransactionTestCase, TransactionTestCase |
| `products/test_support_phase3.py` | 5 | 7 | TenantTestCase |
| **3 files** | **11** | **19** | |

### 5.6 Suppliers (26 tests) and Staff (32 tests, excluding `api/test_staff_api.py`)

| File | Classes | Tests | Base class |
|---|---|---|---|
| `products/test_suppliers_phase1.py` | 1 | 4 | TenantTestCase |
| `products/test_suppliers_phase2.py` | 1 | 4 | TenantTestCase |
| `products/test_suppliers_phase3.py` | 1 | 4 | TenantTestCase |
| `products/test_suppliers_purchase_orders.py` | 3 | 14 | TenantTestCase |
| **4 files** | **6** | **26** | |

| File | Classes | Tests | Base class |
|---|---|---|---|
| `products/test_staff_approvals.py` | 3 | 6 | TenantTestCase |
| `products/test_staff_behavior.py` | 1 | 5 | TenantTestCase |
| `products/test_staff_pos.py` | 1 | 5 | TenantTestCase |
| `products/test_staff_rbac.py` | 2 | 10 | TenantTestCase |
| `products/test_staff_sessions.py` | 1 | 5 | TenantTestCase |
| `products/test_staff_templates.py` | 1 | 1 | TenantTestCase |
| **6 files** | **9** | **32** | |

### 5.7 Reports (52 tests)

| File | Classes | Tests | Base class |
|---|---|---|---|
| `products/test_customer_report.py` | 1 | 8 | TenantTestCase |
| `products/test_product_report.py` | 1 | 9 | TenantTestCase |
| `products/test_report_exports.py` | 1 | 4 | TenantTestCase |
| `products/test_reports_finance_guard.py` | 1 | 3 | SimpleTestCase |
| `products/test_reports_phase_a.py` | 2 | 5 | TenantTestCase |
| `products/test_reports_phase_b.py` | 3 | 7 | TenantTestCase |
| `products/test_reports_phase_c.py` | 2 | 4 | TenantTestCase |
| `products/test_reports_phase_d_suppliers.py` | 1 | 3 | TenantTestCase |
| `products/test_reports_registry.py` | 1 | 4 | SimpleTestCase |
| `products/test_reports_rollup.py` | 1 | 5 | TenantTestCase |
| **10 files** | **14** | **52** | |

### 5.8 Other `products/` suites (400 tests)

| File | Classes | Tests | Base class |
|---|---|---|---|
| `products/test_audit_log.py` | 1 | 5 | TenantTestCase |
| `products/test_beat_fanout.py` | 2 | 8 | SimpleTestCase, TestCase |
| `products/test_campaigns.py` | 1 | 3 | TenantTestCase |
| `products/test_carrier_integration.py` | 1 | 6 | TenantTestCase |
| `products/test_catalog_org_models.py` | 4 | 15 | TenantTestCase |
| `products/test_checkout_service.py` | 5 | 12 | SimpleTestCase |
| `products/test_cod_collection.py` | 1 | 6 | TenantTestCase |
| `products/test_cost_stock_csv.py` | 1 | 6 | TenantTestCase |
| `products/test_cryptography_freeze.py` | 3 | 21 | SimpleTestCase, TenantTestCase, TestCase |
| `products/test_customer_engagement.py` | 1 | 12 | TenantTestCase |
| `products/test_customer_interactions.py` | 1 | 7 | TenantTestCase |
| `products/test_edge_cases.py` | 1 | 4 | TenantTestCase |
| `products/test_feed_reader_xml_safety.py` | 1 | 4 | SimpleTestCase |
| `products/test_media_isolation.py` | 4 | 19 | SimpleTestCase, TenantTestCase |
| `products/test_merchant_auth.py` | 1 | 7 | BaseTenantTestCase |
| `products/test_organization.py` | 1 | 7 | TenantTestCase |
| `products/test_organization_views.py` | 1 | 3 | TenantTestCase |
| `products/test_product_analytics.py` | 1 | 11 | TenantTestCase |
| `products/test_product_analytics_view.py` | 1 | 2 | TenantTestCase |
| `products/test_product_auction.py` | 3 | 11 | TenantTestCase |
| `products/test_product_commerce.py` | 2 | 7 | TenantTestCase |
| `products/test_product_display.py` | 1 | 8 | TenantTestCase |
| `products/test_product_lifecycle.py` | 1 | 6 | TenantTestCase |
| `products/test_product_personalization.py` | 3 | 12 | TenantTestCase |
| `products/test_product_sale_stock.py` | 1 | 8 | TenantTestCase |
| `products/test_product_specs.py` | 1 | 3 | TenantTestCase |
| `products/test_product_templates.py` | 3 | 23 | TenantTestCase |
| `products/test_product_type_shipping.py` | 1 | 6 | TenantTestCase |
| `products/test_push_notifications.py` | 1 | 10 | TenantTestCase |
| `products/test_pwa_install_tracking.py` | 1 | 6 | TenantTestCase |
| `products/test_refund_service.py` | 1 | 14 | TenantTestCase |
| `products/test_returns_b2b_api.py` | 2 | 8 | TenantTestCase |
| `products/test_reverse_logistics.py` | 1 | 6 | TenantTestCase |
| `products/test_shipment_state.py` | 1 | 9 | TenantTestCase |
| `products/test_shipment_weight.py` | 1 | 6 | TenantTestCase |
| `products/test_storefront_pagination.py` | 2 | 8 | TenantTestCase |
| `products/test_tasks.py` | 2 | 10 | TenantTestCase |
| `products/test_tasks_package.py` | 1 | 8 | SimpleTestCase |
| `products/test_variant_hierarchy.py` | 1 | 7 | TenantTestCase |
| `products/test_variant_options_scope.py` | 1 | 2 | TenantTestCase |
| `products/test_wa_simplify.py` | 1 | 3 | TenantTestCase |
| `products/test_zone_routing.py` | 1 | 6 | TenantTestCase |
| `products/tests.py` | 6 | 16 | BaseTenantTestCase, TenantTestCase |
| `products/tests_payment_policy.py` | 6 | 25 | TenantTestCase |
| `products/tests_payments.py` | 4 | 14 | TenantTestCase |
| **45 files** | **81** | **400** | |

Named in the roadmap and present: `tests.py`, `test_push_notifications.py`, `test_pwa_install_tracking.py`, `test_returns_b2b_api.py`, `test_cod_collection.py`, the three `test_suppliers_phase*.py` suites, `tests_payment_policy.py` (per-product payment policy and the amount due up front), `tests_payments.py` (direct synchronous payments with only `charge` patched), `test_carrier_integration.py`, `test_zone_routing.py`.

### 5.9 `config/` and `tenants/` (10 + 80 tests)

| File | Classes | Tests | Base class |
|---|---|---|---|
| `config/tests.py` | 2 | 10 | SimpleTestCase |
| **1 files** | **2** | **10** | |

| File | Classes | Tests | Base class |
|---|---|---|---|
| `tenants/test_engine_status.py` | 2 | 4 | TestCase |
| `tenants/test_logging_config.py` | 1 | 3 | SimpleTestCase |
| `tenants/test_platform_dues_dashboard.py` | 1 | 8 | TestCase |
| `tenants/test_provisioning.py` | 8 | 18 | TestCase |
| `tenants/test_reserved_names.py` | 3 | 13 | TestCase |
| `tenants/test_webhook_replay.py` | 3 | 24 | SimpleTestCase |
| `tenants/tests.py` | 1 | 10 | TestCase |
| **7 files** | **19** | **80** | |

<a id="special"></a>

## 6. Special-purpose suites

| Suite | Why it is special | Database behaviour |
|---|---|---|
| `products/test_support_phase2.py` (`RealConcurrencyRaceTests`) | Real threads with separate DB connections prove that `select_for_update` stops the double-reply race. `TestCase` wraps each test in a transaction, which hides data from other connections, so the file defines its own `TenantTransactionTestCase(TransactionTestCase)` (django-tenants 3.14 has none). | Creates a **real, committed** schema `test_conc` (domain `tenant.conc-test.com`) in `setUpClass` and drops it in `tearDownClass`. Slower; do not run two such suites against the same database at once. |
| `products/test_dropshipping_phase4.py` | Among other cases, 20 truly concurrent buyers (threads, real DB connections) on the last item must produce one order; it reuses the support suite's `TenantTransactionTestCase` with its own schema name. | Same pattern: a committed test schema. |
| `products/test_sharwa_ai_phase4.py` | Phase 4: media through MinIO, DB-connection hygiene during DeepSeek calls, Celery hardening. Defines its own `TenantTransactionTestCase` and uses `TransactionTestCase`. | Same pattern. |
| `api/test_platform_console_api.py`, `test_platform_money_api.py`, `test_platform_billing_api.py`, `test_sharwa_pay_api.py`, `test_public_api.py`, most of `test_onboarding_api.py` | Platform (public-schema) APIs: plain `TestCase`; stores are `Client` rows **without real schemas**, and reads from a store schema are patched. | Public schema only. |
| `api/test_platform_console_api.py::TenantSchemaReadsTests` | The exception: a `TenantTestCase` that checks the real, unpatched reads from a store schema (Sharwa Ship status, installations, custody) and that the connection returns to `public`. | Needs a real test store schema. |
| `tenants/test_provisioning.py`, `test_reserved_names.py`, `test_webhook_replay.py` | Asynchronous schema provisioning (the real `CREATE SCHEMA` plus ~208 migrations is mocked, so the suite is fast), reserved store names (`ai`, `console`) and the base domain, and replay protection of SharwaConnect / Sharwa AI webhooks. | `TestCase` / `SimpleTestCase`, public schema, no real store schema. |
| `products/test_cryptography_freeze.py` | Pins the on-disk format of the vendored, patched `django_cryptography` (AES-256-CBC + HMAC-SHA256 over a pickled value) so that an upgrade keeps reading the gateway, marketplace, supplier and 3PL secrets already stored. | Mixed (`SimpleTestCase`, `TestCase`, `TenantTestCase`). |

<a id="discrepancies"></a>

## 7. Known failing tests and discrepancies

**Known failures.** The backend CI comment (`.github/workflows/ci.yml`, step "Test suite") records owner decision D1 of 2026-10-15: the job is a **strict gate**, and **15 legacy tests are known to fail** — `products/tests_payment_policy.py` ×12, `products/test_sharwa_ai_phase3a.py` ×1, "2 from Phase 0" — "until then this job is expected to be red". The list was not re-run here; check it before relying on a green run. See [`ci.md`](ci.md).

> ⚠️ Discrepancy — roadmap says `test_locations_api.py` (025) has 8 tests, `test_courier_api.py` (046) 6 and `test_sharwa_ship_api.py` (047) 7 / static count finds 7, 5 and 6. Each is one fewer than the roadmap. The files may use a construct the static scan does not count (an inherited method, a generated test), or a test was removed after the roadmap figure. A real run (§2) settles it.

> ⚠️ Discrepancy — roadmap says `test_reports_api.py` + `ReportsLocationFilterTests` (027) has 3 tests / the file holds 19 across 3 classes. The roadmap figure appears to be the number of classes (3), or only the tests added by INT-027; it is not the file total. Documented as 19.

> ⚠️ Discrepancy — roadmap says the staff suite (022) has "9; 101 incl. legacy" / the static scan finds 9 in `api/test_staff_api.py` and 32 in the six `products/test_staff_*.py` legacy files (41). The 101 cannot be reproduced from the staff files alone; it probably includes other suites that exercise staff behaviour (`products/tests.py`, `test_merchant_auth.py`). Not resolved.

> ⚠️ Discrepancy — roadmap lists `api/test_catalog_api.py` and `api/test_catalog_serializers.py` under INT-006 / the scan counts them together as 37 (16 + 21); the roadmap gives no number, so there is nothing to compare.

## 8. Checking the register

- Total: 160 files, 1,814 methods (static). Sum of this page's tables: INT tasks 521 + `api/` extras 30 + `config/` 10 + `tenants/` 80 + `products/` families 773 + other `products/` 400 = 1,814.
- New suites: add a row here when a new integration task adds `api/test_<module>_api.py`; keep the module docstring's "how to run" line (the existing files all have one).

## 9. Related pages

- [`ci.md`](ci.md) — how and where the suite runs
- [`frontend-qa.md`](frontend-qa.md) — the frontend gates
- [`../environment.md`](../environment.md) §3.9 — `DJANGO_TESTING`
- [`README.md`](README.md) — testing index
