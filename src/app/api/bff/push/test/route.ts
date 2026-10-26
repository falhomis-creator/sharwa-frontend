import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { pushTest } from "@/mocks/storefront/passthrough";

/**
 * `POST /api/v1/push/test/` `{title, body}` → 202 `{queued_for}` — M44 US-44.5 (INT-016, Django
 * `api/views_push.py`). Owner only (a broadcast reaches every subscribed buyer); 400 without
 * active subscribers; 429 + Retry-After within a minute of the last broadcast.
 */
export async function POST(request: Request) {
  return liveOrMock(request, "pwa", "/api/v1/push/test/", () =>
    mockRoute(request, async ({ store, session }) => {
      if (session.kind !== "merchant") return mockJson({ detail: "إرسال الإشعارات لكل المشتركين للمالك وحده." }, { status: 403 });
      const result = pushTest(store, await readBody(request));
      if (!result.ok && result.status === 429) return mockJson(result.body, { status: 429, headers: { "retry-after": "60" } });
      return respond(result);
    }),
  );
}
