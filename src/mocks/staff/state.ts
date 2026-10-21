import type { MockResult } from "@/lib/bff/mock-route";
import { PERMISSION_KEYS, type PermissionKey } from "@/lib/access";
import { normalizePhone } from "@/lib/format";
import { isEmptyStore } from "@/mocks/empty-store";
import { listLocationRefs, locationsState, LOCATION_ROLES, type LocationRole } from "@/mocks/locations/state";
import { FIXTURE_NOW, nextId, storeState } from "@/mocks/store-state";

/**
 * M18 fixtures — StaffMember · Role/RolePermission/Permission · StaffLocationRole (the
 * role per location) · PermissionOverride · StaffSession/PersonalAccessToken/
 * TrustedDevice/RosterSchedule · AuditLog (hash-chained, append-only) · BehaviorAlert
 * (discovery 02 §8, §10). Every row is `[NEEDS BACKEND]`; the shapes are the §7 contract.
 *
 * Staff ids 2–5 are shared with the M22 assignment seed and the approvals seed; the owner
 * (فارس العمري) is not a staff row. The staff session fixture («كاشير» سارة الحربي) is id 2.
 */
export const PERMISSION_CATEGORIES = ["الطلبات", "الموظفون", "العملاء", "المخزون", "التقارير", "الخصومات", "الموردون", "الدعم", "القنوات", "المنتجات والكتالوج"] as const;

export interface MockPermission {
  code: PermissionKey;
  name: string;
  category: (typeof PERMISSION_CATEGORIES)[number];
}

const PERMISSION_META: Record<PermissionKey, [string, MockPermission["category"]]> = {
  "orders.view": ["عرض الطلبات", "الطلبات"],
  "orders.update_status": ["تغيير حالة الطلب", "الطلبات"],
  "orders.refund": ["استرجاع المبالغ", "الطلبات"],
  "orders.delete": ["حذف الطلبات", "الطلبات"],
  "orders.process_returns": ["معالجة المرتجعات", "الطلبات"],
  "orders.create_b2b": ["إنشاء طلبات الجملة", "الطلبات"],
  "orders.approve_b2b": ["اعتماد طلبات الجملة", "الطلبات"],
  "staff.view": ["عرض الموظفين", "الموظفون"],
  "staff.manage": ["إدارة الموظفين", "الموظفون"],
  "staff.manage_roles": ["إدارة الأدوار", "الموظفون"],
  "staff.manage_assignments": ["تعيين الموظفين على المواقع", "الموظفون"],
  "staff.view_sessions": ["عرض جلسات الموظفين", "الموظفون"],
  "customers.view": ["عرض العملاء", "العملاء"],
  "customers.edit_profile": ["تعديل ملف العميل", "العملاء"],
  "customers.manage_tier": ["إدارة فئات العملاء", "العملاء"],
  "customers.export": ["تصدير العملاء", "العملاء"],
  "inventory.view": ["عرض المخزون", "المخزون"],
  "inventory.adjust": ["تعديل المخزون", "المخزون"],
  "inventory.writeoff": ["طلب إعدام مخزون", "المخزون"],
  "reports.view": ["عرض التقارير", "التقارير"],
  "reports.export": ["تصدير التقارير", "التقارير"],
  "reports.sales.view": ["تقارير المبيعات", "التقارير"],
  "reports.profit.view": ["تقارير الربحية", "التقارير"],
  "reports.inventory.view": ["تقارير المخزون", "التقارير"],
  "reports.customers.view": ["تقارير العملاء", "التقارير"],
  "reports.staff_performance.view": ["تقارير أداء الموظفين", "التقارير"],
  "discounts.apply": ["تطبيق الخصومات", "الخصومات"],
  "discounts.manage": ["إدارة الكوبونات والعروض", "الخصومات"],
  "suppliers.manage": ["إدارة الموردين", "الموردون"],
  "suppliers.approve": ["اعتماد أوامر الشراء", "الموردون"],
  "support.takeover_session": ["الاستحواذ على جلسة دعم", "الدعم"],
  "channels.inbox.access": ["الوصول إلى صندوق المحادثات", "القنوات"],
  "channels.marketplaces.manage": ["إدارة الأسواق", "القنوات"],
  "channels.dropshipping.manage": ["إدارة الدروبشيبينج", "القنوات"],
  "catalog.manage": ["إدارة الكتالوج (التصنيفات والعلامات والوسوم والتشكيلات والشارات)", "المنتجات والكتالوج"],
};

export const PERMISSIONS: MockPermission[] = PERMISSION_KEYS.map((code) => ({ code, name: PERMISSION_META[code][0], category: PERMISSION_META[code][1] }));

export interface MockStaff {
  id: number;
  full_name: string;
  phone: string;
  is_active: boolean;
  terminated_at: string | null;
  enforce_ip_whitelist: boolean;
  enforce_roster_schedule: boolean;
  token_version: number;
  last_seen_at: string | null;
  created_at: string;
}

export interface MockRole {
  id: number;
  name: string;
  is_system_role: boolean;
  max_discount_percent: string | null;
  permission_codes: PermissionKey[];
}

