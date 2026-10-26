import type { MockResult } from "@/lib/bff/mock-route";
import type { Session } from "@/features/dashboard-shell/schemas";
import { canOpenReport } from "@/features/reports/permissions";
import { displayMoney } from "@/mocks/_fixtures";
import { isEmptyStore } from "@/mocks/empty-store";
import { listLocationRefs, multiLocationEnabled } from "@/mocks/locations/state";
import { ordersState } from "@/mocks/orders/state";
import { FIXTURE_NOW, seedOf, storeState } from "@/mocks/store-state";
import { REPORT_CATEGORIES, REPORT_REGISTRY, getReportDef, isCoreReport, permissionOf, type MetricDef, type ReportDef } from "@/mocks/reports/registry";

/**
 * M25 data contract (§7, `[NEEDS BACKEND]`): the index and `GET /reports/<code>/`.
 *
 * Numbers are deterministic per store, report, metric, day and location. The three sales
 * reports of `core` (`sales_overview`, `orders`, `best_sellers`) are derived from the M06
 * order fixture — the `DailyStoreMetrics` stand-in — so the report and the orders list
 * agree. Money leaves here formatted (`displayMoney`); `delta_pct` is computed here, the
 * UI only prints it (FR-25.04). Days before `DATA_START` have no data (the empty state and
 * the «—» compare are reachable on `noor`); the `shop` store has none at all.
 */
const DATA_START = "2025-06-01";
const MAX_RANGE_DAYS = 366;
const DAY = 86_400_000;
const ORDER_DERIVED = new Set(["sales_overview", "orders", "best_sellers"]);
/** The reports whose numbers can be cut by location — Django `reports_contract.LOCATION_REPORTS`. */
const LOCATION_REPORTS = new Set(["sales_overview", "orders", "store_overview", "best_sellers"]);

type Body = Record<string, unknown>;

function subjectOf(session: Session) {
  return { kind: session.kind, features: session.features, permissions: session.staff?.permissions };
}

// ───────────────────────────── index ─────────────────────────────

export function reportIndex(session: Session) {
  const subject = subjectOf(session);
  return REPORT_CATEGORIES.map((c) => ({
    category: c.key,
    title: c.title,
    reports: REPORT_REGISTRY.filter((r) => r.category === c.key).map((r) => ({
      code: r.code,
      title: r.title,
      description: r.description,
      status: r.status,
      permission: permissionOf(r),
      core: isCoreReport(r),
      allowed: canOpenReport(subject, r.code, r.category),
    })),
  }));
}

export function reportAllowed(session: Session, def: ReportDef): boolean {
  return canOpenReport(subjectOf(session), def.code, def.category);
}

// ───────────────────────────── refresh today ─────────────────────────────

function refreshState(store: string | null) {
  return storeState(store, "reports:refresh", () => ({ refreshed_at: new Date(FIXTURE_NOW - 17 * 3_600_000).toISOString() }));
}

export function refreshToday(store: string | null): { refreshed_at: string } {
  const s = refreshState(store);
  s.refreshed_at = new Date(Math.max(Date.now(), FIXTURE_NOW)).toISOString();
  return { refreshed_at: s.refreshed_at };
}

// ───────────────────────────── dates ─────────────────────────────

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function parseDay(v: string | null): number | null {
  if (!v || !ISO_DAY.test(v)) return null;
  const t = Date.parse(`${v}T00:00:00Z`);
  return Number.isNaN(t) ? null : t;
}

const dayIso = (t: number) => new Date(t).toISOString().slice(0, 10);

function days(from: number, to: number): string[] {
  const out: string[] = [];
  for (let t = from; t <= to; t += DAY) out.push(dayIso(t));
  return out;
}

function lastDataDay(): string {
  return dayIso(Math.max(Date.now(), FIXTURE_NOW));
}

// ───────────────────────────── value generators ─────────────────────────────

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0x1_0000_0000;
}

function hasDay(store: string | null, day: string): boolean {
  return !isEmptyStore(store) && day >= DATA_START && day <= lastDataDay();
}

function locationFactor(location: number | null): number {
  return location === null ? 1 : 0.3 + (location % 3) * 0.15;
}

