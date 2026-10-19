import { addDecimal, compareDecimal, isDecimal, mulDecimal, percentOf, subDecimal } from "@/lib/decimal";
import type { MockResult } from "@/lib/bff/mock-route";
import { maskPhone } from "@/lib/format";
import type { Session } from "@/features/dashboard-shell/schemas";
import { displayMoney, type Currency } from "@/mocks/_fixtures";
import { FIXTURE_NOW, storeState } from "@/mocks/store-state";
import { catalog } from "@/mocks/catalog/state";
import { effectivePrice, toVariant } from "@/mocks/catalog/products";
import type { MockProduct } from "@/mocks/catalog/seed";
import { locationsState } from "@/mocks/locations/state";
import { approvalsState, createApproval } from "@/mocks/approvals/state";
import { insertStorefrontOrder } from "@/mocks/orders/state";
import { MOCK_OTP_CODE } from "@/mocks/dashboard/auth";
import { storeNameFor } from "@/mocks/dashboard/me";

/**
 * M16 POS fixture state (`[NEEDS BACKEND]`, §7). Mirrors the Django rules of discovery 02
 * §10: ONE open shift per register, `expected_closing` and `variance` computed by the
 * server, a shortage parks the shift at `pending_manager_approval` with an
 * `ApprovalRequest(shift_shortage)` in the SAME approvals queue M18 shows, a discount over
 * the role's `max_discount_percent` needs a manager (code on the device, or a
 * `discount_exception` approval), a large refund needs an OTP step-up (428).
 *
 * A completed sale is a real M06 order (`sales_channel=pos`, paid, completed) and takes the
 * stock off the M04/M21 product — one source of truth, no parallel POS ledger.
 */

/** Mock-only: the manager code typed on the cashier's device (US-16.3.1 «يُدخل المدير رمزه»). */
export const MOCK_MANAGER_CODE = "2468";
/** Mock-only threshold over which a refund needs an OTP (the server decides — §10). */
export const LARGE_REFUND_THRESHOLD = "200.00";
const OTP_MAX_ATTEMPTS = 3;

type Body = Record<string, unknown>;
type MovementType = "sale" | "cash_in" | "cash_out" | "refund" | "rounding_adjustment";

interface Actor {
  /** M18 staff id; `null` = the owner. */
  id: number | null;
  name: string;
  /** Location ids this actor may sell at (M22 assignments; all POS locations for the owner). */
  locations: number[];
  maxDiscount: string | null;
  canDiscount: boolean;
  canRefund: boolean;
  canResolve: boolean;
}

interface MockRegister {
  id: number;
  name: string;
  location_id: number;
  is_active: boolean;
}

interface MockMovement {
  id: number;
  movement_type: MovementType;
  amount: string;
  note: string;
  order_id: number | null;
  actor: string;
  created_at: string;
}

interface MockShift {
  id: number;
  register_id: number;
  staff_id: number | null;
  staff_name: string;
  status: "open" | "pending_manager_approval" | "closed" | "force_closed";
  opening_float: string;
  actual_closing: string | null;
  opened_at: string;
  closed_at: string | null;
  approval_id: number | null;
  version: number;
  movements: MockMovement[];
  /** The cashier has seen the force-close notice (US-16.4.4). */
  notice_seen: boolean;
}

interface MockReceiptLine {
  product_id: number;
  variant_id: number | null;
  name: string;
  variant_label: string | null;
  sku: string;
  quantity: number;
  unit_price: string;
  discount_percent: string | null;
  line_total: string;
}

interface MockReceipt {
  id: number;
  number: string;
  shift_id: number;
  register_id: number;
  cashier: string;
  created_at: string;
  payment_method: "cash" | "sharwa_pay";
  currency: Currency;
  lines: MockReceiptLine[];
  subtotal: string;
  discount: string;
  total: string;
  refunded: string;
  approval_id: number | null;
}

interface PosState {
  registers: MockRegister[];
  shifts: MockShift[];
  receipts: MockReceipt[];
  idempotency: Map<string, { kind: "order" | "movement"; id: number }>;
  otpFailures: Map<number, number>;
  ids: { shift: number; movement: number };
}

const iso = (msAgo: number) => new Date(FIXTURE_NOW - msAgo).toISOString();
const now = () => new Date(Math.max(Date.now(), FIXTURE_NOW + 1000)).toISOString();
const H = 3_600_000;

