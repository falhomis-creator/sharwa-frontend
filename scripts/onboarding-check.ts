/**
 * Functional + visual check for M02 (onboarding wizard) — the parts a static screenshot
 * cannot prove (constitution IV, M02 §3, FR-02.01–10, T067).
 *
 *   npx tsx scripts/onboarding-check.ts [port]          (default 3000, mocks on)
 *
 * Desktop, timed end to end (≤ 60s, T067):
 *   /register?store_name=… → local + live subdomain checks → consent gate → OTP (wrong
 *   code, then the right one, auto-submitted) → wait panel → ready → the store's own
 *   setup-password screen → the new store's dashboard.
 * Mobile: a second registration for the 429 lockout and the expired-TTL state
 * (Playwright clock), captured on 390px.
 *
 * Screenshots → docs/visual-checks/02-onboarding/. Exit 1 on any failed assertion or
 * unexpected console error.
 */
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] ?? "3000";
const BASE = `http://localhost:${PORT}`;
const OUT = join(process.cwd(), "docs", "visual-checks", "02-onboarding");
const OTP_CODE = "123456"; // MOCK_OTP_CODE — src/mocks/dashboard/auth.ts
const MERCHANT_PASSWORD = "sharwa-local-demo";
const FLOW_BUDGET_MS = 60_000;

mkdirSync(OUT, { recursive: true });

function fallbackChromium(): string | undefined {
  const override = process.env.SHARWA_CHROMIUM;
  if (override && existsSync(override)) return override;
  const cache =
    process.env.PLAYWRIGHT_BROWSERS_PATH ??
    join(process.env.LOCALAPPDATA ?? join(process.env.HOME ?? "", "AppData", "Local"), "ms-playwright");
  if (!existsSync(cache)) return undefined;
  const dirs = readdirSync(cache)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  for (const d of dirs) {
    for (const sub of ["chrome-win64", "chrome-win", "chrome-linux", "chrome-mac"]) {
      const exe = join(cache, d, sub, process.platform === "win32" ? "chrome.exe" : "chrome");
      if (existsSync(exe)) return exe;
    }
  }
  return undefined;
}

async function launch(): Promise<Browser> {
  try {
    return await chromium.launch();
  } catch (err) {
    const exe = fallbackChromium();
    if (!exe) throw err;
    return chromium.launch({ executablePath: exe });
  }
}

const failures: string[] = [];
function check(ok: boolean, label: string, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(`${label}${detail ? `: ${detail}` : ""}`);
}

/** Console errors, minus the statuses a step provokes on purpose (400 wrong code, 429). */
function watchConsole(page: Page, label: string, expected: number[] = []) {
  const issues: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (expected.some((s) => text.includes(`status of ${s}`))) return;
    if (msg.type() === "error" || (msg.type() === "warning" && /hydrat/i.test(text))) issues.push(text);
  });
  page.on("pageerror", (err) => issues.push(`pageerror: ${err.message}`));
  return () => check(issues.length === 0, `${label}: 0 console errors`, issues.slice(0, 3).join(" | "));
}

/** Every URL the browser shows must be free of the phone and the subdomain (FR-02.10). */
function watchUrls(page: Page, secrets: string[]) {
  const leaks: string[] = [];
  page.on("framenavigated", (frame) => {
    if (frame !== page.mainFrame()) return;
    const url = frame.url();
    // The store's own origin legitimately starts with its subdomain; only the path/query count.
    const { pathname, search } = new URL(url);
    if (secrets.some((s) => s && (pathname + search).includes(s))) leaks.push(url);
  });
  return () => check(leaks.length === 0, "FR-02.10 — لا هاتف ولا نطاق في أي رابط", leaks.join(" , "));
}

async function shot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
  console.log(`  · ${name}.png`);
}

async function fillDetails(page: Page, opts: { name: string; phone: string; subdomain: string }) {
  await page.fill("#store_name", opts.name);
  await page.fill("#merchant_phone", opts.phone);
  await page.fill("#subdomain", opts.subdomain);
  await page.locator("#subdomain-status", { hasText: "متاح" }).waitFor({ timeout: 5_000 });
}

