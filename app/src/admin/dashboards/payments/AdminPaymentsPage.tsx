import { useState } from "react";
import { useQuery, adminGetAllPayments } from "wasp/client/operations";
import { type AuthUser } from "wasp/auth";
import DefaultLayout from "../../layout/DefaultLayout";
import { Button } from "../../../client/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../../client/components/ui/select";

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  failed: "bg-red-500/15 text-red-500",
  cancelled: "bg-muted text-muted-foreground",
  refunded: "bg-purple-500/15 text-purple-500",
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  pending: "Pending",
  failed: "Failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export default function AdminPaymentsPage({ user }: { user: AuthUser }) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery(
    adminGetAllPayments,
    { page, status: statusFilter || undefined },
    { refetchInterval: 20000 }
  );

  const payments = data?.payments ?? [];

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-foreground">Payment History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All PayHere transactions across the platform</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Revenue</p>
            <p className="text-2xl font-black text-emerald-500 tabular-nums">
              Rs. {isLoading ? "—" : ((data?.totalRevenueLKR ?? 0) / 100).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">All paid transactions</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Credits Issued</p>
            <p className="text-2xl font-black text-primary tabular-nums">
              {isLoading ? "—" : (data?.totalCreditsIssued ?? 0).toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total credits awarded</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Transactions</p>
            <p className="text-2xl font-black text-foreground tabular-nums">
              {isLoading ? "—" : (data?.total ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">All statuses combined</p>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center gap-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Filter:</p>
          <Select onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-accent/30">
                  <th className="text-left py-3.5 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Date</th>
                  <th className="text-left py-3.5 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">User</th>
                  <th className="text-left py-3.5 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Order ID</th>
                  <th className="text-left py-3.5 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Package</th>
                  <th className="text-left py-3.5 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Amount</th>
                  <th className="text-left py-3.5 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Credits</th>
                  <th className="text-left py-3.5 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  [1,2,3,4,5].map(i => (
                    <tr key={i}>{[1,2,3,4,5,6,7].map(j => <td key={j} className="py-4 px-5"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}</tr>
                  ))
                ) : payments.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center text-muted-foreground text-sm font-medium">No payments found.</td></tr>
                ) : (
                  payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-accent/20 transition-colors">
                      <td className="py-4 px-5 text-xs whitespace-nowrap">
                        <span className="font-bold text-foreground block">{new Date(p.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        <span className="text-muted-foreground">{new Date(p.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                      </td>
                      <td className="py-4 px-5">
                        <p className="text-sm font-bold text-foreground truncate max-w-[180px]">{p.user?.email ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{p.user?.username ?? ""}</p>
                      </td>
                      <td className="py-4 px-5">
                        <p className="text-xs font-mono text-muted-foreground truncate max-w-[140px]" title={p.payhereOrderId}>{p.payhereOrderId}</p>
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-sm font-bold text-foreground">{p.packageId}</span>
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-sm font-extrabold text-emerald-500 tabular-nums">Rs. {(p.amountLKR / 100).toLocaleString()}</span>
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-sm font-extrabold text-primary tabular-nums">{p.creditsAwarded.toFixed(1)}</span>
                      </td>
                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center text-xs font-extrabold px-2.5 py-1 rounded-full ${STATUS_COLORS[p.status] ?? "bg-muted text-foreground"}`}>
                          {STATUS_LABELS[p.status] ?? p.status}
                        </span>
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
