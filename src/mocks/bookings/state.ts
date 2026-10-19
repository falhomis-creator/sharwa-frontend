import type { MockResult } from "@/lib/bff/mock-route";
import { fullName, int, seeded } from "@/mocks/_fixtures";
import { catalog } from "@/mocks/catalog/state";
import type { MockProduct } from "@/mocks/catalog/seed";
import { readSettings } from "@/mocks/settings/state";
import { FIXTURE_NOW, nextId, seedOf, storeState } from "@/mocks/store-state";
import { SERVICE_HOURS } from "@/mocks/storefront/extensions";

/**
 * The mock SERVER of M26 (`ServiceAvailability`, `BookingSlot`) — one per store, shared by
 * the merchant calendar (`/api/bff/bookings/*`) and the buyer's picker
 * (`/api/bff/catalog/products/<id>/slots`). Weekdays use the BACKEND encoding
 * (0 = Monday … 6 = Sunday, discovery 02 §13); the browser converts in ONE place
 * (`src/features/bookings/weekdays.ts`). Times are the store's wall clock (Asia/Aden, +03:00,
 * no DST — the fixture timezone), slots are generated from the windows on the server only
 * (FR-26.06), never in the browser.
 */
export const STORE_OFFSET_MINUTES = 180;
const OFFSET_SUFFIX = "+03:00";
/** How long a buyer's hold lasts before the slot is released (server-owned, M26 §10). */
export const HOLD_MINUTES = 10;

export interface AvailabilityWindow {
  weekday: number;
  start_time: string;
  end_time: string;
}

export type SlotStatus = "held" | "booked" | "cancelled";

export interface MockSlot {
  id: number;
  product_id: number;
  start: number;
  end: number;
  status: SlotStatus;
  held_until: number | null;
  customer_name: string;
  customer_phone: string;
  order_id: number | null;
}

interface BookingsState {
  availability: Map<number, AvailabilityWindow[]>;
  slots: MockSlot[];
}

export const now = () => Math.max(Date.now(), FIXTURE_NOW);

