/**
 * Functional + visual check for Phase 6 T139 — M46 plans, matrix, features (kill switch),
 * overrides (bulk), subscriptions (assign_plan), master switches + «افحص متجراً», apps +
 * billing overrides, market categories; and the operator read-only gate (FR-20.09).
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/admin-billing-check.ts [port]   (default 3000)
 *
 * State hygiene: every global flag this check flips (kill switch, matrix cell, billing
 * switch, plan, category order, subscription) is restored before it exits, and overrides
 * only ever touch non-fixture stores (`glow`, `fit`, `books`) — the merchant session of
 * `noor` keeps all 39 features. Repeatable: run it twice in a row.
 */
import { FEATURE_KEYS } from "../src/lib/access";
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] ?? "3000";
const BASE = `http://console.localhost:${PORT}`;
const NOOR = `http://noor.localhost:${PORT}`;
const OUT = join(process.cwd(), "docs", "visual-checks", "46-plans");
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

type Role = "superuser" | "operator";
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, tablet: { width: 834, height: 1112 }, mobile: { width: 390, height: 844 } } as const;

async function context(browser: Browser, role: Role, vp: { width: number; height: number } = VIEWPORTS.desktop, dark = false): Promise<BrowserContext> {
  const ctx = await browser.newContext({ viewport: vp, locale: "ar", colorScheme: dark ? "dark" : "light", isMobile: vp.width < 768, hasTouch: vp.width < 768 });
  await ctx.addCookies([{ name: "sharwa_mock_admin", value: role, domain: "console.localhost", path: "/" }]);
  await hideDevOverlay(ctx);
  return ctx;
}

/** The Next dev indicator sits over the start-bottom corner (a sheet's footer buttons); it is not the product. */
async function hideDevOverlay(ctx: BrowserContext) {
  await ctx.addInitScript(() => {
    const css = "nextjs-portal{display:none!important}";
    document.addEventListener("DOMContentLoaded", () => {
      const s = document.createElement("style");
      s.textContent = css;
      document.head.appendChild(s);
    });
  });
}

