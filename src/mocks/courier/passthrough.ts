import type { MockResult } from "@/lib/bff/mock-route";
import { registerPassthroughMock } from "@/mocks/passthrough";
import { mockJson } from "@/mocks/runtime";
import { agentGate } from "@/mocks/courier/gate";
import { endShift, partialDelivery, scanPickup, startShift, transition } from "@/mocks/shipping/sharwa-ship";

/**
 * Passthrough fixtures for the five READY M38 rows (§7): `/api/v1/agent/*`. They answer
 * only while Django is unreachable or 404s — a real Django answer always wins
 * (`app/api/v1/[...path]/route.ts`). Same gates as the DRF views: the staff session (401),
 * then the `shipping_provider_profile` link (403). All five are POST.
 */
type Body = Record<string, unknown>;

async function json(req: Request): Promise<Body> {
  try {
    const d: unknown = await req.json();
    return d && typeof d === "object" && !Array.isArray(d) ? (d as Body) : {};
  } catch {
    return {};
  }
}

function send<T>(r: MockResult<T>) {
  return r.ok ? mockJson(r.data, { status: r.status ?? 200, delay: 160 }) : mockJson(r.body, { status: r.status, delay: 120 });
}

const idAt = (url: URL, fromEnd: number) => Number(url.pathname.split("/").filter(Boolean).at(-fromEnd));

registerPassthroughMock("agent/shifts/start/", async (req, ctx) => {
  if (!ctx.store || req.method !== "POST") return undefined;
  const g = await agentGate(req, ctx);
  if (g instanceof Response) return g;
  return send(startShift(g.store, g.agentId, await json(req)));
});

registerPassthroughMock("agent/shifts/end-and-handover/", async (req, ctx) => {
  if (!ctx.store || req.method !== "POST") return undefined;
  const g = await agentGate(req, ctx);
  if (g instanceof Response) return g;
  return send(endShift(g.store, g.agentId, await json(req)));
});

registerPassthroughMock(/^agent\/shipments\/\d+\/status\/$/, async (req, ctx, url) => {
  if (!ctx.store || req.method !== "POST") return undefined;
  const g = await agentGate(req, ctx);
  if (g instanceof Response) return g;
  return send(transition(g.store, idAt(url, 2), await json(req), "agent_app", { type: "agent", id: g.agentId, name: g.agentName.split(" — ")[0]! }));
});

registerPassthroughMock(/^agent\/fulfillments\/\d+\/scan-pickup\/$/, async (req, ctx, url) => {
  if (!ctx.store || req.method !== "POST") return undefined;
  const g = await agentGate(req, ctx);
  if (g instanceof Response) return g;
  return send(scanPickup(g.store, g.agentId, idAt(url, 2), await json(req)));
});

registerPassthroughMock(/^agent\/fulfillments\/\d+\/partial-delivery\/$/, async (req, ctx, url) => {
  if (!ctx.store || req.method !== "POST") return undefined;
  const g = await agentGate(req, ctx);
  if (g instanceof Response) return g;
  return send(partialDelivery(g.store, g.agentId, idAt(url, 2), await json(req)));
});
