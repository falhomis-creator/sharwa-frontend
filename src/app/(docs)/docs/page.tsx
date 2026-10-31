import type { Metadata } from "next";
import { RootProvider } from "fumadocs-ui/provider/next";
import { Card, Cards } from "fumadocs-ui/components/card";
import { BookOpen, CodeXml, LifeBuoy, Shield } from "lucide-react";
import { DocumentDirection } from "@/components/docs/document-direction";
import { getDocsSettings, isSectionEnabled } from "@/features/docs/api/docs-settings";
import { AR_TRANSLATIONS } from "@/lib/docs/translations";

export const metadata: Metadata = {
  title: "توثيق شروة — Sharwa Docs",
  description: "أدلة التاجر ومركز المساعدة وتوثيق واجهة شروة البرمجية للمطورين.",
};

/**
 * /docs — portal chooser (spec 01 §2). Each card shows only when its section switch is on
 * (platform console → docs settings); the global switch is enforced by the /docs layout.
 */
export default async function DocsHome() {
  const settings = await getDocsSettings();
  const show = (section: string) => isSectionEnabled(settings, section);
  const none = !["merchant", "help", "developer", "console"].some(show);

  return (
    <>
      <DocumentDirection dir="rtl" lang="ar" />
      <RootProvider
        dir="rtl"
        theme={{ enabled: false }}
        search={{ options: { api: "/api/docs/search" } }}
        i18n={{ locale: "ar", translations: AR_TRANSLATIONS }}
      >
        <main className="bg-fd-background text-fd-foreground mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-16 sm:px-6">
          <header className="space-y-3">
            <p className="text-fd-primary text-sm font-semibold">توثيق شروة</p>
            <h1 className="text-3xl font-semibold sm:text-4xl">كيف نساعدك اليوم؟</h1>
            <p className="text-fd-muted-foreground max-w-2xl text-base">
              اختر الدليل الذي يناسبك. أدلة التاجر ومركز المساعدة بالعربية، وتوثيق المطورين بالإنجليزية.
            </p>
          </header>
          {none ? (
            <p className="text-fd-muted-foreground rounded-xl border border-dashed border-fd-border p-6 text-sm">
              لا توجد أدلة متاحة حالياً.
            </p>
          ) : (
            <Cards>
              {show("merchant") && (
                <Card href="/docs/merchant" icon={<BookOpen />} title="دليل التاجر">
                  لمالك المتجر والموظفين: الكتالوج والطلبات والشحن والمالية والتقارير.
                </Card>
              )}
              {show("help") && (
                <Card href="/docs/help" icon={<LifeBuoy />} title="مركز المساعدة">
                  للمشتري والمندوب وعميل شروة باي.
                </Card>
              )}
              {show("developer") && (
                <Card href="/docs/developer" icon={<CodeXml />} title="Developer portal">
                  <span dir="ltr" className="block">
                    Concepts, the full /api/v1 reference, webhooks and tools.
                  </span>
                </Card>
              )}
              {show("console") && (
                <Card href="/docs/console" icon={<Shield />} title="لوحة مالك المنصة">
                  لـ «مالك المنصة» و«مشرف تشغيلي».
                </Card>
              )}
            </Cards>
          )}
        </main>
      </RootProvider>
    </>
  );
}
