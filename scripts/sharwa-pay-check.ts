/**
 * Functional + visual check for Phase 7 T181–T183 — M40 «محفظة شروة» on the platform origin
 * (`localhost/sharwa-pay`).
 *
 *   - FR-40.01: a store origin gets 404 on `/api/bff/sharwa-pay/*`;
 *   - OTP (US-40.1): local number → international preview; wrong code → the server's
 *     sentence; an expired code → «إرسال رمز جديد»; the send limit → 429 + countdown, no limit
 *     revealed; the right code → the wallet on the same URL;
 *   - balances (US-40.2): four rows, always, exactly the server's strings, no total;
 *     transactions filtered by `?currency=` in the URL; a purchase names its store and order;
 *   - withdraw (US-40.4): over the balance refused locally (no request); a valid one is debited
 *     at once; the console's rejection reverses it (`withdrawal_reversal`) — ONE source;
 *   - top-up (US-40.3): a used transfer id → the server's error under the field; a new one →
 *     «قيد المراجعة», and approving it in the console credits this wallet;
 *   - PWA: manifest fields, `/sharwa-pay/sw.js` with `Service-Worker-Allowed`, and 0 entries in
 *     Cache Storage after browsing (SC-40.2); offline → «لا اتصال — لا نعرض رصيداً قديماً»;
 *   - logout clears the session; screenshots mobile / mobile-dark / tablet / desktop.
 *
 * Mutates the platform's Sharwa Pay rows (a new top-up, a withdrawal and their decisions).
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/sharwa-pay-check.ts [port]   (default 3000)
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] ?? "3000";
const BASE = `http://localhost:${PORT}`;
const CONSOLE = `http://console.localhost:${PORT}`;
const NOOR = `http://noor.localhost:${PORT}`;
const OUT = join(process.cwd(), "docs", "visual-checks", "40-sharwa-pay");
const PHONE_LOCAL = "0771234567";
const PHONE = "967771234567";
const failures: string[] = [];
const consoleErrors: string[] = [];
let offlineNow = false;

function check(ok: boolean, label: string) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures.push(label);
}

async function launch(): Promise<Browser> {
  const override = process.env.SHARWA_CHROMIUM;
  return chromium.launch(override && existsSync(override) ? { executablePath: override } : {});
}

async function page(browser: Browser, opts: { width?: number; dark?: boolean; admin?: boolean } = {}): Promise<Page> {
  const width = opts.width ?? 390;
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, locale: "ar", colorScheme: opts.dark ? "dark" : "light", isMobile: width < 768, hasTouch: width < 768 });
  if (opts.admin) await ctx.addCookies([{ name: "sharwa_mock_admin", value: "superuser", domain: "console.localhost", path: "/" }]);
  const p = await ctx.newPage();
  p.on("console", (m) => {
    // While the check holds the context offline, the no-cache service worker turns every request into ERR_FAILED — expected.
    if (m.type() === "error" && !/status of (400|401|403|404|409|429)|ERR_INTERNET_DISCONNECTED|Failed to fetch/.test(m.text()) && !(offlineNow && /ERR_FAILED/.test(m.text()))) consoleErrors.push(m.text().slice(0, 200));
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
      return { status: r.status, json: json as Record<string, unknown>, headers: Object.fromEntries(r.headers.entries()) };
    },
    { method, path, body },
  );
}

async function login(p: Page, phone: string) {
  await p.goto(`${BASE}/sharwa-pay`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=pay-login-phone]");
  await p.fill("[data-testid=pay-phone]", phone);
  await p.click("[data-testid=pay-send]");
  await p.waitForSelector("[data-testid=pay-login-code]");
}

async function typeCode(p: Page, code: string) {
  await p.locator("[data-testid=otp-digit]").first().click();
  await p.keyboard.type(code);
}

type Wallet = { balances: Array<{ currency: string; display_balance: string }> };

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await launch();

  // ── host isolation ───────────────────────────────────────────────────────────────
  const store = await page(browser);
  await store.goto(`${NOOR}/`, { waitUntil: "domcontentloaded" });
  check((await api(store, "GET", "/api/bff/sharwa-pay/wallet")).status === 404, "a store origin gets 404 on /api/bff/sharwa-pay/*");

  // ── OTP ──────────────────────────────────────────────────────────────────────────
  const p = await page(browser);
  await p.goto(`${BASE}/sharwa-pay`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=pay-login-phone]");
  await p.fill("[data-testid=pay-phone]", PHONE_LOCAL);
  check((await p.textContent("[data-testid=pay-phone-preview]"))?.includes("+967 771 234 567") === true, "a local number is previewed in its international form");
  await p.screenshot({ path: join(OUT, "mobile-phone.png") });
  await p.click("[data-testid=pay-send]");
  await p.waitForSelector("[data-testid=pay-login-code]");
  check((await p.textContent("[data-testid=otp-ttl]"))?.trim().startsWith("09:") === true || (await p.textContent("[data-testid=otp-ttl]"))?.trim() === "10:00", "the code's 10-minute life counts down");
  await typeCode(p, "111111");
  await p.waitForSelector("[data-testid=pay-error]");
  check((await p.textContent("[data-testid=pay-error]"))?.includes("غير صحيح") === true, "a wrong code → the server's sentence");
  await p.screenshot({ path: join(OUT, "mobile-otp.png") });
  await typeCode(p, "123456");
  await p.waitForSelector("[data-testid=pay-dashboard]");
  check(new URL(p.url()).pathname === "/sharwa-pay", "the right code opens the wallet on the same URL");

  const expired = await page(browser);
  await login(expired, "0770000600");
  await typeCode(expired, "123456");
  await expired.waitForSelector("[data-testid=pay-resend]");
  check((await expired.textContent("[data-testid=pay-error]"))?.includes("انتهت صلاحية الرمز") === true, "an expired code → the message and «إرسال رمز جديد»");

  const limited = await page(browser);
  await limited.goto(`${BASE}/sharwa-pay`, { waitUntil: "load" });
  for (let i = 0; i < 3; i++) await api(limited, "POST", "/api/bff/sharwa-pay/otp/send", { phone: "967771112299" });
  await limited.fill("[data-testid=pay-phone]", "967771112299");
  await limited.click("[data-testid=pay-send]");
  await limited.waitForSelector("[data-testid=pay-error]");
  const lockText = (await limited.textContent("[data-testid=pay-error]")) ?? "";
  check(lockText.includes("طلبات كثيرة") && /\d\d:\d\d/.test(lockText) && (await limited.isDisabled("[data-testid=pay-send]")) && !/3/.test(lockText.replace(/\d\d:\d\d/, "")), "the send limit → «طلبات كثيرة» + countdown, button disabled, limit not revealed");

  // ── balances + transactions ──────────────────────────────────────────────────────
  const w = (await api(p, "GET", "/api/bff/sharwa-pay/wallet")).json as unknown as Wallet;
  const rows = await p.locator("[data-testid=balance-row]").allTextContents();
  check(rows.length === 4 && w.balances.every((b, i) => rows[i]!.includes(b.display_balance)), "four balance rows, exactly the server's strings (zeros included)");
  check((await p.locator("text=/إجمالي|المجموع/").count()) === 0, "no converted «total» anywhere");
  await p.screenshot({ path: join(OUT, "mobile.png"), fullPage: true });
  await p.goto(`${BASE}/sharwa-pay/transactions?currency=SAR`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=tx-row]");
  const tx = (await api(p, "GET", "/api/bff/sharwa-pay/transactions?currency=SAR")).json as { count: number; results: Array<{ reason: string; source_store_name: string | null }> };
  check((await p.locator("[data-testid=tx-row]").count()) === Math.min(20, tx.count), "?currency=SAR in the URL filters the list");
  check((await p.locator("[data-testid=tx-row][data-reason=purchase] [data-testid=tx-store]").count()) > 0, "a purchase names its store");

  // ── withdraw ─────────────────────────────────────────────────────────────────────
  await p.goto(`${BASE}/sharwa-pay/withdraw`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=withdraw-form]");
  let posted = 0;
  p.on("request", (r) => {
    if (r.url().endsWith("/api/bff/sharwa-pay/withdrawals") && r.method() === "POST") posted += 1;
  });
  await p.fill("[data-testid=withdraw-amount]", "999999");
  await p.fill("[data-testid=withdraw-dest]", "جوالي — 770000011");
  await p.click("[data-testid=withdraw-submit]");
  await p.waitForSelector("[data-testid=err-amount]");
  check((await p.textContent("[data-testid=err-amount]"))?.includes("الرصيد غير كافٍ") === true && posted === 0, "over the balance → refused locally, nothing sent");
  await p.fill("[data-testid=withdraw-amount]", "5");
  await p.click("[data-testid=withdraw-submit]");
  await p.waitForSelector("[data-testid=withdraw-done]");
  const afterW = (await api(p, "GET", "/api/bff/sharwa-pay/wallet")).json as unknown as Wallet;
  check(afterW.balances[0]!.display_balance !== w.balances[0]!.display_balance, "a withdrawal is debited at once (server balance changed)");
  const reqs = (await api(p, "GET", "/api/bff/sharwa-pay/requests")).json as { withdrawals: Array<{ id: number; status: string }>; topups: Array<{ id: number; status: string; bank_transaction_id: string }> };
  const wd = reqs.withdrawals[0]!;

  // ── top-up ───────────────────────────────────────────────────────────────────────
  await p.goto(`${BASE}/sharwa-pay/topup`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=topup-form]");
  const receipt = { name: "receipt.png", mimeType: "image/png", buffer: Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da6364f8ff1f00030101006ad5c5a20000000049454e44ae426082", "hex") };
  await p.fill("[data-testid=topup-amount]", "20");
  await p.fill("[data-testid=topup-tx]", "TX880396");
  await p.setInputFiles("[data-testid=topup-receipt]", receipt);
  await p.click("[data-testid=topup-submit]");
  await p.waitForSelector("[data-testid=err-bank_transaction_id]");
  check((await p.textContent("[data-testid=err-bank_transaction_id]"))?.includes("مستخدم") === true, "a used transfer id → the server's error under the field");
  const txId = `TX-CHECK-${Date.now()}`;
  await p.fill("[data-testid=topup-tx]", txId);
  await p.click("[data-testid=topup-submit]");
  await p.waitForSelector("[data-testid=topup-done]");
  await p.goto(`${BASE}/sharwa-pay/requests`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=topup-row]");
  check((await p.locator("[data-testid=topup-row][data-status=pending]").first().textContent())?.includes("قيد المراجعة") === true, "the new top-up shows «قيد المراجعة»");

  // ── one source with the console (M20 US-20.5) ────────────────────────────────────
  const admin = await page(browser, { admin: true, width: 1440 });
  await admin.goto(`${CONSOLE}/`, { waitUntil: "domcontentloaded" });
  const pendingTopups = (await api(admin, "GET", "/api/bff/platform/sharwa-pay/topups?status=pending&page_size=100")).json as { results: Array<{ id: number; bank_transaction_id: string }> };
  const mine = pendingTopups.results.find((t) => t.bank_transaction_id === txId);
  check(Boolean(mine), "the customer's top-up is in the console's review queue");
  const before = (await api(p, "GET", "/api/bff/sharwa-pay/wallet")).json as unknown as Wallet;
  if (mine) await api(admin, "POST", `/api/bff/platform/sharwa-pay/topups/${mine.id}/approve`, {});
  await api(admin, "POST", `/api/bff/platform/sharwa-pay/withdrawals/${wd.id}/reject`, { note: "بيانات الحساب غير مكتملة." });
  const after = (await api(p, "GET", "/api/bff/sharwa-pay/wallet")).json as unknown as Wallet;
  check(after.balances[0]!.display_balance !== before.balances[0]!.display_balance, "approving in the console credits the customer's wallet");
  await p.goto(`${BASE}/sharwa-pay/requests`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=withdrawal-row]");
  check((await p.locator(`[data-testid=withdrawal-row][data-status=rejected]`).first().textContent())?.includes("مرفوض") === true, "the rejected withdrawal reads «مرفوض» with its reason");
  await p.screenshot({ path: join(OUT, "mobile-requests.png"), fullPage: true });
  await p.goto(`${BASE}/sharwa-pay/transactions`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=tx-row]");
  check((await p.locator("[data-testid=tx-row][data-reason=withdrawal_reversal]").count()) > 0, "…and its reversal appears as «استرجاع مبلغ سحب مرفوض»");

  // ── PWA (FR-40.06/07, SC-40.2) ───────────────────────────────────────────────────
  const manifest = (await api(p, "GET", "/sharwa-pay/manifest.webmanifest")).json as Record<string, unknown>;
  check(manifest.name === "محفظة شروة" && manifest.short_name === "محفظتي" && manifest.start_url === "/sharwa-pay/" && manifest.display === "standalone" && manifest.dir === "rtl" && manifest.lang === "ar", "manifest: name, short_name, start_url, standalone, rtl/ar");
  const sw = await api(p, "GET", "/sharwa-pay/sw.js");
  check(sw.headers["service-worker-allowed"] === "/sharwa-pay/" && /no-cache/.test(sw.headers["cache-control"] ?? "") && !/caches\.open|cache\.put/.test(String(sw.json)), "sw.js: scoped, no-cache, never opens a cache");
  await p.goto(`${BASE}/sharwa-pay`, { waitUntil: "load" });
  await p.waitForFunction(() => navigator.serviceWorker?.getRegistration("/sharwa-pay/").then((r) => Boolean(r)), null, { timeout: 10_000 }).catch(() => undefined);
  await p.goto(`${BASE}/sharwa-pay/transactions`, { waitUntil: "load" });
  const cached = await p.evaluate(async () => {
    const keys = await caches.keys();
    let n = 0;
    for (const k of keys) n += (await (await caches.open(k)).keys()).length;
    return n;
  });
  check(cached === 0, "0 entries in Cache Storage after browsing the wallet");
  offlineNow = true;
  await p.context().setOffline(true);
  await p.waitForSelector("[data-testid=pay-offline]");
  check((await p.locator("[data-testid=balance-row], [data-testid=tx-row]").count()) === 0, "offline: «لا اتصال — لا نعرض رصيداً قديماً», no number on screen");
  await p.screenshot({ path: join(OUT, "mobile-offline.png") });
  await p.context().setOffline(false);
  await p.waitForTimeout(500);
  offlineNow = false;

  // ── visual + logout ──────────────────────────────────────────────────────────────
  const dark = await page(browser, { dark: true });
  await login(dark, PHONE);
  await typeCode(dark, "123456");
  await dark.waitForSelector("[data-testid=pay-dashboard]");
  await dark.screenshot({ path: join(OUT, "mobile-dark.png"), fullPage: true });
  await dark.goto(`${BASE}/sharwa-pay/topup`, { waitUntil: "load" });
  await dark.waitForSelector("[data-testid=topup-form]");
  await dark.screenshot({ path: join(OUT, "mobile-dark-topup.png"), fullPage: true });
  for (const [width, name] of [
    [820, "tablet.png"],
    [1440, "desktop.png"],
  ] as const) {
    const v = await page(browser, { width });
    await login(v, PHONE);
    await typeCode(v, "123456");
    await v.waitForSelector("[data-testid=pay-dashboard]");
    check(await v.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${width}px: no horizontal scroll`);
    await v.screenshot({ path: join(OUT, name), fullPage: true });
  }
  check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "390px: no horizontal scroll");
  await p.goto(`${BASE}/sharwa-pay`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=pay-logout]");
  await p.click("[data-testid=pay-logout]");
  await p.waitForSelector("[data-testid=pay-login-phone]");
  check((await api(p, "GET", "/api/bff/sharwa-pay/wallet")).status === 401, "logout clears the session");
  check((await p.evaluate(() => Object.keys(localStorage).filter((k) => /pay|wallet|balance/i.test(k)).length)) === 0, "nothing financial in localStorage");

  await browser.close();
  console.log(consoleErrors.length ? `\nconsole errors:\n${consoleErrors.join("\n")}` : "\n0 console errors");
  const ok = failures.length === 0 && consoleErrors.length === 0;
  console.log(ok ? "\n✓ sharwa pay check passed" : `\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
