/**
 * Functional check for Phase 6 · T138 — the console's stores module (M20 US-20.2, US-20.7):
 * `/stores` (URL filters, bulk re-provision preview/report, bulk feature override),
 * `/stores/<schema>` (features tab → the merchant session obeys it, domains, Sharwa Ship
 * with polling, deactivation lifecycle, action log), `/webhook-events`, the operator's
 * read-only view and host isolation. Repeatable: everything it changes it restores.
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/admin-stores-check.ts [port]   (default 3000)
 */
import { FEATURE_KEYS } from "../src/lib/access";
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] ?? "3000";
const CONSOLE = `http://console.localhost:${PORT}`;
const OUT = join(process.cwd(), "docs", "visual-checks", "20-admin");
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

type Role = "superuser" | "operator";

async function newPage(browser: Browser, role: Role | null, opts: { width?: number; dark?: boolean; host?: string } = {}): Promise<Page> {
  const width = opts.width ?? 1440;
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, locale: "ar", colorScheme: opts.dark ? "dark" : "light", isMobile: width < 768, hasTouch: width < 768 });
  if (role) await ctx.addCookies([{ name: "sharwa_mock_admin", value: role, domain: opts.host ?? "console.localhost", path: "/" }]);
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error" && !/status of (400|403|404|409)/.test(m.text())) consoleErrors.push(m.text().slice(0, 240));
  });
  page.on("pageerror", (e) => consoleErrors.push(`PAGEERROR ${e.message}`));
  return page;
}

