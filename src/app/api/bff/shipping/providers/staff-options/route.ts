import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { staffOptions } from "@/mocks/shipping/state";
import { ownerOnly } from "@/app/api/bff/shipping/_guard";

/** Staff accounts an in-house agent can be linked to (M18) — `is_terminated` drives «الحساب مُنهى». */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, session }) => ownerOnly(session) ?? mockJson(staffOptions(store), { delay: 120 }));
}
