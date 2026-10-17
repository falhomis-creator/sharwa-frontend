/**
 * TanStack Query keys are ALWAYS tenant-prefixed (constitution VIII, M47 FR-47.09).
 * Platform-origin features use the pseudo-store `"platform"`.
 */
export type QueryKeyPart = string | number | boolean | null | undefined | Record<string, unknown>;

export const PLATFORM_STORE = "platform";

export function storeKey(store: string | null, ...parts: QueryKeyPart[]) {
  return ["store", store ?? PLATFORM_STORE, ...parts] as const;
}
