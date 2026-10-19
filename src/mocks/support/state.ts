import type { MockResult } from "@/lib/bff/mock-route";
import { int, pick, seeded } from "@/mocks/_fixtures";
import { isEmptyStore } from "@/mocks/empty-store";
import { seedOf, storeState } from "@/mocks/store-state";
import { staffState } from "@/mocks/staff/state";
import type { Viewer } from "@/mocks/inbox/state";

/**
 * M31 live support sessions + M32 support tickets (§7, all `[NEEDS BACKEND]`).
 * Session transitions (M31 §5): bot_active → human_locked (takeover) · bot_active →
 * escalated (system) · escalated → human_locked · human_locked → bot_active (release) ·
 * * → closed. Every write carries `version`; a stale one answers 409 with the fresh row.
 */
export type SessionStatus = "bot_active" | "human_locked" | "escalated" | "closed";
export type SessionType = "customer" | "affiliate" | "staff_internal";
export type TicketStatus = "open" | "in_progress" | "closed";

interface TimelineItem {
  id: number;
  kind: "message" | "tool_call";
  sender_type?: "customer" | "bot" | "staff";
  sender_name?: string | null;
  text?: string;
  tool_name?: string;
  input_summary?: string;
  output_summary?: string | null;
  error?: string | null;
  client_id?: string | null;
  created_at: string;
}

interface MockSession {
  id: number;
  session_type: SessionType;
  status: SessionStatus;
  party: { name: string; phone: string | null };
  assigned_staff: { id: number | null; name: string } | null;
  last_activity_at: string;
  version: number;
  timeline: TimelineItem[];
  /** Fixture: the first takeover attempt meets a colleague who got there first. */
  contended: boolean;
}

