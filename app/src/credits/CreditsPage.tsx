import { useState, type ReactElement } from "react";
import { useQuery } from "wasp/client/operations";
import { getMyTransactions, getMyCreditBalance } from "wasp/client/operations";
import { Link } from "wasp/client/router";
import { routes } from "wasp/client/router";
import { Button } from "../client/components/ui/button";
import { Card, CardContent } from "../client/components/ui/card";

type TxType = "purchase" | "download" | "refund" | "bonus" | "admin_adjust";

const TYPE_CONFIG: Record<TxType | string, {
  label: string; bgColor: string; textColor: string; icon: ReactElement;
}> = {
  purchase: {
    label: "Top Up",
    bgColor: "bg-green-500/10",
    textColor: "text-green-600 dark:text-green-400",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  download: {
    label: "Download",
    bgColor: "bg-primary/10",
    textColor: "text-primary",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
  refund: {
    label: "Refund",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-600 dark:text-blue-400",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    ),
  },
  bonus: {
    label: "Bonus",
    bgColor: "bg-secondary/10",
    textColor: "text-secondary",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    ),
  },
  admin_adjust: {
    label: "Adjustment",
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
};

const TYPE_FILTERS = [
  { value: "", label: "All" },
  { value: "purchase", label: "Top Ups" },
  { value: "download", label: "Downloads" },
  { value: "refund", label: "Refunds" },
  { value: "bonus", label: "Bonuses" },
];

function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center gap-4 p-4 border-b border-border last:border-0">
      <div className="w-9 h-9 rounded-full bg-muted shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-muted rounded w-32" />
        <div className="h-3 bg-muted rounded w-48" />
      </div>
      <div className="text-right space-y-1.5">
        <div className="h-3.5 bg-muted rounded w-16 ml-auto" />
        <div className="h-3 bg-muted rounded w-20 ml-auto" />
      </div>
    </div>
  );
}

export default function CreditsPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");

  const { data, isLoading } = useQuery(getMyTransactions, { page });
  const { data: balanceData } = useQuery(getMyCreditBalance);

  const transactions: any[] = data?.transactions ?? [];
  const totalPages: number = data?.totalPages ?? 1;
  const total: number = data?.total ?? 0;

  const creditBalance = balanceData?.available ?? (balanceData as any)?.credits ?? 0;

  const filtered = typeFilter
    ? transactions.filter((t) => t.type === typeFilter)
    : transactions;

  // Summary stats from loaded transactions (all-time visible from API)
  const totalPurchased = transactions
    .filter((t) => t.type === "purchase" || t.type === "bonus")
    .reduce((s, t) => s + t.amount, 0);
  const totalSpent = transactions
    .filter((t) => t.type === "download")
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalRefunded = transactions
    .filter((t) => t.type === "refund")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pt-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Credit History</h1>
            <p className="text-muted-foreground text-sm mt-1.5">
              {total > 0 ? `${total} transactions` : "All your credit activity"}
            </p>
          </div>
          <Button variant="default" asChild className="rounded-xl font-semibold shadow-sm w-fit">
            <Link to={routes.PricingPageRoute.to}>
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Buy Credits
            </Link>
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            {
              label: "Current Balance",
              value: `${typeof creditBalance === "number" ? creditBalance.toFixed(1) : "—"} cr`,
              color: "text-primary",
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
            {
              label: "Purchased",
              value: `+${totalPurchased.toFixed(1)} cr`,
              color: "text-green-600 dark:text-green-400",
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              ),
            },
            {
              label: "Spent",
              value: `-${totalSpent.toFixed(1)} cr`,
              color: "text-primary",
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              ),
            },
            {
              label: "Refunded",
              value: `+${totalRefunded.toFixed(1)} cr`,
              color: "text-blue-600 dark:text-blue-400",
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              ),
            },
          ].map((stat) => (
            <Card key={stat.label} className="border-border shadow-sm" variant="bento">
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-2 text-muted-foreground">
                  {stat.icon}
                  <span className="text-xs font-semibold">{stat.label}</span>
                </div>
                <p className={`text-lg font-extrabold tabular-nums ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap mb-4">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`text-xs font-semibold px-3 h-8 rounded-lg border transition-colors ${
                typeFilter === f.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:border-primary/40"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Transaction list */}
        <Card className="border-border shadow-md overflow-hidden" variant="bento">
          <CardContent className="p-0">
            {isLoading ? (
              <div>
                {[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-muted-foreground text-sm font-medium">No transactions yet</p>
                {typeFilter && (
                  <button onClick={() => setTypeFilter("")} className="text-primary text-xs hover:underline mt-1">
                    Clear filter
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((tx: any) => {
                  const cfg = TYPE_CONFIG[tx.type as TxType] ?? TYPE_CONFIG.admin_adjust;
                  const isPositive = tx.amount > 0;
                  return (
                    <div key={tx.id} className="flex items-center gap-4 px-5 py-4 hover:bg-accent/20 transition-colors">
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-full ${cfg.bgColor} ${cfg.textColor} flex items-center justify-center shrink-0`}>
                        {cfg.icon}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">{cfg.label}</span>
                          {tx.reference && (
                            <span className="text-[10px] font-mono text-muted-foreground/60 truncate max-w-[120px] hidden sm:block">
                              #{tx.reference.slice(0, 8)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {tx.description || (
                            tx.type === "purchase" ? "Credit package purchase" :
                            tx.type === "download" ? "Asset download" :
                            tx.type === "refund" ? "Download failed — auto refund" :
                            tx.type === "bonus" ? "Welcome bonus credits" :
                            "Account adjustment"
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {new Date(tx.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>

                      {/* Amount + balance */}
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-extrabold tabular-nums ${
                          isPositive
                            ? "text-green-600 dark:text-green-400"
                            : "text-foreground"
                        }`}>
                          {isPositive ? "+" : ""}{tx.amount.toFixed(1)} cr
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                          Balance: {tx.balance.toFixed(1)} cr
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-accent/10">
                <p className="text-xs text-muted-foreground font-semibold">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                    variant="outline" size="sm" className="rounded-lg text-xs h-8 border-border">
                    Previous
                  </Button>
                  <Button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                    variant="outline" size="sm" className="rounded-lg text-xs h-8 border-border">
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick links */}
        <div className="mt-6 flex flex-wrap gap-3 justify-center text-xs text-muted-foreground">
          <Link to={routes.DashboardRoute.to} className="hover:text-foreground transition-colors">← Dashboard</Link>
          <span>·</span>
          <Link to={routes.DownloadHistoryRoute.to} className="hover:text-foreground transition-colors">Download History</Link>
          <span>·</span>
          <Link to={routes.PricingPageRoute.to} className="hover:text-foreground transition-colors">Buy Credits</Link>
        </div>

      </div>
    </div>
  );
}
