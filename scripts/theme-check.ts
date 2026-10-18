/**
 * Functional check for Phase 5 — M08 theme customizer (T100/T101).
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/theme-check.ts [port]   (default 3000)
 *
 * What a screenshot cannot prove (M08 §3, FR-08.01–08, SC-08.1/08.2/08.4):
 *   - 9 presets drawn from their tokens, the current one selected; a colour edit reaches the
 *     REAL storefront in the iframe in < 300ms, flips the preset to «مخصّص» and shows «غير منشور»;
 *   - ZERO write requests before «نشر» (POST/PATCH/DELETE counted on the page);
 *   - the device switch changes the frame width without reloading it;
 *   - the 11 fonts; an `svg` logo is refused locally;
 *   - sections: «إضافة قسم» offers the 3 addable types, singletons disabled; keyboard reorder
 *     of `slider` to position 2 is mirrored in the preview; `show_on_mobile=false` hides it on
 *     the mobile frame; the section editor + Esc;
 *   - «نشر» → PATCH theme + `reorder {ordered_ids}` with every id → `/api/v1/config/` changed;
 *   - 409 → «حُدِّث الثيم من جلسة أخرى» + reload; a deleted category blocks publishing;
 *   - staff → forbidden; the empty store `shop` → the sections empty state.
 * The noor theme/sections are restored at the end. Exit 1 on a failed check or console error.
 */
import { chromium, type Browser, type Frame, type Page } from "@playwright/test";
import { existsSync } from "node:fs";

