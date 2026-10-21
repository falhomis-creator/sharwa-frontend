/**
 * Mock runtime for `[NEEDS BACKEND]` contracts (contracts/bff-cross-cutting.md §2.2).
 * Every mocked response carries `x-sharwa-mock: 1` so the dev shell can show the indicator.
 */
export const MOCK_HEADER = "x-sharwa-mock";

export function isMocksOn(): boolean {
  const v = process.env.SHARWA_MOCKS;
  if (v === "on") return true;
  if (v === "off") return false;
  return process.env.NODE_ENV !== "production";
}

export interface MockInit {
  status?: number;
  /** Simulated latency in ms (dev only; keep ≤ 400 so skeletons are visible but checks stay fast). */
  delay?: number;
  headers?: Record<string, string>;
}

export async function mockJson(data: unknown, init: MockInit = {}): Promise<Response> {
  if (init.delay && process.env.NODE_ENV !== "test") await new Promise((r) => setTimeout(r, init.delay));
  return new Response(data === null || data === undefined ? null : JSON.stringify(data), {
    status: init.status ?? (data === null || data === undefined ? 204 : 200),
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      [MOCK_HEADER]: "1",
      ...init.headers,
    },
  });
}

export function mockError(status: number, detail: string, extra: Record<string, unknown> = {}): Promise<Response> {
  return mockJson({ detail, ...extra }, { status });
}

export function mockFieldErrors(fields: Record<string, string[]>): Promise<Response> {
  return mockJson(fields, { status: 400 });
}

/**
 * Integrated modules (full-stack integration protocol): a module named in
 * `SHARWA_LIVE_MODULES` (comma-separated, e.g. `reports`) answers from Django even while
 * `SHARWA_MOCKS=on` — so one integrated module can be exercised live while every other
 * module stays on its fixtures. With `SHARWA_MOCKS=off` every integrated module is live.
 */
export function isModuleLive(module: string): boolean {
  if (!isMocksOn()) return true;
  const live = (process.env.SHARWA_LIVE_MODULES ?? "")
    .split(",")
    .map((m) => m.trim().toLowerCase())
    .filter(Boolean);
  return live.includes("*") || live.includes(module.toLowerCase());
}

/** What `[NEEDS BACKEND]` adapters return when mocks are off and the real endpoint does not exist yet. */
export function notAvailable(): Promise<Response> {
  return mockJson({ detail: "غير متاح بعد." }, { status: 501, headers: { [MOCK_HEADER]: "0" } });
}