// ── Store wall clock helpers ─────────────────────────────────────────────────────────
/** `YYYY-MM-DD` of an instant in the store's timezone. */
export function storeDate(ms: number): string {
  return new Date(ms + STORE_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
}

/** The instant of `date` at `minutes` past midnight, store time. */
export function storeInstant(date: string, minutes: number): number {
  return Date.parse(`${date}T00:00:00Z`) + (minutes - STORE_OFFSET_MINUTES) * 60_000;
}

/** ISO with the store's offset (`2026-10-19T10:00:00+03:00`) — how Django serialises aware datetimes in the store's zone. */
export function storeIso(ms: number): string {
  return `${new Date(ms + STORE_OFFSET_MINUTES * 60_000).toISOString().slice(0, 19)}${OFFSET_SUFFIX}`;
}

/** Backend weekday (0 = Monday) of a `YYYY-MM-DD`. */
export function backendWeekday(date: string): number {
  return (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

// ── Seed ─────────────────────────────────────────────────────────────────────────────
function bookable(store: string | null): MockProduct[] {
  return catalog(store).products.filter((p) => p.is_bookable && !p.archived_at);
}

function seed(store: string | null): BookingsState {
  const availability = new Map<number, AvailabilityWindow[]>();
  const slots: MockSlot[] = [];
  const rnd = seeded(seedOf(store) + 26);
  for (const p of bookable(store)) {
    const hours = SERVICE_HOURS[p.name];
    if (!hours) continue;
    // Two windows a day with a lunch break, so «عدة نوافذ لليوم» is visible from the start.
    const mid = Math.floor((hours.from + hours.to) / 2);
    availability.set(
      p.id,
      hours.weekdays.flatMap((weekday) => [
        { weekday, start_time: hhmm(hours.from * 60), end_time: hhmm(mid * 60) },
        { weekday, start_time: hhmm((mid + 1) * 60), end_time: hhmm(hours.to * 60) },
      ]),
    );
    // Bookings around today: some booked (with an order), one held for a live checkout,
    // one expired hold not yet cleaned up (§8 «منتهٍ»), one cancelled.
    const duration = p.booking_duration_minutes ?? 60;
    const today = storeDate(now());
    let id = 0;
    for (let d = -6; d <= 9; d++) {
      const date = addDays(today, d);
      const windows = availability.get(p.id)!.filter((w) => w.weekday === backendWeekday(date));
      for (const w of windows) {
        for (let m = toMinutes(w.start_time); m + duration <= toMinutes(w.end_time); m += duration) {
          const roll = rnd();
          if (roll > 0.32) continue;
          const start = storeInstant(date, m);
          const status: SlotStatus = roll < 0.03 ? "cancelled" : "booked";
          id += 1;
          slots.push({
            id,
            product_id: p.id,
            start,
            end: start + duration * 60_000,
            status,
            held_until: null,
            customer_name: fullName(rnd),
            customer_phone: `9677${int(rnd, 10_000_000, 99_999_999)}`,
            order_id: 2000 + id,
          });
        }
      }
    }
    const tomorrow = addDays(today, 1);
    const firstWindow = availability.get(p.id)!.find((w) => w.weekday === backendWeekday(tomorrow));
    if (firstWindow) {
      const start = storeInstant(tomorrow, toMinutes(firstWindow.start_time));
      const taken = slots.some((s) => s.product_id === p.id && s.start === start);
      if (!taken) {
        id += 1;
        slots.push({ id, product_id: p.id, start, end: start + duration * 60_000, status: "held", held_until: now() + 8 * 60_000, customer_name: "زائر المتجر", customer_phone: "", order_id: null });
      }
      const stale = start + duration * 60_000;
      if (!slots.some((s) => s.product_id === p.id && s.start === stale)) {
        id += 1;
        slots.push({ id, product_id: p.id, start: stale, end: stale + duration * 60_000, status: "held", held_until: now() - 30 * 60_000, customer_name: "زائر المتجر", customer_phone: "", order_id: null });
      }
    }
  }
  return { availability, slots };
}

export function bookingsState(store: string | null): BookingsState {
  return storeState(store, "bookings", () => seed(store));
}

export function bookingContext(store: string | null) {
  const s = readSettings(store, "");
  return { timezone: s.timezone, week_start_day: s.week_start_day };
}

/** A hold counts only while `held_until` is in the future (an expired one is «منتهٍ»). */
function live(s: MockSlot, at = now()): boolean {
  return s.status === "booked" || (s.status === "held" && (s.held_until ?? 0) > at);
}

// ── Merchant: services & availability ───────────────────────────────────────────────
export function listServices(store: string | null) {
  const st = bookingsState(store);
  return bookable(store).map((p) => ({
    id: p.id,
    name: p.name,
    booking_duration_minutes: p.booking_duration_minutes,
    availability_count: st.availability.get(p.id)?.length ?? 0,
    image: p.images[0]?.url ?? null,
  }));
}

export function getAvailability(store: string | null, productId: number) {
  const p = bookable(store).find((x) => x.id === productId);
  if (!p) return null;
  const windows = [...(bookingsState(store).availability.get(p.id) ?? [])].sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time));
  return {
    ...bookingContext(store),
    product: { id: p.id, name: p.name, booking_duration_minutes: p.booking_duration_minutes },
    results: windows,
  };
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** `PUT …/availability/` — full replacement, re-validated server side (FR-26.03). */
export function putAvailability(store: string | null, productId: number, body: unknown): MockResult<ReturnType<typeof getAvailability>> {
  const p = bookable(store).find((x) => x.id === productId);
  if (!p) return { ok: false, status: 404, body: { detail: "الخدمة غير موجودة أو غير قابلة للحجز." } };
  const rows = Array.isArray(body) ? body : Array.isArray((body as { results?: unknown })?.results) ? (body as { results: unknown[] }).results : null;
  if (!rows) return { ok: false, status: 400, body: { detail: "أرسل قائمة النوافذ." } };
  const windows: AvailabilityWindow[] = [];
  const errors: Array<Record<string, string[]>> = [];
  for (const raw of rows) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const e: Record<string, string[]> = {};
    const weekday = Number(r.weekday);
    const start = String(r.start_time ?? "").slice(0, 5);
    const end = String(r.end_time ?? "").slice(0, 5);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) e.weekday = ["يوم غير صالح (0 = الاثنين … 6 = الأحد)."];
    if (!TIME_RE.test(start)) e.start_time = ["وقت غير صالح."];
    if (!TIME_RE.test(end)) e.end_time = ["وقت غير صالح."];
    if (!e.start_time && !e.end_time && toMinutes(end) <= toMinutes(start)) e.end_time = ["يجب أن ينتهي الوقت بعد بدايته."];
    if (!Object.keys(e).length) {
      const overlap = windows.some((w) => w.weekday === weekday && toMinutes(start) < toMinutes(w.end_time) && toMinutes(w.start_time) < toMinutes(end));
      if (overlap) e.start_time = ["تتداخل مع نافذة أخرى في اليوم نفسه."];
    }
    errors.push(e);
    if (!Object.keys(e).length) windows.push({ weekday, start_time: start, end_time: end });
  }
  if (errors.some((e) => Object.keys(e).length)) return { ok: false, status: 400, body: { results: errors } };
  bookingsState(store).availability.set(p.id, windows);
  return { ok: true, data: getAvailability(store, p.id) };
}

