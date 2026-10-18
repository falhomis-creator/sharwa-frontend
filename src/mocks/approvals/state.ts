import type { MockResult } from "@/lib/bff/mock-route";
import { isEmptyStore } from "@/mocks/empty-store";
import { FIXTURE_NOW, nextId, storeState } from "@/mocks/store-state";

/**
 * `ApprovalRequest` (discovery 02 §10) — shared by M18 (the approvals screen), M21
 * (`stock_writeoff`), M06/M16/M23 (the other request types). Every decision carries
 * `version` and a stale one answers 409 (M18 FR-18.06); the requester may never decide on
 * their own request (SC-18.2). The sidebar counter `pending_approvals` reads `pendingCount`.
 */
export const APPROVAL_TYPES = ["refund", "shift_shortage", "stock_writeoff", "discount_exception", "order_approval", "po_approval"] as const;
export type ApprovalType = (typeof APPROVAL_TYPES)[number];
export const APPROVAL_TYPE_LABELS: Record<ApprovalType, string> = {
  refund: "استرجاع مبلغ",
  shift_shortage: "عجز وردية",
  stock_writeoff: "إعدام مخزون",
  discount_exception: "استثناء خصم",
  order_approval: "اعتماد طلب",
  po_approval: "اعتماد أمر شراء",
};
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface MockApproval {
  id: number;
  request_type: ApprovalType;
  status: ApprovalStatus;
  /** Who asked — the staff id (null = the owner) and their display name. */
  requester_id: number | null;
  requester_name: string;
  approver_role: string;
  /** The snapshot the approver reads: amount / item / reason (M18 US-18.5.1). */
  payload: Record<string, unknown>;
  summary: string;
  /** The linked entity, when one exists. */
  entity: { kind: "order" | "product" | "shift" | "purchase_order"; id: number; label: string; available: boolean } | null;
  note: string | null;
  decided_by: string | null;
  decided_at: string | null;
  escalated_at: string | null;
  version: number;
  created_at: string;
}

interface ApprovalsState {
  items: MockApproval[];
}

const at = (hoursAgo: number) => new Date(FIXTURE_NOW - hoursAgo * 3_600_000).toISOString();

function seed(store: string | null): ApprovalsState {
  if (isEmptyStore(store)) return { items: [] };
  return {
    items: [
      {
        id: 1,
        request_type: "refund",
        status: "pending",
        requester_id: 2,
        requester_name: "سارة الحربي",
        approver_role: "مدير المتجر",
        payload: { order_id: 10452, display_amount: "180.00 ر.س", reason: "العميل استلم منتجاً تالفاً" },
        summary: "استرجاع 180.00 ر.س للطلب #10452",
        entity: { kind: "order", id: 10452, label: "#10452", available: true },
        note: null,
        decided_by: null,
        decided_at: null,
        escalated_at: at(3),
        version: 1,
        created_at: at(30),
      },
      {
        id: 2,
        request_type: "stock_writeoff",
        status: "pending",
        requester_id: 3,
        requester_name: "خالد المطيري",
        approver_role: "مدير المتجر",
        payload: { product_id: 1047, product_name: "طقم صحون", quantity: "4", location_id: 1, note: "كسر أثناء الجرد" },
        summary: "إعدام 4 × طقم صحون — كسر أثناء الجرد",
        entity: { kind: "product", id: 1047, label: "طقم صحون", available: true },
        note: null,
        decided_by: null,
        decided_at: null,
        escalated_at: null,
        version: 1,
        created_at: at(9),
      },
      {
        id: 3,
        request_type: "discount_exception",
        status: "pending",
        requester_id: 2,
        requester_name: "سارة الحربي",
        approver_role: "مدير الفرع",
        payload: { order_id: 10479, requested_percent: 25, role_limit_percent: 10, reason: "عميل دائم اشترى 6 قطع" },
        summary: "خصم 25% على الطلب #10479 (حد الدور 10%)",
        entity: { kind: "order", id: 10479, label: "#10479", available: true },
        note: null,
        decided_by: null,
        decided_at: null,
        escalated_at: null,
        version: 1,
        created_at: at(2),
      },
      {
        id: 4,
        request_type: "shift_shortage",
        status: "approved",
        requester_id: 2,
        requester_name: "سارة الحربي",
        approver_role: "مدير الفرع",
        payload: { shift_id: 88, display_amount: "35.00 ر.س" },
        summary: "عجز 35.00 ر.س في وردية #88",
        entity: { kind: "shift", id: 88, label: "وردية #88", available: true },
        note: "فرق عملة عند الإغلاق",
        decided_by: "فارس العمري",
        decided_at: at(50),
        escalated_at: null,
        version: 2,
        created_at: at(72),
      },
      {
        id: 5,
        request_type: "po_approval",
        status: "rejected",
        requester_id: 3,
        requester_name: "خالد المطيري",
        approver_role: "مدير المتجر",
        payload: { purchase_order_id: 31, display_total: "12,400.00 ر.س", supplier: "مؤسسة البن اليمني" },
        summary: "أمر شراء #31 بقيمة 12,400.00 ر.س",
        entity: { kind: "purchase_order", id: 31, label: "PO-31", available: false },
        note: "ينتظر عرض سعر ثانٍ",
        decided_by: "فارس العمري",
        decided_at: at(120),
        escalated_at: null,
        version: 2,
        created_at: at(140),
      },
    ],
  };
}

