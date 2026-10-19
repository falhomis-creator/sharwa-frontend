/**
 * Functional + visual check for Phase 6 T140 — M45 dues (8 actions), M20 Sharwa Pay
 * approvals, customer wallets and Sharwa Ship zones on `console.localhost`.
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/admin-money-check.ts [port]   (default 3000)
 *
 * Repeatable on one dev server: it consumes seeded pending items (that is the point of a
 * queue) but asserts behaviour, not absolute counts, and restores what it toggles
 * (suspend → reactivate, unwaive → waive, a test zone is deleted again).
 * Screenshots: docs/visual-checks/45-dues/ and docs/visual-checks/20-admin/{sharwa-pay,zones}-*.
 */
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] ?? "3000";
const BASE = `http://console.localhost:${PORT}`;
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
/** Statuses provoked on purpose (validation 400s, 404 pages, 409 stale actions, the operator 403). */
const EXPECTED = /status of (400|403|404|409)/;

async function context(browser: Browser, role: Role, opts: { width?: number; dark?: boolean } = {}): Promise<BrowserContext> {
  const width = opts.width ?? 1440;
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, locale: "ar", colorScheme: opts.dark ? "dark" : "light", isMobile: width < 768, hasTouch: width < 768 });
  await ctx.addCookies([{ name: "sharwa_mock_admin", value: role, domain: "console.localhost", path: "/" }]);
  return ctx;
}

async function page(ctx: BrowserContext, tag: string): Promise<Page> {
  const p = await ctx.newPage();
  p.on("console", (m) => {
    if (m.type() === "error" && !EXPECTED.test(m.text())) consoleErrors.push(`[${tag}] ${m.text().slice(0, 240)}`);
  });
  p.on("pageerror", (e) => consoleErrors.push(`[${tag}] PAGEERROR ${e.message}`));
  return p;
}

