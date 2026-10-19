/**
 * Functional + visual check for Phase 7 T163–T165 — M30 app store, M31 Sharwa AI, M32
 * support sessions & tickets:
 *   - catalogue = the platform console's listed apps with this store's installation state;
 *   - a paid install shows the server's fee preview before confirming, then «مفعّل» + the
 *     `installed` event; deactivate asks first; a platform-suspended app disables control;
 *   - WhatsApp: usage filtered by status in the URL, the template editor refuses to drop a
 *     required variable and refreshes the server preview after saving;
 *   - Sharwa AI (when the platform lists it): status, settings, `ai_enabled=false` banner;
 *   - sessions: escalated first; a contended takeover answers 409 «استلمها … قبلك»; take
 *     over → reply → release; a member without `support.takeover_session` reads only;
 *   - tickets: counters strip, create (title required), status from the row, reopen confirm;
 *   - screenshots into docs/visual-checks/{30-apps,31-ai,32-support}/.
 * Restores the store's apps / support mock state at the end.
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/apps-support-check.ts [port]   (default 3000)
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] ?? "3000";
const NOOR = `http://noor.localhost:${PORT}`;
const DIR = (name: string) => join(process.cwd(), "docs", "visual-checks", name);
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

async function page(browser: Browser, opts: { session?: "merchant" | "staff" | "manager"; width?: number; dark?: boolean } = {}): Promise<Page> {
  const width = opts.width ?? 1440;
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, locale: "ar", colorScheme: opts.dark ? "dark" : "light", isMobile: width < 768, hasTouch: width < 768 });
  await ctx.addCookies([{ name: "sharwa_mock_session", value: opts.session ?? "merchant", domain: "noor.localhost", path: "/" }]);
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
      const r = await fetch(path, { method, headers: { accept: "application/json", ...(body !== undefined ? { "content-type": "application/json" } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
      const text = await r.text();
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
      return { status: r.status, json: json as Record<string, unknown> };
    },
    { method, path, body },
  );
}

async function main() {
  for (const d of ["30-apps", "31-ai", "32-support"]) mkdirSync(DIR(d), { recursive: true });
  const browser = await launch();
  const owner = await page(browser);
  await owner.goto(`${NOOR}/dashboard`, { waitUntil: "domcontentloaded" });
  await api(owner, "POST", "/api/bff/apps/_mock/reset");
  await api(owner, "POST", "/api/bff/support/_mock/reset");

  // ── M30 catalogue + install ─────────────────────────────────────────────────────────
  await owner.goto(`${NOOR}/dashboard/apps`, { waitUntil: "load" });
  await owner.waitForSelector("[data-testid=app-row]");
  const listed = (await api(owner, "GET", "/api/bff/apps")).json as unknown as Array<{ code: string }>;
  check((await owner.locator("[data-testid=app-row]").count()) === listed.length, "the catalogue lists the platform's listed apps");
  check((await owner.locator("[data-testid=app-row][data-code=live_chat]").count()) === 0, "an unlisted app (`is_listed=false`) is not shown");
  check((await owner.locator("[data-testid=app-row][data-code=whatsapp_bot] [data-testid=app-state]").getAttribute("data-status")) === "active", "WhatsApp is «مفعّل» for noor (the console's installation row)");
  await owner.screenshot({ path: join(DIR("30-apps"), "desktop.png") });

  await owner.goto(`${NOOR}/dashboard/apps/sms_gateway`, { waitUntil: "load" });
  await owner.click("[data-testid=app-install]");
  await owner.waitForSelector("[data-testid=confirm-dialog]");
  check(/USD|\$/.test((await owner.textContent("[data-testid=confirm-dialog]")) ?? ""), "a paid install previews the server's fee and interval first");
  await owner.click("[data-testid=confirm-ok]");
  await owner.waitForSelector("[data-testid=app-page] [data-testid=app-state][data-status=active]");
  await owner.waitForSelector("[data-testid=app-events] li");
  check((await owner.textContent("[data-testid=app-events]"))?.includes("تثبيت") === true, "after install: «مفعّل» and the `installed` event");
  await owner.click("[data-testid=app-deactivate]");
  await owner.waitForSelector("[data-testid=confirm-dialog]");
  check((await owner.textContent("[data-testid=confirm-dialog]"))?.includes("تتوقف") === true, "deactivate explains the effect first");
  await owner.click("[data-testid=confirm-ok]");
  await owner.waitForSelector("[data-testid=app-page] [data-testid=app-state][data-status=inactive]");
  check(true, "…then «معطّل»");
  await owner.screenshot({ path: join(DIR("30-apps"), "app-page-desktop.png") });

  // ── WhatsApp ─────────────────────────────────────────────────────────────────────
  await owner.goto(`${NOOR}/dashboard/apps/whatsapp/usage?status=failed`, { waitUntil: "load" });
  await owner.waitForSelector("[data-testid=usage-status]");
  const statuses = await owner.locator("[data-testid=usage-status]").evaluateAll((els) => els.map((e) => e.getAttribute("data-status")));
  check(statuses.length > 0 && statuses.every((s) => s === "failed"), "usage `?status=failed` lists failed messages only, with the server's reason");
  await owner.screenshot({ path: join(DIR("30-apps"), "whatsapp-usage-desktop.png") });
  await owner.goto(`${NOOR}/dashboard/apps/whatsapp/templates/1`, { waitUntil: "load" });
  await owner.waitForSelector("[data-testid=wa-body]");
  const original = await owner.inputValue("[data-testid=wa-body]");
  await owner.fill("[data-testid=wa-body]", "مرحباً {{customer_name}}، شكراً لطلبك.");
  await owner.click("[data-testid=wa-save]");
  await owner.waitForSelector("#wa-body-error");
  check((await owner.textContent("#wa-body-error"))?.includes("order_number") === true, "dropping a required variable is refused before sending");
  await owner.fill("[data-testid=wa-body]", "أهلاً {{customer_name}}، طلبك {{order_number}} قيد التجهيز.");
  await owner.click("[data-testid=wa-save]");
  await owner.waitForFunction(() => document.querySelector("[data-testid=wa-preview]")?.textContent?.includes("1042"));
  check(true, "saved: the server preview shows the sample values");
  await owner.screenshot({ path: join(DIR("30-apps"), "whatsapp-template-desktop.png") });
  await api(owner, "PATCH", "/api/bff/apps/whatsapp/templates/1", { body: original });

  // ── M31 Sharwa AI (only if the platform catalogue lists it) ─────────────────────────
  if (listed.some((a) => a.code === "sharwa_ai")) {
    await owner.goto(`${NOOR}/dashboard/apps/sharwa-ai`, { waitUntil: "load" });
    await owner.waitForSelector("[data-testid=sharwa-ai]");
    // the settings form follows its own query — wait for it (or the «install» state) first
    await owner.waitForSelector("[data-testid=ai-settings], [data-testid=ai-install-link]");
    if ((await owner.locator("[data-testid=ai-settings]").count()) > 0) {
      await owner.waitForSelector("[data-testid=ai-status][data-status=connected]", { timeout: 15000 });
      check(true, "Sharwa AI: the polled status reaches «مربوط»");
      await owner.click("[data-testid=ai-enabled]");
      await owner.click("[data-testid=ai-save]");
      await owner.waitForSelector("[data-testid=ai-disabled]");
      check(true, "ai_enabled=false: the fixed banner shows");
      await owner.screenshot({ path: join(DIR("31-ai"), "desktop.png") });
      await owner.goto(`${NOOR}/dashboard/support/sessions`, { waitUntil: "load" });
      await owner.waitForSelector("[data-testid=ai-disabled]");
      check(true, "…and on the sessions list");
      await api(owner, "PUT", "/api/bff/apps/sharwa-ai/settings", { ai_enabled: true, max_consecutive_bot_replies_override: null });
    } else check(false, "Sharwa AI is listed but not installed for noor — expected the seeded installation");
  } else {
    await owner.goto(`${NOOR}/dashboard/apps/sharwa-ai`, { waitUntil: "load" });
    await owner.waitForSelector("[data-testid=sharwa-ai], [role=status], [data-testid=feature-off]");
    console.log("· sharwa_ai is not in the platform catalogue yet (fork E shared patch) — AI checks skipped");
  }

  // ── M31/M32 sessions ─────────────────────────────────────────────────────────────
  await owner.goto(`${NOOR}/dashboard/support/sessions`, { waitUntil: "load" });
  await owner.waitForSelector("[data-testid=session-status]");
  const first = await owner.locator("[data-testid=sessions-table] [data-testid=session-status]").first().getAttribute("data-status");
  check(first === "escalated", "escalated sessions come first");
  await owner.screenshot({ path: join(DIR("32-support"), "sessions-desktop.png") });
  await owner.goto(`${NOOR}/dashboard/support/sessions/2`, { waitUntil: "load" });
  await owner.click("[data-testid=session-takeover]");
  await owner.waitForSelector("[data-testid=locked-by]");
  check((await owner.textContent("[data-testid=locked-by]"))?.includes("خالد") === true, "a contended takeover (409) says who got there first and refreshes");
  await owner.goto(`${NOOR}/dashboard/support/sessions/1`, { waitUntil: "load" });
  await owner.click("[data-testid=session-takeover]");
  await owner.waitForSelector("[data-testid=takeover-bar]");
  check(true, "takeover → «أنت تتولّى هذه الجلسة — البوت متوقف»");
  await owner.fill("[data-testid=session-reply]", "معك فارس، سأتابع طلبك الآن.");
  await owner.press("[data-testid=session-reply]", "Enter");
  await owner.waitForFunction(() => [...document.querySelectorAll("[data-testid=session-message][data-sender=staff]")].some((m) => m.textContent?.includes("سأتابع طلبك")));
  check(true, "the staff reply lands in the timeline");
  await owner.locator("[data-testid=tool-call] button").first().click();
  check((await owner.locator("[data-testid=tool-call] pre").count()) > 0, "tool calls are folded and expand to readable JSON");
  await owner.screenshot({ path: join(DIR("31-ai"), "session-desktop.png") });
  await owner.click("[data-testid=session-release]");
  await owner.waitForSelector("[data-testid=session-page] [data-testid=session-status][data-status=bot_active]");
  check(true, "release → back to the bot");
  const manager = await page(browser, { session: "manager" });
  await manager.goto(`${NOOR}/dashboard/support/sessions/1`, { waitUntil: "load" });
  await manager.waitForSelector("[data-testid=session-readonly]");
  check((await manager.locator("[data-testid=session-takeover]").count()) === 0, "without `support.takeover_session`: read-only, no takeover button");

  // ── M32 tickets ─────────────────────────────────────────────────────────────────
  await owner.goto(`${NOOR}/dashboard/wallet/tickets`, { waitUntil: "load" });
  await owner.waitForSelector("[data-testid=tickets-table] [data-testid=row-status]");
  await owner.screenshot({ path: join(DIR("32-support"), "tickets-desktop.png") });
  await owner.click("[data-testid=ticket-new]");
  await owner.click("[data-testid=ticket-save]");
  await owner.waitForSelector("#tk-title-error");
  check(true, "an empty title is refused under the field");
  await owner.fill("[data-testid=ticket-title]", "تذكرة فحص المرحلة 7");
  await owner.click("[data-testid=ticket-save]");
  await owner.waitForSelector("[data-testid=ticket-sheet] [data-testid=ticket-detail]");
  check((await owner.textContent("[data-testid=ticket-sheet]"))?.includes("تذكرة فحص المرحلة 7") === true, "a created ticket opens its detail");
  await owner.selectOption("[data-testid=ticket-sheet] [data-testid=ticket-status]", "closed");
  await owner.waitForFunction(() => (document.querySelector("[data-testid=ticket-sheet] [data-testid=ticket-status]") as HTMLSelectElement | null)?.value === "closed");
  await owner.selectOption("[data-testid=ticket-sheet] [data-testid=ticket-status]", "open");
  await owner.waitForSelector("[data-testid=confirm-dialog]");
  check(true, "reopening a closed ticket asks first");
  await owner.click("[data-testid=confirm-ok]");
  await owner.keyboard.press("Escape");
  const rowSelect = owner.locator("[data-testid=tickets-table] [data-testid=row-status]").first();
  await rowSelect.selectOption("in_progress");
  await owner.waitForResponse((r) => r.url().includes("/api/bff/support/tickets/") && r.request().method() === "PATCH");
  check(true, "the status changes from the row without leaving the list");
  await owner.goto(`${NOOR}/dashboard/wallet/tickets?status=open`, { waitUntil: "load" });
  await owner.waitForSelector("[data-testid=tickets-table]");
  check(new URL(owner.url()).searchParams.get("status") === "open", "filters live in the URL");

  // ── visual: mobile + dark ─────────────────────────────────────────────────────────
  const mobile = await page(browser, { width: 390 });
  for (const [path, out] of [
    ["/dashboard/apps", join(DIR("30-apps"), "mobile.png")],
    ["/dashboard/support/sessions/3", join(DIR("31-ai"), "session-mobile.png")],
    ["/dashboard/wallet/tickets", join(DIR("32-support"), "tickets-mobile.png")],
  ] as const) {
    await mobile.goto(`${NOOR}${path}`, { waitUntil: "load" });
    await mobile.waitForTimeout(900);
    check(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `390px ${path}: no horizontal scroll`);
    await mobile.screenshot({ path: out, fullPage: true });
  }
  const dark = await page(browser, { dark: true });
  await dark.goto(`${NOOR}/dashboard/apps`, { waitUntil: "load" });
  await dark.waitForSelector("[data-testid=app-row]");
  await dark.screenshot({ path: join(DIR("30-apps"), "desktop-dark.png") });
  await dark.goto(`${NOOR}/dashboard/support/sessions`, { waitUntil: "load" });
  await dark.waitForSelector("[data-testid=session-status]");
  await dark.screenshot({ path: join(DIR("32-support"), "sessions-desktop-dark.png") });

  await api(owner, "POST", "/api/bff/apps/_mock/reset");
  await api(owner, "POST", "/api/bff/support/_mock/reset");
  await browser.close();
  console.log(consoleErrors.length ? `\nconsole errors:\n${consoleErrors.join("\n")}` : "\n0 console errors");
  const ok = failures.length === 0 && consoleErrors.length === 0;
  console.log(ok ? "\n✓ apps & support check passed" : `\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
