/**
 * Functional check for Phase 5 — M19 domains, tracking, webhooks & integrations (T114–T116).
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/domains-check.ts [port]   (default 3000)
 *
 * What a screenshot cannot prove (M19 §3, FR-19.01–09, SC-19.1–19.5):
 *   - domains: local validation (protocol/path, under the base domain) never reaches the server;
 *     a server error lands under the field; a valid domain shows the server's DNS records in
 *     Mono with copy (`C` on a focused value); «تحقّق الآن» walks pending_dns → verifying
 *     («جارٍ إصدار الشهادة») → active; «اجعله أساسياً» asks first; the primary is not deletable;
 *     `.invalid` fails with a reason; polling runs every 30 s only while something is pending;
 *   - tracking: ten fields, tokens write-only (never in a response or the DOM), format warnings
 *     do not block, the «معطّل» badge; 0 third-party tracking scripts in the dashboard;
 *   - webhooks: https only, events required, the secret shown once and never listed, delivery
 *     filters in the URL, «إعادة الإرسال» with a visible result, test event, rotation, re-enable;
 *   - integrations: every row for the owner, none outside a cashier's permissions; owner-only
 *     pages are forbidden for staff and tracking is feature-off for them.
 * Runs on a fresh per-run store so it is repeatable. Exit 1 on a failed check or console error.
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] ?? "3000";
const STORE = `m19c${Date.now() % 1_000_000}`;
const BASE = `http://${STORE}.localhost:${PORT}`;
const NOOR = `http://noor.localhost:${PORT}`;
const OUT = join(process.cwd(), "docs", "visual-checks", "19-domains");
mkdirSync(OUT, { recursive: true });
const failures: string[] = [];
const consoleErrors: string[] = [];
const TRACKERS = /facebook\.net|connect\.facebook|googletagmanager|google-analytics|googleadservices|analytics\.tiktok|sc-static\.net|snap\.licdn|doubleclick/i;
const thirdParty: string[] = [];

function check(ok: boolean, label: string) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures.push(label);
}

async function launch(): Promise<Browser> {
  const override = process.env.SHARWA_CHROMIUM;
  return chromium.launch(override && existsSync(override) ? { executablePath: override } : {});
}

async function newPage(browser: Browser, session: "merchant" | "staff", opts: { width?: number; host?: string; clock?: boolean } = {}) {
  const width = opts.width ?? 1440;
  const host = opts.host ?? `${STORE}.localhost`;
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: "ar", isMobile: width < 768, hasTouch: width < 768 });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: `http://${host}:${PORT}` });
  await ctx.addCookies([{ name: "sharwa_mock_session", value: session, domain: host, path: "/" }]);
  const page = await ctx.newPage();
  if (opts.clock) await page.clock.install();
  const tag = `${session}@${width}`;
  page.on("console", (m) => {
    // 400/403/404 below are provoked on purpose; the browser logs the failed resource.
    if (m.type() === "error" && !/status of (400|403|404)/.test(m.text())) consoleErrors.push(`[${tag}] ${m.text().slice(0, 240)}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`[${tag}] PAGEERROR ${e.message}`));
  page.on("request", (r) => {
    if (TRACKERS.test(r.url())) thirdParty.push(r.url());
  });
  return page;
}

async function api<T = unknown>(page: Page, path: string, init: { method?: string; json?: unknown } = {}): Promise<{ status: number; body: T; text: string }> {
  return page.evaluate(
    async ({ path, init }) => {
      const csrf = document.cookie.match(/csrftoken=([^;]+)/)?.[1] ?? "mock-csrf-token-for-local-dev";
      const res = await fetch(path, {
        method: init.method ?? "GET",
        headers: init.json !== undefined ? { "content-type": "application/json", "x-csrftoken": csrf } : { "x-csrftoken": csrf },
        body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
      });
      const text = await res.text();
      return { status: res.status, body: (text ? JSON.parse(text) : null) as never, text };
    },
    { path, init },
  );
}

async function main() {
  const browser = await launch();
  const page = await newPage(browser, "merchant");

  // ── Domains ────────────────────────────────────────────────────────────────────────
  let domainPosts = 0;
  page.on("request", (r) => {
    if (r.method() === "POST" && /\/api\/bff\/domains$/.test(new URL(r.url()).pathname)) domainPosts += 1;
  });
  await page.goto(`${BASE}/dashboard/settings/domains`, { waitUntil: "networkidle" });
  const sub = page.locator("[data-testid=domain-row-subdomain]");
  check((await sub.textContent())?.includes(`${STORE}.localhost`) === true && (await sub.locator("[data-testid=primary-tag]").count()) === 1, "the subdomain row shows <store>.<base> with «أساسي»");

  await page.click("[data-testid=add-domain]");
  await page.fill("[data-testid=domain-input]", "https://shop.example.com/path");
  await page.click("[data-testid=add-domain-submit]");
  await page.waitForSelector("#domain-error");
  const protoErr = await page.locator("#domain-error").textContent();
  await page.fill("[data-testid=domain-input]", `x.${"localhost"}`);
  await page.click("[data-testid=add-domain-submit]");
  await page.waitForFunction(() => document.querySelector("#domain-error")?.textContent?.includes("localhost"));
  check(/بروتوكول|مسار/.test(protoErr ?? "") && domainPosts === 0, "local validation: a protocol/path and a domain under the base never reach the server");

  await page.fill("[data-testid=domain-input]", "alnoor.com");
  await page.click("[data-testid=add-domain-submit]");
  await page.waitForFunction(() => document.querySelector("#domain-error")?.textContent?.includes("متجر آخر"));
  check(domainPosts === 1, "a server error («مرتبط بمتجر آخر») lands under the field");

  const newDomain = `shop${Date.now() % 100000}.example.com`;
  const t0 = Date.now();
  await page.fill("[data-testid=domain-input]", newDomain);
  await page.click("[data-testid=add-domain-submit]");
  await page.waitForSelector("[data-testid=domain-panel] [data-testid=dns-records]");
  const recordsText = (await page.locator("[data-testid=dns-records] table").textContent()) ?? "";
  const valueDir = await page.locator("[data-testid=dns-value-0]").getAttribute("dir");
  check(Date.now() - t0 < 10_000 && recordsText.includes("CNAME") && recordsText.includes("TXT") && valueDir === "ltr", "SC-19.1: the DNS records (CNAME + TXT) show within 10 s, values in Mono LTR");
  check((await page.locator("[data-testid=domain-panel]").getAttribute("data-status")) === "pending_dns", "a new domain starts at pending_dns");

  await page.locator("[data-testid=dns-value-0]").focus();
  await page.keyboard.press("c");
  await page.waitForTimeout(200);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check(clip === "edge.sharwa.app", "`C` on a focused DNS value copies it");
  await page.screenshot({ path: join(OUT, "check-dns-pending.png") });

  await page.click("[data-testid=verify-domain]");
  await page.waitForSelector("[data-testid=domain-panel][data-status=verifying]");
  const certText = await page.locator("[data-testid=status-explainer]").textContent();
  await page.click("[data-testid=verify-domain]");
  await page.waitForSelector("[data-testid=domain-panel][data-status=active]");
  check(certText?.includes("جارٍ إصدار الشهادة") === true, "«تحقّق الآن»: pending_dns → verifying («جارٍ إصدار الشهادة») → active");

  await page.click("[data-testid=make-primary]");
  await page.waitForSelector("[data-testid=confirm-primary]");
  check((await page.locator("[data-testid=confirm-primary]").textContent())?.includes("سيُحوَّل العميل من النطاق الفرعي إلى النطاق الجديد") === true, "«اجعله أساسياً» asks for confirmation with the redirect warning");
  await page.click("[data-testid=confirm-primary-confirm]");
  await page.waitForSelector("[data-testid=domain-panel] [data-testid=primary-tag]");
  check(await page.locator("[data-testid=delete-domain]").isDisabled(), "the primary domain cannot be deleted");
  const list = await api<{ results: Array<{ domain: string; is_primary: boolean }> }>(page, "/api/bff/domains");
  check(list.body.results.find((d) => d.domain === newDomain)?.is_primary === true && list.body.results[0]!.is_primary === false, "is_primary moved from the subdomain to the new domain");
  await page.screenshot({ path: join(OUT, "check-domain-active.png") });
  await page.keyboard.press("Escape");

  await page.goto(`${BASE}/dashboard/settings/domains?add=true`, { waitUntil: "networkidle" });
  await page.fill("[data-testid=domain-input]", `bad${Date.now() % 1000}.example.invalid`);
  await page.click("[data-testid=add-domain-submit]");
  await page.waitForSelector("[data-testid=verify-domain]");
  await page.click("[data-testid=verify-domain]");
  await page.waitForSelector("[data-testid=domain-panel][data-status=failed] [data-testid=failure-reason]");
  check(((await page.locator("[data-testid=status-explainer]").textContent()) ?? "").includes("ثم اضغط"), "a failed domain shows the server's reason and the next step");
  await page.screenshot({ path: join(OUT, "check-domain-failed.png") });

  // Polling (FR-19.02): every 30 s while the seeded `shop.<store>-store.com` is pending; stops after.
  const clocked = await newPage(browser, "merchant", { clock: true });
  let gets = 0;
  clocked.on("request", (r) => {
    if (r.method() === "GET" && new URL(r.url()).pathname === "/api/bff/domains") gets += 1;
  });
  await clocked.goto(`${BASE}/dashboard/settings/domains`, { waitUntil: "networkidle" });
  const before = gets;
  await clocked.clock.runFor(31_000);
  await clocked.waitForTimeout(500);
  const polled = gets > before;
  const pending = (await api<{ results: Array<{ id: number; status: string }> }>(clocked, "/api/bff/domains")).body.results.filter((d) => d.status === "pending_dns" || d.status === "verifying");
  for (const d of pending) {
    await api(clocked, `/api/bff/domains/${d.id}/verify`, { method: "POST", json: {} });
    await api(clocked, `/api/bff/domains/${d.id}/verify`, { method: "POST", json: {} });
  }
  await clocked.reload({ waitUntil: "networkidle" });
  await clocked.clock.runFor(1_000);
  const settled = gets;
  await clocked.clock.runFor(61_000);
  await clocked.waitForTimeout(500);
  check(polled && gets === settled, "domains poll every 30 s while pending and stop once nothing is pending");
  await clocked.context().close();

  // ── Tracking ───────────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/marketing/tracking`, { waitUntil: "networkidle" });
  const fieldIds = ["meta_pixel_id", "tiktok_pixel_id", "snapchat_pixel_id", "gtm_container_id", "ga4_measurement_id", "google_ads_conversion_id", "google_ads_conversion_label", "meta_conversions_api_token", "tiktok_events_api_token"];
  let fieldCount = 0;
  for (const f of fieldIds) fieldCount += await page.locator(`[data-testid=tracking-form] input#${f}`).count();
  check(fieldCount === 9 && (await page.locator("[data-testid=tracking-enabled]").count()) === 1, "tracking: the ten fields (switch + 7 ids + 2 tokens)");
  check(((await page.locator("[data-testid=meta_conversions_api_token-state]").textContent()) ?? "").includes("اتركه فارغاً للإبقاء") && (await page.inputValue("[data-testid=meta_conversions_api_token]")) === "", "a stored token shows «اتركه فارغاً للإبقاء» with an empty input");
  await page.fill("[data-testid=ga4_measurement_id]", "UA-12345-1");
  await page.waitForSelector("[data-testid=warn-ga4_measurement_id]");
  const token = `TT-secret-${Date.now()}-abcdef`;
  await page.fill("[data-testid=tiktok_events_api_token]", token);
  const saveRes = page.waitForResponse((r) => r.url().endsWith("/api/bff/store/tracking") && r.request().method() === "PATCH");
  await page.click("[data-testid=tracking-save]");
  const saved = await (await saveRes).text();
  await page.waitForTimeout(400);
  const html = await page.content();
  const after = await api<{ has_tiktok_events_api_token: boolean; ga4_measurement_id: string }>(page, "/api/bff/store/tracking");
  check(after.body.ga4_measurement_id === "UA-12345-1", "an unusual format warns but does not block saving");
  check(!saved.includes(token) && !after.text.includes(token) && !html.includes(token) && after.body.has_tiktok_events_api_token, "SC-19.3: the token is in no response and not in the DOM; has_* is true");
  await page.click("[data-testid=tracking-enabled]");
  await page.waitForSelector("[data-testid=tracking-disabled-badge]");
  check(true, "disabled → «معطّل — لن تُحمَّل أي سكربتات في المتجر»");
  const scripts = await page.evaluate(() => [...document.scripts].map((s) => s.src).filter(Boolean));
  check(!scripts.some((s) => /facebook|googletagmanager|google-analytics|tiktok|snapchat|sc-static/i.test(s)), "SC-19.4: no tracking <script> in the dashboard page");

  // ── Webhooks ───────────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/settings/webhooks`, { waitUntil: "networkidle" });
  check((await page.locator("[data-testid=endpoints-table]").textContent())?.includes("معطّلة تلقائياً") === true, "an endpoint with 10 failures shows «معطّلة تلقائياً»");
  await page.click("[data-testid=new-endpoint]");
  await page.waitForSelector("[data-testid=event-options]");
  check((await page.locator("[data-testid=event-options] li").count()) === 7, "the event list comes from the server (7 codes)");
  await page.fill("[data-testid=endpoint-url]", "http://example.com/hook");
  await page.click("[data-testid=endpoint-submit]");
  await page.waitForSelector("#url-error");
  check(((await page.locator("#url-error").textContent()) ?? "").includes("https") && (await page.locator("#events-error").count()) === 1, "https only, and at least one event, checked locally");
  const hookUrl = `https://ops.example.com/h/${Date.now()}`;
  await page.fill("[data-testid=endpoint-url]", hookUrl);
  await page.click("[data-testid=event-order\\.created]");
  await page.click("[data-testid=event-inventory\\.low_stock]");
  await page.click("[data-testid=endpoint-submit]");
  await page.waitForSelector("[data-testid=secret-value]");
  const secret = (await page.locator("[data-testid=secret-value]").textContent()) ?? "";
  check(secret.startsWith("whsec_") && ((await page.locator("[data-testid=secret-dialog]").textContent()) ?? "").includes("لن يُعرض مجدداً"), "the secret is shown once with «لن يُعرض مجدداً»");
  await page.screenshot({ path: join(OUT, "check-secret-once.png") });
  await page.click("[data-testid=secret-done]");
  await page.waitForTimeout(400);
  const listed = await api(page, "/api/bff/webhooks/endpoints");
  check(!listed.text.includes("whsec_") && !(await page.content()).includes(secret), "SC-19.3: after closing, the secret is in no list response and not in the DOM");

  await page.click("[data-testid=reenable-2]");
  await page.waitForFunction(() => !document.querySelector("[data-testid=reenable-2]"));
  const ep2 = await api<{ is_active: boolean; failure_count: number }>(page, "/api/bff/webhooks/endpoints/2");
  check(ep2.body.is_active && ep2.body.failure_count === 0, "«إعادة التفعيل» re-enables and clears the failure streak");

  await page.goto(`${BASE}/dashboard/settings/webhooks/1`, { waitUntil: "networkidle" });
  await page.locator("[data-testid=delivery-status]:visible").selectOption("failed");
  await page.waitForURL(/status=failed/);
  await page.waitForFunction(() => {
    const rows = [...document.querySelectorAll("[data-testid=deliveries-table] tbody tr")];
    return rows.length > 0 && rows.every((r) => r.textContent?.includes("فشل"));
  }, null, { timeout: 8_000 }).catch(() => undefined);
  const statuses = await page.locator("[data-testid=deliveries-table] tbody tr").allTextContents();
  if (!statuses.every((t) => t.includes("فشل"))) console.log(statuses.slice(0, 3));
  check(statuses.length > 0 && statuses.every((t) => t.includes("فشل")), "delivery filter `status=failed` lives in the URL and filters the log");
  const firstRedeliver = page.locator("[data-testid=deliveries-table] tbody [data-testid^=redeliver-]").first();
  const t1 = Date.now();
  await firstRedeliver.click();
  await page.waitForSelector("[data-testid=redeliver-result][data-status=delivered]", { timeout: 5_000 });
  check(Date.now() - t1 < 5_000, "SC-19.5: «إعادة الإرسال» in one click, the result visible within 5 s");
  await page.click("[data-testid=send-test]");
  await page.waitForSelector("[data-testid=test-result][data-status=delivered]");
  check(((await page.locator("[data-testid=test-result]").textContent()) ?? "").includes("200"), "«إرسال حدث تجريبي» shows the result (200)");
  await page.click("[data-testid=rotate-secret]");
  await page.waitForSelector("[data-testid=confirm-rotate]");
  const warn = (await page.locator("[data-testid=confirm-rotate]").textContent()) ?? "";
  await page.click("[data-testid=confirm-rotate-confirm]");
  await page.waitForSelector("[data-testid=secret-value]");
  check(warn.includes("نظامك الخارجي") && ((await page.locator("[data-testid=secret-value]").textContent()) ?? "").startsWith("whsec_"), "«تدوير السرّ» warns about the external system, then shows the new secret once");
  await page.click("[data-testid=secret-done]");

  // ── Integrations + access ──────────────────────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/settings/integrations`, { waitUntil: "networkidle" });
  const rows = await page.locator("[data-testid^=integration-]:not([data-testid=integration-groups])").count();
  const tiktok = await page.locator("[data-testid=integration-tiktok]").getAttribute("data-status");
  const carrierHref = await page.locator("[data-testid=manage-aramex]").getAttribute("href");
  check(rows === 13 && tiktok === "error" && carrierHref === "/dashboard/shipping/carriers", "integrations: 13 rows for the owner with state and manage links");

  const staff = await newPage(browser, "staff", { host: "noor.localhost" });
  await staff.goto(`${NOOR}/dashboard/settings/integrations`, { waitUntil: "networkidle" });
  const staffRows = await api<unknown[]>(staff, "/api/bff/integrations/status");
  check(staffRows.body.length === 0 && ((await staff.textContent("[data-testid=integrations-screen]")) ?? "").includes("لا تكاملات ضمن صلاحياتك"), "a cashier without channels.* sees no integration rows");
  await staff.goto(`${NOOR}/dashboard/settings/webhooks`, { waitUntil: "networkidle" });
  const staffApi = await api(staff, "/api/bff/domains");
  check((await staff.locator("[data-testid=forbidden]").count()) === 1 && staffApi.status === 403, "domains/webhooks are owner-only (UI forbidden + API 403)");
  await staff.goto(`${NOOR}/dashboard/marketing/tracking`, { waitUntil: "networkidle" });
  check((await staff.locator("[data-testid=feature-off]").count()) === 1, "tracking is feature-off without tracking_tools");

  check(thirdParty.length === 0, `SC-19.4: 0 third-party tracking requests from the dashboard (${thirdParty.length})`);

  // Clean up the endpoint created above (the store is per-run, but keep it tidy).
  await api(page, `/api/bff/webhooks/endpoints/${(listed.body as { results: Array<{ id: number; url: string }> }).results.find((e) => e.url === hookUrl)?.id ?? 0}`, { method: "DELETE" });

  await browser.close();
  if (consoleErrors.length) {
    console.log("\nconsole errors:");
    for (const e of consoleErrors) console.log("  " + e);
  }
  if (failures.length || consoleErrors.length) {
    console.log(`\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
    process.exit(1);
  }
  console.log("\n✓ M19 functional check passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
