# OpenAPI examples

> **Source**: DOC-013. **Generated** by `npx tsx scripts/openapi-examples.ts` from the mock fixtures (`src/mocks/<module>`), each one parsed with its Zod contract before it is written. Do not edit by hand. Rules: [`../README.md` §3](../README.md#3-examples-doc-013).

File name: `<operationId>.<status>.<json|csv>`. `operationId` is the Django URL name + `.` + the method, as in `sharwa-v1.yaml`. `scripts/openapi/build.py` attaches each file to its response as `externalValue`, and `scripts/openapi/postman.py` turns it into a saved Postman response.

| File | Operation | Status | Type |
|---|---|---|---|
| [`auth-csrf.get.200.json`](auth-csrf.get.200.json) | `auth-csrf.get` | 200 | JSON |
| [`report-data.get.200.json`](report-data.get.200.json) | `report-data.get` | 200 | JSON |
| [`report-export-create.post.201.json`](report-export-create.post.201.json) | `report-export-create.post` | 201 | JSON |
| [`report-export-detail.get.200.json`](report-export-detail.get.200.json) | `report-export-detail.get` | 200 | JSON |
| [`report-export-detail.get.404.json`](report-export-detail.get.404.json) | `report-export-detail.get` | 404 | JSON |
| [`report-export-download.get.200.csv`](report-export-download.get.200.csv) | `report-export-download.get` | 200 | CSV |
| [`report-export-list.get.200.json`](report-export-list.get.200.json) | `report-export-list.get` | 200 | JSON |
| [`report-index.get.200.json`](report-index.get.200.json) | `report-index.get` | 200 | JSON |
| [`report-refresh-today.post.200.json`](report-refresh-today.post.200.json) | `report-refresh-today.post` | 200 | JSON |
| [`report-schedule-detail.delete.404.json`](report-schedule-detail.delete.404.json) | `report-schedule-detail.delete` | 404 | JSON |
| [`report-schedule-detail.patch.200.json`](report-schedule-detail.patch.200.json) | `report-schedule-detail.patch` | 200 | JSON |
| [`report-schedule-list.get.200.json`](report-schedule-list.get.200.json) | `report-schedule-list.get` | 200 | JSON |
| [`report-schedule-list.post.201.json`](report-schedule-list.post.201.json) | `report-schedule-list.post` | 201 | JSON |
| [`report-schedule-list.post.400.json`](report-schedule-list.post.400.json) | `report-schedule-list.post` | 400 | JSON |

14 examples · fixture store `noor` · clock frozen at `FIXTURE_NOW` (identical output on every run).
