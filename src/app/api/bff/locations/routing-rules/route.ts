import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createRule, listRules } from "@/mocks/locations/state";
import { ownerOnly } from "@/app/api/bff/locations/_guard";

/** `GET/POST /api/v1/locations/routing-rules/` (US-22.6). */
export async function GET(request: Request) {
  return mockRoute(request, ({ store }) => mockJson(listRules(store), { delay: 140 }));
}

export async function POST(request: Request) {
  return mockRoute(request, async ({ store, session }) => ownerOnly(session) ?? respond(createRule(store, await readBody(request)), { delay: 200 }));
}