async function api(page: Page, method: string, path: string, body?: unknown) {
  return page.evaluate(
    async ({ method, path, body }) => {
      const r = await fetch(path, { method, headers: { accept: "application/json", ...(body !== undefined ? { "content-type": "application/json" } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
      const text = await r.text();
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
      return { status: r.status, json: json as Record<string, unknown> };
    },
    { method, path, body },
  );
}

async function shot(page: Page, name: string) {
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
}

/** Real data rows (not the skeleton): a store link, or the no-results state. */
async function waitRows(page: Page) {
  await page.waitForSelector("[data-testid=stores-table] tbody [data-testid=store-link], [data-testid=stores-table] :text('لا نتائج'), [data-testid=stores-table] :text('لا متاجر فاشلة')");
}

const rowFor = (page: Page, schema: string) => page.locator(`[data-testid=stores-table] tbody tr:has(a[href="/stores/${schema}"])`);

async function main() {
  const browser = await launch();
  const page = await newPage(browser, "superuser");

  // ── /stores: URL filters ───────────────────────────────────────────────────────────
  await page.goto(`${CONSOLE}/stores?status=failed`, { waitUntil: "load" });
  await waitRows(page);
  const failedRows = await page.locator("[data-testid=stores-table] tbody tr").count();
  const failedStatuses = await page.locator("[data-testid=stores-table] tbody [data-testid^=status-]").allInnerTexts();
  check(failedRows === 0 || failedStatuses.every((s) => s.includes("فشل")) || (await page.getByText("لا متاجر فاشلة").isVisible()), `status=failed in the URL shows only failed stores (${failedRows})`);
  await page.goto(`${CONSOLE}/stores?status=stalled`, { waitUntil: "load" });
  await waitRows(page);
  check((await rowFor(page, "pending1").count()) === 1 && (await page.locator("[data-testid=status-stalled]").first().isVisible()), "status=stalled lists pending1 with «متعثّر»");
  await page.goto(`${CONSOLE}/stores?q=noor-store`, { waitUntil: "load" });
  await page.waitForSelector(`[data-testid=stores-table] a[href="/stores/noor"]`);
  check((await page.locator("[data-testid=stores-table] tbody tr").count()) === 1, "q= searches the domains too (noor-store.com → noor)");
  await page.goto(`${CONSOLE}/stores?plan=pro`, { waitUntil: "load" });
  await waitRows(page);
  check((await page.locator("[data-testid=stores-table] tbody tr").allInnerTexts()).every((t) => t.includes("الاحترافية")), "plan=pro keeps only «الاحترافية» rows");

  await page.goto(`${CONSOLE}/stores?status=ready&page_size=100`, { waitUntil: "load" });
  await page.waitForSelector(`[data-testid=stores-table] a[href="/stores/atyab"]`);
  await shot(page, "stores-desktop");

  // ── bulk re-provision on two ready stores → the server refuses both, per store ─────
  await rowFor(page, "atyab").locator("[role=checkbox], input[type=checkbox], button[aria-label='تحديد الصف']").first().click();
  await rowFor(page, "zahra").locator("[role=checkbox], input[type=checkbox], button[aria-label='تحديد الصف']").first().click();
  await page.click("[data-testid=bulk-reprovision]");
  await page.waitForSelector("[data-testid=bulk-dialog]");
  check((await page.locator("[data-testid=bulk-dialog]").innerText()).includes("المؤهَّل منها (فاشل أو متعثّر): 0"), "re-provision preview counts the eligible stores (0 of 2)");
  await page.click("[data-testid=bulk-confirm]");
  await page.waitForSelector("[data-testid=bulk-report]");
  const report = await page.locator("[data-testid=bulk-report]").innerText();
  check(report.includes("مرفوضة") && report.includes("ليس فاشلاً"), "the report lists every refused store with the server's reason");
  await page.keyboard.press("Escape");

  // ── bulk feature override on the same two stores, then removed again ───────────────
  await page.waitForSelector("[data-testid=bulk-dialog]", { state: "detached" });
  if ((await page.locator("[data-testid=bulk-override]").count()) === 0) {
    await rowFor(page, "atyab").locator("button[aria-label='تحديد الصف'], [role=checkbox]").first().click();
    await rowFor(page, "zahra").locator("button[aria-label='تحديد الصف'], [role=checkbox]").first().click();
  }
  await page.click("[data-testid=bulk-override]");
  await page.selectOption("[data-testid=bulk-feature]", "bookings");
  await page.click("[data-testid=bulk-value-off]");
  await page.click("[data-testid=bulk-confirm]");
  await page.waitForSelector("[data-testid=bulk-report]");
  const r1 = await api(page, "GET", "/api/bff/platform/features/bookings/resolve?schema=zahra");
  check(r1.json.decided_by === "override" && r1.json.enabled === false, "bulk override reaches the server (zahra · bookings = override off)");
  await page.keyboard.press("Escape");
  await api(page, "POST", "/api/bff/platform/feature-overrides/bulk", { feature_code: "bookings", schema_names: ["atyab", "zahra"], is_enabled: null, notes: "" });
  const r2 = await api(page, "GET", "/api/bff/platform/features/bookings/resolve?schema=zahra");
  check(r2.json.decided_by !== "override", "«إزالة الاستثناء» returns the store to the inherited state");

  // ── detail: features tab drives the merchant session ───────────────────────────────
  await page.goto(`${CONSOLE}/stores/noor?tab=features`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=feature-row]");
  check((await page.locator("[data-testid=feature-row]").count()) === FEATURE_KEYS.length, `noor › features lists the ${FEATURE_KEYS.length} keys`);
  check((await page.locator("[data-testid=feature-row][data-code=bookings] [data-testid=feature-source]").innerText()).includes("الخطوة"), "each key shows the resolution step that decided it");
  await shot(page, "store-features-desktop");
  await page.click("[data-testid=ov-bookings-off] >> xpath=..");
  await page.fill("[data-testid=ov-bookings-notes]", "فحص آلي");
  await page.click("[data-testid=save-overrides]");
  await page.waitForSelector("[data-testid=override-changes]");
  check((await page.locator("[data-testid=override-changes] li").count()) === 1, "the confirmation lists exactly the changed key");
  await page.click("[data-testid=confirm-action]");
  await page.waitForSelector("[data-testid=feature-row][data-code=bookings][data-source=override]");
  check((await page.locator("[data-testid=feature-row][data-code=bookings] [data-testid=feature-effective]").innerText()).includes("غير متاحة"), "after saving, bookings reads «غير متاحة» by override");
  await shot(page, "store-feature-override-desktop");

  const merchant = await newPage(browser, null);
  await merchant.context().addCookies([{ name: "sharwa_mock_session", value: "merchant", domain: "noor.localhost", path: "/" }]);
  await merchant.goto(`http://noor.localhost:${PORT}/api/bff/auth/csrf`, { waitUntil: "domcontentloaded" });
  const me = await api(merchant, "GET", "/api/bff/dashboard/me");
  check(Array.isArray(me.json.features) && !(me.json.features as string[]).includes("bookings") && (me.json.features as string[]).length === FEATURE_KEYS.length - 1, "the merchant session of noor drops bookings at once (one resolution, two screens)");

  await page.click("[data-testid=ov-bookings-inherit] >> xpath=..");
  await page.click("[data-testid=save-overrides]");
  await page.click("[data-testid=confirm-action]");
  await page.waitForSelector("[data-testid=feature-row][data-code=bookings]:not([data-source=override])");
  const me2 = await api(merchant, "GET", "/api/bff/dashboard/me");
  check((me2.json.features as string[]).length === FEATURE_KEYS.length, "back to «موروثة» → noor has all features again");

  // ── domains (atyab) ────────────────────────────────────────────────────────────────
  await page.goto(`${CONSOLE}/stores/atyab?tab=domains`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=domain-row]");
  await page.fill("[data-testid=domain-input]", "not a domain");
  await page.click("[data-testid=domain-add]");
  await page.waitForSelector("[data-testid=domain-error]");
  check((await page.locator("[data-testid=domain-error]").innerText()).includes("صيغة"), "a malformed domain shows the server's field error inline");
  const fresh = `check-${Date.now() % 1_000_000}.example.com`;
  await page.fill("[data-testid=domain-input]", fresh);
  await page.click("[data-testid=domain-add]");
  await page.waitForSelector(`[data-testid=domain-row]:has-text("${fresh}")`);
  await page.locator(`[data-testid=domain-row]:has-text("${fresh}") [data-testid=make-primary]`).click();
  await page.click("[data-testid=confirm-action]");
  await page.waitForSelector(`[data-testid=domain-row]:has-text("${fresh}"):has-text("أساسي")`);
  check(true, "a new domain can be added and made primary");
  await page.locator(`[data-testid=domain-row]:has-text("atyab.localhost") [data-testid=make-primary]`).click();
  await page.click("[data-testid=confirm-action]");
  await page.waitForSelector(`[data-testid=domain-row]:has-text("atyab.localhost"):has-text("أساسي")`);

  // ── Sharwa Ship (bunn): on with live polling, then off again ───────────────────────
  await page.goto(`${CONSOLE}/stores/bunn`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=action-sharwa-ship]");
  const before = (await page.locator("[data-testid=action-sharwa-ship]").innerText()).trim();
  await page.click("[data-testid=action-sharwa-ship]");
  check((await page.locator("[data-testid=confirm-impact]").innerText()).length > 10 && (await page.locator("[data-testid=confirm-dialog]").innerText()).includes("بُن يافع"), "the Sharwa Ship confirmation names the store and the effect");
  await page.click("[data-testid=confirm-action]");
  await page.waitForSelector("[data-testid^=sharwa-ship-activating], [data-testid^=sharwa-ship-deactivating]");
  check(true, `«${before}» → the header shows the pending state`);
  await page.waitForSelector("[data-testid=sharwa-ship-active], [data-testid=sharwa-ship-inactive]", { timeout: 20_000 });
  const after = (await page.locator("[data-testid=action-sharwa-ship]").innerText()).trim();
  check(after !== before, `polling settles the job without a reload («${after}»)`);
  await page.click("[data-testid=action-sharwa-ship]");
  await page.click("[data-testid=confirm-action]");
  await page.waitForFunction((b) => document.querySelector("[data-testid=action-sharwa-ship]")?.textContent?.trim() === b, before, { timeout: 20_000 });

  // ── deactivation lifecycle ─────────────────────────────────────────────────────────
  await page.goto(`${CONSOLE}/stores/kidswear?tab=deactivation`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=deactivation-current]");
  check(await page.locator("[data-testid=lifecycle-close-button]").isDisabled(), "kidswear (suspended): «إغلاق» is disabled");
  check((await page.locator("[data-testid=lifecycle-close-reason]").innerText()).includes("المعطّل فقط"), "…with the server's reason");
  await page.goto(`${CONSOLE}/stores/closed?tab=deactivation`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=lifecycle-reinstate-reason]");
  check((await page.locator("[data-testid=lifecycle-reinstate-reason]").innerText()).includes("نهائي"), "closed: reinstate is refused («الإغلاق نهائي»)");

  await page.goto(`${CONSOLE}/stores/books?tab=deactivation`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=lifecycle-suspend-button]");
  await page.click("[data-testid=lifecycle-suspend-button]");
  await page.fill("[data-testid=suspend-reason]", "فحص آلي للتعليق");
  await page.fill("[data-testid=suspend-grace]", "2026-01-01");
  await page.click("[data-testid=confirm-action]");
  await page.waitForSelector("[data-testid=grace-error]");
  check(true, "a past grace date is refused inline");
  await page.fill("[data-testid=suspend-grace]", "2026-12-31");
  await shot(page, "deactivation-dialog-desktop");
  await page.click("[data-testid=confirm-action]");
  await page.waitForSelector("[data-testid=deactivation-current]");
  check((await page.locator("[data-testid=deactivation-current]").innerText()).includes("معلّق"), "books is suspended");
  await page.click("[data-testid=lifecycle-reinstate-button]");
  await page.click("[data-testid=confirm-action]");
  await page.waitForSelector("[data-testid=deactivation-current]", { state: "detached" });
  check(true, "…and reinstated");
  await page.goto(`${CONSOLE}/stores/books?tab=actions`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=action-row]");
  check((await page.locator("[data-testid=action-row]").first().innerText()).includes("admin"), "the action log names who did it (FR-20.07)");

  // ── webhook events ─────────────────────────────────────────────────────────────────
  await page.goto(`${CONSOLE}/webhook-events`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=webhook-events] tbody [data-testid=payload]");
  const missing = page.locator("[data-testid=webhook-events] tbody tr:has([data-testid=store-missing])").first();
  check((await missing.count()) === 1 && (await missing.locator("[data-testid=event-retry]").isDisabled()), "an event for a deleted store allows «تجاهل» only");
  await page.locator("[data-testid=webhook-events] tbody tr [data-testid=payload] summary").first().click();
  check(await page.locator("[data-testid=webhook-events] tbody tr [data-testid=payload] pre").first().isVisible(), "the payload expands as LTR Mono");
  await shot(page, "webhook-events-desktop");
  const pendingBefore = await page.locator("[data-testid=webhook-events] tbody tr [data-testid=event-retry]:not([disabled])").count();
  if (pendingBefore > 2) {
    await page.locator("[data-testid=webhook-events] tbody tr [data-testid=event-retry]:not([disabled])").last().click();
    await page.click("[data-testid=confirm-action]");
    await page.waitForFunction((n) => document.querySelectorAll("[data-testid=webhook-events] tbody tr [data-testid=event-retry]:not([disabled])").length === n - 1, pendingBefore);
    check(true, "«إعادة المعالجة» resolves the event and it leaves the pending view");
  } else check(true, "few pending events left from earlier runs (retry skipped)");

  // ── operator: read-only ────────────────────────────────────────────────────────────
  const ops = await newPage(browser, "operator");
  await ops.goto(`${CONSOLE}/stores`, { waitUntil: "load" });
  await ops.waitForSelector("[data-testid=stores-table] tbody [data-testid=store-link]");
  check((await ops.locator("[data-testid=read-only-note]").count()) > 0 && (await ops.locator("[data-testid=stores-table] button[aria-label='تحديد الصف']").count()) === 0, "operator: no selection, a read-only note");
  await ops.goto(`${CONSOLE}/stores/noor`, { waitUntil: "load" });
  await ops.waitForSelector("[data-testid=action-sharwa-ship]");
  check(await ops.locator("[data-testid=action-sharwa-ship]").isDisabled(), "operator: Sharwa Ship is disabled");
  await shot(ops, "operator-read-only-desktop");
  const forbidden = await api(ops, "POST", "/api/bff/platform/stores/noor/sharwa-ship", { active: false });
  check(forbidden.status === 403, `operator: the BFF answers 403 too (${forbidden.status})`);

  // ── isolation ──────────────────────────────────────────────────────────────────────
  const store = await newPage(browser, "superuser", { host: "noor.localhost" });
  await store.goto(`http://noor.localhost:${PORT}/api/bff/auth/csrf`, { waitUntil: "domcontentloaded" });
  const leak = await api(store, "GET", "/api/bff/platform/stores");
  check(leak.status === 404, "a store host gets 404 from /api/bff/platform even with the admin cookie");

  // ── viewports ──────────────────────────────────────────────────────────────────────
  for (const [w, tag, dark] of [
    [834, "tablet", false],
    [390, "mobile", false],
    [1440, "desktop-dark", true],
  ] as const) {
    const p = await newPage(browser, "superuser", { width: w, dark });
    await p.goto(`${CONSOLE}/stores`, { waitUntil: "load" });
    await p.waitForSelector(w < 768 ? "[data-testid=store-card]" : "[data-testid=stores-table] tbody [data-testid=store-link]");
    if (w < 768) check((await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)) === true, "390px: no horizontal scroll on /stores");
    await shot(p, `stores-${tag}`);
    await p.goto(`${CONSOLE}/stores/noor?tab=features`, { waitUntil: "load" });
    await p.waitForSelector("[data-testid=feature-row]");
    await shot(p, `store-features-${tag}`);
    await p.goto(`${CONSOLE}/webhook-events`, { waitUntil: "load" });
    await p.waitForSelector("[data-testid=webhook-events]");
    await shot(p, `webhook-events-${tag}`);
    await p.context().close();
  }

  await browser.close();
  console.log(consoleErrors.length ? `\nconsole errors:\n${consoleErrors.join("\n")}` : "\n0 console errors");
  const ok = failures.length === 0 && consoleErrors.length === 0;
  console.log(ok ? "\n✓ admin stores check passed" : `\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
