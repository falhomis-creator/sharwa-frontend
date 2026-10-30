/**
 * OpenAPI examples from the mock fixtures (Phase 003, DOC-013) — docs/api/openapi/README.md §Examples.
 *
 *   npx tsx scripts/openapi-examples.ts            # write docs/api/openapi/examples/*
 *   npx tsx scripts/openapi-examples.ts --check    # validate only, write nothing
 *
 * Every example is produced by the SAME fixture function the mock BFF serves (src/mocks/<module>),
 * which each INT task aligned to Django, then parsed with the module's Zod schema before it is
 * written — an example that does not parse fails the run (exit 1). File name:
 * `<operationId>.<status>.json` (operationId = the Django URL name + "." + method, as in
 * sharwa-v1.yaml). Arabic sample text is kept as the fixture has it. The YAML builder attaches each
 * file to its operation as an `externalValue` example.
 *
 * Add a module: append producers to PRODUCERS (one per documented operation) in its domain step.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z, type ZodType } from "zod";
import type { Session } from "@/features/dashboard-shell/schemas";
import * as reports from "@/features/reports/schemas";
import { reportData, reportIndex, refreshToday, reportCsv } from "@/mocks/reports/data";
import { createExport, listExports, readExport } from "@/mocks/reports/exports";
import { createSchedule, deleteSchedule, listSchedules, patchSchedule } from "@/mocks/reports/schedules";
import { MOCK_CSRF_TOKEN } from "@/mocks/dashboard/auth";
import { FIXTURE_NOW } from "@/mocks/store-state";

// Fixtures stamp writes with max(Date.now(), FIXTURE_NOW): freeze the clock so examples are reproducible.
Date.now = () => FIXTURE_NOW;

type Producer = {
  operationId: string;
  status: number;
  /** Zod contract the example must parse with (`x-zod` of the operation, or the error body shape). */
  schema: ZodType;
  produce: () => unknown;
  /** Raw (non-JSON) examples, e.g. a CSV download. */
  ext?: string;
};

const STORE = "noor"; // the main fixture store (src/mocks); never a real store
const OWNER: Session = {
  kind: "merchant",
  store_name: "متجر نور",
  store_host: "noor.localhost",
  features: ["reports", "inventory"],
};
const detail = z.object({ detail: z.string() });
const csrf = z.object({ csrfToken: z.string() });

/** MockResult → body (ok) or throws, so a producer cannot silently return an error by mistake. */
function ok<T>(r: { ok: true; data: T } | { ok: false; status: number; body: unknown }): T {
  if (!r.ok) throw new Error(`fixture answered ${r.status}: ${JSON.stringify(r.body)}`);
  return r.data;
}
function fail(r: { ok: boolean; status?: number; body?: unknown }, status: number): unknown {
  if (r.ok || r.status !== status) throw new Error(`expected a ${status} fixture answer, got ${JSON.stringify(r)}`);
  return r.body;
}

let exportId = 0;
let scheduleId = 0;
const PRODUCERS: Producer[] = [
  // ── auth (overview/csrf.md) ──
  { operationId: "auth-csrf.get", status: 200, schema: csrf, produce: () => ({ csrfToken: MOCK_CSRF_TOKEN }) },
  // ── M25 reports (INT-027) ──
  { operationId: "report-index.get", status: 200, schema: reports.reportIndexSchema, produce: () => reportIndex(OWNER) },
  {
    operationId: "report-data.get", status: 200, schema: reports.reportDataSchema,
    produce: () => {
      const body = ok(reportData(STORE, "sales_overview", new URLSearchParams({ from: "2026-10-01", to: "2026-10-07" }), "Asia/Aden") as never) as { table: { rows: unknown[] } };
      body.table.rows = body.table.rows.slice(0, 3); // keep the example short; count stays the real one
      return body;
    },
  },
  { operationId: "report-refresh-today.post", status: 200, schema: reports.refreshSchema, produce: () => refreshToday(STORE) },
  {
    operationId: "report-export-create.post", status: 201, schema: reports.exportJobSchema,
    produce: () => {
      const job = ok(createExport(STORE, "orders", { format: "csv", params: { from: "2026-10-01", to: "2026-10-07" } }, "مالك المتجر"));
      exportId = job.job_id;
      return job;
    },
  },
  { operationId: "report-export-list.get", status: 200, schema: reports.exportListSchema, produce: () => listExports(STORE) },
  {
    operationId: "report-export-detail.get", status: 200, schema: reports.exportJobSchema,
    produce: () => {
      readExport(STORE, exportId); // queued → processing
      return ok(readExport(STORE, exportId)); // processing → ready (the mock advances one step per read)
    },
  },
  { operationId: "report-export-detail.get", status: 404, schema: detail, produce: () => fail(readExport(STORE, 999999), 404) },
  {
    operationId: "report-export-download.get", status: 200, schema: z.string().min(1), ext: "csv",
    produce: () => reportCsv(STORE, "orders", { from: "2026-10-01", to: "2026-10-07" }).split("\n").slice(0, 4).join("\n"),
  },
  { operationId: "report-schedule-list.get", status: 200, schema: reports.scheduleListSchema, produce: () => listSchedules(STORE) },
  {
    operationId: "report-schedule-list.post", status: 201, schema: reports.scheduleSchema,
    produce: () => {
      const s = ok(createSchedule(STORE, { report_code: "sales_overview", frequency: "weekly", email: "owner@example.com" }));
      scheduleId = s.id;
      return s;
    },
  },
  { operationId: "report-schedule-list.post", status: 400, schema: z.record(z.string(), z.array(z.string())), produce: () => fail(createSchedule(STORE, { report_code: "sales_overview", frequency: "weekly", email: "not-an-email" }), 400) },
  { operationId: "report-schedule-detail.patch", status: 200, schema: reports.scheduleSchema, produce: () => ok(patchSchedule(STORE, scheduleId, { is_active: false })) },
  { operationId: "report-schedule-detail.delete", status: 404, schema: detail, produce: () => fail(deleteSchedule(STORE, 999999), 404) },
];

const check = process.argv.includes("--check");
const dir = path.join(process.cwd(), "docs/api/openapi/examples");
if (!check) mkdirSync(dir, { recursive: true });
let failures = 0;
for (const p of PRODUCERS) {
  const name = `${p.operationId}.${p.status}.${p.ext ?? "json"}`;
  try {
    const value = p.produce();
    const parsed = p.schema.safeParse(value);
    if (!parsed.success) throw new Error(JSON.stringify(parsed.error.issues.slice(0, 3)));
    if (!check) writeFileSync(path.join(dir, name), p.ext ? String(value) + "\n" : JSON.stringify(value, null, 2) + "\n", "utf8");
    console.log(`✓ ${name}`);
  } catch (e) {
    failures++;
    console.log(`✗ ${name}: ${(e as Error).message}`);
  }
}
console.log(`\n${PRODUCERS.length - failures}/${PRODUCERS.length} examples ${check ? "valid" : "written"}`);
process.exit(failures ? 1 : 0);
