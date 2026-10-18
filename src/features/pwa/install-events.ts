"use client";

import type { InstallEventType } from "@/features/pwa/schemas";

/**
 * `POST /api/v1/pwa/install-event/` — always `source: 'nextjs_app'` (FR-44.01, SC-44.3).
 * Fire-and-forget: a 429 (30/min/IP) or an outage is swallowed silently.
 */
export function sendInstallEvent(event_type: InstallEventType) {
  void fetch("/api/v1/pwa/install-event/", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ event_type, source: "nextjs_app" }),
    keepalive: true,
  }).catch(() => undefined);
}
