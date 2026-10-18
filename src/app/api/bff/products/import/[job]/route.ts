import { mockRoute, respond } from "@/lib/bff/mock-route";
import { importStatus } from "@/mocks/catalog/import";

/** `GET /api/v1/products/import/<job_id>/` → `{status, done, total, failed[{row, msg}]}` (polled). */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/products/import/[job]">) {
  const { job } = await params;
  return mockRoute(request, ({ store }) => respond(importStatus(store, job), { delay: 60 }));
}
