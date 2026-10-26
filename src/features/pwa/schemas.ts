import { z } from "zod";

/** M44 — ready-api-v1 #11–#14. */
export const INSTALL_EVENT_TYPES = ["prompt_shown", "ios_hint_shown", "accepted", "dismissed", "installed"] as const;
export type InstallEventType = (typeof INSTALL_EVENT_TYPES)[number];

export const InstallEventResultSchema = z.object({ ok: z.boolean() }).passthrough();
export const VapidKeySchema = z.object({ publicKey: z.string() });
export const PushResultSchema = z.object({ ok: z.boolean() }).passthrough();

/** M44 US-44.5 (INT-016) — merchant: `GET /api/v1/push/stats/`, `POST /api/v1/push/test/` (202). */
export const PushStatsSchema = z.object({ active_subscribers: z.number().int() });
export type PushStats = z.infer<typeof PushStatsSchema>;
export const PushTestResultSchema = z.object({ queued_for: z.number().int() });
export const PUSH_TITLE_MAX = 60;
export const PUSH_BODY_MAX = 200;

/** `short_name`: the first 11 characters + «…» when the name is longer than 12 (as the backend does). */
export function shortName(name: string): string {
  const chars = [...name];
  return chars.length > 12 ? `${chars.slice(0, 11).join("")}…` : name;
}
