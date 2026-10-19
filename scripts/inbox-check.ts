/**
 * Functional + visual check for Phase 7 T154–T156 — M27 unified inbox and social channels:
 *   - gates: `social_channels` + `channels.inbox.access` (a staff member without it gets the
 *     forbidden state and a 403 from the BFF); channel settings are the owner's;
 *   - the three-column inbox: 100 conversations, `?c=` in the URL, opening a conversation
 *     with `unread_count=3` zeroes it in the list AND in the counter (SC-27.2);
 *   - reply: optimistic bubble, `/` template picker, a failed send shows the server's
 *     reason with «إعادة المحاولة»; a new inbound message lands by polling (≤ 5s);
 *   - a resolved conversation reopens on a new message; `can_reply=false` disables the box;
 *   - convert to order: the order number appears in the context column;
 *   - channels: three rows, OAuth redirect, Telegram token (write-only), disconnect
 *     confirmation, catalog sync run → report, staff-access autosave;
 *   - screenshots desktop / mobile / dark into docs/visual-checks/27-inbox/.
 * Restores the store's inbox mock state at the end (`POST /api/bff/inbox/_mock/reset`).
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/inbox-check.ts [port]   (default 3000)
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] ?? "3000";
const NOOR = `http://noor.localhost:${PORT}`;
const OUT = join(process.cwd(), "docs", "visual-checks", "27-inbox");
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
  mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  const owner = await page(browser);
  await owner.goto(`${NOOR}/dashboard`, { waitUntil: "domcontentloaded" });
  await api(owner, "POST", "/api/bff/inbox/_mock/reset");

  // ── gates ─────────────────────────────────────────────────────────────────────────
  const staff = await page(browser, { session: "staff" });
  await staff.goto(`${NOOR}/dashboard/inbox`, { waitUntil: "load" });
  await staff.waitForSelector("[data-testid=feature-off], [data-testid=forbidden]");
  check((await staff.locator("[data-testid=forbidden], [data-testid=feature-off]").count()) === 1, "staff without `channels.inbox.access`: the gate state, not the inbox");
  check((await api(staff, "GET", "/api/bff/inbox/conversations")).status === 403, "…and the BFF answers 403");
  const manager = await page(browser, { session: "manager" });
  await manager.goto(`${NOOR}/dashboard/channels/social`, { waitUntil: "load" });
  await manager.waitForSelector("[data-testid=forbidden]");
  check(true, "channel settings are the owner's (manager sees forbidden)");
  check((await api(manager, "GET", "/api/bff/channels")).status === 403, "…and `GET /channels` answers 403 for the manager");
  check((await api(manager, "GET", "/api/bff/channels/templates")).status === 200, "inbox members still read the `/` templates");

  // ── the inbox ────────────────────────────────────────────────────────────────────
  const before = (await api(owner, "GET", "/api/bff/inbox/counters")).json.unread as number;
  await owner.goto(`${NOOR}/dashboard/inbox`, { waitUntil: "load" });
  await owner.waitForSelector("[data-testid=conversation-row]");
  check((await owner.locator("[data-testid=conversation-row]").count()) === 100, "100 conversations in the list column");
  await owner.screenshot({ path: join(OUT, "desktop-list.png") });
  const firstUnread = await owner.locator("[data-testid=conversation-row][data-id='1'] [data-testid=unread-count]").textContent();
  check(firstUnread?.trim() === "3", "conversation #1 starts with unread_count=3");
  await owner.click("[data-testid=conversation-row][data-id='1']");
  await owner.waitForURL(/[?&]c=1/);
  await owner.waitForSelector("[data-testid=thread][data-id='1'] [data-testid=message]");
  check(true, "opening it puts `?c=1` in the URL and shows its messages");
  await owner.waitForFunction(() => !document.querySelector("[data-testid=conversation-row][data-id='1'] [data-testid=unread-count]"), null, { timeout: 8000 });
  check(true, "its unread counter clears in the list");
  const after = (await api(owner, "GET", "/api/bff/inbox/counters")).json.unread as number;
  check(after === before - 3, `the unread badge drops by 3 (${before} → ${after})`);
  check((await owner.locator("[data-testid=context-column]").count()) === 1, "the context column renders at 1440px");

  // reply + optimistic + template picker
  const outBefore = await owner.locator("[data-testid=message][data-direction=outbound]").count();
  await owner.fill("[data-testid=reply-input]", "تمام، أرسلنا لك التفاصيل");
  await owner.press("[data-testid=reply-input]", "Enter");
  await owner.waitForFunction((n) => document.querySelectorAll("[data-testid=message][data-direction=outbound]").length === n + 1, outBefore);
  check(true, "Enter sends: the outbound bubble appears");
  await owner.waitForFunction(() => [...document.querySelectorAll("[data-testid=message][data-direction=outbound] [data-testid=message-status]")].at(-1)?.textContent?.includes("مُرسَلة") || [...document.querySelectorAll("[data-testid=message][data-direction=outbound] [data-testid=message-status]")].at(-1)?.textContent?.includes("تم التوصيل"), null, { timeout: 8000 });
  check(true, "…and settles to the server's status");
  await owner.fill("[data-testid=reply-input]", "/");
  await owner.waitForSelector("[data-testid=template-picker]");
  await owner.press("[data-testid=reply-input]", "Enter");
  const inserted = await owner.inputValue("[data-testid=reply-input]");
  check(inserted.startsWith("أهلاً بك"), "`/` opens the templates and Enter inserts one, editable");
  await owner.fill("[data-testid=reply-input]", "");

  // inbound by polling
  await api(owner, "POST", "/api/bff/inbox/_mock/inbound", { conversation_id: 1, text: "هل يصل الطلب اليوم؟" });
  await owner.waitForFunction(() => [...document.querySelectorAll("[data-testid=message][data-direction=inbound]")].some((m) => m.textContent?.includes("هل يصل الطلب اليوم؟")), null, { timeout: 7000 });
  check(true, "a new inbound message appears by polling within 5s");

  // convert to order
  await owner.click("[data-testid=convert-open]");
  await owner.waitForSelector("[data-testid=convert-dialog]");
  check((await owner.inputValue("#cv-phone")) === "967771234567", "convert: phone prefilled from the context");
  await owner.click("[data-testid=convert-add-product]");
  await owner.waitForSelector("[data-testid=pick-product]");
  await owner.locator("[data-testid=pick-product]").first().click();
  await owner.fill("#cv-address", "صنعاء — شارع الزبيري");
  await owner.click("[data-testid=convert-save]");
  await owner.waitForSelector("[data-testid=linked-order]", { timeout: 8000 });
  check((await owner.textContent("[data-testid=linked-order]"))?.includes("#") === true, "the new order number shows in the context column");
  await owner.screenshot({ path: join(OUT, "desktop.png") });

  // failed send (Meta 24h window) → server reason + retry
  await owner.goto(`${NOOR}/dashboard/inbox?c=3`, { waitUntil: "load" });
  await owner.waitForSelector("[data-testid=thread][data-id='3']");
  await owner.fill("[data-testid=reply-input]", "مرحباً");
  await owner.press("[data-testid=reply-input]", "Enter");
  await owner.waitForSelector("[data-testid=message-error]");
  check((await owner.textContent("[data-testid=message-error]"))?.includes("24") === true, "a failed send shows the server's reason verbatim");
  check((await owner.locator("[data-testid=message-retry]").count()) > 0, "…with «إعادة المحاولة»");

  // resolved → reopens on a new message
  await api(owner, "PATCH", "/api/bff/inbox/conversations/5", { status: "resolved" });
  await api(owner, "POST", "/api/bff/inbox/_mock/inbound", { conversation_id: 5, text: "سؤال آخر" });
  const c5 = (await api(owner, "GET", "/api/bff/inbox/conversations/5")).json;
  check(c5.status === "open", "a resolved conversation reopens on a new message (server rule)");

  // can_view without can_reply (manager on TikTok)
  await manager.goto(`${NOOR}/dashboard/inbox?c=4`, { waitUntil: "load" });
  await manager.waitForSelector("[data-testid=thread][data-id='4']");
  check((await manager.locator("[data-testid=reply-disabled]").count()) === 1 && (await manager.locator("[data-testid=reply-input]").isDisabled()), "view-only member: the reply box is disabled with a hint");

  // ── channels ─────────────────────────────────────────────────────────────────────
  await owner.goto(`${NOOR}/dashboard/channels/social`, { waitUntil: "load" });
  await owner.waitForSelector("[data-testid=channel-row]");
  check((await owner.locator("[data-testid=channel-row]").count()) === 3, "three channel rows");
  check((await owner.locator("[data-testid=channel-row][data-code=tiktok] [data-testid=channel-error]").count()) === 1, "TikTok shows the server's error with «إعادة الربط»");
  await owner.screenshot({ path: join(OUT, "channels-desktop.png") });
  await owner.fill("#tg-token", "not-a-token");
  await owner.click("[data-testid=telegram-form] button[type=submit]");
  await owner.waitForSelector("#tg-token-error");
  check(true, "a malformed Telegram token is refused under the field");
  await owner.fill("#tg-token", "1234567890:AAH-abcdefghijklmnopqrstuvwxyz0123456");
  await owner.click("[data-testid=telegram-form] button[type=submit]");
  await owner.waitForSelector("[data-testid=telegram-bot]");
  const html = await owner.content();
  check(!html.includes("AAH-abcdefghijklmnopqrstuvwxyz0123456"), "the bot is linked and the token is never shown again (SC-27.4)");
  await owner.click("[data-testid=channel-row][data-code=telegram] [data-testid=channel-disconnect]");
  await owner.waitForSelector("[data-testid=confirm-dialog]");
  check((await owner.textContent("[data-testid=confirm-dialog]"))?.includes("للقراءة فقط") === true, "disconnect asks first and explains the effect on open conversations");
  await owner.click("[data-testid=confirm-ok]");
  await owner.waitForSelector("[data-testid=channel-row][data-code=telegram] [data-testid=telegram-form]");
  check(true, "…and the row returns to «غير مربوط»");
  await owner.click("[data-testid=channel-row][data-code=tiktok] [data-testid=channel-connect]");
  await owner.waitForURL(`${NOOR}/dashboard/channels/social`);
  await owner.waitForSelector("[data-testid=channel-row][data-code=tiktok] [data-testid=channel-state][data-status=connected]");
  check(true, "OAuth: the server redirect returns to the page with the channel connected");

  await owner.goto(`${NOOR}/dashboard/channels/social/catalog`, { waitUntil: "load" });
  await owner.waitForSelector("[data-testid=sync-count]");
  await owner.click("[data-testid=sync-run]");
  await owner.click("[data-testid=confirm-ok]");
  await owner.waitForSelector("[data-testid=sync-status]");
  check((await owner.locator("[data-testid=sync-status]").count()) > 0, "catalog sync: preview count → run → per-product statuses");
  await owner.screenshot({ path: join(OUT, "catalog-desktop.png") });

  await owner.goto(`${NOOR}/dashboard/channels/social/staff-access`, { waitUntil: "load" });
  await owner.waitForSelector("[data-testid=access-row]");
  const cell = owner.locator("[data-testid=access-row][data-staff='3'] [data-testid=reply-telegram]");
  const was = await cell.isChecked();
  await cell.click();
  await owner.waitForResponse((r) => r.url().includes("/api/bff/channels/staff-access") && r.request().method() === "PUT");
  const saved = (await api(owner, "GET", "/api/bff/channels/staff-access")).json as unknown as { rows: Array<{ staff_id: number; channel_code: string; can_reply: boolean }> };
  check(saved.rows.find((r) => r.staff_id === 3 && r.channel_code === "telegram")?.can_reply === !was, "staff access autosaves on toggle");

  // ── visual: mobile + dark ─────────────────────────────────────────────────────────
  const mobile = await page(browser, { width: 390 });
  await mobile.goto(`${NOOR}/dashboard/inbox`, { waitUntil: "load" });
  await mobile.waitForSelector("[data-testid=conversation-row]");
  check(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "390px list: no horizontal scroll");
  await mobile.screenshot({ path: join(OUT, "mobile.png") });
  await mobile.locator("[data-testid=conversation-row]").nth(1).click();
  await mobile.waitForSelector("[data-testid=thread] [data-testid=message]");
  check(await mobile.locator("[data-testid=conversation-list]").isHidden(), "390px: the thread replaces the list (step-in flow)");
  await mobile.screenshot({ path: join(OUT, "mobile-thread.png") });
  const tablet = await page(browser, { width: 1024 });
  await tablet.goto(`${NOOR}/dashboard/inbox?c=2`, { waitUntil: "load" });
  await tablet.waitForSelector("[data-testid=thread] [data-testid=message]");
  await tablet.screenshot({ path: join(OUT, "tablet.png") });
  const dark = await page(browser, { dark: true });
  await dark.goto(`${NOOR}/dashboard/inbox?c=2`, { waitUntil: "load" });
  await dark.waitForSelector("[data-testid=thread] [data-testid=message]");
  await dark.screenshot({ path: join(OUT, "desktop-dark.png") });

  await api(owner, "POST", "/api/bff/inbox/_mock/reset");
  await browser.close();
  console.log(consoleErrors.length ? `\nconsole errors:\n${consoleErrors.join("\n")}` : "\n0 console errors");
  const ok = failures.length === 0 && consoleErrors.length === 0;
  console.log(ok ? "\n✓ inbox check passed" : `\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
