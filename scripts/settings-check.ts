/**
 * Functional check for Phase 3E — M34 store settings hub (T085).
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/settings-check.ts [port]   (default 3000)
 *
 * What a screenshot cannot prove (M34 §3, FR-34.03–06, SC-34.2/34.4):
 *   - auto-save: «يُحفظ…» → «تم الحفظ hh:mm», only after 800ms, and a section switch right
 *     after typing still saves (no lost edit); the new store name reaches the shell;
 *   - a server field error lands under its field;
 *   - explicit sections never auto-save: dirty → section navigation is held by the unsaved
 *     bar; «حفظ» → confirmation → saved and the held navigation continues; «تجاهل» restores;
 *     ⌘S opens the confirmation; client validation (rate 0) blocks it;
 *   - multi-location: readable 409 with the conflicting location, then «دمج الكميات وإيقاف»;
 *   - ⌘K «المنطقة الزمنية» → the identity section with the field focused;
 *   - a cashier: feature-gated sections redirect to «الهوية», sensitive ones are read-only;
 *   - phones: the nav is a select.
 * Screenshots → docs/visual-checks/34-settings/. Exit 1 on a failed check or console error.
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] ?? "3000";
const BASE = `http://noor.localhost:${PORT}`;
const OUT = join(process.cwd(), "docs", "visual-checks", "34-settings");
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
    // The 400 and 409 below are provoked on purpose; the browser logs the failed resource.
    if (m.type() === "error" && !/status of (400|409)/.test(m.text())) consoleErrors.push(`[${tag}] ${m.text().slice(0, 240)}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`[${tag}] PAGEERROR ${e.message}`));
}

async function settings(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(async () => (await fetch("/api/bff/settings")).json() as Promise<Record<string, unknown>>);
}

async function newPage(browser: Browser, session: "merchant" | "staff", width = 1440) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: "ar", isMobile: width < 768, hasTouch: width < 768 });
  await ctx.addCookies([{ name: "sharwa_mock_session", value: session, domain: "noor.localhost", path: "/" }]);
  const page = await ctx.newPage();
  watch(page, `${session}@${width}`);
  return page;
}

async function main() {
  const browser = await launch();
  const page = await newPage(browser, "merchant");

  // ── Auto-save: identity ────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/settings/identity`, { waitUntil: "networkidle" });
  const original = String((await settings(page)).store_name);
  const newName = `متجر نور ${Date.now() % 1000}`;
  await page.fill("#store_name", newName);
  await page.waitForTimeout(300);
  check((await page.locator("[data-testid=save-indicator]").count()) === 0, "no save before the 800ms debounce");
  await page.waitForSelector('[data-testid=save-indicator][data-phase="saved"]', { timeout: 6_000 });
  check(/تم الحفظ \d{2}:\d{2}/.test((await page.locator("[data-testid=save-indicator]").textContent()) ?? ""), "«تم الحفظ hh:mm» after the auto-save");
  await page.waitForFunction((n) => document.querySelector("nav[aria-label='أقسام اللوحة']")?.textContent?.includes(n), newName, { timeout: 8_000 });
  check(true, "the new store name reaches the shell without a reload");
  await page.screenshot({ path: join(OUT, "auto-saved.png") });

  // A switch right after typing still saves (flush on unmount — SC-34.2).
  await page.goto(`${BASE}/dashboard/settings/contact`, { waitUntil: "networkidle" });
  await page.fill("#contact_email", "orders@noor-store.com");
  await page.click("[data-testid=settings-nav-policies]");
  await page.waitForURL(/settings\/policies$/);
  await page.waitForTimeout(900);
  check((await settings(page)).contact_email === "orders@noor-store.com", "an edit followed at once by a section switch is saved");

  // A server field error lands under its field (FR-34.06).
  await page.goto(`${BASE}/dashboard/settings/announcement`, { waitUntil: "networkidle" });
  const barSwitch = page.getByRole("switch", { name: "تفعيل الشريط" });
  if ((await barSwitch.getAttribute("aria-checked")) !== "true") {
    await page.fill("#announcement_text", "توصيل مجاني للطلبات فوق 300 ر.س");
    await barSwitch.click();
    await page.waitForSelector('[data-testid=save-indicator][data-phase="saved"]', { timeout: 6_000 });
  }
  await page.fill("#announcement_text", ""); // the bar is on → the server refuses an empty text (400)
  await page.waitForSelector("#announcement_text-error", { timeout: 6_000 });
  check(((await page.locator("#announcement_text-error").textContent()) ?? "").includes("اكتب نص الشريط"), "server 400 is shown under its field");
  await page.fill("#announcement_text", "توصيل مجاني للطلبات فوق 300 ر.س");
  await page.fill("#announcement_text_color", "#27272a");
  await page.waitForSelector("[data-testid=contrast-warning]");
  check(true, "low contrast between the two bar colours → «تباين أقل من AA»");
  await page.screenshot({ path: join(OUT, "announcement-contrast.png"), fullPage: true });
  await page.fill("#announcement_text_color", "#ffffff");
  await page.waitForTimeout(1200);

  // ── Explicit: currency ─────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/settings/currency`, { waitUntil: "networkidle" });
  check(await page.locator("[data-testid=save-section]").isDisabled(), "«حفظ التغييرات» is disabled until something changes");
  await page.fill("#usd_to_sar", "0");
  await page.click("[data-testid=save-section]");
  await page.waitForSelector("#usd_to_sar-error");
  check(((await page.locator("#usd_to_sar-error").textContent()) ?? "").includes("أكبر من صفر"), "a zero rate is refused locally");
  const rateBefore = String((await settings(page)).usd_to_sar);
  const rateAfter = rateBefore === "3.76" ? "3.77" : "3.76";
  await page.fill("#usd_to_sar", rateAfter);
  await page.waitForTimeout(1200);
  check((await settings(page)).usd_to_sar === rateBefore, "the explicit section did not auto-save");
  await page.click("[data-testid=settings-nav-seo]");
  await page.waitForTimeout(300);
  check(page.url().endsWith("/settings/currency") && (await page.locator("[data-testid=unsaved-bar]").isVisible()), "dirty → section navigation is held by the unsaved bar");
  await page.screenshot({ path: join(OUT, "unsaved-bar.png"), fullPage: true });
  await page.click("[data-testid=unsaved-save]");
  await page.waitForSelector("[data-testid=confirm-save]");
  check(((await page.locator("[data-testid=confirm-save]").textContent()) ?? "").includes("الطلبات السابقة لا تتأثر"), "the confirmation says previous orders are not affected");
  await page.screenshot({ path: join(OUT, "currency-confirm.png") });
  await page.click("[data-testid=confirm-save-button]");
  await page.waitForURL(/settings\/seo$/, { timeout: 8_000 });
  const fx = (await settings(page)) as { usd_to_sar: string; fx_preview: Array<{ currency: string; display_100_sar: string }> };
  const usd100 = (100 / Number(rateAfter)).toFixed(2);
  check(fx.usd_to_sar === rateAfter && fx.fx_preview.some((r) => r.currency === "USD" && r.display_100_sar.startsWith(usd100)), "saved after confirming; the held navigation continued; fx_preview recomputed by the server");

  // «تجاهل» and ⌘S on shipping.
  await page.goto(`${BASE}/dashboard/settings/shipping`, { waitUntil: "networkidle" });
  const fee = await page.inputValue("#default_delivery_fee");
  await page.fill("#default_delivery_fee", "9999.00");
  await page.keyboard.press("Control+KeyS");
  await page.waitForSelector("[data-testid=confirm-save]");
  check(true, "⌘S/Ctrl+S opens the confirmation");
  await page.keyboard.press("Escape");
  await page.click("[data-testid=settings-nav-identity]");
  await page.click("[data-testid=unsaved-discard]");
  await page.waitForURL(/settings\/identity$/, { timeout: 5_000 });
  check((await settings(page)).default_delivery_fee === fee, "«تجاهل» drops the change and continues the held navigation");

  // ── Multi-location 409 ─────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/settings/locations`, { waitUntil: "networkidle" });
  if ((await settings(page)).multi_location_enabled !== true) {
    await page.evaluate(() => fetch("/api/bff/settings/multi-location", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: true }) }));
    await page.reload({ waitUntil: "networkidle" });
  }
  await page.getByRole("switch", { name: "تعدد المواقع" }).click();
  await page.click("[data-testid=save-section]");
  await page.click("[data-testid=confirm-save-button]");
  await page.waitForSelector("[data-testid=multi-location-conflict]", { timeout: 6_000 });
  check(((await page.locator("[data-testid=multi-location-conflict]").textContent()) ?? "").includes("فرع الرياض"), "409 is readable: the conflicting location is listed");
  await page.screenshot({ path: join(OUT, "locations-409.png"), fullPage: true });
  await page.click("[data-testid=merge-and-disable]");
  await page.waitForSelector("[data-testid=multi-location-conflict]", { state: "detached", timeout: 6_000 });
  check((await settings(page)).multi_location_enabled === false, "«دمج الكميات وإيقاف» completes the change");

  // ── ⌘K «إعداد: المنطقة الزمنية» ───────────────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/orders`, { waitUntil: "networkidle" });
  await page.keyboard.press("Control+KeyK");
  await page.keyboard.type("المنطقة الزمنية");
  await page.waitForTimeout(300);
  await page.keyboard.press("Enter");
  await page.waitForURL(/settings\/identity#timezone$/, { timeout: 8_000 });
  await page.waitForFunction(() => document.activeElement?.id === "timezone", null, { timeout: 5_000 });
  check(true, "⌘K «المنطقة الزمنية» opens identity with the field focused");

  // Put the fixture back (rates, locations) so the script can run again on the same server.
  // (no helper functions inside evaluate: tsx would wrap them in a `__name` call the page lacks)
  await page.evaluate(async () => {
    const headers = { "content-type": "application/json" };
    await fetch("/api/bff/settings/currency", { method: "PATCH", headers, body: JSON.stringify({ usd_to_sar: "3.75" }) });
    await fetch("/api/bff/settings/multi-location", { method: "POST", headers, body: JSON.stringify({ enabled: true }) });
  });
  // Restore the store name for the visual run.
  await page.fill("#store_name", original === newName ? "متجر نور" : original);
  await page.waitForSelector('[data-testid=save-indicator][data-phase="saved"]', { timeout: 6_000 });

  // ── Staff (cashier) ────────────────────────────────────────────────────────────────
  const staff = await newPage(browser, "staff");
  await staff.goto(`${BASE}/dashboard/settings/seo`, { waitUntil: "networkidle" });
  await staff.waitForURL(/settings\/identity$/, { timeout: 8_000 });
  check(true, "a section whose feature is off redirects to «الهوية»");
  await staff.waitForSelector("[data-testid=read-only-note]");
  check(await staff.locator("#store_name").isDisabled(), "a cashier sees identity read-only");
  await staff.screenshot({ path: join(OUT, "staff-read-only.png"), fullPage: true });
  await staff.goto(`${BASE}/dashboard/settings/payments`, { waitUntil: "networkidle" });
  check((await staff.locator("[data-testid=save-section]").count()) === 0 && (await staff.locator("[data-testid=read-only-note]").isVisible()), "payments: read-only, no save button for staff");

  // ── Phone ──────────────────────────────────────────────────────────────────────────
  const phone = await newPage(browser, "merchant", 390);
  await phone.goto(`${BASE}/dashboard/settings/identity`, { waitUntil: "networkidle" });
  check(await phone.locator("[data-testid=settings-section-select]").isVisible(), "phones: the section nav is a select");
  await phone.selectOption("[data-testid=settings-section-select]", "currency");
  await phone.waitForURL(/settings\/currency$/);
  check(true, "phones: choosing a section in the select navigates");

  await browser.close();
  if (consoleErrors.length) {
    console.log("\nconsole errors:");
    for (const e of consoleErrors) console.log("  " + e);
  }
  if (failures.length || consoleErrors.length) {
    console.log(`\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
    process.exit(1);
  }
  console.log("\n✓ Phase 3E functional check passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