function seed(): PosState {
  return {
    registers: [
      { id: 1, name: "كاشير 1", location_id: 2, is_active: true },
      { id: 2, name: "كاشير 2", location_id: 2, is_active: true },
      { id: 3, name: "الكاشير الرئيسي", location_id: 3, is_active: true },
      { id: 4, name: "كاشير المعرض (معطّل)", location_id: 2, is_active: false },
    ],
    shifts: [
      // Register 2 is busy: another cashier's open shift (US-16.1 Independent Test).
      {
        id: 91,
        register_id: 2,
        staff_id: 7,
        staff_name: "خالد الشهري",
        status: "open",
        opening_float: "300.00",
        actual_closing: null,
        opened_at: iso(3 * H),
        closed_at: null,
        approval_id: null,
        version: 1,
        movements: [
          { id: 501, movement_type: "sale", amount: "89.00", note: "إيصال POS-0091-001", order_id: null, actor: "خالد الشهري", created_at: iso(2.5 * H) },
          { id: 502, movement_type: "cash_out", amount: "50.00", note: "شراء أكياس", order_id: null, actor: "خالد الشهري", created_at: iso(2 * H) },
        ],
        notice_seen: true,
      },
      // Yesterday's shift of «سارة الحربي» on register 1, force-closed by the system (US-16.4.4).
      {
        id: 88,
        register_id: 1,
        staff_id: 2,
        staff_name: "سارة الحربي",
        status: "force_closed",
        opening_float: "200.00",
        actual_closing: null,
        opened_at: iso(30 * H),
        closed_at: iso(14 * H),
        approval_id: null,
        version: 2,
        movements: [{ id: 401, movement_type: "sale", amount: "145.00", note: "إيصال POS-0088-001", order_id: null, actor: "سارة الحربي", created_at: iso(29 * H) }],
        notice_seen: false,
      },
    ],
    receipts: [],
    idempotency: new Map(),
    otpFailures: new Map(),
    ids: { shift: 100, movement: 1000 },
  };
}

export function posState(store: string | null): PosState {
  return storeState(store, "pos", seed);
}

/** Mock-only: back to the seed (the functional check calls it so reruns start equal). */
export function resetPosState(store: string | null) {
  Object.assign(posState(store), seed());
}

// ── who is selling ──────────────────────────────────────────────────────────────────

/** POS locations: `has_pos_terminal` and active (M22). */
function posLocations(store: string | null) {
  return locationsState(store).locations.filter((l) => l.is_active && l.flags.has_pos_terminal);
}

/**
 * The session → the POS actor. Staff are matched to the M18/M22 seeds by role, because the
 * mock session carries no staff id: «كاشير» = staff #2 (assigned to location 2), «مدير
 * المتجر» = staff #4 (location 3). The owner sells anywhere with no discount ceiling.
 */
export function actorOf(store: string | null, session: Session): Actor {
  const pos = posLocations(store).map((l) => l.id);
  if (session.kind === "merchant") {
    return { id: null, name: "مالك المتجر", locations: pos, maxDiscount: null, canDiscount: true, canRefund: true, canResolve: true };
  }
  const perms = session.staff?.permissions ?? [];
  const isManager = (session.staff?.roles ?? []).includes("مدير المتجر");
  const id = isManager ? 4 : 2;
  const assigned = locationsState(store).assignments.filter((a) => a.staff_id === id).map((a) => a.location_id);
  return {
    id,
    name: session.staff?.full_name ?? "موظف",
    locations: pos.filter((l) => assigned.includes(l)),
    maxDiscount: session.staff?.max_discount_percent ?? "0.00",
    canDiscount: perms.includes("discounts.apply"),
    canRefund: perms.includes("orders.refund"),
    canResolve: perms.includes("staff.manage"),
  };
}

function locationName(store: string | null, id: number): string {
  return locationsState(store).locations.find((l) => l.id === id)?.name ?? `موقع #${id}`;
}

function register(store: string | null, id: number) {
  return posState(store).registers.find((r) => r.id === id);
}

function registerRef(store: string | null, r: MockRegister) {
  return { id: r.id, name: r.name, location: { id: r.location_id, name: locationName(store, r.location_id) } };
}

// ── shifts ──────────────────────────────────────────────────────────────────────────

function sum(ms: MockMovement[], type: MovementType): string {
  return ms.filter((m) => m.movement_type === type).reduce((acc, m) => addDecimal(acc, m.amount), "0.00");
}

function expected(s: MockShift): string {
  const m = s.movements;
  return addDecimal(subDecimal(subDecimal(addDecimal(addDecimal(s.opening_float, sum(m, "sale")), sum(m, "cash_in")), sum(m, "refund")), sum(m, "cash_out")), sum(m, "rounding_adjustment"));
}

const DIRECTION: Record<MovementType, "in" | "out"> = { sale: "in", cash_in: "in", rounding_adjustment: "in", refund: "out", cash_out: "out" };

/** An approval decided from the M18 queue settles the shift (one queue, two screens). */
function syncApproval(store: string | null, s: MockShift) {
  if (s.status !== "pending_manager_approval" || s.approval_id === null) return;
  const a = approvalsState(store).items.find((x) => x.id === s.approval_id);
  if (a && a.status !== "pending") {
    s.status = "closed";
    s.closed_at = a.decided_at ?? now();
    s.version += 1;
  }
}

