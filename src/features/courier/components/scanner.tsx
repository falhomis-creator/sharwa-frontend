"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { inputClass } from "@/components/shared/field";
import { primaryAction, secondaryAction } from "@/features/courier/components/shell";

/**
 * Pickup scan (FR-38.06): the camera through `BarcodeDetector` when the browser has it,
 * and ALWAYS a manual field — the code is sent exactly as read or typed. The camera
 * button is 56px (§6).
 */
interface Detector {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
}
type DetectorCtor = new (opts?: { formats?: string[] }) => Detector;

function detectorCtor(): DetectorCtor | null {
  if (typeof window === "undefined") return null;
  return ((window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector ?? null) as DetectorCtor | null;
}

export function Scanner({ onCode, busy }: { onCode: (code: string) => void; busy: boolean }) {
  const [manual, setManual] = useState("");
  const [camera, setCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const supported = detectorCtor() !== null;

  return (
    <div className="flex flex-col gap-3" data-testid="scanner">
      {camera ? (
        <CameraView
          onCode={(c) => {
            setCamera(false);
            onCode(c);
          }}
          onClose={() => setCamera(false)}
          onError={(m) => {
            setCamera(false);
            setCameraError(m);
          }}
        />
      ) : null}
      <div className="flex items-end gap-2">
        <form
          className="flex flex-1 flex-col gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (manual.trim()) onCode(manual.trim());
          }}
        >
          <label htmlFor="scan-manual" className="text-sm">
            الباركود (إدخال يدوي)
          </label>
          <div className="flex gap-2">
            <input id="scan-manual" dir="ltr" value={manual} onChange={(e) => setManual(e.target.value)} className={`${inputClass} h-12 flex-1 font-mono`} autoComplete="off" data-testid="scan-input" />
            <button type="submit" className={`${secondaryAction} w-auto`} disabled={busy || !manual.trim()} data-testid="scan-submit">
              تحقق
            </button>
          </div>
        </form>
        <button
          type="button"
          onClick={() => {
            setCameraError(null);
            setCamera(true);
          }}
          disabled={!supported || busy}
          aria-label="مسح بالكاميرا"
          title={supported ? undefined : "المتصفح لا يدعم قراءة الباركود — استخدم الإدخال اليدوي"}
          className="inline-flex size-14 shrink-0 items-center justify-center rounded-lg border border-border disabled:opacity-40"
          data-testid="scan-camera"
        >
          <Camera className="size-6" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
      {!supported ? <p className="text-xs text-muted-foreground">الكاميرا غير مدعومة هنا — أدخل الرقم المطبوع تحت الباركود.</p> : null}
      {cameraError ? <p className="text-xs text-destructive">{cameraError}</p> : null}
    </div>
  );
}

function CameraView({ onCode, onClose, onError }: { onCode: (c: string) => void; onClose: () => void; onError: (m: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: number | null = null;
    let stopped = false;
    const Ctor = detectorCtor();
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (stopped || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const detector = new Ctor!({ formats: ["code_128", "code_39", "qr_code", "ean_13"] });
        const tick = async () => {
          if (stopped || !video.current) return;
          try {
            const found = await detector.detect(video.current);
            if (found[0]?.rawValue) return onCode(found[0].rawValue);
          } catch {
            // keep trying
          }
          timer = window.setTimeout(() => void tick(), 300);
        };
        void tick();
      } catch {
        onError("تعذّر فتح الكاميرا — اسمح بالوصول أو استخدم الإدخال اليدوي.");
      }
    })();
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-label="مسح الباركود">
      <video ref={video} className="flex-1 object-cover" playsInline muted />
      <div className="flex flex-col gap-2 bg-card p-4">
        <p className="text-center text-sm">وجّه الكاميرا نحو الباركود على الشحنة.</p>
        <button type="button" onClick={onClose} className={primaryAction}>
          <X className="size-5" aria-hidden /> إغلاق
        </button>
      </div>
    </div>
  );
}