const PORT = process.argv[2] ?? "3000";
const BASE = `http://noor.localhost:${PORT}`;
const SHOP = `http://shop.localhost:${PORT}`;
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
    // The 400/409 below are provoked on purpose; the browser logs the failed resource.
    if (m.type() === "error" && !/status of (400|409)/.test(m.text())) consoleErrors.push(`[${tag}] ${m.text().slice(0, 240)}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`[${tag}] PAGEERROR ${e.message}`));
}

async function newPage(browser: Browser, session: "merchant" | "staff", width = 1440, host = "noor.localhost") {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: "ar" });
  await ctx.addCookies([{ name: "sharwa_mock_session", value: session, domain: host, path: "/" }]);
  const page = await ctx.newPage();
  watch(page, `${session}@${width}`);
  return page;
}

async function api<T = unknown>(page: Page, path: string, init?: { method?: string; json?: unknown }): Promise<{ status: number; body: T }> {
  return page.evaluate(
    async ({ path, init }) => {
      const res = await fetch(path, {
        method: init?.method ?? "GET",
        headers: init?.json !== undefined ? { "content-type": "application/json" } : undefined,
        body: init?.json !== undefined ? JSON.stringify(init.json) : undefined,
      });
      const text = await res.text();
      return { status: res.status, body: (text ? JSON.parse(text) : null) as T };
    },
    { path, init },
  );
}

async function previewFrame(page: Page): Promise<Frame> {
  await page.waitForSelector("[data-testid=preview-iframe][data-phase=ready]", { timeout: 60_000 });
  const handle = await page.$("[data-testid=preview-iframe]");
  const frame = await handle!.contentFrame();
  return frame!;
}

async function openEditor(page: Page, url = `${BASE}/dashboard/design`) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=design-editor]");
  return previewFrame(page);
}

async function main() {
  const browser = await launch();
  const page = await newPage(browser, "merchant");
  const writes: string[] = [];
  page.on("request", (r) => {
    if (["POST", "PATCH", "PUT", "DELETE"].includes(r.method()) && r.url().includes("/api/")) writes.push(`${r.method()} ${new URL(r.url()).pathname}`);
  });

  // Snapshot for the restore at the end.
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  const origTheme = (await api<Record<string, unknown>>(page, "/api/bff/store/theme")).body;
  const origSections = (await api<Array<{ id: number }>>(page, "/api/bff/admin/sections")).body;

  try {
    // ── Presets + live preview ──────────────────────────────────────────────────────
    let frame = await openEditor(page);
    writes.length = 0;
    const rows = page.locator("[data-testid^=preset-row-]");
    await rows.first().waitFor();
    check((await rows.count()) === 9, "9 presets listed as rows");
    check((await page.getAttribute("[data-testid=preset-row-luxury_boutique]", "aria-checked")) === "true", "the current preset (luxury_boutique) is selected");
    check((await page.locator("[data-testid=preset-row-modern_trust] span.rounded-full").count()) === 5, "each row draws its 5 colour tokens (no image)");

    await page.click("[data-testid=preset-row-luxury_boutique]");
    await page.fill("#primary_color", "#0E7490");
    const t0 = Date.now();
    await frame.waitForFunction(() => getComputedStyle(document.querySelector("[data-store-theme]")!).getPropertyValue("--primary").trim().toLowerCase() === "#0e7490", null, { timeout: 3000 });
    const dt = Date.now() - t0;
    check(dt < 300, `primary_color reaches the storefront iframe in ${dt}ms (< 300ms)`);
    check((await page.locator("[data-testid=preset-custom]").count()) === 1 && (await page.textContent("[data-testid=draft-status]"))!.includes("غير منشور"), "preset becomes «مخصّص» and «غير منشور» shows");

    // Device switch — width changes, the frame is not reloaded.
    const navs: string[] = [];
    page.on("framenavigated", (f) => {
      if (f !== page.mainFrame()) navs.push(f.url());
    });
    await page.click("[data-testid=device-mobile]");
    await page.waitForTimeout(260);
    const w = await page.$eval("[data-testid=preview-iframe]", (el) => (el as HTMLIFrameElement).style.width);
    check(w === "390px" && navs.length === 0 && new URL(page.url()).searchParams.get("device") === "mobile", "device switch → 390px frame, no reload, in the URL");

    // Fonts + logo.
    await page.click("[data-testid=font-heading_font]");
    check((await page.locator("[role=listbox] [role=option]").count()) === 11, "11 Arabic fonts in the picker");
    await page.keyboard.press("Escape");
    await page.setInputFiles("[data-testid=logo-input]", { name: "logo.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>") });
    check((await page.textContent("[data-testid=logo-error]"))?.includes("الصيغ المسموحة: jpg, jpeg, png, webp, gif") ?? false, "an svg logo is refused locally with the allowed formats");

    // ── Sections ───────────────────────────────────────────────────────────────────
    await page.click("[data-testid=tab-sections]");
    await page.waitForSelector("[data-testid=sections-list]");
    await page.click("[data-testid=add-section]");
    const enabled = await page.locator("[data-testid=add-section-dialog] button[data-testid^=add-type-]:not(:disabled)").count();
    const disabledText = await page.locator("[data-testid=add-type-hero]").textContent();
    check(enabled === 3 && (disabledText ?? "").includes("قسم مفرد موجود مسبقاً"), "«إضافة قسم»: 3 addable types, singletons disabled «قسم مفرد موجود مسبقاً»");
    await page.keyboard.press("Escape");

    const order = () => page.$$eval("[data-testid=sections-list] > li", (els) => els.map((e) => Number(e.getAttribute("data-testid")!.replace("section-row-", ""))));
    const before = await order();
    const from = before.indexOf(42);
    await page.focus("[data-testid=drag-42]");
    await page.keyboard.press("Space");
    await page.waitForTimeout(200);
    for (let i = 0; i < from - 1; i++) {
      await page.keyboard.press("ArrowUp");
      await page.waitForTimeout(180);
    }
    await page.keyboard.press("Space");
    await page.waitForTimeout(300);
    const after = await order();
    const previewOrder = await frame.evaluate(() => getComputedStyle(document.querySelector("[data-section-id='42']")!).order);
    check(after.indexOf(42) === 1 && previewOrder === "1", `slider moved ${from + 1} → 2 by keyboard, the preview order matches (${after.join(",")} · order ${previewOrder})`);

    check((await page.locator("[data-testid=hidden-mobile-45]").count()) === 1, "show_on_mobile=false is marked «مخفي على الجوال» in the list");
    const hidden45 = await frame.evaluate(() => getComputedStyle(document.querySelector("[data-section-id='45']")!).display);
    check(hidden45 === "none", "…and hidden in the 390px preview");

    await page.click("[data-testid=edit-section-41]");
    await page.waitForSelector("[data-testid=section-editor]");
    const cats = await page.locator("[data-testid=category-picker] option").count();
    check(/\/dashboard\/design\/sections\/41/.test(page.url()) && cats > 5, "product_grid editor at /design/sections/41 with the category picker");
    await page.keyboard.press("Escape");
    await page.waitForSelector("[data-testid=sections-panel]");
    check(!page.url().includes("/sections/"), "Esc closes the section editor");

    check(writes.length === 0, `no write request before «نشر» (${writes.length})`);

    // beforeunload guard when dirty.
    let guarded = false;
    page.once("dialog", async (d) => {
      guarded = d.type() === "beforeunload";
      await d.dismiss();
    });
    await page.evaluate(() => {
      const ev = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(ev);
      (window as unknown as { __m08Prevented: boolean }).__m08Prevented = ev.defaultPrevented;
    });
    guarded = guarded || (await page.evaluate(() => (window as unknown as { __m08Prevented: boolean }).__m08Prevented));
    check(guarded, "leaving with unpublished changes is guarded (beforeunload)");

    // ── Publish ────────────────────────────────────────────────────────────────────
    await page.click("[data-testid=publish]");
    await page.waitForSelector("[data-sonner-toast]:has-text('نُشر الثيم')", { timeout: 10_000 });
    const reorderReq = writes.find((x) => x.endsWith("/admin/sections/reorder"));
    check(writes.includes("PATCH /api/bff/store/theme") && Boolean(reorderReq), `publish sent PATCH theme + reorder (${writes.join(", ")})`);
    check((await page.locator("[data-sonner-toast] :text('عرض المتجر')").count()) === 1, "toast «نُشر الثيم» with «عرض المتجر»");
    const cfg = (await api<{ primary_color: string; theme_preset: string; sections: Array<{ id: number; order: number; is_active: boolean }> }>(page, "/api/v1/config/")).body;
    const cfgOrder = cfg.sections.sort((a, b) => a.order - b.order).map((s) => s.id);
    check(cfg.primary_color.toUpperCase() === "#0E7490" && cfg.theme_preset === "custom" && cfgOrder[1] === 42 && cfgOrder.length === origSections.length, `/api/v1/config/ serves the published theme and order (list = preview = store) ${cfg.primary_color} ${cfg.theme_preset} ${cfgOrder.join(",")}`);
    check((await page.textContent("[data-testid=draft-status]"))!.includes("منشور"), "status back to «منشور»");

    // ── Conflict ───────────────────────────────────────────────────────────────────
    frame = await openEditor(page, `${BASE}/dashboard/design?simulateConflict=1`);
    await page.click("[data-testid=preset-row-clay_zen]");
    await page.click("[data-testid=publish]");
    await page.waitForSelector("[data-testid=conflict]");
    check((await page.textContent("[data-testid=conflict]"))!.includes("حُدِّث الثيم من جلسة أخرى"), "409 → «حُدِّث الثيم من جلسة أخرى»");
    await page.click("[data-testid=conflict-reload]");
    await page.waitForFunction(() => document.querySelector("[data-testid=design-editor]")?.getAttribute("data-status") === "clean");
    check(true, "«إعادة التحميل» restores the published theme (clean)");

    // ── Deleted category blocks publishing ─────────────────────────────────────────
    const cat = (await api<{ id: number }>(page, "/api/bff/categories", { method: "POST", json: { name: `مؤقت ${Date.now() % 1000}`, parent_id: null } })).body;
    await api(page, "/api/bff/admin/sections/41", { method: "PATCH", json: { content_data: { category_id: cat.id, limit: 4, title: "عطور وبخور" } } });
    await api(page, `/api/bff/categories/${cat.id}`, { method: "DELETE" });
    await openEditor(page, `${BASE}/dashboard/design?tab=sections`);
    await page.waitForSelector("[data-testid=section-row-41]");
    const rowText = await page.textContent("[data-testid=section-row-41]");
    await page.click("[data-testid=toggle-44]");
    const blocked = await page.isDisabled("[data-testid=publish]");
    check((rowText ?? "").includes("تصنيف محذوف — اختر آخر") && blocked, "a deleted category shows «تصنيف محذوف — اختر آخر» and blocks «نشر»");
    await page.click("[data-testid=discard]");
    await api(page, "/api/bff/admin/sections/41", { method: "PATCH", json: { content_data: { category_id: 5, limit: 4, title: "عطور وبخور" } } });

    // ── Staff + empty store ────────────────────────────────────────────────────────
    const staff = await newPage(browser, "staff");
    await staff.goto(`${BASE}/dashboard/design`, { waitUntil: "networkidle" });
    check((await staff.locator("[data-testid=forbidden]").count()) === 1, "staff (cashier) → ForbiddenState");
    await staff.close();
    const shop = await newPage(browser, "merchant", 1440, "shop.localhost");
    await shop.goto(`${SHOP}/dashboard/design?tab=sections`, { waitUntil: "networkidle" });
    await shop.waitForSelector("[data-testid=sections-panel]");
    check((await shop.textContent("[data-testid=sections-panel]"))!.includes("لا أقسام مفعّلة — أضف قسماً أو فعّل البانر الرئيسي"), "empty store: «لا أقسام مفعّلة — أضف قسماً أو فعّل البانر الرئيسي»");
    await shop.close();
  } finally {
    // Restore noor's published theme and section order for the other checks.
    const t = origTheme as Record<string, unknown>;
    const current = (await api<{ version: number }>(page, "/api/bff/store/theme")).body;
    await api(page, "/api/bff/store/theme", {
      method: "PATCH",
      json: { ...Object.fromEntries(["theme_preset", "primary_color", "secondary_color", "background_color", "text_color", "card_border_color", "heading_font", "body_font", "design_style"].map((k) => [k, t[k]])), version: current.version },
    });
    await api(page, "/api/bff/admin/sections/reorder", { method: "POST", json: { ordered_ids: origSections.map((s) => s.id) } });
    const restored = (await api<{ primary_color: string }>(page, "/api/v1/config/")).body;
    check(restored.primary_color.toUpperCase() === String(t.primary_color).toUpperCase(), "noor restored to its original theme and order");
  }

  await browser.close();
  if (consoleErrors.length) {
    console.log("\nConsole errors:");
    for (const e of consoleErrors) console.log(`  ${e}`);
  }
  const total = failures.length;
  console.log(`\n${total === 0 && consoleErrors.length === 0 ? "ALL GREEN" : `${total} failed, ${consoleErrors.length} console errors`}`);
  process.exit(total === 0 && consoleErrors.length === 0 ? 0 : 1);
}

void main();
