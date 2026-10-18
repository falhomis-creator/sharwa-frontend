import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createSchedule, listSchedules } from "@/mocks/reports/schedules";
import { reportsFeatureOff } from "@/app/api/bff/reports/_guard";

/** `GET/POST /api/v1/reports/schedules/` `{report_code, frequency, email}` — M25 US-25.4. */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, session }) => reportsFeatureOff(session) ?? mockJson(listSchedules(store), { delay: 160 }), { permission: "reports.view" });
}

export async function POST(request: Request) {
  return mockRoute(request, async ({ store, session }) => reportsFeatureOff(session) ?? respond(createSchedule(store, await readBody(request)), { delay: 220 }), { permission: "reports.view" });
}
