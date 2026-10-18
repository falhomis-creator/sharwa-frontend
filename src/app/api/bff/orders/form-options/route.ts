import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { DELIVERY_METHODS, ORDER_LOCATIONS, PICKUP_LOCATIONS } from "@/mocks/orders/state";

/**
 * `[NEEDS BACKEND]` (proposed here, owned by M15): the delivery methods and pickup points the
 * manual-order form and «تحويل إلى استلام» choose from, plus the source locations of the list filter (M22) — `DeliveryMethod` / `PickupLocation`
 * (discovery 02 §3). No `/api/v1` row exists for either today.
 */
export async function GET(request: Request) {
  return mockRoute(
    request,
    () => mockJson({ delivery_methods: DELIVERY_METHODS, pickup_locations: PICKUP_LOCATIONS, locations: ORDER_LOCATIONS }, { delay: 80 }),
    { permission: "orders.view" },
  );
}