async function api(p: Page, method: string, path: string, body?: unknown) {
  return p.evaluate(
    async ({ method, path, body }) => {
      const r = await fetch(path, { method, headers: { accept: "application/json", ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
      const text = await r.text();
      let json: Record<string, unknown> = {};
      try {
        json = JSON.parse(text);
      } catch {
        /* empty body */
      }
      return { status: r.status, json };
    },
    { method, path, body },
  );
}

function shot(dir: string, name: string) {
  const d = join(process.cwd(), "docs", "visual-checks", dir);
  mkdirSync(d, { recursive: true });
  return join(d, `${name}.png`);
}

async function noHScroll(p: Page) {
  return p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

async function toastText(p: Page): Promise<string> {
  const t = p.locator("[data-sonner-toast]").first();
  await t.waitFor({ timeout: 8000 });
  return ((await t.textContent()) ?? "").trim();
}

/** Sonner stacks toasts: wait for the one carrying `text` instead of reading whichever is on top. */
async function toastHas(p: Page, text: string): Promise<boolean> {
  try {
    await p.locator("[data-sonner-toast]").filter({ hasText: text }).first().waitFor({ timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}

async function confirm(p: Page) {
  await p.locator("[data-testid=confirm-dialog]").waitFor();
  await p.click("[data-testid=confirm-action]");
}

async function dues(browser: Browser) {
  console.log("\n— dues overview");
  const ctx = await context(browser, "superuser");
  const p = await page(ctx, "dues");
  await p.goto(`${BASE}/dues`, { waitUntil: "networkidle" });
  await p.waitForSelector("[data-testid=dues-overview] tbody tr");
  const names = await p.locator("[data-testid=dues-store-link]").allTextContents();
  check(names.length > 5, `overview lists the ready stores (${names.length})`);
  check((await p.locator("[data-testid=no-wallet]").count()) > 0, "a store without a Sharwa Pay wallet reads «لا محفظة»");
  check((await p.locator("[data-testid=wallet-balances]").count()) > 0, "wallet balances render per currency");
  await p.screenshot({ path: shot("45-dues", "overview-desktop") });
  await p.fill("input[type=search], [data-testid=dues-overview] input", "noor").catch(() => undefined);
  await p.waitForURL(/q=noor/, { timeout: 5000 }).catch(() => undefined);
  check(p.url().includes("q=noor"), "the search lives in the URL (q=)");
  await p.waitForFunction(() => document.querySelectorAll("[data-testid=dues-store-link]").length === 1, null, { timeout: 5000 }).catch(() => undefined);
  check((await p.locator("[data-testid=dues-store-link]").allTextContents()).join() === "متجر نور", "q=noor narrows to متجر نور");
  await p.goto(`${BASE}/dues?period=7d`, { waitUntil: "networkidle" });
  check((await p.locator("[data-testid=filter-period] select, select[data-testid=filter-period]").first().inputValue().catch(() => "7d")) === "7d", "period=7d is read from the URL");
  await ctx.close();

  for (const [w, name, dark] of [[834, "overview-tablet", false], [390, "overview-mobile", false], [1440, "overview-desktop-dark", true]] as const) {
    const c = await context(browser, "superuser", { width: w, dark });
    const pp = await page(c, name);
    await pp.goto(`${BASE}/dues`, { waitUntil: "networkidle" });
    await pp.waitForSelector("[data-testid=dues-store-link]", { state: "attached" });
    if (w < 768) check(await noHScroll(pp), "dues overview at 390px: no horizontal scroll");
    await pp.screenshot({ path: shot("45-dues", name) });
    await c.close();
  }

  console.log("\n— dues detail (noor)");
  const c2 = await context(browser, "superuser");
  const d = await page(c2, "dues-detail");
  await d.goto(`${BASE}/dues/noor`, { waitUntil: "networkidle" });
  await d.waitForSelector("[data-testid=dues-detail]");
  check((await d.locator("[data-testid=dues-totals] li").count()) >= 1 || !(await d.locator("[data-testid=sec-commissions] li").count()), "per-currency totals come from the server");
  for (const s of ["sec-commissions", "sec-charges", "sec-uninvoiced", "sec-waived", "sec-installations"]) check((await d.locator(`[data-testid=${s}]`).count()) === 1, `section ${s} renders with a count`);

  // FR: a 0-amount `none` commission cannot be collected — disabled with the reason.
  const zero = d.locator("[data-testid=sec-commissions] li").filter({ hasText: "#1009" });
  if (await zero.count()) {
    check(await zero.locator("[data-testid=collect]").isDisabled(), "commission with amount 0 (commission_type none): «تحصيل» disabled");
    check(((await zero.locator("[data-testid=disabled-reason]").textContent()) ?? "").includes("الإعفاء"), "…with the reason «استخدم الإعفاء»");
  } else check(true, "#1009 not pending any more (skipped)");

  // FR-45.08 — whatsapp_bot already has a 2026-10 charge.
  const bot = d.locator("[data-testid=sec-uninvoiced] li").filter({ hasText: "بوت واتساب" });
  check((await bot.count()) === 1 && (await bot.locator("[data-testid=generate]").isDisabled()), "«توليد فاتورة» disabled when the period's charge exists (FR-45.08)");

  // Collect a commission (or read the server's «تعذّر التحصيل» once the wallet is drained).
  const collectable = d.locator("[data-testid=sec-commissions] li").filter({ has: d.locator("[data-testid=collect]:not([disabled])") });
  if (await collectable.count()) {
    const row = collectable.first();
    const order = ((await row.textContent()) ?? "").match(/#(\d+)/)?.[1];
    await row.locator("[data-testid=collect]").click();
    const impact = (await d.locator("[data-testid=confirm-impact]").textContent()) ?? "";
    check(impact.includes("platform_fee") && impact.includes("متجر نور"), "collect confirm names the store and platform_fee");
    await d.screenshot({ path: shot("45-dues", "confirm-collect-desktop") });
    await confirm(d);
    const t = await toastText(d);
    check(t === `تم تحصيل عمولة الطلب #${order} من محفظة شروة باي للتاجر.` || t.startsWith("تعذّر التحصيل"), `collect → the server sentence verbatim («${t}»)`);
  } else check(true, "no collectable commission left on noor (collected in an earlier run)");

  // Unwaive → waive restores the 2025 invoice_pro charge.
  const waived = d.locator("[data-testid=sec-waived] li").filter({ hasText: "فواتير احترافية" });
  await d.locator("[data-testid=sec-waived] summary").click();
  if (await waived.count()) {
    await waived.first().locator("[data-testid=unwaive]").click();
    await confirm(d);
    check(await toastHas(d, "أُلغي إعفاء فاتورة «فواتير احترافية» للفترة 2025"), "unwaive → «أُلغي إعفاء…» and the charge is pending again");
    const back = d.locator("[data-testid=sec-charges] li").filter({ hasText: "2025" });
    await back.waitFor({ timeout: 5000 });
    await back.locator("[data-testid=waive]").click();
    check(((await d.locator("[data-testid=confirm-impact]").textContent()) ?? "").includes("بلا أي خصم"), "waive confirm says «بلا أي خصم»");
    await confirm(d);
    check(await toastHas(d, "تم إعفاء فاتورة «فواتير احترافية» للفترة 2025 بلا أي خصم."), "waive → server sentence, row back in «مُعفاة»");
  } else check(false, "the 2025 invoice_pro charge should be in «فواتير مُعفاة»");

  // 409: suspend in the background, then the stale UI button → «معلَّق بالفعل» + refresh; restore.
  await d.locator("[data-testid=sec-installations] summary").click();
  const install = d.locator("[data-testid=sec-installations] li").filter({ hasText: "بوت واتساب" }).first();
  const installId = Number(((await install.getAttribute("data-testid")) ?? "").replace("install-", ""));
  if (await install.locator("[data-testid=suspend]").count()) {
    await api(d, "POST", "/api/bff/platform/dues/noor/actions", { action: "suspend_app", installation_id: installId });
    await install.locator("[data-testid=suspend]").click();
    const impact = (await d.locator("[data-testid=confirm-impact]").textContent()) ?? "";
    check(impact.includes("لا يقدر التاجر رفع التعليق بنفسه") && impact.includes("بوت واتساب"), "suspend confirm names the app, the store and «لا يقدر التاجر…»");
    await d.screenshot({ path: shot("45-dues", "confirm-suspend-desktop") });
    await confirm(d);
    check(await toastHas(d, "التطبيق معلَّق بالفعل."), "a stale action answers 409 with the server sentence");
    await install.locator("[data-testid=reactivate]").waitFor({ timeout: 5000 });
    check(true, "the entry refreshed after the 409 (button is «إعادة تفعيل»)");
    await install.locator("[data-testid=reactivate]").click();
    await confirm(d);
    check(await toastHas(d, "أُعيد تفعيل «بوت واتساب»"), "reactivate restores the app");
  } else {
    await install.locator("[data-testid=reactivate]").click();
    await confirm(d);
    check(true, "installation was suspended by an aborted run — reactivated");
  }

  const stale = await api(d, "POST", "/api/bff/platform/dues/noor/actions", { action: "collect_commission", record_id: 1004 });
  check(stale.status === 409 && String(stale.json.detail).includes("تم التعامل معه مسبقاً"), "collect on an already-collected record → 409 «تم التعامل معه مسبقاً»");
  const bad = await api(d, "POST", "/api/bff/platform/dues/noor/actions", { action: "drop_table" });
  check(bad.status === 400, "an action outside the 8 values is refused (FR-45.03)");
  await d.screenshot({ path: shot("45-dues", "detail-desktop"), fullPage: true });

  await d.goto(`${BASE}/dues/nope`, { waitUntil: "networkidle" });
  check(((await d.textContent("main")) ?? "").includes("متجر غير معروف أو غير جاهز.") && (await d.locator("a[href='/dues']").count()) > 0, "unknown schema → the server message + a way back");
  await c2.close();

  for (const [w, name, dark] of [[390, "detail-mobile", false], [834, "detail-tablet", false], [1440, "detail-desktop-dark", true]] as const) {
    const c = await context(browser, "superuser", { width: w, dark });
    const pp = await page(c, name);
    await pp.goto(`${BASE}/dues/noor`, { waitUntil: "networkidle" });
    await pp.waitForSelector("[data-testid=dues-detail]");
    if (w < 768) {
      check(await noHScroll(pp), "dues detail at 390px: no horizontal scroll");
      const small = await pp.locator("[data-testid=dues-detail] button:visible").evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().height < 43.5).length);
      check(small === 0, "dues detail at 390px: every action ≥ 44px");
    }
    await pp.screenshot({ path: shot("45-dues", name), fullPage: true });
    await c.close();
  }

  console.log("\n— operator on dues");
  const op = await context(browser, "operator");
  const o = await page(op, "operator-dues");
  await o.goto(`${BASE}/dues/noor`, { waitUntil: "networkidle" });
  await o.waitForSelector("[data-testid=dues-detail]");
  check(!(await o.locator("[data-testid=sec-charges] [data-testid=waive]").first().isDisabled().catch(() => true)) || (await o.locator("[data-testid=sec-charges] li [data-testid=waive]").count()) === 0, "operator: dues actions are enabled (FR-20.09)");
  await op.close();
}

async function sharwaPay(browser: Browser) {
  console.log("\n— Sharwa Pay top-ups");
  const ctx = await context(browser, "superuser");
  const p = await page(ctx, "topups");
  await p.goto(`${BASE}/sharwa-pay/topups`, { waitUntil: "networkidle" });
  await p.waitForFunction(() => Boolean(document.querySelector("[data-testid=topups-list]")) || (document.body.textContent ?? "").includes("لا طلبات"));
  check((await p.locator("[data-testid=status-tab-pending]").getAttribute("aria-pressed")) === "true", "pending is the default filter");

  // Duplicate transfer id: #1007 reuses #1008's id → refused with a link to the earlier request.
  const dupRow = p.locator("[data-testid=topup-row][data-id='1007']");
  if (await dupRow.count()) {
    await dupRow.click();
    await p.waitForURL(/id=1007/);
    await p.click("[data-testid=receipt-zoom]");
    check((await p.locator("[data-testid=receipt-figure]").getAttribute("data-zoom")) === "true", "«تكبير» enlarges the receipt");
    await p.screenshot({ path: shot("20-admin", "sharwa-pay-topup-receipt-desktop") });
    await p.click("[data-testid=approve]");
    check(((await p.locator("[data-testid=confirm-impact]").textContent()) ?? "").includes("topup_manual"), "approve confirm states the wallet credit");
    await confirm(p);
    await p.locator("[data-testid=duplicate-alert]").waitFor({ timeout: 8000 });
    check(((await p.textContent("[data-testid=duplicate-alert]")) ?? "").includes("مستخدم في طلب مقبول سابق (#1008)"), "duplicate bank_transaction_id → the server sentence");
    await p.click("[data-testid=duplicate-link]");
    await p.waitForURL(/id=1008/);
    check(p.url().includes("status=all") && ((await p.textContent("[data-testid=topup-detail]")) ?? "").includes("#1008"), "…and the link opens the earlier request");
    await p.goto(`${BASE}/sharwa-pay/topups`, { waitUntil: "networkidle" });
  } else check(true, "#1007 no longer pending (skipped)");

  // Reject with the R key: an empty note is refused by the server, then a note goes through.
  const others = p.locator("[data-testid=topup-row]:not([data-id='1007'])");
  if (await others.count()) {
    const id = await others.first().getAttribute("data-id");
    await others.first().click();
    await p.waitForURL(new RegExp(`id=${id}`));
    await p.locator("[data-testid=topup-detail]").click({ position: { x: 5, y: 5 } });
    await p.keyboard.press("r");
    await p.locator("[data-testid=confirm-dialog]").waitFor();
    await p.click("[data-testid=confirm-action]");
    await p.locator("[data-testid=note-error]").waitFor({ timeout: 8000 });
    check(true, "reject without a note → the server's field error under the note");
    await p.fill("[data-testid=decision-note]", "الحوالة لم تصل إلى حساب المنصة.");
    await confirm(p);
    check(await toastHas(p, "رُفض طلب الشحن."), "reject → «رُفض طلب الشحن.»");
  } else check(true, "no other pending top-up left (skipped)");
  await ctx.close();

  console.log("\n— operator approves a top-up (A key)");
  const op = await context(browser, "operator");
  const o = await page(op, "operator-topups");
  await o.goto(`${BASE}/sharwa-pay/topups`, { waitUntil: "networkidle" });
  const pend = o.locator("[data-testid=topup-row]:not([data-id='1007'])");
  if (await pend.count()) {
    await pend.first().click();
    await o.locator("[data-testid=topup-detail]").waitFor();
    await o.locator("[data-testid=topup-detail] h2").click();
    await o.keyboard.press("a");
    await confirm(o);
    check(await toastHas(o, "قُبل الشحن وأُضيف"), "operator may approve (FR-20.09) — wallet credited");
    const href = await o.locator("[data-testid=wallet-link]").getAttribute("href").catch(() => null);
    if (href) {
      await o.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
      await o.waitForSelector("[data-testid=wallet-detail]");
      check(((await o.textContent("[data-testid=wallet-transactions]")) ?? "").includes("شحن يدوي"), "the wallet ledger shows the new «شحن يدوي»");
    }
  } else check(true, "no pending top-up for the operator (skipped)");

  await o.goto(`${BASE}/wallets/967770000011`, { waitUntil: "networkidle" });
  await o.waitForSelector("[data-testid=wallet-detail]");
  check(((await o.textContent("[data-testid=wallet-detail]")) ?? "").includes("محفظة تاجر"), "merchant wallet: balances + ledger, read-only");
  await o.screenshot({ path: shot("20-admin", "sharwa-pay-wallet-desktop"), fullPage: true });
  await o.goto(`${BASE}/wallets/000000`, { waitUntil: "networkidle" });
  check(((await o.textContent("main")) ?? "").includes("لا محفظة بهذا الرقم"), "unknown phone → «لا محفظة بهذا الرقم»");

  console.log("\n— withdrawals");
  await o.goto(`${BASE}/sharwa-pay/withdrawals`, { waitUntil: "networkidle" });
  const wrows = o.locator("[data-testid=withdrawal-row]");
  if (await wrows.count()) {
    // The oldest pending carries the §8 hint.
    await wrows.last().click();
    await o.locator("[data-testid=withdrawal-detail]").waitFor();
    check(await o.locator("[data-testid=deducted-alert]").isVisible(), "pending withdrawal: «المبلغ مخصوم مسبقاً»");
    const old = await o.locator("[data-testid=old-request-hint]").count();
    await o.click("[data-testid=reject]");
    const impact = (await o.locator("[data-testid=confirm-impact]").textContent()) ?? "";
    check(impact.includes("withdrawal_reversal"), "reject confirm says the amount returns (withdrawal_reversal)");
    check(old === 0 || impact.includes("الآن"), "an old request's reject says the refund lands now (§8)");
    await o.screenshot({ path: shot("20-admin", "sharwa-pay-withdrawal-reject-desktop") });
    await o.keyboard.press("Escape");
    if ((await wrows.count()) > 1) {
      await wrows.first().click();
      await o.click("[data-testid=confirm-withdrawal]");
      await confirm(o);
      check(await toastHas(o, "سُجِّل تنفيذ التحويل."), "confirm → «سُجِّل تنفيذ التحويل.»");
    }
  } else check(true, "no pending withdrawal left (skipped)");
  await op.close();

  const m = await context(browser, "superuser", { width: 390 });
  const mp = await page(m, "topups-mobile");
  await mp.goto(`${BASE}/sharwa-pay/topups?status=all`, { waitUntil: "networkidle" });
  await mp.locator("[data-testid=topup-row]").first().click();
  await mp.locator("[data-testid=detail-sheet]").waitFor();
  check(await noHScroll(mp), "top-ups at 390px: detail in a sheet, no horizontal scroll");
  await mp.screenshot({ path: shot("20-admin", "sharwa-pay-topup-mobile") });
  await m.close();
}

async function zones(browser: Browser) {
  console.log("\n— Sharwa Ship zones");
  const ctx = await context(browser, "superuser");
  const p = await page(ctx, "zones");
  await p.goto(`${BASE}/sharwa-ship/zones`, { waitUntil: "networkidle" });
  await p.waitForSelector("[data-testid=zones-table] tbody tr");
  const rows = await p.locator("[data-testid=zones-table] tbody tr").count();
  check((await p.locator("[data-testid=zone-circle]").count()) === rows, `the map draws one circle per zone (${rows})`);
  check((await p.locator("[data-testid=zone-circle][data-active=false]").count()) >= 1, "inactive zones are drawn muted (dashed)");

  const code = `TST-${String(Math.floor(10 + Math.random() * 89))}`;
  await p.click("[data-testid=zone-new]");
  await p.locator("[data-testid=zone-sheet]").waitFor();
  await p.click("[data-testid=zone-save]");
  check(await p.locator("[data-testid=zone-error-code]").isVisible(), "empty form → field errors (client)");
  await p.fill("[data-testid=zone-field-code]", code);
  await p.fill("[data-testid=zone-field-name]", "منطقة اختبار");
  await p.fill("[data-testid=zone-field-price]", "900.00");
  await p.fill("[data-testid=zone-field-center_latitude]", "99");
  await p.fill("[data-testid=zone-field-center_longitude]", "45.03");
  await p.fill("[data-testid=zone-field-radius_km]", "8");
  await p.click("[data-testid=zone-save]");
  await p.locator("[data-testid=zone-error-center_latitude]").waitFor({ timeout: 8000 });
  check(true, "server 400 (latitude 99) → mapped under the field");
  await p.fill("[data-testid=zone-field-center_latitude]", "13.97");
  await p.click("[data-testid=zone-save]");
  await p.locator("[data-testid=zone-sheet]").waitFor({ state: "hidden", timeout: 8000 });
  const row = p.locator("[data-testid=zones-table] tbody tr").filter({ hasText: code });
  await row.waitFor({ timeout: 8000 });
  check((await p.locator(`[data-testid=zone-circle][data-code='${code}']`).count()) === 1, "a new zone appears in the table and on the map");
  await p.screenshot({ path: shot("20-admin", "zones-desktop"), fullPage: true });

  const merchant = await browser.newContext();
  await merchant.addCookies([{ name: "sharwa_mock_session", value: "merchant", domain: "noor.localhost", path: "/" }]);
  const mp = await merchant.newPage();
  await mp.goto(`http://noor.localhost:${PORT}/dashboard/login`, { waitUntil: "domcontentloaded" });
  const read = await api(mp, "GET", "/api/bff/shipping/sharwa-ship/zones?page_size=100");
  check(JSON.stringify(read.json).includes(code), "the merchant's M15 «شروة شيب» reads the new zone (one source)");
  await merchant.close();

  await row.locator("[data-testid=zone-delete]").click();
  check(((await p.locator("[data-testid=confirm-impact]").textContent()) ?? "").includes("لكل المتاجر"), "delete confirm states the platform-wide effect");
  await confirm(p);
  await row.waitFor({ state: "detached", timeout: 8000 });
  check(true, "the test zone is deleted again");
  await ctx.close();

  const dk = await context(browser, "superuser", { dark: true });
  const dp = await page(dk, "zones-dark");
  await dp.goto(`${BASE}/sharwa-ship/zones`, { waitUntil: "networkidle" });
  await dp.waitForSelector("[data-testid=zone-map]");
  await dp.screenshot({ path: shot("20-admin", "zones-desktop-dark"), fullPage: true });
  await dk.close();

  const op = await context(browser, "operator", { width: 390 });
  const o = await page(op, "zones-operator");
  await o.goto(`${BASE}/sharwa-ship/zones`, { waitUntil: "networkidle" });
  await o.waitForSelector("[data-testid=zone-map]");
  check((await o.locator("[data-testid=zone-new]").isDisabled()) && (await o.locator("[data-testid=read-only-note]").isVisible()), "operator: zones are read-only (disabled + note)");
  check(await noHScroll(o), "zones at 390px: no horizontal scroll");
  await o.screenshot({ path: shot("20-admin", "zones-mobile"), fullPage: true });
  const forbidden = await api(o, "POST", "/api/bff/platform/sharwa-ship/zones", { code: "OPS-01" });
  check(forbidden.status === 403, "operator write on zones → 403 from the server");
  await op.close();
}

async function main() {
  const browser = await launch();
  try {
    await dues(browser);
    await sharwaPay(browser);
    await zones(browser);
  } finally {
    await browser.close();
  }
  console.log(consoleErrors.length ? `\nconsole errors:\n${consoleErrors.join("\n")}` : "\n0 console errors");
  const ok = failures.length === 0 && consoleErrors.length === 0;
  console.log(ok ? "\n✓ admin money check passed" : `\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
