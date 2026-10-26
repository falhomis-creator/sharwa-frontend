import type { MockResult } from "@/lib/bff/mock-route";
import { approvalsState, createApproval } from "@/mocks/approvals/state";
import { catalog } from "@/mocks/catalog/state";
import { isEmptyStore } from "@/mocks/empty-store";
import {
  listLocationRefs,
  multiLocationEnabled,
} from "@/mocks/locations/state";
import { createOrder, ordersState, type MockOrder } from "@/mocks/orders/state";
import { staffState } from "@/mocks/staff/state";
import { FIXTURE_NOW, storeState } from "@/mocks/store-state";

/**
 * M36 fixtures (T169) for the READY `/api/v1/orders/b2b-*` rows. One source of truth with
 * M06 and M18: a draft IS an M06 order (`sales_channel='b2b_draft'`, created through the
 * orders mock, so it shows in the orders list) and its approval IS an M18 `ApprovalRequest`
 * (`order_approval`, so it shows in «الموافقات» and resolving it there is seen here).
 * Lines are priced from `product.price` by the orders mock — never from the request.
 */
type Currency = "SAR" | "USD" | "YER_OLD" | "YER_NEW";
const CURRENCIES: readonly Currency[] = ["SAR", "USD", "YER_OLD", "YER_NEW"];

interface B2bMeta {
  currency: Currency;
  location_id: number | null;
  /** The approval behind the order; `null` = a legacy draft (read-only, §8). */
  approval_id: number | null;
  created_by_id: number | null;
  created_by_name: string;
}

interface B2bState {
  meta: Map<number, B2bMeta>;
  seeded: boolean;
}

export interface Actor {
  id: number | null;
  name: string;
}

function b2bState(store: string | null): B2bState {
  return storeState(store, "b2b", () => ({ meta: new Map(), seeded: false }));
}

const nowIso = () =>
  new Date(Math.max(Date.now(), FIXTURE_NOW + 1000)).toISOString();

function rolesOf(store: string | null) {
  return staffState(store).roles.map((r) => ({ id: r.id, name: r.name }));
}

export function b2bOptions(store: string | null) {
  return {
    roles: rolesOf(store),
    locations: listLocationRefs(store)
      .filter((l) => l.is_active)
      .map((l) => ({ id: l.id, name: l.name })),
    multi_location: multiLocationEnabled(store),
    default_currency: "SAR" as Currency,
  };
}

const detail = (msg: string, status = 400): MockResult<never> => ({
  ok: false,
  status,
  body: { detail: msg },
});

