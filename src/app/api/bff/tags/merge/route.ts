import { liveOrMock } from "@/lib/bff/live-route";
import { canManageCatalog, forbidden, mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mergeTags } from "@/mocks/catalog/organization";

/** `POST /api/v1/tags/merge/` `{from_id, into_id}` — products move, then `from` is deleted (US-05.4.1). */
export async function POST(request: Request) {
  return liveOrMock(request, "catalog", "/api/v1/tags/merge/", () =>
    mockRoute(request, async ({ store, session }) => {
      if (!canManageCatalog(session)) return forbidden();
      const body = await readBody(request);
      return respond(mergeTags(store, Number(body.from_id), Number(body.into_id)));
    }),
  );
}
