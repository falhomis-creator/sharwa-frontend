"use client";

import { useSyncExternalStore } from "react";

/**
 * «الأخيرة» (M48 FR-48.07): ≤ 10 entries in localStorage under
 * `sharwa:recent:<store>:<staff>` — scoped by store AND member, so two stores (or two staff
 * on one browser) never mix. Cleared on logout. Every access is guarded: private windows
 * and blocked storage simply show no recents.
 */
export interface RecentEntry {
  key: string;
  title: string;
  path: string;
  hint?: string;
}

const MAX = 10;
const EVENT = "sharwa:recents";

export function recentsKey(store: string, member: string): string {
  return `sharwa:recent:${store}:${member}`;
}

function read(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "[]";
  } catch {
    return "[]";
  }
}

export function parseRecents(raw: string): RecentEntry[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as RecentEntry[]).filter((e) => e && typeof e.path === "string" && typeof e.title === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function pushRecent(key: string, entry: RecentEntry) {
  try {
    const list = parseRecents(read(key)).filter((e) => e.key !== entry.key);
    window.localStorage.setItem(key, JSON.stringify([entry, ...list].slice(0, MAX)));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Storage unavailable: recents are a convenience only.
  }
}

/** Drop every recents list of this store (logout — FR-48.07). */
export function clearRecents(store: string) {
  try {
    const prefix = `sharwa:recent:${store}:`;
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(prefix)) window.localStorage.removeItem(k);
    }
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // ignore
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** The raw JSON string (a stable snapshot); parse it with `parseRecents` in a memo. */
export function useRecentsRaw(key: string): string {
  return useSyncExternalStore(
    subscribe,
    () => read(key),
    () => "[]",
  );
}
