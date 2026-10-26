import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { addNote, listNotes } from "@/mocks/customers/state";
import { noteActor } from "@/mocks/customers/actor";

/**
 * `GET/POST /api/v1/customers/<phone>/notes/` `{body}` — the proposed `CustomerNote`
 * (Django `CustomerNote` since INT-017, FR-07.08): internal only, newest first, author + time; each row says
 * whether the current member may delete it (its author or the owner).
 */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/customers/[phone]/notes">) {
  const { phone } = await params;
  const p = encodeURIComponent(decodeURIComponent(phone));
  return liveOrMock(request, "customers", `/api/v1/customers/${p}/notes/`, () =>
    mockRoute(request, ({ store, session }) => mockJson(listNotes(store, decodeURIComponent(phone), noteActor(session)), { delay: 140 }), { permission: "customers.view" }),
  );
}

export async function POST(request: Request, { params }: RouteContext<"/api/bff/customers/[phone]/notes">) {
  const { phone } = await params;
  const p = encodeURIComponent(decodeURIComponent(phone));
  return liveOrMock(request, "customers", `/api/v1/customers/${p}/notes/`, () =>
    mockRoute(request, async ({ store, session }) => respond(addNote(store, decodeURIComponent(phone), await readBody(request), noteActor(session))), { permission: "customers.view" }),
  );
}
