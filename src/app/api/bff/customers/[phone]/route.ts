import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { customerDetail } from "@/mocks/customers/state";

/** `GET /api/v1/customers/<phone>/` → the derived profile with both trust sources apart (FR-07.03). */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/customers/[phone]">) {
  const { phone } = await params;
  return mockRoute(
    request,
    ({ store }) => {
      const detail = customerDetail(store, decodeURIComponent(phone));
      if (!detail) return mockJson({ detail: "لا عميل بهذا الرقم في متجرك." }, { status: 404 });
      return mockJson(detail, { delay: 180 });
    },
    { permission: "customers.view" },
  );
}