export function shiftView(store: string | null, s: MockShift) {
  syncApproval(store, s);
  const r = register(store, s.register_id)!;
  const exp = expected(s);
  const variance = s.actual_closing === null ? null : subDecimal(s.actual_closing, exp);
  const approval = s.approval_id === null ? null : (approvalsState(store).items.find((a) => a.id === s.approval_id) ?? null);
  const money = (v: string) => displayMoney(Number(v));
  return {
    id: s.id,
    status: s.status,
    version: s.version,
    register: registerRef(store, r),
    staff_name: s.staff_name,
    opened_at: s.opened_at,
    closed_at: s.closed_at,
    display_opening_float: money(s.opening_float),
    display_cash_sales: money(sum(s.movements, "sale")),
    display_refunds: money(sum(s.movements, "refund")),
    display_cash_in: money(sum(s.movements, "cash_in")),
    display_cash_out: money(sum(s.movements, "cash_out")),
    display_rounding: money(sum(s.movements, "rounding_adjustment")),
    display_expected_closing: money(exp),
    display_actual_closing: s.actual_closing === null ? null : money(s.actual_closing),
    display_variance: variance === null ? null : `${compareDecimal(variance, "0") > 0 ? "+" : ""}${money(variance)}`,
    variance_kind: variance === null ? null : compareDecimal(variance, "0") < 0 ? ("shortage" as const) : compareDecimal(variance, "0") > 0 ? ("overage" as const) : ("none" as const),
    sales_count: s.movements.filter((m) => m.movement_type === "sale").length,
    approval: approval ? { id: approval.id, status: approval.status, note: approval.note } : null,
    movements: [...s.movements]
      .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
      .map((m) => ({
        id: m.id,
        movement_type: m.movement_type,
        direction: DIRECTION[m.movement_type],
        display_amount: `${DIRECTION[m.movement_type] === "in" ? "+" : "−"}${money(m.amount)}`,
        note: m.note,
        order_id: m.order_id,
        actor: m.actor,
        created_at: m.created_at,
      })),
  };
}

function myLiveShift(store: string | null, actor: Actor): MockShift | undefined {
  return posState(store).shifts.find((s) => s.staff_id === actor.id && (s.status === "open" || s.status === "pending_manager_approval"));
}

export function posContext(store: string | null, actor: Actor) {
  const forced = posState(store).shifts.find((s) => s.staff_id === actor.id && s.status === "force_closed" && !s.notice_seen);
  return {
    staff_name: actor.name,
    locations: actor.locations.map((id) => ({ id, name: locationName(store, id) })),
    max_discount_percent: actor.maxDiscount,
    can_discount: actor.canDiscount,
    can_refund: actor.canRefund,
    can_resolve_variance: actor.canResolve,
    force_closed_notice: forced ? { shift_id: forced.id, register_name: register(store, forced.register_id)?.name ?? "", closed_at: forced.closed_at ?? forced.opened_at } : null,
  };
}

export function listRegisters(store: string | null, actor: Actor, params: URLSearchParams): MockResult<unknown[]> {
  const location = Number(params.get("location"));
  if (!actor.locations.length) return { ok: true, data: [] };
  if (location && !actor.locations.includes(location)) return { ok: false, status: 403, body: { detail: "لست معيَّناً على هذا الموقع." } };
  const state = posState(store);
  const rows = state.registers
    .filter((r) => (location ? r.location_id === location : actor.locations.includes(r.location_id)))
    // An inactive register is listed only while it still carries an open shift (§8).
    .filter((r) => r.is_active || state.shifts.some((s) => s.register_id === r.id && s.status === "open"))
    .map((r) => {
      const open = state.shifts.find((s) => s.register_id === r.id && (s.status === "open" || s.status === "pending_manager_approval"));
      return {
        ...registerRef(store, r),
        is_active: r.is_active,
        open_shift: open ? { id: open.id, staff_name: open.staff_name, opened_at: open.opened_at, is_mine: open.staff_id === actor.id } : null,
      };
    });
  return { ok: true, data: rows };
}

export function currentShift(store: string | null, actor: Actor) {
  const s = myLiveShift(store, actor);
  return { shift: s ? shiftView(store, s) : null };
}

export function openShift(store: string | null, actor: Actor, body: Body): MockResult<ReturnType<typeof shiftView>> {
  const state = posState(store);
  const r = register(store, Number(body.register_id));
  if (!r || !actor.locations.includes(r.location_id)) return { ok: false, status: 404, body: { detail: "جهاز الكاش غير موجود." } };
  if (!r.is_active) return { ok: false, status: 400, body: { detail: "جهاز الكاش معطّل ولا يمكن فتح وردية جديدة عليه." } };
  const mine = myLiveShift(store, actor);
  if (mine) {
    if (mine.register_id === r.id) return { ok: true, data: shiftView(store, mine) };
    return { ok: false, status: 409, body: { detail: `لديك وردية قائمة على «${register(store, mine.register_id)?.name}».` } };
  }
  const busy = state.shifts.find((s) => s.register_id === r.id && (s.status === "open" || s.status === "pending_manager_approval"));
  if (busy) return { ok: false, status: 409, body: { detail: `الجهاز مشغول بوردية ${busy.staff_name}.` } };
  const float = typeof body.opening_float === "string" ? body.opening_float.trim() : "";
  if (!isDecimal(float)) return { ok: false, status: 400, body: { opening_float: ["أدخل الرصيد الافتتاحي (مثال: 200.00)."] } };
  for (const s of state.shifts) if (s.staff_id === actor.id && s.status === "force_closed") s.notice_seen = true;
  const shift: MockShift = {
    id: ++state.ids.shift,
    register_id: r.id,
    staff_id: actor.id,
    staff_name: actor.name,
    status: "open",
    opening_float: float,
    actual_closing: null,
    opened_at: now(),
    closed_at: null,
    approval_id: null,
    version: 1,
    movements: [],
    notice_seen: true,
  };
  state.shifts.push(shift);
  return { ok: true, status: 201, data: shiftView(store, shift) };
}

function ownShift(store: string | null, actor: Actor, id: number): MockShift | MockResult<never> {
  const s = posState(store).shifts.find((x) => x.id === id);
  if (!s || s.staff_id !== actor.id) return { ok: false, status: 404, body: { detail: "الوردية غير موجودة." } };
  return s;
}

