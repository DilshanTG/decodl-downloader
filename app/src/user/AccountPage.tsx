import { useState } from "react";
import { Link } from "wasp/client/router";
import { routes } from "wasp/client/router";
import { useQuery } from "wasp/client/operations";
import { getMyTransactions, getMyCreditBalance } from "wasp/client/operations";
import type { User } from "wasp/entities";
import { Separator } from "../client/components/ui/separator";
import { Button } from "../client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../client/components/ui/card";

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  purchase: "Purchase",
  download: "Download",
  bonus: "Bonus",
  refund: "Refund",
  admin: "Admin Adjustment",
};

const TRANSACTION_TYPE_COLORS: Record<string, string> = {
  purchase: "text-green-600 dark:text-green-400",
  download: "text-red-600 dark:text-red-400",
  bonus: "text-blue-600 dark:text-blue-400",
  refund: "text-green-600 dark:text-green-400",
  admin: "text-purple-600 dark:text-purple-400",
};

function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center gap-4 py-4 border-b border-border">
      <div className="h-4 bg-muted rounded w-28"></div>
      <div className="h-4 bg-muted rounded flex-1"></div>
      <div className="h-4 bg-muted rounded w-16"></div>
      <div className="h-4 bg-muted rounded w-14"></div>
    </div>
  );
}

