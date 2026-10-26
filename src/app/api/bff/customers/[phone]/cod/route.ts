import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { setCod } from "@/mocks/customers/state";
import { audit, sessionActor } from "@/mocks/staff/state";

/**
 * `POST /api/v1/customers/<phone>/cod/` `{cod_disabled, reason}` → the store's
 * `CustomerReliabilityRecord` (FR-07.10): `customers.edit_profile`, a reason, and an audit row.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/customers/[phone]/cod">) {
  const { phone } = await params;
  const p = encodeURIComponent(decodeURIComponent(phone));
  return liveOrMock(request, "customers", `/api/v1/customers/${p}/cod/`, () => mockRoute(
    request,
    async ({ store, session }) => {
      const actor = sessionActor(store, session);
      const body = await readBody(request);
      const result = setCod(store, decodeURIComponent(phone), body, actor.name);
      if (result.ok) {
        audit(store, {
          action_code: result.data.cod_disabled ? "customers.cod_disabled" : "customers.cod_enabled",
          actor: actor.name,
          entity: `customer:${decodeURIComponent(phone)}`,
          before_snapshot: { cod_disabled: !result.data.cod_disabled },
          after_snapshot: { cod_disabled: result.data.cod_disabled, reason: result.data.reason },
        });
      }
      return respond(result);
    },
    { permission: "customers.edit_profile" },
  ));
}
