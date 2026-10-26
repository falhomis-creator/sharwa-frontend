"use client";

import { BellIcon, BellOffIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { PushResultSchema, VapidKeySchema } from "@/features/pwa/schemas";

/**
 * «نبّهني عند تغيّر حالة طلبي» on the order success page only — permission is asked after
 * a real purchase, never before (M44 US-44.4, §10). Hidden when the browser has no Push API,
 * when permission was denied (no second ask in the session) or when VAPID is not configured.
 *
 * The subscription is sent as `toJSON()` plus `order_uuid` (INT-016): Django takes the phone
 * the status pushes target FROM THAT ORDER — a phone typed by the client is never trusted, so
 * nobody can receive another number's order updates. `customer_phone` is still sent (FR-44.05)
 * and ignored by Django without the order. A browser already subscribed sees the confirmation
 * with «إيقاف التنبيهات» (US-44.4.3 → `POST /api/v1/push/unsubscribe/`).
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "unsupported" | "idle" | "busy" | "done" | "denied";

export function PushSubscribe({ phone, orderUuid }: { phone: string | null; orderUuid: string }) {
  const [state, setState] = useState<State>("unsupported");

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!supported) return;
    let alive = true;
    queueMicrotask(() => {
      if (alive) setState(Notification.permission === "denied" ? "denied" : "idle");
    });
    if (Notification.permission === "granted") {
      // Already subscribed in this browser: link this order too (its phone), then show «done».
      void navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then(async (sub) => {
          if (!sub || !alive) return;
          await apiFetch("/api/v1/push/subscribe/", PushResultSchema, {
            method: "POST",
            json: { ...sub.toJSON(), order_uuid: orderUuid, customer_phone: phone ?? undefined },
          }).catch(() => undefined);
          if (alive) setState("done");
        })
        .catch(() => undefined);
    }
    return () => {
      alive = false;
    };
  }, [orderUuid, phone]);

  if (state === "unsupported" || state === "denied") return null;

  async function subscribe() {
    setState("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }
      const { publicKey } = await apiFetch("/api/v1/push/vapid-public-key/", VapidKeySchema);
      if (!publicKey) {
        console.warn("[pwa] VAPID public key is empty — push disabled");
        setState("unsupported");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      await apiFetch("/api/v1/push/subscribe/", PushResultSchema, {
        method: "POST",
        json: { ...sub.toJSON(), order_uuid: orderUuid, customer_phone: phone ?? undefined },
      });
      setState("done");
      toast.success("سنُنبّهك عند تغيّر الحالة");
    } catch (e) {
      console.warn("[pwa] push subscription failed", e);
      toast.error("تعذّر تفعيل التنبيهات على هذا المتصفح.");
      setState("idle");
    }
  }

  async function unsubscribe() {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await apiFetch("/api/v1/push/unsubscribe/", PushResultSchema, { method: "POST", json: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setState("idle");
      toast.success("أُوقفت التنبيهات على هذا المتصفح.");
    } catch (e) {
      console.warn("[pwa] push unsubscribe failed", e);
      toast.error("تعذّر إيقاف التنبيهات، حاول مجدداً.");
      setState("done");
    }
  }

  if (state === "done") {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground" data-testid="push-subscribed">
        <p>سنُنبّهك عند تغيّر حالة طلبك.</p>
        <Button variant="ghost" className="h-11 gap-2 px-3" onClick={unsubscribe} data-testid="push-unsubscribe">
          <BellOffIcon aria-hidden />
          إيقاف التنبيهات
        </Button>
      </div>
    );
  }

  return (
    <Button variant="outline" className="h-11 gap-2" onClick={subscribe} disabled={state === "busy"} data-testid="push-subscribe">
      <BellIcon aria-hidden />
      نبّهني عند تغيّر حالة طلبي
    </Button>
  );
}
