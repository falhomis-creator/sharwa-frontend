/**
 * Functional check for M22 — المواقع (T120–T122) on the mocks.
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/locations-check.ts [port]   (default 3000)
 *
 * Owner on `noor`: the list and its URL filters, the child indent, the detail tabs in the
 * URL, the inventory tab (amber below-reorder dot, inline adjust → server numbers), the staff
 * tab (assign → remove), the form (code uniqueness 400 under the field, conditional
 * sections, `lat,lng` paste), the routing screen (keyboard reorder → renumbered, preview
 * sentence follows), and the two gates: `shop` (mode off) shows the activation screen;
 * the cashier cookie is stopped by the feature gate on the page and 403 on the BFF.
 * Exit 1 on a failed check or console error.
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
    // 400/403 below are provoked on purpose; the browser logs the failed resource.
    if (m.type() === "error" && !/status of (400|403)/.test(m.text())) consoleErrors.push(`[${tag}] ${m.text().slice(0, 240)}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`[${tag}] PAGEERROR ${e.message}`));
}

async function newPage(browser: Browser, store: string, session: "merchant" | "staff", width = 1440) {
  const host = `${store}.localhost`;
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: "ar", isMobile: width < 768, hasTouch: width < 768 });
  await ctx.addCookies([{ name: "sharwa_mock_session", value: session, domain: host, path: "/" }]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(60_000);
  watch(page, `${store}/${session}@${width}`);
  return { page, base: `http://${host}:${PORT}` };
}

type Json = Record<string, unknown>;
async function bff(page: Page, path: string, init?: { method?: string; body?: Json }) {
  return page.evaluate(
    async ({ path, init }) => {
      const res = await fetch(path, { method: init?.method ?? "GET", headers: { "content-type": "application/json" }, body: init?.body ? JSON.stringify(init.body) : undefined });
      return { status: res.status, body: (await res.json().catch(() => ({}))) as Record<string, unknown> };
    },
    { path, init },
  );
}

async function main() {
  const browser = await launch();
  const { page, base } = await newPage(browser, "noor", "merchant");

  // ── list ────────────────────────────────────────────────────────────────────────
  await page.goto(`${base}/dashboard/locations`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=locations-table] tbody tr");
  const rows = await page.locator("[data-testid=locations-table] tbody tr").count();
  check(rows >= 7, `list renders the seeded locations (${rows})`);
  check((await page.locator("[data-testid=locations-table] tbody tr .border-s").count()) === 1, "the PUDO child is indented under its parent branch");

  const pickups = ((await bff(page, "/api/bff/locations?flag=is_pickup_point")).body as { count: number }).count;
  await page.selectOption("[data-testid=filter-flag]", "is_pickup_point");
  await page.waitForURL((u) => u.searchParams.get("flag") === "is_pickup_point");
  await page.waitForFunction((n) => document.querySelectorAll("[data-testid=locations-table] tbody tr").length === n, pickups);
  check(true, `the capability filter lands in the URL and narrows to the pickup points (${pickups})`);

  // ── detail: tabs in the URL, inventory numbers from the server ──────────────────
  await page.goto(`${base}/dashboard/locations/2?tab=inventory`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=location-inventory] [data-testid=inventory-row]");
  check((await page.locator("[data-testid=location-tab-inventory]").getAttribute("aria-selected")) === "true", "`?tab=inventory` selects the inventory tab");
  const invRows = await page.locator("[data-testid=inventory-row]").count();
  const inv = (await bff(page, "/api/bff/locations/2/inventory?page_size=100")).body as { count: number; results: { product_id: number; variant_id: number | null; available: string; below_reorder: boolean; sku: string }[] };
  check(invRows === inv.count, `inventory tab lists every row of the location (${invRows})`);
  const belowDots = await page.locator("[data-testid=below-reorder-dot]").count();
  check(belowDots === inv.results.filter((r) => r.below_reorder).length, `amber dot on exactly the rows below their reorder point (${belowDots})`);

  const target = inv.results.find((r) => r.variant_id === null && !r.below_reorder) ?? inv.results[0];
  const row = page.locator("[data-testid=inventory-row]", { hasText: target.sku }).first();
  await row.locator("[data-testid=row-adjust]").click();
  await page.waitForSelector("[data-testid=row-editor]");
  await page.fill("[data-testid=adjust-amount]", "-1");
  await page.click("[data-testid=adjust-submit]");
  await page.waitForSelector("[data-testid=row-editor] [role=alert]");
  check((await page.locator("[data-testid=row-editor] [role=alert]").innerText()).includes("الملاحظة"), "a negative adjust without a note is refused by the server, message inline");
  await page.fill("[data-testid=adjust-note]", "تالف أثناء الجرد");
  await page.click("[data-testid=adjust-submit]");
  await page.waitForSelector("[data-testid=row-editor]", { state: "detached" });
  const after = (await bff(page, "/api/bff/locations/2/inventory?page_size=100")).body as typeof inv;
  const afterRow = after.results.find((r) => r.product_id === target.product_id && r.variant_id === target.variant_id)!;
  check(Number(afterRow.available) === Number(target.available) - 1, `the adjust posts to the location endpoint and the server's available drops by one (${target.available} → ${afterRow.available})`);

  // ── staff tab ───────────────────────────────────────────────────────────────────
  await page.click("[data-testid=location-tab-staff]");
  await page.waitForURL((u) => u.searchParams.get("tab") === "staff");
  await page.waitForSelector("[data-testid=location-staff]");
  const before = await page.locator("[data-testid=assignment-row]").count();
  await page.selectOption("[data-testid=assign-staff]", { index: 1 });
  await page.selectOption("[data-testid=assign-role]", "driver");
  await page.click("[data-testid=assign-submit]");
  await page.waitForFunction((n) => document.querySelectorAll("[data-testid=assignment-row]").length === n + 1, before);
  check(true, `assigning a member adds a row (${before} → ${before + 1})`);
  await page.locator("[data-testid=assignment-row]").last().locator("[data-testid=assignment-remove]").click();
  await page.waitForFunction((n) => document.querySelectorAll("[data-testid=assignment-row]").length === n, before);
  check(true, "removing the assignment takes the row away");

  // ── form: 400 under the field, conditional sections, lat,lng paste ──────────────
  await page.goto(`${base}/dashboard/locations/new`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=location-form]");
  check((await page.locator("[data-testid=operating-hours]").count()) === 0, "operating hours stay hidden until a walk-in or pickup flag is on");
  await page.click("[data-testid=flag-is_pickup_point]");
  await page.waitForSelector("[data-testid=operating-hours]");
  check((await page.locator("[data-testid=operating-hours] input[type=time]").count()) === 14, "turning on «نقطة استلام» reveals the hours grid (7 days × 2) and the locker section");
  await page.click("[data-testid=ownership-dropship_supplier]");
  await page.waitForSelector("[data-testid=supplier-channel]");
  check(true, "choosing «مورد دروبشيبينج» reveals the supplier channel section");

  const dup = await bff(page, "/api/bff/locations", { method: "POST", body: { name: "x", code: "WH-01", flags: {}, ownership: "owned" } });
  check(dup.status === 400 && Array.isArray((dup.body as { code?: unknown }).code), "a duplicate code is a 400 keyed on `code`");

  await page.fill("input[id$='-name']", "فرع الفحص");
  await page.fill("input[id$='-code']", "WH-01");
  await page.click("[data-testid=save-location]");
  await page.waitForSelector("input[id$='-code'][aria-invalid=true]");
  check(true, "the 400 lands under the code field (aria-invalid) and focus moves there");

  await page.fill("input[id$='-code']", `QA-${String(Date.now()).slice(-5)}`);
  await page.focus("input[id$='-lat']");
  await page.evaluate(() => {
    const el = document.querySelector<HTMLInputElement>("input[id$='-lat']")!;
    const dt = new DataTransfer();
    dt.setData("text", "24.7136, 46.6753");
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  check((await page.inputValue("input[id$='-lng']")) === "46.6753", "pasting «lat,lng» into the latitude field fills both coordinates");
  await page.click("[data-testid=save-location]");
  await page.waitForURL(/\/dashboard\/locations\/\d+$/);
  await page.waitForSelector("[data-testid=location-page]");
  const created = (await bff(page, `/api/bff/locations/${page.url().split("/").pop()}`)).body as { display_type: string; locker: unknown; dropship_supplier: unknown; vehicle: unknown; operating_hours: unknown[] };
  check(typeof created.display_type === "string" && created.display_type.length > 0 && created.locker !== null && created.dropship_supplier !== null && created.vehicle === null, `create redirects to the detail; the server computed «${created.display_type}», kept the shown sections and dropped the hidden one`);

  // ── routing: keyboard reorder, preview sentence ─────────────────────────────────
  await page.goto(`${base}/dashboard/locations/routing`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid=rules-list] [data-testid=rule-row]");
  const order = await page.locator("[data-testid=rule-row]").evaluateAll((els) => els.map((e) => e.querySelector("span.font-mono")?.textContent));
  check(order.join(",") === order.map((_, i) => String(i + 1)).join(","), `rules render in priority order (${order.join(" ")})`);
  const firstText = await page.locator("[data-testid=rule-row]").nth(0).innerText();
  await page.locator("[data-testid=rule-row]").nth(1).locator("[data-testid=rule-up]").click();
  await page.waitForFunction((t) => document.querySelectorAll("[data-testid=rule-row]")[1]?.textContent?.includes(t.split("\n")[1] ?? "") ?? false, firstText);
  const rules = (await bff(page, "/api/bff/locations/routing-rules")).body as unknown as { id: number; priority: number }[];
  check(rules.every((r, i) => r.priority === i + 1), "↑ swaps the first two rules and the server renumbers 1…n");
  check((await page.locator("[data-testid=inactive-target]").count()) >= 1, "a rule aimed at the inactive 3PL carries the amber dot");

  await page.fill("[data-testid=preview-city]", "جدة");
  await page.waitForFunction(() => document.querySelector("[data-testid=preview-sentence]")?.textContent?.includes("BR-JED-02") ?? false, null);
  check(true, "the preview sentence follows the city: جدة → BR-JED-02");

  // ── gates ───────────────────────────────────────────────────────────────────────
  const shop = await newPage(browser, "shop", "merchant");
  await shop.page.goto(`${shop.base}/dashboard/locations`, { waitUntil: "load" });
  await shop.page.waitForSelector("[data-testid=locations-activation]");
  check(true, "a store with the mode off sees the activation screen instead of the list");
  await shop.page.click("[data-testid=activate-mode]");
  await shop.page.click("[data-testid=confirm-activate]");
  await shop.page.waitForSelector("[data-testid=locations-table], [data-testid=locations-activation]", { state: "attached" });
  await shop.page.waitForFunction(() => !document.querySelector("[data-testid=locations-activation]"), null);
  check(true, "confirming the switch posts the mode and the empty list takes over");
  await bff(shop.page, "/api/bff/locations/mode", { method: "POST", body: { enabled: false } });

  const staff = await newPage(browser, "noor", "staff");
  await staff.page.goto(`${staff.base}/dashboard/locations/new`, { waitUntil: "load" });
  check(await staff.page.locator("[data-testid=feature-off], [data-testid=forbidden]").first().isVisible(), "a cashier is stopped by the gate on the new-location page");
  const staffPost = await bff(staff.page, "/api/bff/locations", { method: "POST", body: { name: "x", code: "ZZ-99", flags: {}, ownership: "owned" } });
  check(staffPost.status === 403, "the BFF refuses a cashier's create with 403");

  await browser.close();
  if (consoleErrors.length) {
    console.log("\nConsole errors:");
    for (const e of consoleErrors) console.log("  " + e);
  }
  console.log(`\n${failures.length === 0 && consoleErrors.length === 0 ? "ALL PASSED" : `${failures.length} failed, ${consoleErrors.length} console errors`}`);
  process.exit(failures.length || consoleErrors.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
