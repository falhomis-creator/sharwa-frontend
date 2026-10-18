/**
 * Functional check for Phase 5 — M35 customer wallets & loyalty points.
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/wallets-check.ts [port] [store]   (default 3000 noor)
 *
 * Mock state lives for the life of the dev server, and this check creates a wallet and
 * transactions; pass a fresh store slug (any slug seeds its own state) to rerun without a restart.
 *
 * What a screenshot cannot prove (M35 FR-35.02–35.10, SC-35.2/35.4/35.5):
 *   - search by the local phone form («0751…») matches the normalised number; `q`/`sort` in the URL;
 *   - a row opens the side sheet with the same detail (`?wallet=`);
 *   - creating a wallet for an existing phone → the server's 400 under the field + «فتح المحفظة الموجودة»;
 *     a fresh phone → redirect to the new wallet page;
 *   - a top-up updates the balance and prepends a ledger row carrying the balance after;
 *   - a negative adjustment needs a note and a second «تأكيد الخصم» press;
 *   - the same idempotency key submitted twice produces one transaction (replayed, not doubled);
 *   - the ledger's reason filter lives in the URL; a reference opens the order;
 *   - a cashier (no `customer_wallets` feature, no `customers.edit_profile`) sees the gate; the BFF refuses writes;
 *   - the points tab shows the read-only program and the points list links to wallet creation.
 * Exit 1 on a failed check or console error.
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync } from "node:fs";

const PORT = process.argv[2] ?? "3000";
const STORE = process.argv[3] ?? "noor";
const HOST = `${STORE}.localhost`;
const BASE = `http://${HOST}:${PORT}`;
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
    // The 400 and 403 below are provoked on purpose; the browser logs the failed resource.
    if (m.type() === "error" && !/status of (400|403)/.test(m.text())) consoleErrors.push(`[${tag}] ${m.text().slice(0, 240)}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`[${tag}] PAGEERROR ${e.message}`));
}

async function newPage(browser: Browser, session: "merchant" | "staff", width = 1440) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: "ar", isMobile: width < 768, hasTouch: width < 768 });
  await ctx.addCookies([{ name: "sharwa_mock_session", value: session, domain: HOST, path: "/" }]);
  const page = await ctx.newPage();
  watch(page, `${session}@${width}`);
  return page;
}

type Json = Record<string, unknown>;
async function bff(page: Page, path: string, init?: { method?: string; body?: Json; key?: string }): Promise<{ status: number; body: Json }> {
  return page.evaluate(
    async ({ path, init }) => {
      const res = await fetch(path, {
        method: init?.method ?? "GET",
        headers: { "content-type": "application/json", ...(init?.key ? { "idempotency-key": init.key } : {}) },
        body: init?.body ? JSON.stringify(init.body) : undefined,
      });
      return { status: res.status, body: (await res.json()) as Record<string, unknown> };
    },
    { path, init },
  );
}

async function main() {
  const browser = await launch();
  const page = await newPage(browser, "merchant");

  // ── list: search + sort in the URL ──────────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/customers/wallets`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=wallets-table] tbody tr");
  const totalRows = await page.locator("[data-testid=wallets-table] tbody tr").count();
  check(totalRows === 40, `list renders every seeded wallet (${totalRows})`);
  check(/\d,\d{3}\.00/.test(await page.locator("[data-testid=wallets-totals]").innerText()), "totals strip shows the pre-formatted balance sum");

  const first = (await bff(page, "/api/bff/customers/wallets?page_size=50&sort=balance")).body as { results: { id: number; customer_phone: string; customer_name: string; display_balance: string }[] };
  // A Yemeni number: the local form («07…») normalises back to the same +967 number.
  const target = first.results.find((w) => w.customer_phone.startsWith("967"))!;
  const localForm = "0" + target.customer_phone.slice(3);
  await page.fill("[data-testid=wallets-table] input[type=search], input[aria-label='بحث في المحافظ']", localForm);
  await page.waitForURL((u) => u.searchParams.get("q") === localForm, { timeout: 5_000 });
  await page.waitForFunction(() => document.querySelectorAll("[data-testid=wallets-table] tbody tr").length === 1, null, { timeout: 5_000 });
  check(true, "searching the local phone form narrows the list to the normalised match, q in the URL");

  await page.selectOption("[data-testid=wallets-sort]", "balance");
  await page.waitForURL((u) => u.searchParams.get("sort") === "balance");
  check(true, "sort selection lands in the URL");

  // ── sheet ───────────────────────────────────────────────────────────────────────
  await page.click("[data-testid=wallets-table] tbody tr [data-testid=wallet-open]");
  await page.waitForURL((u) => u.searchParams.get("wallet") === String(target.id));
  await page.waitForSelector("[data-testid=wallet-sheet] [data-testid=wallet-detail]");
  check(await page.locator("[data-testid=wallet-sheet]").getByText(target.customer_name).first().isVisible(), "a row opens the side sheet with the wallet detail (?wallet= in the URL)");
  await page.keyboard.press("Escape");
  await page.waitForURL((u) => !u.searchParams.has("wallet"));

  // ── new wallet: duplicate → 400 under the field; fresh → redirect ───────────────
  await page.goto(`${BASE}/dashboard/customers/wallets/new?phone=${localForm}`, { waitUntil: "networkidle" });
  check((await page.inputValue("#wallet-phone")) === localForm, "`?phone=` prefills the form");
  await page.click("[data-testid=create-wallet]");
  await page.waitForSelector("[data-testid=open-existing]");
  check((await page.locator("#wallet-phone-error, [id$=error]").first().innerText()).includes("توجد محفظة"), "duplicate phone: the server's 400 lands under the field");
  check((await page.getAttribute("[data-testid=open-existing]", "href"))?.includes("q=") === true, "«فتح المحفظة الموجودة» links to the list filtered by that phone");

  const freshPhone = `077${String(Date.now()).slice(-7)}`;
  await page.fill("#wallet-phone", freshPhone);
  await page.fill("#wallet-name", "عميل الفحص");
  await page.click("[data-testid=create-wallet]");
  await page.waitForURL(/\/dashboard\/customers\/wallets\/\d+$/);
  const newId = Number(page.url().split("/").pop());
  await page.waitForSelector("[data-testid=wallet-detail]");
  check(Number.isInteger(newId) && (await page.locator("[data-testid=wallet-detail]").innerText()).includes("عميل الفحص"), `a fresh phone creates the wallet and opens it (#${newId})`);

  // ── top-up: balance + ledger row with balance_after ─────────────────────────────
  await page.click("[data-testid=topup-open]");
  await page.waitForSelector("[data-testid=topup-form]");
  await page.fill("#topup-amount", "50");
  await page.selectOption("#topup-reason", "manual_topup");
  await page.fill("#topup-note", "رصيد ترحيبي");
  await page.click("[data-testid=topup-submit]");
  await page.waitForSelector("[data-testid=ledger-row]");
  const rows = page.locator("[data-testid=ledger-row]");
  check((await rows.count()) === 1 && (await rows.first().innerText()).includes("50.00"), "top-up prepends a ledger row with the balance after");
  check((await page.locator("[data-testid=wallet-detail]").innerText()).includes("50.00"), "the header balance updates after the top-up");

  // ── negative adjustment: note required, two-step confirm ────────────────────────
  await page.click("[data-testid=topup-open]");
  await page.waitForSelector("[data-testid=topup-form]");
  await page.fill("#topup-amount", "-20");
  await page.selectOption("#topup-reason", "adjustment");
  await page.click("[data-testid=topup-submit]");
  await page.waitForSelector("#topup-note-error, [data-testid=topup-form] [role=alert]");
  const noteErr = await page.locator("[data-testid=topup-form]").innerText();
  check(noteErr.includes("ملاحظة") && (await page.locator("[data-testid=topup-confirm]").count()) === 0, "a negative adjustment without a note is blocked client-side");
  await page.fill("#topup-note", "تصحيح");
  await page.click("[data-testid=topup-submit]");
  await page.waitForSelector("[data-testid=topup-confirm]");
  check((await page.locator("[data-testid=topup-submit]").innerText()).includes("تأكيد الخصم"), "a negative adjustment asks for a second «تأكيد الخصم» press");
  await page.click("[data-testid=topup-submit]");
  await page.waitForFunction(() => document.querySelectorAll("[data-testid=ledger-row]").length === 2);
  check((await rows.first().getAttribute("data-reason")) === "adjustment" && (await rows.first().innerText()).includes("30.00"), "the deduction lands in the ledger with the balance after (30.00)");

  // ── idempotency: same key twice → one transaction ───────────────────────────────
  const key = crypto.randomUUID();
  const a = await bff(page, `/api/bff/customers/wallets/${newId}/topup`, { method: "POST", key, body: { amount: "10.00", reason: "reward", idempotency_key: key } });
  const b = await bff(page, `/api/bff/customers/wallets/${newId}/topup`, { method: "POST", key, body: { amount: "10.00", reason: "reward", idempotency_key: key } });
  const tx = (await bff(page, `/api/bff/customers/wallets/${newId}/transactions`)).body as { count: number };
  check(a.status === 200 && b.status === 200 && (a.body as { transaction: { id: number } }).transaction.id === (b.body as { transaction: { id: number } }).transaction.id && tx.count === 3, "the same idempotency key twice replays one transaction (3 rows, not 4)");
  const over = await bff(page, `/api/bff/customers/wallets/${newId}/topup`, { method: "POST", body: { amount: "-999.00", reason: "adjustment", note: "x", idempotency_key: crypto.randomUUID() } });
  check(over.status === 400, "overdraft is refused with 400");

  // ── ledger reason filter in the URL + reference opens the order ─────────────────
  await page.goto(`${BASE}/dashboard/customers/wallets/${newId}`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=ledger-row]");
  await page.selectOption("[data-testid=ledger-reason]", "reward");
  await page.waitForURL((u) => u.searchParams.get("reason") === "reward");
  await page.waitForFunction(() => document.querySelectorAll("[data-testid=ledger-row]").length === 1);
  check((await rows.first().getAttribute("data-reason")) === "reward", "the ledger reason filter lives in the URL and narrows the rows");

  const paid = (await bff(page, "/api/bff/customers/wallets?page_size=50")).body as { results: { id: number }[] };
  const withOrder = paid.results.find((w) => w.id % 2 === 0 && w.id !== newId)!;
  await page.goto(`${BASE}/dashboard/customers/wallets/${withOrder.id}`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=ledger-ref]");
  await page.click("[data-testid=ledger-ref]");
  await page.waitForURL(/\/dashboard\/orders\?order=\d+/);
  check(true, "a ledger reference opens the order");

  // ── points tab + points list ────────────────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/customers/wallets/${withOrder.id}?tab=points`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=wallet-points]");
  check((await page.locator("[data-testid=wallet-points]").innerText()).includes("برنامج الولاء"), "the points tab shows the loyalty program summary");
  await page.goto(`${BASE}/dashboard/customers/points`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=points-table] tbody tr");
  check((await page.locator("[data-testid=points-table] tbody tr").count()) > 0 && (await page.locator("[data-testid=points-program]").innerText()).length > 0, "the points list renders with the program line");
  check((await page.locator("[data-testid=points-create-wallet]").count()) > 0, "customers with points but no wallet get an «إنشاء محفظة» link");

  // ── cashier: the «كاشير» fixture lacks the `customer_wallets` feature, so every wallet
  // screen resolves to the feature-off state; the BFF still refuses the write by permission.
  const staff = await newPage(browser, "staff");
  await staff.goto(`${BASE}/dashboard/customers/wallets`, { waitUntil: "networkidle" });
  check(await staff.locator("[data-testid=feature-off]").isVisible(), "a cashier without the feature sees the feature-off state on the list");
  await staff.goto(`${BASE}/dashboard/customers/wallets/new`, { waitUntil: "networkidle" });
  check((await staff.locator("[data-testid=feature-off], [data-testid=forbidden]").count()) > 0 && (await staff.locator("[data-testid=new-wallet-form]").count()) === 0, "a cashier never sees the new-wallet form");
  const staffPost = await bff(staff, "/api/bff/customers/wallets", { method: "POST", body: { customer_phone: "0770000001" } });
  check(staffPost.status === 403, "the BFF refuses a cashier's create with 403");
  const staffTopup = await bff(staff, `/api/bff/customers/wallets/${withOrder.id}/topup`, { method: "POST", body: { amount: "5.00", reason: "reward", idempotency_key: crypto.randomUUID() } });
  check(staffTopup.status === 403, "the BFF refuses a cashier's top-up with 403");

  await browser.close();
  if (consoleErrors.length) {
    console.log("\nconsole errors:");
    for (const e of consoleErrors) console.log("  " + e);
  }
  if (failures.length || consoleErrors.length) {
    console.log(`\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
    process.exit(1);
  }
  console.log("\n✓ M35 wallets functional check passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