const isResult = (v: unknown): v is MockResult<never> => typeof v === "object" && v !== null && "ok" in v;

export function addMovement(store: string | null, actor: Actor, id: number, body: Body, key: string | null): MockResult<ReturnType<typeof shiftView>> {
  const state = posState(store);
  const s = ownShift(store, actor, id);
  if (isResult(s)) return s;
  if (key && state.idempotency.has(key)) return { ok: true, data: shiftView(store, s) };
  if (s.status !== "open") return { ok: false, status: 409, body: { detail: "الوردية ليست مفتوحة." } };
  const type = body.movement_type;
  if (type !== "cash_in" && type !== "cash_out") return { ok: false, status: 400, body: { movement_type: ["اختر إدخال نقد أو سحب نقد."] } };
  const amount = typeof body.amount === "string" ? body.amount.trim() : "";
  if (!isDecimal(amount) || compareDecimal(amount, "0") <= 0) return { ok: false, status: 400, body: { amount: ["أدخل مبلغاً أكبر من صفر."] } };
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (!note) return { ok: false, status: 400, body: { note: ["اذكر سبب الحركة."] } };
  if (type === "cash_out" && compareDecimal(amount, expected(s)) > 0) return { ok: false, status: 400, body: { amount: ["المبلغ أكبر من النقد المتوقع في الدرج."] } };
  const m: MockMovement = { id: ++state.ids.movement, movement_type: type, amount, note, order_id: null, actor: actor.name, created_at: now() };
  s.movements.push(m);
  if (key) state.idempotency.set(key, { kind: "movement", id: m.id });
  return { ok: true, status: 201, data: shiftView(store, s) };
}

export function closeShift(store: string | null, actor: Actor, id: number, body: Body) {
  const s = ownShift(store, actor, id);
  if (isResult(s)) return s;
  if (s.status !== "open") return { ok: false as const, status: 409, body: { detail: "الوردية ليست مفتوحة." } };
  const actual = typeof body.actual_closing === "string" ? body.actual_closing.trim() : "";
  if (!isDecimal(actual)) return { ok: false as const, status: 400, body: { actual_closing: ["أدخل المبلغ المعدود فعلياً (مثال: 1250.00)."] } };
  s.actual_closing = actual;
  s.closed_at = now();
  s.version += 1;
  const variance = subDecimal(actual, expected(s));
  if (compareDecimal(variance, "0") < 0) {
    s.status = "pending_manager_approval";
    const a = createApproval(store, {
      request_type: "shift_shortage",
      requester_id: actor.id,
      requester_name: actor.name,
      approver_role: "مدير الفرع",
      payload: { shift_id: s.id, display_amount: displayMoney(Math.abs(Number(variance))) },
      summary: `عجز ${displayMoney(Math.abs(Number(variance)))} في وردية #${s.id}`,
      entity: { kind: "shift", id: s.id, label: `وردية #${s.id}`, available: true },
    });
    s.approval_id = a.id;
  } else {
    s.status = "closed";
  }
  const view = shiftView(store, s);
  return { ok: true as const, data: { status: view.status, display_variance: view.display_variance ?? displayMoney(0), approval_id: s.approval_id, shift: view } };
}

export function resolveVariance(store: string | null, actor: Actor, id: number, body: Body): MockResult<ReturnType<typeof shiftView>> {
  if (!actor.canResolve) return { ok: false, status: 403, body: { detail: "حلّ فرق الوردية لمدير الفرع أو مالك المتجر." } };
  const s = posState(store).shifts.find((x) => x.id === id);
  if (!s) return { ok: false, status: 404, body: { detail: "الوردية غير موجودة." } };
  if (!actor.locations.includes(register(store, s.register_id)?.location_id ?? -1)) return { ok: false, status: 403, body: { detail: "هذه الوردية في موقع لست معيَّناً عليه." } };
  syncApproval(store, s);
  if (s.status !== "pending_manager_approval") return { ok: false, status: 409, body: { detail: "حُسم فرق هذه الوردية من مستخدم آخر.", version: s.version } };
  if (Number(body.version) !== s.version) return { ok: false, status: 409, body: { detail: "تغيّرت الوردية، أعد التحميل.", version: s.version } };
  if (s.staff_id !== null && s.staff_id === actor.id) return { ok: false, status: 403, body: { detail: "لا يمكنك اعتماد عجز ورديتك." } };
  if (body.decision !== "approved" && body.decision !== "rejected") return { ok: false, status: 400, body: { decision: ["القرار يجب أن يكون approved أو rejected."] } };
  const a = approvalsState(store).items.find((x) => x.id === s.approval_id);
  if (a && a.status === "pending") {
    a.status = body.decision;
    a.decided_by = actor.name;
    a.decided_at = now();
    a.note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
    a.version += 1;
  }
  s.status = "closed";
  s.version += 1;
  return { ok: true, data: shiftView(store, s) };
}

/** The register's live shift for a manager resolving on the cashier's device. */
export function pendingShifts(store: string | null, actor: Actor) {
  if (!actor.canResolve) return [];
  return posState(store)
    .shifts.filter((s) => {
      syncApproval(store, s);
      return s.status === "pending_manager_approval" && actor.locations.includes(register(store, s.register_id)?.location_id ?? -1);
    })
    .map((s) => shiftView(store, s));
}

