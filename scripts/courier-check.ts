/**
 * Functional + visual check for Phase 7 T175–T177 — M38 «تطبيق المندوب» on `noor.localhost/agent`.
 *
 *   - identity (FR-38.01): no session → the M18 staff login; a staff account without a
 *     provider profile (the manager fixture) → the server's 403 sentence; the owner → 403;
 *   - shift: open shift + balance from the server; handover to oneself refused locally;
 *     end → «لا مناوبة» → start again (restores the open shift);
 *   - list: tab counts = the server's `counts`; amounts as sent;
 *   - pickup scan: a wrong code → the red «عدم تطابق الباركود» bar and «تم الاستلام» stays
 *     disabled; the waybill → match → one tap to «تم الاستلام»;
 *   - state machine: an `in_transit` shipment offers «تم التسليم» and «مُعاد» only;
 *   - idempotency (SC-38.1): the same `client_generated_uuid` twice → the same answer;
 *     partial delivery resent → `duplicate:true` and the same `collected_amount`;
 *     a `stale_event` → `accepted:false` with the status unchanged;
 *   - offline: the bar, an action queued in IndexedDB, «n إجراءات بانتظار المزامنة», replay on
 *     reconnect; the last list kept as an IndexedDB snapshot;
 *   - custody: a `reversed` entry in amber pointing at its original;
 *   - SC-38.3: no touch target under 48px at 390px; screenshots mobile / mobile-dark / tablet / desktop.
 *
 * Mutates noor's Sharwa Ship fixtures (picks rows by status, so it can be re-run; restart the
 * dev server for a pristine seed).
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/courier-check.ts [port]   (default 3000)
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = process.argv[2] ?? "3000";
const NOOR = `http://noor.localhost:${PORT}`;
const OUT = join(process.cwd(), "docs", "visual-checks", "38-courier");
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
  const width = opts.width ?? 390;
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, locale: "ar", colorScheme: opts.dark ? "dark" : "light", isMobile: width < 768, hasTouch: width < 768 });
  if (opts.session) await ctx.addCookies([{ name: "sharwa_mock_session", value: opts.session, domain: "noor.localhost", path: "/" }]);
  const p = await ctx.newPage();
  p.on("console", (m) => {
    if (m.type() === "error" && !/status of (400|401|403|404|409)|ERR_INTERNET_DISCONNECTED|Failed to fetch/.test(m.text())) consoleErrors.push(m.text().slice(0, 200));
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

type Row = { id: number; waybill_number: string; status: string; fulfillment_id: number; display_cod_amount: string; items: Array<{ fulfillment_item_id: number; quantity: number }> };

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await launch();

  // ── identity ─────────────────────────────────────────────────────────────────────
  const anon = await page(browser);
  await anon.goto(`${NOOR}/agent`, { waitUntil: "load" });
  await anon.waitForURL(/\/dashboard\/staff\/login/, { timeout: 15_000 });
  check(new URL(anon.url()).searchParams.get("next") === "/agent", "no session → the staff login, coming back to /agent");

  const manager = await page(browser, { session: "manager" });
  await manager.goto(`${NOOR}/agent`, { waitUntil: "load" });
  await manager.waitForSelector("[data-testid=no-agent-profile]");
  check((await manager.textContent("[data-testid=no-agent-profile]"))?.includes("غير مرتبط بأي ملف مندوب شحن") === true, "staff without a provider profile → the server's 403 sentence");

  const owner = await page(browser, { session: "merchant" });
  await owner.goto(`${NOOR}/dashboard`, { waitUntil: "domcontentloaded" });
  check((await api(owner, "GET", "/api/bff/agent/me")).status === 403, "the store owner gets 403 in the agent app (supervisor screen instead)");

  // ── shift ────────────────────────────────────────────────────────────────────────
  const p = await page(browser, { session: "staff" });
  await p.goto(`${NOOR}/agent`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=shift-screen]");
  let me = (await api(p, "GET", "/api/bff/agent/me")).json as { agent: { id: number }; open_shift: { id: number } | null; display_balance: string };
  if (!me.open_shift) {
    await p.click("[data-testid=start-shift]");
    await p.waitForSelector("[data-testid=open-shift]");
    me = (await api(p, "GET", "/api/bff/agent/me")).json as typeof me;
  }
  check((await p.textContent("[data-testid=balance]"))?.trim() === me.display_balance, "the custody balance is the server's string");
  await p.screenshot({ path: join(OUT, "mobile.png"), fullPage: true });
  await p.click("[data-testid=handover-open]");
  await p.fill("[data-testid=handover-target]", String(me.agent.id));
  await p.click("[data-testid=handover-confirm]");
  check((await p.textContent("[data-testid=shift-error]"))?.includes("لنفسك") === true, "handover to oneself is refused before sending");
  await p.click("text=رجوع");
  await p.click("[data-testid=end-shift]");
  await p.waitForSelector("[data-testid=no-shift]");
  check(true, "ending the shift locks the app on «لا مناوبة»");
  await p.goto(`${NOOR}/agent/shipments`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=shift-lock]");
  check(true, "no open shift → the shipments are locked");
  await p.goto(`${NOOR}/agent`, { waitUntil: "load" });
  await p.fill("[data-testid=vehicle-ref]", "دراجة 14");
  await p.click("[data-testid=start-shift]");
  await p.waitForSelector("[data-testid=open-shift]");
  check((await p.textContent("[data-testid=shift-note]"))?.includes("بدأت") === true, "start → the open shift from the response");
  const twice = await api(p, "POST", "/api/v1/agent/shifts/start/", {});
  check(twice.status === 201 && typeof (twice.json as { closed_previous_shift_id?: number }).closed_previous_shift_id === "number", "starting again closes the previous shift on the server");

  // ── list ─────────────────────────────────────────────────────────────────────────
  const all = (await api(p, "GET", "/api/bff/agent/shipments")).json as { counts: Record<string, number>; results: Row[] };
  await p.goto(`${NOOR}/agent/shipments?status=in_transit`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=agent-shipment]");
  check((await p.textContent("[data-testid=status-count-in_transit]"))?.trim() === String(all.counts.in_transit), "tab count = the server's count");
  const firstCod = all.results.find((r) => r.status === "in_transit")!;
  check((await p.locator("[data-testid=agent-shipment] [data-testid=cod]").first().textContent())?.trim() === firstCod.display_cod_amount, "the amount to collect is shown exactly as sent");

  // ── pickup scan ──────────────────────────────────────────────────────────────────
  const pickup = all.results.find((r) => r.status === "pending_pickup");
  if (pickup) {
    await p.goto(`${NOOR}/agent/shipments/${pickup.id}`, { waitUntil: "load" });
    await p.waitForSelector("[data-testid=scanner]");
    check(await p.isDisabled("[data-testid=move-picked_up]"), "«تم الاستلام» is disabled until the barcode matches");
    await p.fill("[data-testid=scan-input]", "WRONG-123");
    await p.click("[data-testid=scan-submit]");
    await p.waitForSelector("[data-testid=scan-mismatch]");
    check((await p.textContent("[data-testid=scan-mismatch]"))?.includes("عدم تطابق الباركود") === true, "a wrong code → the persistent red mismatch bar");
    await p.screenshot({ path: join(OUT, "mobile-scan-mismatch.png"), fullPage: true });
    await p.fill("[data-testid=scan-input]", pickup.waybill_number);
    await p.click("[data-testid=scan-submit]");
    await p.waitForSelector("[data-testid=scan-ok]");
    await p.click("[data-testid=move-picked_up]");
    await p.waitForSelector("[data-testid=move-ok]");
    const moved = await p.waitForFunction(() => document.querySelector("[data-testid=agent-status]")?.textContent?.includes("تم الاستلام"), null, { timeout: 10_000 }).then(() => true, () => false);
    check(moved, "match → one tap moves it to «تم الاستلام»");
  } else check(false, "a pending_pickup shipment exists for the scan test");

  // ── state machine + idempotency ──────────────────────────────────────────────────
  const transit = (await api(p, "GET", "/api/bff/agent/shipments?status=in_transit")).json as { results: Row[] };
  const t1 = transit.results[0]!;
  await p.goto(`${NOOR}/agent/shipments/${t1.id}`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=action-bar]");
  const moves = await p.locator("[data-testid^=move-]").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
  check(JSON.stringify(moves.sort()) === JSON.stringify(["move-delivered", "move-returned"]), "in_transit offers «تم التسليم» and «مُعاد» only (no «إلغاء»)");

  const stale = await api(p, "POST", `/api/v1/agent/shipments/${t1.id}/status/`, { to_status: "delivered", client_generated_uuid: `check-stale-${Date.now()}`, event_time: "2020-01-01T00:00:00Z" });
  const sj = stale.json as { accepted: boolean; rejection_reason: string; status: string };
  check(stale.status === 200 && sj.accepted === false && sj.rejection_reason === "stale_event" && sj.status === "in_transit", "an old event_time → accepted:false stale_event, status unchanged");

  const t2 = transit.results[1] ?? t1;
  const key = `check-partial-${Date.now()}`;
  const lines = t2.items.map((i, k) => ({ fulfillment_item_id: i.fulfillment_item_id, delivered_quantity: k === 0 ? Math.max(0, i.quantity - 1) : i.quantity, rejection_reason: k === 0 && i.quantity >= 1 ? "منتج تالف" : "" }));
  const first = await api(p, "POST", `/api/v1/agent/fulfillments/${t2.fulfillment_id}/partial-delivery/`, { line_items: lines, client_generated_uuid: key });
  const again = await api(p, "POST", `/api/v1/agent/fulfillments/${t2.fulfillment_id}/partial-delivery/`, { line_items: lines, client_generated_uuid: key });
  const f1 = first.json as { collected_amount: string; duplicate: boolean };
  const f2 = again.json as { collected_amount: string; duplicate: boolean };
  check(first.status === 200 && f1.duplicate === false && f2.duplicate === true && f1.collected_amount === f2.collected_amount, "a resent partial delivery → duplicate:true, the same collected_amount");
  const custody = (await api(p, "GET", "/api/bff/agent/custody")).json as { results: Array<{ entry_type: string; related_shipment: { id: number } | null }> };
  check(custody.results.filter((c) => c.entry_type === "collected_cod" && c.related_shipment?.id === t2.id).length <= 1, "…and only one collected_cod entry in the ledger");

  // ── UI partial delivery (all rejected → confirm) ────────────────────────────────
  const t3 = ((await api(p, "GET", "/api/bff/agent/shipments?status=in_transit")).json as { results: Row[] }).results[0];
  if (t3) {
    await p.goto(`${NOOR}/agent/shipments/${t3.id}`, { waitUntil: "load" });
    await p.click("[data-testid=move-delivered]");
    await p.waitForSelector("[data-testid=delivery-form]");
    for (const line of await p.locator("[data-testid=delivery-line]").all()) {
      const qty = Number((await line.locator("[data-testid=qty]").textContent())?.split("/")[1]);
      for (let i = 0; i < qty; i++) await line.locator("[data-testid=qty-minus]").click();
      await line.locator("[data-testid=reject-reason]").selectOption({ index: 1 });
    }
    await p.click("[data-testid=delivery-submit]");
    await p.waitForSelector("[data-testid=confirm-fail]");
    check(true, "all lines rejected → «سيُسجَّل كتسليم فاشل» before sending");
    await p.screenshot({ path: join(OUT, "mobile-delivery.png"), fullPage: true });
    await p.click("[data-testid=delivery-submit]");
    await p.waitForSelector("[data-testid=delivery-result]");
    check(true, "the failed delivery is recorded with the server's answer");
  }

  // ── offline queue ────────────────────────────────────────────────────────────────
  const pick = ((await api(p, "GET", "/api/bff/agent/shipments?status=picked_up")).json as { results: Row[] }).results[0];
  if (pick) {
    await p.goto(`${NOOR}/agent/shipments/${pick.id}`, { waitUntil: "load" });
    await p.waitForSelector("[data-testid=move-in_transit]");
    await p.context().setOffline(true);
    await p.waitForSelector("[data-testid=offline-bar]");
    await p.click("[data-testid=move-in_transit]");
    await p.waitForSelector("[data-testid=queued-note]");
    await p.waitForSelector("[data-testid=queue-badge]");
    check((await p.textContent("[data-testid=queue-badge]"))?.includes("بانتظار المزامنة") === true, "offline: the action is queued with «n إجراءات بانتظار المزامنة»");
    await p.screenshot({ path: join(OUT, "mobile-offline.png"), fullPage: true });
    const snapshot = await p.evaluate(
      () =>
        new Promise<boolean>((resolve) => {
          const req = indexedDB.open("sharwa-courier");
          req.onsuccess = () => {
            const tx = req.result.transaction("kv", "readonly").objectStore("kv").getAllKeys();
            tx.onsuccess = () => resolve((tx.result as string[]).some((k) => String(k).startsWith("snap:noor:shipments")));
            tx.onerror = () => resolve(false);
          };
          req.onerror = () => resolve(false);
        }),
    );
    check(snapshot, "the last loaded list is kept as an IndexedDB snapshot");
    await p.context().setOffline(false);
    await p.waitForSelector("[data-testid=queue-badge]", { state: "detached", timeout: 15_000 });
    const after = (await api(p, "GET", `/api/bff/agent/shipments/${pick.id}`)).json as { status: string };
    check(after.status === "in_transit", "reconnect → the queue replays and the server applied the action");
  } else check(false, "a picked_up shipment exists for the offline test");

  // ── custody ──────────────────────────────────────────────────────────────────────
  await p.goto(`${NOOR}/agent/custody`, { waitUntil: "load" });
  await p.waitForSelector("[data-testid=custody-entry]");
  const reversed = p.locator("[data-testid=custody-entry][data-type=reversed]").first();
  check((await reversed.count()) === 1 && (await reversed.locator(".text-warning").count()) > 0 && ((await reversed.textContent()) ?? "").includes("يعكس الحركة"), "a reversed entry is amber and points at its original");

  // ── SC-38.3: every target ≥ 48px at 390px ────────────────────────────────────────
  for (const path of ["/agent", "/agent/shipments", `/agent/shipments/${t1.id}`, "/agent/custody", "/agent/queue"]) {
    await p.goto(`${NOOR}${path}`, { waitUntil: "load" });
    await p.waitForTimeout(400);
    const small = await p.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("[data-testid=courier-shell] a, [data-testid=courier-shell] button, [data-testid=courier-shell] input, [data-testid=courier-shell] select")]
        .filter((el) => el.offsetParent !== null && el.getAttribute("type") !== "hidden")
        .map((el) => ({ el: el.outerHTML.slice(0, 80), r: el.getBoundingClientRect() }))
        .filter((x) => x.r.height < 47.5 || x.r.width < 47.5)
        .map((x) => x.el),
    );
    check(small.length === 0, `${path}: no touch target under 48px${small.length ? ` — ${small.join(" | ")}` : ""}`);
    check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${path}: no horizontal scroll at 390px`);
  }

  // ── visual ───────────────────────────────────────────────────────────────────────
  const dark = await page(browser, { session: "staff", dark: true });
  await dark.goto(`${NOOR}/agent/shipments?status=in_transit`, { waitUntil: "load" });
  await dark.waitForSelector("[data-testid=agent-shipment]");
  await dark.screenshot({ path: join(OUT, "mobile-dark.png"), fullPage: true });
  const tablet = await page(browser, { session: "staff", width: 820 });
  await tablet.goto(`${NOOR}/agent/shipments/${t1.id}`, { waitUntil: "load" });
  await tablet.waitForSelector("[data-testid=agent-shipment-detail]");
  await tablet.screenshot({ path: join(OUT, "tablet.png"), fullPage: true });
  const desktop = await page(browser, { session: "staff", width: 1440 });
  await desktop.goto(`${NOOR}/agent/custody`, { waitUntil: "load" });
  await desktop.waitForSelector("[data-testid=custody-screen]");
  await desktop.screenshot({ path: join(OUT, "desktop.png") });

  await browser.close();
  console.log(consoleErrors.length ? `\nconsole errors:\n${consoleErrors.join("\n")}` : "\n0 console errors");
  const ok = failures.length === 0 && consoleErrors.length === 0;
  console.log(ok ? "\n✓ courier check passed" : `\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
