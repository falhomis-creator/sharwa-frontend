/**
 * Functional + visual check for Phase 7 T151–T153 — M26 bookings & appointments:
 *   - the weekday layer (FR-26.02, SC-26.2): 7 days × both week starts, server encoding 0 = Monday;
 *   - services list → availability editor: local errors (end ≤ start, overlap), PUT replaces the set,
 *     the buyer's slots come from those windows only (US-26.1 Independent Test);
 *   - calendar: week in the URL, held dashed / booked solid, cancelled hidden by default, cancel with
 *     confirm and the server's sentence (US-26.2, FR-26.05, FR-26.09);
 *   - PDP picker: choosing holds the slot (`held_until` countdown), a reload shows the same hold,
 *     a slot taken meanwhile → «لم يعد هذا الموعد متاحاً» (US-26.3);
 * (Not covered here: checkout → booking, which `bookSlotForOrder` does inside the M12 mock.)
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/bookings-check.ts [port]   (default 3000)
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { backendToJsDay, backendWeekdayOf, displayOrder, jsDayToBackend, weekStartOf } from "../src/features/bookings/weekdays";

const PORT = process.argv[2] ?? "3000";
const NOOR = `http://noor.localhost:${PORT}`;
const OUT = join(process.cwd(), "docs", "visual-checks", "26-bookings");
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
  if (opts.session) await ctx.addCookies([{ name: "sharwa_mock_session", value: opts.session, domain: "noor.localhost", path: "/" }]);
  const p = await ctx.newPage();
  p.on("console", (m) => {
    if (m.type() === "error" && !/status of (400|401|403|404|409)/.test(m.text())) {
      const t = m.text();
      // Keep the hydration diff (the lines React marks with + / -), not only its preamble.
      const diff = t.split("\n").filter((l) => /^\s*[+-]\s/.test(l)).join("\n");
      consoleErrors.push(`[${p.url()}] ${t.slice(0, 160)}${diff ? `\n${diff.slice(0, 1500)}` : ""}`);
    }
  });
  p.on("pageerror", (e) => consoleErrors.push(`PAGEERROR ${e.message}`));
  return p;
}

async function api(p: Page, method: string, path: string, body?: unknown) {
  return p.evaluate(
    async ({ method, path, body }) => {
      const csrf = await fetch("/api/bff/auth/csrf").then((r) => r.json()).catch(() => ({}));
      const r = await fetch(path, {
        method,
        headers: { accept: "application/json", ...(csrf?.csrfToken ? { "x-csrftoken": csrf.csrfToken } : {}), ...(body !== undefined ? { "content-type": "application/json" } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const text = await r.text();
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
      return { status: r.status, json: json as Record<string, unknown> & unknown[] };
    },
    { method, path, body },
  );
}

function unitWeekdays() {
  // 2026-10-19 is a Monday; 2026-10-18 a Sunday.
  const monday = "2026-10-19";
  const names = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"];
  check(names.every((d, i) => backendWeekdayOf(d) === i), "weekday layer: Mon..Sun → 0..6 (backend encoding) for all 7 days");
  check([0, 1, 2, 3, 4, 5, 6].every((js) => backendToJsDay(jsDayToBackend(js)) === js), "weekday layer: JS ↔ backend round-trips for all 7 days");
  check(JSON.stringify(displayOrder("sunday")) === "[6,0,1,2,3,4,5]", "week starting Sunday displays Sunday (6) first");
  check(JSON.stringify(displayOrder("monday")) === "[0,1,2,3,4,5,6]", "week starting Monday displays Monday (0) first");
  check(weekStartOf(monday, "sunday") === "2026-10-18" && weekStartOf(monday, "monday") === monday, "weekStartOf honours both week starts");
  check(names.every((d) => weekStartOf(d, "sunday") <= d && weekStartOf(d, "monday") <= d), "every day of the week maps into its own week (both starts)");
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  unitWeekdays();
  const browser = await launch();
  const m = await page(browser, { session: "merchant" });
  await m.goto(`${NOOR}/dashboard/bookings/services`, { waitUntil: "load" });
  await m.waitForSelector("[data-testid=services-table]");
  const services = (await api(m, "GET", "/api/bff/bookings/services/")).json as unknown as Array<{ id: number; name: string; booking_duration_minutes: number }>;
  check(services.length >= 1, "services: the bookable products are listed");
  const svc = services[0]!;
  await m.screenshot({ path: join(OUT, "services-desktop.png") });

  // ── availability editor ──────────────────────────────────────────────────────────
  const before = (await api(m, "GET", `/api/bff/bookings/services/${svc.id}/availability/`)).json as unknown as { results: Array<{ weekday: number; start_time: string; end_time: string }>; week_start_day: string };
  await m.goto(`${NOOR}/dashboard/bookings/services/${svc.id}/availability`, { waitUntil: "load" });
  await m.waitForSelector("[data-testid=availability-days]");
  const firstDay = await m.locator("[data-testid=availability-day]").first().getAttribute("data-weekday");
  check(firstDay === (before.week_start_day === "sunday" ? "6" : "0"), "availability: rows start at the store's week start (server weekday encoding)");
  await m.screenshot({ path: join(OUT, "availability-desktop.png"), fullPage: true });
  // Monday (0): end ≤ start is refused locally
  const mondayRow = m.locator("[data-testid=availability-day][data-weekday='0']");
  await mondayRow.locator("[data-testid=add-window]").click();
  const lastStart = mondayRow.locator("[data-testid=window-start]").last();
  const lastEnd = mondayRow.locator("[data-testid=window-end]").last();
  await lastStart.fill("15:00");
  await lastEnd.fill("14:00");
  check((await mondayRow.locator("[data-testid=window-error]").last().textContent())?.includes("بعد بدايته") === true, "availability: end ≤ start is refused under the field");
  await lastStart.fill("09:30");
  await lastEnd.fill("11:00");
  check((await mondayRow.locator("[data-testid=window-error]").count()) > 0, "availability: an overlapping window is refused locally");
  // Replace Monday by the Independent Test's windows through the API (PUT = full replacement)
  const others = before.results.filter((w) => w.weekday !== 0);
  const put = await api(m, "PUT", `/api/bff/bookings/services/${svc.id}/availability/`, [...others, { weekday: 0, start_time: "09:00", end_time: "12:00" }, { weekday: 0, start_time: "16:00", end_time: "20:00" }]);
  check(put.status === 200, "availability: PUT replaces the full set");
  const overlap = await api(m, "PUT", `/api/bff/bookings/services/${svc.id}/availability/`, [{ weekday: 0, start_time: "09:00", end_time: "12:00" }, { weekday: 0, start_time: "11:00", end_time: "13:00" }]);
  check(overlap.status === 400, "availability: the server re-validates overlaps (400)");

  // The buyer sees slots inside those two windows only, on the next Monday.
  const nextMonday = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7 || 7));
    return d.toISOString().slice(0, 10);
  })();
  const shopper = await page(browser);
  await shopper.goto(`${NOOR}/`, { waitUntil: "domcontentloaded" });
  const slots = (await api(shopper, "GET", `/api/bff/catalog/products/${svc.id}/slots?date=${nextMonday}`)).json as unknown as { slots: Array<{ start_datetime: string; status: string }> };
  const hours = slots.slots.map((s) => Number(s.start_datetime.slice(11, 13)));
  check(hours.length > 0 && hours.every((h) => (h >= 9 && h < 12) || (h >= 16 && h < 20)), "buyer: Monday's slots fall inside 09:00–12:00 and 16:00–20:00 only");

  // ── PDP picker: hold, reload, conflict ──────────────────────────────────────────────
  await shopper.goto(`${NOOR}/p/${svc.id}`, { waitUntil: "load" });
  await shopper.waitForSelector("[data-testid=booking-picker]");
  const freeSlot = shopper.locator("[data-testid=booking-picker] [data-testid=slot][data-status=available]").first();
  const dayButtons = shopper.locator("[data-testid=booking-picker] [role=radiogroup][aria-label=اليوم] button");
  // The picker's slots are fetched per day: wait until a day has settled (no skeleton) before judging it.
  const settled = () => shopper.waitForFunction(() => !document.querySelector("[data-testid=booking-picker] .animate-pulse"));
  await settled();
  for (let i = 0; (await freeSlot.count()) === 0 && i < 7; i++) {
    await dayButtons.nth(i).click();
    await settled();
  }
  await freeSlot.click();
  await shopper.waitForSelector("[data-testid=slot-hold]");
  check(/\d\d:\d\d/.test((await shopper.textContent("[data-testid=slot-hold-countdown]")) ?? ""), "PDP: choosing a time holds it with a Mono countdown to held_until");
  await shopper.screenshot({ path: join(OUT, "pdp-picker-desktop.png") });
  await shopper.reload({ waitUntil: "load" });
  await shopper.waitForSelector("[data-testid=slot-hold]");
  // The hold text comes from this browser at once; the day's slots arrive from the server after it.
  await shopper.waitForSelector("[data-testid=slot][data-status=mine]", { timeout: 8000 }).catch(() => undefined);
  check((await shopper.locator("[data-testid=slot][data-status=mine]").count()) === 1, "PDP: a reload during the hold shows the same slot «محتجز لك»");

  const other = await page(browser);
  await other.goto(`${NOOR}/`, { waitUntil: "domcontentloaded" });
  const held = (await api(shopper, "GET", `/api/bff/catalog/products/${svc.id}/slots?date=${nextMonday}`)).json as unknown as { slots: Array<{ start_datetime: string; status: string }> };
  const taken = held.slots.find((s) => s.status === "available");
  if (taken) {
    await api(other, "POST", `/api/bff/catalog/products/${svc.id}/slots`, { start_datetime: taken.start_datetime });
    const again = await api(shopper, "POST", `/api/bff/catalog/products/${svc.id}/slots`, { start_datetime: taken.start_datetime });
    check(again.status === 409 && String(again.json.detail).includes("لم يعد هذا الموعد متاحاً"), "hold: a slot taken by another buyer answers 409 «لم يعد هذا الموعد متاحاً»");
  }

  // ── calendar ─────────────────────────────────────────────────────────────────────
  await m.goto(`${NOOR}/dashboard/bookings`, { waitUntil: "load" });
  await m.waitForSelector("[data-testid=week-grid] [data-testid=day-head]");
  check((await m.locator("[data-testid=week-grid] [data-testid=day-head]").count()) === 7, "calendar: a week of 7 columns");
  const booked = m.locator("[data-testid=week-grid] [data-testid=slot-block][data-status=booked]").first();
  check((await booked.count()) > 0 && (await booked.evaluate((el) => getComputedStyle(el).borderStyle)) === "solid", "calendar: booked blocks have solid borders");
  const heldBlock = m.locator("[data-testid=week-grid] [data-testid=slot-block][data-status=held]").first();
  if (await heldBlock.count()) check((await heldBlock.evaluate((el) => getComputedStyle(el).borderStyle)) === "dashed", "calendar: held blocks have dashed borders (no fills)");
  check((await m.locator("[data-testid=slot-block][data-status=cancelled]").count()) === 0, "calendar: cancelled hidden by default");
  await m.screenshot({ path: join(OUT, "desktop.png") });
  await m.click("[data-testid=week-next]");
  await m.waitForURL(/date=\d{4}-\d{2}-\d{2}/);
  check(true, "calendar: the week is in the URL");
  await m.click("[data-testid=week-prev]");
  await m.waitForTimeout(300);

  // cancel a booked slot
  await booked.click();
  await m.waitForSelector("[data-testid=slot-sheet] [data-testid=slot-order]");
  check(((await m.getAttribute("[data-testid=slot-order]", "href")) ?? "").startsWith("/dashboard/orders/"), "calendar: a booking links to its order (M06)");
  await m.click("[data-testid=slot-cancel]");
  await m.click("[data-testid=slot-cancel-confirm]");
  await m.waitForSelector("[data-sonner-toast]");
  check(((await m.textContent("[data-sonner-toast]")) ?? "").includes("أُلغي الحجز"), "calendar: cancel asks first and shows the server's sentence");
  await m.click("[data-testid=show-cancelled]");
  await m.waitForSelector("[data-testid=slot-block][data-status=cancelled]");
  check(true, "calendar: «إظهار الملغاة» reveals cancelled bookings");

  // ── visual: tablet, mobile, dark ─────────────────────────────────────────────────
  for (const [name, width, dark] of [["tablet", 834, false], ["mobile", 390, false], ["desktop-dark", 1440, true]] as const) {
    const v = await page(browser, { session: "merchant", width, dark });
    await v.goto(`${NOOR}/dashboard/bookings`, { waitUntil: "load" });
    await v.waitForSelector(width < 768 ? "[data-testid=day-view]" : "[data-testid=week-grid]");
    check(await v.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${name}: no horizontal page scroll`);
    await v.screenshot({ path: join(OUT, `${name}.png`), fullPage: width < 768 });
  }
  const mp = await page(browser, { width: 390 });
  await mp.goto(`${NOOR}/p/${svc.id}`, { waitUntil: "load" });
  await mp.waitForSelector("[data-testid=booking-picker]");
  await mp.locator("[data-testid=booking-picker]").scrollIntoViewIfNeeded();
  await mp.screenshot({ path: join(OUT, "pdp-picker-mobile.png") });

  // restore the windows we replaced
  await api(m, "PUT", `/api/bff/bookings/services/${svc.id}/availability/`, before.results);

  await browser.close();
  console.log(consoleErrors.length ? `\nconsole errors:\n${consoleErrors.join("\n")}` : "\n0 console errors");
  const ok = failures.length === 0 && consoleErrors.length === 0;
  console.log(ok ? "\n✓ bookings check passed" : `\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
