import { hasPermission } from "@/lib/access";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { filterProducts, toListItem } from "@/mocks/catalog/products";
import { catalog } from "@/mocks/catalog/state";
import { searchCustomers, searchOrders } from "@/mocks/orders/state";

/**
 * `GET /api/v1/search/?q=&types=orders,products,customers&limit=5` (M48 §7 — `[NEEDS BACKEND]`).
 * Groups are trimmed by the session's permissions here too (M48 §10): no `orders.view` → no
 * orders; no `customers.view` → no customers. Products are visible to every active member
 * (no product permission key exists, M48 §10).
 */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, session, url }) => {
    const q = (url.searchParams.get("q") ?? "").trim();
    const limit = Math.min(10, Number(url.searchParams.get("limit") ?? 5) || 5);
    const types = (url.searchParams.get("types") ?? "orders,products,customers").split(",");
    const subject = { kind: session.kind, features: session.features, permissions: session.staff?.permissions };
    const empty = { orders: [], products: [], customers: [], pages: [], actions: [] };
    if (q.replace(/[#\s]/g, "").length < 2) return mockJson(empty);
    const orderQ = q.replace(/^#/, "");
    const orders =
      types.includes("orders") && hasPermission(subject, "orders.view")
        ? searchOrders(store, orderQ, limit).map((o) => ({
            id: o.id,
            customer_name: o.customer_name,
            customer_phone: o.customer_phone,
            display_total: o.display_total,
            status: o.status,
            fulfillment_status: o.fulfillment_status ? { name: o.fulfillment_status.name, color: o.fulfillment_status.color } : null,
            created_at: o.created_at,
          }))
        : [];
    const state = catalog(store);
    const products = types.includes("products")
      ? filterProducts(state, new URLSearchParams({ q }))
          .slice(0, limit)
          .map((p) => {
            const row = toListItem(state, p);
            return { id: p.id, name: p.name, name_en: p.name_en, sku: p.sku, image: row.image, display_price: row.display_price, stock: row.stock };
          })
      : [];
    const customers =
      types.includes("customers") && hasPermission(subject, "customers.view") ? searchCustomers(store, q, limit) : [];
    return mockJson({ orders, products, customers, pages: [], actions: [] }, { delay: 120 });
  });
}
