/**
 * Functional check for Phase 5 — M14 payments, payout accounts, merchant wallet, withdrawals, dues.
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/payments-check.ts [port]   (default 3000, store noor)
 *
 * Mock state lives for the life of the dev server; this check links «الكريمي», creates a
 * withdrawal and toggles switches (restoring them). A rerun skips the «غير مربوطة» half.
 *
 * What a screenshot cannot prove (M14 US-14.1–14.5, FR-14.01–08, SC-14.1/14.4/14.5):
 *   - the credential form is built from the server's descriptors; secrets are password /
 *     autocomplete=off with a show-while-typing toggle; required-field errors under the field;
 *   - after saving, NO secret value is in any BFF response or in the DOM — only «••••xxxx»;
 *     an empty PUT keeps the stored values (204);
 *   - `is_enabled` is disabled until credentials exist; turning it off asks «ستختفي البوابة…»;
 *   - the Sharwa Pay / manual switches save at once with a «تراجع» toast, and write the SAME
 *     row the M34 settings section reads; manual on + no active account → the warning + link;
 *   - payout accounts: `tab` in the URL, inactive rows «مخفي» and absent from the customer
 *     preview, keyboard drag → `POST reorder` persisted, delete of an account tied to a pending
 *     withdrawal → the server's 400 with «تعطيل بدلاً من الحذف»;
 *   - wallet: four rows, never a converted total, zero → withdraw disabled; the ledger's
 *     currency filter lives in the URL; order references link to the order; `W` opens a request;
 *   - withdrawal: amount > available blocked locally (no POST), pending warning, explicit confirm;
 *   - dues: totals strip from the server; «العمولات غير مفعّلة حالياً» when the flag is off;
 *   - a cashier gets ForbiddenState and the BFF answers 403.
 * Exit 1 on a failed check or console error.
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync } from "node:fs";

const PORT = process.argv[2] ?? "3000";
const HOST = "noor.localhost";
const BASE = `http://${HOST}:${PORT}`;
const failures: string[] = [];
const consoleErrors: string[] = [];
const SECRETS = ["sk_live_9c41b2e07f2a", "whsec_51d0aa93e6b4", "kurPass-SECRET-91ab", "kurApi-SECRET-77cd"];

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
    // The 400s and 403s below are provoked on purpose; the browser logs the failed resource.
    if (m.type() === "error" && !/status of (400|403|404)/.test(m.text())) consoleErrors.push(`[${tag}] ${m.text().slice(0, 240)}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`[${tag}] PAGEERROR ${e.message}`));
}

async function newPage(browser: Browser, session: "merchant" | "staff", host = HOST, width = 1440) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: "ar" });
  await ctx.addCookies([{ name: "sharwa_mock_session", value: session, domain: host, path: "/" }]);
  const page = await ctx.newPage();
  // The shared dev server compiles other modules at the same time; give navigation room.
  page.setDefaultNavigationTimeout(90_000);
  page.setDefaultTimeout(20_000);
  watch(page, `${session}@${host}`);
  return page;
}

type Json = Record<string, unknown>;
async function bff(page: Page, path: string, init?: { method?: string; body?: Json }): Promise<{ status: number; text: string; body: Json }> {
  return page.evaluate(
    async ({ path, init }) => {
      const res = await fetch(path, { method: init?.method ?? "GET", headers: { "content-type": "application/json" }, body: init?.body ? JSON.stringify(init.body) : undefined });
      const text = await res.text();
      let body: Record<string, unknown> = {};
      try {
        body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
      } catch {
        // not JSON
      }
      return { status: res.status, text, body };
    },
    { path, init },
  );
}

async function stateIs(page: Page, code: string, text: string, ms = 6000): Promise<boolean> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if ((await page.getByTestId(`gateway-state-${code}`).textContent())?.trim() === text) return true;
    await page.waitForTimeout(150);
  }
  return false;
}

const noSecret = (s: string) => !SECRETS.some((x) => s.includes(x));

async function main() {
  const browser = await launch();
  const page = await newPage(browser, "merchant");
  const responses: string[] = [];
  page.on("response", async (r) => {
    if (!r.url().includes("/api/bff/")) return;
    try {
      responses.push(await r.text());
    } catch {
      // body unavailable (redirect / 204)
    }
  });

  // ── gateways: descriptors, never a secret ───────────────────────────────────────
  await page.goto(`${BASE}/dashboard/payments`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=gateway-row]");
  const list = await bff(page, "/api/bff/payments/gateways");
  const gws = list.body as unknown as Array<{ gateway_code: string; has_credentials: boolean; is_enabled: boolean; fields: Array<{ name: string; is_secret: boolean; masked_hint: string | null; value: string | null }> }>;
  const jeeb = gws.find((g) => g.gateway_code === "jeeb")!;
  check(
    jeeb.has_credentials && jeeb.fields.filter((f) => f.is_secret).every((f) => f.value === null && /^••••.{4}$/.test(f.masked_hint ?? "")) && noSecret(list.text),
    "jeeb: secrets come back only as «••••xxxx» (value null, no secret substring)",
  );
  const kuraimiBefore = gws.find((g) => g.gateway_code === "kuraimi")!;
  const fresh = !kuraimiBefore.has_credentials;

  if (fresh) {
    check((await page.getByTestId("gateway-state-kuraimi").textContent())?.trim() === "غير مربوطة", "kuraimi without credentials reads «غير مربوطة»");
    check(await page.getByTestId("gateway-toggle-kuraimi").isDisabled(), "kuraimi `is_enabled` switch is disabled until credentials are saved");
  } else console.log("· rerun: kuraimi already linked — «غير مربوطة» checks skipped");

  await page.getByTestId("gateway-open-kuraimi").click();
  await page.waitForSelector("[data-testid=gateway-form][data-gateway=kuraimi]");
  check(new URL(page.url()).searchParams.get("gateway") === "kuraimi", "the form opens in the `?gateway=` side sheet");
  const inputs = page.locator("[data-testid=gateway-form] input[data-testid^=cred-]");
  const names = await inputs.evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")!.replace("cred-", "")));
  check(JSON.stringify(names) === JSON.stringify(kuraimiBefore.fields.map((f) => f.name)), `the form fields are exactly the server descriptors (${names.join(", ")})`);
  const secretAttrs = await page.locator("[data-testid=gateway-form] input[data-secret]").evaluateAll((els) => els.map((e) => `${e.getAttribute("type")}/${e.getAttribute("autocomplete")}`));
  check(secretAttrs.length === 2 && secretAttrs.every((a) => a === "password/off"), "secret inputs are type=password + autocomplete=off");

  if (fresh) {
    await page.getByTestId("gateway-save").click();
    check((await page.locator("#cred-password-error").textContent()) === "هذا الحقل مطلوب.", "an empty required secret → «هذا الحقل مطلوب.» under the field");
    await page.locator("#cred-merchant_code").fill("KRM-5521");
    await page.locator("#cred-username").fill("noor.store");
    await page.locator("#cred-password").fill(SECRETS[2]);
    await page.getByTestId("cred-reveal-password").click();
    check((await page.locator("#cred-password").getAttribute("type")) === "text", "the eye shows what is being typed");
    await page.locator("#cred-api_secret").fill(SECRETS[3]);
    check((await page.locator("#cred-password").getAttribute("type")) === "password", "leaving the field hides it again");
    await page.getByTestId("gateway-save").click();
    await page.waitForSelector("[data-testid=gateway-sheet]", { state: "detached", timeout: 20000 }).catch(() => undefined);
    check(await stateIs(page, "kuraimi", "مربوطة — معطّلة"), "after saving: «مربوطة — معطّلة»");
  } else {
    await page.keyboard.press("Escape");
  }
  const after = await bff(page, "/api/bff/payments/gateways");
  const k = (after.body as unknown as typeof gws).find((g) => g.gateway_code === "kuraimi")!;
  check(k.fields.find((f) => f.name === "password")?.masked_hint === "••••91ab" && noSecret(after.text), "kuraimi password is now «••••91ab» and the response holds no secret");
  check(noSecret(await page.content()), "SC-14.1: no secret value anywhere in the DOM after saving");

  // Reopen: placeholder + masks; empty PUT keeps everything.
  await page.getByTestId("gateway-open-kuraimi").click();
  await page.waitForSelector("[data-testid=gateway-form][data-gateway=kuraimi]");
  check(
    (await page.locator("#cred-password").getAttribute("placeholder")) === "اتركه فارغاً للإبقاء على القيمة الحالية" && (await page.getByTestId("cred-hint-password").textContent())?.includes("••••91ab") === true,
    "a linked secret reads «اتركه فارغاً…» with the server's mask as hint",
  );
  check((await page.locator("#cred-merchant_code").inputValue()) === "KRM-5521", "non-secret fields show their stored value");
  await page.keyboard.press("Escape");
  const keep = await bff(page, "/api/bff/payments/gateways/kuraimi/credentials", { method: "PUT", body: { merchant_code: "", username: "", password: "", api_secret: "" } });
  const k2 = ((await bff(page, "/api/bff/payments/gateways")).body as unknown as typeof gws).find((g) => g.gateway_code === "kuraimi")!;
  check(keep.status === 204 && k2.has_credentials && k2.fields.find((f) => f.name === "api_secret")?.masked_hint === "••••77cd", "PUT with empty fields → 204 and the stored values are kept");

  // Enable → disable with the confirm.
  await page.goto(`${BASE}/dashboard/payments`, { waitUntil: "networkidle" });
  if (k2.is_enabled) {
    await bff(page, "/api/bff/payments/gateways/kuraimi", { method: "PATCH", body: { is_enabled: false } });
    await page.reload({ waitUntil: "networkidle" });
  }
  await page.getByTestId("gateway-toggle-kuraimi").click();
  await page.locator("[data-sonner-toast]").getByRole("button", { name: "تراجع" }).first().waitFor({ timeout: 20000 });
  check(await stateIs(page, "kuraimi", "مربوطة — مفعّلة"), "enabling saves at once → «مربوطة — مفعّلة» with a «تراجع» toast");
  await page.waitForTimeout(400);
  await page.getByTestId("gateway-toggle-kuraimi").click();
  const confirm = page.getByTestId("gateway-disable-confirm");
  check((await confirm.textContent())?.includes("ستختفي البوابة من صفحة الدفع فوراً") === true, "turning a gateway off asks «ستختفي البوابة من صفحة الدفع فوراً»");
  await page.getByTestId("gateway-disable-ok").click();
  check(await stateIs(page, "kuraimi", "مربوطة — معطّلة"), "confirmed → «مربوطة — معطّلة»");

  // ── store switches share the M34 row; undo ──────────────────────────────────────
  const before = (await bff(page, "/api/bff/settings")).body.enable_sharwa_pay as boolean;
  await page.getByTestId("switch-sharwa-pay").click();
  await page.waitForTimeout(700);
  const mid = (await bff(page, "/api/bff/settings")).body.enable_sharwa_pay as boolean;
  await page.locator("[data-sonner-toast][data-front=true]").getByRole("button", { name: "تراجع" }).click();
  await page.waitForTimeout(800);
  const restored = (await bff(page, "/api/bff/settings")).body.enable_sharwa_pay as boolean;
  check(mid === !before && restored === before, "Sharwa Pay switch writes the M34 settings row at once, «تراجع» restores it");

  const accounts = (await bff(page, "/api/bff/payments/payout-accounts")).body.results as Array<{ id: number; is_active: boolean; account_type: string }>;
  const activeIds = accounts.filter((a) => a.is_active).map((a) => a.id);
  for (const id of activeIds) await bff(page, `/api/bff/payments/payout-accounts/${id}`, { method: "PATCH", body: { is_active: false } });
  await bff(page, "/api/bff/store/payments", { method: "PATCH", body: { enable_manual_payment: true } });
  await page.reload({ waitUntil: "networkidle" });
  const warn = page.getByTestId("manual-no-accounts");
  check((await warn.textContent())?.includes("أضف حساباً بنكياً أو محفظة ليراها العميل") === true && (await warn.locator("a").getAttribute("href")) === "/dashboard/payments/payout-accounts", "manual on + no active account → warning with a link");
  for (const id of activeIds) await bff(page, `/api/bff/payments/payout-accounts/${id}`, { method: "PATCH", body: { is_active: true } });

  // ── payout accounts ─────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/payments/payout-accounts?tab=wallet`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=account-row]");
  const rows = page.locator("[data-testid=account-row]");
  const inactive = await page.locator("[data-testid=account-row][data-active=false]").count();
  const previewIds = await page.locator("[data-testid=preview-row]").evaluateAll((els) => els.map((e) => e.getAttribute("data-id")));
  const activeRowIds = await page.locator("[data-testid=account-row][data-active=true]").evaluateAll((els) => els.map((e) => e.getAttribute("data-id")));
  check(
    (await page.getByTestId("accounts-tab-wallet").getAttribute("aria-selected")) === "true" && inactive > 0 && (await page.getByTestId("account-hidden").count()) === inactive && JSON.stringify(previewIds) === JSON.stringify(activeRowIds),
    "tab=wallet from the URL; inactive rows read «مخفي» and only active ones are in «كما يراها العميل»",
  );
  const order0 = await rows.evaluateAll((els) => els.map((e) => e.getAttribute("data-id")));
  await rows.first().getByTestId("account-drag").focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(150);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(150);
  await page.keyboard.press("Space");
  await page.waitForTimeout(900);
  const server = ((await bff(page, "/api/bff/payments/payout-accounts?account_type=wallet")).body.results as Array<{ id: number }>).map((a) => String(a.id));
  check(server[0] === order0[1] && server[1] === order0[0], "keyboard drag reorders and `POST reorder` persists the new order");

  await page.goto(`${BASE}/dashboard/payments/payout-accounts?tab=bank`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=account-row]");
  await page.locator("[data-testid=account-row][data-id='1']").getByTestId("account-delete").click();
  await page.getByTestId("account-delete-ok").click();
  const blocked = page.getByTestId("account-delete-blocked");
  await blocked.waitFor({ timeout: 20000 });
  check((await blocked.textContent())?.includes("عطّله") === true && (await page.getByTestId("account-deactivate").isVisible()), "deleting an account tied to a pending withdrawal → the server's 400 + «تعطيل بدلاً من الحذف»");
  await page.keyboard.press("Escape");

  // ── wallet ──────────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/wallet`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=balance-row]");
  const currencies = await page.locator("[data-testid=balance-row]").evaluateAll((els) => els.map((e) => e.getAttribute("data-currency")));
  const wallet = (await bff(page, "/api/bff/wallet")).body.balances as Array<{ currency: string; display_balance: string }>;
  const shown = await page.locator("[data-testid=balance-row]").allTextContents();
  check(JSON.stringify(currencies) === JSON.stringify(["SAR", "USD", "YER_OLD", "YER_NEW"]) && wallet.every((b, i) => shown[i]!.includes(b.display_balance)), "four currency rows, each the server's `display_balance` verbatim");
  check(!(await page.locator("main").textContent())?.includes("إجمالي"), "SC-14.4: no converted «إجمالي» across currencies");
  check((await page.locator("[data-testid=balance-row][data-currency=YER_NEW] [data-testid=balance-withdraw]").getAttribute("data-disabled")) === "true", "zero balance (YER_NEW) → withdraw disabled");
  await page.getByTestId("tx-currency").selectOption("USD");
  let txCurrencies: string[] = [];
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(200);
    txCurrencies = await page.locator("[data-testid=wallet-transactions] tbody tr td:nth-child(5)").allTextContents();
    if (txCurrencies.length > 0 && txCurrencies.every((c) => c.trim() === "USD")) break;
  }
  check(new URL(page.url()).searchParams.get("currency") === "USD" && txCurrencies.length > 0 && txCurrencies.every((c) => c.trim() === "USD"), "ledger currency filter lives in the URL (`currency=USD`) and applies");
  const ref = page.getByTestId("tx-ref-order").first();
  check(((await ref.getAttribute("href")) ?? "").startsWith("/dashboard/orders?order="), "an order reference links to `/dashboard/orders?order=`");
  await page.locator("h1").click();
  await page.keyboard.press("w");
  await page.waitForURL(/\/wallet\/withdrawals\/new/, { timeout: 20000 }).catch(() => undefined);
  check(page.url().includes("/dashboard/wallet/withdrawals/new"), "`W` on the wallet page opens «طلب سحب»");

  // ── withdrawal ──────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/wallet/withdrawals/new?currency=SAR`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=withdrawal-form]");
  check(await page.getByTestId("wd-pending-warning").isVisible(), "a pending SAR request → the reserved-amount warning");
  let posts = 0;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().includes("/api/bff/wallet/withdrawals")) posts += 1;
  });
  await page.getByTestId("wd-amount").fill("99999999.00");
  await page.getByTestId("wd-account").selectOption({ index: 1 });
  await page.getByTestId("wd-review").click();
  await page.waitForTimeout(300);
  check(((await page.locator("#wd-amount-error").textContent()) ?? "").includes("أكبر من المتاح") && posts === 0, "SC-14.5: amount > available is blocked locally (no POST)");
  await page.getByTestId("wd-amount").fill("120.50");
  await page.getByTestId("wd-review").click();
  await page.getByTestId("wd-confirm").waitFor();
  check(posts === 0, "an explicit confirm dialog comes before the POST");
  await page.getByTestId("wd-send").click();
  await page.waitForURL(/\/wallet\/withdrawals$/, { timeout: 25000 }).catch(() => undefined);
  await page.locator("[data-testid=withdrawals-table] tbody tr", { hasText: "120.50" }).first().waitFor({ timeout: 25000 });
  const firstRow = (await page.locator("[data-testid=withdrawals-table] tbody tr").first().textContent()) ?? "";
  check(posts === 1 && firstRow.includes("120.50") && firstRow.includes("قيد المراجعة"), `confirmed → one POST, the list shows the new request «قيد المراجعة» (posts=${posts})`);
  if (!firstRow.includes("120.50")) console.log("  first row:", firstRow);
  check((await page.getByTestId("withdrawal-reason").first().textContent())?.includes("لا يطابق") === true, "a rejected request shows its reason");

  // ── dues ────────────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/dashboard/wallet/dues`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-testid=dues-table] tbody tr");
  const dues = (await bff(page, "/api/bff/wallet/dues")).body as { totals: Record<string, string> };
  check((await page.getByTestId("dues-total-pending").textContent())?.includes(dues.totals.pending!) === true, "dues totals strip shows the server's per-status totals");
  await page.getByTestId("dues-tab-app_charge").click();
  await page.waitForTimeout(600);
  check(new URL(page.url()).searchParams.get("kind") === "app_charge", "dues tab lives in the URL (`kind=app_charge`)");
  const shop = await newPage(browser, "merchant", "shop.localhost");
  await shop.goto(`http://shop.localhost:${PORT}/dashboard/wallet/dues`, { waitUntil: "networkidle" });
  check((await shop.getByTestId("commission-off").textContent())?.includes("العمولات غير مفعّلة حالياً") === true, "commission flag off → «العمولات غير مفعّلة حالياً» instead of an empty table");

  // ── staff ───────────────────────────────────────────────────────────────────────
  const staff = await newPage(browser, "staff");
  await staff.goto(`${BASE}/dashboard/payments`, { waitUntil: "networkidle" });
  const api = await bff(staff, "/api/bff/wallet");
  check((await staff.getByTestId("forbidden").count()) === 1 && api.status === 403, "a cashier sees ForbiddenState and the BFF answers 403");

  check(responses.length > 0 && responses.every(noSecret), `SC-14.1: none of ${responses.length} BFF responses carried a secret value`);

  await browser.close();
  if (consoleErrors.length) {
    console.log("\nconsole errors:");
    for (const e of consoleErrors) console.log("  " + e);
  }
  const ok = failures.length === 0 && consoleErrors.length === 0;
  console.log(ok ? "\n✓ payments check passed" : `\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
