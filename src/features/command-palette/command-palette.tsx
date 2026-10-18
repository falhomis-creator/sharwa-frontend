"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { ArrowRight, Clock, CornerDownLeft, ExternalLink, FileText, LogOut, Moon, Package, Plus, Printer, Link2, ShoppingCart, Store, User } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Money } from "@/components/shared/money";
import { Mono } from "@/components/shared/mono";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { prettyPhone } from "@/lib/format";
import { storeKey } from "@/lib/query-keys";
import { useAccess, useSession } from "@/features/dashboard-shell/components/session-context";
import { useStore, useStoreOrigin } from "@/features/dashboard-shell/components/store-context";
import { accountStoresSchema } from "@/features/dashboard-shell/schemas";
import { ORDER_STATUS_LABELS, ORDER_STATUSES, orderDetailSchema, type OrderStatus } from "@/features/orders/schemas";
import { orderKeys, ordersApi, useApplyOrder, useOrderStatuses } from "@/features/orders/api";
import { ProductThumb } from "@/features/products/components/product-thumb";
import { buildPageIndex, detectQuery, groupEntries, rankPages, type PageEntry } from "@/features/command-palette/palette-index";
import { clearRecents, parseRecents, pushRecent, recentsKey, useRecentsRaw, type RecentEntry } from "@/features/command-palette/recents";
import { usePaletteSearch } from "@/features/command-palette/use-palette-search";
import { matchScore } from "@/lib/i18n/normalize";
import { usePaletteStore } from "@/stores/palette";

/**
 * The command palette (M48, T079): cmdk inside a 640px Dialog (a top drawer below 768px).
 * Empty → «الأخيرة» + quick actions + the sidebar groups. Typing → local destinations ranked
 * by the shared Arabic normalizer, plus server results grouped (orders · customers ·
 * products) in the order the query's shape suggests (FR-48.06). `>` → actions only.
 * `Tab` on an order (or on an order page) → contextual commands; `Backspace` on an empty
 * query goes back; `Ctrl+1..9` runs the n-th result.
 */
const ORDER_PAGE = /^\/dashboard\/orders\/(\d+)(?:\/|$)/;

function useIsMobile(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(max-width: 767px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(max-width: 767px)").matches,
    () => false,
  );
}

interface Action {
  key: string;
  title: string;
  icon: typeof Plus;
  keywords: string[];
  shortcut?: string;
  run: () => void;
}

export function CommandPalette() {
  const { open, query, page, setOpen, setQuery, setPage, back } = usePaletteStore();
  const isMobile = useIsMobile();

  // Ctrl+K / ⌘K by physical key (an Arabic layout types «ن» on K — M48 §8).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.code !== "KeyK" || e.altKey) return;
      if (e.target instanceof HTMLElement && e.target.closest("[data-no-palette]")) return;
      e.preventDefault();
      usePaletteStore.getState().toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const body = open ? <PaletteBody query={query} setQuery={setQuery} page={page} setPage={setPage} back={back} close={() => setOpen(false)} isMobile={isMobile} /> : null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen} swipeDirection="up">
        <DrawerContent className="max-h-[85dvh]" data-testid="command-palette">
          <DrawerTitle className="sr-only">بحث أو أمر</DrawerTitle>
          {body}
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showCloseButton={false} className="top-[12vh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-[640px] motion-reduce:transition-none" data-testid="command-palette">
        <DialogTitle className="sr-only">بحث أو أمر</DialogTitle>
        <DialogDescription className="sr-only">ابحث عن صفحة أو طلب أو منتج أو عميل، أو اكتب «{">"}» للإجراءات.</DialogDescription>
        {body}
      </DialogContent>
    </Dialog>
  );
}

