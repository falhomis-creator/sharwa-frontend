/**
 * Per-store mutable mock state (M04/M05/M06/M49 `[NEEDS BACKEND]` rows).
 *
 * Hangs off `globalThis` for the same reason as the onboarding registry
 * (`src/mocks/public/register.ts`): route handlers and Server Components are compiled into
 * separate bundles with their own module copies, but run in one Node process. A product
 * created through `/api/bff/products` must be visible to the order mock, the search mock
 * and the overview RSC alike.
 *
 * Keyed by store slug, so two stores never share a row (constitution VIII).
 */
const ROOT = Symbol.for("sharwa.mock.dashboard-state");

type Bag = Map<string, unknown>;

function root(): Map<string, Bag> {
  const g = globalThis as unknown as Record<symbol, Map<string, Bag> | undefined>;
  let map = g[ROOT];
  if (!map) {
    map = new Map();
    g[ROOT] = map;
  }
  return map;
}

/** The state for `store` under `key`, created once from `seed()`. */
export function storeState<T>(store: string | null, key: string, seed: () => T): T {
  const slug = store ?? "__platform";
  const all = root();
  let bag = all.get(slug);
  if (!bag) {
    bag = new Map();
    all.set(slug, bag);
  }
  if (!bag.has(key)) bag.set(key, seed());
  return bag.get(key) as T;
}

/** Monotonic id generator per store and entity. */
export function nextId(store: string | null, entity: string, start: number): number {
  const counter = storeState(store, `__id:${entity}`, () => ({ value: start }));
  counter.value += 1;
  return counter.value;
}

/** Stable integer seed from a store slug, so fixtures are reproducible per store. */
export function seedOf(store: string | null): number {
  if (!store) return 7;
  let s = 0;
  for (const ch of store) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  return s || 7;
}

/** The fixed "now" every fixture is built around, so screenshots never drift. */
export const FIXTURE_NOW = Date.UTC(2026, 9, 17, 20, 0, 0);
