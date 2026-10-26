/**
 * Functional + visual check for Phase 7 T162 — M29 dropshipping & supplier feeds:
 *   - plan gate (`dropshipping` via the console override, restored at the end);
 *   - hub: four supplier ROWS, attention counter = held + rejected + failed orders;
 *   - connect makhazen with the credential fields Django's registry declares (never shown back);
 *     `hide_when_out_of_stock` hint; webhook rotation shows `/webhooks/suppliers/<code>/<token>/` + its secret once;
 *   - pricing rule 30% + `end_99` → the server's simulation, «after» prices end in .99;
 *     apply previews the affected count then reports;
 *   - supplier catalog: bulk import → `importing`, settles to `imported` with a product link;
 *   - feed wizard: a `.pdf` is refused locally; a CSV with 5 columns, 3 auto-mapped plus the
 *     missing required one chosen → preview of the converted rows with an error count →
 *     approve → run → errors CSV; an uploaded file has no repeat schedule (links only); the step lives in
 *     the URL; a column used twice is refused;
 *   - supplier orders: the attention group on top with the server's reason; resubmit;
 *     tracking numbers Mono.
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/dropshipping-check.ts [port]   (default 3000)
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] ?? "3000";
const NOOR = `http://noor.localhost:${PORT}`;
const CONSOLE = `http://console.localhost:${PORT}`;
const OUT = join(process.cwd(), "docs", "visual-checks", "29-dropshipping");
const ROOT = "/dashboard/channels/dropshipping";
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

async function page(browser: Browser, opts: { admin?: boolean; width?: number; dark?: boolean } = {}): Promise<Page> {
  const width = opts.width ?? 1440;
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, locale: "ar", colorScheme: opts.dark ? "dark" : "light", isMobile: width < 768, hasTouch: width < 768, permissions: ["clipboard-read", "clipboard-write"] });
  if (opts.admin) await ctx.addCookies([{ name: "sharwa_mock_admin", value: "superuser", domain: "console.localhost", path: "/" }]);
  else await ctx.addCookies([{ name: "sharwa_mock_session", value: "merchant", domain: "noor.localhost", path: "/" }]);
  const p = await ctx.newPage();
  p.on("console", (m) => {
    if (m.type() === "error" && !/status of (400|401|403|404|409)/.test(m.text())) consoleErrors.push(`${p.url()} :: ${m.text().slice(0, 1500)}`);
  });
  p.on("pageerror", (e) => consoleErrors.push(`PAGEERROR ${e.message}`));
  return p;
}

async function api(p: Page, method: string, path: string, body?: unknown) {
  return p.evaluate(
    async ({ method, path, body }) => {
      const r = await fetch(path, { method, headers: { accept: "application/json", ...(body !== undefined ? { "content-type": "application/json" } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
      const text = await r.text();
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
      return { status: r.status, json: json as Record<string, unknown>, type: r.headers.get("content-type") ?? "" };
    },
    { method, path, body },
  );
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  const admin = await page(browser, { admin: true });
  await admin.goto(`${CONSOLE}/`, { waitUntil: "domcontentloaded" });
  const override = (on: boolean | null) => api(admin, "POST", "/api/bff/platform/feature-overrides/bulk", { feature_code: "dropshipping", schema_names: ["noor"], is_enabled: on, notes: on ? "phase7 dropshipping check" : "" });

  try {
    await override(false);
    const p = await page(browser);
    await p.goto(`${NOOR}${ROOT}`, { waitUntil: "load" });
    check((await p.textContent("main"))?.includes("غير متاحة في خطتك") === true, "feature off → the plan state");
    check((await api(p, "GET", "/api/bff/dropshipping/suppliers")).status === 403, "feature off → the BFF answers 403");
    await override(true);
    await p.reload({ waitUntil: "load" });

    // ── hub (FR-29.02) ────────────────────────────────────────────────────────────
    await p.waitForSelector("[data-testid=supplier-row]");
    check((await p.locator("[data-testid=supplier-row]").count()) === 4, "four supplier rows");
    const orders = (await api(p, "GET", "/api/bff/dropshipping/orders?attention=1&page_size=100")).json as { count: number };
    check((await p.textContent("[data-testid=attention-count]"))?.trim() === String(orders.count), "the attention counter = held + rejected + failed");
    await p.screenshot({ path: join(OUT, "hub-desktop.png") });

    // ── connect + settings + webhook (US-29.1) ───────────────────────────────────
    await p.goto(`${NOOR}${ROOT}/suppliers/makhazen`, { waitUntil: "load" });
    await p.waitForSelector("[data-testid=connect-form], [data-testid=sync-settings]");
    if (await p.locator("[data-testid=connect-form]").count()) {
      check((await p.locator("[data-testid=connect-form] input").count()) === 1, "makhazen asks for one API token (Django's credential_fields)");
      await p.fill("[data-testid=connect-key]", "MKZ-SECRET-0123456789");
      await p.click("[data-testid=connect-save]");
    }
    await p.waitForSelector("[data-testid=sync-settings]");
    check(!(await p.textContent("main"))?.includes("0123456789"), "connected, and the secret is not shown again");
    await p.click("[data-testid=hide-oos]");
    await p.waitForSelector("[data-testid=hide-oos-hint]");
    check(true, "`hide_when_out_of_stock` shows its hint");
    await p.click("[data-testid=webhook-rotate]");
    await p.click("[data-testid=webhook-rotate-confirm]");
    await p.waitForSelector("[data-testid=webhook-url]");
    check(/\/webhooks\/suppliers\/makhazen\/[0-9a-f]{32}\//.test((await p.textContent("[data-testid=webhook-url]")) ?? ""), "the rotated webhook URL is shown once");
    check((await p.locator("[data-testid=webhook-secret]").count()) === 1, "…with its signing secret");
    await p.screenshot({ path: join(OUT, "supplier-settings-desktop.png"), fullPage: true });
    await p.reload({ waitUntil: "load" });
    await p.waitForSelector("[data-testid=sync-settings]");
    check((await p.locator("[data-testid=webhook-url]").count()) === 0, "…and not after a reload");
    await api(p, "POST", "/api/bff/dropshipping/suppliers/makhazen/disconnect");

    // ── pricing rules (US-29.2) ───────────────────────────────────────────────────
    await p.goto(`${NOOR}${ROOT}/pricing-rules`, { waitUntil: "load" });
    await p.click("[data-testid=new-rule]");
    await p.waitForSelector("[data-testid=rule-form]");
    await p.locator("[data-testid=rule-form] input").first().fill("فحص 30%");
    await p.fill("[data-testid=rule-markup]", "30");
    await p.selectOption("[data-testid=rule-rounding]", "end_99");
    await p.click("[data-testid=rule-simulate]");
    await p.waitForSelector("[data-testid=simulation] tbody tr");
    const after = await p.locator("[data-testid=simulation] tbody tr td:nth-child(4)").allTextContents();
    check(after.length > 0 && after.every((t) => /\.99\s/.test(t)), "simulation: «after» prices from the server end in .99");
    await p.screenshot({ path: join(OUT, "rule-simulation-desktop.png") });
    await p.click("[data-testid=rule-save]");
    await p.waitForSelector("text=أُنشئت القاعدة");
    await p.locator("[data-testid=rule-row]").filter({ hasText: "فحص 30%" }).locator("[data-testid=rule-apply]").click();
    await p.waitForSelector("[data-testid=rule-apply-confirm]:not([disabled])");
    check(/\d/.test((await p.textContent("[role=dialog]")) ?? ""), "apply previews the affected count");
    await p.click("[data-testid=rule-apply-confirm]");
    await p.waitForSelector("text=حُدِّثت أسعار");
    check(true, "apply reports what changed");
    const rules = (await api(p, "GET", "/api/bff/dropshipping/pricing-rules")).json as unknown as Array<{ id: number; name: string }>;
    for (const r of rules.filter((x) => x.name === "فحص 30%")) await api(p, "DELETE", `/api/bff/dropshipping/pricing-rules/${r.id}`);

    // ── catalog import (US-29.3) ──────────────────────────────────────────────────
    await p.goto(`${NOOR}${ROOT}/catalog/cj?import_status=not_imported`, { waitUntil: "load" });
    await p.waitForSelector("[data-testid=catalog-table] [data-testid=import-status]");
    const boxes = p.locator("[data-testid=catalog-table] tbody [aria-label='تحديد الصف']");
    await boxes.nth(0).click();
    await boxes.nth(1).click();
    await p.click("[data-testid=bulk-import]");
    await p.click("[data-testid=import-confirm]");
    await p.waitForSelector("text=بدأ استيراد");
    await p.goto(`${NOOR}${ROOT}/catalog/cj?import_status=importing`, { waitUntil: "load" });
    await p.waitForSelector("[data-testid=import-status][data-status=importing]");
    check(true, "imported rows turn `importing`");
    await p.waitForTimeout(8000);
    const settled = (await api(p, "GET", "/api/bff/dropshipping/suppliers/cj/catalog?import_status=importing")).json as { count: number };
    check(settled.count === 0, "…and settle once the job finishes");

    // ── feed wizard (US-29.4) ─────────────────────────────────────────────────────
    await p.goto(`${NOOR}${ROOT}/feeds/new`, { waitUntil: "load" });
    await p.setInputFiles("[data-testid=feed-file]", { name: "catalog.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
    check((await p.textContent("[data-testid=step-source]"))?.includes("امتداد غير مدعوم") === true, "a .pdf is refused locally with the allowed list");
    const csv = ["code,title,wholesale,qty_on_hand,notes", "A-1,منتج أ,10.50,4,x", "A-2,منتج ب,abc,2,y", ",منتج ج,7,1,z", "A-4,منتج د,3,9,w"].join("\n");
    await p.setInputFiles("[data-testid=feed-file]", { name: "supplier.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await p.click("[data-testid=source-next]");
    await p.waitForSelector("[data-testid=step-mapping]");
    check(new URL(p.url()).searchParams.get("step") === "2", "step 2 lives in the URL");
    check((await p.locator("[data-testid=mapping-next]").isDisabled()) === true, "«التالي» waits for the required fields");
    await p.selectOption("#map-stock", "code");
    check((await p.textContent("[data-testid=map-row][data-field=stock]"))?.includes("مستخدم في حقل آخر") === true, "a column used twice is refused locally");
    await p.selectOption("#map-stock", "qty_on_hand");
    await p.click("[data-testid=mapping-next]");
    await p.waitForSelector("[data-testid=preview-table] tbody tr");
    check((await p.locator("[data-testid=preview-table] tbody tr").count()) === 4, "preview shows the converted rows");
    check(Number((await p.textContent("[data-testid=preview-errors]"))?.trim()) === 2, "…with the server's error count (Mono)");
    await p.screenshot({ path: join(OUT, "feed-preview-desktop.png") });
    await p.click("[data-testid=preview-approve]");
    await p.waitForSelector("[data-testid=step-run]");
    await p.click("[data-testid=feed-run]");
    await p.waitForSelector("[data-testid=feed-errors-csv]", { timeout: 20_000 });
    const href = (await p.getAttribute("[data-testid=feed-errors-csv]", "href"))!;
    const dl = await api(p, "GET", href);
    check(dl.status === 200 && dl.type.includes("text/csv"), "after the run, the errors CSV downloads");
    check((await p.locator("[data-testid=feed-schedule]").count()) === 0 && (await p.locator("[data-testid=feed-schedule-file]").count()) === 1, "an uploaded file has no repeat schedule (links only)");
    check((await api(p, "PATCH", `/api/bff/dropshipping/feeds/${new URL(p.url()).searchParams.get("feed")}`, { schedule_interval: 720 })).status === 400, "…and the server refuses one");
    await p.screenshot({ path: join(OUT, "feed-run-desktop.png") });

    // ── supplier orders (US-29.5) ─────────────────────────────────────────────────
    await p.goto(`${NOOR}${ROOT}/orders`, { waitUntil: "load" });
    await p.waitForSelector("[data-testid=attention-row]");
    const attnStatuses = await p.locator("[data-testid=attention-row] [data-testid=supplier-order-status]").evaluateAll((els) => els.map((e) => e.getAttribute("data-status")));
    check(attnStatuses.every((s) => ["held", "rejected", "failed"].includes(s ?? "")), "the attention group holds held / rejected / failed only");
    check((await p.locator("[data-testid=tracking-number]").count()) > 0, "tracking numbers are shown (Mono)");
    await p.screenshot({ path: join(OUT, "orders-desktop.png"), fullPage: true });
    const resub = p.locator("[data-testid=resubmit]");
    if (await resub.count()) {
      await resub.first().click();
      await p.waitForSelector("text=أُعيد إرسال");
      check(true, "a held/failed order can be resubmitted");
    }

    // ── visual: mobile + dark ─────────────────────────────────────────────────────
    const mobile = await page(browser, { width: 390 });
    await mobile.goto(`${NOOR}${ROOT}/feeds/new`, { waitUntil: "load" });
    await mobile.waitForSelector("[data-testid=wizard-step-text]");
    check((await mobile.textContent("[data-testid=wizard-step-text]"))?.includes("من") === true, "mobile wizard: «1 من 4»");
    check(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "390px: no horizontal scroll");
    await mobile.screenshot({ path: join(OUT, "wizard-mobile.png"), fullPage: true });
    await mobile.goto(`${NOOR}${ROOT}`, { waitUntil: "load" });
    await mobile.waitForSelector("[data-testid=supplier-row]");
    await mobile.screenshot({ path: join(OUT, "hub-mobile.png"), fullPage: true });
    const dark = await page(browser, { dark: true });
    await dark.goto(`${NOOR}${ROOT}/orders`, { waitUntil: "load" });
    await dark.waitForSelector("[data-testid=attention-section]");
    await dark.screenshot({ path: join(OUT, "orders-desktop-dark.png") });
  } finally {
    await override(null);
  }

  await browser.close();
  console.log(consoleErrors.length ? `\nconsole errors:\n${consoleErrors.join("\n")}` : "\n0 console errors");
  const ok = failures.length === 0 && consoleErrors.length === 0;
  console.log(ok ? "\n✓ dropshipping check passed" : `\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
