import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createSection, listSections } from "@/mocks/design/state";

/**
 * `GET/POST /api/v1/admin/sections/` — Django `api/views_design.py` since INT-018 (owner
 * session, M08 content validation; was `IsAdminUser`). `liveOrMock` module `design`.
 */
const OWNER_ONLY = "تصميم المتجر مقصور على مالك المتجر.";

export async function GET(request: Request) {
  return liveOrMock(request, "design", "/api/v1/admin/sections/", () =>
    mockRoute(request, ({ store, session }) =>
      session.kind !== "merchant" ? mockJson({ detail: OWNER_ONLY }, { status: 403 }) : mockJson(listSections(store), { delay: 150 }),
    ),
  );
}

export async function POST(request: Request) {
  return liveOrMock(request, "design", "/api/v1/admin/sections/", () =>
    mockRoute(request, async ({ store, session }) => {
      if (session.kind !== "merchant") return mockJson({ detail: OWNER_ONLY }, { status: 403 });
      return respond(createSection(store, await readBody(request)));
    }),
  );
}
