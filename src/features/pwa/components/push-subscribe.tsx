"use client";

import { BellIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { PushResultSchema, VapidKeySchema } from "@/features/pwa/schemas";

/**
 * «نبّهني عند تغيّر حالة طلبي» on the order success page only — permission is asked after
 * a real purchase, never before (M44 US-44.4, §10). Hidden when the browser has no Push API,
 * when permission was denied (no second ask in the session) or when VAPID is not configured.
 * The subscription is sent as `toJSON()` plus the buyer's phone (FR-44.05).
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushSubscribe({ phone }: { phone: string | null }) {
  const [state, setState] = useState<"unsupported" | "idle" | "busy" | "done" | "denied">("unsupported");

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!supported) return;
    queueMicrotask(() => setState(Notification.permission === "denied" ? "denied" : "idle"));
  }, []);

  if (state === "unsupported" || state === "denied") return null;
  if (state === "done") return <p className="text-sm text-muted-foreground">سنُنبّهك عند تغيّر حالة طلبك.</p>;

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
        json: { ...sub.toJSON(), customer_phone: phone ?? undefined },
      });
      setState("done");
      toast.success("سنُنبّهك عند تغيّر الحالة");
    } catch (e) {
      console.warn("[pwa] push subscription failed", e);
      toast.error("تعذّر تفعيل التنبيهات على هذا المتصفح.");
      setState("idle");
    }
  }

  return (
    <Button variant="outline" className="h-11 gap-2" onClick={subscribe} disabled={state === "busy"} data-testid="push-subscribe">
      <BellIcon aria-hidden />
      نبّهني عند تغيّر حالة طلبي
    </Button>
  );
}
