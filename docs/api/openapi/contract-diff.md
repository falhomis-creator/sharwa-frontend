# Zod ↔ OpenAPI contract diff

> **Source**: DOC-009 · inventory A.1 (the Data Contract is immutable), A.12 (test suites, mock E2E scripts)
> **Script**: [`scripts/openapi-contract-diff.ts`](../../../scripts/openapi-contract-diff.ts) · **Last run**: 2026-10-27 (step 02) — `reports`: 9/9 operations, **0 drift**
> **Last verified against code**: 2026-10-27 (step 02)

## 1. What it proves

The browser parses every API answer with a Zod schema (`apiFetch(path, schema)` in `src/lib/api-client.ts`). If parsing fails, the user sees «استجابة غير متوقعة من الخادم.». The OpenAPI file describes what **Django** sends, written from the Django code. The diff checks, operation by operation, that:

> **Django ⊆ Zod** — every response Django may send is accepted by the Zod schema the frontend parses it with.

The Zod schema is the immutable Data Contract (A.1). So when the diff fails, Django or its OpenAPI description must change, never the contract. The diff only reports. A real Django/Zod mismatch found here is raised as a discrepancy, and the Zod contract is not edited to make it pass.

## 2. Mapping rules

| Rule | Detail |
|---|---|
| **Which Zod schema** | The operation's `x-zod: <module>.<export>` in its fragment. `<module>` is the folder under `src/features/`; `<export>` is the exported Zod schema, e.g. `reports.reportDataSchema`. |
| **Where the module contract lives** | `src/features/<module>/schemas.ts`, or `src/features/<module>/schemas/index.ts` for modules split into a folder (`orders`, `products`, `platform-admin`, …). |
| **Component naming** | `<module>.<SchemaName>`: the module folder + the Zod export without the `Schema` suffix, in PascalCase. `reportDataSchema` → `reports.ReportData`; `exportJobSchema` → `reports.ExportJob`. Shared shapes have no prefix (`DisplayMoney`, `Currency`, `Detail`, `FieldErrors`, `Conflict*`, `PageEnvelope`). |
| **Which response** | The first `2xx` JSON response other than `204` (file downloads and empty bodies are not diffed). |
| **Zod side** | Zod 4's native `z.toJSONSchema(schema, { io: "input", unrepresentable: "any" })`. The **input** side is what `safeParse` checks: a field with `.default()` or `.optional()` is not required there. |

### 2.1 How nullable and optional translate

| Zod | JSON Schema from Zod | OpenAPI (Django side) must be |
|---|---|---|
| `z.string()` | `{type: string}`, in `required` | `type: string`, listed in `required`, **never** `null` |
| `z.string().nullable()` | `anyOf: [{type: string}, {type: null}]` | `type: [string, "null"]` — or plain `string` (stricter is fine) |
| `z.string().optional()` / `.default(x)` | not in `required` | anything: present or absent |
| `z.enum([...])` | `enum: [...]` | an `enum` (or `const`) whose values are all in the Zod enum |
| `z.number()` | `{type: number}` | `number` or `integer` |
| `z.record(z.string(), X)` | `additionalProperties: X` | `additionalProperties` compatible with `X` |
| `z.object({...})` (strips unknown keys) | `properties` | extra Django fields are allowed (reported as `info` with `--verbose`) |

Nullable fields recorded by the Phase 002 inventory, which the domain fragments must declare exactly so: provider limits are nullable (legacy rows show «—», INT-021); behaviour alerts whose member row is gone have `staff_id: null` (INT-022); Sharwa Ship zone geo bounds are optional but all-or-none, so the zone schema is nullable (INT-031); `store-config.tracking` is `null` when the feature is off or not in the plan (INT-023); review `latitude`/`longitude` are nullable (INT-021).

## 3. Procedure

```bash
# from sharwa-frontend
npx tsx scripts/openapi-examples.ts --check            # fixtures still parse with their contracts
python scripts/openapi/build.py --check                 # sharwa-v1.yaml matches urls.py + fragments
npx tsx scripts/openapi-contract-diff.ts               # Django ⊆ Zod for every documented operation
npx tsx scripts/openapi-contract-diff.ts --module orders --verbose   # one module, with stripped fields
```

Run it with the quality gates of every step: `npm run lint`, `rm -rf .next/types && npx tsc --noEmit`, and the Django suites of inventory A.12 (`python manage.py test api` in `sharwa_saas`). Exit codes: `0` no drift · `1` drift (or a missing export / JSON response) · `2` the script itself failed.

Output, one line per operation:

