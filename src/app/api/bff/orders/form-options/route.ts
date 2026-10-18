import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { displayMoney } from "@/mocks/_fixtures";
import { ORDER_LOCATIONS } from "@/mocks/orders/state";
import { checkoutDeliveryMethods, checkoutPickups } from "@/mocks/shipping/state";

/**
 * `[NEEDS BACKEND]` (proposed here, owned by M15): the delivery methods and pickup points the
 * manual-order form and «تحويل إلى استلام» choose from, plus the source locations of the list filter (M22) — `DeliveryMethod` / `PickupLocation`
 * (discovery 02 §3). No `/api/v1` row exists for either today.
 */
export async function GET(request: Request) {
  return mockRoute(
    request,
    ({ store }) =>
      mockJson(
        {
          // One source with M15 and the storefront checkout (Phase 5 open item 6).
          delivery_methods: checkoutDeliveryMethods(store).map((m) => ({ id: m.id, name: m.name, display_price: displayMoney(Number(m.price), "YER_NEW"), estimated_time: m.estimated_time })),
          pickup_locations: checkoutPickups(store).map((p) => ({ id: p.id, name: p.name, address: p.address })),
          locations: ORDER_LOCATIONS,
        },
        { delay: 80 },
      ),
    { permission: "orders.view" },
  );
}
