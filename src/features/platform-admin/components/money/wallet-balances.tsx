import { Money } from "@/components/shared/money";
import { cn } from "@/lib/utils";

/** Balances per currency, exactly as the server formatted them (FR-20.04) — or «لا محفظة». */
export function WalletBalances({ wallet, className }: { wallet: Array<{ currency: string; display_balance: string }> | null; className?: string }) {
  if (!wallet) return <span className={cn("text-xs text-muted-foreground", className)} data-testid="no-wallet">لا محفظة</span>;
  if (!wallet.length) return <span className={cn("text-xs text-muted-foreground", className)}>بلا رصيد</span>;
  return (
    <span className={cn("flex flex-col items-end gap-0.5", className)} data-testid="wallet-balances">
      {wallet.map((b) => (
        <Money key={b.currency} value={b.display_balance} className="text-sm" />
      ))}
    </span>
  );
}
