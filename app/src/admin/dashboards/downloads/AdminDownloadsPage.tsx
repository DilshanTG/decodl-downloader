import { useState } from "react";
import { useQuery, adminGetAllDownloads, adminForceRetryDownload } from "wasp/client/operations";
import { type AuthUser } from "wasp/auth";
import DefaultLayout from "../../layout/DefaultLayout";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../../client/components/ui/select";
import { DOWNLOAD_STATUS_COLORS, DOWNLOAD_STATUS_LABELS } from "../../../shared/constants";
import { useToast } from "../../../client/hooks/use-toast";

function getDownloadUrl(id: string) {
  const base = (import.meta as any).env?.REACT_APP_API_URL || window.location.origin.replace(":3000", ":3001");
  return `${base.replace(/\/$/, "")}/api/download-file/${id}`;
}

export default function AdminDownloadsPage({ user }: { user: AuthUser }) {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery(
    adminGetAllDownloads,
    {
      page,
      status: statusFilter || undefined,
      providerSlug: providerFilter || undefined,
      userEmail: emailFilter || undefined,
    },
    { refetchInterval: 15000 }
  );

  const downloads = data?.downloads ?? [];

  const handleForceRetry = async (downloadId: string) => {
    setRetryingId(downloadId);
    try {
      await adminForceRetryDownload({ downloadId });
      toast({ title: "Retry queued", description: "Download has been reset to pending." });
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to retry.", variant: "destructive" });
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">All Downloads</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {data?.total ? `${data.total.toLocaleString()} total` : "All user downloads across the platform"}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Filters</p>
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Filter by user email..."
              className="rounded-xl max-w-xs"
              value={emailFilter}
              onChange={(e) => { setEmailFilter(e.target.value); setPage(1); }}
            />
            <Input
              placeholder="Filter by provider..."
              className="rounded-xl max-w-xs"
              value={providerFilter}
              onChange={(e) => { setProviderFilter(e.target.value); setPage(1); }}
            />
            <Select onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            {(statusFilter || providerFilter || emailFilter) && (
              <Button variant="ghost" size="sm" className="rounded-xl text-xs" onClick={() => { setStatusFilter(""); setProviderFilter(""); setEmailFilter(""); setPage(1); }}>
                Clear filters ×
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-accent/30">
                  <th className="text-left py-3.5 px-4 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Date</th>
                  <th className="text-left py-3.5 px-4 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">User</th>
                  <th className="text-left py-3.5 px-4 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Provider</th>
                  <th className="text-left py-3.5 px-4 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Status</th>
                  <th className="text-left py-3.5 px-4 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Credits</th>
                  <th className="text-left py-3.5 px-4 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  [1,2,3,4,5].map(i => (
                    <tr key={i}>{[1,2,3,4,5,6].map(j => <td key={j} className="py-4 px-4"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}</tr>
                  ))
                ) : downloads.length === 0 ? (
                  <tr><td colSpan={6} className="py-16 text-center text-muted-foreground text-sm">No downloads found.</td></tr>
                ) : (
                  downloads.map((d: any) => (
                    <tr key={d.id} className="hover:bg-accent/20 transition-colors">
                      <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        <span className="font-bold text-foreground block">{new Date(d.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                        <span className="opacity-70">{new Date(d.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-xs font-bold text-foreground truncate max-w-[160px]">{d.user?.email ?? "—"}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-xs font-bold text-foreground">{d.providerSlug}</p>
                        {d.link && <p className="text-[10px] text-muted-foreground truncate max-w-[150px]" title={d.link}>{d.link}</p>}
                        {d.code && <p className="text-[10px] text-muted-foreground font-mono">{d.code}</p>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center text-[10px] font-extrabold px-2 py-1 rounded-full ${DOWNLOAD_STATUS_COLORS[d.status] ?? "bg-muted text-foreground"}`}>
                          {d.status === "processing" && (
                            <svg className="animate-spin mr-1 h-2.5 w-2.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          )}
                          {DOWNLOAD_STATUS_LABELS[d.status] ?? d.status}
                        </span>
                        {d.errorMessage && (
                          <p className="text-[10px] text-red-500 mt-0.5 max-w-[180px] truncate" title={d.errorMessage}>{d.errorMessage}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-sm font-extrabold text-foreground tabular-nums">{d.creditsCharged?.toFixed(1) ?? "—"}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex gap-2">
                          {d.status === "completed" && d.downloadUrl && (
                            <Button size="sm" variant="default" asChild className="h-7 rounded-lg text-[10px] font-bold px-2.5">
                              <a href={getDownloadUrl(d.id)} target="_blank" rel="noopener noreferrer">Download</a>
                            </Button>
                          )}
                          {d.status === "failed" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 rounded-lg text-[10px] font-bold px-2.5 border border-border"
                              disabled={retryingId === d.id}
                              onClick={() => handleForceRetry(d.id)}
                            >
                              {retryingId === d.id ? "..." : "Force Retry"}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" asChild className="h-7 rounded-lg text-[10px] font-semibold px-2.5">
                            <a href={`/download/${d.id}`} target="_blank" rel="noopener noreferrer">View</a>
                          </Button>
                        </div>
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
