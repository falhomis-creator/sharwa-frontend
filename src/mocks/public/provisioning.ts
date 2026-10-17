import type { ProvisioningStatus } from "@/lib/schemas/provisioning";
import { buildStoreUrl } from "@/lib/tenant";

/**
 * `GET /register/status/<token>/` fixture (M47 US-47.3, M02).
 *
 * Deterministic by token prefix so a screenshot of any state is reproducible
 * (constitution IV — a progressing fixture cannot be captured):
 *   `pend…` → pending · `prov…` → provisioning · `ready…` → ready · `fail…` → failed
 * Any other token advances pending → provisioning → ready, two calls per stage,
 * which is what the onboarding wizard (3C) exercises.
 */
const progress = new Map<string, number>();

export function provisioningMock(
  token: string,
  opts: { store?: string | null; baseDomain: string; port?: string | null; protocol?: "http" | "https" } = {
    baseDomain: "localhost",
  },
): ProvisioningStatus {
  const t = token.toLowerCase();
  const store = opts.store ?? "noor";
  // The port comes from the live request: a fixture that hard-codes :3000 sends the
  // merchant to a dead origin whenever the app runs anywhere else (a production build on
  // :3100, say) — which is exactly how the first run of `tenant-shell-check` failed.
  const origin = buildStoreUrl(store, opts.baseDomain, { protocol: opts.protocol, port: opts.port });
  const ready: ProvisioningStatus = {
    status: "ready",
    store_url: origin,
    dashboard_url: `${origin}/dashboard`,
  };

  if (t.startsWith("pend")) return { status: "pending" };
  if (t.startsWith("prov")) return { status: "provisioning" };
  if (t.startsWith("ready")) return ready;
  if (t.startsWith("fail")) return { status: "failed" };

  const n = (progress.get(token) ?? 0) + 1;
  progress.set(token, n);
  if (n <= 2) return { status: "pending" };
  if (n <= 4) return { status: "provisioning" };
  return ready;
}
