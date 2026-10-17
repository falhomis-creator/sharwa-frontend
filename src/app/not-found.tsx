import Link from "next/link";

/** Platform-level 404 (also what the proxy renders for blocked internal paths). zinc only, no illustration. */
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <p className="font-mono text-sm text-muted-foreground" dir="ltr">
        404
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">لم نجد هذه الصفحة</h1>
      <p className="text-muted-foreground">تحقق من الرابط، أو ابدأ من الصفحة الرئيسية.</p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted"
        >
          الصفحة الرئيسية
        </Link>
      </div>
    </main>
  );
}
