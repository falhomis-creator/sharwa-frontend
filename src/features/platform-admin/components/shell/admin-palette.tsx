"use client";

import { useDeferredValue, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";
import { Mono } from "@/components/shared/mono";
import { useClients } from "@/features/platform-admin/api/hooks";
import { flatAdminNav } from "@/features/platform-admin/components/shell/admin-nav";

/**
 * ⌘K (M20 FR-20.08): stores by name / `schema_name` / phone / domain — the server
 * searches (`GET /platform/clients/?q`) — plus the console's own pages. Choosing a store
 * opens `/stores/<schema>` directly.
 */
export function AdminPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const deferred = useDeferredValue(q.trim());
  const clients = useClients(deferred, open && deferred.length >= 2);
  const pages = flatAdminNav();

  const go = (href: string) => {
    onOpenChange(false);
    setQ("");
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="top-[15%] translate-y-0 overflow-hidden p-0 sm:max-w-xl" data-testid="admin-palette">
        <DialogTitle className="sr-only">بحث لوحة المنصة</DialogTitle>
        <Command shouldFilter={false} loop>
          <CommandInput value={q} onValueChange={setQ} placeholder="متجر، مخطط، هاتف، نطاق، أو صفحة…" />
          <CommandList className="max-h-[60vh]">
            <CommandEmpty>لا نتائج.</CommandEmpty>
            {deferred.length >= 2 && clients.data?.length ? (
              <CommandGroup heading="المتاجر">
                {clients.data.map((c) => (
                  <CommandItem key={c.schema_name} value={`store:${c.schema_name}`} onSelect={() => go(`/stores/${encodeURIComponent(c.schema_name)}`)} data-testid="palette-store">
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <Mono className="text-xs text-muted-foreground">{c.schema_name}</Mono>
                    {c.merchant_phone ? <Mono className="hidden text-xs text-muted-foreground md:inline">{c.merchant_phone}</Mono> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            <CommandGroup heading="الصفحات">
              {pages
                .filter((p) => !deferred || [p.title, ...p.keywords].some((k) => k.toLowerCase().includes(deferred.toLowerCase())))
                .map((p) => (
                  <CommandItem key={p.key} value={`page:${p.key}`} onSelect={() => go(p.path)}>
                    <span className="min-w-0 flex-1 truncate">{p.title}</span>
                    <span className="text-xs text-muted-foreground">{p.group}</span>
                    {p.shortcut ? <CommandShortcut>{p.shortcut}</CommandShortcut> : null}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
