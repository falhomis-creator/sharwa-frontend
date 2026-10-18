import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createSection, listSections } from "@/mocks/design/state";

/**
 * `GET/POST /api/v1/admin/sections/` — Ready upstream, but Django authenticates it with
 * `IsAdminUser` (superuser), not the merchant session (M08 §7 `[NEEDS BACKEND]` caveat).
 * Mocked here with the same contract, owner only, until that row accepts the owner session.
 */
const OWNER_ONLY = "تصميم المتجر مقصور على مالك المتجر.";

export async function GET(request: Request) {
  return mockRoute(request, ({ store, session }) =>
    session.kind !== "merchant" ? mockJson({ detail: OWNER_ONLY }, { status: 403 }) : mockJson(listSections(store), { delay: 150 }),
  );
}

export async function POST(request: Request) {
  return mockRoute(request, async ({ store, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: OWNER_ONLY }, { status: 403 });
    return respond(createSection(store, await readBody(request)));
  });
}
