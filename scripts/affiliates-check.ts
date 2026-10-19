/**
 * Functional + visual check for Phase 7 T147 — M17 affiliates & influencers:
 *   - one table, two tabs (two sidebar URLs); summary strip from the server; amounts verbatim;
 *   - the referral link is built from the store's REAL origin + `?aff_id=`, «نسخ» copies it;
 *   - sort and «لديه مستحقات فقط» live in the URL and match the server's answer;
 *   - `N` opens the sheet; create → detail with the link; a duplicate phone errors under the field;
 *   - settlement: select pending → the SERVER previews count/total → mark paid → no pending left;
 *   - influencers: linked coupon (SARA20 → «سارة المؤثرة»), the quiet «لا كوبون» notice;
 *   - staff: read-only (no «جديد», a write answers 403).
 * Writes go to `glow` so the `noor` screenshots stay stable.
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/affiliates-check.ts [port]   (default 3000)
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] ?? "3000";
const NOOR = `http://noor.localhost:${PORT}`;
const GLOW = `http://glow.localhost:${PORT}`;
const OUT = join(process.cwd(), "docs", "visual-checks", "17-affiliates");
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

async function page(browser: Browser, opts: { store: string; session?: "merchant" | "staff" | "manager"; width?: number; dark?: boolean }): Promise<Page> {
  const width = opts.width ?? 1440;
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, locale: "ar", colorScheme: opts.dark ? "dark" : "light", isMobile: width < 768, hasTouch: width < 768 });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: `http://${opts.store}.localhost:${PORT}` });
  await ctx.addCookies([{ name: "sharwa_mock_session", value: opts.session ?? "merchant", domain: `${opts.store}.localhost`, path: "/" }]);
  const p = await ctx.newPage();
  p.on("console", (m) => {
    if (m.type() === "error" && !/status of (400|401|403|404|409)/.test(m.text())) consoleErrors.push(m.text().slice(0, 200));
  });
  p.on("pageerror", (e) => consoleErrors.push(`PAGEERROR ${e.message}`));
  return p;
}

async function api(p: Page, method: string, path: string, body?: unknown) {
  return p.evaluate(
    async ({ method, path, body }) => {
      const csrf = document.cookie.match(/csrftoken=([^;]+)/)?.[1];
      const r = await fetch(path, { method, headers: { accept: "application/json", ...(csrf ? { "x-csrftoken": csrf } : {}), ...(body !== undefined ? { "content-type": "application/json" } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
      const text = await r.text();
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
      return { status: r.status, json: json as never };
    },
    { method, path, body },
  );
}

type Row = { id: number; name: string; phone?: string; referral_code: string; has_pending: boolean; display_pending: string; coupons?: Array<{ code: string }> };

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await launch();

  // ── list (US-17.3) ───────────────────────────────────────────────────────────────
  const owner = await page(browser, { store: "noor" });
  await owner.goto(`${NOOR}/dashboard/marketing/affiliates`, { waitUntil: "load" });
  await owner.waitForSelector("[data-testid=partners-table] tbody tr[data-row]");
  const list = (await api(owner, "GET", "/api/bff/affiliates")).json as Row[];
  check((await owner.locator("[data-testid=partners-table] tbody tr[data-row]").count()) === list.length, "every affiliate the server returns is a row");
  const summary = (await api(owner, "GET", "/api/bff/affiliates/summary/")).json as { display_pending_total: string };
  check((await owner.textContent("[data-testid=summary-pending]"))?.includes(summary.display_pending_total) === true, "summary strip shows the server's pending total verbatim");
  check((await owner.locator("[data-testid=partner-tabs] a").count()) === 2, "two tabs: affiliates · influencers");
  const firstPending = list[0]!.display_pending;
  check((await owner.locator("[data-testid=partners-table] tbody tr[data-row]").first().textContent())?.includes(firstPending) === true, "amounts are the server's strings");
  await owner.screenshot({ path: join(OUT, "desktop.png") });

  // ── copy the link (FR-17.03) ─────────────────────────────────────────────────────
  await owner.locator("[data-testid=copy-link]").first().click();
  const clip = await owner.evaluate(() => navigator.clipboard.readText());
  check(clip === `${NOOR}/?aff_id=${list[0]!.referral_code}`, "«نسخ» copies <store origin>/?aff_id=<code>");

  // ── sort + filter in the URL (SC-17.4) ───────────────────────────────────────────
  await owner.locator("th", { hasText: "المستحق" }).locator("button").click();
  await owner.waitForURL(/ordering=pending/);
  await owner.locator("th", { hasText: "المستحق" }).locator("button").click();
  await owner.waitForURL(/ordering=-pending/);
  await owner.locator("[data-testid=filter-has-pending]").check().catch(async () => {
    await owner.locator("button", { hasText: "الفلاتر" }).first().click();
    await owner.locator("[data-testid=filter-has-pending]").check();
  });
  await owner.waitForURL(/has_pending=true/);
  const sorted = (await api(owner, "GET", "/api/bff/affiliates?sort=-pending&has_pending=true")).json as Row[];
  await owner.waitForTimeout(400);
  const firstName = await owner.locator("[data-testid=partners-table] tbody tr[data-row]").first().locator("td").first().textContent();
  check(sorted.every((r) => r.has_pending) && firstName?.includes(sorted[0]!.name) === true, "«المستحق» descending + «لديه مستحقات فقط» reproduce the server's order");
  const shared = await page(browser, { store: "noor" });
  await shared.goto(owner.url(), { waitUntil: "load" });
  await shared.waitForSelector("[data-testid=partners-table] tbody tr[data-row]");
  check((await shared.locator("[data-testid=partners-table] tbody tr[data-row]").count()) === sorted.length, "the shared link gives the same rows in a new tab");

  // ── create via the sheet + duplicate phone (US-17.1) ─────────────────────────────
  const writer = await page(browser, { store: "glow" });
  await writer.goto(`${GLOW}/dashboard/marketing/affiliates`, { waitUntil: "load" });
  await writer.waitForSelector("[data-testid=partners-table] tbody tr[data-row]");
  const glowList = (await api(writer, "GET", "/api/bff/affiliates")).json as Row[];
  await writer.locator("body").click({ position: { x: 5, y: 400 } });
  await writer.keyboard.press("n");
  await writer.waitForSelector("[data-testid=partner-form]");
  check(true, "`N` opens the new-affiliate sheet");
  await writer.fill("[data-testid=partner-name]", "مسوّق الفحص");
  await writer.fill("[data-testid=partner-phone]", glowList[0]!.phone!);
  await writer.fill("[data-testid=commission-value]", "10");
  await writer.click("[data-testid=partner-save]");
  await writer.waitForSelector("#partner-phone-error");
  check((await writer.textContent("#partner-phone-error"))?.includes("مسجّل") === true, "a duplicate phone → the server's error under the field");
  const phone = `96777${String(Date.now()).slice(-7)}`;
  await writer.fill("[data-testid=partner-phone]", phone);
  await writer.click("[data-testid=partner-save]");
  await writer.waitForURL(/\/dashboard\/marketing\/affiliates\/\d+$/);
  await writer.waitForSelector("[data-testid=referral-link]");
  const link = await writer.inputValue("[data-testid=referral-link]");
  check(/^http:\/\/glow\.localhost:\d+\/\?aff_id=aff_[0-9a-f]{8}$/.test(link), "saved → detail with the full referral link");
  check((await writer.getAttribute("[data-testid=detail-whatsapp]", "href"))?.startsWith(`https://wa.me/${phone}`) === true, "«إرسال عبر واتساب» is a wa.me link to the phone");

  // ── settlement (US-17.4) ─────────────────────────────────────────────────────────
  const target = glowList.find((r) => r.has_pending)!;
  await writer.goto(`${GLOW}/dashboard/marketing/affiliates/${target.id}?payout=pending`, { waitUntil: "load" });
  await writer.waitForSelector("[data-testid=sales-table] tbody tr[data-row]");
  const pendingCount = await writer.locator("[data-testid=sales-table] tbody tr[data-row]").count();
  await writer.locator("[data-testid=sales-table] thead input[type=checkbox], [data-testid=sales-table] thead [role=checkbox]").first().click();
  await writer.click("[data-testid=mark-paid]");
  await writer.waitForSelector("[data-testid=settle-preview]");
  const preview = await writer.textContent("[data-testid=settle-preview]");
  const dry = (await api(writer, "POST", `/api/bff/affiliates/${target.id}/sales/mark-paid/`, { sale_ids: ((await api(writer, "GET", `/api/bff/affiliates/${target.id}/sales/?payout_status=pending`)).json as Array<{ id: number }>).map((s) => s.id), dry_run: true })).json as { updated: number; display_total: string };
  check(preview?.includes(String(pendingCount)) === true && preview?.includes(dry.display_total) === true, "the preview is the server's count and total");
  await writer.screenshot({ path: join(OUT, "detail-settle-preview.png") });
  await writer.click("[data-testid=settle-confirm]");
  await writer.waitForSelector("[data-testid=settle-dialog]", { state: "detached" });
  const after = (await api(writer, "GET", `/api/bff/affiliates/${target.id}/`)).json as Row;
  check(after.has_pending === false, "marked paid → nothing pending for that affiliate");

  // ── influencers (US-17.2) ────────────────────────────────────────────────────────
  await owner.goto(`${NOOR}/dashboard/marketing/influencers`, { waitUntil: "load" });
  await owner.waitForSelector("[data-testid=partners-table] tbody tr[data-row]");
  check((await owner.locator("[data-testid=partner-tabs] a[aria-current=page]").textContent()) === "المؤثرون", "the influencers URL opens the influencers tab");
  const infs = (await api(owner, "GET", "/api/bff/influencers")).json as Row[];
  const sara = infs.find((i) => i.coupons?.some((c) => c.code === "SARA20"));
  check(sara?.id === 7, "SARA20 (M13) belongs to «سارة المؤثرة» (#7) — one source");
  await owner.goto(`${NOOR}/dashboard/marketing/influencers/7`, { waitUntil: "load" });
  await owner.waitForSelector("[data-testid=influencer-coupons]");
  check((await owner.textContent("[data-testid=influencer-coupons]"))?.includes("SARA20") === true, "the detail lists the linked coupon");
  check((await owner.getAttribute("[data-testid=new-influencer-coupon]", "href")) === "/dashboard/marketing/coupons/new?influencer=7", "«إنشاء كوبون لهذا المؤثر» opens M13 with the influencer");
  const bare = infs.find((i) => !i.coupons?.length)!;
  await owner.goto(`${NOOR}/dashboard/marketing/influencers/${bare.id}`, { waitUntil: "load" });
  await owner.waitForSelector("[data-testid=no-coupon]");
  check(true, "an influencer without a coupon shows «لا كوبون مرتبط»");
  await owner.screenshot({ path: join(OUT, "influencer-detail.png") });

  // ── staff: read-only ─────────────────────────────────────────────────────────────
  const staff = await page(browser, { store: "noor", session: "manager" });
  await staff.goto(`${NOOR}/dashboard/marketing/affiliates`, { waitUntil: "load" });
  await staff.waitForSelector("[data-testid=partners-table] tbody tr[data-row]");
  check((await staff.locator("[data-testid=new-partner]").count()) === 0, "staff: no «مسوّق جديد»");
  check((await api(staff, "POST", "/api/bff/affiliates/", { name: "x", phone: "967770000999", commission_type: "percent", commission_value: "5" })).status === 403, "staff: a write answers 403");

  // ── visual: mobile + dark ────────────────────────────────────────────────────────
  const mobile = await page(browser, { store: "noor", width: 390 });
  await mobile.goto(`${NOOR}/dashboard/marketing/affiliates`, { waitUntil: "load" });
  await mobile.waitForSelector("[data-testid=partner-card]");
  check(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "390px: cards, no horizontal scroll");
  await mobile.screenshot({ path: join(OUT, "mobile.png"), fullPage: true });
  const tablet = await page(browser, { store: "noor", width: 820 });
  await tablet.goto(`${NOOR}/dashboard/marketing/affiliates`, { waitUntil: "load" });
  await tablet.waitForSelector("[data-testid=partners-table] tbody tr[data-row]");
  await tablet.screenshot({ path: join(OUT, "tablet.png") });
  const dark = await page(browser, { store: "noor", dark: true });
  await dark.goto(`${NOOR}/dashboard/marketing/affiliates`, { waitUntil: "load" });
  await dark.waitForSelector("[data-testid=partners-table] tbody tr[data-row]");
  await dark.screenshot({ path: join(OUT, "desktop-dark.png") });
  const empty = await page(browser, { store: "shop" });
  await empty.goto(`http://shop.localhost:${PORT}/dashboard/marketing/affiliates`, { waitUntil: "load" });
  await empty.waitForSelector("text=لا مسوّقين بعد").catch(() => undefined);
  await empty.screenshot({ path: join(OUT, "desktop-empty.png") });

  await browser.close();
  console.log(consoleErrors.length ? `\nconsole errors:\n${consoleErrors.join("\n")}` : "\n0 console errors");
  const ok = failures.length === 0 && consoleErrors.length === 0;
  console.log(ok ? "\n✓ affiliates check passed" : `\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