export default function AccountPage({ user }: { user: User }) {
  const [txPage, setTxPage] = useState(1);

  const { data: balanceData, isLoading: balanceLoading } = useQuery(
    getMyCreditBalance,
    undefined,
    { refetchInterval: 15000 }
  );

  const { data: txData, isLoading: txLoading } = useQuery(
    getMyTransactions,
    { page: txPage }
  );

  const credits = balanceData?.credits ?? (user as any).credits ?? 0;
  const transactions = txData?.transactions ?? [];
  const totalPages = txData?.totalPages ?? 1;

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-extrabold tracking-tight mb-8 pt-6">Account Settings</h1>

        {/* Credit balance card */}
        <Card className="border-border shadow-md p-6 mb-6 bg-card" variant="bento">
          <CardContent className="p-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                Credit Balance
              </span>
              {balanceLoading ? (
                <div className="animate-pulse h-12 w-24 bg-muted rounded mt-2"></div>
              ) : (
                <div className="text-5xl font-black text-foreground mt-1 tabular-nums">
                  {typeof credits === "number" ? credits.toFixed(1) : "—"}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1.5 font-medium">credits available</p>
            </div>
            <Button size="default" variant="default" asChild className="rounded-xl font-bold shadow-sm self-start sm:self-auto">
              <Link to={routes.PricingPageRoute.to}>
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Buy More Credits
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Account info */}
        <Card className="border-border shadow-md overflow-hidden mb-6 bg-card" variant="bento">
          <CardHeader className="px-6 py-4">
            <CardTitle className="text-base font-bold">Account Information</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="p-0 divide-y divide-border">
            {!!user.email && (
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                  <dt className="text-sm text-muted-foreground font-semibold">Email address</dt>
                  <dd className="text-sm text-foreground font-bold sm:col-span-2">{user.email}</dd>
                </div>
              </div>
            )}
            {!!user.username && (
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                  <dt className="text-sm text-muted-foreground font-semibold">Username</dt>
                  <dd className="text-sm text-foreground font-bold sm:col-span-2">{user.username}</dd>
                </div>
              </div>
            )}
            {(user as any).lifetimeCreditsSpent !== undefined && (
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                  <dt className="text-sm text-muted-foreground font-semibold">Credits used (all time)</dt>
                  <dd className="text-sm text-foreground font-bold sm:col-span-2">
                    {typeof (user as any).lifetimeCreditsSpent === "number"
                      ? (user as any).lifetimeCreditsSpent.toFixed(1)
                      : "—"}
                  </dd>
                </div>
              </div>
            )}
            {(user as any).lifetimeSpentLKR !== undefined && (
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                  <dt className="text-sm text-muted-foreground font-semibold">Total spent (LKR)</dt>
                  <dd className="text-sm text-foreground font-bold sm:col-span-2">
                    Rs. {((user as any).lifetimeSpentLKR / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </dd>
                </div>
              </div>
            )}
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                <dt className="text-sm text-muted-foreground font-semibold">Welcome bonus</dt>
                <dd className="text-sm sm:col-span-2 font-bold">
                  {(user as any).freeCreditsClaimed ? (
                    <span className="inline-flex items-center gap-1.5 text-green-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Claimed
                    </span>
                  ) : (
                    <span className="text-amber-500 animate-pulse font-semibold">Not claimed — go to Dashboard to claim</span>
                  )}
                </dd>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction history */}
        <Card className="border-border shadow-md overflow-hidden bg-card" variant="bento">
          <CardHeader className="px-6 py-4 border-b border-border">
            <CardTitle className="text-base font-bold">Transaction History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile list */}
            <div className="block sm:hidden divide-y divide-border">
              {txLoading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse p-4">
                    <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-24"></div>
                  </div>
                ))
              ) : transactions.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm font-semibold">
                  No transactions yet
                </div>
              ) : (
                transactions.map((tx: any) => (
                  <div key={tx.id} className="px-4 py-3.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {TRANSACTION_TYPE_LABELS[tx.type] || tx.type}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                        {new Date(tx.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-black tabular-nums ${TRANSACTION_TYPE_COLORS[tx.type] || "text-foreground"}`}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount}
                      </p>
                      <p className="text-xs text-muted-foreground font-semibold">Bal: {tx.balance}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/30">
                    <th className="text-left py-4 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Date</th>
                    <th className="text-left py-4 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Description</th>
                    <th className="text-left py-4 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Type</th>
                    <th className="text-right py-4 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Amount</th>
                    <th className="text-right py-4 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {txLoading ? (
                    [1, 2, 3, 4, 5].map((i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-4 px-5"><div className="h-4 bg-muted rounded w-24"></div></td>
                        <td className="py-4 px-5"><div className="h-4 bg-muted rounded w-48"></div></td>
                        <td className="py-4 px-5"><div className="h-4 bg-muted rounded w-20"></div></td>
                        <td className="py-4 px-5"><div className="h-4 bg-muted rounded w-12 ml-auto"></div></td>
                        <td className="py-4 px-5"><div className="h-4 bg-muted rounded w-12 ml-auto"></div></td>
                      </tr>
                    ))
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-muted-foreground text-sm font-semibold">
                        No transactions yet
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-accent/20 transition-colors">
                        <td className="py-4 px-5 text-muted-foreground text-xs whitespace-nowrap">
                          <span className="font-bold text-foreground">
                            {new Date(tx.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                          <br />
                          <span className="text-muted-foreground opacity-80">
                            {new Date(tx.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-foreground font-semibold max-w-xs">
                          <span className="truncate block">{tx.description || "—"}</span>
                        </td>
                        <td className="py-4 px-5">
                          <span className={`text-xs font-extrabold ${TRANSACTION_TYPE_COLORS[tx.type] || "text-foreground"}`}>
                            {TRANSACTION_TYPE_LABELS[tx.type] || tx.type}
                          </span>
                        </td>
                        <td className={`py-4 px-5 text-right font-black tabular-nums ${TRANSACTION_TYPE_COLORS[tx.type] || "text-foreground"}`}>
                          {tx.amount > 0 ? "+" : ""}{tx.amount}
                        </td>
                        <td className="py-4 px-5 text-right text-muted-foreground font-extrabold tabular-nums">
                          {typeof tx.balance === "number" ? tx.balance.toFixed(1) : tx.balance}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-accent/10">
                <p className="text-xs text-muted-foreground font-semibold">Page {txPage} of {totalPages}</p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                    disabled={txPage <= 1}
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-xs font-semibold h-8 border-border"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setTxPage((p) => Math.min(totalPages, p + 1))}
                    disabled={txPage >= totalPages}
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-xs font-semibold h-8 border-border"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
