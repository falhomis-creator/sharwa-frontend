/**
 * Functional checks for M47 (tenant guard) and M03 (dashboard shell) — the parts a
 * screenshot cannot prove (constitution IV, SC-47.1/47.4/47.6, M03 §6).
 *
 *   npx tsx scripts/tenant-shell-check.ts [basePort]
 *
 * 1. Cache isolation: ten alternating loads of two stores, comparing the rendered store
 *    name each time (SC-47.1).
 * 2. No tenant identifier in any visible URL (SC-47.6).
 * 3. Provisioning `ready` → automatic redirect to the dashboard (SC-47.4, US-47.3.3).
 * 4. Session gate: `/dashboard` without a session lands on the login screen.
 * 5. Shortcuts: `[` collapses the sidebar, `?` opens the list, `Esc` closes it,
 *    `G O` navigates to the orders screen (M03 §6).
 */
import { chromium, type Browser } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] ?? "3100";
const SESSION_COOKIE = { name: "sharwa_mock_session", value: "merchant", path: "/" };

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

async function main() {
  const browser = await launch();
  const context = await browser.newContext({ locale: "ar", viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1 + 2 — ten alternating store loads in one browser process.
  const stores = [
    { slug: "noor", name: "متجر نور" },
    { slug: "shop", name: "سوق الحكمة" },
  ];
  let isolationOk = true;
  let urlLeak = "";
  for (let i = 0; i < 10; i++) {
    const store = stores[i % 2]!;
    await page.goto(`http://${store.slug}.localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
    const rendered = (await page.locator("[data-testid=store-name]").first().textContent())?.trim() ?? "";
    if (!rendered.includes(store.name)) {
      isolationOk = false;
      console.log(`   load ${i + 1}: expected «${store.name}», got «${rendered}»`);
    }
    if (/[?&]store=/.test(page.url())) urlLeak = page.url();
  }
  check(isolationOk, "SC-47.1 — لا تسرّب كاش بين متجرَين (10 تحميلات متناوبة)");
  check(urlLeak === "", "SC-47.6 — لا معرّف مستأجر في الرابط", urlLeak);

  // 3 — provisioning `ready` leaves for the dashboard on its own.
  await page.goto(`http://pending1.localhost:${PORT}/_tenant/provisioning?t=ready-demo`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 }).catch(() => undefined);
  check(/\/dashboard/.test(page.url()), "SC-47.4 — التحويل التلقائي بعد ready", page.url());

  // 4 — the session gate.
  await page.goto(`http://noor.localhost:${PORT}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/dashboard\/login/, { timeout: 15_000 }).catch(() => undefined);
  check(/\/dashboard\/login/.test(page.url()), "M03 FR-03.08 — بلا جلسة ← شاشة الدخول", page.url());

  // 5 — shortcuts, with a session.
  await context.addCookies([{ ...SESSION_COOKIE, domain: "noor.localhost" }]);
  await page.goto(`http://noor.localhost:${PORT}/dashboard`, { waitUntil: "networkidle" });

  const sidebar = page.locator("nav[aria-label='أقسام اللوحة']").first();
  const before = await sidebar.getAttribute("data-state");
  await page.keyboard.press("BracketLeft");
  await page.waitForTimeout(250);
  const after = await sidebar.getAttribute("data-state");
  check(before === "expanded" && after === "rail", "M03 §6 — [ يطوي الشريط", `${before} → ${after}`);
  await page.keyboard.press("BracketLeft");
  await page.waitForTimeout(250);

  await page.keyboard.press("Shift+Slash"); // "?"
  await page.waitForTimeout(300);
  const dialog = page.getByRole("dialog");
  check(await dialog.isVisible().catch(() => false), "M03 §6 — ? يفتح قائمة الاختصارات");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  check(!(await dialog.isVisible().catch(() => false)), "M03 §6 — Esc يغلق الطبقة");

  await page.keyboard.press("g");
  await page.keyboard.press("o");
  await page.waitForURL(/\/dashboard\/orders/, { timeout: 10_000 }).catch(() => undefined);
  check(/\/dashboard\/orders/.test(page.url()), "M03 §6 — G O يفتح الطلبات", page.url());

  await browser.close();

  if (failures.length > 0) {
    console.error(`\n✗ ${failures.length} failure(s)`);
    process.exit(1);
  }
  console.log("\n✓ tenant + shell functional checks passed");
}

void main();