export function approvalsState(store: string | null): ApprovalsState {
  return storeState(store, "approvals", () => seed(store));
}

export function pendingApprovalsCount(store: string | null): number {
  return approvalsState(store).items.filter((a) => a.status === "pending").length;
}

export function createApproval(
  store: string | null,
  input: Pick<MockApproval, "request_type" | "payload" | "summary" | "entity"> & { requester_id: number | null; requester_name: string; approver_role?: string },
): MockApproval {
  const state = approvalsState(store);
  const item: MockApproval = {
    id: nextId(store, "approvals", 100),
    status: "pending",
    approver_role: input.approver_role ?? "مدير المتجر",
    note: null,
    decided_by: null,
    decided_at: null,
    escalated_at: null,
    version: 1,
    created_at: new Date().toISOString(),
    ...input,
  };
  state.items.unshift(item);
  return item;
}

/** `POST /api/v1/approvals/<id>/resolve/` `{decision, note?, version}` → 200 / 409 / 403 (self). */
export function resolveApproval(
  store: string | null,
  id: number,
  body: { decision?: unknown; note?: unknown; version?: unknown },
  actor: { id: number | null; name: string },
): MockResult<MockApproval> {
  const item = approvalsState(store).items.find((a) => a.id === id);
  if (!item) return { ok: false, status: 404, body: { detail: "طلب الموافقة غير موجود." } };
  if (item.status !== "pending") return { ok: false, status: 409, body: { detail: "حُسم الطلب من مستخدم آخر.", status: item.status, version: item.version } };
  if (Number(body.version) !== item.version) return { ok: false, status: 409, body: { detail: "حُسم الطلب من مستخدم آخر.", version: item.version } };
  if (item.requester_id !== null && item.requester_id === actor.id) return { ok: false, status: 403, body: { detail: "لا يمكنك الموافقة على طلبك." } };
  if (body.decision !== "approved" && body.decision !== "rejected") return { ok: false, status: 400, body: { decision: ["القرار يجب أن يكون approved أو rejected."] } };
  if (body.decision === "rejected" && !(typeof body.note === "string" && body.note.trim())) return { ok: false, status: 400, body: { note: ["الملاحظة مطلوبة عند الرفض."] } };
  item.status = body.decision;
  item.note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
  item.decided_by = actor.name;
  item.decided_at = new Date().toISOString();
  item.version += 1;
  return { ok: true, data: item };
}
