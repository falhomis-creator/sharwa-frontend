import type { MockResult } from "@/lib/bff/mock-route";
import { isEmptyStore } from "@/mocks/empty-store";
import { FIXTURE_NOW, nextId, storeState } from "@/mocks/store-state";
import { getReportDef } from "@/mocks/reports/registry";

/**
 * `ScheduledReportSubscription` (M25 US-25.4, `[NEEDS BACKEND]`). `next_run_at` is the
 * server's: daily → tomorrow 07:00 Aden, weekly → next Saturday 07:00, monthly → the 1st
 * of next month 07:00 (04:00 UTC). The UI formats it, never computes it.
 */
export const FREQUENCIES = ["daily", "weekly", "monthly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export interface MockSchedule {
  id: number;
  report_code: string;
  frequency: Frequency;
  email: string;
  is_active: boolean;
  created_at: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function nextRun(freq: Frequency): string {
  const now = new Date(Math.max(Date.now(), FIXTURE_NOW));
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 4, 0, 0));
  if (freq === "daily") d.setUTCDate(d.getUTCDate() + 1);
  else if (freq === "weekly") d.setUTCDate(d.getUTCDate() + (((6 - d.getUTCDay() + 7) % 7) || 7));
  else {
    d.setUTCMonth(d.getUTCMonth() + 1, 1);
  }
  return d.toISOString();
}

function seed(store: string | null): MockSchedule[] {
  if (isEmptyStore(store)) return [];
  const at = new Date(FIXTURE_NOW - 9 * 86_400_000).toISOString();
  return [
    { id: 31, report_code: "sales_overview", frequency: "weekly", email: "owner@noor-store.com", is_active: true, created_at: at },
    { id: 32, report_code: "inventory_overview", frequency: "monthly", email: "stock@noor-store.com", is_active: true, created_at: at },
    { id: 33, report_code: "abandoned_carts", frequency: "daily", email: "marketing@noor-store.com", is_active: false, created_at: at },
  ];
}

function schedules(store: string | null): MockSchedule[] {
  return storeState(store, "reports:schedules", () => seed(store));
}

export function scheduleView(s: MockSchedule) {
  return {
    id: s.id,
    report_code: s.report_code,
    report_title: getReportDef(s.report_code)?.title ?? s.report_code,
    frequency: s.frequency,
    email: s.email,
    is_active: s.is_active,
    next_run_at: s.is_active ? nextRun(s.frequency) : null,
    created_at: s.created_at,
  };
}

export function listSchedules(store: string | null) {
  const all = schedules(store);
  return { count: all.length, results: all.map(scheduleView) };
}

type Body = Record<string, unknown>;

function validate(body: Body, partial: boolean): MockResult<Partial<MockSchedule>> {
  const errors: Record<string, string[]> = {};
  const out: Partial<MockSchedule> = {};
  if (!partial || "report_code" in body) {
    const def = typeof body.report_code === "string" ? getReportDef(body.report_code) : undefined;
    if (!def) errors.report_code = ["اختر تقريراً."];
    else if (def.status !== "available") errors.report_code = ["هذا التقرير غير متاح بعد."];
    else out.report_code = def.code;
  }
  if (!partial || "frequency" in body) {
    if (!FREQUENCIES.includes(body.frequency as Frequency)) errors.frequency = ["اختر التكرار."];
    else out.frequency = body.frequency as Frequency;
  }
  if (!partial || "email" in body) {
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!EMAIL.test(email)) errors.email = ["أدخل بريداً إلكترونياً صحيحاً."];
    else out.email = email.toLowerCase();
  }
  if ("is_active" in body) {
    if (typeof body.is_active !== "boolean") errors.is_active = ["قيمة غير صالحة."];
    else out.is_active = body.is_active;
  }
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  return { ok: true, data: out };
}

export function createSchedule(store: string | null, body: Body): MockResult<ReturnType<typeof scheduleView>> {
  const v = validate(body, false);
  if (!v.ok) return v;
  const dup = schedules(store).find((s) => s.report_code === v.data.report_code && s.email === v.data.email && s.frequency === v.data.frequency);
  if (dup) return { ok: false, status: 400, body: { email: ["هذا البريد مشترك في التقرير نفسه بالتكرار نفسه."] } };
  const s: MockSchedule = {
    id: nextId(store, "report-schedule", 33),
    report_code: v.data.report_code!,
    frequency: v.data.frequency!,
    email: v.data.email!,
    is_active: v.data.is_active ?? true,
    created_at: new Date(Math.max(Date.now(), FIXTURE_NOW)).toISOString(),
  };
  schedules(store).push(s);
  return { ok: true, status: 201, data: scheduleView(s) };
}

export function patchSchedule(store: string | null, id: number, body: Body): MockResult<ReturnType<typeof scheduleView>> {
  const s = schedules(store).find((x) => x.id === id);
  if (!s) return { ok: false, status: 404, body: { detail: "الاشتراك غير موجود." } };
  const v = validate(body, true);
  if (!v.ok) return v;
  Object.assign(s, v.data);
  return { ok: true, data: scheduleView(s) };
}

export function deleteSchedule(store: string | null, id: number): MockResult<null> {
  const list = schedules(store);
  const i = list.findIndex((x) => x.id === id);
  if (i === -1) return { ok: false, status: 404, body: { detail: "الاشتراك غير موجود." } };
  list.splice(i, 1);
  return { ok: true, status: 204, data: null };
}
