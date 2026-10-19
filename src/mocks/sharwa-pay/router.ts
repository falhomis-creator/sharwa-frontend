import "server-only";
import type { MockResult } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { createTopup, createWithdrawal, listRequests, listTransactions, sendOtp, verifyOtp, walletView, normalizePayPhone } from "@/mocks/sharwa-pay/state";

/**
 * `/api/bff/sharwa-pay/*` → the proposed `/api/v1/sharwa-pay/*` rows (M40 §7). The session
 * is a dev-only HttpOnly marker on the PLATFORM origin (`sharwa_mock_pay=<phone>`), set by
 * `otp/verify` and cleared by `logout` — the real contract is Django's session cookie on the
 * same origin (M40 §10). It is never readable from JS and never shared with a store origin.
 */
export const MOCK_PAY_COOKIE = "sharwa_mock_pay";
type Body = Record<string, unknown>;

function cookieValue(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

async function json(req: Request): Promise<Body> {
  try {
    const d: unknown = await req.json();
    return d && typeof d === "object" && !Array.isArray(d) ? (d as Body) : {};
  } catch {
    return {};
  }
}

function send<T>(r: MockResult<T>, headers: Record<string, string> = {}) {
  if (r.ok) return mockJson(r.data, { status: r.status ?? 200, delay: 160, headers });
  const ra: Record<string, string> = typeof r.body.retry_after === "number" ? { "retry-after": String(r.body.retry_after) } : {};
  return mockJson(r.body, { status: r.status, delay: 120, headers: ra });
}

const NOT_FOUND = () => mockJson({ detail: "غير موجود." }, { status: 404 });

export async function sharwaPayMock(request: Request, path: string[]): Promise<Response> {
  const m = request.method;
  const route = path.join("/");
  if (route === "otp/send") return m === "POST" ? send(sendOtp(await json(request))) : NOT_FOUND();
  if (route === "otp/verify") {
    if (m !== "POST") return NOT_FOUND();
    const r = verifyOtp(await json(request));
    return send(r, r.ok ? { "set-cookie": `${MOCK_PAY_COOKIE}=${r.data.phone}; Path=/; HttpOnly; SameSite=Lax` } : {});
  }
  if (route === "logout") return m === "POST" ? mockJson(null, { status: 204, headers: { "set-cookie": `${MOCK_PAY_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax` } }) : NOT_FOUND();

  const phone = normalizePayPhone(cookieValue(request.headers.get("cookie"), MOCK_PAY_COOKIE));
  if (!phone) return mockJson({ detail: "سجّل الدخول برقم جوالك." }, { status: 401 });
  const url = new URL(request.url);
  switch (route) {
    case "wallet":
      return m === "GET" ? mockJson(walletView(phone), { delay: 140 }) : NOT_FOUND();
    case "transactions":
      return m === "GET" ? mockJson(listTransactions(phone, url.searchParams), { delay: 140 }) : NOT_FOUND();
    case "requests":
      return m === "GET" ? mockJson(listRequests(phone), { delay: 140 }) : NOT_FOUND();
    case "topups": {
      if (m !== "POST") return NOT_FOUND();
      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        return mockJson({ detail: "أرسل النموذج كـ multipart/form-data." }, { status: 400 });
      }
      return send(await createTopup(phone, form));
    }
    case "withdrawals":
      return m === "POST" ? send(createWithdrawal(phone, await json(request))) : NOT_FOUND();
    default:
      return NOT_FOUND();
  }
}
