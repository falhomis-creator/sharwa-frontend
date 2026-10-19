"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { headerLabel } from "@/components/shared/data-table";
import { formatDateTime, formatRelative } from "@/lib/format";
import { Code, StatusText } from "@/features/platform-admin/components/bits";
import { DEACTIVATION_LABELS, PROVISIONING_LABELS, PROVISIONING_TONE, type StoreRow } from "@/features/platform-admin/schemas";

/** `provisioning_status` as text + dot; `provisioning` for > 30 min reads «متعثّر» (M20 §8). */
export function ProvisioningCell({ row }: { row: Pick<StoreRow, "provisioning_status" | "is_stalled"> }) {
  if (row.is_stalled) return <StatusText tone="warning" testId="status-stalled">متعثّر — قيد التجهيز منذ أكثر من 30 دقيقة</StatusText>;
  return (
    <StatusText tone={PROVISIONING_TONE[row.provisioning_status]} testId={`status-${row.provisioning_status}`}>
      {PROVISIONING_LABELS[row.provisioning_status]}
    </StatusText>
  );
}

export function ActiveCell({ row }: { row: Pick<StoreRow, "is_active" | "deactivation_status"> }) {
  if (row.deactivation_status) return <StatusText tone={row.deactivation_status === "closed" ? "muted" : "destructive"}>{DEACTIVATION_LABELS[row.deactivation_status]}</StatusText>;
  return row.is_active ? <StatusText tone="success">نشط</StatusText> : <StatusText tone="muted">غير نشط</StatusText>;
}

export function TimeCell({ iso, now }: { iso: string; now: Date }) {
  return (
    <time dateTime={iso} title={formatDateTime(iso)} className="whitespace-nowrap text-xs text-muted-foreground">
      {formatRelative(iso, now)}
    </time>
  );
}

/** The columns US-20.1 a2 and US-20.2 a1 share: name, schema, domain, phone, status, created. */
export function baseStoreColumns(now: Date): ColumnDef<StoreRow, unknown>[] {
  return [
    {
      id: "name",
      header: headerLabel("المتجر"),
      cell: ({ row }) => (
        <Link href={`/stores/${encodeURIComponent(row.original.schema_name)}`} className="whitespace-nowrap font-medium hover:underline" data-testid="store-link">
          {row.original.name}
        </Link>
      ),
    },
    { id: "schema_name", header: headerLabel("المخطط"), cell: ({ row }) => <Code>{row.original.schema_name}</Code> },
    { id: "domain", header: headerLabel("النطاق الأساسي"), cell: ({ row }) => <Code className="text-muted-foreground">{row.original.primary_domain}</Code> },
    { id: "phone", header: headerLabel("هاتف التاجر"), cell: ({ row }) => (row.original.merchant_phone ? <Code>{row.original.merchant_phone}</Code> : <span className="text-xs text-muted-foreground">—</span>) },
    { id: "provisioning", header: headerLabel("التجهيز"), cell: ({ row }) => <ProvisioningCell row={row.original} /> },
    { id: "created_on", meta: { className: "whitespace-nowrap" }, header: headerLabel("أُنشئ"), cell: ({ row }) => <TimeCell iso={row.original.created_on} now={now} /> },
  ];
}