function PaletteBody({
  query,
  setQuery,
  page,
  setPage,
  back,
  close,
  isMobile,
}: {
  query: string;
  setQuery: (q: string) => void;
  page: ReturnType<typeof usePaletteStore.getState>["page"];
  setPage: ReturnType<typeof usePaletteStore.getState>["setPage"];
  back: () => void;
  close: () => void;
  isMobile: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const store = useStore();
  const origin = useStoreOrigin();
  const session = useSession();
  const { canFeature, canPermission } = useAccess();
  const { resolvedTheme, setTheme } = useTheme();
  const member = session.kind === "merchant" ? "owner" : (session.staff?.full_name ?? "staff");
  const rKey = recentsKey(store, member);
  const recentsRaw = useRecentsRaw(rKey);
  const [selected, setSelected] = useState("");

  const index = useMemo(() => buildPageIndex(canFeature, canPermission), [canFeature, canPermission]);
  const allowedPaths = useMemo(() => new Set(index.map((e) => e.path)), [index]);
  // A recent destination that became blocked is dropped silently (M48 §8).
  const recents = useMemo(
    () => parseRecents(recentsRaw).filter((r) => !r.key.startsWith("page:") || allowedPaths.has(r.path)).slice(0, 5),
    [recentsRaw, allowedPaths],
  );
  const kind = detectQuery(query);
  const search = usePaletteSearch(query, page.kind === "root" && kind !== "actions" && kind !== "empty");
  const currentOrder = Number(ORDER_PAGE.exec(pathname)?.[1] ?? 0) || null;

  function go(path: string, recent?: RecentEntry) {
    if (recent) pushRecent(rKey, recent);
    close();
    router.push(path);
  }

  async function logout() {
    close();
    clearRecents(store);
    try {
      await apiFetch("/api/bff/auth/logout", z.undefined(), { method: "POST" });
    } catch {
      // drop the local view anyway
    }
    router.replace("/dashboard/login");
    router.refresh();
  }

  const actions: Action[] = [
    { key: "new-product", title: "منتج جديد", icon: Plus, keywords: ["إضافة منتج", "new product"], shortcut: "N", run: () => go("/dashboard/products/new") },
    ...(canPermission("orders.update_status")
      ? [{ key: "new-order", title: "طلب جديد", icon: Plus, keywords: ["طلب يدوي", "هاتفي", "new order"], run: () => go("/dashboard/orders/new") }]
      : []),
    { key: "new-category", title: "إضافة تصنيف", icon: Plus, keywords: ["تصنيف", "category"], run: () => go("/dashboard/products/categories") },
    ...(canFeature("coupon") && canPermission("discounts.manage")
      ? [{ key: "new-coupon", title: "كوبون جديد", icon: Plus, keywords: ["خصم", "coupon"], run: () => go("/dashboard/marketing/offers") }]
      : []),
    {
      key: "theme",
      title: resolvedTheme === "dark" ? "الوضع الفاتح" : "الوضع الداكن",
      icon: Moon,
      keywords: ["ثيم", "داكن", "فاتح", "theme", "dark"],
      run: () => {
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
        close();
      },
    },
    {
      key: "storefront",
      title: "الانتقال إلى المتجر",
      icon: ExternalLink,
      keywords: ["المتجر", "storefront", "عرض المتجر"],
      run: () => {
        window.open(origin, "_blank", "noopener");
        close();
      },
    },
    ...(session.kind === "merchant"
      ? [{ key: "stores", title: "تبديل المتجر", icon: Store, keywords: ["متاجري", "switch store"], run: () => setPage({ kind: "stores" }) }]
      : []),
    { key: "logout", title: "تسجيل الخروج", icon: LogOut, keywords: ["خروج", "logout"], run: () => void logout() },
  ];

  const actionQuery = kind === "actions" ? query.trim().slice(1) : query;
  const visibleActions = !actionQuery.trim()
    ? actions
    : actions.filter((a) => matchScore(actionQuery, [a.title, ...a.keywords]) > 0);
  const pages = kind === "empty" || kind === "actions" ? [] : rankPages(index, query);

  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === "Backspace" && !query && page.kind !== "root") {
      e.preventDefault();
      back();
      return;
    }
    if (e.key === "Tab" && page.kind === "root") {
      const m = /^order:(\d+)$/.exec(selected);
      const id = m ? Number(m[1]) : currentOrder;
      if (id) {
        e.preventDefault();
        setPage({ kind: "order", id, label: `#${id}` });
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && /^Digit[1-9]$/.test(e.code)) {
      e.preventDefault();
      const n = Number(e.code.slice(5));
      const items = (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>("[cmdk-item]:not([data-disabled=true])");
      items[n - 1]?.click();
    }
  }

  const s = search.data;
  const orders = s?.orders ?? [];
  const products = s?.products ?? [];
  const customers = s?.customers ?? [];
  const skeleton = search.active && search.pending && !s;

  const ordersGroup = canPermission("orders.view") && search.active ? (
    <CommandGroup heading="الطلبات" key="orders">
      {skeleton ? <RowSkeleton /> : null}
      {orders.map((o) => (
        <CommandItem
          key={o.id}
          value={`order:${o.id}`}
          onSelect={() => go(`/dashboard/orders/${o.id}`, { key: `order:${o.id}`, title: `الطلب #${o.id}`, path: `/dashboard/orders/${o.id}`, hint: o.customer_name })}
          data-testid="palette-order"
        >
          <ShoppingCart className="text-muted-foreground" aria-hidden />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-baseline gap-2">
              <Mono>#{o.id}</Mono>
              <span className="truncate">{o.customer_name}</span>
            </span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              {(ORDER_STATUSES as readonly string[]).includes(o.status) ? ORDER_STATUS_LABELS[o.status as OrderStatus] : o.status}
              {o.fulfillment_status ? (
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: o.fulfillment_status.color }} />
                  {o.fulfillment_status.name}
                </span>
              ) : null}
            </span>
          </span>
          <Money value={o.display_total} className="text-xs" />
        </CommandItem>
      ))}
    </CommandGroup>
  ) : null;

  const customersGroup = canPermission("customers.view") && search.active && (customers.length > 0 || skeleton) ? (
    <CommandGroup heading="العملاء" key="customers">
      {skeleton ? <RowSkeleton /> : null}
      {customers.map((c) => (
        <CommandItem
          key={c.phone}
          value={`customer:${c.phone}`}
          onSelect={() => go(`/dashboard/orders?q=${c.phone}`, { key: `customer:${c.phone}`, title: c.name, path: `/dashboard/orders?q=${c.phone}`, hint: prettyPhone(c.phone) })}
          data-testid="palette-customer"
        >
          <User className="text-muted-foreground" aria-hidden />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate">{c.name}</span>
            <Mono className="text-xs text-muted-foreground">{prettyPhone(c.phone)}</Mono>
          </span>
          <span className="text-xs text-muted-foreground">
            <Mono>{c.orders_count}</Mono> طلبات
          </span>
        </CommandItem>
      ))}
    </CommandGroup>
  ) : null;

  const productsGroup = search.active && (products.length > 0 || skeleton) ? (
    <CommandGroup heading="المنتجات" key="products">
      {skeleton ? <RowSkeleton /> : null}
      {products.map((p) => (
        <CommandItem
          key={p.id}
          value={`product:${p.id}`}
          onSelect={() => go(`/dashboard/products/${p.id}`, { key: `product:${p.id}`, title: p.name, path: `/dashboard/products/${p.id}`, hint: p.sku })}
          data-testid="palette-product"
        >
          <ProductThumb src={p.image} name={p.name} size={isMobile ? 40 : 32} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate">{p.name}</span>
            <Mono className="text-xs text-muted-foreground">{p.sku}</Mono>
          </span>
          <span className="flex flex-col items-end text-xs">
            <Money value={p.display_price} />
            <span className="text-muted-foreground">
              مخزون <Mono>{Number(p.stock)}</Mono>
            </span>
          </span>
        </CommandItem>
      ))}
    </CommandGroup>
  ) : null;

  const pagesGroup =
    pages.length > 0 ? (
      <CommandGroup heading="الصفحات" key="pages">
        {pages.map((e) => (
          <PageItem key={e.key} entry={e} onSelect={() => go(e.path, { key: `page:${e.key}`, title: e.title, path: e.path, hint: e.group })} />
        ))}
      </CommandGroup>
    ) : null;

  const actionsGroup =
    visibleActions.length > 0 ? (
      <CommandGroup heading="إجراءات سريعة" key="actions">
        {visibleActions.map((a) => (
          <CommandItem key={a.key} value={`action:${a.key}`} onSelect={a.run} data-testid={`palette-action-${a.key}`}>
            <a.icon className="text-muted-foreground" aria-hidden />
            <span className="flex-1">{a.title}</span>
            {a.shortcut && !isMobile ? <CommandShortcut>{a.shortcut}</CommandShortcut> : null}
          </CommandItem>
        ))}
      </CommandGroup>
    ) : null;

  const contextGroup =
    currentOrder && page.kind === "root" && kind === "empty" ? (
      <CommandGroup heading={`هذا الطلب #${currentOrder}`} key="context">
        <CommandItem value="context:order" onSelect={() => setPage({ kind: "order", id: currentOrder, label: `#${currentOrder}` })}>
          <ShoppingCart className="text-muted-foreground" aria-hidden />
          <span className="flex-1">أوامر الطلب: تغيير الحالة، طباعة، رابط التتبع</span>
          {!isMobile ? <CommandShortcut>Tab</CommandShortcut> : null}
        </CommandItem>
      </CommandGroup>
    ) : null;

  let groups: ReactNode[];
  if (kind === "empty") {
    groups = [
      contextGroup,
      recents.length > 0 ? (
        <CommandGroup heading="الأخيرة" key="recent">
          {recents.map((r) => (
            <CommandItem key={r.key} value={`recent:${r.key}`} onSelect={() => go(r.path, r)}>
              <Clock className="text-muted-foreground" aria-hidden />
              <span className="flex-1 truncate">{r.title}</span>
              {r.hint ? <span className="truncate text-xs text-muted-foreground">{r.hint}</span> : null}
            </CommandItem>
          ))}
        </CommandGroup>
      ) : null,
      actionsGroup,
      <CommandGroup heading="الأقسام" key="groups">
        {groupEntries(index).map((e) => (
          <PageItem key={e.key} entry={e} onSelect={() => go(e.path, { key: `page:${e.key}`, title: e.title, path: e.path })} />
        ))}
      </CommandGroup>,
    ];
  } else if (kind === "actions") {
    groups = [actionsGroup];
  } else {
    const ordered =
      kind === "order"
        ? [ordersGroup, pagesGroup, customersGroup, productsGroup, actionsGroup]
        : kind === "phone"
          ? [customersGroup, ordersGroup, pagesGroup, productsGroup]
          : kind === "sku"
            ? [productsGroup, pagesGroup, ordersGroup]
            : [pagesGroup, productsGroup, ordersGroup, customersGroup, query.length >= 2 ? actionsGroup : null];
    groups = ordered;
  }

  const serverEmpty = search.active && !search.pending && s && orders.length + products.length + customers.length === 0;

  return (
    <Command shouldFilter={false} loop value={selected} onValueChange={setSelected} onKeyDown={onKeyDown} className="rounded-[inherit]" label="لوحة الأوامر">
      {page.kind !== "root" ? (
        <div className="flex items-center gap-2 border-b border-border px-4 pt-3 text-xs text-muted-foreground">
          <button type="button" onClick={back} className="inline-flex h-8 items-center gap-1 rounded-md px-1 hover:text-foreground" aria-label="رجوع">
            <ArrowRight className="size-3.5 ltr:rotate-180" aria-hidden />
          </button>
          {page.kind === "stores" ? "متاجري" : `الطلب ${page.label}`}
        </div>
      ) : null}
      <CommandInput
        autoFocus
        value={query}
        onValueChange={setQuery}
        placeholder={page.kind === "root" ? "ابحث عن صفحة أو طلب أو منتج، أو اكتب > للإجراءات" : "ابحث في الأوامر…"}
        className="outline-none focus-visible:outline-none"
        data-testid="palette-input"
      />
      {search.isError && search.active ? (
        <p role="status" className="border-b border-border px-4 py-1.5 text-xs text-muted-foreground">
          {isApiError(search.error) && search.error.status === 429 ? "حاول بعد قليل — النتائج المحلية فقط" : "تعذّر البحث في الخادم — النتائج المحلية فقط"}
        </p>
      ) : null}
      <CommandList className={isMobile ? "max-h-[70dvh]" : undefined}>
        {page.kind === "root" ? (
          <>
            {groups}
            {serverEmpty ? (
              <p className="px-4 py-3 text-sm text-muted-foreground" data-testid="palette-no-server">
                لا طلبات أو منتجات أو عملاء تطابق «{query.trim()}»
              </p>
            ) : null}
            <CommandEmpty>لا نتائج لـ «{query.trim()}»</CommandEmpty>
          </>
        ) : page.kind === "stores" ? (
          <StoresPage close={close} />
        ) : (
          <OrderCommands orderId={page.id} close={close} reopen={() => setPage(page)} query={query} />
        )}
      </CommandList>
      {!isMobile ? (
        <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[11px] text-muted-foreground" aria-hidden>
          <span>
            <Mono>↑↓</Mono> تنقّل
          </span>
          <span className="inline-flex items-center gap-1">
            <CornerDownLeft className="size-3" /> فتح
          </span>
          <span>
            <Mono>Tab</Mono> أوامر الطلب
          </span>
          <span>
            <Mono>Ctrl+1..9</Mono> قفز
          </span>
          <span className="ms-auto">
            <Mono>Esc</Mono> إغلاق
          </span>
        </div>
      ) : null}
    </Command>
  );
}