// ── Merchant: calendar ───────────────────────────────────────────────────────────────
export function listSlots(store: string | null, params: URLSearchParams) {
  const st = bookingsState(store);
  const from = params.get("from");
  const to = params.get("to");
  const product = Number(params.get("product")) || null;
  const status = params.get("status");
  const lo = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? storeInstant(from, 0) : -Infinity;
  const hi = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? storeInstant(addDays(to, 1), 0) : Infinity;
  const statuses = status ? status.split(",") : ["held", "booked"];
  const products = new Map(catalog(store).products.map((p) => [p.id, p]));
  const results = st.slots
    .filter((s) => s.start >= lo && s.start < hi && (!product || s.product_id === product) && statuses.includes(s.status))
    .sort((a, b) => a.start - b.start)
    .map((s) => ({
      id: s.id,
      product: { id: s.product_id, name: products.get(s.product_id)?.name ?? "خدمة محذوفة" },
      start_datetime: storeIso(s.start),
      end_datetime: storeIso(s.end),
      status: s.status,
      held_until: s.held_until ? storeIso(s.held_until) : null,
      is_expired: s.status === "held" && (s.held_until ?? 0) <= now(),
      customer_name: s.customer_name,
      customer_phone: s.customer_phone,
      order_id: s.order_id,
    }));
  return { ...bookingContext(store), results };
}

/** `POST …/slots/<id>/cancel/` — the order effect is the server's sentence (FR-26.09). */
export function cancelSlot(store: string | null, id: number): MockResult<{ detail: string; order_effect: string | null }> {
  const s = bookingsState(store).slots.find((x) => x.id === id);
  if (!s) return { ok: false, status: 404, body: { detail: "الحجز غير موجود." } };
  if (s.status === "cancelled") return { ok: false, status: 409, body: { detail: "هذا الحجز ملغى مسبقاً." } };
  s.status = "cancelled";
  s.held_until = null;
  return {
    ok: true,
    data: {
      detail: "أُلغي الحجز وأصبح الموعد متاحاً للحجز من جديد.",
      order_effect: s.order_id ? `بقي الطلب #${s.order_id} كما هو؛ راجعه لاسترجاع المبلغ إن لزم.` : null,
    },
  };
}