// ── products ────────────────────────────────────────────────────────────────────────

function sellable(p: MockProduct): boolean {
  return !p.archived_at && p.is_available && !p.is_bookable && !p.is_auction;
}

function productView(store: string | null, p: MockProduct) {
  const state = catalog(store);
  const variants = state.variants.filter((v) => v.product_id === p.id).map((v) => toVariant(state, p, v));
  const stock = variants.length ? variants.reduce((acc, v) => addDecimal(acc, v.stock, 3), "0.000") : p.stock;
  return {
    id: p.id,
    name: p.name,
    name_en: p.name_en,
    sku: p.sku,
    barcode: p.barcode,
    image: p.image_url || p.images[0]?.url || null,
    display_price: displayMoney(Number(effectivePrice(p)), p.currency),
    stock,
    out_of_stock: !p.allow_backorder && compareDecimal(stock, "0") <= 0,
    has_variants: variants.length > 0,
    variants: variants.map((v) => ({ id: v.id, label: v.label, sku: v.sku, display_price: v.display_effective_price, stock: v.stock, out_of_stock: !p.allow_backorder && compareDecimal(v.stock, "0") <= 0 })),
    min_quantity: p.min_quantity,
    max_quantity: p.max_quantity,
    is_serialized: p.is_serialized,
  };
}

export function searchProducts(store: string | null, params: URLSearchParams) {
  const state = catalog(store);
  const barcode = (params.get("barcode") ?? "").trim();
  const q = (params.get("q") ?? "").trim().toLowerCase();
  const all = state.products.filter(sellable);
  if (barcode) {
    const p = all.find((x) => x.barcode && x.barcode === barcode);
    if (p) return { results: [productView(store, p)], exact: { product_id: p.id, variant_id: null } };
    const v = state.variants.find((x) => x.sku === barcode);
    const vp = v ? all.find((x) => x.id === v.product_id) : undefined;
    if (v && vp) return { results: [productView(store, vp)], exact: { product_id: vp.id, variant_id: v.id } };
    return { results: [], exact: null };
  }
  const hits = q
    ? all.filter((p) => p.name.toLowerCase().includes(q) || p.name_en.toLowerCase().includes(q) || p.sku.toLowerCase() === q || p.sku.toLowerCase().includes(q) || p.barcode === q)
    : all;
  // Exact SKU/barcode first (FR-16.03), then by name.
  hits.sort((a, b) => Number(b.sku.toLowerCase() === q || b.barcode === q) - Number(a.sku.toLowerCase() === q || a.barcode === q) || a.name.localeCompare(b.name, "ar"));
  const size = Math.min(100, Math.max(1, Number(params.get("page_size")) || 24));
  return { results: hits.slice(0, size).map((p) => productView(store, p)), exact: null };
}

// ── pricing (the server-side running total) ─────────────────────────────────────────

interface PricedLine extends MockReceiptLine {
  error: string | null;
  currency: Currency;
}

function percent(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v).trim();
  return isDecimal(s) && compareDecimal(s, "100") <= 0 ? s : "invalid";
}

function price(store: string | null, body: Body) {
  const state = catalog(store);
  const items = Array.isArray(body.items) ? (body.items as Body[]) : [];
  const lines: PricedLine[] = [];
  let maxPct = "0";
  for (const it of items) {
    const p = state.products.find((x) => x.id === Number(it.product_id));
    if (!p || !sellable(p)) continue;
    const variantId = it.variant_id === null || it.variant_id === undefined ? null : Number(it.variant_id);
    const v = variantId === null ? undefined : state.variants.find((x) => x.id === variantId && x.product_id === p.id);
    const qty = Math.max(1, Math.floor(Number(it.quantity) || 1));
    const unit = v ? addDecimal(effectivePrice(p), v.extra_price) : effectivePrice(p);
    const pct = percent(it.discount_percent);
    let error: string | null = null;
    if (pct === "invalid") error = "نسبة خصم غير صحيحة.";
    const stock = v ? v.stock : p.stock;
    if (p.min_quantity && qty < p.min_quantity) error = `الحد الأدنى للكمية ${p.min_quantity}.`;
    if (p.max_quantity && qty > p.max_quantity) error = `الحد الأقصى للكمية ${p.max_quantity}.`;
    if (p.is_serialized && qty > 1) error = "منتج بأرقام تسلسلية: أضِف كل قطعة سطراً مستقلاً.";
    if (!p.allow_backorder && compareDecimal(String(qty), stock) > 0) error = "الكمية أكبر من المتوفر في هذا الفرع.";
    if (!v && state.variants.some((x) => x.product_id === p.id)) error = "اختر المتغير.";
    const gross = mulDecimal(unit, String(qty));
    const linePct = pct && pct !== "invalid" ? pct : null;
    if (linePct && compareDecimal(linePct, maxPct) > 0) maxPct = linePct;
    const line_total = linePct ? subDecimal(gross, percentOf(gross, linePct)) : gross;
    lines.push({
      product_id: p.id,
      variant_id: v?.id ?? null,
      name: p.name,
      variant_label: v ? toVariant(state, p, v).label : null,
      sku: v?.sku ?? p.sku,
      quantity: qty,
      unit_price: unit,
      discount_percent: linePct,
      line_total,
      error,
      currency: p.currency,
    });
  }
  const subtotal = lines.reduce((acc, l) => addDecimal(acc, l.line_total), "0.00");
  const cartPct = percent(body.cart_discount_percent);
  const cartPctOk = cartPct && cartPct !== "invalid" ? cartPct : null;
  if (cartPctOk && compareDecimal(cartPctOk, maxPct) > 0) maxPct = cartPctOk;
  const discount = cartPctOk ? percentOf(subtotal, cartPctOk) : "0.00";
  const lineDiscount = lines.reduce((acc, l) => addDecimal(acc, subDecimal(mulDecimal(l.unit_price, String(l.quantity)), l.line_total)), "0.00");
  const currencies = new Set(lines.map((l) => l.currency));
  return { lines, subtotal, discount, lineDiscount, total: subtotal === "0.00" ? "0.00" : subDecimal(subtotal, discount), maxPct, cartPct: cartPctOk, mixed: currencies.size > 1, currency: (lines[0]?.currency ?? "SAR") as Currency };
}