/** One synthetic metric for one day (and optional breakdown item). */
function synth(store: string | null, def: ReportDef, metric: MetricDef, day: string, item: string | null, location: number | null): number {
  if (!hasDay(store, day)) return 0;
  const noise = hash(`${seedOf(store)}|${def.code}|${metric.key}|${day}|${item ?? ""}|${location ?? ""}`);
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  const weekFactor = weekday === 4 ? 1.35 : weekday === 5 ? 1.2 : 1;
  const trend = 0.8 + 0.4 * ((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${DATA_START}T00:00:00Z`)) / (500 * DAY));
  if (metric.type === "percent" || metric.key === "avg_rating") return metric.base - noise * (metric.type === "percent" ? 1.5 : 0.8);
  const perDay = def.shape === "breakdown" ? metric.base / 30 : metric.base;
  const itemFactor = item === null ? 1 : 0.45 + hash(`${def.code}|${item}`) * 1.1;
  const v = perDay * (0.55 + noise * 0.9) * weekFactor * trend * itemFactor * locationFactor(location);
  return metric.type === "money" ? Math.round(v * 100) / 100 : Math.round(v);
}

interface OrderDay {
  revenue: number;
  orders_count: number;
  completed: number;
  cancelled: number;
}

function orderDays(store: string | null, location: number | null): Map<string, OrderDay> {
  const out = new Map<string, OrderDay>();
  for (const o of ordersState(store).orders) {
    const lines = location === null ? o.lines : o.lines.filter((l) => l.location_id === location);
    if (lines.length === 0) continue;
    const day = o.created_at.slice(0, 10);
    const row = out.get(day) ?? { revenue: 0, orders_count: 0, completed: 0, cancelled: 0 };
    row.orders_count += 1;
    if (o.status === "completed") row.completed += 1;
    if (o.status === "cancelled") row.cancelled += 1;
    if (o.status !== "cancelled") {
      const sub = lines.reduce((acc, l) => acc + Number(l.price) * Number(l.quantity), 0);
      row.revenue += sub + Number(o.delivery_fee) - Number(o.discount ?? 0);
    }
    out.set(day, row);
  }
  return out;
}

function bestSellers(store: string | null, from: string, to: string, location: number | null) {
  const out = new Map<string, { quantity: number; revenue: number }>();
  for (const o of ordersState(store).orders) {
    const day = o.created_at.slice(0, 10);
    if (day < from || day > to || o.status === "cancelled") continue;
    for (const l of o.lines) {
      if (location !== null && l.location_id !== location) continue;
      const row = out.get(l.product_name) ?? { quantity: 0, revenue: 0 };
      row.quantity += Number(l.quantity);
      row.revenue += Number(l.price) * Number(l.quantity);
      out.set(l.product_name, row);
    }
  }
  return out;
}

/** Values per metric for one day (time reports). */
function dayValues(store: string | null, def: ReportDef, day: string, location: number | null, od: Map<string, OrderDay> | null): Record<string, number> {
  if (od) {
    const r = od.get(day) ?? { revenue: 0, orders_count: 0, completed: 0, cancelled: 0 };
    return { revenue: round2(r.revenue), orders_count: r.orders_count, completed: r.completed, cancelled: r.cancelled, aov: r.orders_count ? round2(r.revenue / r.orders_count) : 0 };
  }
  return Object.fromEntries(def.metrics.map((mt) => [mt.key, synth(store, def, mt, day, null, location)]));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function isAverage(mt: MetricDef): boolean {
  return mt.type === "percent" || mt.key === "avg_rating";
}

function aggregate(def: ReportDef, rows: Array<Record<string, number>>, activeDays: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const mt of def.metrics) {
    if (mt.key === "aov") continue;
    const sum = rows.reduce((acc, r) => acc + (r[mt.key] ?? 0), 0);
    out[mt.key] = isAverage(mt) ? (activeDays ? round2(sum / activeDays) : 0) : mt.type === "money" ? round2(sum) : sum;
  }
  if (def.metrics.some((mt) => mt.key === "aov")) out.aov = out.orders_count ? round2((out.revenue ?? 0) / out.orders_count) : 0;
  return out;
}

function display(mt: MetricDef, v: number): string {
  if (mt.type === "money") return displayMoney(v);
  if (mt.type === "percent") return `${v.toFixed(1)}%`;
  if (mt.key === "avg_rating") return v.toFixed(1);
  return v.toLocaleString("en-US");
}

// ───────────────────────────── report payload ─────────────────────────────

interface Range {
  from: string;
  to: string;
  days: string[];
}

function rangeOf(fromRaw: string | null, toRaw: string | null, field: [string, string]): MockResult<Range> {
  const from = parseDay(fromRaw);
  const to = parseDay(toRaw);
  if (from === null) return { ok: false, status: 400, body: { [field[0]]: ["تاريخ غير صالح (YYYY-MM-DD)."] } };
  if (to === null) return { ok: false, status: 400, body: { [field[1]]: ["تاريخ غير صالح (YYYY-MM-DD)."] } };
  if (to < from) return { ok: false, status: 400, body: { [field[1]]: ["تاريخ النهاية قبل البداية."] } };
  const list = days(from, to);
  if (list.length > MAX_RANGE_DAYS) return { ok: false, status: 400, body: { detail: "الحد الأقصى سنة واحدة." } };
  return { ok: true, data: { from: dayIso(from), to: dayIso(to), days: list } };
}

interface Computed {
  totals: Record<string, number>;
  hasData: boolean;
  /** time: per day · breakdown: per item */
  rows: Array<{ id: string; label: string; values: Record<string, number> }>;
}

function compute(store: string | null, def: ReportDef, range: Range, location: number | null): Computed {
  const anyDay = range.days.some((d) => hasDay(store, d));
  if (def.shape === "time") {
    const od = ORDER_DERIVED.has(def.code) ? orderDays(store, location) : null;
    const rows = range.days.map((d) => ({ id: d, label: d, values: dayValues(store, def, d, location, od) }));
    const activeDays = range.days.filter((d) => hasDay(store, d)).length;
    const hasData = od ? rows.some((r) => (r.values.orders_count ?? 0) > 0) : anyDay;
    return { totals: aggregate(def, rows.map((r) => r.values), activeDays), hasData, rows: hasData ? rows : [] };
  }
  // breakdown
  let items: Array<{ id: string; label: string; values: Record<string, number> }>;
  if (def.code === "best_sellers") {
    items = [...bestSellers(store, range.from, range.to, location).entries()].map(([name, v], i) => ({
      id: `p${i}`,
      label: name,
      values: { quantity: v.quantity, revenue: round2(v.revenue) },
    }));
  } else {
    const names = def.dimension?.items ?? [];
    const activeDays = range.days.filter((d) => hasDay(store, d));
    items = anyDay
      ? names.map((name, i) => {
          const values: Record<string, number> = {};
          for (const mt of def.metrics) {
            const perDay = activeDays.map((d) => synth(store, def, mt, d, name, location));
            const sum = perDay.reduce((a, b) => a + b, 0);
            values[mt.key] = isAverage(mt) ? round2(sum / Math.max(1, perDay.length)) : mt.type === "money" ? round2(sum) : sum;
          }
          return { id: `i${i}`, label: name, values };
        })
      : [];
  }
  const primary = def.metrics[0]!.key;
  items.sort((a, b) => (b.values[primary] ?? 0) - (a.values[primary] ?? 0));
  const totals: Record<string, number> = {};
  for (const mt of def.metrics) {
    const sum = items.reduce((acc, r) => acc + (r.values[mt.key] ?? 0), 0);
    totals[mt.key] = isAverage(mt) ? (items.length ? round2(sum / items.length) : 0) : mt.type === "money" ? round2(sum) : sum;
  }
  return { totals, hasData: items.length > 0, rows: items };
}

function deltaPct(cur: number, prev: number): number | null {
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

export function reportMeta(def: ReportDef) {
  return {
    code: def.code,
    title: def.title,
    category: def.category,
    category_title: REPORT_CATEGORIES.find((c) => c.key === def.category)?.title ?? def.category,
    description: def.description,
    status: def.status,
    core: isCoreReport(def),
    chart: def.shape === "time" ? ("line" as const) : ("bar" as const),
  };
}

export function reportData(store: string | null, code: string, params: URLSearchParams, timezone: string): MockResult<Body> {
  const def = getReportDef(code);
  if (!def) return { ok: false, status: 404, body: { detail: "التقرير غير موجود." } };
  const meta = reportMeta(def);
  // Django (INT-027): only the order-derived reports carry a location dimension.
  const hasLocations = multiLocationEnabled(store) && LOCATION_REPORTS.has(def.code);
  const base = {
    report: meta,
    has_locations: hasLocations,
    locations: hasLocations ? listLocationRefs(store).filter((l) => l.is_active).map((l) => ({ id: l.id, name: l.name })) : [],
    timezone,
    refreshed_at: meta.core ? refreshState(store).refreshed_at : null,
  };
  if (def.status !== "available") return { ok: true, data: { ...base, summary: [], series: [], table: { columns: [], rows: [], count: 0 } } };

  const range = rangeOf(params.get("from"), params.get("to"), ["from", "to"]);
  if (!range.ok) return range;
  let compareRange: Range | null = null;
  if (params.get("compare_from") || params.get("compare_to")) {
    const r = rangeOf(params.get("compare_from"), params.get("compare_to"), ["compare_from", "compare_to"]);
    if (!r.ok) return r;
    compareRange = r.data;
  }
  const locRaw = params.get("location");
  const location = hasLocations && locRaw && /^\d+$/.test(locRaw) ? Number(locRaw) : null;

  const cur = compute(store, def, range.data, location);
  const prev = compareRange ? compute(store, def, compareRange, location) : null;

  const summary = def.metrics.map((mt) => {
    const v = cur.totals[mt.key] ?? 0;
    const p = prev && prev.hasData ? (prev.totals[mt.key] ?? 0) : null;
    return {
      key: mt.key,
      label: mt.label,
      display_value: cur.hasData ? display(mt, v) : "—",
      compare_display_value: p === null ? null : display(mt, p),
      delta_pct: p === null || !cur.hasData ? null : deltaPct(v, p),
    };
  });

  const primary = def.metrics[0]!;
  const chartRows = def.shape === "time" ? cur.rows : cur.rows.slice(0, 10);
  const series = cur.hasData
    ? [
        {
          label: `${primary.label} — الفترة الحالية`,
          points: chartRows.map((r) => ({ x: r.label, y: r.values[primary.key] ?? 0, display_y: display(primary, r.values[primary.key] ?? 0) })),
        },
      ]
    : [];
  if (cur.hasData && prev && compareRange) {
    if (def.shape === "time") {
      const od = ORDER_DERIVED.has(def.code) ? orderDays(store, location) : null;
      series.push({
        label: `${primary.label} — الفترة السابقة`,
        points: compareRange.days.slice(0, chartRows.length).map((d) => {
          const y = dayValues(store, def, d, location, od)[primary.key] ?? 0;
          return { x: d, y, display_y: display(primary, y) };
        }),
      });
    } else {
      const byLabel = new Map(prev.rows.map((r) => [r.label, r.values[primary.key] ?? 0]));
      series.push({
        label: `${primary.label} — الفترة السابقة`,
        points: chartRows.map((r) => {
          const y = byLabel.get(r.label) ?? 0;
          return { x: r.label, y, display_y: display(primary, y) };
        }),
      });
    }
  }

  const firstCol = def.shape === "time" ? { key: "date", label: "اليوم", type: "date" as const } : { key: "label", label: def.dimension?.label ?? "البند", type: "text" as const };
  const columns = [firstCol, ...def.metrics.map((mt) => ({ key: mt.key, label: mt.label, type: mt.type === "money" ? ("money" as const) : mt.type === "percent" ? ("percent" as const) : ("number" as const) }))];
  let rows = cur.rows.map((r) => {
    const out: Record<string, string | number> = { id: r.id, [firstCol.key]: r.label };
    for (const mt of def.metrics) {
      const v = r.values[mt.key] ?? 0;
      if (mt.type === "money" || mt.type === "percent" || mt.key === "avg_rating") {
        out[mt.key] = display(mt, v);
        out[`${mt.key}__value`] = v;
      } else out[mt.key] = v;
    }
    return out;
  });
  if (def.shape === "time") rows.reverse();

  // Server-side ordering/paging (FR-25.10 above 1,000 rows); the mock never exceeds 366.
  const ordering = params.get("ordering");
  if (ordering) {
    const desc = ordering.startsWith("-");
    const key = ordering.replace(/^-/, "");
    const sortKey = `${key}__value`;
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey] ?? a[key] ?? "";
      const bv = b[sortKey] ?? b[key] ?? "";
      const c = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), "ar");
      return desc ? -c : c;
    });
  }
  const count = rows.length;
  const PAGE = 1000;
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  rows = rows.slice((page - 1) * PAGE, page * PAGE);

  return {
    ok: true,
    data: {
      ...base,
      range: { from: range.data.from, to: range.data.to },
      compare: compareRange ? { from: compareRange.from, to: compareRange.to } : null,
      summary,
      series,
      table: { columns, rows, count },
    },
  };
}

/** A small CSV of the report for the export download (first 50 rows, UTF-8 BOM). */
export function reportCsv(store: string | null, code: string, params: Record<string, unknown>): string {
  const q = new URLSearchParams();
  for (const k of ["from", "to", "location"]) if (typeof params[k] === "string" && params[k]) q.set(k, params[k] as string);
  if (!q.get("from") || !q.get("to")) {
    const to = lastDataDay();
    q.set("to", to);
    q.set("from", dayIso(Date.parse(`${to}T00:00:00Z`) - 29 * DAY));
  }
  const res = reportData(store, code, q, "Asia/Aden");
  if (!res.ok) return "﻿";
  const table = res.data.table as { columns: Array<{ key: string; label: string }>; rows: Array<Record<string, string | number>> };
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [table.columns.map((c) => esc(c.label)).join(","), ...table.rows.slice(0, 50).map((r) => table.columns.map((c) => esc(r[c.key])).join(","))];
  return `﻿${lines.join("\n")}\n`;
}