```
✓ GET /api/v1/reports/{code}/ (report-data.get) ⊆ reports.reportDataSchema
✗ GET /api/v1/reports/ (report-index.get) ⊆ reports.reportIndexSchema — 2 drift
    drift $[].reports[].allowed: required by Zod, optional in the OpenAPI response
    drift $[].reports[].status: Django value "archived" is not in the Zod enum
```

## 4. Pilot result — M25 Reports (the first live module)

| Operation | Zod contract | Result |
|---|---|---|
| `GET /api/v1/reports/` | `reports.reportIndexSchema` | ✓ |
| `GET /api/v1/reports/{code}/` | `reports.reportDataSchema` | ✓ |
| `POST /api/v1/reports/refresh-today/` | `reports.refreshSchema` | ✓ |
| `POST /api/v1/reports/{code}/exports/` | `reports.exportJobSchema` | ✓ |
| `GET /api/v1/reports/exports/` | `reports.exportListSchema` | ✓ |
| `GET /api/v1/reports/exports/{job_id}/` | `reports.exportJobSchema` | ✓ |
| `GET /api/v1/reports/schedules/` | `reports.scheduleListSchema` | ✓ |
| `POST /api/v1/reports/schedules/` | `reports.scheduleSchema` | ✓ |
| `PATCH /api/v1/reports/schedules/{pk}/` | `reports.scheduleSchema` | ✓ |

The download (`GET …/exports/{job_id}/download/`, a CSV/XLSX file) and the `DELETE` (204) carry no JSON body and are not diffed.

**The checker can fail.** Four drifts were injected into a copy of the YAML: an unknown enum value, a required field made optional, a `null` the contract refuses, and a `boolean` table cell. All four were caught: 6 findings across 5 operations, exit 1. The restored file reports 0 drift.

### 4.1 Differences a shape diff cannot see

These were found while writing the pilot. They are behaviour or message differences between the mock BFF and Django, not shape drift. They are recorded here for the reports domain step (Step 28) and do not change the contract:

| Where | Mock (`src/app/api/bff/reports/*`, `src/mocks/reports/*`) | Django (`api/views_reports.py`, `api/serializers.py`) |
|---|---|---|
| `GET /reports/` gate | requires `reports.view` (`mockRoute(…, { permission: "reports.view" })`) | session + plan feature `reports` only; each row's `allowed` carries the permission |
| `POST /reports/{code}/exports/` | refuses only a report that is not `available` | also refuses a report with `export_enabled` off: «هذا التقرير غير متاح للتصدير.» |
| `POST /reports/schedules/` with an empty email | «أدخل بريداً إلكترونياً صحيحاً.» | «أدخل البريد المستلم.» (`EmailField` `blank`) |

Plan feature `reports` gates the whole module in both (403 «ميزة التقارير غير مفعّلة في خطتك.»). Inventory A.5 does not list `reports` among the plan features checked by the API; Step 04 adds it to the conventions page.

## 5. Shape changes made during Phase 002 that the fragments must carry

The inventory records rows whose Django shapes were rewritten so the Zod contract would parse them. Their domain fragments must describe the **new** shape, and the diff will then confirm it:

| INT | Rows | Change |
|---|---|---|
| INT-046 (M38) | the five courier actions (`agent/shifts/start/`, `end-and-handover/`, `shipments/<id>/status/`, `fulfillments/<id>/scan-pickup/`, `partial-delivery/`) | start → `agent: {id, name}` + `closed_previous_shift_id`; handover → `handed_over_to: {id, name}`; partial delivery → `display_collected_amount`, `status`, numbers (not null) on a duplicate |
| INT-026 (M24) | returns «Ready» rows | adds `customer_name`, `lines_count`, `display_amount`, `location`, `timeline`, `decision_note`; `quantity`/`remaining` as numbers (they were decimal strings); RMA rows no longer `{rma_id, status}` |
| INT-044 (M36) | B2B drafts list | adds `created_by_name`, `escalated_at`; escalated first, then newest |
| INT-016 (M44) | PWA rows #11 / #13 (`pwa/install-event/`, `push/subscribe/`) | `push/subscribe/` takes `order_uuid` (phone derived from the order; `customer_phone` alone ignored; 400 `{order_uuid}` for an unknown order); install-event limit 300/min |

The «Ready» list (`specs/001-sharwa-frontend-platform/contracts/ready-api-v1.md`) is re-audited by DOC-463 / DOC-535.

## 6. Limits

- The diff checks **shapes**. It does not check status codes, gates, messages or business rules; those are verified by reading the code in each domain step and by the live Postman run (DOC-530).
- It is only as good as the fragment: an operation must be written from Django, not copied from Zod, or the diff proves nothing. Each fragment names its Django sources in its header comment.
- `z.toJSONSchema` represents refinements (`.refine`, `.superRefine`) and transforms as their base type. A contract that relies on them is diffed on its base shape only.