function over(actor: Actor, pct: string): boolean {
  return actor.maxDiscount !== null && compareDecimal(pct, actor.maxDiscount) > 0;
}

export function quote(store: string | null, actor: Actor, body: Body) {
  const q = price(store, body);
  const m = (v: string) => displayMoney(Number(v), q.currency);
  const totalDiscount = addDecimal(q.discount, q.lineDiscount);
  return {
    lines: q.lines.map((l) => ({ product_id: l.product_id, variant_id: l.variant_id, display_unit_price: m(l.unit_price), display_line_total: m(l.line_total), error: q.mixed ? "لا يمكن جمع عملات مختلفة في إيصال واحد." : l.error })),
    display_subtotal: m(addDecimal(q.subtotal, q.lineDiscount)),
    display_discount: compareDecimal(totalDiscount, "0") > 0 ? `−${m(totalDiscount)}` : null,
    display_total: m(q.total),
    items_count: q.lines.reduce((acc, l) => acc + l.quantity, 0),
    discount_exceeds_limit: over(actor, q.maxPct),
  };
}

// ── receipts ────────────────────────────────────────────────────────────────────────

export function receiptView(store: string | null, r: MockReceipt) {
  const reg = register(store, r.register_id)!;
  const m = (v: string) => displayMoney(Number(v), r.currency);
  const refundable = subDecimal(r.total, r.refunded);
  const approval = r.approval_id === null ? null : approvalsState(store).items.find((a) => a.id === r.approval_id);
  return {
    id: r.id,
    number: r.number,
    created_at: r.created_at,
    store_name: storeNameFor(store),
    register_name: reg.name,
    location_name: locationName(store, reg.location_id),
    cashier: r.cashier,
    shift_id: r.shift_id,
    payment_method: r.payment_method,
    lines: r.lines.map((l) => ({ name: l.name, variant_label: l.variant_label, sku: l.sku, quantity: l.quantity, display_unit_price: m(l.unit_price), discount_percent: l.discount_percent, display_line_total: m(l.line_total) })),
    display_subtotal: m(r.lines.reduce((acc, l) => addDecimal(acc, mulDecimal(l.unit_price, String(l.quantity))), "0.00")),
    display_discount: compareDecimal(subDecimal(r.lines.reduce((acc, l) => addDecimal(acc, mulDecimal(l.unit_price, String(l.quantity))), "0.00"), r.total), "0") > 0
      ? `−${m(subDecimal(r.lines.reduce((acc, l) => addDecimal(acc, mulDecimal(l.unit_price, String(l.quantity))), "0.00"), r.total))}`
      : null,
    display_total: m(r.total),
    display_refunded: compareDecimal(r.refunded, "0") > 0 ? m(r.refunded) : null,
    refundable_amount: refundable,
    display_refundable: m(refundable),
    approval: approval ? { id: approval.id, status: approval.status } : null,
  };
}

export function requestDiscountApproval(store: string | null, actor: Actor, body: Body) {
  const pct = percent(body.discount_percent);
  if (!pct || pct === "invalid") return { ok: false as const, status: 400, body: { discount_percent: ["نسبة خصم غير صحيحة."] } };
  const a = createApproval(store, {
    request_type: "discount_exception",
    requester_id: actor.id,
    requester_name: actor.name,
    approver_role: "مدير الفرع",
    payload: { discount_percent: pct, max_discount_percent: actor.maxDiscount, display_amount: typeof body.display_total === "string" ? body.display_total : null },
    summary: `خصم ${pct}% في نقطة البيع يتجاوز حد الدور (${actor.maxDiscount ?? "—"}%)`,
    entity: null,
  });
  return { ok: true as const, status: 201, data: { approval_id: a.id, status: "pending" as const, detail: "أُرسل طلب الاعتماد إلى المدير." } };
}

