/**
 * Functional check for M15 — الشحن والمناطق والمندوبون (T108–T110) on the mocks.
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/shipping-check.ts [port]   (default 3000)
 *
 * Owner on `noor`: fees with the stored currency explicit; US-15.1 Independent Test (add
 * «توصيل سريع» at 1,500 → listed with the server's price and in the customer preview;
 * the inactive method is not); the official row is read-only; pickup reorder → server
 * order; the M22 pickup-point hint; providers tabs in the URL with the terminated-account
 * badge and the carrier state; the carrier form never carries a secret (DOM + JSON) and
 * the connection test answers a readable sentence; the zones map draws no external
 * request; zone review (resolve, ≥ 3 points rule); edge cases (URL tab, address update →
 * `merchant_manual`, convert → 409 on a stale version / 400 after `picked_up`). Gates:
 * the cashier (feature off / forbidden / 403, but the edge cases open) and the empty
 * `shop`. The mocks are stateful across runs, so the one-shot resolutions pick whatever
 * row is still eligible. Exit 1 on a failed check or console error.
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync } from "node:fs";

const PORT = process.argv[2] ?? "3000";
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
    // 400/403/409 below are provoked on purpose; the browser logs the failed resource.
    if (m.type() === "error" && !/status of (400|403|409)/.test(m.text())) consoleErrors.push(`[${tag}] ${m.text().slice(0, 240)}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`[${tag}] PAGEERROR ${e.message}`));
}

async function newPage(browser: Browser, store: string, session: "merchant" | "staff", width = 1440) {
  const host = `${store}.localhost`;
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: "ar" });
  await ctx.addCookies([{ name: "sharwa_mock_session", value: session, domain: host, path: "/" }]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(60_000);
  watch(page, `${store}/${session}`);
  return { page, base: `http://${host}:${PORT}` };
}

type Json = Record<string, unknown>;
async function bff<T = Json>(page: Page, path: string, init?: { method?: string; body?: Json }) {
  return page.evaluate(
    async ({ path, init }) => {
      const res = await fetch(path, { method: init?.method ?? "GET", headers: { "content-type": "application/json" }, body: init?.body ? JSON.stringify(init.body) : undefined });
      const text = await res.text();
      return { status: res.status, text, body: (text ? JSON.parse(text) : {}) as unknown };
    },
    { path, init },
  ) as Promise<{ status: number; text: string; body: T }>;
}

async function main() {
  const browser = await launch();
  const { page, base } = await newPage(browser, "noor", "merchant");
  const external: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (!u.hostname.endsWith("localhost")) external.push(u.hostname);
  });

  // ── fees + methods + preview (US-15.1) ─────────────────────────────────────────
  await page.goto(`${base}/dashboard/shipping`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=methods-table] tbody tr[data-row]");
  check((await page.locator("[data-testid=fee-currency]").innerText()).trim() === "YER_NEW" && (await page.locator("[data-testid=fees-section]").innerText()).includes("تُحوَّل للعميل حسب أسعار الصرف"), "the fee fields show the stored currency YER_NEW and the exchange-rate hint");

  const official = page.locator("[data-testid=methods-table] tbody tr", { has: page.locator("[data-testid=sharwa-official]") }).first();
  check((await official.count()) === 1 && (await official.locator("[data-testid=method-edit]").isDisabled()), "the «شروة شيب» official method is read-only (edit disabled)");
  check(!(await page.locator("[data-testid=preview-methods]").innerText()).includes("شحن بين المدن"), "the inactive method is absent from «كما يراها العميل»");

  const name = `توصيل سريع ${String(Date.now()).slice(-4)}`;
  await page.click("[data-testid=add-method]");
  await page.waitForURL((u) => u.searchParams.get("method") === "new");
  await page.fill("#method-name", name);
  await page.fill("#method-price", "abc");
  await page.click("[data-testid=method-submit]");
  await page.waitForSelector("#method-price[aria-invalid=true]");
  check(true, "a malformed price is refused under its field before sending");
  await page.fill("#method-price", "1500");
  await page.click("[data-testid=method-submit]");
  await page.waitForSelector("[data-testid=method-form]", { state: "detached" });
  const row = page.locator("[data-testid=methods-table] tbody tr", { hasText: name });
  await row.waitFor();
  check((await row.locator("[data-testid=method-price]").innerText()).includes("1,500.00"), `«${name}» is listed with the server-formatted price 1,500.00 + YER_NEW`);
  await page.waitForFunction((n) => document.querySelector("[data-testid=preview-methods]")?.textContent?.includes(n) ?? false, name);
  check(true, "…and appears at once in the customer preview");

  // ── pickups: hint + reorder (US-15.2) ──────────────────────────────────────────
  await page.goto(`${base}/dashboard/shipping/pickup-locations`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=pickup-row]");
  check((await page.locator("[data-testid=pickup-point-hint]").innerText()).includes("هذا الموقع نقطة استلام أيضاً"), "M22 locations flagged is_pickup_point carry the hint with a link");
  const firstName = await page.locator("[data-testid=pickup-name]").nth(0).innerText();
  const secondName = await page.locator("[data-testid=pickup-name]").nth(1).innerText();
  await page.locator("[data-testid=pickup-row]").nth(1).locator("[data-testid=pickup-up]").click();
  await page.waitForFunction((n) => document.querySelectorAll("[data-testid=pickup-name]")[0]?.textContent === n, secondName);
  await page.waitForSelector("text=حُفظ الترتيب.");
  const pk = (await bff<{ results: { name: string; sort_order: number }[] }>(page, "/api/bff/shipping/pickup-locations")).body.results;
  check(pk[0]?.name === secondName && pk[1]?.name === firstName && pk.every((p, i) => p.sort_order === i + 1), "↑ posts the reorder and the server renumbers sort_order 1…n");

  // ── providers (US-15.3) ─────────────────────────────────────────────────────────
  await page.goto(`${base}/dashboard/shipping/providers`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=providers-table] tbody tr[data-row]");
  check((await page.locator("[data-testid=terminated-badge]").count()) >= 1, "an agent linked to a terminated staff account shows «الحساب مُنهى»");
  await page.click("[data-testid=providers-tab-companies]");
  await page.waitForURL((u) => u.searchParams.get("tab") === "companies");
  await page.waitForFunction(() => document.querySelectorAll("[data-testid=providers-table] [data-testid=carrier-connection]").length >= 2, null);
  check(true, "the companies tab lives in the URL and each company shows its carrier connection state");
  const badHazard = await bff(page, "/api/bff/shipping/providers", { method: "POST", body: { name: "x", phone_number: "967770000099", max_weight_per_awb: "10", max_items_per_awb: 1, volumetric_divisor: 5000, carrier_code: "", staff_account: 5 } });
  check(badHazard.status === 400 && JSON.stringify(badHazard.body).includes("مُنهى"), "linking an agent to a terminated account is a 400 under staff_account");

  // ── carriers (US-15.4, SC-15.4) ─────────────────────────────────────────────────
  await page.goto(`${base}/dashboard/shipping/carriers/aramex`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=credentials-form]");
  const html = await page.content();
  const json = await bff(page, "/api/bff/shipping/carriers/aramex");
  check(!html.includes("s3cr3t-aramex") && !json.text.includes("s3cr3t-aramex") && !json.text.includes("543543"), "no carrier secret in the DOM or the JSON (secrets are has_value only)");
  check((await page.locator("[data-secret=true]").evaluateAll((els) => els.every((e) => (e as HTMLInputElement).type === "password" && (e as HTMLInputElement).value === ""))), "secret fields are masked and empty (write-only)");
  check((await page.locator("[data-testid=webhook-url]").innerText()).includes("/api/v1/webhooks/carrier/aramex/") && (await page.locator("[data-testid=webhook-panel]").innerText()).includes("X-Carrier-Signature"), "the inbound webhook URL and its X-Carrier-Signature note are shown");
  check(await page.locator("[data-testid=no-events-warning]").isVisible(), "no inbound event for > 7 days raises «لا أحداث واردة»");
  await page.click("[data-testid=carrier-test]");
  await page.waitForFunction(() => (document.querySelector("[data-testid=carrier-test-result]")?.textContent ?? "").length > 5, null);
  check((await page.locator("[data-testid=carrier-test-result]").innerText()).includes("نجح الاتصال"), "«اختبار الاتصال» shows the server's readable success");

  // ── zones: read only, schematic map without tiles (FR-15.04/08) ─────────────────
  await page.goto(`${base}/dashboard/shipping/zones`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=zones-table] tbody tr[data-row]");
  const zones = (await bff<{ count: number }>(page, "/api/bff/shipping/sharwa-ship/zones")).body.count;
  check((await page.locator("[data-testid=map-circle]").count()) === zones && (await page.locator("[data-testid=managed-by-platform]").count()) === 1, `the map draws one circle per zone (${zones}) and «تُدار من المنصة» is shown`);
  check(external.length === 0, `no request left the app (no map tiles/keys) ${external.length ? external.join(",") : ""}`);

  // ── zone review (US-15.6) ───────────────────────────────────────────────────────
  await page.goto(`${base}/dashboard/shipping/zone-review`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=review-table] tbody tr, [data-testid=review-table] .border-dashed");
  const rv = (await bff<{ count: number; results: { order_id: number }[] }>(page, "/api/bff/shipping/zone-review")).body;
  if (rv.count > 0) {
    const target = rv.results[0]!.order_id;
    await page.locator(`[data-testid=review-actions-${target}] [data-testid=review-confirm]`).first().click();
    await page.click("[data-testid=resolve-submit]");
    await page.waitForSelector(`[data-testid=review-actions-${target}]`, { state: "detached" });
    check(true, `«تأكيد» resolves order #${target} and it leaves the list`);
  } else check(true, "zone review already emptied by earlier runs (resolve skipped)");
  await page.click("[data-testid=review-tab-restricted]");
  await page.waitForURL((u) => u.searchParams.get("tab") === "restricted");
  await page.click("[data-testid=add-restricted]");
  await page.fill("#rz-name", "نطاق فحص");
  await page.fill("[data-testid=rz-points]", "15.1, 44.1\n15.2, 44.2");
  await page.click("[data-testid=restricted-submit]");
  await page.waitForSelector("#rz-points[aria-invalid=true]");
  check((await page.locator("[data-testid=restricted-form]").innerText()).includes("3 نقاط على الأقل"), "a polygon with fewer than 3 points is refused locally");

  // ── edge cases (US-15.7) ────────────────────────────────────────────────────────
  await page.goto(`${base}/dashboard/shipping/edge-cases`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=edge-table] tbody tr[data-row]");
  await page.click("[data-testid=edge-tab-sla_breach]");
  await page.waitForURL((u) => u.searchParams.get("kind") === "sla_breach");
  await page.waitForSelector("[data-testid=edge-table] tbody tr[data-row]");
  const inTransitRow = page.locator("[data-testid=edge-table] tbody tr", { hasText: "قيد التوصيل" }).first();
  check((await inTransitRow.locator("[data-testid=edge-convert]").isDisabled()) && ((await inTransitRow.locator("[data-testid=edge-convert]").getAttribute("title")) ?? "").includes("استخدم تحديث العنوان"), "convert is disabled on an in-transit shipment with the reason «…استخدم تحديث العنوان»");
  await inTransitRow.locator("[data-testid=edge-address]").click();
  await page.fill("[data-testid=new-address]", `صنعاء، شارع حدة، عمارة ${String(Date.now()).slice(-3)}`);
  await page.click("[data-testid=address-submit]");
  await page.waitForSelector("[data-testid=address-dialog]", { state: "detached" });
  check(true, "«تحديث العنوان» on in_transit confirms through the dialog");
  const sb = (await bff<{ results: { shipment_id: number; order_id: number; status: string; version: number; convert_block_reason: string | null }[] }>(page, "/api/bff/shipping/edge-cases?kind=sla_breach")).body.results;
  const moving = sb.find((r) => r.status === "in_transit")!;
  const ev = await bff<{ event: { source: string } }>(page, `/api/bff/shipments/${moving.shipment_id}/address`, { method: "POST", body: { address: `عنوان فحص ${Date.now()}` } });
  check(ev.status === 200 && ev.body.event.source === "merchant_manual", "the address update records a merchant_manual event");
  const blocked = await bff(page, `/api/bff/orders/${moving.order_id}/convert-to-pickup`, { method: "POST", body: { pickup_location_id: 1, version: moving.version + 1 } });
  check(blocked.status === 400 && JSON.stringify(blocked.body).includes("قيد التوصيل"), "convert after picked_up is a 400 with the readable reason");
  const eligible = sb.find((r) => r.convert_block_reason === null);
  if (eligible) {
    const stale = await bff(page, `/api/bff/orders/${eligible.order_id}/convert-to-pickup`, { method: "POST", body: { pickup_location_id: 1, version: eligible.version - 1 } });
    check(stale.status === 409, "convert with a stale version answers 409");
    const ok = await bff<{ pickup_location: { id: number } }>(page, `/api/bff/orders/${eligible.order_id}/convert-to-pickup`, { method: "POST", body: { pickup_location_id: 1, version: eligible.version } });
    check(ok.status === 200 && ok.body.pickup_location.id === 1, "convert before pickup with the current version answers 200");
  } else check(true, "no pre-pickup shipment left from earlier runs (convert 409/200 skipped)");

  // ── gates ───────────────────────────────────────────────────────────────────────
  const staff = await newPage(browser, "noor", "staff");
  await staff.page.goto(`${staff.base}/dashboard/shipping`, { waitUntil: "load" });
  await staff.page.waitForSelector("[data-testid=feature-off]");
  await staff.page.goto(`${staff.base}/dashboard/shipping/packaging`, { waitUntil: "load" });
  await staff.page.waitForSelector("[data-testid=forbidden]");
  const s403 = await bff(staff.page, "/api/bff/shipping/settings");
  check(s403.status === 403, "the cashier: shipping settings feature-off, packaging forbidden, settings BFF 403");
  await staff.page.goto(`${staff.base}/dashboard/shipping/edge-cases`, { waitUntil: "load" });
  await staff.page.waitForSelector("[data-testid=edge-table] tbody tr[data-row]");
  check(true, "…but a member with orders.view / update_status opens the edge cases");

  const shop = await newPage(browser, "shop", "merchant");
  await shop.page.goto(`${shop.base}/dashboard/shipping`, { waitUntil: "load" });
  await shop.page.waitForSelector("text=لا طرق توصيل — أضف طريقة ليتمكن العميل من الطلب");
  check(true, "the empty store shows «لا طرق توصيل — أضف طريقة ليتمكن العميل من الطلب»");

  await browser.close();
  if (consoleErrors.length) {
    console.log("\nConsole errors:");
    for (const e of consoleErrors) console.log("  " + e);
  }
  const total = failures.length;
  console.log(`\n${total === 0 && consoleErrors.length === 0 ? "ALL PASSED" : `${total} failed, ${consoleErrors.length} console errors`}`);
  process.exit(total || consoleErrors.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
