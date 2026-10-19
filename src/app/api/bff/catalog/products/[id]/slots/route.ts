import { storefrontAdapter, respondMock } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { buyerSlots, holdSlot } from "@/mocks/bookings/state";
import { findVisible } from "@/mocks/storefront/catalog";

/**
 * M26 buyer rows: `GET /api/v1/catalog/products/<id>/slots/?date=` (today
 * `available_slots_api`, Ready under its legacy path — unified here) and the hold,
 * `POST /api/v1/catalog/products/<id>/slots/hold/` `{start_datetime, release_slot_id?}` →
 * 201 `{slot_id, start_datetime, held_until}` · 409 «لم يعد هذا الموعد متاحاً» (`[NEEDS BACKEND]`).
 * Kept one level shallow (no `/hold` segment) — the method picks the row.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return storefrontAdapter(request, `/api/v1/catalog/products/${id}/slots/`, ({ store, url }) => {
    const p = findVisible(store, Number(id));
    const slots = p ? buyerSlots(store, p, url.searchParams.get("date") ?? "") : null;
    return slots ? mockJson(slots, { delay: 140 }) : mockJson({ detail: "لا مواعيد لهذا المنتج." }, { status: 404 });
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return storefrontAdapter(request, `/api/v1/catalog/products/${id}/slots/hold/`, async ({ store, body }) => {
    const p = findVisible(store, Number(id));
    if (!p || !p.is_bookable) return mockJson({ detail: "هذا المنتج لا يُحجز بموعد." }, { status: 404 });
    const { fields } = await body();
    return respondMock(holdSlot(store, p, fields), 180);
  });
}