const EXPECTED = /status of (400|403|404|409)/;
function watch(page: Page, tag: string) {
  page.on("console", (m) => {
    if (m.type() === "error" && !EXPECTED.test(m.text())) consoleErrors.push(`[${tag}] ${m.text().slice(0, 220)}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`[${tag}] PAGEERROR ${e.message}`));
}

async function api<T = Record<string, unknown>>(page: Page, method: string, path: string, body?: unknown): Promise<{ status: number; json: T }> {
  return page.evaluate(
    async ({ method, path, body }) => {
      const r = await fetch(path, { method, headers: { accept: "application/json", ...(body !== undefined ? { "content-type": "application/json" } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
      const text = await r.text();
      return { status: r.status, json: (text ? JSON.parse(text) : null) as never };
    },
    { method, path, body },
  );
}

const P = "/api/bff/platform";
const shot = (page: Page, name: string) => page.screenshot({ path: join(OUT, `${name}.png`) });

async function pickStore(page: Page, testId: string, q: string) {
  await page.fill(`[data-testid=${testId}-input]`, q);
  await page.locator(`[data-testid=${testId}] [data-testid=store-option]`).first().waitFor();
  await page.locator(`[data-testid=${testId}] [data-testid=store-option]`, { hasText: q }).first().click();
}

async function main() {
  const browser = await launch();
  const ctx = await context(browser, "superuser");
  const page = await ctx.newPage();
  watch(page, "superuser");

  // ── /plans ──────────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/plans`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=plan-row]");
  check((await page.locator("[data-testid=plan-row]").count()) >= 5, "plans: the table lists the seeded plans");
  check((await page.locator("[data-testid=plan-row][data-code=free]").textContent())?.includes("بلا حد") === false && (await page.locator("[data-testid=plan-row][data-code=pro]").textContent())?.includes("بلا حد") === true, "plans: null limits read «بلا حد»");
  await shot(page, "plans-desktop");

  await page.click("[data-testid=plan-new]");
  await page.waitForSelector("[data-testid=plan-sheet]");
  await page.click("[data-testid=plan-is_default_free]");
  await page.waitForSelector("[data-testid=error-is_default_free]");
  check((await page.textContent("[data-testid=error-is_default_free]"))?.includes("يجب أن تكون مجانية") === true, "plan editor: is_default_free on a paid plan → local error under the field (US-46.1 a1)");
  await shot(page, "plan-sheet-default-free-error");
  await page.click("[data-testid=plan-is_default_free]");
  const code = `chk_${Date.now() % 100000}`;
  await page.fill("#code", code);
  await page.fill("#name", "باقة فحص");
  await page.fill("#price", "10.00");
  await page.click("[data-testid=plan-save]");
  await page.waitForSelector(`[data-testid=plan-row][data-code=${code}]`);
  check(true, "plan editor: a valid plan is created and listed");
  page.once("dialog", (d) => void d.dismiss());
  await page.locator(`[data-testid=plan-row][data-code=${code}] [data-testid=plan-delete]`).click();
  await page.click("[data-testid=confirm-action]");
  await page.locator(`[data-testid=plan-row][data-code=${code}]`).waitFor({ state: "detached" });
  check(true, "plans: deleting a plan with no subscriptions removes it");
  await page.locator("[data-testid=plan-row][data-code=free] [data-testid=plan-delete]").click();
  await page.click("[data-testid=confirm-action]");
  await page.waitForSelector("[data-testid=plan-delete-error]");
  const delErr = await page.locator("[data-testid=plan-delete-error]");
  check((await delErr.textContent())?.includes("اشتراكاً حالياً") === true && (await delErr.locator("a").getAttribute("href"))?.startsWith("/subscriptions?plan=free") === true, "plans: 409 on a plan with subscriptions shows the server sentence + «نقل إلى باقة أخرى»");

  // ── /plans/matrix ───────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/plans/matrix`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=matrix-row]");
  check((await page.locator("[data-testid=matrix-row]").count()) === FEATURE_KEYS.length, `matrix: ${FEATURE_KEYS.length} feature rows`);
  check(await page.locator("[data-testid=subscriptions-off-note]").isVisible(), "matrix: «الباقات غير مفعَّلة» note while subscriptions_enabled=false");
  check((await page.locator("[data-testid=matrix-row][data-code=refunds]").textContent())?.includes("متاحة لكل الباقات") === true, "matrix: a requires_plan=false row is muted with its hint");
  const cell = page.locator("[data-testid=cell-basic-campaigns]");
  const before = (await cell.getAttribute("aria-checked")) === "true";
  await cell.click();
  await page.waitForTimeout(500);
  const cells = (await api<Array<{ plan_id: number; feature_code: string; is_enabled: boolean }>>(page, "GET", `${P}/plan-features`)).json;
  check(cells.find((c) => c.plan_id === 2 && c.feature_code === "campaigns")?.is_enabled === !before, "matrix: toggling a cell saves PlanFeature on the server");
  await cell.click();
  await page.waitForTimeout(500);
  const restored = (await api<typeof cells>(page, "GET", `${P}/plan-features`)).json;
  check(restored.find((c) => c.plan_id === 2 && c.feature_code === "campaigns")?.is_enabled === before, "matrix: toggling back restores the cell");
  await shot(page, "matrix-desktop");

  // ── /features ───────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/features`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=feature-row]");
  await page.click("[data-testid=kill-marketplaces]");
  await page.waitForSelector("[data-testid=kill-dialog]");
  check((await page.textContent("[data-testid=kill-dialog]"))?.includes("سيُوقف لكل التجار فوراً إلا من له استثناء صريح") === true, "kill switch: the confirmation states the effect");
  check((await page.textContent("[data-testid=kill-survivors]"))?.includes("atyab") === true, "kill switch: stores with an enabled override are listed as survivors");
  await shot(page, "features-kill-dialog");
  await page.keyboard.press("Escape");
  await page.locator("[data-testid=kill-dialog]").waitFor({ state: "detached" });

  // Kill `timeline` for real → the merchant session of noor loses it → restore.
  await page.click("[data-testid=kill-timeline]");
  await page.click("[data-testid=confirm-action]");
  await page.waitForFunction(() => document.querySelector("[data-testid=kill-timeline]")?.getAttribute("aria-checked") === "false");
  const merchant = await browser.newContext({ locale: "ar" });
  await merchant.addCookies([{ name: "sharwa_mock_session", value: "merchant", domain: "noor.localhost", path: "/" }]);
  const mp = await merchant.newPage();
  await mp.goto(`${NOOR}/dashboard/login`, { waitUntil: "domcontentloaded" });
  const me1 = (await api<{ features: string[] }>(mp, "GET", "/api/bff/dashboard/me")).json;
  check(!me1.features.includes("timeline") && me1.features.length === FEATURE_KEYS.length - 1, "kill switch: the merchant session (noor) drops the killed feature at once");
  await page.click("[data-testid=kill-timeline]");
  await page.waitForFunction(() => document.querySelector("[data-testid=kill-timeline]")?.getAttribute("aria-checked") === "true");
  const me2 = (await api<{ features: string[] }>(mp, "GET", "/api/bff/dashboard/me")).json;
  check(me2.features.length === FEATURE_KEYS.length, "kill switch: re-enabling needs no dialog and noor is back to all features");
  await merchant.close();

  await page.click("[data-testid=requires-coupon]");
  await page.waitForSelector("[data-testid=requires-dialog]");
  check((await page.textContent("[data-testid=requires-dialog]"))?.includes("ستُحجَب") === true, "requires_plan on: warning before applying");
  await page.keyboard.press("Escape");

  // ── /features/overrides (bulk) + «افحص متجراً» ──────────────────────────────────
  await api(page, "POST", `${P}/feature-overrides/bulk`, { feature_code: "bookings", schema_names: ["glow", "fit"], is_enabled: null, notes: "" });
  await page.goto(`${BASE}/features/overrides`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=override-row]");
  await page.click("[data-testid=bulk-open]");
  await page.waitForSelector("[data-testid=bulk-editor]");
  await page.selectOption("[data-testid=bulk-feature]", "bookings");
  await pickStore(page, "bulk-stores", "glow");
  await pickStore(page, "bulk-stores", "fit");
  await page.fill("#bulk-notes", "فحص آلي");
  await shot(page, "overrides-bulk-editor");
  await page.click("[data-testid=bulk-apply]");
  await page.waitForSelector("[data-testid=bulk-summary]");
  check((await page.textContent("[data-testid=bulk-summary]"))?.includes("2 استثناءات (2 جديد") === true, "bulk overrides: the server summary «2 استثناءات (2 جديد، …)»");
  await page.keyboard.press("Escape");
  await page.goto(`${BASE}/features/overrides?feature=bookings`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=override-row]");
  check((await page.locator("[data-testid=override-row][data-schema=glow]").count()) === 1 && (await page.locator("[data-testid=override-row][data-feature=marketplaces]").count()) === 0, "overrides: the `feature` filter lives in the URL");

  await page.goto(`${BASE}/billing-settings?feature=bookings&schema=glow`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=resolve-result]");
  const res = page.locator("[data-testid=resolve-result]");
  check((await res.getAttribute("data-enabled")) === "true" && (await res.getAttribute("data-decided-by")) === "override", "inspect: bookings × glow → enabled, decided by the override");
  check((await page.locator("[data-testid=resolution-steps] li[data-active=true]").getAttribute("data-step")) === "1", "inspect: step 1 is highlighted in the resolution order");
  await shot(page, "billing-settings-resolve");
  await api(page, "POST", `${P}/feature-overrides/bulk`, { feature_code: "bookings", schema_names: ["glow", "fit"], is_enabled: null, notes: "" });
  await page.goto(`${BASE}/billing-settings?feature=bookings&schema=glow`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("[data-testid=resolve-result]")?.getAttribute("data-decided-by") === "subscriptions_disabled");
  check((await page.locator("[data-testid=resolution-steps] li[data-active=true]").getAttribute("data-step")) === "4", "inspect: without the override, step 4 (subscriptions disabled) decides");

  // ── master switches ─────────────────────────────────────────────────────────────
  await page.click("[data-testid=switch-subscriptions_enabled]");
  await page.waitForSelector("[data-testid=switch-dialog]");
  const imp = (await page.textContent("[data-testid=switch-dialog]")) ?? "";
  check(imp.includes("ستُفعَّل بوابة الخطط على كل المتاجر") && imp.includes("لا يؤثر بأثر رجعي"), "master switch: enabling subscriptions states both effects");
  await page.keyboard.press("Escape");
  const bs0 = (await api<{ commission_enabled: boolean }>(page, "GET", `${P}/billing-settings`)).json;
  await page.click("[data-testid=switch-commission_enabled]");
  await page.click("[data-testid=confirm-action]");
  await page.waitForFunction((v) => document.querySelector("[data-testid=switch-commission_enabled]")?.getAttribute("aria-checked") === String(!v), bs0.commission_enabled);
  check(true, "master switch: commission toggles through the confirmation");
  await page.click("[data-testid=switch-commission_enabled]");
  await page.click("[data-testid=confirm-action]");
  await page.waitForFunction((v) => document.querySelector("[data-testid=switch-commission_enabled]")?.getAttribute("aria-checked") === String(v), bs0.commission_enabled);
  check(((await api<{ commission_enabled: boolean }>(page, "GET", `${P}/billing-settings`)).json.commission_enabled) === bs0.commission_enabled, "master switch: restored");

  // ── /subscriptions (assign_plan) ────────────────────────────────────────────────
  const subs0 = (await api<{ results: Array<{ plan: { id: number }; is_current: boolean }> }>(page, "GET", `${P}/subscriptions?schema=books&current=true`)).json.results[0];
  await page.goto(`${BASE}/subscriptions?schema=books`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=subscription-row]");
  const rowsBefore = await page.locator("[data-testid=subscription-row]").count();
  await page.locator("[data-testid=subscription-row][data-current=true] [data-testid=row-assign]").click();
  await page.waitForSelector("[data-testid=assign-dialog]");
  await page.selectOption("[data-testid=assign-plan]", subs0?.plan.id === 2 ? "3" : "2");
  await page.click("[data-testid=assign-submit]");
  await page.locator("[data-testid=assign-dialog]").waitFor({ state: "detached" });
  await page.waitForFunction((n) => document.querySelectorAll("[data-testid=subscription-row]").length === n + 1, rowsBefore);
  check((await page.locator("[data-testid=subscription-row][data-current=true]").count()) === 1 && (await page.locator("[data-testid=subscription-row][data-current=false]").count()) >= 1, "assign_plan: a new current row, the old one kept as history");
  if (subs0) await api(page, "POST", `${P}/subscriptions/assign`, { schema_name: "books", plan_id: subs0.plan.id, status: "active", notes: "استعادة بعد الفحص" });

  // ── /apps ───────────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/apps`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=app-row]");
  check((await page.locator("[data-testid=app-row][data-code=live_chat] [data-testid=app-conflict]").count()) === 1, "apps: free + billing_enabled shows the conflict hint (no block)");
  await page.selectOption("[data-testid=ov-app]", "whatsapp_bot");
  await pickStore(page, "ov-store", "atyab");
  check(await page.locator("[data-testid=ov-duplicate]").isVisible(), "app overrides: a duplicate (app, store) is flagged locally");
  await shot(page, "apps-desktop");
  await page.locator("[data-testid=ov-store] [data-testid=picked-store] button").click();
  await page.selectOption("[data-testid=ov-app]", "sms_gateway");
  await pickStore(page, "ov-store", "glow");
  await page.click("[data-testid=ov-submit]");
  await page.waitForSelector("[data-testid=app-override-row][data-schema=glow][data-app=sms_gateway]");
  check(true, "app overrides: created and listed");
  await page.locator("[data-testid=app-override-row][data-schema=glow][data-app=sms_gateway] [data-testid=app-override-delete]").click();
  await page.click("[data-testid=confirm-action]");
  await page.locator("[data-testid=app-override-row][data-schema=glow][data-app=sms_gateway]").waitFor({ state: "detached" });
  check(true, "app overrides: deleted through the confirmation");

  // ── /market-categories ──────────────────────────────────────────────────────────
  await page.goto(`${BASE}/market-categories`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=category-row]");
  const order0 = await page.locator("[data-testid=category-row]").evaluateAll((rs) => rs.map((r) => r.getAttribute("data-id")));
  await page.locator("[data-testid=category-row]").nth(1).locator("[data-testid=category-up]").click();
  await page.waitForFunction((first) => document.querySelector("[data-testid=category-row]")?.getAttribute("data-id") !== first, order0[0]);
  const pub = (await api<Array<{ id: number }>>(page, "GET", "/api/bff/public/market-categories")).json;
  check(Array.isArray(pub) ? String(pub[0]?.id) === order0[1] : true, "categories: the new order is what the M02 wizard reads");
  await page.locator("[data-testid=category-row]").nth(1).locator("[data-testid=category-up]").click();
  await page.waitForFunction((first) => document.querySelector("[data-testid=category-row]")?.getAttribute("data-id") === first, order0[0]);
  check(true, "categories: order restored");
  await page.locator("[data-testid=category-row]").first().locator("[data-testid=category-delete]").click();
  await page.click("[data-testid=confirm-action]");
  await page.waitForSelector("[data-sonner-toast]");
  check(((await page.locator("[data-sonner-toast]").last().textContent()) ?? "").includes("عطّلها بدل الحذف"), "categories: deleting a used category shows the server's 409 sentence");
  const catName = `فئة فحص ${Date.now() % 10000}`;
  await page.fill("[data-testid=cat-new]", catName);
  await page.click("[data-testid=cat-add]");
  await page.waitForFunction((n) => [...document.querySelectorAll<HTMLInputElement>("[data-testid=category-name]")].some((i) => i.value === n), catName);
  const added = page.locator("[data-testid=category-row]").last();
  await added.locator("[data-testid=category-delete]").click();
  await page.click("[data-testid=confirm-action]");
  await page.waitForFunction((n) => ![...document.querySelectorAll<HTMLInputElement>("[data-testid=category-name]")].some((i) => i.value === n), catName);
  check(true, "categories: a new category is added and deleted");

  // ── viewports + dark (static screens) ───────────────────────────────────────────
  for (const [vp, size] of Object.entries(VIEWPORTS)) {
    for (const dark of vp === "desktop" ? [false, true] : [false]) {
      const c = await context(browser, "superuser", size, dark);
      const p = await c.newPage();
      watch(p, `${vp}${dark ? "-dark" : ""}`);
      const tag = `${vp}${dark ? "-dark" : ""}`;
      for (const [path, name] of [["/plans", "plans"], ["/plans/matrix", "matrix"], ["/features", "features"], ["/billing-settings?feature=marketplaces&schema=atyab", "billing-settings"], ["/features/overrides", "overrides"], ["/apps", "apps"], ["/subscriptions", "subscriptions"], ["/market-categories", "categories"]] as const) {
        if (vp === "desktop" && !dark && name !== "subscriptions" && name !== "categories" && name !== "overrides" && name !== "features") continue;
        await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
        await p.waitForTimeout(250);
        await p.screenshot({ path: join(OUT, `${name}-${tag}.png`) });
        const sw = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (vp !== "desktop") check(sw <= 1, `${name} @${tag}: no horizontal page scroll`);
      }
      if (vp === "mobile") {
        await p.goto(`${BASE}/plans`, { waitUntil: "networkidle" });
        await p.click("[data-testid=plan-new]");
        await p.waitForSelector("[data-testid=plan-sheet]");
        await p.screenshot({ path: join(OUT, "plan-sheet-mobile.png") });
      }
      await c.close();
    }
  }

  // ── operator: read-only (FR-20.09) ──────────────────────────────────────────────
  const op = await context(browser, "operator");
  const opPage = await op.newPage();
  watch(opPage, "operator");
  await opPage.goto(`${BASE}/plans`, { waitUntil: "networkidle" });
  await opPage.waitForSelector("[data-testid=plan-row]");
  check((await opPage.locator("[data-testid=plan-new]").isDisabled()) && (await opPage.locator("[data-testid=read-only-note]").isVisible()), "operator: plans are read-only with the note");
  await opPage.goto(`${BASE}/features`, { waitUntil: "networkidle" });
  await opPage.waitForSelector("[data-testid=feature-row]");
  check((await opPage.locator("[data-testid=kill-refunds]").getAttribute("data-disabled")) !== null, "operator: kill switches are disabled");
  const forbidden = await api(opPage, "PATCH", `${P}/features/refunds`, { is_active_globally: false });
  check(forbidden.status === 403, `operator: the BFF answers 403 on a feature write (${forbidden.status})`);
  await op.close();

  await browser.close();
  console.log(consoleErrors.length ? `\nconsole errors:\n${consoleErrors.join("\n")}` : "\n0 console errors");
  const ok = failures.length === 0 && consoleErrors.length === 0;
  console.log(ok ? "\n✓ admin billing check passed" : `\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
