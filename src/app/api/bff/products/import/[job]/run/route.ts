import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { runImport } from "@/mocks/catalog/import";

/** `POST /api/v1/products/import/<job_id>/run/` `{mapping}` — the only step that writes (SC-04.5). */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/products/import/[job]/run">) {
  const { job } = await params;
  return mockRoute(request, async ({ store, session }) => {
    if (!canManageCatalog(session)) return forbidden();
    const body = await readBody(request);
    const mapping =
      body.mapping && typeof body.mapping === "object" && !Array.isArray(body.mapping)
        ? Object.fromEntries(Object.entries(body.mapping as Record<string, unknown>).filter(([, v]) => typeof v === "string" && v)) as Record<string, string>
        : {};
    return respond(runImport(store, job, mapping));
  });
}
