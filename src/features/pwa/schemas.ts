import { z } from "zod";

/** M44 — ready-api-v1 #11–#14. */
export const INSTALL_EVENT_TYPES = ["prompt_shown", "ios_hint_shown", "accepted", "dismissed", "installed"] as const;
export type InstallEventType = (typeof INSTALL_EVENT_TYPES)[number];

export const InstallEventResultSchema = z.object({ ok: z.boolean() }).passthrough();
export const VapidKeySchema = z.object({ publicKey: z.string() });
export const PushResultSchema = z.object({ ok: z.boolean() }).passthrough();

/** `short_name`: the first 11 characters + «…» when the name is longer than 12 (as the backend does). */
export function shortName(name: string): string {
  const chars = [...name];
  return chars.length > 12 ? `${chars.slice(0, 11).join("")}…` : name;
}
