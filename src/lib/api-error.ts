/**
 * Unified API error (contracts/bff-cross-cutting.md §4). Isomorphic: no server-only imports.
 */
export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  readonly status: number;
  readonly detail?: string;
  readonly fields?: FieldErrors;
  readonly retryAfter?: number;
  readonly isMock: boolean;
  readonly isCsrf: boolean;

  constructor(init: {
    status: number;
    detail?: string;
    fields?: FieldErrors;
    retryAfter?: number;
    isMock?: boolean;
  }) {
    super(init.detail ?? defaultMessage(init.status));
    this.name = "ApiError";
    this.status = init.status;
    this.detail = init.detail;
    this.fields = init.fields;
    this.retryAfter = init.retryAfter;
    this.isMock = init.isMock ?? false;
    this.isCsrf = init.status === 403 && /csrf/i.test(init.detail ?? "");
  }

  /** First field message, for inline display when no `detail` exists. */
  get firstFieldMessage(): string | undefined {
    if (!this.fields) return undefined;
    const first = Object.values(this.fields).find((v) => v.length > 0);
    return first?.[0];
  }

  get userMessage(): string {
    return this.detail ?? this.firstFieldMessage ?? defaultMessage(this.status);
  }
}

export function defaultMessage(status: number): string {
  switch (status) {
    case 400:
      return "تحقق من البيانات المدخلة.";
    case 401:
      return "انتهت جلستك، سجّل الدخول مجدداً.";
    case 403:
      return "ليست لديك صلاحية لهذا الإجراء.";
    case 404:
      return "العنصر غير موجود.";
    case 409:
      return "تغيّرت البيانات من جهة أخرى، أعد التحميل ثم حاول مجدداً.";
    case 428:
      return "يلزم تأكيد إضافي لإتمام هذا الإجراء.";
    case 429:
      return "طلبات كثيرة جداً، حاول لاحقاً.";
    case 501:
      return "غير متاح بعد.";
    case 502:
    case 504:
      return "الخادم غير متاح حالياً.";
    case 503:
      return "المتجر قيد التجهيز، حاول بعد قليل.";
    default:
      return "حدث خطأ غير متوقع.";
  }
}

type DrfBody = { detail?: unknown } & Record<string, unknown>;

/** Parse a non-2xx `Response` (DRF shapes `{detail}` / `{field:[msg]}`) into `ApiError`. */
export async function parseApiError(res: Response): Promise<ApiError> {
  let detail: string | undefined;
  let fields: FieldErrors | undefined;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const body = (await res.json()) as DrfBody;
      if (typeof body.detail === "string") detail = body.detail;
      const entries = Object.entries(body).filter(([k]) => k !== "detail");
      if (entries.length > 0) {
        fields = {};
        for (const [k, v] of entries) {
          if (Array.isArray(v)) fields[k] = v.map(String);
          else if (typeof v === "string") fields[k] = [v];
        }
        if (Object.keys(fields).length === 0) fields = undefined;
      }
    } catch {
      // non-JSON body despite header — ignore
    }
  }
  const retryAfterRaw = res.headers.get("retry-after");
  const retryAfter = retryAfterRaw && /^\d+$/.test(retryAfterRaw) ? Number(retryAfterRaw) : undefined;
  return new ApiError({
    status: res.status,
    detail,
    fields,
    retryAfter,
    isMock: res.headers.get("x-sharwa-mock") === "1",
  });
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
