import { useState } from "react";
import { useQuery, adminGetAllCreditTransactions, adminGetOverviewStats, adminAdjustUserCredits, getPaginatedUsers } from "wasp/client/operations";
import { type AuthUser } from "wasp/auth";
import DefaultLayout from "../../layout/DefaultLayout";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../../client/components/ui/select";
import { useToast } from "../../../client/hooks/use-toast";

const TYPE_COLORS: Record<string, string> = {
  purchase: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  download: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  refund: "bg-purple-500/15 text-purple-500",
  bonus: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  admin_adjust: "bg-pink-500/15 text-pink-500",
};

const TYPE_LABELS: Record<string, string> = {
  purchase: "Purchase",
  download: "Download",
  refund: "Refund",
  bonus: "Bonus",
  admin_adjust: "Admin Adjust",
};

function TopUpPanel({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [matchedUser, setMatchedUser] = useState<any | null>(null);
  const [searching, setSearching] = useState(false);

  const { data: usersData } = useQuery(getPaginatedUsers, {
    skipPages: 0,
    filter: { emailContains: email.trim().length > 2 ? email.trim() : undefined },
  }, { enabled: email.trim().length > 2 });

  const handleSelectUser = (u: any) => {
    setMatchedUser(u);
    setEmail(u.email ?? "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedUser) { toast({ title: "Select a user first", variant: "destructive" }); return; }
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed === 0) { toast({ title: "Invalid amount", variant: "destructive" }); return; }
    if (!reason.trim()) { toast({ title: "Reason required", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const result = await adminAdjustUserCredits({ userId: matchedUser.id, amount: parsed, reason: reason.trim() });
      toast({ title: "Credits adjusted", description: `${matchedUser.email} — new balance: ${result.newBalance.toFixed(2)} cr` });
      setEmail(""); setAmount(""); setReason(""); setMatchedUser(null);
      onDone();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const suggestions = (usersData?.users ?? []).filter((u: any) => !matchedUser || u.id !== matchedUser.id);

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
      <h2 className="text-sm font-extrabold text-foreground uppercase tracking-widest mb-5">Manual Credit Adjustment</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">User Email</Label>
          <Input
            placeholder="Search user by email..."
            value={email}
            onChange={e => { setEmail(e.target.value); setMatchedUser(null); }}
            className="rounded-xl"
          />
          {suggestions.length > 0 && !matchedUser && email.length > 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-10 overflow-hidden">
              {suggestions.slice(0, 5).map((u: any) => (
                <button
                  key={u.id}
                  type="button"
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent/50 transition-colors"
                  onClick={() => handleSelectUser(u)}
                >
                  <span className="font-bold text-foreground">{u.email}</span>
                  <span className="text-xs text-muted-foreground ml-2">{u.credits.toFixed(2)} cr</span>
                </button>
              ))}
            </div>
          )}
          {matchedUser && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-500">✓ Selected:</span>
              <span className="text-xs text-foreground">{matchedUser.email}</span>
              <span className="text-xs text-muted-foreground">· {matchedUser.credits.toFixed(2)} cr</span>
              <button type="button" className="text-xs text-muted-foreground ml-1 hover:text-foreground" onClick={() => setMatchedUser(null)}>×</button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Amount (negative to deduct)</Label>
            <Input type="number" step="0.1" placeholder="e.g. 10 or -5" value={amount} onChange={e => setAmount(e.target.value)} className="rounded-xl" />
          </div>
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Reason</Label>
            <Input placeholder="e.g. Support refund" value={reason} onChange={e => setReason(e.target.value)} className="rounded-xl" />
          </div>
        </div>

        <Button type="submit" disabled={loading || !matchedUser} className="w-full rounded-xl font-bold">
          {loading ? "Applying..." : "Apply Adjustment"}
        </Button>
      </form>
    </div>
  );
}

export default function AdminCreditsPage({ user }: { user: AuthUser }) {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, isLoading, refetch } = useQuery(
    adminGetAllCreditTransactions,
    {
      page,
      type: typeFilter || undefined,
      userEmail: emailFilter || undefined,
    },
    { refetchInterval: 20000 }
  );

  const { data: overviewStats } = useQuery(adminGetOverviewStats, undefined);
  const transactions = data?.transactions ?? [];

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-foreground">Credit Ledger</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Full transaction history + manual adjustments</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Credits Issued</p>
            <p className="text-3xl font-black text-primary tabular-nums">{(overviewStats?.totalCreditsIssued ?? 0).toFixed(1)}</p>
            <p className="text-xs text-muted-foreground mt-1">All purchases + bonuses + adjustments</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Transactions</p>
            <p className="text-3xl font-black text-foreground tabular-nums">{(data?.total ?? 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">All credit events logged</p>
          </div>
        </div>

        {/* Manual Top-Up Panel */}
        <TopUpPanel onDone={() => { refetch(); }} />

        {/* Filters */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-wrap gap-3 items-center">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Filter:</p>
          <Input
            placeholder="Filter by email..."
            className="rounded-xl max-w-xs"
            value={emailFilter}
            onChange={e => { setEmailFilter(e.target.value); setPage(1); }}
          />
          <Select onValueChange={v => { setTypeFilter(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="purchase">Purchase</SelectItem>
              <SelectItem value="download">Download</SelectItem>
              <SelectItem value="refund">Refund</SelectItem>
              <SelectItem value="bonus">Bonus</SelectItem>
              <SelectItem value="admin_adjust">Admin Adjust</SelectItem>
            </SelectContent>
          </Select>
          {(typeFilter || emailFilter) && (
            <Button variant="ghost" size="sm" className="rounded-xl text-xs" onClick={() => { setTypeFilter(""); setEmailFilter(""); setPage(1); }}>Clear ×</Button>
          )}
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-accent/30">
                  <th className="text-left py-3.5 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Date</th>
                  <th className="text-left py-3.5 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">User</th>
                  <th className="text-left py-3.5 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Type</th>
                  <th className="text-left py-3.5 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Amount</th>
                  <th className="text-left py-3.5 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Balance After</th>
                  <th className="text-left py-3.5 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  [1,2,3,4,5].map(i => (
                    <tr key={i}>{[1,2,3,4,5,6].map(j => <td key={j} className="py-4 px-5"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}</tr>
                  ))
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={6} className="py-16 text-center text-muted-foreground text-sm font-medium">No transactions found.</td></tr>
                ) : (
                  transactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-accent/20 transition-colors">
                      <td className="py-3.5 px-5 text-xs whitespace-nowrap">
                        <span className="font-bold text-foreground block">{new Date(tx.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                        <span className="text-muted-foreground">{new Date(tx.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                      </td>
                      <td className="py-3.5 px-5">
                        <p className="text-xs font-bold text-foreground truncate max-w-[180px]">{tx.user?.email ?? "—"}</p>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center text-[10px] font-extrabold px-2.5 py-1 rounded-full ${TYPE_COLORS[tx.type] ?? "bg-muted text-foreground"}`}>
                          {TYPE_LABELS[tx.type] ?? tx.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`text-sm font-extrabold tabular-nums ${tx.amount >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                          {tx.amount >= 0 ? "+" : ""}{tx.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="text-sm font-bold text-foreground tabular-nums">{tx.balance.toFixed(2)}</span>
                      </td>
                      <td className="py-3.5 px-5">
                        <p className="text-xs text-muted-foreground truncate max-w-[240px]" title={tx.description ?? ""}>{tx.description ?? "—"}</p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(data?.totalPages ?? 0) > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-accent/10">
              <p className="text-xs text-muted-foreground font-semibold">Page {page} of {data?.totalPages} · {data?.total} total</p>
              <div className="flex gap-2">
                <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} variant="outline" size="sm" className="rounded-xl h-8 text-xs border-border">← Prev</Button>
                <Button onClick={() => setPage(p => Math.min(data?.totalPages ?? 1, p + 1))} disabled={page >= (data?.totalPages ?? 1)} variant="outline" size="sm" className="rounded-xl h-8 text-xs border-border">Next →</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DefaultLayout>
  );
}
