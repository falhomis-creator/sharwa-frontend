import { FULFILLMENT_STATE_LABELS, type FulfillmentState } from "@/features/orders/schemas";
import { catalog } from "@/mocks/catalog/state";
import { fulfillmentStatusRef, orderByUuid, type MockOrder } from "@/mocks/orders/state";
import { findPickup } from "@/mocks/shipping/state";
import { readSettings } from "@/mocks/settings/state";
import { ORDER_STATUS_LABELS_AR, orderMoney, orderTotalSar, publicOrder } from "@/mocks/storefront/checkout";

/**
 * `[NEEDS BACKEND]` `GET /api/v1/orders/track/<public_uuid>/` (M41 §7), projected from the
 * M06 order fixture. FR-41.04 is enforced HERE, at the source: the payload never carries
 * the full phone, coordinates, fraud score, staff, cost or internal location names, and a
 * gift order carries no amount at all (FR-41.05).
 */
export const SHIPMENT_STATUSES = [
  "label_pending",
  "pending_pickup",
  "picked_up",
  "in_transit",
  "delivered",
  "returned",
  "cancelled",
  "compensated_lost",
] as const;
type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

const SHIPMENT_LABELS: Record<ShipmentStatus, string> = {
  label_pending: "بانتظار تأكيد الملصق",
  pending_pickup: "بانتظار الاستلام من التاجر",
  picked_up: "تم الاستلام",
  in_transit: "قيد التوصيل",
  delivered: "تم التسليم",
  returned: "مُعاد",
  cancelled: "ملغي",
  compensated_lost: "شحنة مُعوَّضة",
};

const HAPPY_PATH: ShipmentStatus[] = ["pending_pickup", "picked_up", "in_transit", "delivered"];

function masked(phone: string): string {
  return `${"•".repeat(Math.max(0, phone.length - 3))}${phone.slice(-3)}`;
}

function shipmentFor(o: MockOrder, loc: number, state: FulfillmentState) {
  if (state !== "shipped" && state !== "delivered") return null;
  // A returned shipment on one fixture order so the unhappy ending is visible (US-41.2.2).
  const returned = state === "delivered" && o.id % 37 === 0;
  const status: ShipmentStatus = returned ? "returned" : state === "delivered" ? "delivered" : o.id % 2 === 0 ? "in_transit" : "picked_up";
  const reached = returned ? HAPPY_PATH.slice(0, 3) : HAPPY_PATH.slice(0, HAPPY_PATH.indexOf(status) + 1);
  const created = new Date(o.created_at).getTime();
  const offsets: Record<string, number> = { pending_pickup: 2, picked_up: 6, in_transit: 10, delivered: 30, returned: 54 };
  const events = [...reached, ...(returned ? (["returned"] as ShipmentStatus[]) : [])].map((s) => ({
    to_status: s,
    event_time: new Date(created + (offsets[s] ?? 1) * 3_600_000).toISOString(),
  }));
  const active = status === "picked_up" || status === "in_transit";
  return {
    waybill_number: `SHW${o.id}${loc}`,
    carrier_code: "sharwa_ship",
    carrier_name: "شروة شيب",
    status,
    status_label: SHIPMENT_LABELS[status],
    explanation: returned ? "تعذّر التسليم بعد محاولتين وأُعيدت الشحنة إلى المتجر؛ تواصل مع المتجر لإعادة الإرسال." : null,
    courier: active ? { name: "عبدالله المندوب", phone: "967771234567" } : null,
    events: events.reverse(),
  };
}

export function trackOrder(store: string | null, uuid: string) {
  const o = orderByUuid(store, uuid);
  if (!o) return null;
  publicOrder(store, uuid); // settles a pending mock gateway payment, like the success page does
  const cat = catalog(store);
  const imageOf = (productId: number | null) =>
    productId === null ? null : (cat.products.find((p) => p.id === productId)?.images[0]?.url ?? null);
  const locations = Object.keys(o.fulfillment_states).map(Number);
  const finished = o.status === "completed" || o.status === "refunded";
  const fulfillments = locations.map((loc, k) => {
    let state: FulfillmentState = o.status === "cancelled" ? "cancelled" : finished ? "delivered" : (o.fulfillment_states[loc] ?? "pending");
    // A pickup order that is prepared becomes «جاهز للاستلام» (US-41.3).
    if (o.pickup_location_id && (state === "shipped" || state === "preparing") && !finished) state = "ready_for_pickup";
    const items = o.lines
      .filter((l) => l.location_id === loc)
      .map((l) => ({ product_name: l.product_name, variant_label: l.variant_label, quantity: Number(l.quantity), image: imageOf(l.product_id) }));
    return {
      id: o.id * 10 + k,
      status: state,
      status_label: FULFILLMENT_STATE_LABELS[state],
      items,
      pickup_code: state === "ready_for_pickup" ? String((o.id * 7919) % 1_000_000).padStart(6, "0") : null,
      shipment: o.pickup_location_id ? null : shipmentFor(o, loc, state),
    };
  });
  const delivered = fulfillments.filter((f) => f.status === "delivered").length;
  const rollup =
    o.status === "cancelled"
      ? "أُلغي الطلب"
      : delivered === fulfillments.length
        ? "مكتمل بالكامل"
        : delivered > 0
          ? `قيد التنفيذ الجزئي (${delivered} من ${fulfillments.length} شحنات وصلت)`
          : "قيد التنفيذ";
  const total = orderTotalSar(o);
  const upfront = o.deposit_upfront ? Number(o.deposit_upfront) : null;
  const pickup = findPickup(store, o.pickup_location_id);
  const policy = readSettings(store, "").return_policy;
  const excerpt = policy
    .split(/\n\s*\n/)
    .map((p) => p.replace(/^#+\s*/, "").trim())
    .find((p) => p && !p.startsWith("سياسة")) ?? null;
  const gift = o.is_gift;
  return {
    order_number: String(o.id),
    public_uuid: o.public_uuid,
    created_at: o.created_at,
    status: o.status,
    status_label: ORDER_STATUS_LABELS_AR[o.status],
    payment_status: o.payment_status,
    fulfillment_status: fulfillmentStatusRef(store, o.fulfillment_status_id),
    rollup_label: rollup,
    display_total: gift ? null : orderMoney(o, total),
    display_amount_on_delivery: gift || upfront === null ? null : orderMoney(o, total - upfront),
    display_deposit_amount: gift || upfront === null ? null : orderMoney(o, upfront),
    delivery_method_name: o.delivery_method_name,
    is_gift: gift,
    recipient_name: gift ? o.recipient_name : null,
    gift_message: gift ? o.gift_message : null,
    // The gift recipient never sees the buyer's details (FR-41.04).
    customer_name: gift ? null : o.customer_name,
    customer_phone_masked: gift ? null : masked(o.customer_phone),
    address_text: o.address || null,
    pickup_location: pickup ? { name: pickup.name, address: pickup.address, phone: pickup.phone } : null,
    items: o.lines.map((l) => ({ product_name: l.product_name, variant_label: l.variant_label, quantity: Number(l.quantity), image: imageOf(l.product_id) })),
    fulfillments,
    return_policy_excerpt: excerpt,
  };
}