export function createPosOrder(store: string | null, actor: Actor, body: Body, key: string | null) {
  const state = posState(store);
  if (!key) return { ok: false as const, status: 400, body: { idempotency_key: ["مفتاح منع التكرار مطلوب."] } };
  const seen = state.idempotency.get(key);
  if (seen?.kind === "order") {
    const r = state.receipts.find((x) => x.id === seen.id)!;
    return { ok: true as const, status: 200, data: { id: r.id, display_total: displayMoney(Number(r.total), r.currency), receipt: receiptView(store, r) } };
  }
  const shift = myLiveShift(store, actor);
  if (!shift || shift.status !== "open" || shift.register_id !== Number(body.register_id)) return { ok: false as const, status: 409, body: { detail: "لا وردية مفتوحة لك على هذا الجهاز." } };
  const q = price(store, body);
  if (!q.lines.length) return { ok: false as const, status: 400, body: { items: ["السلة فارغة."] } };
  if (q.mixed) return { ok: false as const, status: 400, body: { detail: "لا يمكن جمع عملات مختلفة في إيصال واحد." } };
  const bad = q.lines.find((l) => l.error);
  if (bad) return { ok: false as const, status: 400, body: { detail: `${bad.name}: ${bad.error}` } };
  if ((compareDecimal(q.maxPct, "0") > 0) && !actor.canDiscount) return { ok: false as const, status: 403, body: { detail: "ليست لديك صلاحية تطبيق الخصم." } };
  let approvalId: number | null = null;
  if (over(actor, q.maxPct)) {
    if (body.manager_code === MOCK_MANAGER_CODE) {
      const a = createApproval(store, {
        request_type: "discount_exception",
        requester_id: actor.id,
        requester_name: actor.name,
        approver_role: "مدير الفرع",
        payload: { discount_percent: q.maxPct },
        summary: `خصم ${q.maxPct}% اعتُمد برمز المدير على الجهاز`,
        entity: null,
      });
      a.status = "approved";
      a.decided_by = "مدير الفرع (رمز على الجهاز)";
      a.decided_at = now();
      approvalId = a.id;
    } else if (body.manager_code !== undefined && body.manager_code !== null && body.manager_code !== "") {
      return { ok: false as const, status: 400, body: { manager_code: ["رمز المدير غير صحيح."] } };
    } else if (body.approval_id !== undefined && body.approval_id !== null) {
      const a = approvalsState(store).items.find((x) => x.id === Number(body.approval_id) && x.request_type === "discount_exception");
      if (!a) return { ok: false as const, status: 404, body: { detail: "طلب الاعتماد غير موجود." } };
      if (a.status === "pending") return { ok: false as const, status: 409, body: { detail: "طلب الاعتماد ما زال بانتظار المدير." } };
      if (a.status === "rejected") return { ok: false as const, status: 403, body: { detail: "رفض المدير هذا الخصم." } };
      approvalId = a.id;
    } else {
      return { ok: false as const, status: 403, body: { code: "discount_exceeds_limit", detail: `الخصم يتجاوز حدّك (${actor.maxDiscount}%) — يلزم اعتماد المدير.`, max_discount_percent: actor.maxDiscount } };
    }
  }
  const method = body.payment_method === "sharwa_pay" ? "sharwa_pay" : "cash";
  // The receipt is an M06 order: same ids, visible in the orders list with channel «POS».
  const reg = register(store, shift.register_id)!;
  const order = insertStorefrontOrder(store, ({ id, public_uuid, nextLineId, defaultStatusId, now: at }) => ({
    id,
    public_uuid,
    customer_name: "عميل نقطة البيع",
    customer_phone: "",
    customer_email: null,
    address: locationName(store, reg.location_id),
    status: "completed",
    payment_status: "paid",
    fulfillment_status_id: defaultStatusId,
    sales_channel: "pos",
    traffic_source: "direct",
    created_at: at,
    version: 1,
    lines: q.lines.map((l) => ({ id: nextLineId(), product_id: l.product_id, product_name: l.name, variant_label: l.variant_label, sku: l.sku, price: l.unit_price, quantity: String(l.quantity), location_id: reg.location_id })),
    discount: compareDecimal(addDecimal(q.discount, q.lineDiscount), "0") > 0 ? addDecimal(q.discount, q.lineDiscount) : null,
    coupon_code: null,
    delivery_fee: "0.00",
    deposit: null,
    paid: q.total,
    wallet_used: method === "sharwa_pay" ? q.total : null,
    refunds: [],
    is_gift: false,
    recipient_name: null,
    recipient_phone: null,
    gift_message: null,
    delivery_method_name: null,
    pickup_location_id: null,
    tracking_number: null,
    fulfillment_states: { [reg.location_id]: "delivered" },
    receipt_amount: null,
    payment_method: method === "cash" ? "cod" : "wallet",
    timeline: [],
    is_backordered: false,
    fraud_score: null,
    pending_approval: null,
  }));
  const first = order.timeline[0];
  if (first) first.text = `أُنشئ الطلب من نقطة البيع (${reg.name}) بواسطة ${actor.name}.`;
  // Stock leaves the product/variant (M04/M21 read the same rows).
  const cat = catalog(store);
  for (const l of q.lines) {
    const p = cat.products.find((x) => x.id === l.product_id);
    const v = l.variant_id === null ? undefined : cat.variants.find((x) => x.id === l.variant_id);
    if (v) v.stock = subDecimal(v.stock, String(l.quantity), 3);
    else if (p) p.stock = subDecimal(p.stock, String(l.quantity), 3);
  }
  const seq = state.receipts.filter((r) => r.shift_id === shift.id).length + 1;
  const receipt: MockReceipt = {
    id: order.id,
    number: `POS-${String(shift.id).padStart(4, "0")}-${String(seq).padStart(3, "0")}`,
    shift_id: shift.id,
    register_id: reg.id,
    cashier: actor.name,
    created_at: order.created_at,
    payment_method: method,
    currency: q.currency,
    lines: q.lines.map((line) => {
      const l = { ...line } as Partial<typeof line>;
      delete l.error;
      delete l.currency;
      return l as Omit<typeof line, "error" | "currency">;
    }),
    subtotal: q.subtotal,
    discount: addDecimal(q.discount, q.lineDiscount),
    total: q.total,
    refunded: "0.00",
    approval_id: approvalId,
  };
  state.receipts.unshift(receipt);
  if (method === "cash") shift.movements.push({ id: ++state.ids.movement, movement_type: "sale", amount: q.total, note: `إيصال ${receipt.number}`, order_id: order.id, actor: actor.name, created_at: order.created_at });
  state.idempotency.set(key, { kind: "order", id: receipt.id });
  return { ok: true as const, status: 201, data: { id: receipt.id, display_total: displayMoney(Number(receipt.total), receipt.currency), receipt: receiptView(store, receipt) } };
}