function PageItem({ entry, onSelect }: { entry: PageEntry; onSelect: () => void }) {
  return (
    <CommandItem value={`page:${entry.key}`} onSelect={onSelect} disabled={entry.comingSoon} data-testid="palette-page">
      <FileText className="text-muted-foreground" aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{entry.title}</span>
        {entry.group !== entry.title ? <span className="truncate text-xs text-muted-foreground">{entry.group}</span> : null}
      </span>
      {entry.comingSoon ? <span className="text-xs text-muted-foreground">قريباً</span> : null}
      {entry.shortcut ? <CommandShortcut className="hidden md:inline">{entry.shortcut}</CommandShortcut> : null}
    </CommandItem>
  );
}

function RowSkeleton() {
  return (
    <div className="flex flex-col gap-1.5 px-3 py-1.5" aria-hidden data-testid="palette-skeleton">
      <Skeleton className="h-8" />
      <Skeleton className="h-8" />
    </div>
  );
}

function StoresPage({ close }: { close: () => void }) {
  const store = useStore();
  const { data, isLoading } = useQuery({
    queryKey: storeKey(store, "account", "stores"),
    queryFn: () => apiFetch("/api/bff/account/stores", accountStoresSchema),
    staleTime: 5 * 60_000,
    retry: false,
  });
  if (isLoading) return <RowSkeleton />;
  const stores = data ?? [];
  if (stores.length < 2) return <p className="px-4 py-6 text-sm text-muted-foreground">لديك متجر واحد فقط.</p>;
  return (
    <CommandGroup heading="متاجري">
      {stores.map((s) => (
        <CommandItem
          key={s.host}
          value={`store:${s.host}`}
          disabled={s.provisioning_status !== "ready"}
          onSelect={() => {
            close();
            // Another store is another origin (its own subdomain) — a full navigation, same tab.
            if (!s.is_current) window.open(`${window.location.protocol}//${s.host}${window.location.port ? `:${window.location.port}` : ""}/dashboard`, "_self");
          }}
        >
          <Store className="text-muted-foreground" aria-hidden />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate">{s.name}</span>
            <Mono className="truncate text-xs text-muted-foreground">{s.host}</Mono>
          </span>
          {s.is_current ? <span className="text-xs text-muted-foreground">الحالي</span> : null}
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

/** Contextual commands for one order (US-48.3.2/3/4) — M06's own versioned contract. */
function OrderCommands({ orderId, close, reopen, query }: { orderId: number; close: () => void; reopen: () => void; query: string }) {
  const { canPermission } = useAccess();
  const canEdit = canPermission("orders.update_status");
  const statuses = useOrderStatuses().data ?? [];
  const origin = useStoreOrigin();
  const apply = useApplyOrder();
  const store = useStore();
  const router = useRouter();
  const order = useQuery({
    queryKey: orderKeys(store).detail(orderId),
    queryFn: ({ signal }) => apiFetch(`/api/bff/orders/${orderId}`, orderDetailSchema, { signal }),
  });

  async function change(statusId: number, name: string, version?: number) {
    close();
    try {
      const current = version ?? (await apiFetch(`/api/bff/orders/${orderId}`, orderDetailSchema)).version;
      apply(await ordersApi.setFulfillment(orderId, statusId, current));
      toast.success(`الطلب #${orderId}: «${name}»`);
    } catch (err) {
      if (isApiError(err) && err.status === 409) {
        toast.error("حُدِّث الطلب من مستخدم آخر", {
          action: { label: "تحديث ثم إعادة", onClick: () => void change(statusId, name) },
        });
        return;
      }
      toast.error(isApiError(err) ? err.userMessage : "تعذّر تغيير الحالة.", {
        action: {
          label: "إعادة",
          onClick: () => {
            reopen();
            usePaletteStore.getState().setOpen(true);
          },
        },
      });
    }
  }

  const o = order.data;
  const blocked = !canEdit ? "ليست لديك صلاحية تغيير حالة الطلب." : (o?.locked_reason ?? (o?.status === "refunded" ? "طلب مسترد." : null));
  const visible = statuses.filter((s) => !query.trim() || matchScore(query, [s.name, "تغيير حالة التنفيذ"]) > 0);
  const tracking = o ? `${origin}${o.tracking_url ?? ""}` : "";

  return (
    <>
      <CommandGroup heading={`تغيير حالة التنفيذ${o?.fulfillment_status ? ` — الحالية «${o.fulfillment_status.name}»` : ""}`}>
        {order.isLoading ? <RowSkeleton /> : null}
        {visible.map((s) => (
          <CommandItem
            key={s.id}
            value={`status:${s.id}`}
            disabled={Boolean(blocked) || o?.fulfillment_status?.id === s.id}
            onSelect={() => void change(s.id, s.name, o?.version)}
            data-testid="palette-status"
          >
            <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="flex-1">{s.name}</span>
            {blocked ? <span className="text-xs text-muted-foreground">{blocked}</span> : null}
          </CommandItem>
        ))}
      </CommandGroup>
      <CommandGroup heading="الطلب">
        <CommandItem
          value="print"
          onSelect={() => {
            close();
            window.open(`/dashboard/orders/${orderId}/print`, "_blank", "noopener");
          }}
        >
          <Printer className="text-muted-foreground" aria-hidden />
          <span className="flex-1">طباعة البوليصة</span>
          <CommandShortcut className="hidden md:inline">P</CommandShortcut>
        </CommandItem>
        <CommandItem
          value="tracking"
          disabled={!o}
          onSelect={async () => {
            close();
            try {
              await navigator.clipboard.writeText(tracking);
              toast.success("نُسخ رابط التتبع");
            } catch {
              toast.error("تعذّر النسخ");
            }
          }}
        >
          <Link2 className="text-muted-foreground" aria-hidden />
          <span className="flex-1">نسخ رابط التتبع</span>
        </CommandItem>
        <CommandItem
          value="open"
          onSelect={() => {
            close();
            router.push(`/dashboard/orders/${orderId}`);
          }}
        >
          <Package className="text-muted-foreground" aria-hidden />
          <span className="flex-1">فتح الطلب</span>
        </CommandItem>
      </CommandGroup>
    </>
  );
}
