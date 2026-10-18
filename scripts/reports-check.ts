/**
 * Functional check for Phase 5 — M25 reports hub, exports & scheduled reports (T126–T128).
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/reports-check.ts [port]   (default 3000)
 *
 * What a screenshot cannot prove (M25 §3 Independent Tests / acceptance):
 *   - the index lists 42 reports, 7 disabled (not links); the local search; the §5 map hides
 *     rows for a `reports.view`-only member (pure map, same module the UI uses);
 *   - range, compare and location live in the URL; the same URL reproduces the numbers;
 *     the delta is coloured text; «—» when the compare period has no data; > 366 days blocked;
 *   - the chart draws the compare series; the table sorts locally;
 *   - async export: queued → processing → ready by 5-s polling, a token download, `expired`,
 *     `failed` with the server reason and a retry that creates a new job;
 *   - refresh-today, keyboard D/W/C, unavailable report page, the products alias;
 *   - schedules: local email validation, create with «يُرسل كل أسبوع — التالي:», pause, delete;
 *   - a cashier (no `reports` feature) gets the feature-off state; the API answers 403.
 * Exit 1 on a failed check or console error.
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { canOpenReport } from "../src/features/reports/permissions";
import { REPORT_REGISTRY } from "../src/mocks/reports/registry";

const PORT = process.argv[2] ?? "3000";
const BASE = `http://noor.localhost:${PORT}`;
const OUT = join(process.cwd(), "docs", "visual-checks", "25-reports");
mkdirSync(OUT, { recursive: true });
const failures: string[] = [];
const consoleErrors: string[] = [];

function check(ok: boolean, label: string) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures.push(label);
}

async function launch(): Promise<Browser> {
  const override = process.env.SHARWA_CHROMIUM;
  return chromium.launch(override && existsSync(override) ? { executablePath: override } : {});
}

function watch(page: Page, tag: string) {
  page.on("console", (m) => {
    // 400/403/404/410 below are provoked on purpose; the browser logs the failed resource.
    if (m.type() === "error" && !/status of (400|403|404|410)/.test(m.text())) consoleErrors.push(`[${tag}] ${m.text().slice(0, 240)}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`[${tag}] PAGEERROR ${e.message}`));
}

async function newPage(browser: Browser, session: "merchant" | "staff", width = 1440) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: "ar", isMobile: width < 768, hasTouch: width < 768 });
  await ctx.addCookies([{ name: "sharwa_mock_session", value: session, domain: "noor.localhost", path: "/" }]);
  const page = await ctx.newPage();
  watch(page, `${session}@${width}`);
  return page;
}

const todayIso = () => new Date().toISOString().slice(0, 10);
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

async function main() {
  const browser = await launch();
  const page = await newPage(browser, "merchant");

  // ── Index (US-25.1) ────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/reports`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=report-row]");
  const rows = page.locator("[data-testid=report-row]");
  const disabled = page.locator("[data-testid=report-row]:not([data-status=available])");
  check((await rows.count()) === 42, `the owner sees all 42 reports (got ${await rows.count()})`);
  check((await disabled.count()) === 7, `7 reports are disabled (got ${await disabled.count()})`);
  check((await page.locator("[data-testid=report-category]").count()) === 10, "10 category sections in registry order");
  check((await page.locator("[data-testid=report-category]").first().getAttribute("data-category")) === "core", "the first section is «الأساسية»");
  check((await page.locator('[data-testid=report-row][data-code=visits]').evaluate((el) => el.tagName !== "A" && el.getAttribute("aria-disabled") === "true" && (el.textContent ?? "").includes("غير متاح بعد"))), "a not_yet_available row is not a link and says «غير متاح بعد»");
  check((await page.locator("[data-testid=reports-hidden-note]").count()) === 0, "the owner has no «تقارير إضافية تتطلب صلاحيات» note");
  await page.fill("input[type=search]", "مرتجعات");
  await page.waitForFunction(() => document.querySelectorAll("[data-testid=report-row]").length === 1, null, { timeout: 5_000 }).catch(() => undefined);
  check((await rows.count()) === 1 && (await rows.first().getAttribute("data-code")) === "returns", "search «مرتجعات» filters locally to «المرتجعات»");
  await page.fill("input[type=search]", "audit_log");
  await page.waitForSelector("[data-testid=report-row][data-code=audit_log]", { timeout: 5_000 }).catch(() => undefined);
  check((await rows.first().getAttribute("data-code")) === "audit_log", "search by code works");

  // The §5 map for a member with `reports.view` only (the same pure module the UI applies).
  const viewOnly = { kind: "staff" as const, features: ["reports", "inventory"], permissions: ["reports.view"] };
  const visible = REPORT_REGISTRY.filter((r) => canOpenReport(viewOnly, r.code, r.category));
  const sensitive = ["store_overview", "taxes", "platform_commissions", "wallet_custody", "operating_expenses", "currencies"];
  check(visible.length > 0 && visible.length < 42 && !visible.some((r) => sensitive.includes(r.code) || r.category === "inventory" || r.category === "customers"), `reports.view only: ${visible.length} visible, ${42 - visible.length} hidden, no profit/inventory/customer rows`);

  // ── Report page (US-25.2) ──────────────────────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/reports/sales_overview`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=report-summary]");
  await page.click("[data-testid=preset-7d]");
  await page.click("[data-testid=compare-toggle]");
  await page.waitForURL(/compare=true/);
  const u = new URL(page.url());
  check(u.searchParams.get("from") === addDays(todayIso(), -6) && u.searchParams.get("to") === todayIso(), "the 7-day preset writes from/to into the URL");
  await page.waitForSelector("[data-testid=delta]");
  await page.waitForFunction(() => document.querySelector("[data-testid=report-chart]")?.getAttribute("data-series") === "2", null, { timeout: 8_000 }).catch(() => undefined);
  check((await page.locator("[data-testid=report-chart]").getAttribute("data-series")) === "2", "compare on → the chart has the compare series");
  check((await page.locator("[data-testid=report-chart] path[stroke-dasharray]").count()) > 0, "the compare line is dashed");
  const deltaClass = (await page.locator("[data-testid=delta]").first().getAttribute("class")) ?? "";
  check(/text-(success|destructive|muted-foreground)/.test(deltaClass), "the delta is coloured text only");

  // SC-25.5: a shared link with range + compare reproduces the numbers.
  const link = `${BASE}/dashboard/reports/sales_overview?from=2026-09-18&to=2026-10-17&compare=true`;
  await page.goto(link, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=summary-primary]");
  const first = await page.locator("[data-testid=summary-primary]").textContent();
  const other = await newPage(browser, "merchant", 768);
  await other.goto(link, { waitUntil: "load" });
  await other.waitForSelector("[data-testid=summary-primary]");
  check(first === (await other.locator("[data-testid=summary-primary]").textContent()) && Boolean(first?.includes("ر.س")), `the same URL reproduces the screen on another device (${first})`);
  await other.context().close();

  // Local sort: «الإيرادات» descending puts the largest first.
  await page.click("th button:has-text('الإيرادات')");
  await page.click("th button:has-text('الإيرادات')");
  await page.waitForURL(/ordering=-revenue/);
  const firstRev = await page.locator("[data-testid=report-table] tbody tr").first().locator("td").nth(1).textContent();
  check(Boolean(firstRev?.startsWith("11,925.00")), `local sort by revenue desc (first row ${firstRev})`);

  // Keyboard D / C.
  await page.locator("h1").click();
  await page.keyboard.press("d");
  await page.waitForURL((url) => url.searchParams.get("from") === todayIso() && url.searchParams.get("to") === todayIso(), { timeout: 5_000 }).catch(() => undefined);
  check(new URL(page.url()).searchParams.get("from") === todayIso(), "D → today's range");
  await page.keyboard.press("c");
  await page.waitForFunction(() => !location.search.includes("compare=true"), null, { timeout: 5_000 }).catch(() => undefined);
  check(!page.url().includes("compare=true"), "C toggles the compare off");

  // Location in the URL (multi_location on).
  await page.selectOption("[data-testid=location-select]", "2");
  await page.waitForURL(/location=2/);
  check(true, "the location filter lives in the URL");

  // Compare period with no data → «—»; range with no data → empty state; > 366 days blocked.
  await page.goto(`${BASE}/dashboard/reports/taxes?from=2025-06-01&to=2025-06-30&compare=true`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=delta]");
  check((await page.locator("[data-testid=delta]").first().textContent())?.trim() === "—", "no compare data → the delta is «—», not +100%");
  await page.goto(`${BASE}/dashboard/reports/sales_overview?from=2024-01-01&to=2024-01-30`, { waitUntil: "load" });
  await page.waitForSelector("text=لا بيانات في هذا النطاق — جرّب 30 يوماً");
  check(true, "an empty range shows «لا بيانات في هذا النطاق — جرّب 30 يوماً»");
  await page.goto(`${BASE}/dashboard/reports/sales_overview?from=2024-01-01&to=2026-01-30`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=range-problem]");
  check(((await page.locator("[data-testid=range-problem]").textContent()) ?? "").includes("الحد الأقصى سنة واحدة"), "a range over 366 days is blocked locally");

  // Unavailable report + products alias.
  await page.goto(`${BASE}/dashboard/reports/visits`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=report-unavailable]");
  check(true, "a not_yet_available report opens the «غير متاح بعد» page");
  await page.goto(`${BASE}/dashboard/reports/products`, { waitUntil: "load" });
  await page.waitForURL(/reports\/best_sellers/);
  check(true, "/dashboard/reports/products → best_sellers");

  // ── Refresh today (US-25.5) ───────────────────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/reports/sales_overview`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=refreshed-at]");
  const before = await page.locator("[data-testid=refreshed-at]").textContent();
  await page.click("[data-testid=refresh-today]");
  await page.waitForFunction((b) => document.querySelector("[data-testid=refreshed-at]")?.textContent !== b, before, { timeout: 8_000 }).catch(() => undefined);
  check((await page.locator("[data-testid=refreshed-at]").textContent()) !== before, "«تحديث بيانات اليوم» shows the new refreshed_at");

  // ── Export by UI polling (US-25.3) ────────────────────────────────────────────────
  await page.click("[data-testid=export-csv]");
  await page.waitForSelector("[data-testid=export-line][data-status=queued]", { timeout: 5_000 });
  check(true, "export → a queued job appears in «تصديراتي»");
  const seen = await page.evaluate(async () => {
    const out: string[] = [];
    let prev = "";
    const t0 = Date.now();
    while (Date.now() - t0 < 16_000) {
      const s = document.querySelector("[data-testid=export-line]")?.getAttribute("data-status") ?? "";
      if (prev !== s) out.push(`${s}@${Math.round((Date.now() - t0) / 1000)}s`);
      prev = s;
      if (s === "ready") break;
      await new Promise((r) => setTimeout(r, 250));
    }
    return out;
  });
  console.log(`  strip timeline: ${seen.join(" → ")}`);
  check(seen.some((s) => s.startsWith("processing")), "the 5-s poll moves it to processing");
  check((await page.locator("[data-testid=export-line][data-status=ready] [data-testid=export-download]").count()) > 0, "… then ready with a download link");
  await page.screenshot({ path: join(OUT, "export-ready.png") });

  // API: token download, expiry after further reads, failure with a reason.
  const api = await page.evaluate(async () => {
    const headers = { "content-type": "application/json" };
    const created = await (await fetch("/api/bff/reports/orders/exports", { method: "POST", headers, body: JSON.stringify({ format: "xlsx", params: { from: "2026-09-18", to: "2026-10-17" } }) })).json();
    const statuses: string[] = [created.status];
    let last = created;
    for (let i = 0; i < 2; i++) {
      last = await (await fetch(`/api/bff/reports/exports/${created.job_id}`)).json();
      statuses.push(last.status);
    }
    const bad = (await fetch(`/api/bff/reports/exports/${created.job_id}/download?token=nope`)).status;
    const file = await fetch(`/api/bff/reports/exports/${created.job_id}/download?token=${encodeURIComponent(last.download_token)}`);
    const csv = await file.text();
    for (let i = 0; i < 4; i++) last = await (await fetch(`/api/bff/reports/exports/${created.job_id}`)).json();
    const gone = (await fetch(`/api/bff/reports/exports/${created.job_id}/download?token=x`)).status;
    const fail = await (await fetch("/api/bff/reports/audit_log/exports", { method: "POST", headers, body: JSON.stringify({ format: "csv", params: {} }) })).json();
    let f = fail;
    for (let i = 0; i < 2; i++) f = await (await fetch(`/api/bff/reports/exports/${fail.job_id}`)).json();
    return { statuses, bad, fileStatus: file.status, type: file.headers.get("content-type"), csv: csv.slice(0, 60), expired: last.status, gone, failStatus: f.status, failError: f.error, failId: fail.job_id };
  });
  check(api.statuses.join(">") === "queued>processing>ready", `API job: ${api.statuses.join(" → ")}`);
  check(api.bad === 403 && api.fileStatus === 200 && Boolean(api.type?.includes("text/csv")) && api.csv.includes("اليوم"), "download needs the token and returns a CSV");
  check(api.expired === "expired" && api.gone === 410, "a ready job expires and its download answers 410");
  check(api.failStatus === "failed" && Boolean(api.failError), "audit_log export fails with the server's reason");

  // Exports page: failed row shows the reason and retry creates a new job.
  await page.goto(`${BASE}/dashboard/reports/exports`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=export-row-status]");
  check((await page.locator("[data-testid=export-error]").count()) > 0 && (await page.locator("[data-testid=export-expired]").count()) > 0, "«تصديراتي» shows the failure reason and «انتهت صلاحية الملف — أعد التصدير»");
  check(await page.locator("[data-testid=export-download-disabled]").first().isDisabled(), "an expired job's download is disabled");
  const beforeCount = await page.locator("[data-testid=exports-table] tbody tr").count();
  await page.locator(`[data-testid=export-row-status][data-status=failed]`).first().locator("xpath=ancestor::tr").locator("[data-testid=export-retry]").click();
  await page.waitForFunction((n) => document.querySelectorAll("[data-testid=exports-table] tbody tr").length > n, beforeCount, { timeout: 8_000 }).catch(() => undefined);
  check((await page.locator("[data-testid=exports-table] tbody tr").count()) === beforeCount + 1, "retry creates a NEW job");

  // ── Schedules (US-25.4) ───────────────────────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/reports/scheduled`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=schedules-list]");
  const n0 = await page.locator("[data-testid=schedule-row]").count();
  check(((await page.locator("[data-testid=schedule-sentence]").first().textContent()) ?? "").startsWith("يُرسل كل أسبوع — التالي:"), "a weekly subscription reads «يُرسل كل أسبوع — التالي: …»");
  await page.click("[data-testid=schedule-new]");
  await page.selectOption("#report_code", "orders");
  await page.selectOption("#frequency", "weekly");
  await page.fill("#email", "not-an-email");
  let posted = false;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/bff/reports/schedules") && r.method() === "POST") posted = true;
  });
  await page.click("[data-testid=schedule-submit]");
  await page.waitForSelector("#email-error");
  check(!posted && ((await page.locator("#email-error").textContent()) ?? "").includes("بريداً"), "an invalid email is rejected locally under the field (no request)");
  await page.fill("#email", "weekly@noor-store.com");
  await page.click("[data-testid=schedule-submit]");
  await page.waitForFunction((n) => document.querySelectorAll("[data-testid=schedule-row]").length === n + 1, n0, { timeout: 8_000 }).catch(() => undefined);
  check((await page.locator("[data-testid=schedule-row]").count()) === n0 + 1, "a valid subscription is added");
  const added = page.locator("[data-testid=schedule-row]").last();
  await added.locator("[data-testid=schedule-active]").click();
  await page.waitForFunction(() => {
    const rows = document.querySelectorAll("[data-testid=schedule-row]");
    return rows[rows.length - 1]?.textContent?.includes("متوقف مؤقتاً");
  }, null, { timeout: 8_000 }).catch(() => undefined);
  check(((await added.textContent()) ?? "").includes("متوقف مؤقتاً"), "pausing a subscription");
  await added.locator("[data-testid=schedule-delete]").click();
  await page.click("[data-testid=schedule-delete-confirm]");
  await page.waitForFunction((n) => document.querySelectorAll("[data-testid=schedule-row]").length === n, n0, { timeout: 8_000 }).catch(() => undefined);
  check((await page.locator("[data-testid=schedule-row]").count()) === n0, "deleting a subscription");

  // ── Cashier ───────────────────────────────────────────────────────────────────────
  const staff = await newPage(browser, "staff");
  await staff.goto(`${BASE}/dashboard/reports`, { waitUntil: "load" });
  await staff.waitForSelector("[data-testid=feature-off]");
  const staffApi = await staff.evaluate(async () => (await fetch("/api/bff/reports/sales_overview?from=2026-10-01&to=2026-10-17")).status);
  check(staffApi === 403, "a cashier: feature-off screen, and the report API answers 403");

  await browser.close();
  if (consoleErrors.length) {
    console.log("\nConsole errors:");
    for (const e of consoleErrors) console.log(`  ${e}`);
  }
  const total = failures.length;
  console.log(`\n${total === 0 && consoleErrors.length === 0 ? "✓ all checks passed" : `✗ ${total} failed, ${consoleErrors.length} console errors`}`);
  process.exit(total === 0 && consoleErrors.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