export function listReceipts(store: string | null, actor: Actor, params: URLSearchParams) {
  const shift = myLiveShift(store, actor);
  const q = (params.get("q") ?? "").trim().toLowerCase();
  const rows = posState(store).receipts.filter((r) => (shift ? r.shift_id === shift.id : false) && (!q || r.number.toLowerCase().includes(q) || String(r.id).includes(q)));
  return {
    results: rows.map((r) => ({
      id: r.id,
      number: r.number,
      created_at: r.created_at,
      items_count: r.lines.reduce((acc, l) => acc + l.quantity, 0),
      payment_method: r.payment_method,
      display_total: displayMoney(Number(r.total), r.currency),
      display_refunded: compareDecimal(r.refunded, "0") > 0 ? displayMoney(Number(r.refunded), r.currency) : null,
    })),
  };
}

export function getReceipt(store: string | null, id: number) {
  const r = posState(store).receipts.find((x) => x.id === id);
  return r ? receiptView(store, r) : null;
}

/**
 * `POST /pos/orders/<id>/refund/` `{amount, otp_code?}`. Over the threshold without a
 * valid code → 428 (the server decides, §10); a wrong code counts; the third failure locks
 * the refund with the server's sentence (§8). No `refund` movement before the step-up passes.
 */
export function refundReceipt(store: string | null, actor: Actor, id: number, body: Body, key: string | null) {
  const state = posState(store);
  if (!actor.canRefund) return { ok: false as const, status: 403, body: { detail: "ليست لديك صلاحية الاسترجاع." } };
  const r = state.receipts.find((x) => x.id === id);
  if (!r) return { ok: false as const, status: 404, body: { detail: "الإيصال غير موجود." } };
  if (key && state.idempotency.has(key)) return { ok: true as const, data: receiptView(store, r) };
  const shift = myLiveShift(store, actor);
  if (!shift || shift.status !== "open") return { ok: false as const, status: 409, body: { detail: "افتح وردية لتسجيل الاسترجاع في الدرج." } };
  const amount = typeof body.amount === "string" ? body.amount.trim() : "";
  const refundable = subDecimal(r.total, r.refunded);
  if (!isDecimal(amount) || compareDecimal(amount, "0") <= 0) return { ok: false as const, status: 400, body: { amount: ["أدخل مبلغ الاسترجاع."] } };
  if (compareDecimal(amount, refundable) > 0) return { ok: false as const, status: 400, body: { amount: [`أقصى مبلغ قابل للاسترجاع ${displayMoney(Number(refundable), r.currency)}.`] } };
  const failures = state.otpFailures.get(r.id) ?? 0;
  if (failures >= OTP_MAX_ATTEMPTS) return { ok: false as const, status: 429, body: { detail: "أُقفل الاسترجاع مؤقتاً بعد 3 محاولات خاطئة. حاول بعد 15 دقيقة أو راجع المدير." } };
  if (compareDecimal(amount, LARGE_REFUND_THRESHOLD) > 0) {
    const code = typeof body.otp_code === "string" ? body.otp_code.trim() : "";
    if (!code) return { ok: false as const, status: 428, body: { code: "otp_required", detail: "استرجاع كبير — أدخل رمز التحقق المرسل إلى جوال مالك المتجر.", challenge: "large_refund", sent_to: maskPhone("967770000011") } };
    if (code !== MOCK_OTP_CODE) {
      state.otpFailures.set(r.id, failures + 1);
      const left = OTP_MAX_ATTEMPTS - failures - 1;
      return left > 0
        ? { ok: false as const, status: 400, body: { otp_code: [`رمز التحقق غير صحيح. المتبقي ${left} ${left === 1 ? "محاولة" : "محاولتان"}.`] } }
        : { ok: false as const, status: 429, body: { detail: "أُقفل الاسترجاع مؤقتاً بعد 3 محاولات خاطئة. حاول بعد 15 دقيقة أو راجع المدير." } };
    }
  }
  r.refunded = addDecimal(r.refunded, amount);
  if (r.payment_method === "cash") shift.movements.push({ id: ++state.ids.movement, movement_type: "refund", amount, note: `استرجاع ${r.number}`, order_id: r.id, actor: actor.name, created_at: now() });
  if (key) state.idempotency.set(key, { kind: "order", id: r.id });
  return { ok: true as const, data: receiptView(store, r) };
}
