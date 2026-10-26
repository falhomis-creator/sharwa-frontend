import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, respond } from "@/lib/bff/mock-route";
import { deleteNote } from "@/mocks/customers/state";
import { noteActor } from "@/mocks/customers/actor";

/** `DELETE /api/v1/customers/<phone>/notes/<id>/` → 204; 403 for someone else's note unless owner. */
export async function DELETE(request: Request, { params }: RouteContext<"/api/bff/customers/[phone]/notes/[id]">) {
  const { phone, id } = await params;
  const p = encodeURIComponent(decodeURIComponent(phone));
  return liveOrMock(request, "customers", `/api/v1/customers/${p}/notes/${encodeURIComponent(id)}/`, () =>
    mockRoute(request, ({ store, session }) => respond(deleteNote(store, decodeURIComponent(phone), Number(id), noteActor(session))), { permission: "customers.view" }),
  );
}