/** `POST /orders/b2b-draft/` — the body as the Django view reads it; any price is ignored. */
export function createDraft(
  store: string | null,
  body: Record<string, unknown>,
  actor: Actor,
): MockResult<{
  detail: string;
  order_id: number;
  approval_id: number | null;
}> {
  ensureSeed(store);
  const name = String(body.customer_name ?? "").trim();
  const phone = String(body.customer_phone ?? "").replace(/\D/g, "");
  const address = String(body.address ?? "").trim();
  if (!name || !phone || !address)
    return detail("اسم العميل وهاتفه وعنوانه مطلوبة.");
  const items = Array.isArray(body.items)
    ? (body.items as Array<Record<string, unknown>>)
    : [];
  if (!items.length) return detail("أضف منتجاً واحداً على الأقل.");
  const products = catalog(store).products;
  for (const it of items) {
    const pid = Number(it.product_id);
    if (!products.some((p) => p.id === pid && !p.archived_at))
      return detail(`منتج غير صالح: ${String(it.product_id)}`);
    const q = Number(it.quantity);
    if (!Number.isInteger(q) || q < 1)
      return detail("الكمية يجب أن تكون عدداً صحيحاً موجباً.");
  }
  const roleId =
    body.approver_role_id === undefined ||
    body.approver_role_id === null ||
    body.approver_role_id === ""
      ? null
      : Number(body.approver_role_id);
  const role =
    roleId === null ? null : rolesOf(store).find((r) => r.id === roleId);
  if (roleId !== null && !role) return detail("دور المعتمد غير صالح.");
  const locations = b2bOptions(store).locations;
  let locationId =
    body.location_id === undefined ||
    body.location_id === null ||
    body.location_id === ""
      ? null
      : Number(body.location_id);
  if (locationId !== null && !locations.some((l) => l.id === locationId))
    return detail("الفرع غير موجود.");
  if (locationId === null) {
    if (multiLocationEnabled(store) || !locations.length)
      return detail("لا يوجد فرع متاح — أنشئ فرعاً أولاً أو حدّد location_id.");
    locationId = locations[0]!.id;
  }
  // INT-044: Django refuses an unsupported currency (it used to store any text); absent = SAR.
  if (body.currency !== undefined && body.currency !== null && body.currency !== "" && !CURRENCIES.includes(body.currency as Currency))
    return detail("عملة غير مدعومة.");
  const currency = CURRENCIES.includes(body.currency as Currency)
    ? (body.currency as Currency)
    : "SAR";

  // A draft reserves nothing (stock moves only once approved), so the orders mock's
  // availability check must not refuse it: lift `allow_backorder` for this one call.
  const lifted = products.filter(
    (p) =>
      items.some((it) => Number(it.product_id) === p.id) && !p.allow_backorder,
  );
  lifted.forEach((p) => (p.allow_backorder = true));
  let res: ReturnType<typeof createOrder>;
  try {
    res = createOrder(
      store,
      {
        customer_name: name,
        customer_phone: phone,
        address,
        delivery: "delivery",
        sales_channel: "b2b_draft",
        // Only ids and quantities reach the orders mock: it prices from the product.
        items: items.map((it) => ({
          product_id: Number(it.product_id),
          quantity: String(Number(it.quantity)),
        })),
      },
      actor.name,
      true,
    );
  } finally {
    lifted.forEach((p) => (p.allow_backorder = false));
  }
  if (!res.ok) {
    const first = Object.values(res.body)
      .flat()
      .find((v) => typeof v === "string");
    return detail(
      typeof res.body.detail === "string"
        ? res.body.detail
        : String(first ?? "تعذّر إنشاء المسودة."),
      res.status,
    );
  }
  const order = ordersState(store).orders.find((o) => o.id === res.data.id)!;
  // The B2B subtotal is the lines' total: no delivery fee yet (§5).
  order.delivery_fee = "0.00";
  order.lines.forEach((l) => (l.location_id = locationId!));
  const approval = createApproval(store, {
    request_type: "order_approval",
    requester_id: actor.id,
    requester_name: actor.name,
    approver_role: role?.name ?? "مدير المتجر",
    payload: {
      order_id: order.id,
      customer: name,
      total: totalOf(order),
      currency,
    },
    summary: `مسودة جملة للعميل ${name} — ${order.lines.length} أصناف`,
    entity: {
      kind: "order",
      id: order.id,
      label: `طلب #${order.id}`,
      available: true,
    },
  });
  order.pending_approval = { id: approval.id, status: "pending" };
  b2bState(store).meta.set(order.id, {
    currency,
    location_id: locationId,
    approval_id: approval.id,
    created_by_id: actor.id,
    created_by_name: actor.name,
  });
  return {
    ok: true,
    status: 201,
    data: {
      detail: "أُنشئت المسودة وهي الآن بانتظار موافقة المدير.",
      order_id: order.id,
      approval_id: approval.id,
    },
  };
}

function totalOf(o: MockOrder): string {
  return (
    o.lines.reduce(
      (a, l) => a + Math.round(Number(l.price) * 100) * Number(l.quantity),
      0,
    ) / 100
  ).toFixed(2);
}

/** `GET /orders/b2b-drafts/` — Django filters `pending_approval__status='pending'`. */
export function listDrafts(store: string | null) {
  ensureSeed(store);
  const state = b2bState(store);
  const approvals = approvalsState(store).items;
  return (
    ordersState(store)
      .orders.filter((o) => o.sales_channel === "b2b_draft")
      .flatMap((o) => {
        const meta = state.meta.get(o.id);
        const approval = meta?.approval_id
          ? approvals.find((a) => a.id === meta.approval_id)
          : undefined;
        if (approval && approval.status !== "pending") return [];
        if (!meta) return [];
        return [
          {
            id: o.id,
            customer_name: o.customer_name,
            customer_phone: o.customer_phone,
            total_price: totalOf(o),
            currency: meta.currency,
            created_at: o.created_at,
            sales_channel: o.sales_channel,
            approval_id: approval ? approval.id : null,
            approval_version: approval ? approval.version : null,
            items_count: o.lines.length,
            created_by_name: meta.created_by_name,
            escalated_at: approval?.escalated_at ?? null,
          },
        ];
      })
      // §8: escalated approvals first, then newest.
      .sort(
        (a, b) =>
          Number(Boolean(b.escalated_at)) - Number(Boolean(a.escalated_at)) ||
          b.created_at.localeCompare(a.created_at),
      )
  );
}

