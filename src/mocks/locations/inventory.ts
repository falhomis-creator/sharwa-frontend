import { catalog } from "@/mocks/catalog/state";
import { locationRows } from "@/mocks/inventory/state";
import { includesNormalized } from "@/lib/i18n/normalize";

/**
 * `GET /api/v1/locations/<id>/inventory/?q&below_reorder&page&page_size` (M22 US-22.4): the
 * location's rows joined to the catalogue names. `available` comes from the inventory
 * foundation (server-computed, FR-22.05).
 */
export function listLocationInventory(store: string | null, locationId: number, params: URLSearchParams) {
  const cat = catalog(store);
  const q = (params.get("q") ?? "").trim();
  const below = params.get("below_reorder") === "true";
  const page = Math.max(1, Number(params.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(params.get("page_size") ?? 50)));
  const rows = locationRows(store, locationId)
    .map((r) => {
      const p = cat.products.find((x) => x.id === r.product_id);
      if (!p) return null;
      const v = r.variant_id ? cat.variants.find((x) => x.id === r.variant_id) : null;
      const label = v ? v.option_ids.map((oid) => cat.attributes.flatMap((a) => a.options).find((o) => o.id === oid)?.value ?? "").filter(Boolean).join(" / ") : null;
      return {
        product_id: r.product_id,
        variant_id: r.variant_id,
        name: p.name,
        variant_label: label,
        sku: v?.sku ?? p.sku,
        unit: p.unit,
        on_hand: r.quantity_on_hand,
        reserved: r.quantity_reserved,
        quarantine: r.quarantine_quantity,
        available: r.quantity_available,
        reorder_point: r.reorder_point,
        below_reorder: Number(r.quantity_available) < Number(r.reorder_point),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .filter((r) => (!q || includesNormalized(r.name, q) || r.sku.toLowerCase().includes(q.toLowerCase())) && (!below || r.below_reorder))
    .sort((a, b) => Number(a.below_reorder) === Number(b.below_reorder) ? a.name.localeCompare(b.name, "ar") : a.below_reorder ? -1 : 1);
  return { count: rows.length, results: rows.slice((page - 1) * pageSize, page * pageSize) };
}
