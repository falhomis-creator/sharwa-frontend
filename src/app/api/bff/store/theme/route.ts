import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { patchTheme, readTheme } from "@/mocks/design/state";

/**
 * `GET/PATCH /api/v1/store/theme/` (M08 §7 — Django `api/views_design.py` since INT-018,
 * `liveOrMock` module `design`). PATCH is JSON, or multipart when a logo file is attached; the
 * answer is the full entity with `brand_shades` derived from `primary_color`. A stale
 * `version` answers 409 «حُدِّث الثيم من جلسة أخرى» (`?simulateConflict=1` forces it).
 * Owner only: the module has no permission key among the 35 (M08 §2).
 */
const OWNER_ONLY = "تصميم المتجر مقصور على مالك المتجر.";

export async function GET(request: Request) {
  return liveOrMock(request, "design", "/api/v1/store/theme/", () =>
    mockRoute(request, ({ store, session }) =>
      session.kind !== "merchant" ? mockJson({ detail: OWNER_ONLY }, { status: 403 }) : mockJson(readTheme(store), { delay: 160 }),
    ),
  );
}

async function readThemeBody(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("multipart/form-data")) return readBody(request);
  const form = await request.formData();
  const body: Record<string, unknown> = {};
  for (const [k, v] of form.entries()) {
    if (typeof v === "string") body[k] = k === "version" ? Number(v) : v;
    else if (k === "logo") {
      const ext = v.name.split(".").pop()?.toLowerCase() ?? "";
      if (!["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) body.logo = "invalid";
      else body.logo = `data:${v.type || "image/png"};base64,${Buffer.from(await v.arrayBuffer()).toString("base64")}`;
    }
  }
  return body;
}

export async function PATCH(request: Request) {
  return liveOrMock(request, "design", "/api/v1/store/theme/", () =>
    mockRoute(request, async ({ store, session, url }) => {
      if (session.kind !== "merchant") return mockJson({ detail: OWNER_ONLY }, { status: 403 });
      const body = await readThemeBody(request);
      return respond(patchTheme(store, body, { conflict: url.searchParams.get("simulateConflict") === "1" }), { delay: 280 });
    }),
  );
}