/** StaffLocationRole — the dashboard role of a member at a location (M18 US-18.3). */
export interface MockStaffLocationRole {
  staff_id: number;
  location_id: number;
  role_id: number;
}

export interface MockOverride {
  id: number;
  staff_id: number;
  permission_code: PermissionKey;
  allow: boolean;
}

export interface MockStaffSession {
  id: number;
  staff_id: number;
  device: string;
  ip: string;
  last_activity_at: string;
  created_at: string;
  is_current: boolean;
}

export interface MockToken {
  id: number;
  staff_id: number;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

export interface MockDevice {
  id: number;
  staff_id: number;
  label: string;
  trusted_at: string;
  last_seen_at: string;
}

export interface MockRosterEntry {
  weekday: number; // 0 = Sunday
  from: string | null;
  to: string | null;
}

export interface MockAuditEntry {
  id: number;
  action_code: string;
  actor: string;
  entity: string | null;
  before_snapshot: Record<string, unknown> | null;
  after_snapshot: Record<string, unknown> | null;
  prev_hash: string;
  row_hash: string;
  created_at: string;
}

export const ALERT_TYPES = ["export_volume", "view_volume", "message_volume"] as const;
export type AlertType = (typeof ALERT_TYPES)[number];
export interface MockAlert {
  id: number;
  staff_id: number;
  level: "warning" | "critical";
  alert_type: AlertType;
  value: number;
  limit: number;
  is_read: boolean;
  created_at: string;
}

interface StaffState {
  staff: MockStaff[];
  roles: MockRole[];
  locationRoles: MockStaffLocationRole[];
  overrides: MockOverride[];
  sessions: MockStaffSession[];
  tokens: MockToken[];
  devices: MockDevice[];
  rosters: Map<number, MockRosterEntry[]>;
  audit: MockAuditEntry[];
  alerts: MockAlert[];
}

const at = (hoursAgo: number) => new Date(FIXTURE_NOW - hoursAgo * 3_600_000).toISOString();
const ALL = [...PERMISSION_KEYS] as PermissionKey[];

export const SYSTEM_ROLES: MockRole[] = [
  { id: 1, name: "مدير المتجر", is_system_role: true, max_discount_percent: null, permission_codes: ALL },
  { id: 2, name: "مدير الفرع", is_system_role: true, max_discount_percent: "20", permission_codes: ALL },
  { id: 3, name: "كاشير", is_system_role: true, max_discount_percent: "10", permission_codes: ["orders.view", "orders.update_status", "customers.view", "inventory.view", "discounts.apply"] },
  { id: 4, name: "أمين مخزن", is_system_role: true, max_discount_percent: null, permission_codes: ["orders.view", "inventory.view", "inventory.adjust", "inventory.writeoff", "reports.view"] },
];

/** A tiny deterministic 32-bit hash rendered as 12 hex chars — enough for a visible chain. */
export function chainHash(prev: string, payload: string): string {
  let h = 0x811c9dc5;
  for (const ch of prev + "|" + payload) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  let h2 = 0x9e3779b9 ^ h;
  for (const ch of payload) h2 = Math.imul(h2 ^ ch.charCodeAt(0), 0x85ebca6b) >>> 0;
  return (h.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")).slice(0, 12);
}

function auditPayload(e: Omit<MockAuditEntry, "prev_hash" | "row_hash">): string {
  return JSON.stringify([e.id, e.action_code, e.actor, e.entity, e.before_snapshot, e.after_snapshot, e.created_at]);
}

function seed(store: string | null): StaffState {
  const state: StaffState = { staff: [], roles: SYSTEM_ROLES.map((r) => ({ ...r, permission_codes: [...r.permission_codes] })), locationRoles: [], overrides: [], sessions: [], tokens: [], devices: [], rosters: new Map(), audit: [], alerts: [] };
  if (isEmptyStore(store)) return state;
  state.staff = [
    { id: 2, full_name: "سارة الحربي", phone: "967770000001", is_active: true, terminated_at: null, enforce_ip_whitelist: false, enforce_roster_schedule: true, token_version: 3, last_seen_at: at(1), created_at: at(24 * 240) },
    { id: 3, full_name: "خالد المطيري", phone: "967771020304", is_active: true, terminated_at: null, enforce_ip_whitelist: false, enforce_roster_schedule: false, token_version: 1, last_seen_at: at(5), created_at: at(24 * 200) },
    { id: 4, full_name: "منى القحطاني", phone: "966551234567", is_active: true, terminated_at: null, enforce_ip_whitelist: true, enforce_roster_schedule: false, token_version: 2, last_seen_at: at(26), created_at: at(24 * 300) },
    { id: 5, full_name: "عمر باوزير", phone: "967733445566", is_active: false, terminated_at: at(24 * 40), enforce_ip_whitelist: false, enforce_roster_schedule: false, token_version: 4, last_seen_at: at(24 * 41), created_at: at(24 * 400) },
    { id: 6, full_name: "ريم الشهري", phone: "966500112233", is_active: true, terminated_at: null, enforce_ip_whitelist: false, enforce_roster_schedule: false, token_version: 1, last_seen_at: at(72), created_at: at(24 * 60) },
    { id: 7, full_name: "أحمد الزبيدي", phone: "967777889900", is_active: false, terminated_at: null, enforce_ip_whitelist: false, enforce_roster_schedule: false, token_version: 1, last_seen_at: null, created_at: at(24 * 3) },
    { id: 8, full_name: "هند العمودي", phone: "967770000009", is_active: true, terminated_at: null, enforce_ip_whitelist: false, enforce_roster_schedule: false, token_version: 1, last_seen_at: at(240), created_at: at(24 * 120) },
  ];
  state.roles.push({ id: 5, name: "مشرف توصيل", is_system_role: false, max_discount_percent: "5", permission_codes: ["orders.view", "orders.update_status", "customers.view"] });
  state.locationRoles = [
    { staff_id: 2, location_id: 2, role_id: 3 },
    { staff_id: 3, location_id: 1, role_id: 4 },
    { staff_id: 4, location_id: 3, role_id: 2 },
    { staff_id: 6, location_id: 2, role_id: 5 },
    { staff_id: 6, location_id: 1, role_id: 5 },
    { staff_id: 8, location_id: 1, role_id: 3 },
  ];
  state.overrides = [
    { id: 1, staff_id: 2, permission_code: "orders.refund", allow: true },
    { id: 2, staff_id: 6, permission_code: "customers.view", allow: false },
  ];
  state.sessions = [
    { id: 11, staff_id: 2, device: "Chrome · Android 14", ip: "5.106.44.12", last_activity_at: at(1), created_at: at(30), is_current: true },
    { id: 12, staff_id: 2, device: "Safari · iPhone", ip: "5.106.9.201", last_activity_at: at(50), created_at: at(300), is_current: false },
    { id: 13, staff_id: 3, device: "Edge · Windows 11", ip: "37.224.100.4", last_activity_at: at(5), created_at: at(90), is_current: true },
    { id: 14, staff_id: 4, device: "Chrome · macOS", ip: "188.247.6.90", last_activity_at: at(26), created_at: at(400), is_current: true },
  ];
  state.tokens = [
    { id: 1, staff_id: 2, name: "تطبيق نقطة البيع", created_at: at(24 * 30), last_used_at: at(2) },
    { id: 2, staff_id: 3, name: "ماسح المستودع", created_at: at(24 * 90), last_used_at: at(24 * 12) },
  ];
  state.devices = [
    { id: 1, staff_id: 2, label: "Galaxy A54", trusted_at: at(24 * 30), last_seen_at: at(1) },
    { id: 2, staff_id: 2, label: "iPhone 13", trusted_at: at(24 * 120), last_seen_at: at(50) },
    { id: 3, staff_id: 4, label: "MacBook Air", trusted_at: at(24 * 200), last_seen_at: at(26) },
  ];
  state.rosters.set(
    2,
    Array.from({ length: 7 }, (_, weekday) => (weekday === 5 ? { weekday, from: null, to: null } : { weekday, from: "09:00", to: "17:00" })),
  );
  const auditSeed: Array<Omit<MockAuditEntry, "id" | "prev_hash" | "row_hash">> = [
    { action_code: "staff.created", actor: "فارس العمري", entity: "موظف #8", before_snapshot: null, after_snapshot: { full_name: "هند العمودي", is_active: true }, created_at: at(24 * 120) },
    { action_code: "role.updated", actor: "فارس العمري", entity: "دور «مشرف توصيل»", before_snapshot: { max_discount_percent: "10" }, after_snapshot: { max_discount_percent: "5" }, created_at: at(24 * 44) },
    { action_code: "staff.terminated", actor: "فارس العمري", entity: "موظف #5", before_snapshot: { is_active: true, terminated_at: null }, after_snapshot: { is_active: false, terminated_at: at(24 * 40) }, created_at: at(24 * 40) },
    { action_code: "order.status_changed", actor: "سارة الحربي", entity: "طلب #10452", before_snapshot: { fulfillment: "قيد التجهيز" }, after_snapshot: { fulfillment: "قيد التوصيل" }, created_at: at(24 * 9) },
    { action_code: "customers.exported", actor: "منى القحطاني", entity: "تصدير العملاء", before_snapshot: null, after_snapshot: { rows: 412, filters: { segment: "dormant" } }, created_at: at(24 * 2) },
    { action_code: "approval.resolved", actor: "فارس العمري", entity: "طلب موافقة #4", before_snapshot: { status: "pending" }, after_snapshot: { status: "approved" }, created_at: at(50) },
    { action_code: "staff.sessions_revoked", actor: "فارس العمري", entity: "موظف #4", before_snapshot: { token_version: 1 }, after_snapshot: { token_version: 2 }, created_at: at(28) },
    { action_code: "inventory.adjusted", actor: "سارة الحربي", entity: "طقم فناجين", before_snapshot: { stock: "16.000" }, after_snapshot: { stock: "14.000", reason: "manual_adjust" }, created_at: at(5) },
  ];
  let prev = "000000000000";
  auditSeed.forEach((e, i) => {
    const entry = { id: i + 1, ...e } as Omit<MockAuditEntry, "prev_hash" | "row_hash">;
    const row_hash = chainHash(prev, auditPayload(entry));
    state.audit.push({ ...entry, prev_hash: prev, row_hash });
    prev = row_hash;
  });
  state.alerts = [
    { id: 1, staff_id: 4, level: "critical", alert_type: "export_volume", value: 6, limit: 3, is_read: false, created_at: at(26) },
    { id: 2, staff_id: 2, level: "warning", alert_type: "view_volume", value: 180, limit: 150, is_read: false, created_at: at(3) },
    { id: 3, staff_id: 5, level: "warning", alert_type: "message_volume", value: 95, limit: 80, is_read: true, created_at: at(24 * 42) },
  ];
  return state;
}

export function staffState(store: string | null): StaffState {
  return storeState(store, "staff", () => seed(store));
}

/** Who the session is, as the approvals and audit rows need it: the staff id (null = owner) + name. */
export function sessionActor(store: string | null, session: { kind: string; staff?: { full_name: string } }): { id: number | null; name: string } {
  if (session.kind === "merchant" || !session.staff) return { id: null, name: "فارس العمري" };
  const row = staffState(store).staff.find((s) => s.full_name === session.staff!.full_name);
  return { id: row?.id ?? null, name: session.staff.full_name };
}

export function audit(store: string | null, entry: Omit<MockAuditEntry, "id" | "prev_hash" | "row_hash" | "created_at">): MockAuditEntry {
  const state = staffState(store);
  const last = state.audit.at(-1);
  const prev = last?.row_hash ?? "000000000000";
  const base = { id: nextId(store, "audit", 1000), created_at: new Date().toISOString(), ...entry };
  const row = { ...base, prev_hash: prev, row_hash: chainHash(prev, auditPayload(base)) };
  state.audit.push(row);
  return row;
}

/** `verify_chain()` — recomputes every hash; `break` simulates a tampered row for the check script. */
export function verifyChain(store: string | null, simulateBreak = false): { ok: boolean; broken_at: number | null; rows: number } {
  const rows = staffState(store).audit;
  let prev = "000000000000";
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const expected = chainHash(prev, auditPayload(r));
    if (r.prev_hash !== prev || r.row_hash !== expected || (simulateBreak && i === Math.min(3, rows.length - 1))) {
      return { ok: false, broken_at: i + 1, rows: rows.length };
    }
    prev = r.row_hash;
  }
  return { ok: true, broken_at: null, rows: rows.length };
}

// ── Views ────────────────────────────────────────────────────────────────────────────

export type StaffStatus = "active" | "inactive" | "terminated";
export function staffStatus(s: MockStaff): StaffStatus {
  if (s.terminated_at) return "terminated";
  return s.is_active ? "active" : "inactive";
}

export function rolesSummary(store: string | null, staffId: number): string {
  const state = staffState(store);
  const refs = listLocationRefs(store);
  const parts = state.locationRoles
    .filter((r) => r.staff_id === staffId)
    .map((r) => `${state.roles.find((x) => x.id === r.role_id)?.name ?? "—"} · ${refs.find((l) => l.id === r.location_id)?.name ?? "—"}`);
  return parts.join("، ");
}

export function listStaff(store: string | null, params: URLSearchParams) {
  const state = staffState(store);
  const q = (params.get("q") ?? "").trim();
  const status = params.get("status");
  // Phone search accepts the local form (`0770…` → `770…`) and the normalised one (US-18.1 Independent Test).
  const digits = q.replace(/\D/g, "").replace(/^0/, "");
  const qPhone = /^\d{9,}$/.test(q.replace(/\D/g, "")) ? normalizePhone(q) : "";
  let rows = state.staff;
  if (status) rows = rows.filter((s) => staffStatus(s) === status);
  if (q) rows = rows.filter((s) => s.full_name.includes(q) || (digits.length >= 3 && s.phone.includes(digits)) || (qPhone.length > 5 && s.phone.includes(qPhone)));
  rows = [...rows].sort((a, b) => Number(Boolean(a.terminated_at)) - Number(Boolean(b.terminated_at)) || a.full_name.localeCompare(b.full_name, "ar"));
  const page = Math.max(1, Number(params.get("page") ?? 1));
  const size = Math.min(100, Math.max(1, Number(params.get("page_size") ?? 50)));
  const slice = rows.slice((page - 1) * size, page * size);
  return {
    count: rows.length,
    results: slice.map((s) => ({ ...toStaffView(s), roles_summary: rolesSummary(store, s.id) })),
  };
}

export function toStaffView(s: MockStaff) {
  return { ...s, status: staffStatus(s) };
}

export function getStaff(store: string | null, id: number) {
  const s = staffState(store).staff.find((x) => x.id === id);
  return s ? { ...toStaffView(s), roles_summary: rolesSummary(store, s.id) } : null;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const bool = (v: unknown) => v === true || v === "true";

export function createStaff(store: string | null, body: Record<string, unknown>, actor: string): MockResult<ReturnType<typeof toStaffView>> {
  const state = staffState(store);
  const errors: Record<string, string[]> = {};
  const full_name = str(body.full_name);
  if (full_name.length < 2) errors.full_name = ["الاسم مطلوب."];
  const phone = normalizePhone(str(body.phone));
  if (!/^9(66|67)\d{8,9}$/.test(phone)) errors.phone = ["رقم الهاتف غير صالح."];
  else if (state.staff.some((s) => s.phone === phone)) errors.phone = ["هذا الرقم مسجَّل لموظف آخر."];
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  const row: MockStaff = {
    id: nextId(store, "staff", 100),
    full_name,
    phone,
    is_active: body.is_active === undefined ? true : bool(body.is_active),
    terminated_at: null,
    enforce_ip_whitelist: bool(body.enforce_ip_whitelist),
    enforce_roster_schedule: bool(body.enforce_roster_schedule),
    token_version: 1,
    last_seen_at: null,
    created_at: new Date().toISOString(),
  };
  state.staff.push(row);
  audit(store, { action_code: "staff.created", actor, entity: `موظف #${row.id}`, before_snapshot: null, after_snapshot: { full_name, phone, is_active: row.is_active } });
  return { ok: true, status: 201, data: toStaffView(row) };
}

export function patchStaff(store: string | null, id: number, body: Record<string, unknown>, actor: string): MockResult<ReturnType<typeof toStaffView>> {
  const state = staffState(store);
  const row = state.staff.find((s) => s.id === id);
  if (!row) return { ok: false, status: 404, body: { detail: "الموظف غير موجود." } };
  if (row.terminated_at) return { ok: false, status: 400, body: { detail: "الموظف مُنهى الخدمة." } };
  const before = { ...row };
  if ("full_name" in body) {
    const v = str(body.full_name);
    if (v.length < 2) return { ok: false, status: 400, body: { full_name: ["الاسم مطلوب."] } };
    row.full_name = v;
  }
  if ("phone" in body) {
    const p = normalizePhone(str(body.phone));
    if (!/^9(66|67)\d{8,9}$/.test(p)) return { ok: false, status: 400, body: { phone: ["رقم الهاتف غير صالح."] } };
    if (state.staff.some((s) => s.phone === p && s.id !== id)) return { ok: false, status: 400, body: { phone: ["هذا الرقم مسجَّل لموظف آخر."] } };
    row.phone = p;
  }
  for (const k of ["is_active", "enforce_ip_whitelist", "enforce_roster_schedule"] as const) if (k in body) row[k] = bool(body[k]);
  audit(store, { action_code: "staff.updated", actor, entity: `موظف #${id}`, before_snapshot: { is_active: before.is_active, enforce_ip_whitelist: before.enforce_ip_whitelist }, after_snapshot: { is_active: row.is_active, enforce_ip_whitelist: row.enforce_ip_whitelist } });
  return { ok: true, data: toStaffView(row) };
}

export function terminateStaff(store: string | null, id: number, actor: string): MockResult<ReturnType<typeof toStaffView>> {
  const state = staffState(store);
  const row = state.staff.find((s) => s.id === id);
  if (!row) return { ok: false, status: 404, body: { detail: "الموظف غير موجود." } };
  if (row.terminated_at) return { ok: false, status: 400, body: { detail: "الموظف مُنهى الخدمة أصلاً." } };
  row.terminated_at = new Date().toISOString();
  row.is_active = false;
  row.token_version += 1;
  state.sessions = state.sessions.filter((s) => s.staff_id !== id);
  audit(store, { action_code: "staff.terminated", actor, entity: `موظف #${id}`, before_snapshot: { is_active: true, terminated_at: null }, after_snapshot: { is_active: false, terminated_at: row.terminated_at } });
  return { ok: true, data: toStaffView(row) };
}

export function revokeSessions(store: string | null, id: number, actor: string): MockResult<{ token_version: number }> {
  const state = staffState(store);
  const row = state.staff.find((s) => s.id === id);
  if (!row) return { ok: false, status: 404, body: { detail: "الموظف غير موجود." } };
  const before = row.token_version;
  row.token_version += 1;
  state.sessions = state.sessions.filter((s) => s.staff_id !== id);
  audit(store, { action_code: "staff.sessions_revoked", actor, entity: `موظف #${id}`, before_snapshot: { token_version: before }, after_snapshot: { token_version: row.token_version } });
  return { ok: true, data: { token_version: row.token_version } };
}

// ── Roles ────────────────────────────────────────────────────────────────────────────

export function roleView(store: string | null, r: MockRole) {
  const members = staffState(store).locationRoles.filter((x) => x.role_id === r.id).map((x) => x.staff_id);
  return { ...r, members_count: new Set(members).size };
}

export function saveRole(store: string | null, id: number | null, body: Record<string, unknown>, actor: string): MockResult<ReturnType<typeof roleView>> {
  const state = staffState(store);
  const existing = id ? state.roles.find((r) => r.id === id) : undefined;
  if (id && !existing) return { ok: false, status: 404, body: { detail: "الدور غير موجود." } };
  if (existing?.is_system_role) return { ok: false, status: 403, body: { detail: "الأدوار النظامية للقراءة فقط — انسخها كدور مخصص." } };
  const errors: Record<string, string[]> = {};
  const name = str(body.name);
  if (name.length < 2) errors.name = ["اسم الدور مطلوب."];
  else if (state.roles.some((r) => r.name === name && r.id !== id)) errors.name = ["يوجد دور بهذا الاسم."];
  let max: string | null = null;
  if (body.max_discount_percent !== undefined && body.max_discount_percent !== null && body.max_discount_percent !== "") {
    const n = Number(body.max_discount_percent);
    if (!Number.isFinite(n) || n < 0 || n > 100) errors.max_discount_percent = ["النسبة بين 0 و100."];
    else max = String(n);
  }
  const codes = Array.isArray(body.permission_codes) ? body.permission_codes.filter((c): c is PermissionKey => (PERMISSION_KEYS as readonly string[]).includes(String(c))) : [];
  if (codes.length === 0) errors.permission_codes = ["حدد صلاحية واحدة على الأقل."];
  if (Object.keys(errors).length) return { ok: false, status: 400, body: errors };
  if (existing) {
    const before = { name: existing.name, max_discount_percent: existing.max_discount_percent, permissions: existing.permission_codes.length };
    existing.name = name;
    existing.max_discount_percent = max;
    existing.permission_codes = codes;
    audit(store, { action_code: "role.updated", actor, entity: `دور «${name}»`, before_snapshot: before, after_snapshot: { name, max_discount_percent: max, permissions: codes.length } });
    return { ok: true, data: roleView(store, existing) };
  }
  const role: MockRole = { id: nextId(store, "roles", 100), name, is_system_role: false, max_discount_percent: max, permission_codes: codes };
  state.roles.push(role);
  audit(store, { action_code: "role.created", actor, entity: `دور «${name}»`, before_snapshot: null, after_snapshot: { max_discount_percent: max, permissions: codes.length } });
  return { ok: true, status: 201, data: roleView(store, role) };
}

export function deleteRole(store: string | null, id: number, actor: string): MockResult<{ deleted: true }> {
  const state = staffState(store);
  const role = state.roles.find((r) => r.id === id);
  if (!role) return { ok: false, status: 404, body: { detail: "الدور غير موجود." } };
  if (role.is_system_role) return { ok: false, status: 403, body: { detail: "الأدوار النظامية لا تُحذف." } };
  const members = [...new Set(state.locationRoles.filter((x) => x.role_id === id).map((x) => x.staff_id))].map((sid) => state.staff.find((s) => s.id === sid)).filter(Boolean);
  if (members.length) {
    return { ok: false, status: 403, body: { detail: "الدور مُعيَّن لموظفين — أعد تعيينهم أولاً.", staff: members.map((m) => ({ id: m!.id, full_name: m!.full_name })) } };
  }
  state.roles = state.roles.filter((r) => r.id !== id);
  audit(store, { action_code: "role.deleted", actor, entity: `دور «${role.name}»`, before_snapshot: { name: role.name }, after_snapshot: null });
  return { ok: true, data: { deleted: true } };
}

// ── Assignments · overrides · effective permissions ─────────────────────────────────

export interface AssignmentView {
  location_id: number;
  location_name: string;
  location_active: boolean;
  role_id: number | null;
  location_role: LocationRole | null;
}

export function assignments(store: string | null, staffId: number): AssignmentView[] {
  const state = staffState(store);
  const ls = locationsState(store);
  return ls.locations.map((l) => ({
    location_id: l.id,
    location_name: l.name,
    location_active: l.is_active,
    role_id: state.locationRoles.find((r) => r.staff_id === staffId && r.location_id === l.id)?.role_id ?? null,
    location_role: ls.assignments.find((a) => a.staff_id === staffId && a.location_id === l.id)?.role ?? null,
  }));
}

/** `PUT /api/v1/staff/<id>/assignments/` `[{location_id, role_id, location_role}]` — replaces the matrix row by row. */
export function putAssignments(store: string | null, staffId: number, body: unknown, actor: string): MockResult<AssignmentView[]> {
  const state = staffState(store);
  const ls = locationsState(store);
  if (!state.staff.some((s) => s.id === staffId)) return { ok: false, status: 404, body: { detail: "الموظف غير موجود." } };
  if (!Array.isArray(body)) return { ok: false, status: 400, body: { detail: "قائمة التعيينات مطلوبة." } };
  const next: MockStaffLocationRole[] = [];
  const nextOps: Array<{ location_id: number; role: LocationRole }> = [];
  for (const item of body as Array<Record<string, unknown>>) {
    const location_id = Number(item.location_id);
    if (!ls.locations.some((l) => l.id === location_id)) return { ok: false, status: 400, body: { location_id: [`الموقع ${location_id} غير موجود.`] } };
    if (item.role_id !== null && item.role_id !== undefined && item.role_id !== "") {
      const role_id = Number(item.role_id);
      if (!state.roles.some((r) => r.id === role_id)) return { ok: false, status: 400, body: { role_id: ["الدور غير موجود."] } };
      next.push({ staff_id: staffId, location_id, role_id });
    }
    if (item.location_role) {
      if (!(LOCATION_ROLES as readonly string[]).includes(String(item.location_role))) return { ok: false, status: 400, body: { location_role: ["الدور التشغيلي غير معروف."] } };
      nextOps.push({ location_id, role: item.location_role as LocationRole });
    }
  }
  const before = state.locationRoles.filter((r) => r.staff_id === staffId).length;
  state.locationRoles = [...state.locationRoles.filter((r) => r.staff_id !== staffId), ...next];
  ls.assignments = ls.assignments.filter((a) => a.staff_id !== staffId);
  for (const op of nextOps) ls.assignments.push({ id: nextId(store, "locations:assignment", 500), staff_id: staffId, location_id: op.location_id, role: op.role });
  audit(store, { action_code: "staff.assignments_updated", actor, entity: `موظف #${staffId}`, before_snapshot: { assignments: before }, after_snapshot: { assignments: next.length } });
  return { ok: true, data: assignments(store, staffId) };
}

export function addOverride(store: string | null, staffId: number, body: Record<string, unknown>, actor: string): MockResult<MockOverride> {
  const state = staffState(store);
  if (!state.staff.some((s) => s.id === staffId)) return { ok: false, status: 404, body: { detail: "الموظف غير موجود." } };
  const code = str(body.permission_code);
  if (!(PERMISSION_KEYS as readonly string[]).includes(code)) return { ok: false, status: 400, body: { permission_code: ["مفتاح صلاحية غير معروف."] } };
  const allow = bool(body.allow);
  const existing = state.overrides.find((o) => o.staff_id === staffId && o.permission_code === code);
  if (existing) {
    existing.allow = allow;
    return { ok: true, data: existing };
  }
  const row: MockOverride = { id: nextId(store, "overrides", 100), staff_id: staffId, permission_code: code as PermissionKey, allow };
  state.overrides.push(row);
  audit(store, { action_code: "staff.override_added", actor, entity: `موظف #${staffId}`, before_snapshot: null, after_snapshot: { permission_code: code, allow } });
  return { ok: true, status: 201, data: row };
}

export function removeOverride(store: string | null, staffId: number, overrideId: number, actor: string): MockResult<{ deleted: true }> {
  const state = staffState(store);
  const row = state.overrides.find((o) => o.id === overrideId && o.staff_id === staffId);
  if (!row) return { ok: false, status: 404, body: { detail: "الاستثناء غير موجود." } };
  state.overrides = state.overrides.filter((o) => o.id !== overrideId);
  audit(store, { action_code: "staff.override_removed", actor, entity: `موظف #${staffId}`, before_snapshot: { permission_code: row.permission_code, allow: row.allow }, after_snapshot: null });
  return { ok: true, data: { deleted: true } };
}

/** `permission_resolver` order: the union of the location roles (or one location), then the override wins. */
export function effectivePermissions(store: string | null, staffId: number, locationId: number | null) {
  const state = staffState(store);
  const roleRows = state.locationRoles.filter((r) => r.staff_id === staffId && (locationId === null || r.location_id === locationId));
  const fromRoles = new Set<PermissionKey>();
  for (const rr of roleRows) for (const c of state.roles.find((r) => r.id === rr.role_id)?.permission_codes ?? []) fromRoles.add(c);
  return PERMISSION_KEYS.map((code) => {
    const override = state.overrides.find((o) => o.staff_id === staffId && o.permission_code === code);
    const role = fromRoles.has(code);
    const effective = override ? override.allow : role;
    return { code, from_role: role, override: override ? override.allow : null, effective };
  });
}

// ── Sessions · tokens · devices · roster ────────────────────────────────────────────

export function endSession(store: string | null, staffId: number, sessionId: number | null, actor: string): MockResult<{ ended: number }> {
  const state = staffState(store);
  const before = state.sessions.filter((s) => s.staff_id === staffId && (sessionId === null || s.id === sessionId));
  if (sessionId !== null && before.length === 0) return { ok: false, status: 404, body: { detail: "الجلسة غير موجودة." } };
  state.sessions = state.sessions.filter((s) => !before.includes(s));
  audit(store, { action_code: sessionId === null ? "staff.sessions_ended" : "staff.session_ended", actor, entity: `موظف #${staffId}`, before_snapshot: { sessions: before.length }, after_snapshot: { sessions: 0 } });
  return { ok: true, data: { ended: before.length } };
}

export function createToken(store: string | null, staffId: number, body: Record<string, unknown>, actor: string): MockResult<MockToken & { token: string }> {
  const state = staffState(store);
  if (!state.staff.some((s) => s.id === staffId)) return { ok: false, status: 404, body: { detail: "الموظف غير موجود." } };
  const name = str(body.name);
  if (name.length < 2) return { ok: false, status: 400, body: { name: ["اسم الرمز مطلوب."] } };
  const row: MockToken = { id: nextId(store, "tokens", 100), staff_id: staffId, name, created_at: new Date().toISOString(), last_used_at: null };
  state.tokens.push(row);
  const token = `shw_pat_${chainHash(String(row.id), name)}${chainHash(name, String(Date.now()))}`;
  audit(store, { action_code: "staff.token_created", actor, entity: `موظف #${staffId}`, before_snapshot: null, after_snapshot: { name } });
  return { ok: true, status: 201, data: { ...row, token } };
}

export function revokeToken(store: string | null, staffId: number, tokenId: number, actor: string): MockResult<{ deleted: true }> {
  const state = staffState(store);
  const row = state.tokens.find((t) => t.id === tokenId && t.staff_id === staffId);
  if (!row) return { ok: false, status: 404, body: { detail: "الرمز غير موجود." } };
  state.tokens = state.tokens.filter((t) => t.id !== tokenId);
  audit(store, { action_code: "staff.token_revoked", actor, entity: `موظف #${staffId}`, before_snapshot: { name: row.name }, after_snapshot: null });
  return { ok: true, data: { deleted: true } };
}

export function removeDevice(store: string | null, staffId: number, deviceId: number): MockResult<{ deleted: true }> {
  const state = staffState(store);
  if (!state.devices.some((d) => d.id === deviceId && d.staff_id === staffId)) return { ok: false, status: 404, body: { detail: "الجهاز غير موجود." } };
  state.devices = state.devices.filter((d) => d.id !== deviceId);
  return { ok: true, data: { deleted: true } };
}

export function roster(store: string | null, staffId: number): MockRosterEntry[] {
  return staffState(store).rosters.get(staffId) ?? Array.from({ length: 7 }, (_, weekday) => ({ weekday, from: null, to: null }));
}

export function putRoster(store: string | null, staffId: number, body: unknown): MockResult<MockRosterEntry[]> {
  if (!Array.isArray(body) || body.length !== 7) return { ok: false, status: 400, body: { detail: "سبعة أيام مطلوبة." } };
  const rows: MockRosterEntry[] = [];
  for (const item of body as Array<Record<string, unknown>>) {
    const weekday = Number(item.weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return { ok: false, status: 400, body: { detail: "اليوم بين 0 و6." } };
    const from = item.from ? str(item.from) : null;
    const to = item.to ? str(item.to) : null;
    if ((from && !/^\d{2}:\d{2}$/.test(from)) || (to && !/^\d{2}:\d{2}$/.test(to))) return { ok: false, status: 400, body: { detail: "صيغة الوقت HH:MM." } };
    if (from && to && from >= to) return { ok: false, status: 400, body: { detail: `اليوم ${weekday}: وقت النهاية بعد البداية.` } };
    rows.push({ weekday, from: from || null, to: to || null });
  }
  rows.sort((a, b) => a.weekday - b.weekday);
  staffState(store).rosters.set(staffId, rows);
  return { ok: true, data: rows };
}

// ── Audit log · alerts ──────────────────────────────────────────────────────────────

export function listAudit(store: string | null, params: URLSearchParams) {
  let rows = [...staffState(store).audit].reverse();
  const actor = params.get("actor");
  const action = params.get("action");
  const from = params.get("from");
  const to = params.get("to");
  const q = params.get("q");
  if (q) rows = rows.filter((r) => r.actor.includes(q) || r.action_code.includes(q) || (r.entity ?? "").includes(q));
  if (actor) rows = rows.filter((r) => r.actor.includes(actor));
  if (action) rows = rows.filter((r) => r.action_code.startsWith(action));
  if (from) rows = rows.filter((r) => r.created_at >= from);
  if (to) rows = rows.filter((r) => r.created_at.slice(0, 10) <= to);
  const page = Math.max(1, Number(params.get("page") ?? 1));
  const size = Math.min(100, Math.max(1, Number(params.get("page_size") ?? 50)));
  return { count: rows.length, results: rows.slice((page - 1) * size, page * size) };
}

export function listAlerts(store: string | null, params: URLSearchParams) {
  const state = staffState(store);
  let rows = [...state.alerts].sort((a, b) => Number(a.is_read) - Number(b.is_read) || b.created_at.localeCompare(a.created_at));
  const level = params.get("level");
  if (level) rows = rows.filter((a) => a.level === level);
  if (params.get("unread") === "true") rows = rows.filter((a) => !a.is_read);
  return {
    count: rows.length,
    results: rows.map((a) => {
      const s = state.staff.find((x) => x.id === a.staff_id);
      return { ...a, staff_name: s?.full_name ?? "—", staff_terminated: Boolean(s?.terminated_at) };
    }),
  };
}

export function readAlert(store: string | null, id: number): MockResult<{ id: number; is_read: true }> {
  const a = staffState(store).alerts.find((x) => x.id === id);
  if (!a) return { ok: false, status: 404, body: { detail: "التنبيه غير موجود." } };
  a.is_read = true;
  return { ok: true, data: { id, is_read: true } };
}

export function unreadAlertsCount(store: string | null): number {
  return staffState(store).alerts.filter((a) => !a.is_read).length;
}
