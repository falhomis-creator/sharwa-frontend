import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { markAllRead } from "@/mocks/notifications/state";

/** `POST /api/v1/notifications/read-all/` `{kind?}` → `{updated}` (comma-separated kinds accepted). Live: INT-009. */
export async function POST(request: Request) {
  return liveOrMock(request, "notifications", "/api/v1/notifications/read-all/", () =>
    mockRoute(request, async ({ store, session }) => {
      const body = await readBody(request);
      const kinds = typeof body.kind === "string" ? body.kind.split(",").filter(Boolean) : [];
      return mockJson(markAllRead(store, session, kinds), { delay: 100 });
    }),
  );
}