interface MockTicket {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  assigned_to: { id: number; name: string } | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface SupportState {
  sessions: MockSession[];
  tickets: MockTicket[];
  ids: { session: number; item: number; ticket: number };
}

const PARTIES = ["ريم الأحمد", "عبدالله الشمري", "نوف العتيبي", "محمد باعلوي", "هيفاء السقاف", "يوسف الحداد", "أمل الكثيري", "سالم بن طالب"];
const ASKS = ["أين طلبي رقم 1042؟", "أريد إلغاء الطلب", "المنتج وصل تالفاً", "هل يمكن تغيير المقاس؟", "متى تنزل عمولتي؟", "رابط التسويق لا يعمل", "أريد التحدث مع موظف"];
const TICKET_TITLES = ["تعذّر رفع صور المنتجات", "فرق في رصيد المحفظة", "رسائل واتساب لا تصل", "طلب تعديل نطاق المتجر", "مشكلة في الدفع عند الاستلام", "استفسار عن فاتورة الاشتراك", "خطأ في تقرير المبيعات", "مزامنة تيك توك متوقفة", "عميل يطلب حذف بياناته", "تأخر شركة الشحن"];

function seed(store: string | null): SupportState {
  const now = Date.now();
  const iso = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();
  const rnd = seeded(seedOf(store) + 31);
  const st: SupportState = { sessions: [], tickets: [], ids: { session: 1, item: 1, ticket: 1001 } };
  if (isEmptyStore(store)) return st;
  const staff = staffState(store).staff.filter((s) => s.is_active);
  const khaled = staff.find((s) => s.id === 3) ?? staff[0]!;

  for (let i = 0; i < 30; i++) {
    const status: SessionStatus = i === 0 ? "escalated" : i === 1 ? "bot_active" : i === 2 ? "human_locked" : i === 3 ? "human_locked" : i < 6 ? "escalated" : i % 4 === 0 ? "closed" : i % 5 === 0 ? "human_locked" : "bot_active";
    const type: SessionType = i === 4 ? "affiliate" : i === 7 ? "staff_internal" : i % 9 === 8 ? "affiliate" : "customer";
    const minutesAgo = i === 0 ? 2 : i * 41 + int(rnd, 0, 30);
    const name = PARTIES[(i * 3) % PARTIES.length]!;
    const assignee = status === "human_locked" ? (i === 3 ? { id: null, name: "فارس العمري" } : { id: khaled.id, name: khaled.full_name }) : null;
    const s: MockSession = {
      id: st.ids.session++,
      session_type: type,
      status,
      party: { name: type === "staff_internal" ? "هند العمودي" : name, phone: type === "staff_internal" ? null : `9677${int(rnd, 10000000, 79999999)}` },
      assigned_staff: assignee,
      last_activity_at: iso(minutesAgo),
      version: 1 + (i % 3),
      timeline: [],
      contended: i === 1,
    };
    const ask = ASKS[i % ASKS.length]!;
    const t0 = minutesAgo + 12;
    const push = (item: Omit<TimelineItem, "id">) => s.timeline.push({ id: st.ids.item++, ...item });
    push({ kind: "message", sender_type: "customer", sender_name: s.party.name, text: ask, created_at: iso(t0) });
    push({ kind: "tool_call", tool_name: "lookup_order", input_summary: '{"order_number": "1042"}', output_summary: '{"status": "shipped", "carrier": "شروة شيب"}', error: null, created_at: iso(t0 - 1) });
    push({ kind: "message", sender_type: "bot", sender_name: "شروة AI", text: "طلبك رقم 1042 خرج للتوصيل مع شروة شيب، ويصلك خلال 24 ساعة.", created_at: iso(t0 - 1) });
    push({ kind: "message", sender_type: "customer", sender_name: s.party.name, text: i % 2 ? "شكراً" : "أريد التحدث مع موظف", created_at: iso(t0 - 4) });
    if (i % 3 === 0) push({ kind: "tool_call", tool_name: "create_refund_request", input_summary: '{"order_number": "1042", "token": "***"}', output_summary: null, error: "ليست للبوت صلاحية إنشاء استرجاع.", created_at: iso(t0 - 5) });
    if (assignee) push({ kind: "message", sender_type: "staff", sender_name: assignee.name, text: "معك من فريق المتجر، كيف أساعدك؟", created_at: iso(minutesAgo) });
    s.last_activity_at = s.timeline.at(-1)!.created_at;
    st.sessions.push(s);
  }

  for (let i = 0; i < 60; i++) {
    const status: TicketStatus = i % 3 === 0 ? "open" : i % 3 === 1 ? "in_progress" : "closed";
    const assignee = i % 4 === 0 ? null : pick(rnd, staff);
    const created = i * 300 + int(rnd, 0, 200);
    st.tickets.push({
      id: st.ids.ticket++,
      title: TICKET_TITLES[i % TICKET_TITLES.length]!,
      description: "وصف المشكلة كما سجّله الفريق، مع الخطوات المتبعة ونتيجتها.",
      status,
      assigned_to: assignee ? { id: assignee.id, name: assignee.full_name } : null,
      created_by: "فارس العمري",
      created_at: iso(created),
      updated_at: iso(Math.max(0, created - int(rnd, 10, 280))),
    });
  }
  return st;
}

export function supportState(store: string | null): SupportState {
  return storeState(store, "support", () => seed(store));
}

export function resetSupport(store: string | null) {
  Object.assign(supportState(store), seed(store));
}

// ── sessions ─────────────────────────────────────────────────────────────────────────

const mine = (s: MockSession, v: Viewer) => s.status === "human_locked" && s.assigned_staff !== null && (v.owner ? s.assigned_staff.id === null : s.assigned_staff.id === v.staffId);

export function sessionView(s: MockSession, v: Viewer) {
  return {
    id: s.id,
    session_type: s.session_type,
    status: s.status,
    party: s.party,
    assigned_staff: s.assigned_staff,
    messages_count: s.timeline.filter((t) => t.kind === "message").length,
    last_activity_at: s.last_activity_at,
    version: s.version,
    is_mine: mine(s, v),
  };
}

export function listSessions(store: string | null, p: URLSearchParams, v: Viewer) {
  let rows = supportState(store).sessions;
  const status = p.get("status");
  const type = p.get("session_type");
  const q = (p.get("q") ?? "").trim();
  if (status) rows = rows.filter((s) => s.status === status);
  if (type) rows = rows.filter((s) => s.session_type === type);
  if (p.get("assigned_to_me") === "1" || p.get("assigned_to_me") === "true") rows = rows.filter((s) => mine(s, v));
  if (q) rows = rows.filter((s) => s.party.name.includes(q) || (s.party.phone ?? "").includes(q));
  rows = [...rows].sort((a, b) => b.last_activity_at.localeCompare(a.last_activity_at));
  const pageSize = Math.min(100, Math.max(1, Number(p.get("page_size") ?? 20) || 20));
  const page = Math.max(1, Number(p.get("page") ?? 1) || 1);
  return { count: rows.length, next: page * pageSize < rows.length ? `?page=${page + 1}` : null, previous: page > 1 ? `?page=${page - 1}` : null, results: rows.slice((page - 1) * pageSize, page * pageSize).map((s) => sessionView(s, v)) };
}

export function sessionCounters(store: string | null, v: Viewer) {
  const all = supportState(store).sessions;
  return { escalated: all.filter((s) => s.status === "escalated").length, human_locked_mine: all.filter((s) => mine(s, v)).length };
}

export function findSession(store: string | null, id: number) {
  return supportState(store).sessions.find((s) => s.id === id) ?? null;
}

export function sessionDetail(store: string | null, s: MockSession, v: Viewer, after: number | null) {
  return { session: sessionView(s, v), timeline: (after ? s.timeline.filter((t) => t.id > after) : s.timeline).map((t) => ({ ...t })) };
}

export function sessionAction(store: string | null, id: number, action: "takeover" | "release" | "close", body: Record<string, unknown>, v: Viewer): MockResult<ReturnType<typeof sessionView>> {
  const st = supportState(store);
  const s = findSession(store, id);
  if (!s) return { ok: false, status: 404, body: { detail: "الجلسة غير موجودة." } };
  if (action === "takeover" && s.contended && s.status === "bot_active") {
    // Someone else took it a moment before (US-31.3 acceptance 4).
    const staff = staffState(store).staff.find((x) => x.id === 3);
    s.contended = false;
    s.status = "human_locked";
    s.assigned_staff = { id: staff?.id ?? 3, name: staff?.full_name ?? "خالد المطيري" };
    s.version++;
    s.timeline.push({ id: st.ids.item++, kind: "message", sender_type: "staff", sender_name: s.assigned_staff.name, text: "معك خالد من فريق المتجر.", created_at: new Date().toISOString() });
    s.last_activity_at = new Date().toISOString();
    return { ok: false, status: 409, body: { detail: `استلمها ${s.assigned_staff.name} قبلك.`, session: sessionView(s, v) } };
  }
  if (Number(body.version) !== s.version) return { ok: false, status: 409, body: { detail: s.assigned_staff && s.status === "human_locked" ? `استلمها ${s.assigned_staff.name} قبلك.` : "تغيّرت الجلسة منذ فتحتها — حُدّثت.", session: sessionView(s, v) } };
  if (action === "takeover") {
    if (s.status !== "bot_active" && s.status !== "escalated") return { ok: false, status: 409, body: { detail: "لا يمكن استلام الجلسة في حالتها الحالية.", session: sessionView(s, v) } };
    s.status = "human_locked";
    s.assigned_staff = { id: v.owner ? null : v.staffId, name: v.name };
  } else if (action === "release") {
    if (!mine(s, v)) return { ok: false, status: 409, body: { detail: "لا تتولّى هذه الجلسة.", session: sessionView(s, v) } };
    s.status = "bot_active";
    s.assigned_staff = null;
  } else {
    if (s.status === "closed") return { ok: false, status: 409, body: { detail: "الجلسة مغلقة مسبقاً.", session: sessionView(s, v) } };
    if (s.status === "human_locked" && !mine(s, v)) return { ok: false, status: 409, body: { detail: `يتولّاها ${s.assigned_staff?.name ?? "موظف آخر"}.`, session: sessionView(s, v) } };
    s.status = "closed";
  }
  s.version++;
  s.last_activity_at = new Date().toISOString();
  return { ok: true, data: sessionView(s, v) };
}

export function sessionReply(store: string | null, id: number, body: Record<string, unknown>, v: Viewer): MockResult<TimelineItem> {
  const st = supportState(store);
  const s = findSession(store, id);
  if (!s) return { ok: false, status: 404, body: { detail: "الجلسة غير موجودة." } };
  if (!mine(s, v)) return { ok: false, status: 409, body: { detail: "استلم الجلسة أولاً لتتمكن من الردّ." } };
  const text = String(body.text ?? "").trim();
  if (!text) return { ok: false, status: 400, body: { text: ["اكتب رداً."] } };
  const clientId = typeof body.client_id === "string" ? body.client_id : null;
  const dup = clientId ? s.timeline.find((t) => t.client_id === clientId) : undefined;
  if (dup) return { ok: true, data: dup };
  const item: TimelineItem = { id: st.ids.item++, kind: "message", sender_type: "staff", sender_name: v.name, text, client_id: clientId, created_at: new Date().toISOString() };
  s.timeline.push(item);
  s.last_activity_at = item.created_at;
  return { ok: true, status: 201, data: item };
}

/** Mock-only: a webhook opens a new escalated session (US-31.2 acceptance 3). */
export function simulateSession(store: string | null) {
  const st = supportState(store);
  const now = new Date().toISOString();
  const s: MockSession = { id: st.ids.session++, session_type: "customer", status: "escalated", party: { name: "عميل جديد", phone: "967770001122" }, assigned_staff: null, last_activity_at: now, version: 1, timeline: [{ id: st.ids.item++, kind: "message", sender_type: "customer", sender_name: "عميل جديد", text: "أريد التحدث مع موظف", created_at: now }], contended: false };
  st.sessions.push(s);
  return s.id;
}

// ── tickets ──────────────────────────────────────────────────────────────────────────

const TICKET_STATUSES: TicketStatus[] = ["open", "in_progress", "closed"];

function ticketCounters(store: string | null) {
  const t = supportState(store).tickets;
  return { open: t.filter((x) => x.status === "open").length, in_progress: t.filter((x) => x.status === "in_progress").length, closed: t.filter((x) => x.status === "closed").length };
}

export function listTickets(store: string | null, p: URLSearchParams, v: Viewer) {
  let rows = supportState(store).tickets;
  const status = p.get("status");
  const assigned = p.get("assigned_to");
  const q = (p.get("q") ?? "").trim();
  if (status) rows = rows.filter((t) => t.status === status);
  if (assigned === "me") rows = rows.filter((t) => (v.owner ? false : t.assigned_to?.id === v.staffId));
  else if (assigned === "none") rows = rows.filter((t) => !t.assigned_to);
  else if (assigned && /^\d+$/.test(assigned)) rows = rows.filter((t) => t.assigned_to?.id === Number(assigned));
  if (q) rows = rows.filter((t) => t.title.includes(q) || String(t.id).includes(q.replace(/\D/g, "") || "\u0000"));
  rows = [...rows].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const pageSize = Math.min(100, Math.max(1, Number(p.get("page_size") ?? 20) || 20));
  const page = Math.max(1, Number(p.get("page") ?? 1) || 1);
  return {
    count: rows.length,
    next: page * pageSize < rows.length ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    results: rows.slice((page - 1) * pageSize, page * pageSize).map((t) => ({ id: t.id, title: t.title, status: t.status, assigned_to: t.assigned_to, created_at: t.created_at, updated_at: t.updated_at })),
    counters: ticketCounters(store),
  };
}

export function ticketCountersView(store: string | null) {
  const c = ticketCounters(store);
  return { open: c.open, in_progress: c.in_progress };
}

export function getTicket(store: string | null, id: number) {
  return supportState(store).tickets.find((t) => t.id === id) ?? null;
}

function assignee(store: string | null, raw: unknown): { ok: true; value: MockTicket["assigned_to"] } | { ok: false } {
  if (raw === null || raw === undefined || raw === "") return { ok: true, value: null };
  const s = staffState(store).staff.find((x) => x.id === Number(raw) && x.is_active);
  return s ? { ok: true, value: { id: s.id, name: s.full_name } } : { ok: false };
}

export function createTicket(store: string | null, body: Record<string, unknown>, v: Viewer): MockResult<MockTicket> {
  const st = supportState(store);
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const e: Record<string, string[]> = {};
  if (!title) e.title = ["أدخل عنوان التذكرة."];
  if (title.length > 200) e.title = ["200 حرف كحد أقصى."];
  const a = assignee(store, body.assigned_to_id);
  if (!a.ok) e.assigned_to_id = ["الموظف غير موجود أو غير نشط."];
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  const now = new Date().toISOString();
  const t: MockTicket = { id: st.ids.ticket++, title, description, status: "open", assigned_to: a.ok ? a.value : null, created_by: v.name, created_at: now, updated_at: now };
  st.tickets.push(t);
  return { ok: true, status: 201, data: t };
}

export function patchTicket(store: string | null, id: number, body: Record<string, unknown>): MockResult<MockTicket> {
  const t = getTicket(store, id);
  if (!t) return { ok: false, status: 404, body: { detail: "التذكرة غير موجودة." } };
  const e: Record<string, string[]> = {};
  if (body.status !== undefined && !TICKET_STATUSES.includes(body.status as TicketStatus)) e.status = ["حالة غير صحيحة."];
  if (body.title !== undefined && !String(body.title).trim()) e.title = ["أدخل عنوان التذكرة."];
  let a: ReturnType<typeof assignee> | null = null;
  if (body.assigned_to_id !== undefined) {
    a = assignee(store, body.assigned_to_id);
    if (!a.ok) e.assigned_to_id = ["الموظف غير موجود أو غير نشط."];
  }
  if (Object.keys(e).length) return { ok: false, status: 400, body: e };
  if (body.status !== undefined) t.status = body.status as TicketStatus;
  if (body.title !== undefined) t.title = String(body.title).trim();
  if (body.description !== undefined) t.description = String(body.description).trim();
  if (a && a.ok) t.assigned_to = a.value;
  t.updated_at = new Date().toISOString();
  return { ok: true, data: t };
}

export function assignees(store: string | null) {
  return staffState(store)
    .staff.filter((s) => s.is_active && !s.terminated_at)
    .map((s) => ({ id: s.id, name: s.full_name }));
}