// ── Buyer: slots & hold ──────────────────────────────────────────────────────────────
/** `GET /catalog/products/<id>/slots/?date=` — generated from the windows, minus live holds and bookings. */
export function buyerSlots(store: string | null, p: MockProduct, date: string) {
  if (!p.is_bookable || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const st = bookingsState(store);
  const windows = st.availability.get(p.id) ?? [];
  const duration = p.booking_duration_minutes ?? 60;
  const at = now();
  const dayOf = (d: string) => {
    const out: Array<{ start_datetime: string; end_datetime: string; status: "available" | "held" | "booked" }> = [];
    for (const w of windows.filter((x) => x.weekday === backendWeekday(d)).sort((a, b) => a.start_time.localeCompare(b.start_time))) {
      for (let m = toMinutes(w.start_time); m + duration <= toMinutes(w.end_time); m += duration) {
        const start = storeInstant(d, m);
        if (start <= at) continue;
        const slot = st.slots.find((s) => s.product_id === p.id && s.start === start && live(s, at));
        out.push({ start_datetime: storeIso(start), end_datetime: storeIso(start + duration * 60_000), status: slot ? slot.status === "booked" ? "booked" : "held" : "available" });
      }
    }
    return out;
  };
  const slots = dayOf(date);
  let next: string | null = null;
  if (!slots.some((s) => s.status === "available")) {
    for (let i = 1; i <= 21; i++) {
      const d = addDays(date, i);
      if (dayOf(d).some((s) => s.status === "available")) {
        next = d;
        break;
      }
    }
  }
  return { date, timezone: bookingContext(store).timezone, slots, next_available_date: next };
}

/** `POST /catalog/products/<id>/slots/hold/` `{start_datetime, release_slot_id?}` → `{slot_id, held_until}`. */
export function holdSlot(store: string | null, p: MockProduct, body: Record<string, unknown>): MockResult<{ slot_id: number; start_datetime: string; held_until: string }> {
  const st = bookingsState(store);
  const startRaw = typeof body.start_datetime === "string" ? body.start_datetime : "";
  const start = Date.parse(startRaw);
  if (!Number.isFinite(start)) return { ok: false, status: 400, body: { start_datetime: ["اختر موعداً صالحاً."] } };
  const release = Number(body.release_slot_id);
  if (Number.isInteger(release) && release > 0) {
    const old = st.slots.find((s) => s.id === release && s.product_id === p.id && s.status === "held");
    if (old) {
      old.status = "cancelled";
      old.held_until = null;
    }
  }
  const day = buyerSlots(store, p, storeDate(start));
  const offered = day?.slots.find((s) => Date.parse(s.start_datetime) === start);
  if (!offered) return { ok: false, status: 400, body: { start_datetime: ["هذا الوقت خارج ساعات توفر الخدمة."] } };
  if (offered.status !== "available") return { ok: false, status: 409, body: { detail: "لم يعد هذا الموعد متاحاً." } };
  const duration = p.booking_duration_minutes ?? 60;
  // The partial-unique `(product, start_datetime)`: a stale row is reused, never duplicated.
  let slot = st.slots.find((s) => s.product_id === p.id && s.start === start);
  if (!slot) {
    slot = { id: nextId(store, "booking-slot", 500), product_id: p.id, start, end: start + duration * 60_000, status: "held", held_until: null, customer_name: "زائر المتجر", customer_phone: "", order_id: null };
    st.slots.push(slot);
  }
  slot.status = "held";
  slot.held_until = now() + HOLD_MINUTES * 60_000;
  slot.order_id = null;
  return { ok: true, status: 201, data: { slot_id: slot.id, start_datetime: storeIso(start), held_until: storeIso(slot.held_until) } };
}

/** Checkout (M12) turns the line's hold into a booking on the created order. */
export function bookSlotForOrder(store: string | null, productId: number, startDatetime: string, order: { id: number; customer_name: string; customer_phone: string }) {
  const start = Date.parse(startDatetime);
  if (!Number.isFinite(start)) return;
  const st = bookingsState(store);
  const p = catalog(store).products.find((x) => x.id === productId);
  let slot = st.slots.find((s) => s.product_id === productId && s.start === start && s.status !== "cancelled");
  if (!slot) {
    slot = { id: nextId(store, "booking-slot", 500), product_id: productId, start, end: start + (p?.booking_duration_minutes ?? 60) * 60_000, status: "held", held_until: null, customer_name: "", customer_phone: "", order_id: null };
    st.slots.push(slot);
  }
  Object.assign(slot, { status: "booked", held_until: null, order_id: order.id, customer_name: order.customer_name, customer_phone: order.customer_phone });
}
