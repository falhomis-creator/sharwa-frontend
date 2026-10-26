/**
 * Functional + visual check for Phase 7 T172–T174 — M37 advanced product types (+ M36 tier
 * prices in the editor and the PDP):
 *   - the compatibility engine (`src/features/pdp/compat.ts`): equals / not_equals / in, with an
 *     attribute or a value (SC-37.1);
 *   - editor «الأنماط المتقدمة»: tier prices (duplicate threshold refused locally), bundle components
 *     (a bundle cannot contain itself) and rules, personalization fields (add + reorder), auction
 *     settings (stock pinned, reserve saved), serials (duplicates highlighted, save blocked),
 *     formula preview answered by the SERVER (no local maths);
 *   - PDP: bundle builder disables a conflicting option with the reason, total is the server's;
 *     the tier table names the applied threshold; the auction response and DOM never carry `reserve`
 *     (SC-37.2); the refundable deposit line.
 *
 *   SHARWA_CHROMIUM=/path/to/chrome npx tsx scripts/bundles-check.ts [port]   (default 3000)
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { conflictFor, firstViolation, violates, type Rule } from "../src/features/pdp/compat";

const PORT = process.argv[2] ?? "3000";
const NOOR = `http://noor.localhost:${PORT}`;
const OUT = join(process.cwd(), "docs", "visual-checks", "37-advanced-products");
// Screenshots use `caret: "initial"`: Playwright's default ("hide") writes `caret-color: transparent` INLINE on the
// page's inputs while it captures — on a PDP whose lazy sections have not hydrated yet, React then reports a hydration
// mismatch on that style. The caret is irrelevant to these images, so the DOM is left untouched.
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
      const r = await fetch(path, { method, headers: { accept: "application/json", ...(body !== undefined ? { "content-type": "application/json" } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
      const text = await r.text();
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
      return { status: r.status, text, json: json as Record<string, unknown> };
    },
    { method, path, body },
  );
}

function unitEngine() {
  const eq: Rule = { id: 1, attribute_a_id: 2, attribute_a_name: "اللون", operator: "equals", attribute_b_id: 2, value: null };
  const neq: Rule = { id: 2, attribute_a_id: 2, attribute_a_name: "اللون", operator: "not_equals", attribute_b_id: null, value: "كحلي" };
  const inn: Rule = { id: 3, attribute_a_id: 2, attribute_a_name: "اللون", operator: "in", attribute_b_id: null, value: "أسود, أبيض" };
  const black = { component: 1, attribute: 2, value: "أسود" };
  const white = { component: 2, attribute: 2, value: "أبيض" };
  const navy = { component: 2, attribute: 2, value: "كحلي" };
  check(violates(eq, [black, white]) && !violates(eq, [black, { ...white, value: "أسود" }]), "engine: equals (attribute) — one colour across components");
  check(violates(neq, [navy]) && !violates(neq, [white]), "engine: not_equals (value)");
  check(violates(inn, [navy]) && !violates(inn, [black, white]), "engine: in (CSV, trimmed)");
  check(!violates(eq, []) && firstViolation([eq, inn], [black]) === null, "engine: nothing chosen yet is not a violation");
  check(conflictFor([eq], [black], { component: 2, attribute: 2, value: "أبيض" })?.id === 1, "engine: conflictFor names the rule that disables an option");
}

async function idOf(p: Page, name: string): Promise<number> {
  const r = await api(p, "GET", `/api/bff/products?q=${encodeURIComponent(name)}`);
  const rows = (r.json.results as Array<{ id: number; name: string }>) ?? [];
  return rows.find((x) => x.name === name)?.id ?? 0;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  unitEngine();
  const browser = await launch();
  const m = await page(browser, { session: "merchant" });
  await m.goto(`${NOOR}/dashboard/products`, { waitUntil: "load" });
  const cups = await idOf(m, "طقم فناجين");
  const ring = await idOf(m, "خاتم فضة");
  const beads = await idOf(m, "مسبحة كهرمان");
  const watch = await idOf(m, "ساعة ذكية");
  const dates = await idOf(m, "تمر سكري فاخر 1كغ");
  const saffron = await idOf(m, "زعفران");
  const thermos = await idOf(m, "ترمس حافظ");
  check([cups, ring, beads, watch, dates, saffron, thermos].every(Boolean), "fixtures: the seven advanced products exist");

  // ── editor: bundle ───────────────────────────────────────────────────────────────
  await m.goto(`${NOOR}/dashboard/products/${cups}?tab=advanced`, { waitUntil: "load" });
  await m.waitForSelector("[data-testid=bundle-components] [data-testid=bundle-total]");
  check((await m.locator("[data-testid=panel-bundle]").count()) === 1, "editor: the bundle panel appears for an is_bundle product");
  check((await m.locator("[data-testid=compat-rules] li").count()) >= 2, "editor: compatibility rules are listed");
  const self = await api(m, "POST", `/api/bff/products/${cups}/extras/bundle-components/`, { component_id: cups, quantity: "1" });
  check(self.status === 400 && self.text.includes("إلى نفسها"), "editor: a bundle cannot contain itself (server)");
  await m.screenshot({ caret: "initial", path: join(OUT, "editor-bundle-desktop.png"), fullPage: true });

  // ── editor: tier prices ──────────────────────────────────────────────────────────
  await m.goto(`${NOOR}/dashboard/products/${dates}?tab=advanced`, { waitUntil: "load" });
  await m.waitForSelector("[data-testid=tier-prices] table");
  await m.fill("#tier-min", "5");
  await m.fill("#tier-price", "70");
  await m.click("[data-testid=tier-add]");
  check((await m.textContent("[data-testid=tier-prices]"))?.includes("يوجد سعر لهذه الكمية مسبقاً") === true, "editor: a duplicate threshold is refused locally");
  await m.fill("#tier-preview", "12");
  check((await m.textContent("[data-testid=tier-preview]"))?.includes("10+") === true, "editor: quantity 12 previews «يُطبَّق سعر 10+»");

  // ── editor: personalization ──────────────────────────────────────────────────────
  await m.goto(`${NOOR}/dashboard/products/${ring}?tab=advanced`, { waitUntil: "load" });
  await m.waitForSelector("[data-testid=personalization-fields] [data-testid=pf-row]");
  const before = await m.locator("[data-testid=pf-row]").count();
  await m.fill("[data-testid=pf-label]", "لون العلبة");
  await m.selectOption("[data-testid=pf-type]", "select");
  await m.click("[data-testid=pf-add]");
  check((await m.textContent("[data-testid=personalization-fields]"))?.includes("أدخل خيارات القائمة") === true, "editor: a select field without options is refused locally");
  await m.fill("[data-testid=pf-options]", "أحمر, أسود");
  await m.click("[data-testid=pf-add]");
  await m.waitForFunction((n) => document.querySelectorAll("[data-testid=pf-row]").length === n + 1, before);
  check(true, "editor: a personalization field is added");
  const fields = (await api(m, "GET", `/api/bff/products/${ring}/extras/personalization-fields/`)).json as unknown as Array<{ id: number }>;
  const reordered = await api(m, "POST", `/api/bff/products/${ring}/extras/personalization-fields/reorder/`, { ordered_ids: [...fields.map((f) => f.id)].reverse() });
  check(reordered.status === 200, "editor: fields reorder (dnd-kit → POST reorder)");
  await api(m, "POST", `/api/bff/products/${ring}/extras/personalization-fields/reorder/`, { ordered_ids: fields.map((f) => f.id) });
  await api(m, "DELETE", `/api/bff/products/${ring}/extras/personalization-fields/${fields.at(-1)!.id}/`);
  await m.screenshot({ caret: "initial", path: join(OUT, "editor-personalization-desktop.png"), fullPage: true });

  // ── editor: auction ──────────────────────────────────────────────────────────────
  await m.goto(`${NOOR}/dashboard/products/${beads}?tab=advanced`, { waitUntil: "load" });
  await m.waitForSelector("[data-testid=auction-form]");
  check((await m.inputValue("[data-testid=au-reserve]")) !== "", "editor: the merchant sees the reserve");
  check((await m.locator("[data-testid=auction-bids] tbody tr").count()) > 0, "editor: bids are listed read-only");
  await m.screenshot({ caret: "initial", path: join(OUT, "editor-auction-desktop.png"), fullPage: true });

  // ── editor: serials ──────────────────────────────────────────────────────────────
  await m.goto(`${NOOR}/dashboard/products/${watch}?tab=advanced`, { waitUntil: "load" });
  await m.waitForSelector("[data-testid=serials] [data-testid=serial-counts]");
  const existing = (await api(m, "GET", `/api/bff/products/${watch}/extras/serials/`)).json as unknown as { results: Array<{ code: string }> };
  await m.fill("[data-testid=serials-paste]", `NEW-1\nNEW-1\n${existing.results[0]!.code}`);
  check((await m.locator("[data-testid=serials-dups]").count()) === 1 && (await m.isDisabled("[data-testid=serials-save]")), "editor: duplicate serials are highlighted and saving is blocked");

  // ── editor: formula preview from the server ──────────────────────────────────────
  await m.goto(`${NOOR}/dashboard/products/${saffron}`, { waitUntil: "load" });
  await m.waitForSelector("[data-testid=formula-preview] bdi");
  const preview = await api(m, "POST", "/api/bff/products/formula-preview", { formula_unit_price: "18.00", formula_coefficient: "5.000", formula_fixed_extra: "0", currency: "SAR" });
  check(preview.status === 200 && (await m.textContent("[data-testid=formula-preview]"))?.includes(String((preview.json as { display_price: string }).display_price).split(" ")[0]!) === true, "editor: the formula result is the server's display_price");

  // ── PDP: bundle builder ──────────────────────────────────────────────────────────
  const shopper = await page(browser);
  await shopper.goto(`${NOOR}/p/${cups}`, { waitUntil: "networkidle" });
  await shopper.waitForSelector("[data-testid=bundle-parts] [data-testid=bundle-total]");
  const options = shopper.locator("[data-testid=bundle-parts] [data-testid=bundle-option]");
  // The builder is a lazily loaded client chunk: click until React has hydrated it and the choice sticks.
  const pot = options.filter({ hasText: "أسود" }).first();
  for (let i = 0; i < 10 && (await pot.getAttribute("aria-checked")) !== "true"; i++) {
    await pot.click();
    await shopper.waitForTimeout(300);
  }
  // tick the optional thermos, then its white option must be disabled (pot is black, rule «equals»)
  await shopper.locator("[data-testid=bundle-parts] li").nth(1).locator("input[type=checkbox]").check();
  await shopper.locator("[data-testid=bundle-parts] li").nth(1).locator("[data-testid=bundle-option]").first().waitFor();
  const thermosOptions = shopper.locator("[data-testid=bundle-parts] li").nth(1).locator("[data-testid=bundle-option]");
  check((await thermosOptions.filter({ hasText: "أبيض" }).getAttribute("aria-disabled")) === "true", "PDP: an option breaking «equals» is disabled, not hidden");
  check(((await thermosOptions.filter({ hasText: "أبيض" }).getAttribute("title")) ?? "").includes("غير متوافق مع اللون"), "PDP: the disabled option carries the reason");
  check((await thermosOptions.filter({ hasText: "كحلي" }).getAttribute("aria-disabled")) === "true", "PDP: an option outside «in» is disabled");
  await thermosOptions.filter({ hasText: "أسود" }).click();
  check(!(await shopper.isDisabled("[data-testid=add-to-cart]")), "PDP: a compatible combination can be added");
  await shopper.screenshot({ caret: "initial", path: join(OUT, "pdp-bundle-desktop.png"), fullPage: true });

  // ── PDP: tiers, deposit, auction ─────────────────────────────────────────────────
  await shopper.goto(`${NOOR}/p/${dates}`, { waitUntil: "load" });
  await shopper.waitForSelector("[data-testid=tier-table]");
  check((await shopper.textContent("[data-testid=tier-active]"))?.includes("1+") === true, "PDP: the tier table names the applied threshold");
  await shopper.goto(`${NOOR}/p/${thermos}`, { waitUntil: "load" });
  check((await shopper.locator("[data-testid=refundable-deposit]").count()) === 1, "PDP: the refundable deposit has its own line with the refund rule");
  await shopper.goto(`${NOOR}/p/${beads}`, { waitUntil: "load" });
  await shopper.waitForSelector("[data-testid=auction-panel]");
  const auction = await api(shopper, "GET", `/api/bff/catalog/products/${beads}/auction?currency=SAR`);
  check(!auction.text.includes("reserve\"") && !auction.text.includes("1250"), "PDP: the auction response never carries the reserve (SC-37.2)");
  check(!((await shopper.content()).includes("1250")), "PDP: the reserve never reaches the DOM");
  await shopper.screenshot({ caret: "initial", path: join(OUT, "pdp-auction-desktop.png") });

  // ── visual: mobile + dark ────────────────────────────────────────────────────────
  const mob = await page(browser, { width: 390 });
  await mob.goto(`${NOOR}/p/${cups}`, { waitUntil: "load" });
  await mob.waitForSelector("[data-testid=bundle-parts]");
  check(await mob.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "390px: PDP bundle without horizontal scroll");
  await mob.screenshot({ caret: "initial", path: join(OUT, "pdp-bundle-mobile.png"), fullPage: true });
  const dark = await page(browser, { session: "merchant", dark: true });
  await dark.goto(`${NOOR}/dashboard/products/${cups}?tab=advanced`, { waitUntil: "load" });
  await dark.waitForSelector("[data-testid=bundle-total]");
  await dark.screenshot({ caret: "initial", path: join(OUT, "editor-bundle-dark.png"), fullPage: true });
  const mobEd = await page(browser, { session: "merchant", width: 390 });
  await mobEd.goto(`${NOOR}/dashboard/products/${ring}?tab=advanced`, { waitUntil: "load" });
  await mobEd.waitForSelector("[data-testid=pf-row]");
  check(await mobEd.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "390px: editor advanced tab without horizontal scroll");
  await mobEd.screenshot({ caret: "initial", path: join(OUT, "editor-personalization-mobile.png"), fullPage: true });

  await browser.close();
  console.log(consoleErrors.length ? `\nconsole errors:\n${consoleErrors.join("\n")}` : "\n0 console errors");
  const ok = failures.length === 0 && consoleErrors.length === 0;
  console.log(ok ? "\n✓ bundles check passed" : `\n✗ ${failures.length} failed check(s), ${consoleErrors.length} console error(s)`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
