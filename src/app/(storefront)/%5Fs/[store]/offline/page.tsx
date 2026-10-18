import type { Metadata } from "next";
import { OfflineRetry } from "@/features/pwa/components/offline-retry";

/** The page the service worker serves when a navigation fails offline (M44 §6). */
export const metadata: Metadata = { title: "لا اتصال", robots: { index: false } };

/** Blocks on the store guard in the layout (no static shell before the 404/403/503 status). */
export const instant = false;

export default function OfflinePage() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-6 py-20" data-testid="offline-page">
      <h1 className="text-2xl font-bold tracking-tight">لا يوجد اتصال بالإنترنت</h1>
      <p className="text-sm leading-7 text-muted-foreground">
        يبدو أنك غير متصل الآن. سلتك محفوظة في المتجر، وستظهر كما تركتها عند عودة الاتصال.
      </p>
      <OfflineRetry />
    </main>
  );
}
