/**
 * Cache tags for `'use cache'` functions (research R-02). Every cached read in a store
 * group must call `cacheTag(storeTag(store))` and take `store` as an explicit argument.
 */
export function storeTag(store: string): string {
  return `store:${store}`;
}

export const PLATFORM_TAG = "platform";