async function desktopFlow(browser: Browser) {
  const context = await browser.newContext({ locale: "ar", viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const consoleDone = watchConsole(page, "desktop flow", [400]);
  const sub = `nour${Date.now().toString(36).slice(-5)}`;
  const phone = `0771${String(Date.now()).slice(-6)}`;
  const urlsDone = watchUrls(page, [phone, phone.slice(1), sub]);

  const checkRequests: string[] = [];
  const mockHeaders: Record<string, string | null> = {};
  page.on("request", (r) => {
    if (r.url().includes("/api/bff/public/check-subdomain")) checkRequests.push(r.url());
  });
  page.on("response", (r) => {
    const m = /\/api\/bff\/public\/(register(?:\/verify-otp)?|market-categories)$/.exec(new URL(r.url()).pathname);
    if (m) mockHeaders[m[1]!] = r.headers()["x-sharwa-mock"] ?? null;
  });

  // ── Panel 01 ─────────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/register?store_name=${encodeURIComponent("Nour Shop")}`, { waitUntil: "networkidle" });
  const started = Date.now();
  check((await page.inputValue("#store_name")) === "Nour Shop", "US-02.1 — الاسم مُعبَّأ من ?store_name=");
  check((await page.inputValue("#subdomain")) === "nourshop", "US-02.2.2 — اقتراح nourshop من «Nour Shop»");
  check(await page.locator("button[type=submit]").isDisabled(), "US-02.1 — الإرسال معطّل قبل اكتمال الحقول");
  const submitBox = await page.locator("button[type=submit]").boundingBox();
  check(Boolean(submitBox && submitBox.y + submitBox.height <= 900), "US-02.1 — النموذج كاملاً بلا تمرير على 1440×900");

  const before = checkRequests.length;
  await page.fill("#subdomain", "www");
  await page.locator("#subdomain-status", { hasText: "محجوز للنظام" }).waitFor({ timeout: 2_000 });
  await page.waitForTimeout(600);
  check(checkRequests.length === before, "US-02.2.3 — «www» محجوز محلياً بلا طلب شبكة");
  await page.fill("#subdomain", "My-Store");
  await page.locator("#subdomain-status", { hasText: "أحرف إنجليزية وأرقام فقط" }).waitFor({ timeout: 2_000 });
  check(true, "US-02.2 — «My-Store» → «أحرف إنجليزية وأرقام فقط»");

  await page.fill("#store_name", "ab");
  await page.locator("#merchant_phone").focus();
  await page.getByText("اسم المتجر من 3 إلى 100 حرف").waitFor({ timeout: 2_000 });
  check(true, "US-02.1.1 — «اسم المتجر من 3 إلى 100 حرف» عند مغادرة الحقل");
  await shot(page, "desktop-form-errors");

  await fillDetails(page, { name: "Nour Shop", phone, subdomain: sub });
  const hint = (await page.locator("#merchant_phone-hint").textContent()) ?? "";
  check(hint.includes(`967${phone.slice(1)}`), "US-02.1.2 — الرقم المطبَّع يظهر Mono", hint.trim());
  await page.getByRole("button", { name: "أزياء وملابس" }).click();
  await page.getByRole("button", { name: "هدايا" }).click();

  await page.locator("button[type=submit]").click();
  await page.getByText("يجب الموافقة على الشروط").waitFor({ timeout: 2_000 });
  const focused = await page.evaluate(() => document.activeElement?.id);
  check(focused === "agree_terms", "US-02.1.3 — بلا موافقة: التركيز على المربع + الرسالة", `focus=${focused}`);
  await shot(page, "desktop-form-filled");

  await page.locator("label[for=agree_terms]").click();
  await page.locator("button[type=submit]").click();

  // ── Panel 02 ─────────────────────────────────────────────────────────────────────
  await page.waitForURL(`${BASE}/register/verify`, { timeout: 10_000 });
  check(true, "FR-02.10 — الانتقال إلى /register/verify بلا معاملات");
  const cells = page.locator('input[aria-label^="الرقم"]');
  await cells.first().waitFor();
  check((await cells.count()) === 6, "US-02.3 — ست خانات");
  await shot(page, "desktop-otp");

  await cells.first().focus();
  await page.keyboard.type("000000");
  await page.getByText("الرمز غير صحيح").waitFor({ timeout: 5_000 });
  check(true, "US-02.3 — رمز خاطئ → «الرمز غير صحيح» (إرسال آلي عند الرقم السادس)");

  await cells.first().focus();
  await page.evaluate((code) => {
    const target = document.activeElement as HTMLInputElement;
    const data = new DataTransfer();
    data.setData("text", code);
    target.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  }, OTP_CODE);
  await page.waitForURL(/\/register\/status\/st-/, { timeout: 10_000 });
  const otpAcceptedMs = Date.now() - started;
  check(true, "US-02.3.1 + §6 — لصق 6 أرقام يُوزَّع ويُرسل آلياً", `${(otpAcceptedMs / 1000).toFixed(1)}s`);

  const cookies = await context.cookies(BASE);
  const prov = cookies.find((c) => c.name === "sharwa_prov");
  check(Boolean(prov && prov.httpOnly && prov.domain === "localhost"), "M47 US-47.3.2 — كوكي sharwa_prov HttpOnly على <base> فقط");
  const stored = await page.evaluate(() => localStorage.getItem("sharwa.onboarding.status"));
  check(Boolean(stored && !stored.includes(phone.slice(1))), "FR-02.09 — الرمز في localStorage بلا رقم كامل");

  // ── Panel 03 ─────────────────────────────────────────────────────────────────────
  await page.getByRole("heading", { name: "جارٍ تجهيز متجرك Nour Shop" }).waitFor({ timeout: 5_000 });
  check(true, "FR-02.08 — «جارٍ تجهيز متجرك {store_name}»");
  await shot(page, "desktop-waiting");
  await page.getByRole("heading", { name: "تهانينا! تم إنشاء متجرك بنجاح" }).waitFor({ timeout: 25_000 });
  check(true, "US-02.4.1 — ready → «تهانينا! تم إنشاء متجرك بنجاح»");
  check(await page.getByRole("link", { name: "الدخول إلى لوحة التحكم" }).isVisible(), "US-02.4.1 — زر الدخول + عرض المتجر");
  await shot(page, "desktop-ready");
  check(
    (await page.evaluate(() => localStorage.getItem("sharwa.onboarding.status"))) === null,
    "FR-02.09 — حذف الرمز عند ready",
  );

  await page.waitForURL(new RegExp(`^http://${sub}\\.localhost:${PORT}/dashboard/setup-password\\?t=st-`), {
    timeout: 10_000,
  });
  check(true, "T066 — تحويل آلي إلى نطاق المتجر /dashboard/setup-password?t= مرة واحدة");
  const provAfter = (await context.cookies(BASE)).find((c) => c.name === "sharwa_prov");
  check(!provAfter, "sharwa_prov مُسحت بعد ready");

  // ── First entry (M03 screens) ───────────────────────────────────────────────────
  await page.fill("#new-password", MERCHANT_PASSWORD);
  await page.fill("#confirm-password", MERCHANT_PASSWORD);
  await page.getByRole("button", { name: "حفظ ومتابعة" }).click();
  await page.waitForURL(new RegExp(`^http://${sub}\\.localhost:${PORT}/dashboard/?$`), { timeout: 15_000 });
  await page.getByText("Nour Shop").first().waitFor({ timeout: 10_000 });
  const totalMs = Date.now() - started;
  check(totalMs <= FLOW_BUDGET_MS, "T067 — التدفق الكامل حتى لوحة المتجر الجديد ≤ 60 ثانية", `${(totalMs / 1000).toFixed(1)}s`);
  await shot(page, "desktop-dashboard-first-entry");

  check(
    Object.values(mockHeaders).length === 3 && Object.values(mockHeaders).every((v) => v === "1"),
    "x-sharwa-mock: 1 على market-categories و register و verify-otp",
    JSON.stringify(mockHeaders),
  );
  consoleDone();
  urlsDone();
  await context.close();
  return { otpAcceptedMs, totalMs };
}

async function register(page: Page, label: string) {
  const sub = `${label}${Date.now().toString(36).slice(-5)}`;
  await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
  await fillDetails(page, { name: "متجر الاختبار", phone: `0773${String(Date.now()).slice(-6)}`, subdomain: sub });
  await page.locator("label[for=agree_terms]").click();
  await page.locator("button[type=submit]").click();
  await page.waitForURL(`${BASE}/register/verify`, { timeout: 10_000 });
  await page.locator('input[aria-label^="الرقم"]').first().waitFor();
}

async function mobileStates(browser: Browser) {
  const context: BrowserContext = await browser.newContext({
    locale: "ar",
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const consoleDone = watchConsole(page, "mobile states", [400, 429]);
  await page.clock.install();

  await register(page, "mob");
  await shot(page, "mobile-otp");

  // Five wrong codes → 429 + Retry-After (US-02.3.3).
  const cells = page.locator('input[aria-label^="الرقم"]');
  for (let i = 0; i < 5; i++) {
    await cells.first().waitFor({ state: "visible" });
    await page.waitForFunction(() => !(document.querySelector('input[aria-label^="الرقم"]') as HTMLInputElement)?.disabled);
    await cells.first().focus();
    await page.keyboard.type("999999");
    await page.waitForTimeout(500);
  }
  await page.getByText("محاولات كثيرة، حاول بعد").first().waitFor({ timeout: 5_000 });
  check(await cells.first().isDisabled(), "US-02.3.3 — 429: رسالة + تعطيل الخانات للمدة");
  await shot(page, "mobile-otp-429");

  // TTL reaches 00:00 (US-02.3.2).
  await page.clock.fastForward("05:05");
  await page.getByText("انتهت صلاحية الرمز").waitFor({ timeout: 5_000 });
  const buttons = await page.locator("main button:visible").allTextContents();
  check(
    buttons.length === 1 && buttons[0]!.includes("إرسال رمز جديد"),
    "US-02.3.2 — عند 00:00: الخانات معطّلة و«إرسال رمز جديد» وحده",
    buttons.join(" | "),
  );
  await shot(page, "mobile-otp-expired");

  consoleDone();
  await context.close();
}

/** US-02.3.4 — the subdomain is taken between panel 01 and the code: back to 01, values kept. */
async function verifyRace(browser: Browser) {
  const sub = `race${Date.now().toString(36).slice(-5)}`;
  const tabs = [];
  for (const phone of [`0775${String(Date.now()).slice(-6)}`, `0776${String(Date.now()).slice(-6)}`]) {
    const context = await browser.newContext({ locale: "ar", viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
    await fillDetails(page, { name: "متجر السباق", phone, subdomain: sub });
    await page.locator("label[for=agree_terms]").click();
    await page.locator("button[type=submit]").click();
    await page.waitForURL(`${BASE}/register/verify`, { timeout: 10_000 });
    tabs.push({ context, page, phone });
  }
  const [first, second] = tabs as [(typeof tabs)[0], (typeof tabs)[0]];
  const done = watchConsole(second.page, "verify race", [400]);
  for (const tab of [first, second]) {
    await tab.page.locator('input[aria-label^="الرقم"]').first().focus();
    await tab.page.keyboard.type(OTP_CODE);
  }
  await first.page.waitForURL(/\/register\/status\//, { timeout: 10_000 });
  await second.page.waitForURL(`${BASE}/register`, { timeout: 10_000 });
  await second.page.locator("#subdomain-status", { hasText: "مستخدم بالفعل" }).waitFor({ timeout: 5_000 });
  const kept =
    (await second.page.inputValue("#store_name")) === "متجر السباق" &&
    (await second.page.inputValue("#merchant_phone")) === second.phone;
  check(kept, "US-02.3.4 — نطاق صار مستخدماً عند التحقق: عودة إلى 01 بالرسالة على الحقل والقيم محفوظة");
  check(
    await second.page.locator("button[type=submit]").isDisabled(),
    "M02 §8 — حكم الخادم يبقى نافذاً (الإرسال معطّل) حتى تعديل الحقل",
  );
  await shot(second.page, "desktop-form-server-error");
  done();
  for (const tab of tabs) await tab.context.close();
}

async function directVisit(browser: Browser) {
  const context = await browser.newContext({ locale: "ar", viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/register/verify`, { waitUntil: "networkidle" });
  await page.waitForURL(`${BASE}/register`, { timeout: 5_000 });
  check(true, "زيارة /register/verify مباشرة بلا جلسة → /register");
  await context.close();
}

async function main() {
  const browser = await launch();
  try {
    const timing = await desktopFlow(browser);
    await mobileStates(browser);
    await verifyRace(browser);
    await directVisit(browser);
    console.log(
      `\nTiming: OTP accepted after ${(timing.otpAcceptedMs / 1000).toFixed(1)}s, dashboard after ${(timing.totalMs / 1000).toFixed(1)}s`,
    );
  } finally {
    await browser.close();
  }
  if (failures.length) {
    console.error(`\n✗ ${failures.length} failure(s)`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("\n✓ onboarding check passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