/** `POST /orders/b2b-draft/<approval_id>/resolve/` `{decision, version}`. */
export function resolveDraft(
  store: string | null,
  approvalId: number,
  body: Record<string, unknown>,
  actor: Actor,
): MockResult<{ detail: string; decision: "approved" | "rejected" }> {
  ensureSeed(store);
  const approval = approvalsState(store).items.find(
    (a) => a.id === approvalId && a.request_type === "order_approval",
  );
  if (!approval) return detail("طلب الموافقة غير موجود.", 404);
  if (body.decision !== "approved" && body.decision !== "rejected")
    return detail("القرار يجب أن يكون approved أو rejected.");
  if (!Number.isInteger(Number(body.version)))
    return detail("رقم الإصدار مطلوب.");
  if (
    approval.status !== "pending" ||
    Number(body.version) !== approval.version
  )
    return detail("حُدِّثت الموافقة من مستخدم آخر.", 409);
  if (approval.requester_id !== null && approval.requester_id === actor.id)
    return detail("لا يمكنك اعتماد طلبك.", 403);
  approval.status = body.decision;
  approval.decided_by = actor.name;
  approval.decided_at = nowIso();
  approval.version += 1;
  const order = ordersState(store).orders.find(
    (o) => o.pending_approval?.id === approvalId,
  );
  if (order?.pending_approval) {
    order.pending_approval.status = body.decision;
    const state = ordersState(store);
    order.timeline.push({
      id: state.ids.event++,
      at: approval.decided_at,
      kind: "approval",
      source: "merchant_manual",
      text:
        body.decision === "approved"
          ? "اعتُمدت مسودة الجملة."
          : "رُفضت مسودة الجملة.",
      actor: actor.name,
    });
  }
  return {
    ok: true,
    data: { detail: "حُسمت الموافقة بنجاح.", decision: body.decision },
  };
}

/** Test hook for the 409 path: another approver bumps the version (mock-only). */
export function bumpApprovalVersion(
  store: string | null,
  approvalId: number,
): boolean {
  const approval = approvalsState(store).items.find((a) => a.id === approvalId);
  if (!approval) return false;
  approval.version += 1;
  return true;
}

// ── Seed: four drafts per store, created through the same path as the API ─────────────
function ensureSeed(store: string | null) {
  const state = b2bState(store);
  if (state.seeded) return;
  state.seeded = true;
  if (isEmptyStore(store)) return;
  const products = catalog(store)
    .products.filter(
      (p) =>
        !p.archived_at &&
        (p.allow_backorder || Number(p.stock) >= 20) &&
        !p.is_serialized,
    )
    .slice(0, 6);
  if (products.length < 3) return;
  const staff = staffState(store).staff;
  const who = (id: number): Actor => ({
    id,
    name: staff.find((s) => s.id === id)?.full_name ?? "موظف",
  });
  const plans: Array<{
    actor: Actor;
    customer: string;
    phone: string;
    items: Array<[number, number]>;
    hoursAgo: number;
    escalate?: boolean;
    legacy?: boolean;
  }> = [
    {
      actor: who(2),
      customer: "مؤسسة الندى التجارية",
      phone: "966551230001",
      items: [
        [0, 12],
        [1, 6],
      ],
      hoursAgo: 5,
    },
    {
      actor: who(4),
      customer: "متجر الزهور — فرع الحمراء",
      phone: "966551230002",
      items: [[2, 10]],
      hoursAgo: 26,
    },
    {
      actor: who(3),
      customer: "شركة الرواد للتوزيع",
      phone: "967771230003",
      items: [
        [0, 20],
        [2, 4],
        [3, 5],
      ],
      hoursAgo: 52,
      escalate: true,
    },
    {
      actor: who(2),
      customer: "بقالة السلام",
      phone: "967771230004",
      items: [[1, 3]],
      hoursAgo: 200,
      legacy: true,
    },
  ];
  const location = b2bOptions(store).locations[0]?.id ?? null;
  for (const plan of plans) {
    const res = createDraft(
      store,
      {
        customer_name: plan.customer,
        customer_phone: plan.phone,
        address: "الرياض، حي العليا، مستودع 4",
        items: plan.items.map(([i, q]) => ({
          product_id: products[i % products.length]!.id,
          quantity: q,
        })),
        location_id: location,
      },
      plan.actor,
    );
    if (!res.ok) continue;
    const at = new Date(FIXTURE_NOW - plan.hoursAgo * 3_600_000).toISOString();
    const order = ordersState(store).orders.find(
      (o) => o.id === res.data.order_id,
    );
    if (order) {
      order.created_at = at;
      order.timeline.forEach((e) => (e.at = at));
    }
    const approval = approvalsState(store).items.find(
      (a) => a.id === res.data.approval_id,
    );
    if (approval) {
      approval.created_at = at;
      if (plan.escalate)
        approval.escalated_at = new Date(
          FIXTURE_NOW - 4 * 3_600_000,
        ).toISOString();
    }
    if (plan.legacy) {
      // A draft from before approvals were linked: no approval → read-only (§8).
      const meta = b2bState(store).meta.get(res.data.order_id);
      if (meta) meta.approval_id = null;
      if (approval)
        approvalsState(store).items.splice(
          approvalsState(store).items.indexOf(approval),
          1,
        );
      if (order) order.pending_approval = null;
    }
  }
}
